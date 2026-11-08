// ═══════════════════════════════════════════════════════════════
//  CGPA Tracker for SPJIMR PGDM(BM) 2025-27 — Year 1 + Year 2
// ═══════════════════════════════════════════════════════════════

import { SECTIONS, YEAR1_IDS, YEAR2_IDS, GRADE_SCALE, DEFAULT_YEAR1_CREDITS, DEFAULT_YEAR2_CREDITS, absoluteGrade } from './data.js';
import { calcTermGPA, countGrades, requiredGPA, gradeToPoints } from './calculator.js';
import { evaluatePromotionRules, evaluateDiplomaRules, getOverallStatus } from './rules.js';
import { cloud, authErrorMessage } from './cloud.js';

const GUEST_KEY = 'spjimr-bm-cgpa-y1y2-v4';
const byId = Object.fromEntries(SECTIONS.map(s => [s.id, s]));

// ─── State ────────────────────────────────────────────────────
function defaultState() {
  const sections = {};
  SECTIONS.forEach(s => {
    sections[s.id] = {
      directMode: false,
      directGPA: '',
      directCredits: String(coreCredits(s.courses)),
      courses: s.courses.map(c => ({ ...c, grade: '—' })),
    };
  });
  return {
    activeTab: 'summary',
    y1Shortcut: { on: false, cgpa: '', credits: String(DEFAULT_YEAR1_CREDITS) },
    target: { cgpa: '3.00', remaining: '' },
    sections,
  };
}

/**
 * Merge a saved state (local or cloud) onto today's course list.
 * Grades follow courses by name, so courses that moved between terms
 * (e.g. the old Term 5 courses now in Term 4) keep their grades.
 */
function mergeState(saved) {
  const base = defaultState();
  if (!saved || typeof saved !== 'object') return base;
  const byName = new Map();
  Object.values(saved.sections || {}).forEach(sec => (sec.courses || []).forEach(c => {
    if (c && c.name && c.grade && c.grade !== '—' && !byName.has(c.name)) byName.set(c.name, { grade: c.grade, pct: c.pct || '' });
  }));
  const carry = c => { const g = byName.get(c.name); return g ? { ...c, grade: g.grade, pct: g.pct } : c; };

  Object.assign(base.y1Shortcut, saved.y1Shortcut || {});
  Object.assign(base.target, saved.target || {});
  for (const id of Object.keys(base.sections)) {
    const def = byId[id];
    const s = saved.sections && saved.sections[id];
    const b = base.sections[id];
    if (!s) { b.courses = b.courses.map(carry); continue; }
    const merged = { ...b, directMode: !!s.directMode, directGPA: s.directGPA ?? '', directCredits: s.directCredits ?? b.directCredits };
    if (!def.editable) {
      // Fixed course lists come from data.js; only grades are restored.
      merged.courses = b.courses.map(carry);
    } else {
      // Editable lists keep the student's rows; official (fixed) courses are refreshed from data.js
      // and any that are missing are added back.
      const savedRows = (s.courses || []).filter(c => c && typeof c === 'object');
      // Student-added rows first (where "+ Add course" puts them), then official courses in official order.
      const own = savedRows.filter(c => !c.fixed).map(c => ({ ...c }));
      const official = def.courses.filter(c => c.fixed).map(c => {
        const prev = savedRows.find(r => r.fixed && r.name === c.name);
        return prev ? { ...c, grade: prev.grade || '—', pct: prev.pct || '' } : carry({ ...c, grade: '—' });
      });
      merged.courses = [...own, ...official];
    }
    base.sections[id] = merged;
  }
  if (saved.activeTab && (saved.activeTab === 'summary' || byId[saved.activeTab])) base.activeTab = saved.activeTab;
  return base;
}

function readLocal(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
}

// ─── Accounts ─────────────────────────────────────────────────
// account.status: 'off' (no backend) | 'guest' | 'loading' | 'saved' | 'saving' | 'error'
const account = { user: null, status: cloud.enabled ? 'guest' : 'off' };
const storageKey = () => (account.user ? `${GUEST_KEY}:${account.user.uid}` : GUEST_KEY);

let state = mergeState(readLocal(GUEST_KEY));

let cloudTimer = null;
let lastSynced = null;   // fingerprint of what the cloud already has
const fingerprint = st => JSON.stringify({ ...st, activeTab: undefined });

function save() {
  try { localStorage.setItem(storageKey(), JSON.stringify(state)); } catch (_) { /* ignore */ }
  if (account.user && account.status !== 'loading' && fingerprint(state) !== lastSynced) {
    clearTimeout(cloudTimer);
    setSync('saving');
    cloudTimer = setTimeout(pushToCloud, 1200);
  }
}

async function pushToCloud() {
  clearTimeout(cloudTimer);
  const user = account.user;
  if (!user) return;
  try {
    const fp = fingerprint(state);
    await cloud.save(user.uid, user.email, state);
    lastSynced = fp;
    if (account.user && account.user.uid === user.uid) setSync('saved');
  } catch (_) {
    setSync('error');
    cloudTimer = setTimeout(pushToCloud, 8000);   // retry quietly
  }
}

function setSync(status) {
  account.status = status;
  const el = app.querySelector('[data-live="sync"]');
  if (el) el.innerHTML = syncText();
}

function syncText() {
  return {
    loading: '<span class="sync-dot is-busy" aria-hidden="true"></span>Loading your grades…',
    saving: '<span class="sync-dot is-busy" aria-hidden="true"></span>Saving…',
    saved: '<span class="sync-dot is-ok" aria-hidden="true"></span>Saved to your account',
    error: '<span class="sync-dot is-err" aria-hidden="true"></span>Couldn’t save. Retrying…',
  }[account.status] || '';
}

async function onUserChanged(user) {
  const prev = account.user;
  if (prev && (!user || user.uid !== prev.uid)) {
    // Signed out (or switched): drop that user's copy from this device.
    try { localStorage.removeItem(`${GUEST_KEY}:${prev.uid}`); } catch (_) { /* ignore */ }
  }
  account.user = user;
  lastSynced = null;
  if (!user) {
    account.status = 'guest';
    state = mergeState(readLocal(GUEST_KEY));
    render();
    return;
  }
  account.status = 'loading';
  render();
  try {
    const remote = await cloud.load(user.uid);
    if (!account.user || account.user.uid !== user.uid) return;
    if (remote) {
      state = mergeState(remote);
      lastSynced = fingerprint(state);
      account.status = 'saved';
      render();
    } else {
      // First sign-in: start the account from what's on this device.
      state = mergeState(readLocal(`${GUEST_KEY}:${user.uid}`) || readLocal(GUEST_KEY));
      account.status = 'saving';
      render();
      await pushToCloud();
    }
  } catch (_) {
    state = mergeState(readLocal(`${GUEST_KEY}:${user.uid}`) || state);
    account.status = 'error';
    render();
  }
}

// ─── Helpers ──────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

function coreCredits(courses) {
  return courses.filter(c => !c.optional).reduce((s, c) => s + (num(c.credits) || 0), 0);
}

function fmt(gpa, has) {
  return has ? gpa.toFixed(2) : '—';
}

/** { gpa, points, credits, hasGrades, listedCredits } for one section. */
function sectionResult(id) {
  const ss = state.sections[id];
  const listedCredits = coreCredits(ss.courses);
  if (ss.directMode) {
    const gpa = num(ss.directGPA);
    const credits = num(ss.directCredits);
    if (Number.isFinite(gpa) && credits > 0) {
      const g = Math.min(4, Math.max(0, gpa));
      return { gpa: g, points: g * credits, credits, hasGrades: true, listedCredits: credits };
    }
    return { gpa: 0, points: 0, credits: 0, hasGrades: false, listedCredits: Number.isFinite(credits) ? credits : 0 };
  }
  const courses = ss.courses.map(c => ({ credits: num(c.credits) || 0, grade: c.grade }));
  const r = calcTermGPA(courses);
  return { gpa: r.gpa, points: r.gpa * r.gradedCredits, credits: r.gradedCredits, hasGrades: r.gradedCredits > 0, listedCredits };
}

function combine(results) {
  let points = 0, credits = 0;
  results.forEach(r => { if (r.hasGrades) { points += r.points; credits += r.credits; } });
  return { gpa: credits > 0 ? points / credits : 0, points, credits, hasGrades: credits > 0 };
}

function year1Result() {
  const sc = state.y1Shortcut;
  if (sc.on) {
    const gpa = num(sc.cgpa), credits = num(sc.credits);
    if (Number.isFinite(gpa) && credits > 0) {
      const g = Math.min(4, Math.max(0, gpa));
      return { gpa: g, points: g * credits, credits, hasGrades: true };
    }
    return { gpa: 0, points: 0, credits: 0, hasGrades: false };
  }
  return combine(YEAR1_IDS.map(sectionResult));
}

function year2Result() {
  return combine(YEAR2_IDS.map(sectionResult));
}

function overallResult() {
  return combine([year1Result(), year2Result()]);
}

/** Credits in Year 2 rows that don't have a grade yet (used as default "remaining"). */
function ungradedYear2Credits() {
  let total = 0;
  YEAR2_IDS.forEach(id => {
    const ss = state.sections[id];
    if (ss.directMode) {
      if (!sectionResult(id).hasGrades) total += num(ss.directCredits) || 0;
      return;
    }
    ss.courses.forEach(c => { if (gradeToPoints(c.grade) === null) total += num(c.credits) || 0; });
  });
  return total;
}

function gradedCoursesIn(ids) {
  const all = [];
  ids.forEach(id => { const ss = state.sections[id]; if (!ss.directMode) all.push(...ss.courses); });
  return all;
}

// ─── Rendering ────────────────────────────────────────────────
const app = document.getElementById('app');

/** A CSS selector that finds "the same" control again after a re-render. */
function focusKey(el) {
  if (!el || !el.dataset || el === document.body) return null;
  const keys = ['tab', 'action', 'field', 'section', 'i'].filter(k => el.dataset[k] !== undefined);
  if (!keys.length) return null;
  return keys.map(k => `[data-${k}="${el.dataset[k]}"]`).join('');
}

function render(focusSelector) {
  const tab = state.activeTab;
  const key = focusSelector !== undefined ? focusSelector : focusKey(document.activeElement);
  const scrollY = window.scrollY;
  app.innerHTML = `
    ${renderHeader()}
    <main class="main-content" id="main" tabindex="-1">
      ${renderTabs()}
      <div class="tab-content" id="panel" role="tabpanel" aria-labelledby="tab-${tab}">
        ${tab === 'summary' ? renderSummary() : renderSection(tab)}
      </div>
    </main>
    <footer class="footer">
      <p>An unofficial CGPA tracker for SPJIMR PGDM(BM) 2025–27, built on the batch’s General Guidelines.</p>
      <p class="footer-note">Your grade sheet and the Programme Office have the final word.</p>
    </footer>
  `;
  if (key) {
    const el = app.querySelector(key);
    if (el) { el.focus({ preventScroll: true }); window.scrollTo(0, scrollY); }
  }
  save();
  announce();
}

// Screen-reader announcement of the CGPA and verdict, after typing settles.
let announceTimer = null, lastAnnounced = '';
function announce() {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    const live = document.getElementById('sr-status');
    if (!live) return;
    const all = overallResult(), v = verdict();
    const msg = `Combined CGPA ${all.hasGrades ? all.gpa.toFixed(2) : 'not available yet'}. Verdict: ${v.label.toLowerCase()}.`;
    if (msg !== lastAnnounced) { live.textContent = msg; lastAnnounced = msg; }
  }, 900);
}

function renderHeader() {
  return `
    <header class="header">
      <div class="header-inner">
        <h1 class="brand">
          <span class="brand-name">CGPA Tracker</span>
          <span class="brand-sub">SPJIMR PGDM(BM) 2025–27</span>
        </h1>
        <div class="account" aria-label="Account">${accountHTML()}</div>
      </div>
    </header>
    <div class="tracker" data-live="tracker" aria-label="Live CGPA tracker" role="region">${trackerHTML()}</div>
  `;
}

function accountHTML() {
  if (!cloud.enabled) return `<span class="account-note">Grades are saved in this browser</span>`;
  if (!account.user) {
    return `<button type="button" class="account-btn" data-action="open-auth">Sign in<span class="wide-only"> to save your grades</span></button>`;
  }
  return `
    <div class="account-user">
      <span class="account-email" title="${esc(account.user.email)}">${esc(account.user.email)}</span>
      <span class="account-sync" data-live="sync" role="status">${syncText()}</span>
    </div>
    <button type="button" class="account-btn ghost" data-action="sign-out">Sign out</button>`;
}

const VERDICT_ICON = { pass: '✓', fail: '✕', 'at-risk': '!', provisional: '✓', empty: '–' };
const TOTAL_CREDITS = DEFAULT_YEAR1_CREDITS + DEFAULT_YEAR2_CREDITS;

/**
 * Five rising strokes that fill, one after another, as credits get graded.
 * Decorative: the surrounding element carries the progressbar semantics.
 */
function strokesSVG(fraction, cls = '') {
  const f = Math.max(0, Math.min(1, fraction || 0));
  const bars = [0, 1, 2, 3, 4].map(i => {
    const h = 16 + i * 6, x = i * 10, y = 44 - h;
    const fill = Math.max(0, Math.min(1, f * 5 - i));
    return `<rect class="stroke-track" x="${x}" y="${y}" width="6" height="${h}" rx="3"/>` +
      (fill > 0 ? `<rect class="stroke-fill s${i}" x="${x}" y="${(y + h * (1 - fill)).toFixed(1)}" width="6" height="${(h * fill).toFixed(1)}" rx="3"/>` : '');
  }).join('');
  return `<svg class="strokes ${cls}" viewBox="-6 0 56 46" aria-hidden="true" focusable="false"><g transform="skewX(-16) translate(12 0)">${bars}</g></svg>`;
}

function creditsProgress(all, cls) {
  return `
    <div class="credit-progress ${cls}" role="progressbar" aria-label="Credits graded" aria-valuemin="0"
      aria-valuemax="${TOTAL_CREDITS}" aria-valuenow="${all.credits}" aria-valuetext="${all.credits} of ${TOTAL_CREDITS} credits graded">
      ${strokesSVG(all.credits / TOTAL_CREDITS, cls)}
      <span class="credit-progress-text">${all.credits} of ${TOTAL_CREDITS} credits graded</span>
    </div>`;
}

function trackerHTML() {
  const y1 = year1Result(), y2 = year2Result(), all = combine([y1, y2]);
  const v = verdict();
  const tab = state.activeTab;
  const term = tab !== 'summary' ? sectionResult(tab) : null;
  const stat = (label, val, cls = '') => `
    <div class="trk-stat ${cls}"><span class="trk-label">${label}</span><span class="trk-value">${val}</span></div>`;
  return `
    <div class="tracker-inner">
      <div class="trk-verdict v-${v.key}">
        <span class="trk-verdict-icon" aria-hidden="true">${VERDICT_ICON[v.key]}</span>
        <span class="trk-verdict-text"><span class="sr-only">Verdict: </span>${v.label}</span>
      </div>
      ${stat('Combined CGPA', fmt(all.gpa, all.hasGrades), 'trk-main')}
      ${stat('Year 1', fmt(y1.gpa, y1.hasGrades), term ? 'trk-year' : '')}
      ${stat('Year 2', fmt(y2.gpa, y2.hasGrades), term ? 'trk-year' : '')}
      ${term ? stat(`${byId[tab].name} GPA`, fmt(term.gpa, term.hasGrades), 'trk-term') : ''}
      ${creditsProgress(all, 'on-dark')}
    </div>`;
}

function renderTabs() {
  const btn = (id, label, full) => `
    <button class="tab-btn ${state.activeTab === id ? 'active' : ''}" data-tab="${id}" role="tab" id="tab-${id}"
      aria-controls="panel" aria-selected="${state.activeTab === id}" tabindex="${state.activeTab === id ? 0 : -1}"
      ${full ? `aria-label="${full}"` : ''}>${label}</button>`;
  const short = s => s.ncl ? 'NCL' : s.name;
  const group = (year, list) => `
    <span class="tab-group" role="presentation">
      <span class="tab-group-label" aria-hidden="true">Year ${year}</span>
      ${list.map(s => btn(s.id, short(s), `Year ${year} ${s.name}`)).join('')}
    </span>`;
  return `
    <nav class="tabs-nav" aria-label="Sections">
      <div class="tabs" role="tablist" aria-label="Summary and terms" data-tablist>
        ${btn('summary', 'Summary')}
        ${group(1, SECTIONS.filter(s => s.year === 1))}
        ${group(2, SECTIONS.filter(s => s.year === 2))}
      </div>
    </nav>
  `;
}

function figure(title, r, note) {
  return `
    <div class="figure">
      <h3 class="figure-title">${title}</h3>
      <p class="figure-value ${r.hasGrades ? '' : 'is-empty'}">${r.hasGrades ? r.gpa.toFixed(2) : '<span aria-hidden="true">—</span><span class="sr-only">No grades yet</span>'}</p>
      <p class="figure-note">${note}</p>
    </div>`;
}

function renderSummary() {
  const y1 = year1Result();
  const y2 = year2Result();
  const all = combine([y1, y2]);
  const left = TOTAL_CREDITS - all.credits;

  return `
    ${renderVerdict(all)}
    <section class="figures" aria-label="CGPA by year">
      ${figure('Year 1 CGPA', y1, state.y1Shortcut.on ? `Entered directly, ${y1.credits} credits` : `${y1.credits} of ${DEFAULT_YEAR1_CREDITS} credits graded`)}
      ${figure('Year 2 CGPA', y2, `${y2.credits} of ${DEFAULT_YEAR2_CREDITS} credits graded`)}
      <div class="figure">
        <h3 class="figure-title">Still to be graded</h3>
        <p class="figure-value">${left}</p>
        <p class="figure-note">credits, out of ${TOTAL_CREDITS} counted in CGPA</p>
      </div>
    </section>
    ${renderYear1Shortcut()}
    ${renderProgression()}
    <div class="summary-columns">
      <div class="column">
        ${renderProbation()}
        ${renderPromotion()}
        ${renderDiploma()}
      </div>
      <div class="column">
        ${renderPlanner()}
        ${renderHonours()}
      </div>
    </div>
  `;
}

function cumulativeSteps(ids) {
  let acc = [];
  return ids.map(id => {
    const term = sectionResult(id);
    acc = [...acc, term];
    return { label: byId[id].short, term, r: combine(acc) };
  });
}

function renderTrack(title, sub, steps, cls) {
  return `
    <div class="track ${cls}">
      <h4 class="track-title">${title} <span>${sub}</span></h4>
      <ol class="track-steps">
        ${steps.map(s => `
          <li class="step ${s.term && !s.term.hasGrades ? 'is-empty' : ''} ${s.total ? 'is-total' : ''}">
            <span class="step-label">${s.total ? s.label : `After ${s.label}`}</span>
            <span class="step-value">${s.r.hasGrades ? s.r.gpa.toFixed(2) : '<span aria-hidden="true">—</span><span class="sr-only">no grades</span>'}</span>
            <span class="step-note">${s.note ?? (s.term ? (s.term.hasGrades ? `${s.label} alone: ${s.term.gpa.toFixed(2)}` : 'No grades yet') : '')}</span>
          </li>`).join('')}
      </ol>
    </div>`;
}

function renderProgression() {
  const y1 = year1Result(), y2 = year2Result();
  const y1Steps = state.y1Shortcut.on
    ? [{ label: 'Year 1', r: y1, note: 'Entered directly', total: true }]
    : [...cumulativeSteps(YEAR1_IDS), { label: 'Year 1', r: y1, note: `${y1.credits} credits`, total: true }];
  const y2Steps = [...cumulativeSteps(YEAR2_IDS), { label: 'Year 2', r: y2, note: `${y2.credits} credits`, total: true }];
  let acc = [y1];
  const bothSteps = [{ label: 'Year 1', r: y1, note: `${y1.credits} credits` }, ...YEAR2_IDS.map(id => {
    const term = sectionResult(id);
    acc = [...acc, term];
    return { label: byId[id].short, term, r: combine(acc) };
  }), { label: 'Both years', r: combine([y1, y2]), note: `${y1.credits + y2.credits} credits`, total: true }];
  bothSteps[0].label = 'Y1'; bothSteps[0].term = null;

  return `
    <section class="panel progression" aria-labelledby="prog-title">
      <h2 id="prog-title" class="panel-title">Cumulative CGPA</h2>
      <p class="panel-sub">Each figure is the CGPA up to and including that term, weighted by credits.</p>
      ${renderTrack('Year 1', `${DEFAULT_YEAR1_CREDITS} credits`, y1Steps, 'track-y1')}
      ${renderTrack('Year 2', `${DEFAULT_YEAR2_CREDITS} credits`, y2Steps, 'track-y2')}
      ${renderTrack('Both years', `${TOTAL_CREDITS} credits, MOOCs excluded`, bothSteps, 'track-all')}
    </section>
  `;
}

function renderYear1Shortcut() {
  const sc = state.y1Shortcut;
  return `
    <div class="y1-direct ${sc.on ? 'is-on' : ''}">
      <label class="inline-toggle">
        <span class="toggle-switch">
          <input type="checkbox" role="switch" data-action="y1-shortcut" ${sc.on ? 'checked' : ''} />
          <span class="toggle-slider" aria-hidden="true"></span>
        </span>
        <span><strong>Enter Year 1 CGPA directly</strong>
          <span class="y1-direct-hint">${sc.on ? 'Year 1 course grades are ignored while this is on.' : 'Skip the Year 1 tabs and type the CGPA from your Year 1 grade sheet.'}</span></span>
      </label>
      ${sc.on ? `
        <div class="field-row y1-direct-fields">
          <label>Year 1 CGPA <input type="number" class="field-input" min="0" max="4" step="0.01" placeholder="e.g. 3.12" inputmode="decimal" data-field="y1-cgpa" value="${esc(sc.cgpa)}" /></label>
          <label>Year 1 credits <input type="number" class="field-input" min="0" step="0.5" inputmode="decimal" data-field="y1-credits" value="${esc(sc.credits)}" /></label>
          <span class="field-note">${DEFAULT_YEAR1_CREDITS} credits: 16 + 18 + 15, plus 5 NCL</span>
        </div>` : ''}
    </div>
  `;
}

function plannerResult() {
  const all = overallResult();
  const target = num(state.target.cgpa);
  const autoRem = ungradedYear2Credits();
  const rem = state.target.remaining === '' ? autoRem : num(state.target.remaining);
  return { all, target, rem, autoRem, need: Number.isFinite(target) ? requiredGPA(all.points, all.credits, rem, target) : null };
}

function plannerOutputHTML() {
  const { target, rem, need } = plannerResult();
  if (!Number.isFinite(target)) return `<div class="planner-out muted">Enter a target CGPA.</div>`;
  if (need === null) return `<div class="planner-out muted">No credits left to plan for. Add Year 2 courses without a grade, or type the credits remaining.</div>`;
  let cls = 'ok', msg = '';
  if (need > 4) { cls = 'bad'; msg = `Not reachable: you'd need ${need.toFixed(2)} on ${rem} credits, above the 4.00 maximum.`; }
  else if (need <= 0) { cls = 'ok'; msg = `Already locked in: even all F's on the remaining ${rem} credits keeps you at ${target.toFixed(2)} or above.`; }
  else { cls = need > 3.5 ? 'warn' : 'ok'; msg = `You need <strong>${need.toFixed(2)}</strong> on your remaining ${rem} credits, i.e. ${nearestGrade(need)}.`; }
  return `<div class="planner-out ${cls}">${msg}</div>`;
}

function nearestGrade(gpa) {
  const scale = GRADE_SCALE.filter(x => x.value !== null).sort((a, b) => a.value - b.value);
  const exact = scale.find(x => Math.abs(x.value - gpa) < 0.005);
  if (exact) return `a straight ${exact.label}`;
  const hi = scale.find(x => x.value > gpa);
  const lo = [...scale].reverse().find(x => x.value < gpa);
  return `between ${lo.label} and ${hi.label} on average`;
}

function renderPlanner() {
  const { autoRem } = plannerResult();
  return `
    <section class="panel planner">
      <h2 class="panel-title">Target planner</h2>
      <p class="panel-sub">The average you need on the credits left to finish at a target CGPA.</p>
      <div class="field-row">
        <label>Target CGPA <input type="number" class="field-input" min="0" max="4" step="0.01" data-field="target-cgpa" value="${esc(state.target.cgpa)}" /></label>
        <label>Credits remaining <input type="number" class="field-input" min="0" step="0.5" data-field="target-remaining" placeholder="${autoRem}" value="${esc(state.target.remaining)}" /></label>
      </div>
      <p class="field-note">Leave "credits remaining" blank to use the ${autoRem} ungraded credits in your Year 2 tabs.</p>
      <div data-live="planner" role="status">${plannerOutputHTML()}</div>
    </section>
  `;
}

function promotionRules() {
  if (state.y1Shortcut.on) return null;
  const t1 = sectionResult('term1');
  const y1 = year1Result();
  const comp = state.sections.ncl1.courses.find(c => c.name.includes('Comprehensive'));
  return evaluatePromotionRules({
    term1GPA: t1.hasGrades ? t1.gpa : null,
    cgpa: y1.hasGrades ? y1.gpa : null,
    totalCredits: y1.credits,
    compExamGrade: comp && comp.grade !== '—' ? comp.grade : null,
    gradeCounts: countGrades(gradedCoursesIn(YEAR1_IDS)),
  });
}

function year2Total() {
  return YEAR2_IDS.reduce((t, id) => t + sectionResult(id).listedCredits, 0);
}

function diplomaRules() {
  const y1 = year1Result(), y2 = year2Result(), all = combine([y1, y2]);
  return evaluateDiplomaRules({
    y1CGPA: y1.hasGrades ? y1.gpa : null,
    y2CGPA: y2.hasGrades ? y2.gpa : null,
    combinedCGPA: all.hasGrades ? all.gpa : null,
    y2GradeCounts: countGrades(gradedCoursesIn(YEAR2_IDS)),
    y2Credits: y2.credits,
    y2TotalCredits: year2Total(),
  });
}

// Grade-count and exam rules can't be undone by later grades, so a breach is a final FAIL.
// CGPA rules are only final once every credit they cover has a grade.
const FINAL_RULES = new Set(['term1_gpa', 'comp_exam', 'max_f', 'max_d', 'incomplete', 'y2_max_f', 'y2_max_d']);

function verdict() {
  const y1 = year1Result(), y2 = year2Result();
  const y1Listed = YEAR1_IDS.reduce((t, id) => t + sectionResult(id).listedCredits, 0);
  const y1Complete = state.y1Shortcut.on ? y1.hasGrades : y1.credits >= y1Listed;
  const y2Complete = y2.credits >= year2Total();
  const rules = [...(promotionRules() || []), ...diplomaRules()];
  const fails = rules.filter(r => r.status === 'fail');
  const isFinal = r => FINAL_RULES.has(r.id)
    || ((r.id === 'cgpa' || r.id === 'y1') && y1Complete)
    || ((r.id === 'y2' || r.id === 'combined') && y1Complete && y2Complete);
  const finalFails = fails.filter(isFinal);
  const reasons = fails.map(r => `${r.label} (${r.detail})`);

  if (finalFails.length) return { key: 'fail', label: 'Fail', reasons,
    text: 'At least one rule is broken and later grades can’t fix it. Rule 2.4 allows a retest in some cases, so talk to the Programme Office.' };
  if (fails.length) return { key: 'at-risk', label: 'Failing so far', reasons,
    text: 'Based on the grades entered so far, you would not meet the rules below. Grades still to come can change this.' };
  if (y1Complete && y2Complete && (y1.hasGrades || y2.hasGrades)) return { key: 'pass', label: 'Pass', reasons: [],
    text: 'Every credit is graded and you meet all the promotion and diploma rules.' };
  if (y1.hasGrades || y2.hasGrades) return { key: 'provisional', label: 'Passing so far', reasons: [],
    text: `No rule is broken by the grades entered so far. ${y1Complete ? 'Year 1 is complete.' : 'Year 1 still has ungraded credits.'} ${y2Complete ? 'Year 2 is complete.' : 'Year 2 still has ungraded credits.'}` };
  return { key: 'empty', label: 'No grades yet', reasons: [],
    text: 'Enter grades on the term tabs, or switch on Year 1 direct input, to get a verdict.' };
}

function renderVerdict(all) {
  const v = verdict();
  return `
    <section class="hero v-${v.key}" aria-labelledby="verdict-title">
      <div class="hero-verdict">
        <div class="hero-badge" aria-hidden="true">${VERDICT_ICON[v.key]}</div>
        <div>
          <h2 id="verdict-title" class="hero-title"><span class="sr-only">Verdict: </span>${v.label}</h2>
          <p class="hero-text">${v.text}</p>
          ${v.reasons.length ? `<ul class="hero-reasons">${v.reasons.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
          <p class="hero-basis">Checked against Rule 2.10 (promotion) and Rule 2.11 (diploma).</p>
        </div>
      </div>
      <div class="hero-figure">
        <h3 class="hero-figure-title">Combined CGPA</h3>
        <p class="hero-number ${all.hasGrades ? '' : 'is-empty'}">${all.hasGrades ? all.gpa.toFixed(2) : '<span aria-hidden="true">—</span><span class="sr-only">No grades yet</span>'}</p>
        ${creditsProgress(all, 'on-light')}
      </div>
    </section>`;
}

function statusCard(title, subtitle, rules) {
  const st = getOverallStatus(rules);
  const word = st === 'on-track' ? 'All met' : st === 'at-risk' ? 'Not met' : 'In progress';
  return `
    <section class="panel rules-panel status-${st}" aria-label="${title}">
      <div class="rules-head">
        <h2 class="panel-title">${title}</h2>
        <span class="status-pill s-${st}">${word}</span>
      </div>
      <p class="panel-sub">${subtitle}</p>
      ${renderRules(rules)}
    </section>`;
}

function renderPromotion() {
  const rules = promotionRules();
  if (!rules) {
    return `
      <section class="panel rules-panel status-pending" aria-label="Promotion to Year 2">
        <div class="rules-head"><h2 class="panel-title">Promotion to Year 2</h2></div>
        <p class="panel-sub">Needs your Year 1 course grades, so it’s off while Year 1 CGPA is entered directly.</p>
      </section>`;
  }
  return statusCard('Promotion to Year 2', 'Rule 2.10', rules);
}

/** GPA over the courses matching `pick(course, section)` (course-grade mode only). */
function honoursGPA(pick) {
  const courses = [];
  SECTIONS.forEach(sec => {
    const ss = state.sections[sec.id];
    if (ss.directMode || (sec.year === 1 && state.y1Shortcut.on)) return;
    ss.courses.forEach(c => { if (pick(c, sec)) courses.push({ credits: num(c.credits) || 0, grade: c.grade }); });
  });
  const r = calcTermGPA(courses);
  const listed = [];
  SECTIONS.forEach(sec => state.sections[sec.id].courses.forEach(c => { if (pick(c, sec)) listed.push(num(c.credits) || 0); }));
  return { gpa: r.gpa, credits: r.gradedCredits, total: listed.reduce((a, b) => a + b, 0), hasGrades: r.gradedCredits > 0 };
}

const HONOURS = [
  { title: 'Dean’s Honor List', rule: '§2.8 b', sub: 'Core + NCL courses, both years (no focus area or electives)',
    pick: (c, sec) => !c.focusArea && !sec.elective },
  { title: 'Area Top 2', rule: '§2.8 c', sub: '14 Focus Area credits (Term 3 + IM courses in Term 4)',
    pick: c => !!c.focusArea },
  { title: 'NCL honours', rule: '§2.8 d', sub: 'SoS I, ADMAP/Start Up, Abhyudaya, DoCC',
    pick: c => !!c.honoursNcl },
];

function nclHonoursResult() { return honoursGPA(HONOURS[2].pick); }

function renderHonours() {
  return `
    <section class="panel honours">
      <h2 class="panel-title">Honours standing</h2>
      <p class="panel-sub">The GPAs Rule 2.8 uses to rank academic honours. Only courses with grades count.${state.y1Shortcut.on ? ' Year 1 courses are left out while Year 1 CGPA is entered directly.' : ''}</p>
      <div class="honours-grid">
        ${HONOURS.map(h => { const r = honoursGPA(h.pick); return `
          <div class="honour ${r.hasGrades ? '' : 'is-pending'}">
            <h3 class="honour-title">${h.title}<span class="honour-rule">${h.rule}</span></h3>
            <div class="honour-value">${fmt(r.gpa, r.hasGrades)}</div>
            <div class="honour-sub">${h.sub}</div>
            <div class="honour-sub">${r.credits} of ${r.total} credits graded</div>
          </div>`; }).join('')}
      </div>
    </section>`;
}

function renderRules(rules) {
  const word = { pass: 'Met', fail: 'Not met', pending: 'Pending' };
  const mark = { pass: '✓', fail: '✕', pending: '' };
  return `<ul class="rules-list">
    ${rules.map(r => `
      <li class="rule-item rule-${r.status}">
        <span class="rule-mark m-${r.status}" aria-hidden="true">${mark[r.status]}</span>
        <div><div class="rule-label"><span class="sr-only">${word[r.status]}: </span>${r.label}</div><div class="rule-detail">${r.detail}</div></div>
      </li>`).join('')}
  </ul>`;
}

function renderDiploma() {
  return statusCard('Diploma', 'Rule 2.11', diplomaRules());
}

function renderProbation() {
  const low = SECTIONS.filter(sec => !sec.ncl && !(sec.year === 1 && state.y1Shortcut.on))
    .map(sec => ({ sec, r: sectionResult(sec.id) }))
    .filter(x => x.r.hasGrades && x.r.gpa < 2.4);
  if (!low.length) return '';
  return `
    <div class="planner-out bad probation" role="note">
      <strong>Academic probation (Rule 2.6):</strong> term GPA below 2.4 in
      ${low.map(x => `${x.sec.name} (${x.r.gpa.toFixed(2)})`).join(', ')}.
    </div>`;
}

function renderSection(id) {
  const def = byId[id];
  const ss = state.sections[id];
  const r = sectionResult(id);

  const y1Strip = def.year === 1 ? renderYear1Shortcut() : '';
  if (def.year === 1 && state.y1Shortcut.on) {
    return `${y1Strip}
      <div class="term-detail">
        <div class="term-head"><div><h2 class="term-title">${def.name}</h2></div></div>
        <div class="direct-mode-message">
          <h3>Year 1 CGPA is entered directly</h3>
          <p>${def.name} course grades are ignored. Turn off the switch above to use course grades again.</p>
        </div>
      </div>`;
  }

  return `${y1Strip}
    <div class="term-detail" style="--card-color:${def.color}">
      <div class="term-head">
        <div>
          <h2 class="term-title">${def.name}</h2>
          <p class="term-meta"><span data-live="credit-badge">${r.listedCredits} credits</span>, Year ${def.year}${def.weeks ? `, ${def.weeks}-week term` : ''}</p>
        </div>
        <div class="term-gpa">
          <span class="term-gpa-label">${def.name} GPA</span>
          <span class="term-gpa-value" data-live="section-gpa">${fmt(r.gpa, r.hasGrades)}</span>
        </div>
      </div>
      ${def.note ? `<div class="section-note">${def.note}</div>` : ''}

      <div class="input-mode-toggle">
        <label class="inline-toggle">
          <span class="toggle-switch">
            <input type="checkbox" role="switch" ${ss.directMode ? 'checked' : ''} data-action="direct-mode" data-section="${id}" aria-describedby="dm-hint-${id}" />
            <span class="toggle-slider" aria-hidden="true"></span>
          </span>
          <span class="toggle-label">Direct GPA input for ${def.name}</span>
        </label>
        <span class="toggle-hint" id="dm-hint-${id}">Type the term GPA and credits from your grade sheet instead of course grades.</span>
        ${ss.directMode ? `
          <div class="direct-gpa-input-wrapper">
            <label>GPA
              <input type="number" class="direct-gpa-input" min="0" max="4" step="0.01" placeholder="0.00" inputmode="decimal"
                value="${esc(ss.directGPA)}" data-field="direct-gpa" data-section="${id}" /></label>
            <label>Credits
              <input type="number" class="direct-gpa-input" min="0" step="0.5" inputmode="decimal"
                value="${esc(ss.directCredits)}" data-field="direct-credits" data-section="${id}" /></label>
          </div>` : ''}
      </div>

      ${ss.directMode ? `
        <div class="direct-mode-message">
                    <h3>Course grades ignored</h3>
          <p>This term counts as one block: the GPA you typed × the credits you typed.</p>
        </div>` : renderCourseTable(def, ss)}
    </div>
  `;
}

function pointsText(c) {
  const p = gradeToPoints(c.grade);
  const cr = num(c.credits);
  return p !== null && Number.isFinite(cr) ? (p * cr).toFixed(1) : '—';
}

function renderCourseTable(def, ss) {
  const id = def.id;
  const ed = !!def.editable;
  const label = (c, i) => esc(c.name || c.placeholder || `row ${i + 1}`);
  return `
    <div class="course-table-wrapper">
      <table class="course-table">
        <caption class="sr-only">${def.name} courses: choose a grade for each course. GPA updates as you go.</caption>
        <thead>
          <tr>
            <th scope="col" class="col-num">#</th>
            <th scope="col" class="col-name">Course</th>
            ${def.ncl ? '<th scope="col" class="col-category">When</th><th scope="col" class="col-grading">Grading</th>' : ''}
            <th scope="col" class="col-credits">Credits</th>
            <th scope="col" class="col-grade">Grade</th>
            <th scope="col" class="col-points">Points</th>
            ${ed ? '<th scope="col" class="col-del"><span class="sr-only">Remove</span></th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${ss.courses.map((c, i) => { const rowEd = ed && !c.fixed; const graded = gradeToPoints(c.grade) !== null; return `
            <tr class="${graded ? 'is-graded' : ''}">
              <td class="col-num">${i + 1}</td>
              <td class="col-name">
                ${rowEd
      ? `<input type="text" class="cell-input" placeholder="${esc(c.placeholder || 'Course name')}" value="${esc(c.name)}"
           aria-label="Course name, row ${i + 1}" data-field="course-name" data-section="${id}" data-i="${i}" />`
      : `<span class="course-name">${esc(c.name)}</span>`}
                ${c.when ? `<span class="course-meta">${esc(c.when)}${c.code ? ` <span class="course-code">${esc(c.code)}</span>` : ''}</span>` : ''}
              </td>
              ${def.ncl ? `<td class="col-category">${esc(c.category || '')}</td>
              <td class="col-grading">${c.absolute
        ? `<span class="grading-badge absolute">Absolute</span>
           <input type="number" class="cell-input pct-input" min="0" max="100" step="0.01" placeholder="marks %" inputmode="decimal"
             aria-label="Marks percent for ${label(c, i)}, converts to a grade using Table 9"
             value="${esc(c.pct ?? '')}" data-action="pct" data-section="${id}" data-i="${i}" />`
        : `<span class="grading-badge">Letter grade</span>`}</td>` : ''}
              <td class="col-credits">
                ${rowEd
      ? `<input type="number" class="cell-input cell-num" min="0" step="0.5" inputmode="decimal" value="${esc(c.credits)}"
           aria-label="Credits for ${label(c, i)}" data-field="course-credits" data-section="${id}" data-i="${i}" />`
      : c.credits}
              </td>
              <td class="col-grade">
                <select class="grade-select ${graded ? 'has-grade' : ''}" aria-label="Grade for ${label(c, i)}" data-action="grade" data-section="${id}" data-i="${i}">
                  ${GRADE_SCALE.map(g => `<option value="${g.label}" ${c.grade === g.label ? 'selected' : ''}>${g.value === null ? 'Select' : `${g.label} (${g.value.toFixed(1)})`}</option>`).join('')}
                </select>
              </td>
              <td class="col-points" data-live="pts-${id}-${i}">${pointsText(c)}</td>
              ${ed ? `<td class="col-del">${rowEd ? `<button type="button" class="icon-btn" aria-label="Remove ${label(c, i)}" data-action="del-course" data-section="${id}" data-i="${i}"><span aria-hidden="true">✕</span></button>` : ''}</td>` : ''}
            </tr>`; }).join('')}
        </tbody>
      </table>
      ${ed ? `
        <div class="table-actions">
          <button type="button" class="add-btn" data-action="add-course" data-section="${id}">+ Add course</button>
          <button type="button" class="link-btn" data-action="clear-section" data-section="${id}">Clear grades in ${def.name}</button>
        </div>` : `
        <div class="table-actions">
          <span></span>
          <button type="button" class="link-btn" data-action="clear-section" data-section="${id}">Clear grades in ${def.name}</button>
        </div>`}
    </div>
  `;
}

// ─── Live updates while typing (no full re-render, keeps focus) ──
function setLive(key, html) {
  const el = app.querySelector(`[data-live="${key}"]`);
  if (el) el.innerHTML = html;
}

function updateLive(sectionId, rowIndex) {
  setLive('tracker', trackerHTML());
  if (sectionId) {
    const r = sectionResult(sectionId);
    setLive('section-gpa', fmt(r.gpa, r.hasGrades));
    setLive('credit-badge', `${r.listedCredits} credits`);
    if (rowIndex !== undefined) setLive(`pts-${sectionId}-${rowIndex}`, pointsText(state.sections[sectionId].courses[rowIndex]));
  }
  setLive('planner', plannerOutputHTML());
  save();
  announce();
}

// ─── Events (delegated, attached once) ────────────────────────
app.addEventListener('click', e => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { state.activeTab = tabBtn.dataset.tab; render(); return; }

  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  if (btn.dataset.action === 'open-auth') { openAuth('signin'); return; }
  if (btn.dataset.action === 'sign-out') {
    clearTimeout(cloudTimer);
    (account.status === 'saving' ? pushToCloud() : Promise.resolve()).finally(() => cloud.signOut());
    return;
  }
  const id = btn.dataset.section;
  const ss = state.sections[id];
  switch (btn.dataset.action) {
    case 'add-course':
      { const firstFixed = ss.courses.findIndex(c => c.fixed);
        const at = firstFixed === -1 ? ss.courses.length : firstFixed;
        ss.courses.splice(at, 0, { name: '', credits: 2, grade: '—' }); }
      { const ins = ss.courses.findIndex(c => c.fixed); const idx = (ins === -1 ? ss.courses.length : ins) - 1;
        render(`[data-field="course-name"][data-section="${id}"][data-i="${idx}"]`); }
      return;
    case 'del-course': {
      const i = +btn.dataset.i;
      ss.courses.splice(i, 1);
      const nextI = Math.min(i, ss.courses.length - 1);
      render(nextI >= 0 ? `[data-action="grade"][data-section="${id}"][data-i="${nextI}"]` : `[data-action="add-course"][data-section="${id}"]`);
      return;
    }
    case 'clear-section':
      ss.courses.forEach(c => { c.grade = '—'; if (c.absolute) c.pct = ''; });
      render();
      return;
  }
});

app.addEventListener('change', e => {
  const t = e.target;
  const action = t.dataset.action;
  if (!action) return;
  if (action === 'grade') {
    const c = state.sections[t.dataset.section].courses[+t.dataset.i];
    c.grade = t.value;
    if (c.absolute) c.pct = '';   // a hand-picked grade overrides the marks %
    render();
  } else if (action === 'pct') {
    const c = state.sections[t.dataset.section].courses[+t.dataset.i];
    c.pct = t.value;
    const g = absoluteGrade(num(t.value));
    c.grade = t.value === '' ? '—' : (g || c.grade);
    render();
  } else if (action === 'direct-mode') {
    state.sections[t.dataset.section].directMode = t.checked;
    render();
  } else if (action === 'y1-shortcut') {
    state.y1Shortcut.on = t.checked;
    render();
  }
});

app.addEventListener('input', e => {
  const t = e.target;
  const f = t.dataset.field;
  if (!f) return;
  const id = t.dataset.section;
  const i = t.dataset.i !== undefined ? +t.dataset.i : undefined;
  switch (f) {
    case 'course-name': state.sections[id].courses[i].name = t.value; save(); return;
    case 'course-credits': state.sections[id].courses[i].credits = t.value; updateLive(id, i); return;
    case 'direct-gpa': state.sections[id].directGPA = t.value; updateLive(id); return;
    case 'direct-credits': state.sections[id].directCredits = t.value; updateLive(id); return;
    case 'y1-cgpa': state.y1Shortcut.cgpa = t.value; updateLive(); return;
    case 'y1-credits': state.y1Shortcut.credits = t.value; updateLive(); return;
    case 'target-cgpa': state.target.cgpa = t.value; updateLive(); return;
    case 'target-remaining': state.target.remaining = t.value; updateLive(); return;
  }
});

// Summary cards depend on typed values too; refresh them when a summary field loses focus.
app.addEventListener('focusout', e => {
  const f = e.target.dataset && e.target.dataset.field;
  if (state.activeTab === 'summary' && f && /^(y1-|target-)/.test(f)) {
    // If focus is moving to a button/select/switch, its own action re-renders; re-rendering now would swallow the click.
    if (e.relatedTarget && e.relatedTarget.matches('button, select, input[type="checkbox"]')) return;
    render(focusKey(e.relatedTarget));
  }
});

// Arrow keys / Home / End move between tabs (WAI-ARIA tabs pattern).
app.addEventListener('keydown', e => {
  if (!e.target.closest('[data-tablist]') || !e.target.dataset.tab) return;
  const ids = [...app.querySelectorAll('[role="tab"]')].map(b => b.dataset.tab);
  let i = ids.indexOf(e.target.dataset.tab);
  if (e.key === 'ArrowRight') i = (i + 1) % ids.length;
  else if (e.key === 'ArrowLeft') i = (i - 1 + ids.length) % ids.length;
  else if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = ids.length - 1;
  else return;
  e.preventDefault();
  state.activeTab = ids[i];
  render(`[data-tab="${ids[i]}"]`);
  const t = app.querySelector(`[data-tab="${ids[i]}"]`);
  if (t) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
});

// ─── Sign-in dialog (lives outside #app so re-renders don't close it) ──
let authMode = 'signin';
const dlg = document.createElement('dialog');
dlg.className = 'auth-dialog';
dlg.setAttribute('aria-labelledby', 'auth-title');
document.body.appendChild(dlg);

const AUTH_COPY = {
  signin: { title: 'Sign in', sub: 'Your grades are saved to your account, so they follow you to any device.', submit: 'Sign in' },
  signup: { title: 'Create an account', sub: 'Use your email and a password (6+ characters). Your grades are saved to your account.', submit: 'Create account' },
  reset: { title: 'Reset your password', sub: 'We’ll email you a link to set a new password.', submit: 'Send reset link' },
};

function renderAuth(message = '', kind = 'error') {
  const c = AUTH_COPY[authMode];
  dlg.innerHTML = `
    <form class="auth-form" novalidate>
      <button type="button" class="auth-close" data-auth="close" aria-label="Close">✕</button>
      <h2 id="auth-title">${c.title}</h2>
      <p class="auth-sub">${c.sub}</p>
      <label class="auth-field">Email
        <input type="email" name="email" autocomplete="email" required inputmode="email" value="${esc(dlg.dataset.email || '')}" />
      </label>
      ${authMode !== 'reset' ? `
        <label class="auth-field">Password
          <input type="password" name="password" required minlength="6"
            autocomplete="${authMode === 'signup' ? 'new-password' : 'current-password'}" />
        </label>
        <label class="auth-check"><input type="checkbox" data-auth="show" /> Show password</label>` : ''}
      <p class="auth-msg ${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${message}</p>
      <button type="submit" class="auth-submit">${c.submit}</button>
      <div class="auth-links">
        ${authMode === 'signin' ? `
          <button type="button" class="link-btn" data-auth="reset">Forgot password?</button>
          <button type="button" class="link-btn" data-auth="signup">New here? Create an account</button>` : ''}
        ${authMode !== 'signin' ? `<button type="button" class="link-btn" data-auth="signin">Back to sign in</button>` : ''}
      </div>
    </form>`;
}

function openAuth(mode) {
  authMode = mode;
  renderAuth();
  if (!dlg.open) dlg.showModal();
  const first = dlg.querySelector('input[name="email"]');
  if (first) first.focus();
}

dlg.addEventListener('click', e => {
  if (e.target === dlg) { dlg.close(); return; }           // click on backdrop
  const a = e.target.closest('[data-auth]');
  if (!a) return;
  const email = dlg.querySelector('input[name="email"]');
  if (email) dlg.dataset.email = email.value;
  if (a.dataset.auth === 'close') dlg.close();
  else if (a.dataset.auth === 'show') {
    const pw = dlg.querySelector('input[name="password"]');
    if (pw) pw.type = a.checked ? 'text' : 'password';
  } else openAuth(a.dataset.auth);
});

dlg.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password ? form.password.value : '';
  dlg.dataset.email = email;
  const btn = form.querySelector('.auth-submit');
  btn.disabled = true; btn.textContent = 'Please wait…';
  try {
    if (authMode === 'signin') await cloud.signIn(email, password);
    else if (authMode === 'signup') await cloud.signUp(email, password);
    else {
      await cloud.resetPassword(email);
      authMode = 'signin';
      renderAuth('Check your inbox for the reset link, then sign in with your new password.', 'ok');
      return;
    }
    dlg.close();
  } catch (err) {
    renderAuth(authErrorMessage(err));
    const pw = dlg.querySelector('input[name="password"]');
    (pw || dlg.querySelector('input[name="email"]')).focus();
  }
});

dlg.addEventListener('close', () => {
  const opener = app.querySelector('[data-action="open-auth"]') || app.querySelector('[data-action="sign-out"]');
  if (opener) opener.focus();
});

// Push any pending save before the tab is hidden or closed.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && account.status === 'saving') pushToCloud();
});

// ─── Boot ─────────────────────────────────────────────────────
render();
if (cloud.enabled) cloud.watch(onUserChanged).catch(() => { account.status = 'off'; render(); });
