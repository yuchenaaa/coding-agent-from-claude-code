

export type FrontmatterResult = {
    meta : Record<string,string>,
    body : string
}

export function parseFrontmatter(content:string):FrontmatterResult{
    const lines = content.split("\n")
    const metadata:Record<string,string>={}
    if (lines[0].trim()==="---"){
        const endIndex = lines.findIndex((line,index) =>index>0 && line.trim() === "---")
        if (endIndex !== -1){
            for (let index = 1;index<endIndex;index++){
                const firstIndex = lines[index].indexOf(":")
                if (firstIndex !== -1){
                    const keyData = lines[index].slice(0,firstIndex).trim()
                    if (keyData){
                        metadata[keyData] = lines[index].slice(firstIndex+1).trim()
                    } else {continue}
                    
                } else {continue}
            }
            const textContent = lines.slice(endIndex+1).join("\n").trim()
            return {
                meta : metadata,
                body : textContent
            }
        } else {return {meta:{},body:content}}
    } else {return {meta:{},body:content}}
}
