import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import MarkdownIt from 'markdown-it';

const companyProfiles = {
  拼多多黄征: {
    id: 'pinduoduo',
    name: '拼多多',
    person: '黄峥',
    description: '从创业经历到商业思考，阅读黄峥的访谈、演讲与个人随笔。',
  },
  泡泡玛特王宁: {
    id: 'popmart',
    name: '泡泡玛特',
    person: '王宁',
    description: '通过王宁的访谈、演讲与公司报道，了解潮玩、IP 与品牌经营。',
  },
};

const topicPatterns = [
  ['创业', /创业|创办|创始/],
  ['商业模式', /商业模式|商业逻辑|生意模式/],
  ['企业文化', /企业文化|公司文化|价值观|本分/],
  ['组织管理', /组织|团队|管理|人才/],
  ['消费洞察', /消费者|消费心理|消费升级|满足感/],
  ['品牌与 IP', /品牌|\bIP\b|潮玩|潮流玩具/i],
  ['全球化', /全球|海外|出海|世界级/],
  ['投资思考', /巴菲特|投资|资本|复利/],
];

const hash = (value) => createHash('sha256').update(value).digest('hex');
const comparePath = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();
const normalizeTitle = (value) => normalizeText(value).replace(/[“”‘’]/g, '"');

async function markdownFiles(directory) {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((a, b) => comparePath(a.name, b.name));
  const nested = await Promise.all(entries.map(async (entry) => {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(location);
    return entry.isFile() && /\.md$/i.test(entry.name) ? [location] : [];
  }));
  return nested.flat();
}

function inlineText(token) {
  if (!token) return '';
  if (!token.children) return token.content || '';
  return token.children.map((child) => {
    if (child.type === 'image') return '';
    if (child.type === 'softbreak' || child.type === 'hardbreak') return '\n';
    if (child.children) return inlineText(child);
    return child.type === 'text' || child.type === 'code_inline' ? child.content : '';
  }).join('');
}

function metadataParagraph(value, person = '') {
  const text = normalizeText(value);
  if (!text || text === person || /^(?:false|true|\d{1,3})$/i.test(text)) return true;
  if (value.split('\n').some((line) => /^(?:发布时间|发布于|时间[：:]|日期[：:]|来源[：:]|原文链接|记者\s*[|｜：:]|编辑\s*[|｜：:]|文\s*[|｜：:])/.test(line.trim()))) return true;
  if (/^(?:虎嗅注|钛媒体注|编者注)[：:]/.test(text)) return true;
  if (/^(?:(?:19|20)\d{2}\s*(?:年|[-/.])\s*\d{1,2}\s*(?:月|[-/.])\s*\d{1,2}\s*日?)(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/.test(text)) return true;
  if (/^(?:本文|以下内容|以下文字|内容)?\s*(?:内容)?\s*(?:来源|转载|出自)|^(?:以下[为是].{0,12}(?:全文|内容|实录)|原文链接|发布时间|发布于|时间[：:]|日期[：:]|来源[：:]|记者\s*[|｜：:]|编辑\s*[|｜：:]|文\s*[|｜：:])/.test(text)) return true;
  if (/^以下为.{0,30}(?:口述|整理)|^.*[（(]图片由.{0,30}(?:拍摄|提供)[）)]$/.test(text)) return true;
  // Publication credits are retained in the article, but do not serve as its summary.
  if (/(?:发布时间|原文链接|\s编辑\s*[|｜：:]|独家专访\s*$|「.{0,12}」系列(?:第一篇|访谈)?[。.]?$)/.test(text)) return true;
  if (/^(?:19|20)\d{2}\s*(?:年|[-/.])\s*\d{1,2}\s*(?:月|[-/.])\s*\d{1,2}\s*日?(?:\s+\d{1,2}:\d{2})?\s*\n/.test(value)) return true;
  return false;
}

function articleTitle(tokens, filename, person) {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'heading_open') continue;
    const text = normalizeText(inlineText(tokens[index + 1]));
    const reasonable = text.length >= 4 && !/^[\d\s.、一二三四五六七八九十]+$/.test(text)
      && !/^(?:正文|背景|前言|编者按|访谈全文|核心观点提炼)$/.test(text);
    const earlierBody = tokens.slice(0, index).some((item, position, earlier) =>
      item.type === 'inline' && earlier[position - 1]?.type === 'paragraph_open'
      && !metadataParagraph(inlineText(item), person)
      && normalizeText(inlineText(item)).length > 3);
    if (reasonable && (token.map?.[0] ?? 0) <= 15 && !earlierBody) return text;
    break;
  }
  return filename.replace(/\.md$/i, '').trim();
}

function fullDate(value) {
  const match = value.match(/((?:19|20)\d{2})\s*(?:年|[-/.])\s*(\d{1,2})\s*(?:月|[-/.])\s*(\d{1,2})\s*日?/);
  if (!match) return '';
  const [, year, month, day] = match;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(iso) ? iso : '';
}

function articleDate(raw, sourcePath, tokens) {
  // Only date lines and explicit source/publication credits may provide a date.
  // Years in the narrative (e.g. a founder's first job) are never publication dates.
  const firstLines = raw.split('\n').slice(0, 35);
  const creditLines = firstLines.map((line) => normalizeText(line
    .replace(/^\s*(?:#{1,6}|>)\s*/, '').replace(/\*+/g, '')
    .replace(/&#(?:x[0-9a-f]+|\d+);|&nbsp;/gi, ' ')))
    .filter((line) => /^(?:(?:19|20)\d{2}\s*(?:年|[-/.])\s*\d{1,2}\s*(?:月|[-/.])\s*\d{1,2}\s*日?)(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/.test(line)
      || /(?:发布时间|发布于|时间[：:]|日期[：:]|本文.{0,8}来源|以下内容来源|本文内容来源)/.test(line));
  for (const line of creditLines) {
    const date = fullDate(line);
    if (date) return date;
  }
  const filenameDate = fullDate(path.posix.basename(sourcePath));
  if (filenameDate) return filenameDate;
  // A parent article folder may contain its date even when its file does not.
  const parentDate = fullDate(path.posix.basename(path.posix.dirname(sourcePath)));
  if (parentDate) return parentDate;
  for (const line of creditLines) {
    const year = line.match(/(?:19|20)\d{2}/)?.[0];
    if (year) return year;
  }
  const filenameYear = path.posix.basename(sourcePath).match(/(?:19|20)\d{2}/)?.[0];
  if (filenameYear) return filenameYear;
  const folderYear = path.posix.basename(path.posix.dirname(sourcePath)).match(/(?:19|20)\d{2}/)?.[0];
  if (folderYear) return folderYear;
  const firstHeading = tokens.findIndex((token) => token.type === 'heading_open');
  return firstHeading >= 0 && (tokens[firstHeading].map?.[0] ?? 99) < 8
    ? inlineText(tokens[firstHeading + 1]).match(/(?:19|20)\d{2}/)?.[0] || '' : '';
}

function articleCategory(title, raw, sourcePath) {
  const context = `${title}\n${sourcePath}`;
  if (/演讲|演讲实录|演讲全文/.test(context)) return '演讲';
  if (/访谈|专访|采访|对话/.test(context)) return '访谈';
  if (/^#\s+.+\n(?:\s*\n|黄峥\s*\n)*(?:19|20)\d{2}年/m.test(raw)
    || /我的中学|我的第一份|为什么要再次创业|读罗素|测不准|资本主义|如创业的投资|劣币驱逐|供给侧改革/.test(title)) return '随笔';
  const introduction = raw.slice(0, 1800);
  if (/演讲|主题分享|年会上.*分享|以下为分享全文/.test(introduction)) return '演讲';
  if (/(?:^|\n)(?:\*\*)?(?:记者|提问|问)[：:]|以下为.{0,30}口述/.test(introduction)) return '访谈';
  return '报道';
}

function excerptFrom(tokens, title, person) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type !== 'paragraph_open') continue;
    const original = inlineText(tokens[index + 1]);
    const paragraph = normalizeText(original);
    if (paragraph.length < 18 || paragraph.includes('\uFFFD') || metadataParagraph(original, person)
      || (paragraph.length < 90 && !/[。！？!?；;]/.test(paragraph))
      || normalizeTitle(paragraph) === normalizeTitle(title)) continue;
    const characters = Array.from(paragraph);
    return characters.length > 110 ? `${characters.slice(0, 107).join('')}…` : paragraph;
  }
  return '';
}

function headingAnchors(tokens, title) {
  const toc = [];
  const anchors = new Map();
  const used = new Map();
  let removedTitle = false;
  let bodyStarted = false;
  const filtered = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    // Some source files use an unformatted paragraph as their opening title.
    // The page header already carries that exact text.
    if (!removedTitle && !bodyStarted && token.type === 'paragraph_open'
      && normalizeTitle(inlineText(tokens[index + 1])) === normalizeTitle(title)) {
      removedTitle = true;
      index += 2;
      continue;
    }
    if (token.type !== 'heading_open') {
      if (token.type === 'paragraph_open' && inlineText(tokens[index + 1]).trim()) bodyStarted = true;
      filtered.push(token);
      continue;
    }
    const heading = normalizeText(inlineText(tokens[index + 1]));
    if (!removedTitle && normalizeTitle(heading) === normalizeTitle(title)) {
      removedTitle = true;
      index += 2;
      continue;
    }
    const base = `section-${hash(heading).slice(0, 8)}`;
    const count = (used.get(base) || 0) + 1;
    used.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    token.attrSet('id', id);
    toc.push({ id, title: heading, level: Number(token.tag.slice(1)) });
    const conventional = heading.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '-');
    for (const candidate of [id, heading, conventional]) {
      if (!anchors.has(candidate)) anchors.set(candidate, id);
    }
    filtered.push(token);
  }
  return { tokens: filtered, toc, anchors };
}

function decodePart(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function localUrl(value, record, recordsByPath) {
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return value;
  const match = value.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  if (!match) return value;
  const [, pathname, query = '', fragment = ''] = match;
  const anchor = decodePart(fragment.slice(1));
  if (!pathname) return fragment && record.anchors.has(anchor) ? `#${record.anchors.get(anchor)}` : value;
  const decodedPath = pathname.split('/').map(decodePart).join('/');
  let resolved;
  if (decodedPath.startsWith('/company/')) resolved = path.posix.normalize(decodedPath.slice(1));
  else if (decodedPath.startsWith('/')) return value;
  else resolved = path.posix.normalize(path.posix.join(path.posix.dirname(record.article.sourcePath), decodedPath));
  if (!resolved.startsWith('company/')) return value;
  const linkedArticle = recordsByPath.get(resolved);
  if (linkedArticle) {
    const linkedAnchor = linkedArticle.anchors.get(anchor);
    return `${linkedArticle.article.url}${query}${fragment ? `#${linkedAnchor || fragment.slice(1)}` : ''}`;
  }
  return `/${resolved.split('/').map(encodeURIComponent).join('/')}${query}${fragment}`;
}

function prepareLinks(tokens, record, recordsByPath) {
  let imageCount = 0;
  for (const token of tokens) {
    if (token.type === 'image') {
      imageCount += 1;
      token.attrSet('src', localUrl(token.attrGet('src'), record, recordsByPath));
      token.attrSet('loading', 'lazy');
      token.attrSet('decoding', 'async');
    }
    if (token.type === 'link_open') {
      const href = localUrl(token.attrGet('href'), record, recordsByPath);
      token.attrSet('href', href);
      if (/^https?:\/\//i.test(href)) token.attrSet('rel', 'noreferrer');
    }
    if (token.children) imageCount += prepareLinks(token.children, record, recordsByPath);
  }
  return imageCount;
}

function articleOrder(a, b) {
  return comparePath(b.date, a.date) || comparePath(a.sourcePath, b.sourcePath);
}

/** Read the original company directory without modifying or rewriting its files. */
export async function readLibrary(root = process.cwd()) {
  const sourceRoot = path.join(root, 'company');
  let folders;
  try {
    folders = (await readdir(sourceRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .sort((a, b) => comparePath(a.name, b.name));
  } catch (error) {
    if (error.code === 'ENOENT') return { companies: [], articles: [] };
    throw error;
  }
  const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false });
  const companies = [];
  const records = [];
  for (const folder of folders) {
    const profile = (Object.hasOwn(companyProfiles, folder.name) && companyProfiles[folder.name]) || {
      id: `company-${hash(folder.name).slice(0, 10)}`,
      name: folder.name,
      person: '',
      description: '汇集这个公司的文章资料，按时间整理，便于阅读与检索。',
    };
    const company = { ...profile, folder: folder.name, topics: [], articles: [] };
    const files = await markdownFiles(path.join(sourceRoot, folder.name));
    for (const file of files) {
      const sourcePath = path.relative(root, file).split(path.sep).join('/');
      const raw = await readFile(file, 'utf8');
      const tokens = markdown.parse(raw, {});
      const title = articleTitle(tokens, path.basename(file), company.person);
      const date = articleDate(raw, sourcePath, tokens);
      const text = tokens.filter((token) => token.type === 'inline' || token.type === 'fence' || token.type === 'code_block')
        .map(inlineText).filter(Boolean).join('\n\n');
      const wordCount = (text.match(/[\p{Script=Han}]|[A-Za-z\d]+(?:['’-][A-Za-z\d]+)*/gu) || []).length;
      const id = hash(sourcePath).slice(0, 12);
      const prepared = headingAnchors(tokens, title);
      const article = {
        id, companyId: company.id, title, date, year: date.slice(0, 4),
        category: articleCategory(title, raw, sourcePath),
        excerpt: excerptFrom(tokens, title, company.person),
        readingMinutes: Math.max(1, Math.ceil(wordCount / 500)),
        wordCount, sourcePath, url: `/articles/${id}/`, html: '', text,
        toc: prepared.toc, imageCount: 0,
      };
      company.articles.push(article);
      records.push({ article, tokens: prepared.tokens, anchors: prepared.anchors });
    }
    company.articles.sort(articleOrder);
    const companyText = company.articles.map((article) => `${article.title}\n${article.text}`).join('\n');
    company.topics = topicPatterns.filter(([, pattern]) => pattern.test(companyText)).map(([topic]) => topic);
    companies.push(company);
  }
  const recordsByPath = new Map(records.map((record) => [record.article.sourcePath, record]));
  for (const record of records) {
    record.article.imageCount = prepareLinks(record.tokens, record, recordsByPath);
    record.article.html = markdown.renderer.render(record.tokens, markdown.options, {});
  }
  return { companies, articles: records.map((record) => record.article).sort(articleOrder) };
}
