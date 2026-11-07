// ═══════════════════════════════════════════════════════════════
//  SPJIMR Academic Tracker — Year 1 + Year 2
//  Based on Saviojiji's Year 1 calculator (MIT licence).
// ═══════════════════════════════════════════════════════════════

import { SECTIONS, YEAR1_IDS, YEAR2_IDS, GRADE_SCALE, DEFAULT_YEAR1_CREDITS, DEFAULT_YEAR2_CREDITS, absoluteGrade } from './data.js';
import { calcTermGPA, countGrades, requiredGPA, gradeToPoints } from './calculator.js';
import { evaluatePromotionRules, evaluateDiplomaRules, getOverallStatus } from './rules.js';

const STORAGE_KEY = 'spjimr-bm-cgpa-y1y2-v3';
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

function loadState() {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    Object.assign(base.y1Shortcut, saved.y1Shortcut || {});
    Object.assign(base.target, saved.target || {});
    for (const id of Object.keys(base.sections)) {
      const s = saved.sections && saved.sections[id];
      if (!s) continue;
      const def = byId[id];
      const merged = { ...base.sections[id], ...s };
      // Fixed Year 1 course lists always come from data.js; only grades are restored.
      if (!def.editable) {
        merged.courses = base.sections[id].courses.map((c, i) => ({
          ...c, grade: (s.courses && s.courses[i] && s.courses[i].grade) || '—',
          pct: (s.courses && s.courses[i] && s.courses[i].pct) || '',
        }));
      }
      base.sections[id] = merged;
    }
    if (saved.activeTab && (saved.activeTab === 'summary' || byId[saved.activeTab])) {
      base.activeTab = saved.activeTab;
    }
  } catch (_) { /* storage unavailable or corrupt — start fresh */ }
  return base;
}

let state = loadState();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
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

function render() {
  const overall = overallResult();
  const tab = state.activeTab;
  app.innerHTML = `
    ${renderHeader(overall)}
    <main class="main-content">
      ${renderTabs()}
      <div class="tab-content">
        ${tab === 'summary' ? renderSummary() : renderSection(tab)}
      </div>
    </main>
    <footer class="footer">
      <span>SPJIMR PGDM(BM) 2025-27 • Academic Tracker (Year 1 + Year 2) • Your grades stay in this browser</span>
      <a href="https://github.com/Saviojiji/CGPA-CALCULATOR-YEAR-1-SPJIMR" target="_blank" rel="noopener" class="footer-star-link">Year 1 calculator by Savio Jiji ⭐</a>
    </footer>
  `;
  save();
}

function renderHeader(overall) {
  return `
    <header class="header">
      <div class="header-inner">
        <div class="header-brand">
          <div class="header-logo">
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="8" fill="rgba(255,255,255,0.15)"/>
              <path d="M10 18c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M18 14v4l3 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <span class="header-title">Academic </span><span class="header-title-bold">Tracker</span>
            <span class="header-year-pill">Year 1 + 2</span>
          </div>
        </div>
        <div class="header-cgpa">
          <div class="header-cgpa-label">COMBINED CGPA</div>
          <div class="header-cgpa-value" data-live="header-cgpa">${overall.gpa.toFixed(2)}</div>
        </div>
      </div>
    </header>
  `;
}

function renderTabs() {
  const btn = (id, label) => `
    <button class="tab-btn ${state.activeTab === id ? 'active' : ''}" data-tab="${id}" role="tab"
      aria-selected="${state.activeTab === id}">${label}</button>`;
  const y1 = SECTIONS.filter(s => s.year === 1);
  const y2 = SECTIONS.filter(s => s.year === 2);
  const short = s => s.ncl ? 'NCL' : s.name;
  return `
    <nav class="tabs" role="tablist">
      ${btn('summary', 'Summary')}
      <span class="tab-group-label">Y1</span>
      ${y1.map(s => btn(s.id, short(s))).join('')}
      <span class="tab-group-label">Y2</span>
      ${y2.map(s => btn(s.id, short(s))).join('')}
    </nav>
  `;
}

function renderGPACard(title, r, color, sub) {
  return `
    <div class="gpa-card" style="--card-color: ${color}">
      <div class="gpa-card-top-bar"></div>
      <div class="gpa-card-content">
        <div class="gpa-card-title">${title}</div>
        <div class="gpa-card-value ${r.hasGrades ? '' : 'gpa-pending'}">${fmt(r.gpa, r.hasGrades)}</div>
        <div class="gpa-card-credits">${sub ?? `${r.credits} graded credits`}</div>
      </div>
    </div>
  `;
}

function renderSummary() {
  const y1 = year1Result();
  const y2 = year2Result();
  const all = combine([y1, y2]);
  const ncl = nclHonoursResult();

  return `
    ${renderYear1Shortcut()}
    <div class="summary-grid">
      ${renderGPACard('COMBINED CGPA (Y1 + Y2)', all, '#1a3a5c', `${all.credits} of ${DEFAULT_YEAR1_CREDITS + DEFAULT_YEAR2_CREDITS} credits graded`)}
      ${renderGPACard('YEAR 1 CGPA', y1, '#2196F3', state.y1Shortcut.on ? `${y1.credits} credits (entered directly)` : `${y1.credits} of ${DEFAULT_YEAR1_CREDITS} credits graded`)}
      ${renderGPACard('YEAR 2 CGPA', y2, '#00897B', `${y2.credits} of ${DEFAULT_YEAR2_CREDITS} credits graded`)}
      <div class="gpa-card" style="--card-color: #9C27B0">
        <div class="gpa-card-top-bar"></div>
        <div class="gpa-card-content">
          <div class="gpa-card-title">NCL HONOURS GPA</div>
          <div class="gpa-card-value ${ncl.hasGrades ? '' : 'gpa-pending'}">${fmt(ncl.gpa, ncl.hasGrades)}</div>
          <div class="gpa-card-credits">SoS I, ADMAP, Abhyudaya, DoCC (§2.8 d)</div>
        </div>
      </div>
    </div>

    ${renderProgression()}

    <div class="summary-bottom">
      <div class="side-cards">
        ${renderPlanner()}
      </div>
      <div class="side-cards">
        ${renderProbation()}
        ${renderPromotion()}
        ${renderDiploma()}
      </div>
    </div>
  `;
}

function cumulativeSteps(ids) {
  let acc = [];
  return ids.map(id => {
    const term = sectionResult(id);
    acc = [...acc, term];
    return { label: `+ ${byId[id].short}`, term, r: combine(acc) };
  });
}

function renderTrack(title, sub, steps, color) {
  return `
    <div class="track" style="--card-color:${color}">
      <div class="track-head"><strong>${title}</strong><span>${sub}</span></div>
      <div class="progress-strip">
        ${steps.map(s => `
          <div class="progress-step ${s.term && !s.term.hasGrades ? 'is-pending' : ''} ${s.total ? 'is-total' : ''}">
            <div class="progress-label">${s.label}</div>
            <div class="progress-value">${fmt(s.r.gpa, s.r.hasGrades)}</div>
            <div class="progress-term">${s.note ?? (s.term ? (s.term.hasGrades ? `term ${s.term.gpa.toFixed(2)}` : 'no grades') : '')}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderProgression() {
  const y1 = year1Result(), y2 = year2Result();
  const y1Steps = state.y1Shortcut.on
    ? [{ label: 'Year 1', r: y1, note: 'entered directly', total: true }]
    : [...cumulativeSteps(YEAR1_IDS), { label: 'Year 1', r: y1, note: `${y1.credits} cr`, total: true }];
  const y2Steps = [...cumulativeSteps(YEAR2_IDS), { label: 'Year 2', r: y2, note: `${y2.credits} cr`, total: true }];
  let acc = [y1];
  const progSteps = [{ label: 'Year 1', r: y1, note: `${y1.credits} cr` }, ...YEAR2_IDS.map(id => {
    const term = sectionResult(id);
    acc = [...acc, term];
    return { label: `+ ${byId[id].short}`, term, r: combine(acc) };
  }), { label: 'Combined', r: combine([y1, y2]), note: `${y1.credits + y2.credits} cr`, total: true }];

  return `
    <div class="progress-card">
      <div class="progress-head">
        <h3>Cumulative CGPA</h3>
        <p>Each box is the CGPA up to and including that term, weighted by credits. The small number is that term alone.</p>
      </div>
      ${renderTrack('Year 1', `${DEFAULT_YEAR1_CREDITS} credits`, y1Steps, '#2196F3')}
      ${renderTrack('Year 2', `${DEFAULT_YEAR2_CREDITS} credits`, y2Steps, '#00897B')}
      ${renderTrack('Both years', `${DEFAULT_YEAR1_CREDITS + DEFAULT_YEAR2_CREDITS} credits (MOOC excluded)`, progSteps, '#1a3a5c')}
    </div>
  `;
}

function renderYear1Shortcut() {
  const sc = state.y1Shortcut;
  return `
    <div class="y1-direct ${sc.on ? 'is-on' : ''}">
      <label class="inline-toggle">
        <span class="toggle-switch">
          <input type="checkbox" data-action="y1-shortcut" ${sc.on ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </span>
        <span><strong>Enter Year 1 CGPA directly</strong>
          <span class="y1-direct-hint">${sc.on ? 'Year 1 course grades are ignored while this is on.' : 'Skip the Year 1 tabs and type the CGPA from your Year 1 grade sheet.'}</span></span>
      </label>
      ${sc.on ? `
        <div class="field-row y1-direct-fields">
          <label>Year 1 CGPA <input type="number" class="field-input" min="0" max="4" step="0.01" placeholder="e.g. 3.12" data-field="y1-cgpa" value="${esc(sc.cgpa)}" /></label>
          <label>Year 1 credits <input type="number" class="field-input" min="0" step="0.5" data-field="y1-credits" value="${esc(sc.credits)}" /></label>
          <span class="info-note">${DEFAULT_YEAR1_CREDITS} credits = 16 + 18 + 15 + 5 NCL</span>
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
    <div class="info-card" style="--card-color:#00897B">
      <h3>🎯 Target planner</h3>
      <p class="info-sub">What do you need from here to finish at a given CGPA?</p>
      <div class="field-row">
        <label>Target CGPA <input type="number" class="field-input" min="0" max="4" step="0.01" data-field="target-cgpa" value="${esc(state.target.cgpa)}" /></label>
        <label>Credits remaining <input type="number" class="field-input" min="0" step="0.5" data-field="target-remaining" placeholder="${autoRem}" value="${esc(state.target.remaining)}" /></label>
      </div>
      <p class="info-note">Leave "credits remaining" blank to use the ${autoRem} ungraded credits in your Year 2 tabs.</p>
      <div data-live="planner">${plannerOutputHTML()}</div>
    </div>
  `;
}

function renderPromotion() {
  if (state.y1Shortcut.on) {
    return `
      <div class="promotion-card status-pending">
        <div class="promotion-header">
          <div class="promotion-icon">ℹ️</div>
          <div>
            <h3 class="promotion-title">Year 1 promotion check</h3>
            <p class="promotion-subtitle">Not available while Year 1 CGPA is entered directly. It needs course grades.</p>
          </div>
        </div>
      </div>`;
  }
  const t1 = sectionResult('term1');
  const y1 = year1Result();
  const comp = state.sections.ncl1.courses.find(c => c.name.includes('Comprehensive'));
  const rules = evaluatePromotionRules({
    term1GPA: t1.hasGrades ? t1.gpa : null,
    cgpa: y1.hasGrades ? y1.gpa : null,
    totalCredits: y1.credits,
    compExamGrade: comp && comp.grade !== '—' ? comp.grade : null,
    gradeCounts: countGrades(gradedCoursesIn(YEAR1_IDS)),
  });
  const st = getOverallStatus(rules);
  return `
    <div class="promotion-card status-${st}">
      <div class="promotion-header">
        <div class="promotion-icon">${st === 'on-track' ? '✅' : st === 'at-risk' ? '⚠️' : '⏳'}</div>
        <div>
          <h3 class="promotion-title">Year 1 promotion check</h3>
          <p class="promotion-subtitle">Rule 2.10: promotion to second year</p>
        </div>
      </div>
      ${renderRules(rules)}
    </div>`;
}

function nclHonoursResult() {
  const courses = [];
  SECTIONS.forEach(sec => {
    const ss = state.sections[sec.id];
    if (ss.directMode || (sec.year === 1 && state.y1Shortcut.on)) return;
    ss.courses.forEach(c => { if (c.honoursNcl) courses.push({ credits: num(c.credits) || 0, grade: c.grade }); });
  });
  const r = calcTermGPA(courses);
  return { gpa: r.gpa, credits: r.gradedCredits, hasGrades: r.gradedCredits > 0 };
}

function renderRules(rules) {
  return `<div class="rules-list">
    ${rules.map(r => `
      <div class="rule-item rule-${r.status}">
        <span class="rule-icon">${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏳'}</span>
        <div><div class="rule-label">${r.label}</div><div class="rule-detail">${r.detail}</div></div>
      </div>`).join('')}
  </div>`;
}

function renderDiploma() {
  const y1 = year1Result(), y2 = year2Result(), all = combine([y1, y2]);
  const y2Total = YEAR2_IDS.reduce((t, id) => t + sectionResult(id).listedCredits, 0);
  const rules = evaluateDiplomaRules({
    y1CGPA: y1.hasGrades ? y1.gpa : null,
    y2CGPA: y2.hasGrades ? y2.gpa : null,
    combinedCGPA: all.hasGrades ? all.gpa : null,
    y2GradeCounts: countGrades(gradedCoursesIn(YEAR2_IDS)),
    y2Credits: y2.credits,
    y2TotalCredits: y2Total,
  });
  const st = getOverallStatus(rules);
  return `
    <div class="promotion-card status-${st}">
      <div class="promotion-header">
        <div class="promotion-icon">${st === 'on-track' ? '🎓' : st === 'at-risk' ? '⚠️' : '⏳'}</div>
        <div>
          <h3 class="promotion-title">Diploma eligibility</h3>
          <p class="promotion-subtitle">Rule 2.11: award of diploma</p>
        </div>
      </div>
      ${renderRules(rules)}
    </div>`;
}

function renderProbation() {
  const low = SECTIONS.filter(sec => !sec.ncl && !(sec.year === 1 && state.y1Shortcut.on))
    .map(sec => ({ sec, r: sectionResult(sec.id) }))
    .filter(x => x.r.hasGrades && x.r.gpa < 2.4);
  if (!low.length) return '';
  return `
    <div class="planner-out bad probation">
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
        <div class="term-detail-header"><div><h2 class="term-detail-title">${def.name}</h2></div></div>
        <div class="direct-mode-message">
          <div class="direct-mode-icon">📋</div>
          <h3>Year 1 CGPA is entered directly</h3>
          <p>${def.name} course grades are ignored. Turn off the switch above to use course grades again.</p>
        </div>
      </div>`;
  }

  return `${y1Strip}
    <div class="term-detail" style="--card-color:${def.color}">
      <div class="term-detail-header">
        <div>
          <h2 class="term-detail-title">${def.name}</h2>
          <span class="credit-badge" data-live="credit-badge">${r.listedCredits} Credits</span>
          ${def.weeks ? `<span class="term-detail-subtitle">• ${def.weeks}-week term</span>` : ''}
        </div>
        <div class="gpa-display-box" data-live="section-gpa">GPA: ${fmt(r.gpa, r.hasGrades)}</div>
      </div>
      ${def.note ? `<div class="section-note">${def.note}</div>` : ''}

      <div class="input-mode-toggle">
        <label class="toggle-switch">
          <input type="checkbox" ${ss.directMode ? 'checked' : ''} data-action="direct-mode" data-section="${id}" />
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label">Direct GPA input <span class="toggle-hint">(type the term GPA from your grade sheet)</span></span>
        ${ss.directMode ? `
          <div class="direct-gpa-input-wrapper">
            <label>GPA</label>
            <input type="number" class="direct-gpa-input" min="0" max="4" step="0.01" placeholder="0.00"
              value="${esc(ss.directGPA)}" data-field="direct-gpa" data-section="${id}" />
            <label>Credits</label>
            <input type="number" class="direct-gpa-input" min="0" step="0.5"
              value="${esc(ss.directCredits)}" data-field="direct-credits" data-section="${id}" />
          </div>` : ''}
      </div>

      ${ss.directMode ? `
        <div class="direct-mode-message">
          <div class="direct-mode-icon">📋</div>
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
  return `
    <div class="course-table-wrapper">
      <table class="course-table">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-name">Course Name</th>
            ${def.ncl ? '<th class="col-category">When</th><th class="col-grading">Grading</th>' : ''}
            <th class="col-credits">Credits</th>
            <th class="col-grade">Grade</th>
            <th class="col-points">Points</th>
            ${ed ? '<th class="col-del"></th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${ss.courses.map((c, i) => { const rowEd = ed && !c.fixed; return `
            <tr class="${c.optional ? 'optional-course-row' : ''}">
              <td class="col-num">${i + 1}</td>
              <td class="col-name">
                ${rowEd
      ? `<input type="text" class="cell-input" placeholder="${esc(c.placeholder || 'Course name')}" value="${esc(c.name)}" data-field="course-name" data-section="${id}" data-i="${i}" />`
      : `${esc(c.name)}${c.optional ? ' <span class="optional-badge">Optional</span>' : ''}`}
                ${c.when ? `<span class="when-badge">${esc(c.when)}</span>` : ''}
              </td>
              ${def.ncl ? `<td class="col-category">${esc(c.category || '')}</td>
              <td class="col-grading">${c.absolute
        ? `<span class="grading-badge absolute">Absolute</span>
           <label class="pct-wrap" title="Your marks % — converted with Table 9">
             <input type="number" class="cell-input pct-input" min="0" max="100" step="0.01" placeholder="marks %"
               value="${esc(c.pct ?? '')}" data-action="pct" data-section="${id}" data-i="${i}" /></label>`
        : `<span class="grading-badge">Letter grade</span>`}</td>` : ''}
              <td class="col-credits">
                ${rowEd
      ? `<input type="number" class="cell-input cell-num" min="0" step="0.5" value="${esc(c.credits)}" data-field="course-credits" data-section="${id}" data-i="${i}" />`
      : c.credits}
              </td>
              <td class="col-grade">
                <select class="grade-select" data-action="grade" data-section="${id}" data-i="${i}">
                  ${GRADE_SCALE.map(g => `<option value="${g.label}" ${c.grade === g.label ? 'selected' : ''}>${g.label}</option>`).join('')}
                </select>
              </td>
              <td class="col-points" data-live="pts-${id}-${i}">${pointsText(c)}</td>
              ${ed ? `<td class="col-del">${rowEd ? `<button class="icon-btn" title="Remove course" aria-label="Remove course" data-action="del-course" data-section="${id}" data-i="${i}">✕</button>` : ''}</td>` : ''}
            </tr>`; }).join('')}
        </tbody>
      </table>
      ${ed ? `
        <div class="table-actions">
          <button class="add-btn" data-action="add-course" data-section="${id}">+ Add course</button>
          <button class="link-btn" data-action="clear-section" data-section="${id}">Clear grades in ${def.name}</button>
        </div>` : ''}
    </div>
  `;
}

// ─── Live updates while typing (no full re-render, keeps focus) ──
function setLive(key, html) {
  const el = app.querySelector(`[data-live="${key}"]`);
  if (el) el.innerHTML = html;
}

function updateLive(sectionId, rowIndex) {
  setLive('header-cgpa', overallResult().gpa.toFixed(2));
  if (sectionId) {
    const r = sectionResult(sectionId);
    setLive('section-gpa', `GPA: ${fmt(r.gpa, r.hasGrades)}`);
    setLive('credit-badge', `${r.listedCredits} Credits`);
    if (rowIndex !== undefined) setLive(`pts-${sectionId}-${rowIndex}`, pointsText(state.sections[sectionId].courses[rowIndex]));
  }
  setLive('planner', plannerOutputHTML());
  save();
}

// ─── Events (delegated, attached once) ────────────────────────
app.addEventListener('click', e => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { state.activeTab = tabBtn.dataset.tab; render(); return; }

  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.section;
  const ss = state.sections[id];
  switch (btn.dataset.action) {
    case 'add-course':
      { const firstFixed = ss.courses.findIndex(c => c.fixed);
        const at = firstFixed === -1 ? ss.courses.length : firstFixed;
        ss.courses.splice(at, 0, { name: '', credits: 2, grade: '—' }); }
      render();
      { const ins = ss.courses.findIndex(c => c.fixed); const idx = (ins === -1 ? ss.courses.length : ins) - 1;
        const el = app.querySelector(`[data-field="course-name"][data-section="${id}"][data-i="${idx}"]`); if (el) el.focus(); }
      return;
    case 'del-course':
      ss.courses.splice(+btn.dataset.i, 1);
      render();
      return;
    case 'clear-section':
      ss.courses.forEach(c => { c.grade = '—'; });
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
    const next = e.relatedTarget && e.relatedTarget.dataset && e.relatedTarget.dataset.field;
    render();
    if (next) { const el = app.querySelector(`[data-field="${next}"]`); if (el) el.focus(); }
  }
});

// ─── Boot ─────────────────────────────────────────────────────
render();
