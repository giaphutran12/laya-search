const $ = (selector) => document.querySelector(selector);
const grid = $('#company-grid');
const notice = $('#notice');
let engine = 'laya';
let status = {};
let requestNumber = 0;
let searching = false;
let activeSearch = null;
let suggestionPage = 0;
const searchIdeas = [
  ['Warehouse robots', 'Robots that automate warehouse work'],
  ['AI coding tools', 'AI tools that help software developers write code'],
  ['Better healthcare', 'Software that helps doctors care for patients'],
  ['Payment infrastructure', 'Payment infrastructure for online businesses'],
  ['Climate tech', 'Technology for clean energy and reducing carbon emissions'],
  ['Learning tools', 'Tools for online learning and education'],
  ['Cybersecurity', 'Cybersecurity software that protects businesses'],
  ['Food delivery', 'Food delivery and restaurant ordering software'],
  ['Small business tools', 'Software that helps small businesses run their operations'],
  ['Mental health', 'Accessible mental health care and therapy'],
  ['Space technology', 'Companies building satellites and space technology'],
  ['Developer tools', 'Infrastructure and developer tools for building software'],
  ['Shipping & logistics', 'Software for freight shipping and supply chain logistics'],
  ['Scientific research', 'Tools that accelerate scientific research and drug discovery'],
  ['Home services', 'Companies helping homeowners book repairs and maintenance'],
  ['Business banking', 'Banking and financial tools for businesses'],
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function renderSearchIdeas() {
  const suggestions = $('#suggested-searches');
  suggestions.replaceChildren();
  searchIdeas.slice(suggestionPage * 4, suggestionPage * 4 + 4).forEach(([label, query]) => {
    const button = element('button', 'suggested-search');
    button.type = 'button';
    button.title = query;
    button.disabled = searching;
    const arrow = element('span', 'suggestion-arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    button.append(element('span', '', label), arrow);
    button.addEventListener('click', () => {
      if (searching) return;
      $('#query').value = query;
      search();
    });
    suggestions.append(button);
  });
}
function setSearching(value) {
  searching = value;
  $('#submit-search').disabled = value;
  $('#submit-search').hidden = value;
  $('#stop-search').hidden = !value;
  document.querySelectorAll('.suggested-search').forEach(button => { button.disabled = value; });
  grid.setAttribute('aria-busy', String(value));
}
async function refreshEngineStatus(attempts = 0) {
  try {
    status = await jsonRequest('/api/status');
    updateEngineStatus();
    if (!status.laya?.ready && attempts < 12) setTimeout(() => refreshEngineStatus(attempts + 1), 500);
  } catch { /* A later search will report a disconnected server. */ }
}
function cancelSearch() {
  if (!searching) return;
  ++requestNumber;
  activeSearch?.abort();
  activeSearch = null;
  setSearching(false);
  notice.className = '';
  notice.textContent = 'Stopped. Switch models or try another search.';
  $('#results-meta').textContent = 'Search stopped';
  setTimeout(() => refreshEngineStatus(), 150);
}
function safeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
function logo(company, index = 0) {
  const fallback = () => {
    const node = element('span', 'company-logo logo-fallback', (company.name || '?').slice(0, 1));
    const seed = Math.sin(Number(company.id) * 127.1 + 311.7) * 43758.5453;
    node.style.setProperty('--logo-bg', `hsl(${Math.round((seed - Math.floor(seed)) * 360)} 40% 42%)`);
    return node;
  };
  const url = safeUrl(company.small_logo_thumb_url);
  if (!url) return fallback();
  const placeholder = fallback();
  const img = element('img', 'company-logo');
  img.alt = '';
  img.loading = 'eager';
  img.addEventListener('load', () => placeholder.replaceWith(img), { once: true });
  img.src = url;
  return placeholder;
}
function openCompany(company) {
  const content = $('#company-details');
  content.replaceChildren(logo(company), element('h2', 'detail-title', company.name));
  const metadata = [company.batch, company.all_locations, company.status].filter(Boolean).join(' · ');
  content.append(element('div', 'detail-meta', metadata));
  content.append(element('p', 'detail-description', company.long_description || company.one_liner || 'No description available.'));
  const tags = element('div', 'tags');
  const companyTags = Array.isArray(company.tags) ? company.tags : [];
  companyTags.forEach((tag) => tags.append(element('span', 'tag', tag)));
  content.append(tags);
  const website = safeUrl(company.website);
  if (website) {
    const link = element('a', 'website-link', 'Visit company website ↗');
    link.href = website;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    content.append(link);
  }
  $('#company-dialog').showModal();
}
function showTooltip(company, card) {
  const tip = $('#company-tooltip');
  tip.replaceChildren(element('strong', '', company.name), element('p', '', company.one_liner || 'View company details'), element('small', '', [company.batch, company.all_locations].filter(Boolean).join(' · ')));
  tip.hidden = false;
  const rect = card.getBoundingClientRect();
  tip.style.left = `${Math.max(8, Math.min(innerWidth - 213, rect.right + 7))}px`;
  tip.style.top = `${Math.max(8, Math.min(innerHeight - tip.offsetHeight - 8, rect.top + 12))}px`;
}
function renderCompanies(companies) {
  grid.replaceChildren();
  $('#results-panel').hidden = !companies.length;
  const arrivals = [];
  companies.forEach((company, index) => {
    const card = element('button', 'company-card');
    card.type = 'button';
    card.setAttribute('aria-label', `${company.name}: ${company.one_liner || 'View company details'}`);
    const score = Number.isFinite(company.score) ? `${Math.round(company.score * 100)}%` : '';
    card.append(element('span', 'company-score', score), logo(company, index));
    card.addEventListener('click', () => { $('#company-tooltip').hidden = true; openCompany(company); });
    card.addEventListener('mouseenter', () => showTooltip(company, card));
    card.addEventListener('focus', () => showTooltip(company, card));
    card.addEventListener('mouseleave', () => { $('#company-tooltip').hidden = true; });
    card.addEventListener('blur', () => { $('#company-tooltip').hidden = true; });
    grid.append(card);
    arrivals.push({ company, card, element: card.querySelector('.company-logo') });
  });
  window.logoPhysics?.lift(arrivals);
}
function releaseResults() {
  window.logoPhysics?.release();
  grid.replaceChildren();
  $('#results-panel').hidden = true;
  $('#company-tooltip').hidden = true;
}
function updateEngineStatus() {
  const state = status[engine];
  const label = $('#engine-status');
  label.classList.toggle('ready', Boolean(state?.ready));
  label.textContent = state ? (state.ready ? (engine === 'laya' ? 'Running on your machine' : 'API connected') : state.detail || 'Engine unavailable') : 'Checking engine…';
  label.title = state?.detail || '';
}
async function jsonRequest(path, options) {
  const response = await fetch(path, options);
  let data;
  try { data = await response.json(); } catch { throw new Error(`The server returned an unreadable response (${response.status}).`); }
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || data.message || `Request failed (${response.status}).`);
  return data;
}
async function search(event) {
  event?.preventDefault();
  if (searching) return;
  const query = $('#query').value.trim();
  if (!query) { $('#query').focus(); return; }
  const currentRequest = ++requestNumber;
  const selectedEngine = engine;
  const controller = new AbortController();
  activeSearch = controller;
  setSearching(true);
  notice.className = '';
  notice.textContent = 'Searching company descriptions…';
  releaseResults();
  $('#results-meta').textContent = `Searching with ${selectedEngine === 'laya' ? 'Laya local' : 'JEV API'}`;
  try {
    const data = await jsonRequest('/api/search', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, engine: selectedEngine }) });
    if (currentRequest !== requestNumber) return;
    if ($('#query').value.trim() !== query) {
      notice.textContent = '';
      $('#results-meta').textContent = '';
      return;
    }
    const results = Array.isArray(data.results) ? data.results : [];
    renderCompanies(results);
    $('#results-meta').textContent = `${results.length} matches${Number.isFinite(data.elapsedMs) ? ` · ${(data.elapsedMs / 1000).toFixed(2)}s` : ''} · ${selectedEngine === 'laya' ? 'Laya local' : 'JEV API'}`;
    notice.textContent = results.length ? '' : 'No matches. Try a broader description.';
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    notice.className = 'error';
    notice.textContent = error.message;
    $('#results-meta').textContent = 'Try again when the engine is ready';
  } finally {
    if (currentRequest === requestNumber) {
      activeSearch = null;
      setSearching(false);
    }
  }
}
$('#search-form').addEventListener('submit', search);
$('#stop-search').addEventListener('click', cancelSearch);
$('#more-ideas').addEventListener('click', () => {
  suggestionPage = (suggestionPage + 1) % (searchIdeas.length / 4);
  renderSearchIdeas();
});
renderSearchIdeas();
$('#query').addEventListener('input', () => {
  releaseResults();
  if (!searching) { $('#results-meta').textContent = ''; notice.textContent = ''; }
});
document.querySelectorAll('[data-engine]').forEach((button) => button.addEventListener('click', () => {
  if (engine !== button.dataset.engine) cancelSearch();
  engine = button.dataset.engine;
  document.querySelectorAll('[data-engine]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  updateEngineStatus();
}));
$('#settings-toggle').addEventListener('click', () => {
  const panel = $('#settings');
  panel.hidden = !panel.hidden;
  $('#settings-toggle').setAttribute('aria-expanded', String(!panel.hidden));
});
$('#shuffle').addEventListener('click', () => {
  releaseResults();
  $('#results-meta').textContent = '';
});
$('#motion-toggle').checked = !matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#motion-toggle').addEventListener('change', event => window.logoPhysics?.setMotion?.(event.target.checked));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { cancelSearch(); $('#settings').hidden = true; $('#settings-toggle').setAttribute('aria-expanded', 'false'); $('#company-tooltip').hidden = true; }
});
$('#close-dialog').addEventListener('click', () => $('#company-dialog').close());
$('#company-dialog').addEventListener('click', (event) => {
  if (event.target === $('#company-dialog')) {
    const rect = event.target.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
  }
});
async function initialize() {
  await Promise.allSettled([
    jsonRequest('/api/companies').then((data) => {
      const companies = Array.isArray(data.companies) ? data.companies : [];
      window.logoPhysics?.setCompanies(companies);
      $('#directory-count').textContent = `${Number(data.total || companies.length).toLocaleString()} startups indexed`;
      if (!companies.length) notice.textContent = 'No companies loaded yet.';
    }).catch((error) => {
      if (searching || requestNumber) return;
      notice.className = 'error';
      notice.textContent = error.message;
      $('#results-meta').textContent = 'Company directory unavailable';
    }),
    jsonRequest('/api/status').then((data) => { status = data; updateEngineStatus(); }).catch(() => { $('#engine-status').textContent = 'Engine status unavailable'; })
  ]);
}
initialize();
