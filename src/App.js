import './App.css';
import { useState, useEffect } from 'react';
import axios from "axios";
import Flow from './components/Flow';
import { Sankey, Tooltip } from 'recharts';

function App() {
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
        console.log(res.data.primary);
        setSecondaryData(res.data.secondary);
        console.log(res.data.secondary);
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
        console.log(res.data.nodes)
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
    console.log(data)
    return (
      <g>
        <rect x={data.x} y={data.y} width={data.width} height={data.height} fill="rgb(81, 146, 202)" />
        <text x={data.x + data.width * 2} y={data.y + data.height / 2} textAnchor="left">{data.payload.name}: {data.payload.value}</text>
      </g>
    )
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
    let target;
    if (Object.keys(e).includes("linkWidth")) {
      target = e.payload.target.name;
    } else {
      if (e.payload.sourceNodes[0] === 0) {
        target = e.payload.name;
      }
    }
    if (Object.keys(secondaryData).includes(target)) {
      console.log("Key: " + target + " chosen, will handle change in chart data");
      setData(secondaryData[target])
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
          height={1000}
          data={data}
          node={<MyCustomNode />}
          nodePadding={50}
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
