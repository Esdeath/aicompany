export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const e = escapeHtml;
export function resolveSiteUrl(value = process.env.SITE_URL || 'https://www.labook.cn') {
  let url;
  try { url = new URL(String(value).trim()); }
  catch { throw new Error('SITE_URL 必须是有效的 http(s) 网站地址。'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('SITE_URL 必须是 http(s) 网站地址，且不能包含用户信息、查询参数或片段。');
  }
  return url.href.replace(/\/+$/, '');
}
export const pageUrl = (pathname, siteUrl = resolveSiteUrl()) => new URL(pathname, `${siteUrl}/`).href;
const icons = {
  search: '<circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/>',
  arrow: '<path d="M4 10h12m-5-5 5 5-5 5"/>',
  chevron: '<path d="m7 5 5 5-5 5"/>',
  book: '<path d="M10 5c-2-2-5-2-8-1v12c3-1 6-1 8 1 2-2 5-2 8-1V4c-3-1-6-1-8 1Zm0 0v12"/>',
  menu: '<path d="M3 5h14M3 10h10M3 15h14"/>',
  close: '<path d="m5 5 10 10M15 5 5 15"/>',
  theme: '<circle cx="10" cy="10" r="4"/><path d="M10 1v2m0 14v2M1 10h2m14 0h2M3.6 3.6 5 5m10 10 1.4 1.4M3.6 16.4 5 15M15 5l1.4-1.4"/>',
  link: '<path d="m8 12 4-4m-6 6-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2-2 1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0" transform="translate(1 1)"/>',
};
export const icon = (name, cls = '') => `<svg class="${cls}" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
const companyUrl = company => `/companies/${company.id}/`;
const companyYears = company => {
  const years = company.articles.map(a => a.year).filter(Boolean).sort();
  if (!years.length) return '资料整理';
  return years[0] === years.at(-1) ? `${years[0]} 年` : `${years[0]}—${years.at(-1)}`;
};
const readableDate = article => article.dateLabel || (article.date?.length >= 7 ? article.date.replaceAll('-', '.') : article.year ? `${article.year} 年` : '日期未注明');

const sourceStatusLabels = { original: '原站来源', author_republish: '作者公开稿', reprint_only: '首发待核 · 现存转载' };
const sourceFormLabels = { full_text: '已发表文字稿', excerpt: '公开精选／节选', report_excerpt: '报道／发言摘录', video: '视频', audio: '音频', book: '原书／公开书摘' };
function sourcePanel(article) {
  const source = article.source;
  if (!source) return '';
  const action = source.status === 'reprint_only' ? '查看现存转载'
    : source.form === 'video' ? '观看原始视频'
      : source.form === 'audio' ? '收听原始音频'
        : source.form === 'book' ? '查看原书与书摘'
          : source.form === 'excerpt' ? '阅读公开原稿' : '阅读原文';
  const formLabel = source.status === 'reprint_only' && ['video', 'audio'].includes(source.form)
    ? source.form === 'video' ? '视频转载' : '音频转载' : sourceFormLabels[source.form];
  return `<section class="original-source" aria-label="原始资料入口"><div class="source-meta"><span>${e(sourceStatusLabels[source.status])}</span><span>${e(formLabel)}</span>${source.name ? `<span>${e(source.name)}</span>` : ''}${source.published ? `<span>发表：${e(source.published.replaceAll('-', '.'))}</span>` : ''}</div><h2>${e(source.title === article.title ? '原始资料' : source.title)}</h2>${source.note ? `<p>${e(source.note)}</p>` : ''}<a class="source-action" href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(action)}${icon('arrow')}</a><p class="source-reading-note">以下正文为站内导读；原始资料请从上方入口阅读。</p></section>`;
}

function sidebar(library, currentCompany, currentArticle) {
  return `<aside id="sidebar" class="sidebar" aria-label="知识库目录">
    <div class="sidebar-header"><a class="sidebar-brand" href="/"><span class="brand-seal" aria-hidden="true">企</span><span class="brand-text">企业知识库</span></a><p class="brand-caption">在阅读中，理解生意。</p><button class="sidebar-mobile-close" aria-label="关闭目录">${icon('close')}</button></div>
    <nav class="sidebar-nav" aria-label="公司与文章">
      <button class="sidebar-search" data-open-search>${icon('search')}<span>搜索文章与内容</span><kbd class="search-shortcut">⌘ K</kbd></button>
      <a class="nav-home${!currentCompany ? ' active' : ''}" href="/" ${!currentCompany ? 'aria-current="page"' : ''}>${icon('book')}<span>知识库首页</span></a>
      <p class="nav-label">公司目录 <span>${library.companies.length}</span></p>
      ${library.companies.map(company => `<details class="company-group" ${currentCompany?.id === company.id ? 'open' : ''}>
        <summary class="company-summary">${icon('chevron', 'chevron')}<span class="company-name">${e(company.name)}</span><span class="company-count">${company.articles.length}</span></summary>
        <div class="company-links"><a class="company-overview${currentCompany?.id === company.id && !currentArticle ? ' active' : ''}" href="${companyUrl(company)}" ${currentCompany?.id === company.id && !currentArticle ? 'aria-current="page"' : ''}>全部文章${icon('arrow')}</a>
        <nav class="article-links" aria-label="${e(company.name)}文章">${company.articles.map(article => `<a href="${article.url}" class="${currentArticle?.id === article.id ? 'active' : ''}" ${currentArticle?.id === article.id ? 'aria-current="page"' : ''}><span>${e(article.displayTitle)}</span></a>`).join('')}</nav></div>
      </details>`).join('')}
    </nav>
    <div class="sidebar-footer"><p class="library-count">${library.companies.length} 家公司 <span>·</span> ${library.articles.length} 篇文章</p><div class="sidebar-tools">
      <label class="theme-control">${icon('theme')}<select id="theme-select" aria-label="阅读主题"><option value="light">浅色</option><option value="dark">深色</option><option value="green">护眼</option></select></label>
      <label class="font-control"><span aria-hidden="true">Aa</span><select id="font-size" aria-label="阅读字号"><option value="90">90%</option><option value="100" selected>100%</option><option value="110">110%</option><option value="120">120%</option><option value="130">130%</option></select></label>
    </div></div></aside>`;
}

function searchDialog() {
  return `<dialog id="search-dialog" class="search-dialog" aria-label="搜索知识库">
    <div class="search-dialog-header">${icon('search')}<input id="search-input" type="search" placeholder="搜索公司、文章或正文关键词" aria-label="搜索公司、文章或正文关键词" autocomplete="off"><button class="search-close" aria-label="关闭搜索">${icon('close')}</button></div>
    <div class="search-status" id="search-status" role="status" aria-live="polite">输入关键词，检索标题与全文</div>
    <div class="search-results" id="search-results"><div class="search-empty"><p>从一个感兴趣的问题开始</p><div class="search-suggestions"><button data-search-query="拼多多">拼多多</button><button data-search-query="泡泡玛特">泡泡玛特</button><button data-search-query="企业文化">企业文化</button></div></div></div>
    <div class="search-help"><span>↑ ↓ 选择文章</span><span>Enter 阅读</span><span>Esc 关闭</span></div>
  </dialog>`;
}

function layout(library, { title, description, content, company, article, pageType = 'home', siteUrl }) {
  const fullTitle = `${title}${title === '企业知识库' ? '' : '｜企业知识库'}`;
  const pathname = article?.url || (company ? companyUrl(company) : pageType === 'error' ? '/404.html' : '/');
  const url = pageUrl(pathname, siteUrl);
  const indexMetadata = pageType === 'error' ? '<meta name="robots" content="noindex, follow">' : `<link rel="canonical" href="${e(url)}">`;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f8f5f0"><meta name="description" content="${e(description)}"><title>${e(fullTitle)}</title>${indexMetadata}<meta property="og:site_name" content="企业知识库"><meta property="og:type" content="${article ? 'article' : 'website'}"><meta property="og:title" content="${e(fullTitle)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(url)}"><link rel="icon" type="image/svg+xml" href="/favicon.svg">
<script>(function(){try{var t=localStorage.getItem('company-library-theme');if(!['light','dark','green'].includes(t))t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(t!=='light')document.documentElement.classList.add(t);var n=Number(localStorage.getItem('company-library-font'));if([90,100,110,120,130].includes(n))document.documentElement.style.setProperty('--article-font-scale',n+'%')}catch(e){}})();</script>
<link rel="stylesheet" href="/assets/fonts.css"><link rel="stylesheet" href="/assets/site.css"><script src="/assets/site.js" type="module"></script></head>
<body data-page="${pageType}" ${company ? `data-company="${e(company.id)}"` : ''}><a class="skip-link" href="#main-content">跳到正文</a>${article ? '<div class="reading-progress" role="progressbar" aria-label="阅读进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="reading-progress-bar"></div></div>' : ''}
<div class="shell">${sidebar(library, company, article)}<div class="main-area" id="main-scroll"><div class="mobile-topbar"><button class="mobile-menu" aria-label="打开目录" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button><a href="/" class="mobile-brand">企业知识库</a><button class="theme-quick" aria-label="切换阅读主题">${icon('theme')}</button></div><main id="main-content" tabindex="-1">${content}</main></div></div>
<div class="mobile-backdrop" hidden></div>${searchDialog()}</body></html>`;
}

const pageFooter = () => '<footer class="page-footer"><span>企业知识库</span><span>读原文，理解企业。</span></footer>';
const row = (article, company, filterable = false) => `<a class="article-row" href="${article.url}" ${filterable ? `data-type="${e(article.category)}" data-year="${e(article.year || 'undated')}" data-date="${e(article.date)}"` : ''}><div class="article-row-main"><div class="article-row-meta">${company ? `<span class="row-company">${e(company.name)}</span>` : ''}<span>${readableDate(article)}</span><span>${e(article.category)}</span>${article.source ? `<span>${e(sourceStatusLabels[article.source.status])}</span>` : `<span>${article.readingMinutes} 分钟阅读</span>`}</div><h3>${e(article.displayTitle)}</h3><p>${e(article.excerpt)}</p></div><span class="row-arrow">${icon('arrow')}</span></a>`;

export function homePage(library, siteUrl) {
  const content = `<div class="page-content home-content"><div class="page-topline"><nav class="breadcrumb" aria-label="面包屑">知识库 / 公司目录</nav><span class="edition-note">一份持续生长的阅读档案</span></div>
    <section class="companies-section" aria-labelledby="companies-title"><div class="section-heading"><h2 id="companies-title">从一家公司开始</h2><span class="section-note">沿着人物，走进企业</span></div><div class="company-grid">${library.companies.map(company => `<a class="company-card" href="${companyUrl(company)}"><div class="company-card-top"><span class="company-mark" aria-hidden="true">${e(company.name.slice(0, 1))}</span><span class="card-count">${company.articles.length} 篇文章</span></div><h2>${e(company.name)}</h2><p class="company-person">${e(company.person || '企业资料')}</p><p class="company-description">${e(company.description)}</p><div class="company-card-footer"><span>${companyYears(company)}</span><span>浏览文章 ${icon('arrow')}</span></div></a>`).join('')}</div></section>
    <section class="archive-section" aria-labelledby="recent-title"><div class="section-heading"><h2 id="recent-title">按时间阅读</h2><span class="section-note">最近的文献</span></div><div class="article-rows">${library.articles.slice(0, 5).map(article => row(article, library.companies.find(c => c.id === article.companyId))).join('')}</div></section>${pageFooter()}</div>`;
  return layout(library, { title: '企业知识库', description: '按公司整理创始人的访谈、演讲与思考，阅读企业成长的原始资料。', content, siteUrl });
}

export function companyPage(library, company, siteUrl) {
  const years = [...new Set(company.articles.map(a => a.year).filter(Boolean))].sort().reverse();
  const categories = [...new Set(company.articles.map(a => a.category))];
  const content = `<div class="page-content company-content"><div class="page-topline"><nav class="breadcrumb" aria-label="面包屑"><a href="/">知识库</a><span>/</span><span>${e(company.name)}</span></nav><span class="edition-note">公司档案</span></div>
    <header class="company-header"><div class="company-heading"><span class="company-mark large" aria-hidden="true">${e(company.name.slice(0, 1))}</span><div><h1>${e(company.name)}</h1><p class="company-person">${e(company.person || '企业资料')}</p></div></div><p class="company-intro">${e(company.description)}</p><div class="company-stats"><span>${company.articles.length} 篇文章</span><span>${companyYears(company)}</span><span>访谈、文字与企业记录</span></div></header>
    <div class="filter-bar"><div class="type-filters" aria-label="按文章类型筛选"><button class="filter-chip active" data-type="all" aria-pressed="true">全部</button>${categories.map(type => `<button class="filter-chip" data-type="${e(type)}" aria-pressed="false">${e(type)}</button>`).join('')}</div><label class="year-filter">年份<select id="year-filter" aria-label="按年份筛选"><option value="all">全部年份</option>${years.map(year => `<option value="${year}">${year} 年</option>`).join('')}${company.articles.some(a => !a.year) ? '<option value="undated">未注明日期</option>' : ''}</select></label></div>
    <div class="list-topline"><span id="result-count" role="status" aria-live="polite">共 ${company.articles.length} 篇文章</span><select id="sort-order" aria-label="文章排序"><option value="desc">从新到旧</option><option value="asc">从旧到新</option></select></div>
    <div id="company-articles">${[...years, ...(company.articles.some(a => !a.year) ? ['undated'] : [])].map(year => `<section class="year-section" data-year="${year}"><h2 class="year-heading">${year === 'undated' ? '日期未注明' : `${year}<span>年</span>`}</h2><div class="article-rows">${company.articles.filter(a => (a.year || 'undated') === year).map(article => row(article, null, true)).join('')}</div></section>`).join('')}</div>
    <p class="empty-state" hidden>这个年份没有此类文章。试试其他年份或选择“全部”。</p>${pageFooter()}</div>`;
  return layout(library, { title: `${company.name} · ${company.person || '公司档案'}`, description: company.description, content, company, pageType: 'company', siteUrl });
}

export function articlePage(library, article, siteUrl) {
  const company = library.companies.find(c => c.id === article.companyId);
  const index = company.articles.findIndex(a => a.id === article.id);
  const prev = company.articles[index - 1], next = company.articles[index + 1];
  const content = `<div class="page-content article-page"><nav class="breadcrumb" aria-label="面包屑"><a href="/">知识库</a><span>/</span><a href="${companyUrl(company)}">${e(company.name)}</a><span>/</span><span>文章</span></nav>
    <header class="article-header"><div class="article-meta"><a href="${companyUrl(company)}">${e(company.name)}</a><span>${e(article.category)}</span></div><h1 class="article-title">${e(article.displayTitle)}</h1><div class="article-byline"><span>${readableDate(article)}</span>${company.person ? `<span>相关人物 ${e(company.person)}</span>` : ''}<span>${article.source ? '站内导读 ' : ''}${article.wordCount.toLocaleString('zh-CN')} 字</span><span>约 ${article.readingMinutes} 分钟</span></div><div class="article-actions"><a class="back-link" href="${companyUrl(company)}">${icon('chevron')}公司文章</a><button class="copy-link">${icon('link')}<span>复制链接</span></button></div></header>
    ${sourcePanel(article)}<div class="article-layout"><article class="prose" id="article-body">${article.html}</article>${article.toc.length ? `<aside class="article-toc" aria-label="文章章节"><p class="toc-title">本文目录</p><nav>${article.toc.map(item => `<a href="#${e(item.id)}" data-level="${item.level}">${e(item.title)}</a>`).join('')}</nav></aside>` : ''}</div>
    <nav class="article-pagination" aria-label="相邻文章">${prev ? `<a class="prev" href="${prev.url}"><small>上一篇</small><span>${e(prev.displayTitle)}</span></a>` : '<span></span>'}${next ? `<a class="next" href="${next.url}"><small>下一篇</small><span>${e(next.displayTitle)}</span></a>` : '<span></span>'}</nav>${pageFooter()}</div>`;
  return layout(library, { title: article.displayTitle, description: article.excerpt, content, company, article, pageType: 'article', siteUrl });
}

export function notFoundPage(library, siteUrl) {
  return layout(library, { title: '页面未找到', description: '返回企业知识库继续阅读。', pageType: 'error', siteUrl, content: '<div class="page-content error-page"><p class="cover-subtitle">404</p><h1>这一页暂时没有收录</h1><p>可以回到公司目录，或搜索你想阅读的文章。</p><a class="button" href="/">返回知识库</a><button class="button" data-open-search>搜索文章</button></div>' });
}
