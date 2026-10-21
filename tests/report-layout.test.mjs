import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import MarkdownIt from 'markdown-it';
import { readLibrary } from '../scripts/content.mjs';

const directory = new URL('../company/泡泡玛特王宁/财报/简体中文/', import.meta.url);
const fixtures = JSON.parse(await readFile(new URL('./fixtures/popmart-report-content.json', import.meta.url), 'utf8'));
const parser = new MarkdownIt({ html: false, linkify: false });
const digest = text => createHash('sha256').update(text).digest('hex');
const inlineText = token => (token.children || []).map(child =>
  ['text', 'code_inline'].includes(child.type) ? child.content
    : ['softbreak', 'hardbreak'].includes(child.type) ? '\n' : '').join('');

for (const original of fixtures) {
  test(`${original.file}: original text, numbers, metadata, links and images remain intact`, async () => {
    const raw = await readFile(new URL(original.file, directory), 'utf8');
    const metadata = raw.match(/^---\n[\s\S]*?\n---\n/)[0];
    const tokens = parser.parse(raw.slice(metadata.length), {});
    const parts = tokens.filter(token => ['inline', 'fence'].includes(token.type))
      .map(token => token.type === 'fence' ? token.content : inlineText(token));
    const links = [], images = [];
    for (const token of tokens) for (const child of token.children || []) {
      if (child.type === 'link_open') links.push(child.attrGet('href'));
      if (child.type === 'image') images.push([child.attrGet('src'), child.content]);
    }
    assert.equal(digest(metadata), original.metadata, 'metadata');
    assert.equal(digest(parts.join('').replace(/\s/g, '')), original.text, 'visible text in original order');
    assert.equal(digest(JSON.stringify(parts.join('\n').match(/\d[\d,.]*%?/g) || [])), original.numbers, 'numeric values in original order');
    assert.equal(digest(JSON.stringify(links)), original.links, 'source links');
    assert.equal(digest(JSON.stringify(images)), original.images, 'original illustrations');
    assert.deepEqual([...raw.matchAll(/^###### 原PDF第(\d+)页$/gm)].map(match => Number(match[1])),
      Array.from({ length: original.pages }, (_, index) => index + 1), 'all original pages');
  });
}

test('financial statement notes and comparative amounts occupy separate columns', async () => {
  const raw = await readFile(new URL('2024年年度报告-简体中文.md', directory), 'utf8');
  const page = raw.split('###### 原PDF第189页')[1].split('###### 原PDF第190页')[0];
  const tokens = parser.parse(page, {});
  const rows = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type !== 'tr_open') continue;
    const values = [];
    while (tokens[++index].type !== 'tr_close') if (tokens[index].type === 'inline') values.push(inlineText(tokens[index]));
    rows.push(values);
  }
  assert(rows.some(row => JSON.stringify(row) === JSON.stringify(['收益', '6', '13,037,749', '6,301,002'])));
  assert(rows.some(row => JSON.stringify(row) === JSON.stringify(['金融资产减值亏损拨备', '', '(3,446)', '(745)'])));
  const interim = await readFile(new URL('2025年中期报告-简体中文.md', directory), 'utf8');
  assert(interim.includes('|  | 2025年 | 2024年 | 变动 |'), 'comparative years align with the amount columns');
  assert(interim.includes('|  | 人民币千元 | 人民币千元 |  |'), 'units align with the amount columns');
});

test('every report has a chapter outline and retains the previously published PDF page anchors', async () => {
  const library = await readLibrary(new URL('..', import.meta.url).pathname);
  const reports = library.articles.filter(article => article.report);
  assert.equal(reports.length, 17);
  assert.equal(fixtures.reduce((total, fixture) => total + fixture.pages, 0), 3793);
  for (const report of reports) {
    assert(report.toc.length >= 8 && report.toc.length < 100, report.title);
    assert(!report.toc.some(item => /^原PDF第\d+页$/.test(item.title)), report.title);
    assert(!report.toc.some(item => /^\d+\s+月\s+\d+\s+日/.test(item.title)), 'table dates are not chapter headings');
    const fixture = fixtures.find(item => report.sourcePath.endsWith(item.file));
    const page = Math.min(10, fixture.pages);
    const oldAnchor = `section-${digest(`原PDF第${page}页`).slice(0, 8)}`;
    assert(report.html.includes(`id="${oldAnchor}"`), report.title);
    assert(report.html.includes('<table>'), report.title);
  }
});
