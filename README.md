# AI RSS Reader

从 Andrej Karpathy 推荐的顶级技术博客中抓取最新文章，支持聚合订阅、包括 X (Twitter) 账号，智能摘要与每日资讯简报。

[English](./README.en.md)

> 信息源来源 [HN Popularity Contest](https://refactoringenglish.com/tools/hn-popularity/)，涵盖 paulgraham.com, krebsonsecurity.com, simonwillison.net、daringfireball.net 等。

---

## 功能特性

- **多源聚合** — 订阅 RSS 源与 X (Twitter) 账号，统一在一个界面浏览
- **分类管理** — 按 Engineering、AI、Security、Tech 等类别整理订阅
- **AI 文章摘要** — 单击即可通过 Gemini 生成任意文章的精简摘要
- **每日/每周简报** — 一键生成编辑风格的 AI 资讯简报（类似 Morning Brew）
- **CSV 导出** — 将当前文章列表导出为 CSV 文件，便于存档或二次处理
- **无 API Key 优雅降级** — 未配置 Gemini API Key 时，应用正常运行并通过 Toast 提示

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 · TypeScript · Tailwind CSS v4 · Framer Motion |
| 后端 | Node.js · Express · tsx |
| 数据库 | SQLite（better-sqlite3） |
| 构建 | Vite 6 |
| AI | Google Gemini（`@google/genai`） |

## 快速开始

**环境要求：** Node.js `>=22.12.0`（推荐使用 nvm）

```bash
# 切换到正确的 Node 版本
nvm use

# 安装依赖
npm install

# （可选）配置 Gemini API Key，启用 AI 功能
cp .env.example .env.local
# 编辑 .env.local，填入 GEMINI_API_KEY=your_key_here

# 启动开发服务器
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)。

> 不设置 API Key 也可正常阅读订阅内容，AI 功能（摘要与简报）会在点击时通过 Toast 提示需要配置。

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（Express + Vite HMR） |
| `npm run build` | 构建生产版本到 `dist/` |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | TypeScript 类型检查 |

## 项目结构

```
├── server.ts          # Express 服务端（RSS 代理 + Vite 中间件）
├── src/
│   ├── App.tsx        # 主界面与所有交互逻辑
│   ├── constants.ts   # 默认订阅源列表
│   └── services/
│       └── geminiService.ts  # Gemini AI 封装
├── vite.config.ts     # Vite 配置
├── .nvmrc             # 固定 Node 版本（22.18.0）
└── rss_reader.db      # SQLite 数据库（运行后自动生成）
```

## 添加订阅源

点击侧边栏右上角的 **+** 按钮，支持 RSS URL 和 X (Twitter) 用户主页链接。应用内置 60+ 优质英文博客作为默认订阅。
