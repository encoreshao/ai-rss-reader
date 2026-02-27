# AI RSS Reader

从 Andrej Karpathy 推荐的顶级技术博客中抓取最新文章，支持聚合订阅、包括 X (Twitter) 账号，多模型 AI 智能摘要与每日资讯简报。

[English](./README.en.md)

> 信息源来源 [HN Popularity Contest](https://refactoringenglish.com/tools/hn-popularity/)，涵盖 paulgraham.com、krebsonsecurity.com、simonwillison.net、daringfireball.net 等。

---

## 功能特性

- **多源聚合** — 订阅 RSS 源与 X (Twitter) 账号，统一在一个界面浏览
- **分类管理** — 按 Engineering、AI、Security、Tech 等类别整理订阅
- **文章内容面板** — 点击任意文章卡片，在右侧面板内阅读全文；无正文内容时自动回退到 iframe 内嵌
- **AI 文章摘要** — 单击即可生成精简摘要，支持多 AI 模型
- **每日/每周简报** — 一键生成编辑风格的 AI 资讯简报（类似 Morning Brew）
- **多 AI 提供商** — 在界面内切换 Gemini、Claude、OpenAI，API Key 仅存储在浏览器本地
- **CSV 导出** — 将当前文章列表导出为 CSV 文件，便于存档或二次处理
- **无 API Key 优雅降级** — 未配置时应用正常运行，点击 AI 功能时弹出设置引导

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 · TypeScript · Tailwind CSS v4 · Framer Motion |
| 后端 | Node.js · Express · tsx |
| 数据库 | SQLite（better-sqlite3） |
| 构建 | Vite 6 |
| AI | Gemini (`@google/genai`) · Claude (`@anthropic-ai/sdk`) · OpenAI (`openai`) |

## 快速开始

**环境要求：** Node.js `>=22.12.0`（推荐使用 nvm）

```bash
# 切换到正确的 Node 版本
nvm use

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)。

点击顶部工具栏的 **⚙ 齿轮图标**，选择 AI 提供商并粘贴对应的 API Key 即可启用 AI 功能。Key 仅存储在浏览器 localStorage 中，不写入任何文件。

> 不配置 API Key 也可正常阅读订阅内容，点击 AI 功能时会自动打开设置弹窗引导配置。

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（Express + Vite HMR） |
| `npm run build` | 构建生产版本到 `dist/` |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | TypeScript 类型检查 |

## AI 提供商配置

| 提供商 | 使用模型 | 获取 Key |
|--------|----------|----------|
| Gemini | `gemini-2.0-flash` | [Google AI Studio](https://aistudio.google.com/apikey) |
| Claude | `claude-opus-4-5` | [Anthropic Console](https://console.anthropic.com/) |
| OpenAI | `gpt-4o` | [OpenAI Platform](https://platform.openai.com/api-keys) |

API Key 通过浏览器 → 本地 Express 服务器 → AI 提供商的路径传递，不经过任何第三方服务器。

## 项目结构

```
├── server.ts          # Express 服务端（RSS 代理 + AI 路由 + Vite 中间件）
├── src/
│   ├── App.tsx        # 主界面与所有交互逻辑
│   ├── constants.ts   # 默认订阅源列表（60+ 精选博客）
│   └── services/
│       └── aiService.ts  # 多提供商 AI 服务封装
├── vite.config.ts     # Vite 配置
├── .nvmrc             # 固定 Node 版本（22.18.0）
└── rss_reader.db      # SQLite 数据库（运行后自动生成，已加入 .gitignore）
```

## 添加订阅源

点击侧边栏右上角的 **+** 按钮，支持 RSS URL 和 X (Twitter) 用户主页链接。应用内置 60+ 优质英文博客作为默认订阅。
