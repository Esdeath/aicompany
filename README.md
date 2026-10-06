# 企业知识库

按「公司 → 文章」整理 `company/` 中的 Markdown 资料。页面沿用 `website_duan` 的纸感配色、本地文楷字体、左侧目录和三种阅读主题，包含公司目录、年份与类型筛选、全文搜索、章节目录及阅读字号设置。

## 本地运行

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:3000。开发服务在 `company/` 或 `public/` 变更后自动生成页面，刷新即可查看。

```bash
npm run build     # 生成 dist/ 静态网站
npm run preview   # 本地预览
```

使用其他端口：`npm run dev -- --port 3001`。生成的 `dist/` 可直接部署到支持目录 `index.html` 的静态托管服务；网站按域名根目录部署。

## 添加资料

在 `company/公司目录/` 内添加 `.md` 文件，也可以为每篇文章建立独立子目录，图片放在该目录的 `images/` 中，用 `![](images/文件名.webp)` 引用。网站递归收录文章并保留原始文件，不会改写正文。

公司显示名称、人物及简介由 `scripts/content.mjs` 中的公司配置控制。新建的公司目录会自动出现，未配置的公司使用目录原名。文章标题取自原文或文件名，资料日期优先使用正文开头明确注明的日期，再使用文件名日期或年份；未注明日期的文章单独归类。文章地址由相对文件路径产生，修改文件名会改变地址。

页面在构建时生成完整 HTML，全文索引只在搜索时加载。主题和字号设置仅保存在浏览器中。本地字体的授权见 `public/fonts/OFL.txt`。

## Cloudflare Pages 部署

Cloudflare Pages 项目 `aicompany` 已连接 GitHub 仓库 [Esdeath/aicompany](https://github.com/Esdeath/aicompany)，生产分支为 `main`。推送到 `main` 后自动构建和发布。

正式网址：[www.labook.cn](https://www.labook.cn)。Pages 地址：[aicompany-5ny.pages.dev](https://aicompany-5ny.pages.dev)。

| 构建设置 | 值 |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 仓库根目录 |
| Node.js | 22（`.nvmrc`） |
| `SITE_URL` | `https://www.labook.cn` |

构建会生成使用正式域名的 canonical、Open Graph、`sitemap.xml` 和 `robots.txt`。可通过构建环境变量 `SITE_URL` 修改域名。

自定义域名 `www.labook.cn` 已登记在 Pages 项目中。阿里云解析使用 `www` 的 CNAME，目标为 `aicompany-5ny.pages.dev`，TTL 为 600 秒。
