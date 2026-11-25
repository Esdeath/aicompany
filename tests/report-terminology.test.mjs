import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { localizeText, localizeReport, displayWidth } from '../scripts/report-terminology.mjs';

const header = '---\ntitle: "校验样本"\n---\n';

test('account names retain profit, balance, impairment and financial-instrument distinctions', () => {
  assert.equal(localizeText('经营溢利；年内溢利；除所得税前溢利'), '经营利润；本年净利润；利润总额');
  assert.equal(localizeText('本公司拥有人应占溢利；非国际财务报告准则经调整纯利'),
    '归属于本公司股东的净利润；非国际财务报告准则经调整净利润');
  assert.equal(localizeText('金融资产减值亏损拨备；减值拨备；存货减值拨备；亏损拨备'),
    '金融资产减值损失；减值准备；存货跌价准备；损失准备');
  assert.equal(localizeText('按公平值计入损益的金融资产；按公平值计入其他全面收益的金融资产'),
    '以公允价值计量且其变动计入当期损益的金融资产；以公允价值计量且其变动计入其他综合收益的金融资产');
});

test('revenue context does not turn comprehensive income or investment returns into revenue', () => {
  const unchanged = '其他综合收益确认；投资收益；留存收益；每股收益';
  assert.equal(localizeText(unchanged), unchanged);
  assert.equal(localizeText(unchanged, true), unchanged);
  assert.equal(localizeText('其他收益；其他全面收益；投资收益；每股收益', true),
    '其他收入；其他综合收益；投资收益；每股收益');
  assert.equal(localizeText('其他（亏损）╱ 收益 － 净额'), '其他（损失）╱ 利得 － 净额');
  const result = localizeReport(header + '(k) 收益确认\n\n(v) 其他收益\n\n其他收益主要来自销售商品。\n\n(l) 其他会计政策\n\n其他收益与投资收益。\n', 'annual.md').text;
  assert(result.includes('其他收入主要来自销售商品。'));
  assert(result.includes('其他收益与投资收益。'));
});

test('financial translation does not substitute legal structures, jurisdiction or asset scope', () => {
  const original = '合约安排；香港利得税；强积金；物业管理费；泡泡玛特国际集团有限公司；国际财务报告会计准则';
  assert.equal(localizeText(original), original);
  assert.equal(localizeText('物业、厂房及设备；现金产生单位；预付款项'), '不动产、厂房及设备；现金产出单元；预付款项');
  assert.equal(localizeText('经审核委员会批准'), '经审核委员会批准');
  assert.equal(localizeText('| 经审核 | 未经审核 |'), '| 经审计 | 未经审计 |');
  const linked = '[公平值资料](../公平值.pdf)\n\n![原图溢利](溢利.png)\n\n`贸易应收款项`\n';
  assert.equal(localizeReport(header + linked, 'annual.md').text, header + linked);
});

test('longer terms keep comparative numeric columns aligned in fixed-width source tables', () => {
  const row = (label, first, second) => label + ' '.repeat(32 - displayWidth(label)) + first.padStart(7) + second.padStart(10);
  const grid = row('按公平值计入损益的金融资产', '1,200', '300') + '\n' + row('现金及现金等价物', '2,000', '400');
  const raw = header + '```text\n' + grid + '\n```\n';
  const localized = localizeReport(raw, 'annual.md').text;
  assert(localized.includes('以公允价值计量且其变动计入当期损益的金融资产'));
  const rows = localized.split('```text\n')[1].split('\n```')[0].split('\n');
  const ends = line => [...line.matchAll(/\d[\d,]*/g)].map(match => displayWidth(line.slice(0, match.index + match[0].length)));
  assert.deepEqual(ends(rows[0]), ends(rows[1]));
  assert.deepEqual(localized.match(/\d[\d,]*/g), raw.match(/\d[\d,]*/g));
  assert.equal(localizeReport(localized, 'annual.md').text, localized);
});

test('all reports are stable on a second pass and the four mainland reports are unchanged', async () => {
  const audit = JSON.parse(await readFile(new URL('../company/泡泡玛特王宁/财报/简体中文/术语本地化校验.json', import.meta.url), 'utf8'));
  assert.equal(audit.reports.length, 17);
  assert.equal(audit.reports.filter(report => report.replacements).length, 13);
  const mainland = audit.reports.filter(report => report.file.startsWith('新三板'));
  assert.equal(mainland.length, 4);
  for (const report of audit.reports) {
    const raw = await readFile(new URL('../company/泡泡玛特王宁/财报/简体中文/' + report.file, import.meta.url), 'utf8');
    assert.equal(localizeReport(raw, report.file).text === raw, true, report.file);
  }
  for (const report of mainland) assert.equal(report.afterSha256, report.beforeSha256);
});
