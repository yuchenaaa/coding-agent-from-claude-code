import { join } from "node:path";
import { existsSync,readdirSync,readFileSync } from "node:fs";

export function recallMemories(query:string):string{
    const dirPath = join(process.cwd(),".mini-memory")
    if (existsSync(dirPath)){
        const mdTexts = readdirSync(dirPath).filter((md) => md.endsWith(".md"))
        type Item = {
            fileName : string,
            fileContent : string,
            words : Set<string>
        }
        const candiContents:Item[] = []
        for (const mdText of mdTexts){
            const filePath = join(dirPath,mdText)
            const fileContent = readFileSync(filePath,"utf-8").trim()
            const lowerContent = new Set(fileContent.toLowerCase().split(/\W+/))
            candiContents.push({
                fileName : mdText,
                fileContent : fileContent,
                words : lowerContent
            })
        }
        const lowerQuery = query.toLowerCase().split(/\W+/).filter((text) =>text.length>2)
        const uniqueQuerys = [...new Set(lowerQuery)]
        const loadMemory:Record<string,any>[] = []
        for (const candiContent of candiContents){
            let hasNum = 0
            for (const uniqueQuery of uniqueQuerys){
                if (candiContent.words.has(uniqueQuery)){
                    hasNum++
                }
            }
            if (hasNum !== 0){
                loadMemory.push({
                    content : candiContent,
                    hasNum : hasNum
                })
            }
        }
        if (loadMemory.length>0){
            const readyMemory = loadMemory.sort((a,b)=>b.hasNum-a.hasNum).slice(0,3)
            let userMemory = readyMemory.map((item)=>item.content.fileContent).join("\n- ")
            userMemory = "以下是与当前问题相关的用户和项目记忆\n" +"- " + userMemory
            return userMemory
        } else {return ""}
    } else { return ""}
}