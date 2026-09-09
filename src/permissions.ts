const dangerous = [
  /\brm\s/,
  /\bgit\s+(push|reset|clean|checkout\s+\.)/,
  /\bsudo\b/,
  /\bmkfs\b/,
  /\bdd\s/,
  />\s*\/dev\//,
  /\bkill\b/,
  /\bpkill\b/,
  /\breboot\b/,
  /\bshutdown\b/,

  // Windows / PowerShell
  /\bdel\s/i,
  /\brmdir\s/i,
  /\bformat\s/i,
  /\btaskkill\s/i,
  /\bRemove-Item\s/i,
  /\bStop-Process\s/i,
];

export function checkPermission(toolName:string,input:Record<string,any>):"allow" | "deny"{
    if (toolName === "run_shell"){
        const command = String(input.command || "")
        if (dangerous.some((rule)=>rule.test(command))){
            return "deny"
        }
    }
    return "allow"
}