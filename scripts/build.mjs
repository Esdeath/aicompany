import { mkdir, writeFile, cp, rm, readdir, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readLibrary } from './content.mjs';
import { homePage, companyPage, articlePage, notFoundPage, resolveSiteUrl, pageUrl, escapeHtml } from './templates.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const output = path.join(root, 'dist');

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
    for (const company of library.companies) await writePage(`companies/${company.id}/index.html`, companyPage(library, company, siteUrl));
    for (const article of library.articles) await writePage(`articles/${article.id}/index.html`, articlePage(library, article, siteUrl));
    await writePage('404.html', notFoundPage(library, siteUrl));
    const sitemapPaths = ['/', ...library.companies.map(company => `/companies/${company.id}/`), ...library.articles.map(article => article.url)];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPaths.map(pathname => `  <url><loc>${escapeHtml(pageUrl(pathname, siteUrl))}</loc></url>`).join('\n')}\n</urlset>\n`;
    await writeFile(path.join(staging, 'sitemap.xml'), sitemap, 'utf8');
    await writeFile(path.join(staging, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${pageUrl('/sitemap.xml', siteUrl)}\n`, 'utf8');
    const searchIndex = library.articles.map(article => ({
      id: article.id,
      title: article.displayTitle,
      url: article.url,
      company: library.companies.find(c => c.id === article.companyId).name,
      person: library.companies.find(c => c.id === article.companyId).person,
      date: article.date,
      category: article.category,
      excerpt: article.excerpt,
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
