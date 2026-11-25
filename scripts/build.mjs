import { mkdir, writeFile, cp, rm, readdir, rename, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readLibrary } from './content.mjs';
import { homePage, aboutPage, companyPage, articlePage, notFoundPage, resolveSiteUrl, pageUrl, escapeHtml } from './templates.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const output = path.join(root, 'dist');
const siteName = '企业知识库';
const siteDescription = '按公司整理创始人与管理层的访谈、演讲、公开信，以及财报与业绩电话会等原始资料。';
const editorName = '寻长坡以滚雪球';
const siblingLibraries = [
  ['段永平资料库', 'https://www.ayaseeri.com/'],
  ['巴菲特资料库', 'https://buffett.ayaseeri.com/'],
  ['芒格资料库', 'https://munger.ayaseeri.com/'],
  ['帕伯莱资料库', 'https://pabrai.ayaseeri.com/'],
  ['马斯克资料库', 'https://elon.ayaseeri.com/'],
  ['伯克希尔股东信', 'https://berkshireletters.ayaseeri.com/'],
];
const crawlerAgents = [
  'Baiduspider', 'Baiduspider-render', 'Bytespider', 'Doubaobot',
  'Sogou web spider', 'Sogou inst spider', 'YisouSpider', '360Spider',
  'QwenBot', 'KimiBot', 'Kimi-Reader', 'Bingbot',
  'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot',
  'Claude-User', 'Google-Extended', 'Applebot-Extended', 'Amazonbot',
];
const isoDay = value => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '');
function gitLastDate(relativePath) {
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', relativePath], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return isoDay(date);
  } catch { return ''; }
}
async function sourceLastDate(relativePath) {
  const committed = gitLastDate(relativePath);
  if (committed) return committed;
  try {
    const info = await stat(path.join(root, relativePath));
    return isoDay(info.mtime.toISOString().slice(0, 10));
  } catch { return ''; }
}
const newestDate = dates => dates.filter(Boolean).sort().at(-1) || '';

async function collectFiles(directory, prefix = '') {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

async function publish(staging) {
  const previous = await collectFiles(output);
  const next = await collectFiles(staging);
  const nextSet = new Set(next);
  // Publish complete files atomically, so an open preview never loses its CSS,
  // scripts or images while a new article is being generated.
  for (const relative of next) {
    const destination = path.join(output, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      await cp(path.join(staging, relative), temporary);
      await rename(temporary, destination);
    } finally { await rm(temporary, { force: true }); }
  }
  for (const relative of previous) if (!nextSet.has(relative)) await rm(path.join(output, relative), { force: true });
}

export async function build() {
  const siteUrl = resolveSiteUrl();
  const library = await readLibrary(root);
  const staging = path.join(root, `.build-${randomUUID()}`);
  try {
    await mkdir(staging, { recursive: true });
    await cp(path.join(root, 'public'), staging, { recursive: true });
    await cp(path.join(root, 'company'), path.join(staging, 'company'), {
      recursive: true,
      filter: source => !path.basename(source).startsWith('.'),
    });
    async function writePage(relative, html) {
      const destination = path.join(staging, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, html, 'utf8');
    }
    await writePage('index.html', homePage(library, siteUrl));
    await writePage('about/index.html', aboutPage(library, siteUrl));
    for (const company of library.companies) await writePage(`companies/${company.id}/index.html`, companyPage(library, company, siteUrl));
    for (const article of library.articles) await writePage(`articles/${article.id}/index.html`, articlePage(library, article, siteUrl));
    await writePage('404.html', notFoundPage(library, siteUrl));
    const articleLastmods = new Map();
    for (const article of library.articles) articleLastmods.set(article.url, await sourceLastDate(article.sourcePath));
    const companyLastmod = company => newestDate(company.articles.map(article => articleLastmods.get(article.url)));
    const sitemapEntries = [
      ['/', newestDate([...articleLastmods.values()])],
      ['/about/', await sourceLastDate('scripts/templates.mjs')],
      ...library.companies.map(company => [`/companies/${company.id}/`, companyLastmod(company)]),
      ...library.articles.map(article => [article.url, articleLastmods.get(article.url)]),
    ];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.map(([pathname, lastmod]) => `  <url><loc>${escapeHtml(pageUrl(pathname, siteUrl))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
    await writeFile(path.join(staging, 'sitemap.xml'), sitemap, 'utf8');
    const robots = `${['*', ...crawlerAgents].map(agent => `User-agent: ${agent}\nAllow: /\n`).join('\n')}\nSitemap: ${pageUrl('/sitemap.xml', siteUrl)}\n`;
    await writeFile(path.join(staging, 'robots.txt'), robots, 'utf8');
    const peopleLabel = company => (company.people?.length ? company.people.join('、') : company.person || '人物未标注');
    const companyLines = library.companies.map(company => `- ${company.name}（${peopleLabel(company)}）：${company.description} [公司页](${pageUrl(`/companies/${company.id}/`, siteUrl)})`).join('\n');
    const companyIndex = library.companies.map(company => `- ${company.name}（${peopleLabel(company)}）：${company.articles.length} 篇 — ${pageUrl(`/companies/${company.id}/`, siteUrl)}`).join('\n');
    const articleLines = library.articles.map(article => {
      const company = library.companies.find(item => item.id === article.companyId);
      const source = article.source?.url ? ` 原始来源：${article.source.url}` : '';
      return `- ${article.displayTitle}｜${company.name}｜${article.category}｜${article.date || '日期未注明'}：${article.excerpt}${source} [文章页](${pageUrl(article.url, siteUrl)})`;
    }).join('\n');
    const articleYears = library.articles.map(article => article.year).filter(Boolean).sort();
    const yearSpan = articleYears.length ? `${articleYears[0]}—${articleYears.at(-1)} 年` : '年份未标注';
    const undatedCount = library.articles.filter(article => !article.date).length;
    const libraryLinks = siblingLibraries.map(([name, url]) => `- [${name}](${url})`).join('\n');
    const citationGuide = [
      '1. 先引用文章页标题和链接，再引用其中结论；不要只转述摘要。',
      '2. 引用前核对页面上的日期、文章类型（访谈、演讲、随笔、报道、财报、业绩会）和「原始资料」入口。',
      '3. 标注为转载或节选的页面按整理稿引用；原文与编者概括以原始资料入口为准。',
      '4. 请勿表示本站或编者与拼多多、泡泡玛特、腾讯及相关人物存在隶属、合作或授权关系。',
    ].join('\n');
    await writeFile(path.join(staging, 'llms.txt'), `# ${siteName}\n\n> ${siteDescription}由「${editorName}」持续整理，覆盖 ${library.companies.length} 家公司、${library.articles.length} 篇文章${undatedCount ? `（其中 ${undatedCount} 篇日期未注明）` : ''}，全部为中文（zh-CN）。本站是独立整理的公开资料库，不代表相关公司或人物。\n\n## 本站怎么被引用\n\n${citationGuide}\n\n## 内容规模\n\n- 公司：${library.companies.length} 家（${library.companies.map(company => company.name).join('、')}）\n- 文章：${library.articles.length} 篇，日期覆盖 ${yearSpan}${undatedCount ? `，另有 ${undatedCount} 篇日期未注明` : ''}\n- 语言：简体中文（zh-CN）；每篇文章标注日期、类型与原始资料入口。\n\n## 公司分区\n\n${companyIndex}\n\n## 推荐入口\n\n- [企业知识库首页](${pageUrl('/', siteUrl)})\n- [资料范围与引用方法](${pageUrl('/about/', siteUrl)})\n- [完整资料摘要 llms-full.txt](${pageUrl('/llms-full.txt', siteUrl)})\n- [网站地图](${pageUrl('/sitemap.xml', siteUrl)})\n\n## 同一编者的其他资料库\n\n${libraryLinks}\n`, 'utf8');
    await writeFile(path.join(staging, 'llms-full.txt'), `# ${siteName}｜完整资料摘要\n\n> ${siteDescription}本站是独立整理的公开资料库，不代表相关公司或人物。\n\n- 规模：${library.companies.length} 家公司、${library.articles.length} 篇文章，中文（zh-CN），日期覆盖 ${yearSpan}。\n- 引用建议：先引用文章页标题和链接，再核对日期、文章类型与原始资料入口；标注为转载或节选的按整理稿引用。\n- 编辑者：${editorName}（https://www.ayaseeri.com/#editor）。\n\n## 公司与入口\n\n${companyLines}\n\n## 全部文章（标题｜公司｜类型｜日期｜摘要｜原始来源｜文章页）\n\n${articleLines}\n`, 'utf8');
    const searchIndex = library.articles.map(article => ({
      id: article.id,
      title: article.displayTitle,
      url: article.url,
      company: library.companies.find(c => c.id === article.companyId).name,
      person: library.companies.find(c => c.id === article.companyId).person,
      date: article.date,
      category: article.category,
      excerpt: article.excerpt,
      dateLabel: article.dateLabel,
      source: article.source,
      text: article.text,
    }));
    await writeFile(path.join(staging, 'search-index.json'), JSON.stringify(searchIndex));
    await writeFile(path.join(staging, 'library.json'), JSON.stringify({
      companies: library.companies.map(({ articles, ...company }) => ({ ...company, articleCount: articles.length })),
      articleCount: library.articles.length,
    }, null, 2));
    await publish(staging);
    console.log(`已生成 ${library.companies.length} 家公司、${library.articles.length} 篇文章 → dist/`);
    return library;
  } finally { await rm(staging, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch(error => { console.error(error); process.exitCode = 1; });
}
