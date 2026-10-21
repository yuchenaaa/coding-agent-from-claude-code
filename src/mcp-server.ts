import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


const server = new McpServer({
    name : "my-demo",
    version : "1.0.0"
})

const transport = new StdioServerTransport()

server.registerTool(
    "add",
    {
        description : "计算两个数字的和",
        inputSchema : {
            a : z.number(),
            b : z.number()  
        }
    },
    ({a,b})=>{
        const result = handleAdd({a,b})
        return {
            content : [
                {type : "text",text : String(result)}
            ]
        }
    }
)

await server.connect(transport)

function handleAdd({a,b}:{a:number;b:number}){
    return a+b
}

