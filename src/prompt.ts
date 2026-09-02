import * as os from "node:os";
import { execSync } from "node:child_process";

const STATIC_CORE = `你是一个通过工具协助用户完成软件工程任务的编程助手。

# 完成任务
- 修改代码前先读取相关文件并理解现有实现。
- 非必要不创建新文件，优先修改已有文件。
- 只完成用户要求的内容，避免过度设计和扩大修改范围。

# 谨慎执行操作
- 优先选择容易撤销的操作。
- 执行删除文件、推送代码等危险或难以撤销的操作前，先征求用户确认。

# 使用工具
- 读取、写入、编辑、查找文件和搜索内容时，优先使用对应的专用工具。
- run_shell 只用于构建、测试、Git、安装依赖等真正需要终端的操作。

# 回答风格
- 回答简洁，结论优先。
- 引用代码时标明文件路径和行号。`

export function buildSystemPrompt(): string{
    const environmentContext = buildEnvironmentContext()
    return `${STATIC_CORE}\n\n${environmentContext}`
}

function buildEnvironmentContext(){
    const cwd = process.cwd()
    const platform = os.platform()
    const arch = os.arch()
    let gitinfo = ""
    try{
        const branch = execSync("git rev-parse --abbrev-ref HEAD",{
            encoding : "utf-8",
            stdio : ["pipe","pipe","pipe"],
            timeout : 3000
        }).trim()
        gitinfo = `\nGit分支：${branch}`
    } catch {
        gitinfo = ""
    }
    return `当前工作目录为：${cwd}，系统为：${platform}，架构为：${arch}，shell为powershell.exe${gitinfo}`
}