import { existsSync, readFileSync,readdirSync,statSync } from "node:fs";
import { basename } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import { join } from "node:path";
import { homedir } from "node:os";

export type SkillDefinition = {
    name : string,
    description : string,
    whenToUse ?: string,
    allowedTools ?:string[],
    userInvocable : boolean,
    context : "inline" | "fork",
    promptTemplate :string,
    source : "project" | "user",
    skillDir : string
}

let cachedSkills:SkillDefinition[] | null = null

function parseSkillFile(filePath:string,soucre:"project"|"user",skillDir:string):SkillDefinition|null{
    try {
    const skillContent = readFileSync(filePath,"utf-8")
    const frontMatterResult =  parseFrontmatter(skillContent)
    const raw = frontMatterResult.meta["allowed-tools"]
    let allowedTools: string[] | undefined

    if (raw) {
        if (raw.startsWith("[")) {
            try {
                allowedTools = JSON.parse(raw)
            } catch {
                allowedTools = raw
                    .replace(/[\[\]]/g, "")
                    .split(",")
                    .map(item => item.trim())
            }
        } else {
            allowedTools = raw.split(",").map(item => item.trim())
        }
    }
    return {
        name : frontMatterResult.meta.name || basename(skillDir) || "unknown",
        description : frontMatterResult.meta.description || "",
        whenToUse : frontMatterResult.meta.when_to_use || frontMatterResult.meta["when-to-use"],
        allowedTools : allowedTools,
        userInvocable : frontMatterResult.meta["user-invocable"] !== "false",
        context : frontMatterResult.meta.context ==="fork" ? "fork" : "inline",
        promptTemplate : frontMatterResult.body,
        source : soucre,
        skillDir : skillDir
    }
} catch {
    return null
}
}

function loadskillsFromDir(baseDir:string,soucre:"project"|"user",map:Map<string,SkillDefinition>):void{
    let entries
    try{
    entries = readdirSync(baseDir)
    } catch {return}
    for (const entry of entries){
        const skillDir = join(baseDir,entry)
        try{
        if (statSync(skillDir).isDirectory()){
            const fullPath =  join(skillDir,"SKILL.md")
            if (existsSync(fullPath)){
                const SkillDefinition = parseSkillFile(fullPath,soucre,skillDir)
                if (SkillDefinition){
                    map.set(SkillDefinition.name,SkillDefinition)
                }
            }
        }
        } catch {continue}
    }
    return
}

export function discoverSkills():SkillDefinition[]{
    if (cachedSkills){
        return cachedSkills
    } else {
        const map:Map<string,SkillDefinition> = new Map()
        const userDir = join(homedir(),".claude","skills")
        loadskillsFromDir(userDir,"user",map)
        const projectDir = join(process.cwd(),".claude","skills")
        loadskillsFromDir(projectDir,"project",map)
        cachedSkills = Array.from(map.values())
        return cachedSkills
    }
}

export function buildSkillDescription():string{
    const skillsArrays = discoverSkills()
    const simpleSkillArrays = skillsArrays.map((item)=>{
        return "处理用户请求时，先根据可用技能的描述和适用条件判断是否匹配。若匹配，先调用 skill 工具：skill_name 填技能名称，args 填本次任务要求。取得完整技能说明后再执行任务；没有匹配技能时，按通常方式处理。" + "\n" + item.name + "\n" + item.description + "\n" + (item.whenToUse? "\n" + item.whenToUse : "") + "\n" + (item.userInvocable ? `${item.name}:用户可手工输入/技能名来调用，模型也可以调用` : `${item.name}:仅供模型调用`)
    })
    const skillDescription = simpleSkillArrays.join("\n")
    return skillDescription
}

export function getSkillByName(name:string):SkillDefinition|null{
    const skillsArrays = discoverSkills()
    const SkillDefinition = skillsArrays.find((item)=>item.name === name) ?? null
    return SkillDefinition
}

export function resolveSkillPrompt(skill:SkillDefinition,args:string):string{
    return skill.promptTemplate
            .replace(/\$ARGUMENTS/g,()=>args)
            .replace(/\$\{CLAUDE_SKILL_DIR\}/g, () => skill.skillDir)
}

export function executeSkill(skillName:string,args:string){
    const skillDefinition = getSkillByName(skillName)
    if (skillDefinition === null){
        return null
    }
    return {
        prompt : resolveSkillPrompt(skillDefinition,args),
        allowedTools : skillDefinition.allowedTools,
        context : skillDefinition.context
    }
}
