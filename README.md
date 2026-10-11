# Marlobbz 的博客

基于 [Fuwari](https://github.com/saicaca/fuwari)（Astro + Svelte + Tailwind CSS）构建的个人博客，部署在 Vercel。

- 🌐 线上地址：https://blog-rho-coral-22.vercel.app/
- 🔧 管理后台：https://blog-rho-coral-22.vercel.app/admin/

## ✨ 发布文章的三种方式

### 方式一：网页管理后台上传（推荐）

1. 访问 `/admin/`，输入管理密码登录；
2. 把写好的 `.md` 文件拖进上传区（支持一次多选），文件里已有的 frontmatter（标题、分类、标签等）会被自动识别填入表单，也可以直接在网页上编写；
3. 检查/修改 **分类、标签、摘要、日期** 等信息，点击「发布全部」；
4. 文章会自动提交到本仓库，Vercel 会自动重新部署，约 1-2 分钟后文章上线。

管理后台还支持：编辑已发布的文章、删除文章（可在 Git 历史中恢复）、按标题/分类/标签搜索文章。

### 方式二：本地写作

```sh
pnpm install
pnpm new-post my-post     # 在 src/content/posts/ 下创建新文章模板
# 编辑 src/content/posts/my-post.md
pnpm dev                  # 本地预览 http://localhost:4321
git push                  # 提交后 Vercel 自动部署
```

### 方式三：直接在 GitHub 网页上上传

打开本仓库的 `src/content/posts/` 目录 → Add file → Upload files → 上传 `.md` 文件并提交，Vercel 会自动部署。

## 📝 文章 Frontmatter 格式

```yaml
---
title: 我的第一篇文章      # 必填
published: 2026-10-11     # 必填，发布日期
description: 一句话摘要
image: ""                 # 封面图（可选）
tags: [Linux, CTF]        # 标签，任意多个
category: 技术            # 分类，一篇只属于一个分类
draft: false              # true = 草稿，不会出现在网站上
lang: ""                  # 留空表示使用站点默认语言 zh_CN
---

正文使用 Markdown 书写，支持 GFM、LaTeX 公式、代码高亮、提示框（> [!NOTE]）、GitHub 仓库卡片（::github{repo="user/repo"}）等扩展语法。
```

## 🔧 环境变量配置（管理后台需要）

管理后台通过 GitHub API 把文章提交到仓库。首次使用前需在 **Vercel → 项目 → Settings → Environment Variables** 中配置：

| 变量名 | 说明 |
| --- | --- |
| `ADMIN_PASSWORD` | 管理后台的登录密码（自定义一个强密码） |
| `GITHUB_TOKEN` | GitHub 访问令牌，见下方创建步骤 |
| `GITHUB_REPO` | 可选，默认 `Marlobbz/blog` |
| `GITHUB_BRANCH` | 可选，默认 `main` |

**创建 GITHUB_TOKEN（Fine-grained token）步骤：**

1. 打开 GitHub → Settings → Developer settings → [Personal access tokens (fine-grained)](https://github.com/settings/personal-access-tokens/new)；
2. Repository access 选择 **Only select repositories** → 勾选 `Marlobbz/blog`；
3. Permissions 中设置 **Contents: Read and write**（Metadata 会自动变为 Read-only）；
4. 生成并复制 token，粘贴到 Vercel 的 `GITHUB_TOKEN` 环境变量中；
5. 在 Vercel → Deployments 中对最近一次部署点 **Redeploy** 使环境变量生效。

## 💻 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 安装依赖（需要 Node.js ≥ 20 和 pnpm） |
| `pnpm dev` | 启动本地开发服务器 localhost:4321 |
| `pnpm build` | 构建生产版本到 `./dist/`（含搜索索引） |
| `pnpm preview` | 本地预览构建结果 |
| `pnpm new-post <文件名>` | 创建新文章模板 |
| `pnpm format` | 用 Biome 格式化代码 |

## 📁 目录结构

```
├── api/posts.js            # 管理后台的 Serverless API（Vercel Functions）
├── src/
│   ├── config.ts           # 站点配置（标题、侧栏、导航等）
│   ├── content/
│   │   ├── posts/          # ★ 文章目录（.md 文件）
│   │   └── spec/about.md   # 关于页面
│   ├── pages/admin.astro   # 管理后台页面
│   └── styles/             # 主题样式
└── astro.config.mjs        # Astro 配置（site 为线上域名）
```
