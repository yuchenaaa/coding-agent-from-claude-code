import { Agent } from "./agent.js";
import { saveSession } from "./session.js";
import { pathToFileURL } from "node:url";
import { loadSession } from "./session.js";
import * as readline from "node:readline"
import Anthropic from "@anthropic-ai/sdk";

export async function runCli(messages:string[] = process.argv.slice(2)){
    const agent = new Agent()
    if (messages.includes("--resume")){
        messages = messages.filter(message => message !=="--resume")
        const session= loadSession()
        if (session){
            agent.loadHistory(session as Anthropic.MessageParam[])
        }
    }
    const userMessage = messages.join(" ").trim()
    if (userMessage){
        await agent.chat(userMessage)
        const history = agent.history()
        saveSession(history)
    } else {
        const rl = readline.createInterface({
            input : process.stdin,
            output : process.stdout
        })
        await new Promise<void>((resolve) =>{
            function rlLoop(){
                rl.question("you：",async(userText:string) =>{
                    const text = userText.trim()
                    if (text ==="exit" || text ==="quit"){
                        rl.close()
                        resolve()
                        return
                    }
                    else if (text ==="/clear"){
                        agent.clearHistory()
                        saveSession(agent.history())
                        console.log("历史记录已清空")
                    }
                    else if (text){
                        await agent.chat(text)
                        saveSession(agent.history())
                    }
                    rlLoop()
                })
            }
            rlLoop()
        }
        )
}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href){
    runCli()
}
