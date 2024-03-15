from fastapi import FastAPI
import json
from fastapi.middleware.cors import CORSMiddleware

""" to start backend, run uvicorn main:app --reload """
app = FastAPI()

origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/sankey-data")
async def get_sankey_data():
    data = json.load(open("data.txt", "r"))
    return data

"""
Internally called function, not exposed. Called by other endpoints as a starting point
Counts the number of each occurence and grouped them under each type 
Returns a json object/dictionary with 3 keys:
- project: str - project as specified in the input data (not required by recharts' API)
- allCounts: list/json array of dictionaries/json object with keys:
    - type: str - type according to input data
    - counts: list/json array of {"code":"exampleCode", "count": 3} unique list of code and the number of occurences in input data
- totalCount: int - total number of instances picked up
"""
def count_data():
    data = json.load(open("data.txt", "r"))
    project = data["project"]
    types_and_imps_list = data["type_and_imp_list"]
    result = []
    total_count = 0
    for type_and_imp in types_and_imps_list:
        type = type_and_imp["type"]
        code_imp_list = type_and_imp["codeImplList"]
        codes = [code["code"] for code in code_imp_list]
        codes_set = set(codes)
        code_count = [{"code": code, "count":codes.count(code)} for code in codes_set]
        count = len(codes)
        total_count += count
        result.append({"type": type, "counts" : code_count, "typeCount":count})
    return {"project":project, "allCounts":result, "totalCount": total_count}


"""
Endpoint: http://localhost:8000/get-nodes
returns a dictionary/json object with 3 keys according to https://recharts.org/en-US/api/SankeyChart 's data format
- project: str - project as specified in the input data (not required by recharts' API)
- nodes - list/json array of dictionaries/json objects with 1 key {"name":"example"}
- links - list/json array of dictionaries/json objects with 3 keys: source, target, value, and values as integers corresponding to the index of the source and targets in the nodes array
- secondary: json object with type from data as keys and values are same as primary
#
"""
@app.get("/get-nodes")
async def generate_nodes():
    data = count_data()
    print(data)
    nodes = []
    links = []
    project = data["project"]
    all_counts = data["allCounts"]
    nodes.append({"name": project})
    for overall_count in all_counts:
        type = overall_count["type"]
        primary_node_index = len(nodes)
        node_obj = {
            "name": type
            }
        nodes.append(node_obj)
        link_obj = {
            "source": 0, 
            "target": primary_node_index, 
            "value": overall_count["typeCount"]
            }
        links.append(link_obj)
        counts = overall_count["counts"]
        for count in counts:
            type = count["code"]
            type_count = count["count"]
            link_obj = {
                "source": primary_node_index, 
                "target": len(nodes), 
                "value": type_count
                }
            links.append(link_obj)
            node_obj = {
                "name": type
            }
            nodes.append(node_obj)
    return {"project": project, "nodes": nodes, "links": links}


"""
Endpoint: http://localhost:8000/get-separated-nodes
returns a dictionary/json object with 3 keys:
- project: str - project as specified in the input data
- primary: dictionary/json with 2 keys: formatted according to https://recharts.org/en-US/api/SankeyChart 's data format
   1) nodes - list/json array of dictionaries/json objects with 1 key {"name":"example"}
   2) links - list/json array of dictionaries/json objects with 3 keys: source, target, value, and values as integers corresponding to the index of the source and targets in the nodes array
- secondary: json object with type from data as keys and values are same as primary
#
"""
@app.get("/get-separated-nodes")
async def generate_separated_nodes():
    data = count_data()
    primary_nodes = []
    primary_links = []
    project = data["project"]
    all_counts = data["allCounts"]
    primary_nodes.append({"name": project})
    secondary = {}
    for overall_count in all_counts:
        type = overall_count["type"]
        primary_node_index = len(primary_nodes)
        node_obj = {
            "name": type
            }
        primary_nodes.append(node_obj)
        link_obj = {
            "source": 0, 
            "target": primary_node_index, 
            "value": overall_count["typeCount"]
            }
        primary_links.append(link_obj)
        counts = overall_count["counts"]

        secondary_nodes = []
        secondary_links = []
        secondary_nodes.append(node_obj)
        secondary_node_index = len(secondary_nodes) - 1
        for count in counts:
            secondary_type = count["code"]
            type_count = count["count"]
            link_obj = {
                "source": secondary_node_index, 
                "target": len(secondary_nodes), 
                "value": type_count
                }
            secondary_links.append(link_obj)
            node_obj = {
                "name": secondary_type
            }
            secondary_nodes.append(node_obj)
        secondary[type] = {"nodes": secondary_nodes, "links": secondary_links}
    return {"project": project, "primary":{"nodes": primary_nodes, "links": primary_links}, "secondary": secondary}

class Node:
    def __init__(self, id, name, type, x, y):
        self.id = str(id)
        self.data = {"label": name}
        self.type = type
        self.position = {"x": x, "y": y}
        self.sourcePosition = "right"
        self.targetPosition = "left"

class Edge:
    def __init__(self, id, source, target):
        self.id = str(id)
        self.source = str(source)
        self.target = str(target)

"""
Endpoint: http://localhost:8000/get-flow
returns a dictionary/json object with 3 keys:
- project: str - project as specified in the input data
- nodes - list/json array of Node objects defined above
- edges - list/json array of Edge objects defined above
- secondary: json object with type from data as keys and values are same as primary
#
"""
@app.get("/get-flow")
async def generate_flow():
    origin_x = 0
    origin_y = 400
    depth = 200
    height = 100
    data = count_data()
    print(data)
    nodes = []
    edges = []
    project = data["project"] # starting node
    all_counts = data["allCounts"] # all other nodes
    total_count = data["totalCount"]
    project_node = Node(1, project + ": " + str(total_count), 'input', origin_x, origin_y)
    nodes.append(project_node)
    for primary_index, overall_count in enumerate(all_counts):
        primary_mid = (len(all_counts) - 1) /2
        primary_type = overall_count["type"]
        primary_type_count = overall_count["typeCount"]
        primary_id = len(nodes) + 1
        counts = overall_count["counts"]
        primary_y = (primary_index - primary_mid) * height * (len(counts)) + origin_y
        node_to_add = Node(primary_id, primary_type + ": " + str(primary_type_count), "default", depth * 1 + origin_x, primary_y)
        nodes.append(node_to_add)
        edge_to_add = Edge("1-" + str(primary_id), 1, primary_id)
        edges.append(edge_to_add)
        for secondary_index, count in enumerate(counts):
            secondary_mid = (len(counts) - 1) /2
            secondary_type = count["code"]
            secondary_type_count = count["count"]
            secondary_id = len(nodes) + 1
            secondary_y = (secondary_index - secondary_mid) * height + primary_y
            secondary_node_to_add = Node(secondary_id, secondary_type + ": " + str(secondary_type_count), "output", depth * 2 + origin_x, secondary_y)
            nodes.append(secondary_node_to_add)
            secondary_edge_to_add = Edge(str(primary_id) + "-" + str(secondary_id), primary_id, secondary_id)
            edges.append(secondary_edge_to_add)
    return {"project": project, "nodes": nodes, "edges": edges}