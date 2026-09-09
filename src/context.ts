import Anthropic from "@anthropic-ai/sdk";

export async function contextCompact(messages:Anthropic.MessageParam[],client:Anthropic,model:string):Promise<Anthropic.MessageParam[]>{
    const lastMessage = messages[messages.length-1]
    const compactMessages = messages.slice(0,-1)
    compactMessages.push({"role":"user","content":"请总结我之前的对话。要求保留关键决定、文件路径和继续工作所需信息。"})
    const compactedMessage =  await client.messages.create({
        model : model,
        max_tokens : 2048,
        system : "你负责总结对话，要求简洁总结、保留重要细节",
        messages : compactMessages
    })
    const compactedNoThinkingMessage = compactedMessage.content.filter((mes)=>mes.type==="text")
    const compactedText = compactedNoThinkingMessage.map((text)=>text.text).join("\n") || "No valid summary"
    return [{
        role : "user",
        content : compactedText
    },
    lastMessage
    ]
}

export function truncuteResult(result:string){
    if (result.length<=50000){
        return result
    }
    else{
    const middleText = "\n---【中间内容已截断】---\n"
    const lengthBothText = Math.floor((50000-middleText.length) / 2)
    const leftText = result.slice(0,lengthBothText)
    const rightText = result.slice(-lengthBothText)
    return leftText + middleText + rightText
    }
}