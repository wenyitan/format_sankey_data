import ReactFlow, { Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';

function Flow({nodes, edges}) {
    console.log(nodes)
  return (
    <div style={{ height: '100%' }}>
      <ReactFlow defaultNodes={nodes} defaultEdges={edges} fitView
        style={{
            backgroundColor: '#D3D2E5',
        }}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default Flow;
