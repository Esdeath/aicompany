import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

// These are language equivalents, not a conversion from IFRS to Chinese GAAP.
export const terms = [
  ['综合损益及其他全面收益表', '合并损益及其他综合收益表'],
  ['综合全面收益表', '合并综合收益表'],
  ['综合损益表', '合并利润表'],
  ['综合资产负债表', '合并资产负债表'],
  ['综合财务状况表', '合并资产负债表'],
  ['综合权益变动表', '合并所有者权益变动表'],
  ['综合现金流量表', '合并现金流量表'],
  ['综合财务报表', '合并财务报表'],
  ['综合财务资料', '合并财务信息'],
  ['其他全面收益', '其他综合收益'],
  ['全面收益', '综合收益'],
  ['按公平值计入损益计量', '以公允价值计量且其变动计入当期损益'],
  ['按公平值计入损益', '以公允价值计量且其变动计入当期损益'],
  ['按公平值计入其他全面收益计量', '以公允价值计量且其变动计入其他综合收益'],
  ['按公平值计入其他全面收益', '以公允价值计量且其变动计入其他综合收益'],
  ['公平值', '公允价值'],
  ['摊销成本', '摊余成本'],
  ['物业、厂房及设备', '不动产、厂房及设备'],
  ['物业、厂房和设备', '不动产、厂房和设备'],
  ['账面值', '账面价值'],
  ['保留盈利', '留存收益'],
  ['保留溢利', '留存收益'],
  ['受限制现金', '受限现金'],
  ['现金产生单位', '现金产出单元'],
  ['独立核数师报告', '独立审计报告'],
  ['核数师报告', '审计报告'],
  ['核数师', '审计师'],
  ['未经审核', '未经审计'],
  ['本公司拥有人应占溢利', '归属于本公司股东的净利润'],
  ['本公司拥有人应占权益', '归属于本公司股东的权益'],
  ['本公司拥有人应占', '归属于本公司股东的'],
  ['本公司拥有人', '本公司股东'],
  ['本公司权益持有人应占', '归属于本公司权益持有人的'],
  ['以下应占期内全面收益总额', '本期综合收益总额归属于'],
  ['以下应占年内全面收益总额', '本年综合收益总额归属于'],
  ['以下应占全面收益总额', '综合收益总额归属于'],
  ['以下应占期内溢利', '本期净利润归属于'],
  ['以下应占年内溢利', '本年净利润归属于'],
  ['以下应占溢利', '净利润归属于'],
  ['应占溢利', '应享有的利润'],
  ['应占权益', '应享有的权益'],
  ['直接应占', '直接归属'],
  ['每股基本盈利', '基本每股收益'],
  ['每股摊薄盈利', '稀释每股收益'],
  ['每股盈利', '每股收益'],
  ['摊薄', '稀释'],
  ['除所得税前溢利', '利润总额'],
  ['除所得税后溢利', '税后利润'],
  ['应课税溢利', '应纳税所得额'],
  ['应课税收入', '应税收入'],
  ['经营溢利', '经营利润'],
  ['年内溢利', '本年净利润'],
  ['期内溢利', '本期净利润'],
  ['溢利', '利润'],
  ['纯利', '净利润'],
  ['非控股权益', '少数股东权益'],
  ['附属公司', '子公司'],
  ['联营公司', '联营企业'],
  ['以权益入账被投资方', '按权益法核算的被投资单位'],
  ['以权益入账投资', '按权益法核算的投资'],
  ['按权益入账', '按权益法核算'],
  ['使用权益法入账', '采用权益法核算'],
  ['以权益法入账', '采用权益法核算'],
  ['业务合并', '企业合并'],
  ['贸易应收款项', '应收账款'],
  ['贸易及其他应收款项', '应收账款及其他应收款'],
  ['贸易及其他应收款', '应收账款及其他应收款'],
  ['贸易及其他应付款项', '应付账款及其他应付款'],
  ['贸易及其他应付款', '应付账款及其他应付款'],
  ['应收贸易款项', '应收账款'],
  ['贸易应收款', '应收账款'],
  ['贸易应付款项', '应付账款'],
  ['应付贸易款项', '应付账款'],
  ['贸易应付款', '应付账款'],
  ['其他应收款项', '其他应收款'],
  ['其他应付款项', '其他应付款'],
  ['合约负债', '合同负债'],
  ['合约资产', '合同资产'],
  ['合约现金流量', '合同现金流量'],
  ['合约成本', '合同成本'],
  ['合约付款', '合同付款'],
  ['合约权利', '合同权利'],
  ['合约的增量成本', '合同的增量成本'],
  ['销售合约', '销售合同'],
  ['租赁合约', '租赁合同'],
  ['远期合约', '远期合同'],
  ['金融担保合约', '财务担保合同'],
  ['财务担保合约', '财务担保合同'],
  ['所得税开支', '所得税费用'],
  ['即期所得税', '当期所得税'],
  ['经销及销售开支', '销售及分销费用'],
  ['一般及行政开支', '管理费用'],
  ['资本开支', '资本性支出'],
  ['资本承担', '资本承诺'],
  ['应计开支', '应计费用'],
  ['雇员福利开支', '职工薪酬费用'],
  ['按性质划分的开支', '按性质分类的费用'],
  ['财务开支', '财务费用'],
  ['经营开支', '经营费用'],
  ['行政开支', '管理费用'],
  ['销售开支', '销售费用'],
  ['报酬开支', '报酬费用'],
  ['薪酬开支', '薪酬费用'],
  ['付款开支', '付款费用'],
  ['研发开支', '研发费用'],
  ['租金开支', '租金费用'],
  ['运输及物流开支', '运输及物流费用'],
  ['广告及营销开支', '广告及营销费用'],
  ['上市开支', '上市费用'],
  ['减值开支', '减值损失'],
  ['开支', '支出'],
  ['以股份为基础的付款报酬', '股份支付报酬'],
  ['以股份为基础的报酬开支', '股份支付费用'],
  ['以股份为基础的付款开支', '股份支付费用'],
  ['以股份为基础的薪酬开支', '股份支付费用'],
  ['以股份为基础的付款', '股份支付'],
  ['以股份为基础付款', '股份支付'],
  ['以股份为基础的报酬', '股份支付报酬'],
  ['以股份为基础的薪酬', '股份支付薪酬'],
  ['股份为基础的付款', '股份支付'],
  ['以股份为基础的支付', '股份支付'],
  ['全期预期信贷亏损', '整个存续期预期信用损失'],
  ['预期信贷亏损', '预期信用损失'],
  ['信贷亏损', '信用损失'],
  ['信贷减值', '信用减值'],
  ['信贷风险', '信用风险'],
  ['信贷评级', '信用评级'],
  ['信贷记录', '信用记录'],
  ['信贷历史', '信用记录'],
  ['信贷质素', '信用质量'],
  ['信贷条款', '信用条款'],
  ['信贷期', '信用期'],
  ['金融资产减值亏损拨备', '金融资产减值损失'],
  ['减值亏损', '减值损失'],
  ['减值拨备', '减值准备'],
  ['存货减值拨备', '存货跌价准备'],
  ['亏损拨备', '损失准备'],
  ['全期预期亏损', '整个存续期预期信用损失'],
  ['预期亏损率', '预期信用损失率'],
  ['按集体基准拨备', '按组合基础计提准备'],
  ['已订约但未拨备', '已签约但尚未确认'],
  ['作出充分拨备', '充分计提准备'],
  ['作出拨备', '计提准备'],
  ['拨备方法', '计提方法'],
  ['拨备', '准备'],
  ['拨回', '转回'],
  ['撇销', '核销'],
  ['撇减', '减记'],
  ['递延税项', '递延所得税'],
  ['应课税暂时性差额', '应纳税暂时性差异'],
  ['可扣税暂时性差额', '可抵扣暂时性差异'],
  ['暂时性差额', '暂时性差异'],
  ['税项亏损', '可抵扣亏损'],
  ['或然负债', '或有负债'],
  ['或然资产', '或有资产'],
  ['或然代价', '或有对价'],
  ['收购代价', '收购对价'],
  ['购买代价', '购买对价'],
  ['无条件代价', '无条件对价'],
  ['已收或应收代价', '已收或应收对价'],
  ['已付或应付代价', '已付或应付对价'],
  ['代价金额', '对价金额'],
  ['融资活动', '筹资活动'],
  ['流动资金风险', '流动性风险'],
  ['现金流量对冲', '现金流量套期'],
  ['净投资对冲', '净投资套期'],
  ['对冲会计', '套期会计'],
  ['对冲关系', '套期关系'],
  ['贴现率', '折现率'],
  ['贴现现金流量', '折现现金流量'],
  ['法定盈余储备', '法定盈余公积'],
  ['股息', '股利'],
  ['结余', '余额'],
  ['可使用年期', '使用寿命'],
  ['综合入账', '合并处理'],
  ['财务资料', '财务信息'],
  ['分部资料', '分部信息'],
  ['销售收益', '销售收入'],
  ['批发收益', '批发收入'],
  ['批发及其他收益', '批发及其他收入'],
  ['本集团总收益', '本集团总收入'],
  ['本集团的收益', '本集团的收入'],
  ['本集团收益', '本集团收入'],
  ['我们的收益', '我们的收入'],
  ['总收益', '总收入'],
  ['收益及分部资料', '收入及分部信息'],
  ['分部及收益资料', '分部及收入信息'],
  ['除以收益', '除以收入'],
  ['奖励积分的收益', '奖励积分的收入'],
  ['该等销售的收益', '该等销售的收入'],
  ['而收益于产品', '而收入于产品'],
];

export const sourceNotice = '> 转换说明：保留中文正文、数字、单位和注释，仅做繁简转换及重复英文去除。外文专名、代码和网址照录；复杂表格用等宽文本保留列位置，插图保留原图。';
export const localizedNotice = '> 转换说明：保留原报告数据、单位、注释和会计口径，完成繁简转换、重复英文去除及财务术语本地化。港式财务用语按内地常用表述调整；原有会计准则、确认与计量规则不变。外文专名、代码和网址照录；复杂表格保留列位置，插图保留原图。';
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dictionary = new Map(terms);
const pattern = new RegExp([...dictionary.keys()].sort((a, b) => b.length - a.length).map(escape).join('|'), 'g');
export const displayWidth = value => [...value].reduce((width, char) => width + (/[^\u0000-\u00ff]/.test(char) ? 2 : 1), 0);

export function localizeText(text, revenue = false, counts = {}) {
  const count = (before, after) => {
    counts[`${before} → ${after}`] = (counts[`${before} → ${after}`] || 0) + 1;
    return after;
  };
  let value = text;
  value = value.replace(/其他(?:[（(]亏损[）)]\s*[╱/]\s*收益|收益\s*[╱/]\s*[（(]亏损[）)]|收益)(?=\s*[－\-–—]\s*净额)/g,
    match => count(match, match.replace('收益', '利得').replace('亏损', '损失')));
  value = value.replace(/^(#{1,6}\s+\d+\s+)其他收益(?=\s|$)/,
    (_, prefix) => prefix + count('其他收益', '其他利得'));
  if (revenue) value = value.replace(/(?:其他全面收益|其他综合收益|全面收益|综合收益|留存收益|投资收益|净资产收益率|每股收益)|收益/g,
    match => match === '收益' ? count(match, '收入') : match);
  value = value.replace(pattern, match => count(match, dictionary.get(match)));
  // A standalone revenue line/cell differs from investment or comprehensive income.
  value = value.replace(/^(\s*(?:\|\s*)?)收益(?=\s*(?:\||$| {2}))/,
    (_, prefix) => prefix + count('收益', '收入'));
  value = value.replace(/^(#{1,6}\s+\d+\s+)收益(?=\s|$)/,
    (_, prefix) => prefix + count('收益', '收入'));
  value = value.replace(/(^|\|)(\s*)经审核(?=\s*(?:\||$))/g,
    (_, prefix, spaces) => prefix + spaces + count('经审核', '经审计'));
  return value;
}

function localizeGrid(block, revenue, counts) {
  const rows = block.split('\n').map(line => {
    const fields = [...line.matchAll(/\S+(?: \S+)*/g)].map(match => ({
      text: match[0], start: displayWidth(line.slice(0, match.index)),
      localized: localizeText(match[0], revenue, counts),
      numeric: /^[\d\s,.()%+\-−–—－╱/]+$/.test(match[0]),
    }));
    return { line, fields };
  });
  // Stretch the original grid only as needed; numeric columns retain their right edges.
  const anchor = field => field.start + (field.numeric ? displayWidth(field.text) : 0);
  let scale = 1;
  for (const { fields } of rows) for (let index = 0; index < fields.length - 1; index += 1) {
    const current = fields[index], next = fields[index + 1];
    const needed = (current.numeric ? 0 : displayWidth(current.localized)) + (next.numeric ? displayWidth(next.localized) : 0) + 2;
    scale = Math.max(scale, needed / (anchor(next) - anchor(current)));
  }
  if (scale > 1) scale += 0.01;
  return rows.map(({ line, fields }) => {
    if (!fields.length) return line;
    let result = '';
    for (const field of fields) {
      const start = Math.round(anchor(field) * scale) - (field.numeric ? displayWidth(field.localized) : 0);
      const gap = start - displayWidth(result);
      if (result && gap < 2) throw new Error(`Localized grid cells overlap: ${line}`);
      result += ' '.repeat(Math.max(0, gap)) + field.localized;
    }
    return result;
  }).join('\n');
}

export function localizeReport(raw, filename) {
  const counts = {};
  if (filename.startsWith('新三板')) return { text: raw, counts };
  const [metadata] = raw.match(/^---\n[\s\S]*?\n---\n/);
  const lines = raw.slice(metadata.length).split('\n');
  let noteRevenue = false, policyRevenue = false, policyLetter = '';
  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === sourceNotice || line === localizedNotice) { output.push(localizedNotice); continue; }
    const heading = line.replace(/^#{1,6}\s+/, '').trim();
    if (/^\d{1,2}\s+\D/.test(heading) && !/^\d+\s+泡泡玛特/.test(heading)) {
      noteRevenue = /^\d{1,2}\s+(?:(?:收益|收入)(?:及分部(?:资料|信息))?|分部及(?:收益资料|收入信息))(?:\s*[（(]续[）)])?$/.test(heading);
      policyRevenue = false;
    }
    const policy = heading.match(/^[（(]([a-z])[）)]\s+(.+)$/);
    if (policy) {
      if (/^(?:收益|收入)确认/.test(policy[2])) { policyRevenue = true; policyLetter = policy[1]; }
      else if (policy[1] !== policyLetter && !/^[ivx]$/.test(policy[1])) policyRevenue = false;
    }
    if (/^## /.test(line)) { noteRevenue = false; policyRevenue = false; }
    const revenue = noteRevenue || policyRevenue;
    if (line === '```text') {
      const block = [];
      while (++index < lines.length && lines[index] !== '```') block.push(lines[index]);
      output.push('```text', localizeGrid(block.join('\n'), revenue, counts), '```');
    } else {
      // Markdown destinations and image descriptions identify original source files.
      const pieces = line.split(/(!?\[[^\]]*\]\([^)]*\)|https?:\/\/\S+|`[^`]*`)/g);
      output.push(pieces.map((part, position) => position % 2 ? part : localizeText(part, revenue, counts)).join(''));
    }
  }
  return { text: metadata + output.join('\n'), counts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = new URL('../company/泡泡玛特王宁/财报/简体中文/', import.meta.url);
  const reports = [];
  const digest = value => createHash('sha256').update(value).digest('hex');
  for (const file of (await readdir(directory)).filter(file => file.endsWith('.md')).sort()) {
    const original = await readFile(new URL(file, directory), 'utf8');
    const result = localizeReport(original, file);
    reports.push({ file, beforeSha256: digest(original), afterSha256: digest(result.text), replacements: result.counts });
    if (process.argv.includes('--write')) await writeFile(new URL(file, directory), result.text);
  }
  console.log(JSON.stringify(reports, null, 2));
}
