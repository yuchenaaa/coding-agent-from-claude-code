# Coding Agent from Claude Code

一个使用 TypeScript 从零实现的命令行 Coding Agent，参考 Claude Code 的核心机制逐章构建。

项目目前实现了：

- Agent Loop：模型回复、工具调用、工具结果回传的完整循环
- 六个核心工具：读取、写入、编辑、文件查找、内容搜索和 PowerShell 命令执行
- System Prompt：静态行为规则与动态运行环境
- CLI：单次命令和交互式 REPL
- 会话管理：保存、恢复和清空聊天记录
- DeepSeek Anthropic 兼容接口

## 运行环境

- Node.js 20+
- Windows / PowerShell
- DeepSeek API Key

## 本地运行

安装依赖：

```bash
npm install
```

复制 `.env.example` 为 `.env`，并填写 DeepSeek 配置：

```dotenv
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=your_anthropic_compatible_base_url
```

交互式运行：

```bash
npm start
```

单次运行：

```bash
npm start -- "读取 package.json 并概括这个项目"
```

恢复上次会话：

```bash
npm start -- --resume
```

## 可用命令

- `/clear`：清空当前聊天记录
- `exit` 或 `quit`：退出交互模式

## 构建

```bash
npm run build
```

项目仍在持续学习和迭代中，后续将继续加入流式输出、权限控制、上下文管理等机制。
