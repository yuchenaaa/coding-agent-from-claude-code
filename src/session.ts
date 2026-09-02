import { writeFileSync,readFileSync,existsSync } from "node:fs";
import { join } from "node:path";

const sessionFile = join(process.cwd(),".mini-session.json")

export function saveSession(messages:unknown[]):void{
    const jsonFile = JSON.stringify(messages,null,2)
    try{
        writeFileSync(sessionFile,jsonFile,"utf-8")
    }
    catch(error){
        return;
    }
}

export function loadSession():unknown[]|null {
    if (existsSync(sessionFile)) {
        try{
            const jsonFile = readFileSync(sessionFile,"utf-8")
            return JSON.parse(jsonFile)
        } catch {return null}
    }
    return null
}