import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions,executeTool } from "./tools.js";
import { buildSystemPrompt } from "./prompt.js";
import { checkPermission } from "./permissions.js";
import { contextCompact,truncuteResult } from "./context.js";
import { mkdirSync,writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { recallMemories } from "./memory.js";
import { buildSkillDescription } from "./skills.js";


const MODEL =
  process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";

export class Agent {
  private client: Anthropic;
  private messages: Anthropic.MessageParam[] = [];
  private estimateContextTokens : number = 0;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL,
    })
  }
  async chat(userText:string):Promise<void> {

    this.messages.push({"role":"user","content":userText})
    await this.checkAndCompact()

    while (true){
      let userMemory =recallMemories(userText)
      const messageStream = this.client.messages.stream({
        model : MODEL,
        max_tokens : 4096,
        system : buildSystemPrompt() + "\n\n" + userMemory + "\n\n" + buildSkillDescription(),
        tools : toolDefinitions,
        messages : this.messages
      })
      messageStream.on("text",(textDelta)=>{process.stdout.write(textDelta)})
      const reply:Anthropic.Message = await messageStream.finalMessage()
      process.stdout.write("\n")

      this.estimateContextTokens = reply.usage.input_tokens + (reply.usage.cache_read_input_tokens ?? 0) + (reply.usage.cache_creation_input_tokens ?? 0) + reply.usage.output_tokens
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
        const permissionResult = checkPermission(toolUse.name,toolUse.input as Record<string,any>)
        if (permissionResult === "allow"){
        let toolResult = await executeTool(toolUse.name,toolUse.input as Record<string,any>)
        toolResult = this.persistLargeResult(toolUse.name,toolResult)
        toolResults.push({
          "type" : "tool_result",
          "tool_use_id" : toolUse.id,
          "content" : toolResult
        })
      }
        else {
        toolResults.push({
          "type" : "tool_result",
          "tool_use_id" : toolUse.id,
          "content" : "拒绝执行"
        })}
    }
      this.messages.push({"role": "user","content":toolResults})
    }
  };
  history():Anthropic.MessageParam[]{
    return this.messages
  };
  loadHistory(messages:Anthropic.MessageParam[]):void{
    this.messages = messages
    this.estimateContextTokens = 0
  }
  clearHistory():void{
    this.messages = []
    this.estimateContextTokens =0
  }
  async checkAndCompact():Promise<void>{
    if (this.estimateContextTokens>500000){
      this.messages = await contextCompact(this.messages,this.client,MODEL)
      this.estimateContextTokens = 0
    }
  }
  persistLargeResult(toolName:string,result:string) {
    if (Buffer.byteLength(result,"utf-8")<=30*1024){
      return result
  } else {
    const dir = join(process.cwd(),"tool-results")
    mkdirSync(dir,{recursive:true})
    const fileName = `${Date.now()}_${randomUUID()}_${toolName}.txt`
    const filePath = join(dir,fileName)
    writeFileSync(filePath,result,"utf-8")
    const frontResult = result.split("\n").slice(0,200).join("\n")
    const miniResult = truncuteResult(frontResult)
    return `结果过大，具体文件见路径：${filePath}，内容概览：${miniResult}`
  }
  }
}
