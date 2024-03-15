import './App.css';
import { useState, useEffect } from 'react';
import axios from "axios";
import Flow from './components/Flow';

function App() {
  const [ data, setData ] = useState();
  const [ primaryData, setPrimaryData] = useState();
  const [ secondaryData, setSecondaryData ] = useState();
  const [ nodes, setNodes ] = useState([]);
  const [ edges, setEdges ] = useState([]);

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
    // getData();
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

  const handleRevert = () => {
    setData(primaryData);
  }

  return (
    <div className="App" style={{ height: 800, width: 800 }}>
      {/* {data && 
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
        <button onClick={handleRevert}>Revert</button> */}
        {edges.length > 0 && nodes.length > 0 && <Flow nodes={nodes} edges={edges}/>}
    </div>
  );
}

export default App;
