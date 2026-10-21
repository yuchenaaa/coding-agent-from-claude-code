import { spawn } from "node:child_process";
import { createInterface } from "node:readline";


export interface McpTool {
  name: string;
  description: string;
  input_schema: unknown;
}

export interface McpConnection {
  tools: McpTool[];
  callTool(name: string, args: unknown): Promise<string>;
  close(): void;
}

export async function connectMcp(
  command: string,
  args: string[]
): Promise<McpConnection>{
    const proc = spawn(command,args,{
        stdio:["pipe","pipe","inherit"]
    })
    let nextId = 1
    const pending  =new Map<number,(value:any)=>void>()
    function request(method:string,params?:unknown):Promise<any>{
        const responsePromise = new Promise<any>(
            (resolve)=>{
                const id = nextId
                pending.set(id,resolve)
                nextId++
                const call = JSON.stringify({jsonrpc:"2.0",id,method,params})+"\n"
                proc.stdin!.write(call)
            }
        )
        return responsePromise
    }
    const rl = createInterface({input:proc.stdout!})
    rl.on("line",(line:string)=>{
        const msg = JSON.parse(line)
        if (pending.has(msg.id)){
            const resolve = pending.get(msg.id)
            resolve?.(msg)
            pending.delete(msg.id)
        }
    })
    await request("initialize",{
        protocolVersion : "2024-11-05",
        capabilities: {},
        clientInfo: {
            name: "mini-claude",
            version: "1.0"
        }})
    proc.stdin?.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n")
    const toolParams = await request("tools/list")
    const toolLists = toolParams.result.tools
    const tools:McpTool[] = toolLists.map((tool:any)=>{
        return {
            name : tool.name,
            description : tool.description??"",
            input_schema : tool.inputSchema
        }
    })
    async function callTool(name:string,args:unknown):Promise<string>{
        const responseResults = await request("tools/call",{name,arguments:args})
        const responseContent = responseResults.result?.content || []
        const reponseText = responseContent.filter((content:any)=>content.type == "text").map((content:any)=>content.text).join("")
        if (reponseText!==""){
            return reponseText
        } else {
            return JSON.stringify(responseResults.result??responseResults.error)
        }
    }
    return {
        tools : tools,
        callTool : callTool,
        close() : void{proc.kill()}
    }
}