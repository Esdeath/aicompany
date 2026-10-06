const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const safeRead = key => { try { return localStorage.getItem(key); } catch { return null; } };
const safeWrite = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
const themes = ['light', 'dark', 'green'];
const themeNames = { light: '浅色', dark: '深色', green: '护眼' };
let theme = document.documentElement.classList.contains('dark') ? 'dark' : document.documentElement.classList.contains('green') ? 'green' : 'light';
function setTheme(value) {
  if (!themes.includes(value)) return;
  theme = value;
  document.documentElement.classList.remove('dark', 'green');
  if (value !== 'light') document.documentElement.classList.add(value);
  safeWrite('company-library-theme', value);
  $('#theme-select').value = value;
  $('.theme-quick').setAttribute('aria-label', `切换阅读主题，当前${themeNames[value]}`);
  $('meta[name="theme-color"]').content = { light: '#f8f5f0', dark: '#1a1a1a', green: '#c0edc6' }[value];
}
setTheme(theme);
$('#theme-select').addEventListener('change', event => setTheme(event.target.value));
$('.theme-quick').addEventListener('click', () => setTheme(themes[(themes.indexOf(theme) + 1) % themes.length]));
const fontScale = Number(safeRead('company-library-font'));
$('#font-size').value = [90, 100, 110, 120, 130].includes(fontScale) ? fontScale : 100;
$('#font-size').addEventListener('change', event => {
  const size = Number(event.target.value);
  if (![90, 100, 110, 120, 130].includes(size)) return;
  document.documentElement.style.setProperty('--article-font-scale', `${size}%`);
  safeWrite('company-library-font', size);
});
$$('.search-shortcut').forEach(element => element.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K');

// The same company directory is a fixed sidebar on desktop and a focus-trapped drawer on mobile.
const sidebar = $('#sidebar'), backdrop = $('.mobile-backdrop'), mainArea = $('#main-scroll'), menuButton = $('.mobile-menu');
let menuTrigger;
function syncSidebarAccess() {
  const closedOnMobile = window.innerWidth <= 1024 && !sidebar.classList.contains('is-open');
  sidebar.inert = closedOnMobile;
  if (closedOnMobile) sidebar.setAttribute('aria-hidden', 'true');
  else sidebar.removeAttribute('aria-hidden');
}
syncSidebarAccess();
function closeMenu() {
  sidebar.classList.remove('is-open');
  backdrop.hidden = true;
  mainArea.inert = false;
  sidebar.removeAttribute('role');
  sidebar.removeAttribute('aria-modal');
  menuButton.setAttribute('aria-expanded', 'false');
  syncSidebarAccess();
  menuTrigger?.focus();
  menuTrigger = null;
}
menuButton.addEventListener('click', () => {
  menuTrigger = document.activeElement;
  sidebar.classList.add('is-open');
  syncSidebarAccess();
  backdrop.hidden = false;
  mainArea.inert = true;
  sidebar.setAttribute('role', 'dialog');
  sidebar.setAttribute('aria-modal', 'true');
  menuButton.setAttribute('aria-expanded', 'true');
  $('.sidebar-mobile-close').focus();
});
backdrop.addEventListener('click', closeMenu);
$('.sidebar-mobile-close').addEventListener('click', closeMenu);
sidebar.addEventListener('keydown', event => {
  if (!sidebar.classList.contains('is-open')) return;
  if (event.key === 'Escape') { event.preventDefault(); closeMenu(); }
  if (event.key === 'Tab') {
    const focusable = [...sidebar.querySelectorAll('a, button, select, summary')].filter(el => el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 1024 && sidebar.classList.contains('is-open')) closeMenu();
  syncSidebarAccess();
});

// Article filters never mutate the source order; both sort directions are deterministic.
if (document.body.dataset.page === 'company') {
  const list = $('#company-articles');
  const sections = [...list.querySelectorAll('.year-section')];
  const rows = [...list.querySelectorAll('.article-row')];
  const originalOrder = new Map(rows.map((row, index) => [row, index]));
  let type = 'all';
  function applyFilters() {
    const year = $('#year-filter').value;
    const direction = $('#sort-order').value === 'asc' ? -1 : 1;
    let count = 0;
    rows.forEach(row => {
      row.hidden = (type !== 'all' && row.dataset.type !== type) || (year !== 'all' && row.dataset.year !== year);
      if (!row.hidden) count++;
    });
    sections.sort((a, b) => {
      if (a.dataset.year === 'undated') return 1;
      if (b.dataset.year === 'undated') return -1;
      return b.dataset.year.localeCompare(a.dataset.year) * direction;
    }).forEach(section => {
      const container = section.querySelector('.article-rows');
      [...container.children].sort((a, b) => (originalOrder.get(a) - originalOrder.get(b)) * direction).forEach(row => container.append(row));
      section.hidden = ![...container.children].some(row => !row.hidden);
      list.append(section);
    });
    $('#result-count').textContent = `共 ${count} 篇文章`;
    $('.empty-state').hidden = count !== 0;
  }
  $$('.filter-chip').forEach(button => button.addEventListener('click', () => {
    type = button.dataset.type;
    $$('.filter-chip').forEach(chip => {
      const active = chip === button;
      chip.classList.toggle('active', active);
      chip.setAttribute('aria-pressed', active);
    });
    applyFilters();
  }));
  $('#year-filter').addEventListener('change', applyFilters);
  $('#sort-order').addEventListener('change', applyFilters);
}

// Load full text only when someone searches, keeping every reading page small.
const dialog = $('#search-dialog'), input = $('#search-input'), results = $('#search-results'), status = $('#search-status');
let indexPromise, searchTimer, searchRevision = 0, selectedResult = -1, searchTrigger;
let lastResolvedQuery = '';
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
async function getIndex() {
  if (!indexPromise) indexPromise = fetch('/search-index.json').then(response => {
    if (!response.ok) throw new Error('Search index unavailable');
    return response.json();
  }).catch(error => { indexPromise = null; throw error; });
  return indexPromise;
}
function highlight(text, terms) {
  const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!pattern) return escapeHtml(text);
  const regex = new RegExp(pattern, 'gi');
  let html = '', start = 0;
  for (const match of text.matchAll(regex)) {
    html += escapeHtml(text.slice(start, match.index)) + `<mark>${escapeHtml(match[0])}</mark>`;
    start = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(start));
}
function snippet(article, terms) {
  const text = article.text.replace(/\s+/g, ' ').trim();
  const lower = text.toLocaleLowerCase();
  const locations = terms.map(term => lower.indexOf(term)).filter(index => index >= 0);
  if (!locations.length) return article.excerpt;
  const start = Math.max(0, Math.min(...locations) - 35);
  const end = Math.min(text.length, start + 145);
  return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}
async function search() {
  const revision = ++searchRevision;
  selectedResult = -1;
  lastResolvedQuery = '';
  const query = input.value.trim();
  if (!query) {
    status.textContent = '输入关键词，检索标题与全文';
    results.innerHTML = '<div class="search-empty"><p>从一个感兴趣的问题开始</p><div class="search-suggestions"><button data-search-query="拼多多">拼多多</button><button data-search-query="泡泡玛特">泡泡玛特</button><button data-search-query="企业文化">企业文化</button></div></div>';
    return;
  }
  status.textContent = '正在检索全文…';
  try {
    const index = await getIndex();
    if (revision !== searchRevision) return;
    const terms = [...new Set(query.toLocaleLowerCase().split(/\s+/))];
    const matches = index.map(article => {
      const meta = `${article.title} ${article.company} ${article.person} ${article.category} ${article.date} ${article.dateLabel || ''}`.toLocaleLowerCase();
      const full = `${meta} ${article.text}`.toLocaleLowerCase();
      if (!terms.every(term => full.includes(term))) return null;
      const score = terms.reduce((sum, term) => sum + (article.title.toLocaleLowerCase().includes(term) ? 10 : 0) + (meta.includes(term) ? 3 : 0), 0);
      return { article, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
    status.textContent = `找到 ${matches.length} 篇相关文章`;
    results.innerHTML = matches.length ? matches.map(({ article }) => `<a class="search-result" href="${escapeHtml(article.url)}"><div class="search-result-meta"><span>${escapeHtml(article.company)}</span><span>${escapeHtml(article.dateLabel || article.date || '日期未注明')}</span><span>${escapeHtml(article.category)}</span></div><h3>${highlight(article.title, terms)}</h3><p>${highlight(snippet(article, terms), terms)}</p></a>`).join('') : '<div class="search-empty"><p>没有找到相关文章</p><span>试试公司名、人名，或换一个更简短的关键词。</span></div>';
    results.scrollTop = 0;
    lastResolvedQuery = query;
  } catch {
    if (revision !== searchRevision) return;
    status.textContent = '搜索暂时不可用';
    results.innerHTML = '<div class="search-empty"><p>文章索引加载失败</p><span>请检查连接后重试，或从公司目录浏览文章。</span><button class="button" data-retry-search>重新搜索</button></div>';
  }
}
function openSearch() {
  if (dialog.open) { input.focus(); return; }
  searchTrigger = document.activeElement;
  dialog.showModal();
  input.focus();
  if (input.value.trim()) search();
}
function closeSearch() { dialog.close(); }
$$('[data-open-search]').forEach(button => button.addEventListener('click', openSearch));
$('.search-close').addEventListener('click', closeSearch);
dialog.addEventListener('close', () => searchTrigger?.focus());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeSearch();
});
results.addEventListener('click', event => {
  const suggestion = event.target.closest('[data-search-query]');
  if (suggestion) { input.value = suggestion.dataset.searchQuery; input.focus(); search(); }
  if (event.target.closest('[data-retry-search]')) search();
});
input.addEventListener('input', event => {
  clearTimeout(searchTimer);
  ++searchRevision;
  lastResolvedQuery = '';
  selectedResult = -1;
  results.replaceChildren();
  status.textContent = input.value.trim() ? '正在检索全文…' : '输入关键词，检索标题与全文';
  if (!event.isComposing) searchTimer = setTimeout(search, 120);
});
input.addEventListener('compositionend', () => { clearTimeout(searchTimer); searchTimer = setTimeout(search, 120); });
dialog.addEventListener('keydown', event => {
  if (event.isComposing || event.keyCode === 229 || lastResolvedQuery !== input.value.trim()) return;
  if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
  const links = [...results.querySelectorAll('.search-result')];
  if (!links.length) return;
  if (event.key === 'Enter') {
    if (document.activeElement === input) { event.preventDefault(); links[Math.max(0, selectedResult)].click(); }
    return;
  }
  event.preventDefault();
  selectedResult = event.key === 'ArrowDown' ? (selectedResult + 1) % links.length : (selectedResult <= 0 ? links.length - 1 : selectedResult - 1);
  links.forEach((link, index) => link.classList.toggle('selected', index === selectedResult));
  links[selectedResult].focus();
  links[selectedResult].scrollIntoView({ block: 'nearest' });
});
document.addEventListener('keydown', event => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' || event.key === '/' && !typing) {
    event.preventDefault(); openSearch();
  }
});

if (document.body.dataset.page === 'article') {
  const progress = $('.reading-progress');
  let ticking = false;
  function updateProgress() {
    const distance = mainArea.scrollHeight - mainArea.clientHeight;
    const percent = distance > 0 ? Math.min(100, Math.max(0, mainArea.scrollTop / distance * 100)) : 100;
    $('.reading-progress-bar').style.transform = `scaleX(${percent / 100})`;
    progress.setAttribute('aria-valuenow', Math.round(percent));
    ticking = false;
  }
  mainArea.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  new ResizeObserver(updateProgress).observe($('#main-content'));
  updateProgress();
  const tocLinks = $$('.article-toc a');
  const headingIds = tocLinks.map(link => decodeURIComponent(link.hash.slice(1)));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) tocLinks.forEach(link => {
        const active = decodeURIComponent(link.hash.slice(1)) === entry.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
    });
  }, { root: mainArea, rootMargin: '-5% 0px -72% 0px', threshold: 0 });
  headingIds.forEach(id => { const heading = document.getElementById(id); if (heading) observer.observe(heading); });
  $('.copy-link').addEventListener('click', async event => {
    const label = event.currentTarget.querySelector('span');
    try {
      await navigator.clipboard.writeText(location.href);
      label.textContent = '已复制';
    } catch {
      label.textContent = '请复制地址栏链接';
    }
    setTimeout(() => label.textContent = '复制链接', 2200);
  });
  if (location.hash) requestAnimationFrame(() => {
    try { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); } catch {}
  });
}
