import Anthropic from "@anthropic-ai/sdk";
import { readFileSync,writeFileSync,mkdirSync,readdirSync,statSync, Stats } from "node:fs";
import { dirname,join } from "node:path";
import { glob } from "glob";
import { execFileSync,execSync } from "node:child_process";


export const toolDefinitions : Anthropic.Tool[] = [
    {
        "name" : "read_file",
        "description" : "用来读文件",
        "input_schema" :{
            "type" : "object",
            "properties" : {
                "file_path" : {
                    "type" : "string",
                    "description" : "这个参数用来填写要读的文件的具体路径"
                }
            },
            "required" : ["file_path"]
        }
    },
    {
        "name" : "write_file",
        "description" : "写入文件，不存在则创建，存在则覆盖",
        "input_schema" :{
            "type" : "object",
            "properties" : {
                "file_path" : {
                    "type" : "string",
                    "description" : "为写入路径"
                },
                "content":{
                    "type" : "string",
                    "description" : "写入的是完整的内容"
                }
            },
            "required" : ["file_path","content"]
        }
    },
    {
        "name" : "edit_file",
        "description" : "精确替换文件中的唯一字符串",
        "input_schema" :{
            "type" : "object",
            "properties" : {
                "file_path" : {
                    "type" :"string",
                    "description" : "为文件路径"
                },
                "old_string" :{
                    "type":"string",
                    "description" : "要替换的字符串，该字符串必须精确匹配且唯一"
                },
                "new_string" :{
                    "type":"string",
                    "description" : "要写入的字符串"
                }
            },
            "required":["file_path","old_string","new_string"]
        }
    },
    {
        "name" : "list_files",
        "description" : "使用Glob模式来查找所需的文件",
        "input_schema" : {
            "type" : "object",
            "properties" : {
                "pattern" : {
                    "type" : "string",
                    "description" : "Glob模式匹配"
                },
                "path" :{
                    "type" : "string",
                    "description" : "从哪个目录开始查找，如不填，则默认使用当前工作目录"
                }
            },
            "required" : ["pattern"]
        }
    },
    {
        "name" : "grep_search",
        "description" : "在文件内容中，搜索正则表达式，返回匹配行、文件路径和行号",
        "input_schema" :{
            "type" : "object",
            "properties" : {
                "pattern" :{
                    "type" : "string",
                    "description" : "要搜索的正则表达式"
                },
                "path" : {
                    "type" : "string",
                    "description" : "要搜索的文件或目录，如不填，默认选择当前工作目录"
                }
            },
            "required" : ["pattern"]
        }
    },
    {
        "name" : "run_shell",
        "description" : "用于运行测试、Git、安装依赖以及其他终端命令",
        "input_schema" : {
            "type" : "object",
            "properties" : {
                "command" : {
                    "type" : "string",
                    "description"  : "要执行的shell命令"
                }
            },
            "required" : ["command"]
        }
    }
]

function readFile(input:{file_path : string}) : string{
    let fileContents : string[]
    try{
    fileContents = readFileSync(input.file_path,"utf-8").split("\n")
    }
    catch(error:any){
        return `发生错误：${error}`
    }
    const indexFileContent = fileContents.map(
        (fileContent,index) => `${index + 1}:${fileContent}`
    )
    const indexFileContents = indexFileContent.join("\n")
    return indexFileContents
}

function writeFile(input:{file_path:string,content:string}) :string{
    const parentFilePath = dirname(input.file_path)
    try{
        mkdirSync(parentFilePath,{recursive:true})
        writeFileSync(input.file_path,input.content,"utf-8")
        return `写入成功！ 写入路径为：${input.file_path}，写入行数为：${input.content.split("\n").length}`
    } catch(error){
        return `写入失败：${error}`
    }
}

function editFile(input:{file_path:string,old_string:string,new_string:string}) : string{
    try{
    const fileContent = readFileSync(input.file_path,"utf-8")
    const fileSplited = fileContent.split(input.old_string)
    if (fileSplited.length-1===0){
        return "未找到old_string，不修改文件"
    }else if (fileSplited.length-1>1){
        return "找到多条old_string，不修改文件"
    } else {
        const newContent = fileSplited.join(input.new_string)
        writeFileSync(input.file_path,newContent,"utf-8")
        return "替换成功！"
    }
    }
    catch(error){
        return `编辑失败：${error}`
    }
}

async function listFiles(input:{pattern:string,path?:string}) : Promise<string> {
    try{
    const allFiles = await glob(input.pattern,{
        cwd : input.path || process.cwd(),
        nodir : true,
        ignore :  ["node_modules/**",".git/**"]
    })
    if (allFiles.length ===0){
        return "没有找到匹配文件"
    } else {
        return allFiles.slice(0,200).join("\n")
    }
    }catch(error){
        return `查找失败：${error}`
    }
}

function grepJs(input:{pattern:string,path?:string}):string{
    const matchs:string[] = []
    let rule : RegExp
    try{
        rule = new RegExp(input.pattern)
    } catch(error){
        return `无效正则：${error}`
    }
    function walk(path?:string){
        let entries : string[]
        try{
            entries = readdirSync(path??".")
            } catch(error) {
            return }
        for (const entry of entries){
            if (entry.startsWith(".") || entry ==="node_modules"){
                continue
            } else {
                const fullPath = join(path??".",entry)
                let fileState : Stats
                try{
                    fileState = statSync(fullPath)
                } catch{
                    continue
                }
                if (fileState.isDirectory()){
                    walk(fullPath)
                } else {
                    let content : string
                    try{
                        content = readFileSync(fullPath,"utf-8")
                    } catch{
                        continue
                    }
                    const lines = content.split("\n")
                    lines.forEach((line,index) =>{
                        if (rule.test(line) && matchs.length<100){
                            matchs.push(`${fullPath}:${index+1}:${line}`)
                        }
                    }
                    )
                }
            }
        }
    }
    walk(input.path)
    if (matchs.length===0){
        return "没有找到匹配内容"
    } else {return matchs.join("\n")}
}

function grepSearch(input:{pattern:string,path?:string}):string{
    try{
    const grepResult = execFileSync("grep",["--line-number","-r","--color=never","--",input.pattern,input.path??"."],
        {encoding:"utf-8",maxBuffer:10 * 1024 *1024,timeout:10000})
    const newGrepResult = grepResult.split(/\r?\n/).filter(line => line !=="").slice(0,100).join("\n")
    if (newGrepResult.length === 0){
        return "没有找到"
    } else {return newGrepResult}
    } catch(error:any){
        if (error.status === 1){
            return "没有匹配"
        } else {
            return grepJs(input)
        }
    }
}

function runShell(input:{command:string}):string{
    try{
    const output = execSync(input.command,{
            "shell" : "powershell.exe",
            "encoding" :  "utf-8",
            "timeout" : 30000,
            "maxBuffer" : 5*1024*1024,
            "stdio":["pipe","pipe","pipe"]
        }
    )
    return output ==="" ? "无输出" : output
    }
    catch(error:any){
        return `退出状态：${error.status}，标准输出：${error.stdout ? error.stdout : ""}，标准错误：${error.stderr ? error.stderr : ""}`
    }
}





export async function executeTool(toolName:string,input:Record<string,any>) : Promise<string>{
    switch(toolName){
        case "read_file":
            return readFile(input as {file_path : string})
        case "write_file":
            return writeFile(input as {file_path:string,content:string})
        case "edit_file":
            return editFile(input as {file_path:string,old_string:string,new_string:string})
        case "list_files":
            return listFiles(input as {pattern : string,path?:string})
        case "grep_search":
            return grepSearch(input as {pattern :string,path?:string})
        case "run_shell":
            return runShell(input as {command : string})
        default:
            return `错误，工具名称为：${toolName}`
    }
}