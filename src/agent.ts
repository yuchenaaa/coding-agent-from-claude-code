import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions,executeTool } from "./tools.js";
import { buildSystemPrompt } from "./prompt.js";

const MODEL =
  process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";

export class Agent {
  private client: Anthropic;
  private messages: Anthropic.MessageParam[] = [];

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL,
    })
  }
  async chat(userText:string):Promise<void> {
    this.messages.push({"role":"user","content":userText})
    while (true){
      const messageStream = this.client.messages.stream({
        model : MODEL,
        max_tokens : 4096,
        system : buildSystemPrompt(),
        tools : toolDefinitions,
        messages : this.messages
      })
      messageStream.on("text",(textDelta)=>{process.stdout.write(textDelta)})
      const reply = await messageStream.finalMessage()
      process.stdout.write("\n")

      const toolUses:Anthropic.ToolUseBlock[] = []
      for (const block of reply.content){
        if(block.type === "tool_use"){
          toolUses.push(block)
        }
      }
      this.messages.push({"role":"assistant","content":reply.content})
      if (toolUses.length===0){
        return
      }
      const toolResults:Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUses){
        const toolResult = await executeTool(toolUse.name,toolUse.input as Record<string,any>)
        toolResults.push({
          "type" : "tool_result",
          "tool_use_id" : toolUse.id,
          "content" : toolResult
        })
      }
      this.messages.push({"role": "user","content":toolResults})
    }
  };
  history():Anthropic.MessageParam[]{
    return this.messages
  };
  loadHistory(messages:Anthropic.MessageParam[]):void{
    this.messages = messages
  }
  clearHistory():void{
    this.messages = []
  }
}
