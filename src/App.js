import './App.css';
import { useState, useEffect } from 'react';
import axios from "axios";
import Flow from './components/Flow';
import { Sankey, Tooltip } from 'recharts';

function App() {

  const [ extendedState, setExtendedState ] = useState({})
  // primary variable to be accessed by Sankey component
  const [ data, setData ] = useState();

  /*
   * variables to be stored and accessed by handlers like handleClick and handleRevert 
   * to handle clicks on the Sankey components (view will only change when clicking on the links/target nodes)
   * nothing will happen when the source nodes are clicked
   * getData fetches the data from the endpoint /get-separated-nodes and sets the primary from the result as data, and also primaryData
   * it also sets the secondary in the data as secondaryData
   * secondaryData should be set to a JSON object whose keys are strings.
  */
  const [ primaryData, setPrimaryData] = useState();
  const [ secondaryData, setSecondaryData ] = useState();
  const getData = () => {
    axios.get("http://localhost:8000/get-separated-nodes", {})
      .then((res)=>{
        setData(res.data.primary);
        setPrimaryData(res.data.primary)
        // console.log(res.data.primary);
        setSecondaryData(res.data.secondary);
        // console.log(res.data.secondary);
        // const tempExtendedState = {}
        // Object.keys(res.data.secondary).forEach((key)=> {
        //   tempExtendedState[key] = false;
        // })
        // setExtendedState(extendedState)
      })
      .catch((err)=> {
        console.log(err)
      })
  }
  
  /*
   * variables to store data to be used for ReactFlow or the Flow component
   * getFlowData fetches data from the /get-flow endpoint and set the nodes and edges accordingly
  */
  const [ nodes, setNodes ] = useState([]);
  const [ edges, setEdges ] = useState([]);
  const getFlowData = () => {
    axios.get("http://localhost:8000/get-flow", {})
      .then((res)=>{
        setNodes(res.data.nodes);
        setEdges(res.data.edges);
      })
      .catch((err)=> {
        console.log(err)
      })
  }

  useEffect(()=> {
    getData();
    getFlowData();
  }, [])

  const MyCustomNode = (data) => {
    // console.log(data)
    return (
      <g>
        <rect x={data.x} y={data.y} width={data.width} height={data.height} fill="rgb(81, 146, 202)" />
        <text x={data.x + data.width * 2} y={data.y + data.height / 2} textAnchor="left">{data.payload.name}: {data.payload.value}</text>
      </g>
    )
  }

  const addData = (originalData, target, index) => {
    const secondaryNodes = secondaryData[target].nodes.slice(1)
    const secondaryLinks = secondaryData[target].links
    const primaryLinksLength = originalData.links.length
    const linksToAppend = []
    secondaryLinks.forEach((link)=> {
      linksToAppend.push({"source" : index, "target": link.target + primaryLinksLength, "value":link.value})
    })
    // const newNodes = originalData.nodes.concat(secondaryNodes)
    // const newLinks = originalData.links.concat(linksToAppend)
    // newLinks.sort((link1, link2)=> {return link1.source - link2.source})
    const newNodes = [];
    const newLinks = [];
    let nodeFound = false;
    newNodes.push(originalData.nodes.at(0))
    for (let originalIndex = 1; originalIndex < originalData.nodes.length; originalIndex++) {
      const currentNode = originalData.nodes.at(originalIndex);
      const currentLink = originalData.links.at(originalIndex-1);
      if (!nodeFound) {
        newNodes.push(currentNode);
        newLinks.push(currentLink);
        if (currentNode.name === target) {
          for (let secondaryIndex = 0; secondaryIndex < secondaryNodes.length; secondaryIndex++) {
            const secondaryNode = secondaryNodes.at(secondaryIndex);
            const secondaryLink = secondaryLinks.at(secondaryIndex);
            secondaryLink.source = index
            secondaryLink.target = newNodes.length;
            newLinks.push(secondaryLink)
            newNodes.push(secondaryNode);
          }
          nodeFound = true;
        }
      } else {
        if (currentLink.source !== 0 ){
          currentLink.source += secondaryLinks.length
        }
        currentLink.target += secondaryLinks.length
        newNodes.push(currentNode);
        newLinks.push(currentLink);
      }
    }
    const result = {"nodes": newNodes, "links": newLinks}
    // console.log(result)
    return result
  }

  const removeData = (data, target) => {
    const toBeRemoved = secondaryData[target]
    const nodesToBeRemoved = toBeRemoved.nodes.slice(1).map((node)=> {return node.name});
    const indexTrack = []
    const originalNodes = data.nodes;
    const originalLinks = data.links;
    for (let i = 0; i < originalNodes.length; i++) {
      const node = originalNodes.at(i)
      if (nodesToBeRemoved.includes(node.name)) {
        indexTrack.push(i)
      }
    }
    const newNodes = originalNodes.filter((node)=> {return !nodesToBeRemoved.includes(node.name)});
    const newLinks = originalLinks.filter((link)=> {return !indexTrack.includes(link.target)});
    newLinks.forEach((link)=> {
      if (link.target > indexTrack.at(0)) {
        link.target -= indexTrack.length;
      }
      if (link.source > indexTrack.at(0)) {
        link.source -= indexTrack.length;
      }
    })
    const result = {"nodes": newNodes, "links": newLinks}
    // console.log(result)
    return result

  }

    /*
   * handle click events on the sankey component.
   * each click events has a payload object which differes for clicks on a node and on a link
   * the payload object for links has a key called linkWidth. Function checks for this to determine whether the click is on a node or a link
   * if the click is on a link, the target's name is retrieved
   * if the click is on a node, it checks if the sourceNode is 0 this means it is a target
   * it then retrieves the name of the target 
   * name of target has to be in the keys of secondaryData for there to be any change in the sankey data.
  */
  const handleClick = (e) => {
    // console.log(e)
    let target;
    let index;
    if (Object.keys(e).includes("linkWidth")) {
      target = e.payload.target.name;
      index = e.index + 1;
    } else {
      if (e.payload.sourceNodes[0] === 0) {
        target = e.payload.name;
        index = e.index;
      }
    }
    if (Object.keys(secondaryData).includes(target)) {
      if (extendedState[target]) { // target is extended
        setData(removeData(data, target));
        extendedState[target] = false;
      } else {
        console.log("Key: " + target + " chosen, will handle change in chart data");
        setData(addData(data, target, index))
        extendedState[target] = true;
      }
    }
  }

  /*
   * IMPORTANT: Button component to be styled accordingly 
   * reverts back the data to primaryData => overview of project
   */
  const handleRevert = () => {
    setData(primaryData);
  }

  return (
    <div className="App" style={{ height: 800, width: 800 }}>
      {data && 
        <Sankey
          width={1000}
          height={1200}
          data={data}
          node={<MyCustomNode />}
          nodePadding={20}
          sort={false}
          margin={{
          left: 200,
            right: 200,
            top: 100,
            bottom: 100,
          }}
          link={{ stroke: '#77c878' }}
          onClick={handleClick}
        >
          <Tooltip />
        </Sankey>}
        <button onClick={handleRevert}>Revert</button>
        {edges.length > 0 && nodes.length > 0 && <Flow nodes={nodes} edges={edges}/>}
    </div>
  );
}

export default App;
