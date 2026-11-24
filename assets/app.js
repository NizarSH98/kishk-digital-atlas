// Kishk Digital Atlas — static, hash-routed, bilingual. No build step.
import { UI } from './i18n.js?v=7';
import { icon, brandMark, regionArt } from './icons.js?v=7';

const VERSION = '7';

const SERIES = { tamime1999: 1, salameh2016: 2, abdelrazik2016: 3 };
const state = { lang: 'en', data: null };
const $ = (sel, root = document) => root.querySelector(sel);

// ------------------------------------------------------------------ helpers
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = () => UI[state.lang];
const L = (obj) => (obj && typeof obj === 'object' ? obj[state.lang] ?? obj.en : obj ?? '');
const UNIT_AR = { days: 'أيام', part: 'جزء', parts: 'أجزاء', samples: 'عيّنات', cases: 'حالات', people: 'أشخاص', 'kg/season': 'كغ/موسم', 'g/100 g': 'غ/100 غ' };
const unit = (u) => (u === '%' ? '%' : state.lang === 'ar' ? UNIT_AR[u] || u : u);
const fmt = (v) => (typeof v === 'number' ? v.toLocaleString('en', { maximumFractionDigits: 2 }) : esc(v));

function normalize(s) {
  return String(s || '').toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '') // tashkeel, tatweel
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[«»"'.,؛،:()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function readLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'ar' || q === 'en') return q;
  try { const s = localStorage.getItem('atlas-lang'); if (s === 'ar' || s === 'en') return s; } catch (e) { /* storage blocked */ }
  return (navigator.language || '').startsWith('ar') ? 'ar' : 'en';
}
function saveLang(lang) { try { localStorage.setItem('atlas-lang', lang); } catch (e) { /* storage blocked */ } }

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '').split('#')[0];
  const [path, query = ''] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(query) };
}
const href = (path, params) => {
  const q = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
  return `#/${path}${q ? `?${q}` : ''}`;
};

// ------------------------------------------------------------------ data access
const D = () => state.data;
const source = (id) => D().sources.find((s) => s.id === id);
const region = (id) => D().regions.find((r) => r.id === id);
const stage = (id) => D().stages.find((s) => s.id === id);
const practice = (id) => D().practices.find((p) => p.id === id);
const param = (id) => D().quality.parameters.find((p) => p.id === id);
const vocab = (field, code) => L(D().vocab[field]?.[code]) || code;
const focusRegions = () => D().regions.filter((r) => r.focus);
const practicesIn = (stageId) => D().practices.filter((p) => p.stage === stageId);
const paramsForPractice = (pid) => Object.entries(D().quality.links).filter(([, ids]) => ids.includes(pid)).map(([k]) => k);

function citeLink(cite) {
  const s = source(cite.source);
  return `<a class="cite" href="${href('sources')}#${esc(s.id)}" data-src="${esc(s.id)}">${icon('book')}${esc(t().citeShort(s.short, cite.pages))}</a>`;
}
function regionTags(ids) {
  return ids.map((id) => {
    const r = region(id);
    return r.focus ? `<a class="tag" href="${href(`region/${id}`)}">${esc(L(r.name))}</a>` : `<span class="tag">${esc(L(r.name))}</span>`;
  }).join('');
}
function figures(list) {
  if (!list?.length) return '';
  return `<div class="figures">${list.map((f) => `<div class="figure"><span class="figure__value">${fmt(f.value)}<small>${esc(unit(f.unit))}</small></span><span class="figure__label">${esc(L(f.label))}</span></div>`).join('')}</div>`;
}
function record(p, { showStage = true } = {}) {
  const st = stage(p.stage);
  return `<article class="record" id="p-${esc(p.id)}">
    <div class="record__top">
      <span class="kind kind--${esc(p.kind)}">${esc(vocab('kind', p.kind))}</span>
      ${showStage ? `<a class="tag" href="${href(`stage/${st.id}`)}">${esc(L(st.name))}</a>` : ''}
      ${regionTags(p.regions)}
    </div>
    <h3>${esc(L(p.title))}</h3>
    <p>${esc(L(p.text))}</p>
    ${figures(p.figures)}
    ${citeLink(p.cite)}
  </article>`;
}
function badge(status) {
  return `<span class="badge badge--${esc(status)}">${esc(vocab('status', status))}</span>`;
}
function mediaSlot(m) {
  return `<div class="slot">
    <div class="slot__frame">${icon(m.type === 'video' ? 'video' : 'photo')}</div>
    <span class="slot__cap">${esc(L(m.caption))}</span>
    <span class="stamp">${esc(t().toCollect)}</span>
    <small>${esc(t().withConsent)}</small>
  </div>`;
}
function emptyState(title, hint) {
  return `<div class="empty">${icon('flask', 'strip__icon')}<h3>${esc(title)}</h3><p>${esc(hint)}</p></div>`;
}

// ------------------------------------------------------------------ lab chart (small multiples)
function niceDomain(lo, hi) {
  const span = hi - lo || Math.abs(hi) || 1;
  const step0 = span / 4;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0);
  const a = Math.floor(lo / step) * step;
  const b = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = a; v <= b + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { a, b, ticks };
}
function obsValue(o) {
  if (o.min != null && o.max != null) return `${fmt(o.min)}–${fmt(o.max)}${o.mean != null ? ` (${state.lang === 'ar' ? 'متوسط' : 'mean'} ${fmt(o.mean)})` : ''}`;
  return `${fmt(o.mean)}${o.sd != null ? ` ± ${fmt(o.sd)}` : ''}`;
}
function labPanel(pid, obs, { links = true } = {}) {
  const pr = param(pid);
  const vals = obs.flatMap((o) => [o.min, o.max, o.mean != null && o.sd != null ? o.mean - o.sd : o.mean, o.mean != null && o.sd != null ? o.mean + o.sd : o.mean]).filter((v) => v != null);
  const { a, b, ticks } = niceDomain(Math.min(...vals), Math.max(...vals));
  const x = (v) => `${(((v - a) / (b - a)) * 100).toFixed(2)}%`;
  const rows = obs.map((o, i) => {
    const s = source(o.source);
    const c = `var(--series-${SERIES[o.source] || 1})`;
    const tip = `${L(pr.name)} · ${L(o.group)}|${obsValue(o)} ${pr.unit} · ${vocab('basis', o.basis)}${o.n ? ` · n=${o.n}` : ''}|${t().citeShort(s.short, o.pages)}`;
    let marks = '';
    if (o.min != null && o.max != null) marks += `<span class="track__range" style="--c:${c};inset-inline-start:${x(o.min)};width:calc(${x(o.max)} - ${x(o.min)})"></span>`;
    if (o.mean != null && o.sd != null) marks += `<span class="track__whisker" style="--c:${c};inset-inline-start:${x(o.mean - o.sd)};width:calc(${x(o.mean + o.sd)} - ${x(o.mean - o.sd)})"></span>`;
    if (o.mean != null) marks += `<span class="track__dot" style="--c:${c};inset-inline-start:${x(o.mean)}"></span>`;
    return `<div class="dotrow">
      <div class="dotrow__label">${esc(L(o.group))}<small>${esc(s.short)}</small></div>
      <button class="track" type="button" data-tip="${esc(tip)}" aria-label="${esc(tip.replace(/\|/g, '. '))}">
        ${ticks.map((v) => `<span class="track__grid" style="inset-inline-start:${x(v)}"></span>`).join('')}${marks}
      </button>
    </div>`;
  }).join('');
  const axis = `<div class="axis"><span></span><div class="axis__scale">${ticks.map((v) => `<span style="inset-inline-start:${x(v)}">${fmt(v)}</span>`).join('')}</div></div>`;
  const lp = links ? (D().quality.links[pid] || []).map((id) => `<a class="tag" href="${href('explore', { param: pid })}#p-${id}">${esc(L(practice(id).title))}</a>`).join('') : '';
  return `<section class="panel" aria-label="${esc(L(pr.name))}">
    <div class="panel__head"><h3>${esc(L(pr.name))}</h3><span>${esc(pr.unit)}</span></div>
    ${rows}${axis}
    ${lp ? `<div class="panel__links">${esc(t().linkedPractices)} ${lp}</div>` : ''}
  </section>`;
}
function legend(sourceIds) {
  return `<div class="legend" aria-label="Legend">
    ${sourceIds.map((id) => `<span><i style="--c:var(--series-${SERIES[id]})"></i>${esc(source(id).short)}</span>`).join('')}
    <span class="legend__range"><i></i>${esc(t().legendRange)}</span>
    <span class="legend__mean"><i></i>${esc(t().legendMean)}</span>
  </div>`;
}
function obsTable(obs) {
  return `<div class="table-wrap"><table>
    <thead><tr><th>${t().cols.param}</th><th>${t().cols.group}</th><th class="num">${t().cols.value}</th><th class="num">${t().cols.n}</th><th>${t().basis}</th><th>${t().cols.source}</th></tr></thead>
    <tbody>${obs.map((o) => `<tr><td>${esc(L(param(o.param).name))}</td><td>${esc(L(o.group))}</td><td class="num">${obsValue(o)} ${esc(param(o.param).unit)}</td><td class="num">${o.n ?? '—'}</td><td>${esc(vocab('basis', o.basis))}</td><td><span class="swatch" style="--c:var(--series-${SERIES[o.source]})"></span>${esc(t().citeShort(source(o.source).short, o.pages))}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

// ------------------------------------------------------------------ views
function viewHome() {
  const d = D();
  const interviews = 103; // 63 West Bekaa + 40 Chouf (Chedid et al. 2018, p. 18)
  const strip = d.stages.map((s, i) => `<li><button class="strip__btn" type="button" data-peek="${s.id}" aria-expanded="false" aria-controls="stage-peek">
      <span class="strip__no">${String(i + 1).padStart(2, '0')}</span>
      ${icon(s.id, 'strip__icon')}
      <span class="strip__name">${esc(L(s.name))}</span>
      <span class="strip__count">${esc(t().practicesCount(practicesIn(s.id).length))}</span>
    </button></li>`).join('');
  const duo = focusRegions().map((r) => `<a class="region-card" href="${href(`region/${r.id}`)}">
      ${regionArt[r.id] || ''}
      <span class="eyebrow">${esc(L(r.surveyed))}</span>
      <h3>${esc(L(r.name))}</h3>
      <p class="region-card__set">${esc(L(r.setting))}</p>
      <ul>${r.facts.map((f) => `<li><span>${esc(L(f))}</span></li>`).join('')}</ul>
      <span class="region-card__more">${esc(t().exploreRegion(L(r.name)))}${icon('arrow')}</span>
    </a>`).join('');
  const cov = d.slots.coverage.map((c) => `<li class="${c.status === 'planned' ? 'is-planned' : ''}"><span>${esc(L(c))}</span>${badge(c.status)}</li>`).join('');
  return `<div class="wrap view">
    <section class="hero">
      <div class="reveal">
        <span class="eyebrow">${esc(t().homeEyebrow)}</span>
        <h1>${t().homeTitle}</h1>
        <p class="lead">${esc(t().homeLead)}</p>
        <form class="search" role="search" data-search>
          <label class="visually-hidden" for="home-q">${esc(t().searchLabel)}</label>
          <input id="home-q" name="q" type="search" placeholder="${esc(t().searchPlaceholder)}" autocomplete="off">
          <button class="btn" type="submit">${icon('search')}${esc(t().searchGo)}</button>
        </form>
      </div>
      <aside class="notebook" aria-label="${esc(t().tallyTitle)}">
        <p class="notebook__title">${esc(t().tallyTitle)}</p>
        <ul class="tally">
          <li><b>${interviews}</b><span>${esc(t().tally.interviews)}</span></li>
          <li><b>${d.practices.length}</b><span>${esc(t().tally.practices)}</span></li>
          <li><b>${d.quality.observations.length}</b><span>${esc(t().tally.lab)}</span></li>
          <li><b>${d.sources.length}</b><span>${esc(t().tally.sources)}</span></li>
        </ul>
        <p class="notebook__foot">${esc(t().tallyFoot)}</p>
      </aside>
    </section>
    <section class="section">
      <div class="section__head"><h2>${esc(t().processTitle)}</h2><p>${esc(t().processLead)}</p></div>
      <ol class="strip strip--peek">${strip}</ol>
      <div class="timeline">${t().timeline}</div>
    </section>
    <section class="section">
      <div class="section__head"><h2>${esc(t().regionsTitle)}</h2><p>${esc(t().regionsLead)}</p></div>
      <div class="duo">${duo}</div>
    </section>
    <section class="section">
      <div class="section__head"><h2>${esc(t().coverageTitle)}</h2><p>${esc(t().coverageLead)}</p></div>
      <ul class="coverage">${cov}</ul>
    </section>
  </div>`;
}

function viewProcess() {
  const d = D();
  return `<div class="wrap view">
    <header class="page-head"><span class="eyebrow">${esc(t().nav.process)}</span><h1>${esc(t().processTitle)}</h1><p class="lead">${esc(t().processLead)}</p></header>
    <section class="section"><ol class="strip">${d.stages.map((s, i) => `<li><a href="${href(`stage/${s.id}`)}">
      <span class="strip__no">${String(i + 1).padStart(2, '0')}</span>${icon(s.id, 'strip__icon')}
      <span class="strip__name">${esc(L(s.name))}</span><span class="strip__count">${esc(L(s.summary))}</span></a></li>`).join('')}</ol>
      <div class="timeline">${t().timeline}</div></section>
  </div>`;
}

function viewStage(id) {
  const d = D();
  const s = stage(id);
  if (!s) return viewNotFound();
  const i = d.stages.indexOf(s);
  const list = practicesIn(id);
  const focusIds = focusRegions().map((r) => r.id);
  const inFocus = (p) => p.regions.filter((r) => focusIds.includes(r));
  const cols = [
    { key: 'both', name: t().bothRegions, items: list.filter((p) => inFocus(p).length === focusIds.length) },
    ...focusRegions().map((r) => ({ key: r.id, name: t().onlyIn(L(r.name)), items: list.filter((p) => inFocus(p).length === 1 && inFocus(p)[0] === r.id) })),
    { key: 'other', name: t().otherLiterature, items: list.filter((p) => !inFocus(p).length) },
  ].filter((c) => c.items.length);
  const media = d.slots.media.filter((m) => practice(m.practice).stage === id);
  const ccps = d.quality.qc.ccps.filter((c) => c.stage === id);
  const params = [...new Set(list.flatMap((p) => paramsForPractice(p.id)))];
  const prev = d.stages[i - 1];
  const next = d.stages[i + 1];
  const sop = d.slots.sops.find((x) => x.stage === id);
  return `<div class="wrap view">
    <header class="page-head detail-head">
      <div class="detail-head__icon">${icon(id)}</div>
      <div><span class="eyebrow">${esc(t().stageOf(i + 1, d.stages.length))}</span><h1>${esc(L(s.name))}</h1><p class="lead">${esc(L(s.summary))}</p></div>
    </header>
    <section class="section">
      <div class="section__head"><h2>${esc(t().byRegion)}</h2></div>
      <div class="columns">${cols.map((c) => `<div><div class="col-head"><h3>${esc(c.name)}</h3><span>${esc(t().practicesCount(c.items.length))}</span></div>
        <div class="cards">${c.items.map((p) => record(p, { showStage: false })).join('')}</div></div>`).join('')}</div>
    </section>
    ${params.length ? `<section class="section"><div class="section__head"><h2>${esc(t().relatedParams)}</h2></div>
      <div class="chips">${params.map((pid) => `<a class="chip" href="${href('explore', { param: pid })}">${esc(L(param(pid).name))}</a>`).join('')}</div></section>` : ''}
    ${ccps.length ? `<section class="section"><div class="section__head"><h2>${esc(t().qcTitle)}</h2><p><a href="${href('qc')}">${esc(t().qcPageTitle)}</a></p></div>
      <div class="ccp">${ccps.map(ccpCard).join('')}</div></section>` : ''}
    ${media.length ? `<section class="section"><div class="section__head"><h2>${esc(t().mediaTitle)}</h2><p>${esc(t().mediaLead)}</p></div>
      <div class="cards cards--2">${media.map(mediaSlot).join('')}</div></section>` : ''}
    ${sop ? `<p><a class="btn btn--quiet" href="${href('sops')}#sop-${id}">${esc(t().sopLink)}${icon('arrow', 'flip')}</a></p>` : ''}
    <nav class="pager" aria-label="${esc(t().stageLabel)}">
      ${prev ? `<a href="${href(`stage/${prev.id}`)}"><small>${esc(t().prev)}</small><span>${esc(L(prev.name))}</span></a>` : '<span></span>'}
      ${next ? `<a href="${href(`stage/${next.id}`)}"><small>${esc(t().next)}</small><span>${esc(L(next.name))}</span></a>` : '<span></span>'}
    </nav>
  </div>`;
}

function viewRegions() {
  return `<div class="wrap view">
    <header class="page-head"><span class="eyebrow">${esc(t().nav.regions)}</span><h1>${esc(t().regionsTitle)}</h1><p class="lead">${esc(t().regionsLead)}</p></header>
    <section class="section"><div class="duo">${focusRegions().map((r) => `<a class="region-card" href="${href(`region/${r.id}`)}">
      ${regionArt[r.id] || ''}<span class="eyebrow">${esc(L(r.surveyed))}</span><h3>${esc(L(r.name))}</h3>
      <p class="region-card__set">${esc(L(r.setting))}</p>
      <span class="region-card__more">${esc(t().exploreRegion(L(r.name)))}${icon('arrow')}</span></a>`).join('')}</div></section>
  </div>`;
}

function viewRegion(id) {
  const d = D();
  const r = region(id);
  if (!r || !r.focus) return viewNotFound();
  const other = focusRegions().find((x) => x.id !== id);
  const list = d.practices.filter((p) => p.regions.includes(id));
  const byStage = d.stages.map((s) => ({ s, items: list.filter((p) => p.stage === s.id) })).filter((g) => g.items.length);
  const obs = d.quality.observations.filter((o) => o.region === id);
  return `<div class="wrap view">
    <header class="page-head">
      <span class="eyebrow">${esc(t().regionEyebrow)}</span><h1>${esc(L(r.name))}</h1>
      <p class="lead">${esc(L(r.setting))}</p>
    </header>
    <section class="section">
      <div class="section__head"><h2>${esc(t().keyFacts)}</h2><p>${esc(t().surveyed)}: ${esc(L(r.surveyed))}</p></div>
      <ol class="facts">${r.facts.map((f) => `<li><div class="stack"><p>${esc(L(f))}</p>${citeLink(f.cite)}</div></li>`).join('')}</ol>
    </section>
    <section class="section">
      <div class="section__head"><h2>${esc(t().regionPractices)}</h2><p>${esc(t().practicesCount(list.length))}</p></div>
      <div class="stack">${byStage.map((g) => `<div><div class="col-head"><h3><a href="${href(`stage/${g.s.id}`)}">${esc(L(g.s.name))}</a></h3><span>${esc(t().practicesCount(g.items.length))}</span></div>
        <div class="cards cards--2">${g.items.map((p) => record(p, { showStage: false })).join('')}</div></div>`).join('')}</div>
    </section>
    <section class="section">
      <div class="section__head"><h2>${esc(t().labCoverage)}</h2></div>
      ${obs.length ? `<div class="multiples">${[...new Set(obs.map((o) => o.param))].map((pid) => labPanel(pid, obs.filter((o) => o.param === pid))).join('')}</div>`
        : emptyState(t().noLabTitle, t().noLabHint)}
    </section>
    ${other ? `<p><a class="btn btn--quiet" href="${href(`region/${other.id}`)}">${esc(t().compareWith(L(other.name)))}${icon('arrow', 'flip')}</a></p>` : ''}
  </div>`;
}

function viewExplore(params) {
  const d = D();
  const f = { region: params.get('region') || '', stage: params.get('stage') || '', kind: params.get('kind') || '', param: params.get('param') || '', q: params.get('q') || '' };
  const nq = normalize(f.q);
  const linked = f.param ? new Set(d.quality.links[f.param] || []) : null;
  const matches = (p, skip) => (skip === 'region' || !f.region || p.regions.includes(f.region))
    && (skip === 'stage' || !f.stage || p.stage === f.stage)
    && (skip === 'kind' || !f.kind || p.kind === f.kind)
    && (!linked || linked.has(p.id))
    && (!nq || normalize([p.title.en, p.title.ar, p.text.en, p.text.ar, L(stage(p.stage).name), stage(p.stage).name.en, ...p.regions.flatMap((r) => [region(r).name.en, region(r).name.ar])].join(' ')).includes(nq));
  const results = d.practices.filter((p) => matches(p));
  const chip = (key, val, label) => {
    const n = d.practices.filter((p) => matches(p, key) && (key === 'region' ? p.regions.includes(val) : p[key] === val)).length;
    const on = f[key] === val;
    return `<a class="chip${n || on ? '' : ' is-empty'}" role="button" aria-pressed="${on}" href="${href('explore', { ...f, [key]: on ? '' : val })}">${esc(label)} <span class="chip__count">${n}</span></a>`;
  };
  const usedRegions = d.regions.filter((r) => d.practices.some((p) => p.regions.includes(r.id)));
  const obs = f.param ? d.quality.observations.filter((o) => o.param === f.param && (!f.region || o.region === f.region)) : [];
  const anyFilter = f.region || f.stage || f.kind || f.param || f.q;
  return `<div class="wrap view">
    <header class="page-head"><span class="eyebrow">${esc(t().nav.explore)}</span><h1>${esc(t().exploreTitle)}</h1><p class="lead">${esc(t().exploreLead)}</p></header>
    <div class="explore">
      <aside class="facets" aria-label="Filters">
        <fieldset class="facet"><legend>${esc(t().facetRegion)}</legend><div class="chips">${usedRegions.map((r) => chip('region', r.id, L(r.name))).join('')}</div></fieldset>
        <fieldset class="facet"><legend>${esc(t().facetStage)}</legend><div class="chips">${d.stages.map((s) => chip('stage', s.id, L(s.name))).join('')}</div></fieldset>
        <fieldset class="facet"><legend>${esc(t().facetKind)}</legend><div class="chips">${Object.keys(d.vocab.kind).map((k) => chip('kind', k, vocab('kind', k))).join('')}</div></fieldset>
        <div class="facet"><label class="facet__label" for="param-select">${esc(t().facetParam)}</label>
          <select class="select" id="param-select" data-param>${[`<option value="">${esc(t().anyParam)}</option>`, ...d.quality.parameters.map((p) => `<option value="${p.id}" ${f.param === p.id ? 'selected' : ''}>${esc(L(p.name))}</option>`)].join('')}</select></div>
      </aside>
      <div>
        <h2 class="visually-hidden">${esc(t().resultsTitle)}</h2>
        <div class="results-bar">
          <form class="search" role="search" data-search data-keep='${esc(JSON.stringify({ ...f, q: '' }))}'>
            <label class="visually-hidden" for="explore-q">${esc(t().searchLabel)}</label>
            <input id="explore-q" name="q" type="search" value="${esc(f.q)}" placeholder="${esc(t().searchPlaceholder)}" autocomplete="off">
            <button class="btn" type="submit">${icon('search')}<span class="visually-hidden">${esc(t().searchGo)}</span></button>
          </form>
          <output aria-live="polite">${esc(t().resultCount(results.length))}</output>
          ${anyFilter ? `<a class="linkbtn" href="${href('explore')}">${esc(t().clear)}</a>` : ''}
        </div>
        ${f.param ? `<div class="stack" style="margin-bottom:var(--s-6)"><p class="lead" style="margin:0">${esc(t().paramPanelLead)}</p>
          ${obs.length ? `${legend([...new Set(obs.map((o) => o.source))])}${labPanel(f.param, obs, { links: false })}` : emptyState(t().noLabTitle, t().noLabHint)}</div>` : ''}
        ${results.length ? `<div class="cards">${results.map((p) => record(p)).join('')}</div>` : emptyState(t().noResults, t().noResultsHint)}
      </div>
    </div>
  </div>`;
}

function ccpCard(c, i) {
  const n = c.id.replace('ccp', '');
  return `<article class="ccp-card"><span class="ccp-card__no">CCP ${esc(n)}</span><div>
    <h3>${esc(L(c.step))}</h3>
    <dl>${['hazard', 'limit', 'monitor', 'action', 'verify'].map((k) => `<div><dt>${esc(t().ccpFields[k])}</dt><dd>${esc(L(c[k]))}</dd></div>`).join('')}</dl>
  </div></article>`;
}

function viewQuality(params) {
  const d = D();
  const q = d.quality;
  const mode = params.get('view') === 'table' ? 'table' : 'chart';
  const area = params.get('area') || '';
  const milk = params.get('milk') || '';
  const pids = q.parameters.map((p) => p.id).filter((pid) => q.observations.some((o) => o.param === pid));
  const rows = q.samples.rows.filter((r) => (!area || r.area === area) && (!milk || r.milk === milk));
  const opt = (field, cur) => [`<option value="">${esc(t().all)}</option>`, ...[...new Set(q.samples.rows.map((r) => r[field]))].map((v) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${esc(vocab(field, v))}</option>`)].join('');
  return `<div class="wrap view">
    <header class="page-head"><span class="eyebrow">${esc(t().nav.quality)}</span><h1>${esc(t().qualityTitle)}</h1><p class="lead">${esc(t().qualityLead)}</p></header>
    <section class="section">
      <h2 class="visually-hidden">${esc(t().compositionTitle)}</h2>
      <div class="section__head">
        ${legend(Object.keys(SERIES))}
        <div class="toggle" role="group" aria-label="${esc(t().viewChart)} / ${esc(t().viewTable)}">
          <a href="${href('quality')}" ${mode === 'chart' ? 'aria-current="true"' : ''}>${esc(t().viewChart)}</a>
          <a href="${href('quality', { view: 'table' })}" ${mode === 'table' ? 'aria-current="true"' : ''}>${esc(t().viewTable)}</a>
        </div>
      </div>
      ${mode === 'chart' ? `<div class="multiples">${pids.map((pid) => labPanel(pid, q.observations.filter((o) => o.param === pid))).join('')}</div>` : obsTable(q.observations)}
    </section>
    <section class="section">
      <div class="section__head"><h2>${esc(t().qcPageTitle)}</h2><p>${esc(t().qcPageLead)} <a href="${href('qc')}">${esc(t().qcPageTitle)} →</a></p></div>
    </section>
    <section class="section">
      <div class="section__head"><h2>${esc(t().samplesTitle)}</h2><p>${esc(t().samplesLead)}</p></div>
      <form class="chips" data-samples style="margin-bottom:var(--s-4)">
        <label class="facet"><span class="facet__label">${esc(t().filterArea)}</span><select class="select" name="area">${opt('area', area)}</select></label>
        <label class="facet"><span class="facet__label">${esc(t().filterMilk)}</span><select class="select" name="milk">${opt('milk', milk)}</select></label>
      </form>
      <div class="table-wrap"><table>
        <caption>${esc(t().resultCount(rows.length))} · ${esc(t().samplesNote)} ${citeLink(q.samples.cite)}</caption>
        <thead><tr>${['no', 'area', 'outlet', 'milk', 'pack', 'flow', 'particle', 'colour'].map((k) => `<th class="${k === 'no' ? 'num' : ''}">${esc(t().cols[k])}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr><td class="num">${r.sample}</td>${['area', 'outlet', 'milk', 'pack', 'flow', 'particle', 'colour'].map((k) => `<td>${esc(vocab(k, r[k]))}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
    </section>
  </div>`;
}

function viewQc() {
  const qc = D().quality.qc;
  return `<div class="wrap view">
    <header class="page-head"><span class="eyebrow">${esc(t().nav.quality)}</span><h1>${esc(t().qcPageTitle)}</h1><p class="lead">${esc(t().qcPageLead)}</p></header>
    <section class="section stack">
      <div class="callout" role="note"><strong>${esc(t().caveat)}</strong>${esc(L(qc.caveat))}</div>
      <p>${citeLink(qc.cite)}</p>
      <div class="ccp">${qc.ccps.map(ccpCard).join('')}</div>
    </section>
  </div>`;
}

function viewSops() {
  const d = D();
  return `<div class="wrap view">
    <header class="page-head"><span class="eyebrow">${esc(t().nav.sops)}</span><h1>${esc(t().sopsTitle)}</h1><p class="lead">${esc(t().sopsLead)}</p></header>
    <section class="section"><div class="cards cards--2">${d.slots.sops.map((s) => {
      const st = stage(s.stage);
      return `<article class="sop" id="sop-${s.stage}">
        <div class="sop__head">${icon(s.stage)}<h3>${esc(L(st.name))}</h3></div>
        <span class="stamp">${esc(t().sopStatus)} · ${esc(t().toCollect)}</span>
        <ol>${d.slots.sop_sections.map((x) => `<li>${esc(L(x))}</li>`).join('')}</ol>
        <div class="sop__seed">${esc(t().sopSeed)} ${s.from_literature.map((pid) => `<a class="tag" href="${href(`stage/${s.stage}`)}#p-${pid}">${esc(L(practice(pid).title))}</a>`).join('')}</div>
        ${s.qc.length ? `<div class="sop__seed">${esc(t().sopQc)} ${s.qc.map((c) => `<a class="tag" href="${href('qc')}">${esc(c.toUpperCase())}</a>`).join('')}</div>` : ''}
      </article>`;
    }).join('')}</div></section>
  </div>`;
}

function viewSources() {
  const d = D();
  const count = (id) => d.practices.filter((p) => p.cite.source === id).length + d.quality.observations.filter((o) => o.source === id).length
    + d.regions.flatMap((r) => r.facts).filter((f) => f.cite.source === id).length;
  const lib = d.library;
  return `<div class="wrap view">
    <header class="page-head"><span class="eyebrow">${esc(t().nav.sources)}</span><h1>${esc(t().sourcesTitle)}</h1><p class="lead">${esc(t().sourcesLead)}</p></header>
    <section class="section"><div>${d.sources.map((s) => `<article class="source" id="${esc(s.id)}">
      <div class="stack">
        <h3>${esc(s.title)}</h3>
        <p class="source__meta">${esc(s.authors)} (${s.year}). <em>${esc(s.venue)}</em>.${s.doi ? ` <a href="https://doi.org/${esc(s.doi)}" rel="noopener">doi:${esc(s.doi)}</a>` : ''}</p>
        <p>${esc(L(s.scope))}</p>
        <p class="source__meta">${esc(t().license)}: ${esc(s.license)}</p>
      </div>
      <div class="source__side"><b>${count(s.id)}</b><span class="source__meta">${esc(t().recordsFrom(count(s.id)))}</span><div class="record__top">${regionTags(s.regions)}</div></div>
    </article>`).join('')}</div></section>
    <section class="section">
      <div class="section__head"><h2>${esc(t().libraryTitle)}</h2><p>${esc(t().libraryLead(lib.totals))}</p></div>
      <div class="table-wrap"><table>
        <thead><tr><th>${t().cols.title}</th><th class="num">${t().cols.tier}</th><th class="num">${t().cols.extracted}</th><th class="num">${t().cols.reviewed}</th><th></th></tr></thead>
        <tbody>${lib.papers.map((p) => `<tr><td>${esc(p.title)}</td><td class="num">${p.trust_tier ?? '—'}</td><td class="num">${p.measurements.toLocaleString('en')}</td><td class="num">${p.approved}</td><td>${p.curated_source ? `<a class="tag" href="${href('sources')}#${p.curated_source}">${esc(t().curated)}</a>` : ''}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>
  </div>`;
}

function viewAbout() {
  const u = t();
  return `<div class="wrap view">
    <header class="page-head"><span class="eyebrow">${esc(u.nav.about)}</span><h1>${esc(u.aboutTitle)}</h1><p class="lead">${esc(u.aboutLead)}</p></header>
    <section class="section duo">
      <div class="stack"><h2>${esc(u.purposeTitle)}</h2><p class="lead">${esc(u.purpose)}</p></div>
      <div class="stack"><h2>${esc(u.audienceTitle)}</h2><p class="lead">${esc(u.audience)}</p></div>
    </section>
    <section class="section">
      <div class="section__head"><h2>${esc(u.principlesTitle)}</h2></div>
      <ul class="principles">${u.principles.map(([ic, h, p]) => `<li>${icon(ic, 'strip__icon')}<h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ul>
    </section>
    <section class="section duo">
      <div class="stack"><h2>${esc(u.mvpTitle)}</h2><ul class="stack">${u.mvp.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="stack"><h2>${esc(u.roadmapTitle)}</h2><ol class="stack">${u.roadmap.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
        <ul class="coverage">${D().slots.coverage.map((c) => `<li class="${c.status === 'planned' ? 'is-planned' : ''}"><span>${esc(L(c))}</span>${badge(c.status)}</li>`).join('')}</ul></div>
    </section>
  </div>`;
}

function viewNotFound() {
  return `<div class="wrap view"><header class="page-head"><h1>${esc(t().notFound)}</h1><p class="lead"><a href="#/">${esc(t().backHome)}</a></p></header></div>`;
}

// ------------------------------------------------------------------ stage preview (home)
function peekHtml(id) {
  const d = D();
  const s = stage(id);
  const i = d.stages.indexOf(s);
  const list = practicesIn(id);
  const top = list.slice(0, 3);
  const regionsOf = (p) => p.regions.map((r) => L(region(r).name)).join(' · ');
  const figure = (f) => (f ? ` · <b>${fmt(f.value)}${f.unit === '%' ? '%' : ` ${esc(unit(f.unit))}`}</b> ${esc(L(f.label))}` : '');
  return `<div class="peek__head">
      <div class="peek__title">${icon(id, 'peek__icon')}<div><span class="strip__no">${esc(t().stageOf(i + 1, d.stages.length))}</span><h3 id="peek-title">${esc(L(s.name))}</h3></div></div>
      <button class="peek__close" type="button" data-peek-close aria-label="${esc(t().peekClose)}">${icon('close')}</button>
    </div>
    <p class="peek__summary">${esc(L(s.summary))}</p>
    <ul class="peek__list">${top.map((p) => `<li><a href="${href(`stage/${id}`)}#p-${p.id}">
        <span class="peek__item">${esc(L(p.title))}</span>
        <span class="peek__meta">${esc(regionsOf(p))}${figure(p.figures?.[0])}</span></a></li>`).join('')}</ul>
    <a class="btn btn--quiet peek__more" href="${href(`stage/${id}`)}">${esc(list.length > top.length ? t().peekMore(list.length) : t().peekOpen)}${icon('arrow', 'flip')}</a>`;
}

// The preview is a full-width list row inserted right after the grid row that holds
// the tapped stage, so it opens directly under it at every breakpoint.
function removePeek() {
  document.querySelectorAll('.peek-slot').forEach((el) => el.remove());
  document.querySelectorAll('[data-peek]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}
function togglePeek(btn) {
  const wasOpen = btn.getAttribute('aria-expanded') === 'true';
  removePeek();
  if (wasOpen) return;
  const li = btn.closest('li');
  const strip = li.parentElement;
  const items = [...strip.children];
  const rowEnd = items.filter((el) => el.offsetTop === li.offsetTop).pop();
  const slot = document.createElement('li');
  slot.className = 'peek-slot';
  slot.innerHTML = `<div class="peek is-in" id="stage-peek" role="region" aria-labelledby="peek-title">${peekHtml(btn.dataset.peek)}</div>`;
  slot.dataset.for = btn.dataset.peek;
  rowEnd.after(slot);
  btn.setAttribute('aria-expanded', 'true');
  const s = strip.getBoundingClientRect();
  const b = btn.getBoundingClientRect();
  slot.firstElementChild.style.setProperty('--caret', `${b.left + b.width / 2 - s.left}px`);
  if (slot.getBoundingClientRect().bottom > innerHeight) {
    slot.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}
function closePeek() {
  const slot = $('.peek-slot');
  if (!slot) return;
  const btn = document.querySelector(`[data-peek="${slot.dataset.for}"]`);
  removePeek();
  btn?.focus();
}

// ------------------------------------------------------------------ theme (light by default)
function readTheme() { try { return localStorage.getItem('atlas-theme') === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; } }
function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#17130f' : '#f4eee2';
}

// ------------------------------------------------------------------ chrome
const NAV = [['explore', 'explore'], ['process', 'process'], ['regions', 'regions'], ['quality', 'quality'], ['sops', 'sops'], ['sources', 'sources'], ['about', 'about']];
const SECTION_OF = { stage: 'process', region: 'regions', qc: 'quality' };

function renderChrome(section) {
  const u = t();
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  $('#preview-bar').innerHTML = u.previewBar;
  $('.skip').textContent = u.skip;
  $('#brand').innerHTML = `${brandMark}<span class="brand__text"><span class="brand__en">${esc(u.siteName)}</span><span class="brand__ar" lang="${state.lang === 'ar' ? 'en' : 'ar'}">${esc(u.siteNameAlt)}</span></span>`;
  $('#nav').innerHTML = NAV.map(([key, path]) => `<a href="#/${path}" ${section === key ? 'aria-current="page"' : ''}>${esc(u.nav[key])}</a>`).join('');
  $('#nav').setAttribute('aria-label', state.lang === 'ar' ? 'القائمة الرئيسية' : 'Main');
  const dark = document.documentElement.dataset.theme === 'dark';
  const tt = $('#theme-toggle');
  tt.innerHTML = icon(dark ? 'sun' : 'moon');
  tt.setAttribute('aria-label', dark ? u.themeLight : u.themeDark);
  tt.setAttribute('title', dark ? u.themeLight : u.themeDark);
  const lt = $('#lang-toggle');
  lt.innerHTML = `<span lang="${state.lang === 'ar' ? 'en' : 'ar'}">${esc(u.langSwitch)}</span>`;
  lt.setAttribute('aria-label', u.langSwitchLabel);
  const mb = $('#menu-btn');
  mb.innerHTML = icon($('#nav').classList.contains('is-open') ? 'close' : 'menu');
  mb.setAttribute('aria-label', u.menu);
  $('#footer').innerHTML = `<p>${esc(u.footer)}</p><p>${esc(u.footerData)}</p>`;
}

function route() {
  if (!state.data) return;
  const { parts, params } = parseHash();
  const [head = '', arg] = parts;
  const views = {
    '': () => viewHome(), explore: () => viewExplore(params), process: () => viewProcess(), stage: () => viewStage(arg),
    regions: () => viewRegions(), region: () => viewRegion(arg), quality: () => viewQuality(params), qc: () => viewQc(),
    sops: () => viewSops(), sources: () => viewSources(), about: () => viewAbout(),
  };
  const section = SECTION_OF[head] || head;
  renderChrome(section);
  const main = $('#main');
  main.innerHTML = (views[head] || viewNotFound)();
  const h1 = $('h1', main);
  document.title = head ? `${h1 ? h1.textContent : ''} · ${t().siteName}` : `${t().siteName} — ${t().homeEyebrow}`;
  $('#nav').classList.remove('is-open');
  $('#menu-btn').setAttribute('aria-expanded', 'false');
  const anchor = location.hash.split('#')[2];
  const target = anchor && document.getElementById(anchor);
  if (target) target.scrollIntoView({ block: 'start' });
  else if (state.navigated) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  state.navigated = true;
}

// ------------------------------------------------------------------ events
function bind() {
  window.addEventListener('hashchange', route);
  $('#lang-toggle').addEventListener('click', () => { state.lang = state.lang === 'ar' ? 'en' : 'ar'; saveLang(state.lang); route(); });
  $('#theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('atlas-theme', next); } catch (e) { /* storage blocked */ }
    applyTheme(next);
    const head = parseHash().parts[0] || '';
    renderChrome(SECTION_OF[head] || head);
  });
  document.addEventListener('click', (e) => {
    const peekBtn = e.target.closest('[data-peek]');
    if (peekBtn) { togglePeek(peekBtn); return; }
    if (e.target.closest('[data-peek-close]')) closePeek();
  });
  $('#menu-btn').addEventListener('click', () => {
    const open = $('#nav').classList.toggle('is-open');
    $('#menu-btn').setAttribute('aria-expanded', String(open));
    $('#menu-btn').innerHTML = icon(open ? 'close' : 'menu');
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-search]');
    if (!form) return;
    e.preventDefault();
    const keep = form.dataset.keep ? JSON.parse(form.dataset.keep) : {};
    location.hash = href('explore', { ...keep, q: new FormData(form).get('q').trim() });
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-param]')) {
      const { params } = parseHash();
      location.hash = href('explore', { ...Object.fromEntries(params), param: e.target.value });
    }
    const sf = e.target.closest('[data-samples]');
    if (sf) {
      const { params } = parseHash();
      location.hash = href('quality', { ...Object.fromEntries(params), ...Object.fromEntries(new FormData(sf)) });
    }
  });
  // chart tooltip: hover + keyboard focus
  const tip = $('#tooltip');
  const show = (el, x, y) => {
    const [h, v, c] = el.dataset.tip.split('|');
    tip.innerHTML = `<b>${esc(h)}</b>${esc(v)}<br><span>${esc(c)}</span>`;
    const w = tip.offsetWidth || 240;
    tip.style.left = `${Math.min(Math.max(8, x - w / 2), window.innerWidth - w - 8)}px`;
    tip.style.top = `${Math.max(8, y - tip.offsetHeight - 14)}px`;
    tip.classList.add('is-on');
  };
  const hide = () => tip.classList.remove('is-on');
  document.addEventListener('pointermove', (e) => { const el = e.target.closest('[data-tip]'); if (el) show(el, e.clientX, e.clientY); else hide(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); } });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hide(); closePeek(); } });
}

async function boot() {
  state.lang = readLang();
  applyTheme(readTheme());
  bind();
  renderChrome(parseHash().parts[0] || '');
  try {
    const res = await fetch(`data/atlas.json?v=${VERSION}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
  } catch (err) {
    console.error('Atlas data failed to load:', err);
    $('#main').innerHTML = `<div class="wrap"><div class="empty" role="alert"><h3>${esc(t().loadError)}</h3></div></div>`;
    return;
  }
  route();
}
boot();
