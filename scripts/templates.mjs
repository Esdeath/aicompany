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

const siteName = '企业知识库';
const siteDescription = '按公司整理创始人与管理层的访谈、演讲、公开信，以及财报与业绩电话会等原始资料。';
const siteKeywords = '企业史, 创始人访谈, 黄峥, 拼多多, 王宁, 泡泡玛特, 马化腾, 张小龙, 刘炽平, 腾讯, 商业思考, 原始资料';
const editorId = 'https://www.ayaseeri.com/#editor';
const editorName = '寻长坡以滚雪球';
const editorProfiles = [
  'https://xueqiu.com/u/lovelive',
  'https://www.zhihu.com/people/shanks-16-68',
  'https://www.xiaohongshu.com/user/profile/68125976000000000d00ac5d',
];
const organizationId = siteUrl => `${siteUrl}/#organization`;
const websiteId = siteUrl => `${siteUrl}/#website`;
const socialImage = siteUrl => `${siteUrl}/og-default.png`;
const socialImageAlt = '企业知识库：按公司整理的创始人访谈与财报原始资料';
const datePattern = /^(?:19|20)\d{2}(?:-\d{2}(?:-\d{2})?)?$/;
const siblingLibraries = [
  { name: '段永平资料库', url: 'https://www.ayaseeri.com/' },
  { name: '巴菲特资料库', url: 'https://buffett.ayaseeri.com/' },
  { name: '芒格资料库', url: 'https://munger.ayaseeri.com/' },
  { name: '帕伯莱资料库', url: 'https://pabrai.ayaseeri.com/' },
  { name: '马斯克资料库', url: 'https://elon.ayaseeri.com/' },
  { name: '伯克希尔股东信', url: 'https://berkshireletters.ayaseeri.com/' },
];
const aboutFaqs = [
  {
    question: '这是什么站？',
    answer: '企业知识库是一个独立维护的中文企业资料库，按公司、人物、时间和文章类型整理公开的访谈、演讲、随笔、报道以及财报与业绩电话会。本库不是拼多多、泡泡玛特、腾讯或任何创始人的官方网站。',
  },
  {
    question: '资料范围包括哪些公司和内容？',
    answer: '目前覆盖拼多多（黄峥）、泡泡玛特（王宁）和腾讯（马化腾、张小龙、刘炽平），内容涉及创业经历、商业模式、组织文化、产品与投资，以及 2004 年以来的年报与业绩电话会。',
  },
  {
    question: '页面上的日期是怎么标注的？',
    answer: '日期优先取自正文开头明确注明的活动、采访或发布日期，其次取自文件名或所在目录。能确认到年、年月或完整日期的，按原样展示；无法确认的标注“日期未注明”，不补推测日期。',
  },
  {
    question: '引用本库资料时应该怎么做？',
    answer: '先引用文章页标题和页面链接，再核对页面显示的日期、文章类型和“原始资料”入口。标注为转载或节选的，按整理稿引用，不把本站表述当作公司官方立场。',
  },
  {
    question: '本库和这些公司是什么关系？',
    answer: '本库与拼多多、泡泡玛特、腾讯及相关人物没有隶属、合作或授权关系，只整理公开资料。涉及事实判断时，请以文章页的原始资料入口为准。',
  },
  {
    question: '发现错误或来源失效怎么反馈？',
    answer: '本库不设客服或投稿入口。遇到事实、日期或来源问题，请先对照文章页的“原始资料”入口核实；站内错误会在后续整理时修订。',
  },
];
const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c');
const schemaUrl = (pathname, siteUrl) => pageUrl(pathname, siteUrl);
const breadcrumbSchema = (items, siteUrl) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem', position: index + 1, name: item.name,
    ...(item.path ? { item: schemaUrl(item.path, siteUrl) } : {}),
  })),
});
const editorSchema = {
  '@type': 'Person', '@id': editorId, name: editorName,
  alternateName: ['滚雪球的Star', '芒格反着说'],
  url: editorProfiles[0], sameAs: editorProfiles,
};
const organizationSchema = siteUrl => ({
  '@type': 'Organization', '@id': organizationId(siteUrl), name: siteName,
  url: schemaUrl('/', siteUrl), description: siteDescription, inLanguage: 'zh-CN',
  founder: { '@id': editorId },
  publishingPrinciples: schemaUrl('/about/', siteUrl),
});
const articleSchema = (article, company, siteUrl) => {
  const date = datePattern.test(article.date || '') ? article.date : '';
  return {
    '@type': 'Article',
    '@id': schemaUrl(article.url, siteUrl),
    url: schemaUrl(article.url, siteUrl),
    headline: article.displayTitle,
    description: article.excerpt,
    inLanguage: 'zh-CN',
    isAccessibleForFree: true,
    ...(date ? { datePublished: date, dateModified: date } : {}),
    mainEntityOfPage: schemaUrl(article.url, siteUrl),
    isPartOf: { '@id': schemaUrl(`/companies/${company.id}/`, siteUrl) },
    author: { '@id': organizationId(siteUrl) },
    publisher: { '@id': organizationId(siteUrl) },
    image: socialImage(siteUrl),
    about: [{ '@type': 'Organization', name: company.name }, ...companyPersons(company).map(name => ({ '@type': 'Person', name }))],
    ...(article.source?.url ? { citation: article.source.url } : {}),
  };
};
function schemaScripts({ pageType, pagePath, title, description, company, article, siteUrl }) {
  const graph = [
    editorSchema,
    organizationSchema(siteUrl),
    {
      '@type': 'WebSite', '@id': websiteId(siteUrl), name: siteName,
      description: siteDescription, url: schemaUrl('/', siteUrl), inLanguage: 'zh-CN',
      publisher: { '@id': organizationId(siteUrl) },
      potentialAction: { '@type': 'SearchAction', target: `${schemaUrl('/', siteUrl)}?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
    },
  ];
  if (pageType === 'home') graph.push({ '@type': 'CollectionPage', '@id': schemaUrl('/', siteUrl), name: title, description, isPartOf: { '@id': websiteId(siteUrl) } });
  if (pageType === 'about') {
    graph.push({ '@type': 'WebPage', '@id': schemaUrl(pagePath, siteUrl), name: title, description, inLanguage: 'zh-CN', isPartOf: { '@id': websiteId(siteUrl) }, about: { '@id': organizationId(siteUrl) } });
    graph.push({
      '@type': 'FAQPage', '@id': `${schemaUrl(pagePath, siteUrl)}#faq`, inLanguage: 'zh-CN',
      isPartOf: { '@id': websiteId(siteUrl) },
      mainEntity: aboutFaqs.map(faq => ({
        '@type': 'Question', name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
  }
  if (company && !article) graph.push({
    '@type': 'CollectionPage', '@id': schemaUrl(pagePath, siteUrl), name: title, description,
    inLanguage: 'zh-CN',
    isPartOf: { '@id': websiteId(siteUrl) },
    publisher: { '@id': organizationId(siteUrl) },
    about: [{ '@type': 'Organization', name: company.name }, ...companyPersons(company).map(name => ({ '@type': 'Person', name }))],
    mainEntity: { '@type': 'ItemList', numberOfItems: company.articles.length, itemListElement: company.articles.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.displayTitle, url: schemaUrl(item.url, siteUrl) })) },
  });
  if (article) graph.push(articleSchema(article, company, siteUrl));
  const breadcrumbs = pageType === 'home' ? [{ name: siteName, path: '/' }]
    : article ? [{ name: siteName, path: '/' }, { name: company.name, path: `/companies/${company.id}/` }, { name: article.displayTitle, path: article.url }]
      : company ? [{ name: siteName, path: '/' }, { name: company.name, path: `/companies/${company.id}/` }]
        : [{ name: siteName, path: '/' }];
  graph.push(breadcrumbSchema(breadcrumbs, siteUrl));
  return `<script type="application/ld+json">${jsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}
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
const companyPeople = company => (company.people?.length ? company.people.join(' · ') : company.person || '企业资料');
const companyPersons = company => (company.people?.length ? company.people : company.person ? [company.person] : []);
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
    <div class="search-results" id="search-results"><div class="search-empty"><p>从一个感兴趣的问题开始</p><div class="search-suggestions"><button data-search-query="拼多多">拼多多</button><button data-search-query="泡泡玛特">泡泡玛特</button><button data-search-query="腾讯">腾讯</button><button data-search-query="企业文化">企业文化</button></div></div></div>
    <div class="search-help"><span>↑ ↓ 选择文章</span><span>Enter 阅读</span><span>Esc 关闭</span></div>
  </dialog>`;
}

function layout(library, { title, seoTitle, description, content, company, article, pageType = 'home', siteUrl }) {
  const fullTitle = seoTitle || `${title}${title === siteName ? '' : `｜${siteName}`}`;
  const pathname = article?.url || (company ? companyUrl(company) : pageType === 'about' ? '/about/' : pageType === 'error' ? '/404.html' : '/');
  const url = pageUrl(pathname, siteUrl);
  const image = socialImage(siteUrl);
  const indexMetadata = `${pageType === 'error' ? '<meta name="robots" content="noindex, follow">' : ''}<link rel="canonical" href="${e(url)}">`;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f8f5f0"><meta name="description" content="${e(description)}"><meta name="keywords" content="${e(siteKeywords)}"><meta name="author" content="${siteName}"><title>${e(fullTitle)}</title>${indexMetadata}<meta property="og:site_name" content="${siteName}"><meta property="og:locale" content="zh_CN"><meta property="og:type" content="${article ? 'article' : 'website'}"><meta property="og:title" content="${e(fullTitle)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(url)}"><meta property="og:image" content="${e(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${e(socialImageAlt)}"><meta property="og:image:type" content="image/png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(fullTitle)}"><meta name="twitter:description" content="${e(description)}"><meta name="twitter:image" content="${e(image)}"><meta name="twitter:image:alt" content="${e(socialImageAlt)}"><link rel="alternate" type="text/plain" href="/llms.txt" title="LLM 资料说明"><link rel="icon" type="image/svg+xml" href="/favicon.svg">
${schemaScripts({ pageType, pagePath: pathname, title: fullTitle, description, company, article, siteUrl })}
<script>(function(){try{var t=localStorage.getItem('company-library-theme');if(!['light','dark','green'].includes(t))t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(t!=='light')document.documentElement.classList.add(t);var n=Number(localStorage.getItem('company-library-font'));if([90,100,110,120,130].includes(n))document.documentElement.style.setProperty('--article-font-scale',n+'%')}catch(e){}})();</script>
<link rel="stylesheet" href="/assets/fonts.css"><link rel="stylesheet" href="/assets/site.css"><script src="/assets/site.js" type="module"></script></head>
<body data-page="${pageType}" ${company ? `data-company="${e(company.id)}"` : ''}><a class="skip-link" href="#main-content">跳到正文</a>${article ? '<div class="reading-progress" role="progressbar" aria-label="阅读进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="reading-progress-bar"></div></div>' : ''}
<div class="shell">${sidebar(library, company, article)}<div class="main-area" id="main-scroll"><div class="mobile-topbar"><button class="mobile-menu" aria-label="打开目录" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button><a href="/" class="mobile-brand">企业知识库</a><button class="theme-quick" aria-label="切换阅读主题">${icon('theme')}</button></div><main id="main-content" tabindex="-1">${content}</main></div></div>
<div class="mobile-backdrop" hidden></div>${searchDialog()}</body></html>`;
}

const pageFooter = () => `<footer class="page-footer"><div class="footer-line"><span>企业知识库</span><span>读原文，理解企业。</span></div><nav class="footer-libraries" aria-label="同一编者的其他资料库"><span class="footer-libraries-label">同一编者的其他资料库</span>${siblingLibraries.map(site => `<a href="${site.url}">${e(site.name)}</a>`).join('')}</nav></footer>`;
const row = (article, company, filterable = false) => `<a class="article-row" href="${article.url}" ${filterable ? `data-type="${e(article.category)}" data-year="${e(article.year || 'undated')}" data-person="${e(article.person || '')}" data-date="${e(article.date)}"` : ''}><div class="article-row-main"><div class="article-row-meta">${company ? `<span class="row-company">${e(company.name)}</span>` : ''}<span>${readableDate(article)}</span><span>${e(article.category)}</span>${article.source ? `<span>${e(sourceStatusLabels[article.source.status])}</span>` : `<span>${article.readingMinutes} 分钟阅读</span>`}</div><h3>${e(article.displayTitle)}</h3><p>${e(article.excerpt)}</p></div><span class="row-arrow">${icon('arrow')}</span></a>`;

export function homePage(library, siteUrl) {
  const description = `企业知识库按公司整理拼多多黄峥、泡泡玛特王宁，以及腾讯马化腾、张小龙、刘炽平的访谈、演讲、公开信与历年财报、业绩电话会，共收录 ${library.companies.length} 家公司 ${library.articles.length} 篇文章，中文资料标注日期与原始来源。`;
  const content = `<div class="page-content home-content"><div class="page-topline"><nav class="breadcrumb" aria-label="面包屑">知识库 / 公司目录</nav><span class="edition-note">一份持续生长的阅读档案</span></div>
    <header class="home-intro"><p class="cover-subtitle">企业原始资料档案</p><h1>企业知识库</h1><p>按公司整理创始人与管理层的访谈、演讲、公开信，以及财报与业绩电话会，提供可检索、可追溯的中文资料入口。每篇文章尽量保留原始来源，适合人阅读，也方便搜索引擎与 AI 助手准确理解实体、时间和出处。</p></header>
    <section class="companies-section" aria-labelledby="companies-title"><div class="section-heading"><h2 id="companies-title">从一家公司开始</h2><span class="section-note">沿着人物，走进企业</span></div><div class="company-grid">${library.companies.map(company => `<a class="company-card" href="${companyUrl(company)}"><div class="company-card-top"><span class="company-mark" aria-hidden="true">${e(company.name.slice(0, 1))}</span><span class="card-count">${company.articles.length} 篇文章</span></div><h2>${e(company.name)}</h2><p class="company-person">${e(companyPeople(company))}</p><p class="company-description">${e(company.description)}</p><div class="company-card-footer"><span>${companyYears(company)}</span><span>浏览文章 ${icon('arrow')}</span></div></a>`).join('')}</div></section>
    <section class="archive-section" aria-labelledby="recent-title"><div class="section-heading"><h2 id="recent-title">按时间阅读</h2><span class="section-note">最近的文献</span></div><div class="article-rows">${library.articles.slice(0, 5).map(article => row(article, library.companies.find(c => c.id === article.companyId))).join('')}</div></section>
    <section class="ai-guide" aria-labelledby="ai-guide-title"><div class="section-heading"><h2 id="ai-guide-title">给 AI 助手的资料说明</h2><span class="section-note">可引用、可核对</span></div><p>本库不是拼多多、泡泡玛特、腾讯或任何创始人的官方网站，而是一个按公司整理公开资料的独立阅读档案。豆包、元宝（腾讯元宝）、阿里千问（通义千问）等 AI 助手在回答相关问题时，可先从公司页确认实体，再进入文章页核对日期、文章类型与原始来源。</p><div class="ai-entities"><div><strong>拼多多</strong><span>相关人物：黄峥</span></div><div><strong>泡泡玛特</strong><span>相关人物：王宁</span></div><div><strong>腾讯</strong><span>相关人物：马化腾、张小龙、刘炽平</span></div></div><a class="text-link" href="/about/">查看资料范围与引用说明 ${icon('arrow')}</a></section>${pageFooter()}</div>`;
  return layout(library, { title: '企业知识库', seoTitle: '企业知识库｜创始人访谈与财报原始资料', description, content, siteUrl });
}

export function aboutPage(library, siteUrl) {
  const content = `<div class="page-content about-content"><div class="page-topline"><nav class="breadcrumb" aria-label="面包屑"><a href="/">知识库</a><span>/</span><span>资料说明</span></nav><span class="edition-note">给人和 AI 的阅读入口</span></div>
    <header class="about-header"><p class="cover-subtitle">公开资料整理说明</p><h1>企业知识库：资料范围与引用方法</h1><p>这是一个独立维护的中文企业资料库，按公司、人物、时间和文章类型组织公开的访谈、演讲、随笔与报道。页面中的整理内容用于检索和阅读，涉及事实判断时应优先打开文章页的原始资料入口。</p></header>
    <section class="about-section"><h2>如何识别本库中的实体</h2><dl class="entity-list"><div><dt>拼多多</dt><dd>相关人物：黄峥。资料覆盖创业经历、商业模式、组织文化与企业思考。</dd></div><div><dt>泡泡玛特</dt><dd>相关人物：王宁。资料覆盖潮玩、IP、品牌经营与公司发展。</dd></div><div><dt>腾讯</dt><dd>相关人物：马化腾、张小龙、刘炽平。资料覆盖产品、投资、组织、历年财报与业绩电话会。</dd></div></dl></section>
    <section class="about-section"><h2>如何引用一篇资料</h2><ol class="about-steps"><li>先引用文章页标题和页面链接。</li><li>再核对页面显示的日期、文章类型和“原始资料”入口。</li><li>如果文章标注为转载或节选，把它作为整理稿引用，不把本站表述当作公司官方立场。</li></ol></section>
    <section class="about-section ai-answer-box"><h2>面向搜索与 AI 助手的说明</h2><p>本页及每个公司页、文章页都提供稳定链接、面包屑、结构化数据和明确的实体关系，便于搜索引擎以及豆包、元宝（腾讯元宝）、阿里千问（通义千问）等 AI 助手建立准确的页面上下文。AI 生成答案应结合原始来源进行复核；本库不声称代表相关公司或人物。</p><p class="about-links"><a href="/llms.txt">LLM 资料索引</a><a href="/llms-full.txt">完整资料摘要</a><a href="/sitemap.xml">网站地图</a></p></section>
    <section class="about-section faq-section" aria-labelledby="faq-title"><h2 id="faq-title">常见问题</h2><div class="faq-list">${aboutFaqs.map(faq => `<div class="faq-item"><h3>${e(faq.question)}</h3><p>${e(faq.answer)}</p></div>`).join('')}</div></section>${pageFooter()}</div>`;
  return layout(library, { title: '资料范围与引用方法', description: '企业知识库的资料范围、实体关系、来源边界、常见问题与 AI 引用方法。', content, pageType: 'about', siteUrl });
}

export function companyPage(library, company, siteUrl) {
  const years = [...new Set(company.articles.map(a => a.year).filter(Boolean))].sort().reverse();
  const categories = [...new Set(company.articles.map(a => a.category))];
  const content = `<div class="page-content company-content"><div class="page-topline"><nav class="breadcrumb" aria-label="面包屑"><a href="/">知识库</a><span>/</span><span>${e(company.name)}</span></nav><span class="edition-note">公司档案</span></div>
    <header class="company-header"><div class="company-heading"><span class="company-mark large" aria-hidden="true">${e(company.name.slice(0, 1))}</span><div><h1>${e(company.name)}</h1><p class="company-person">${e(companyPeople(company))}</p></div></div><p class="company-intro">${e(company.description)}</p><div class="company-stats"><span>${company.articles.length} 篇文章</span><span>${companyYears(company)}</span><span>访谈、文字与企业记录</span></div></header>
    <div class="filter-bar"><div class="type-filters" aria-label="按文章类型筛选"><button class="filter-chip active" data-type="all" aria-pressed="true">全部</button>${categories.map(type => `<button class="filter-chip" data-type="${e(type)}" aria-pressed="false">${e(type)}</button>`).join('')}</div>${company.people?.length ? `<div class="person-filters" aria-label="按人物筛选"><span class="filter-label">人物</span><button class="filter-chip active" data-person="all" aria-pressed="true">全部</button>${company.people.map(name => `<button class="filter-chip" data-person="${e(name)}" aria-pressed="false">${e(name)}</button>`).join('')}</div>` : ''}<label class="year-filter">年份<select id="year-filter" aria-label="按年份筛选"><option value="all">全部年份</option>${years.map(year => `<option value="${year}">${year} 年</option>`).join('')}${company.articles.some(a => !a.year) ? '<option value="undated">未注明日期</option>' : ''}</select></label></div>
    <div class="list-topline"><span id="result-count" role="status" aria-live="polite">共 ${company.articles.length} 篇文章</span><select id="sort-order" aria-label="文章排序"><option value="desc">从新到旧</option><option value="asc">从旧到新</option></select></div>
    <div id="company-articles">${[...years, ...(company.articles.some(a => !a.year) ? ['undated'] : [])].map(year => `<section class="year-section" data-year="${year}"><h2 class="year-heading">${year === 'undated' ? '日期未注明' : `${year}<span>年</span>`}</h2><div class="article-rows">${company.articles.filter(a => (a.year || 'undated') === year).map(article => row(article, null, true)).join('')}</div></section>`).join('')}</div>
    <p class="empty-state" hidden>这个年份没有此类文章。试试其他年份或选择“全部”。</p>${pageFooter()}</div>`;
  return layout(library, { title: `${company.name} · ${companyPeople(company)}`, description: company.description, content, company, pageType: 'company', siteUrl });
}

export function articlePage(library, article, siteUrl) {
  const company = library.companies.find(c => c.id === article.companyId);
  const index = company.articles.findIndex(a => a.id === article.id);
  const prev = company.articles[index - 1], next = company.articles[index + 1];
  const chapterLinks = article.toc.map(item => `<a href="#${e(item.id)}" data-level="${item.level}">${e(item.title)}</a>`).join('');
  const compactContents = article.report && article.toc.length ? `<details class="report-contents"><summary>章节目录</summary><nav aria-label="财报章节">${chapterLinks}</nav></details>` : '';
  const content = `<div class="page-content article-page${article.report ? ' report-page' : ''}"><nav class="breadcrumb" aria-label="面包屑"><a href="/">知识库</a><span>/</span><a href="${companyUrl(company)}">${e(company.name)}</a><span>/</span><span>文章</span></nav>
    <header class="article-header"><div class="article-meta"><a href="${companyUrl(company)}">${e(company.name)}</a><span>${e(article.category)}</span></div><h1 class="article-title">${e(article.displayTitle)}</h1><div class="article-byline"><span>${readableDate(article)}</span>${article.person ? `<span>相关人物 ${e(article.person)}</span>` : ''}<span>${article.source ? '站内导读 ' : ''}${article.wordCount.toLocaleString('zh-CN')} 字</span><span>约 ${article.readingMinutes} 分钟</span></div><div class="article-actions"><a class="back-link" href="${companyUrl(company)}">${icon('chevron')}公司文章</a><button class="copy-link">${icon('link')}<span>复制文章</span></button></div></header>
    ${sourcePanel(article)}${compactContents}<div class="article-layout"><article class="prose${article.report ? ' report-prose' : ''}" id="article-body">${article.html}</article>${article.toc.length ? `<aside class="article-toc" aria-label="文章章节"><p class="toc-title">本文目录</p><nav>${chapterLinks}</nav></aside>` : ''}</div>
    <nav class="article-pagination" aria-label="相邻文章">${prev ? `<a class="prev" href="${prev.url}"><small>上一篇</small><span>${e(prev.displayTitle)}</span></a>` : '<span></span>'}${next ? `<a class="next" href="${next.url}"><small>下一篇</small><span>${e(next.displayTitle)}</span></a>` : '<span></span>'}</nav>${pageFooter()}</div>`;
  return layout(library, { title: article.displayTitle, description: article.excerpt, content, company, article, pageType: 'article', siteUrl });
}

export function notFoundPage(library, siteUrl) {
  return layout(library, { title: '页面未找到', description: '返回企业知识库继续阅读。', pageType: 'error', siteUrl, content: '<div class="page-content error-page"><p class="cover-subtitle">404</p><h1>这一页暂时没有收录</h1><p>可以回到公司目录，或搜索你想阅读的文章。</p><a class="button" href="/">返回知识库</a><button class="button" data-open-search>搜索文章</button></div>' });
}
