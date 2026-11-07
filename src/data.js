// ═══════════════════════════════════════════════════════════════
//  SPJIMR PGDM(BM) 2025-27 — Course & Grading Data (Year 1 + Year 2)
//  Source: General Guidelines PGDM(BM) 2025-2027, §1.2.5 credit structure,
//  §2.7.2 grading system. Year 1 data originally by Saviojiji (MIT).
// ═══════════════════════════════════════════════════════════════

// Table 7 — grade points
export const GRADE_SCALE = [
    { label: '—', value: null },
    { label: 'A+', value: 4.0 },
    { label: 'A', value: 3.5 },
    { label: 'B+', value: 3.0 },
    { label: 'B', value: 2.5 },
    { label: 'C+', value: 2.0 },
    { label: 'C', value: 1.5 },
    { label: 'D', value: 1.0 },
    { label: 'F', value: 0.0 },
];

// Table 9 — absolute grading for Abhyudaya, ADMAP & DoCC
export const ABSOLUTE_GRADE_RANGES = [
    { min: 90, max: 100, grade: 'A+' },
    { min: 83, max: 89.99, grade: 'A' },
    { min: 77, max: 82.99, grade: 'B+' },
    { min: 67, max: 76.99, grade: 'B' },
    { min: 60, max: 66.99, grade: 'C+' },
    { min: 50, max: 59.99, grade: 'C' },
    { min: 40, max: 49.99, grade: 'D' },
    { min: 0, max: 39.99, grade: 'F' },
];

// Section flags:
//   editable — student can add rows; rows without `fixed` can be renamed / re-credited / removed.
//   ncl      — non-classroom learning section.
// Course flags:
//   fixed    — official course from the credit structure: name & credits locked, grade only.
//   honoursNcl — counts toward the NCL academic honour (§2.8 d).
//   absolute — graded on Table 9 absolute marks bands (ADMAP, Abhyudaya, DoCC).
//   Rules 2.10.3 / 2.11.1 count F and D grades from NCL courses too.
export const SECTIONS = [
    // ── Year 1 (54 credits) ───────────────────────────────
    {
        id: 'term1', name: 'Term 1', short: 'T1', year: 1, weeks: 12, color: '#2196F3',
        courses: [
            { name: 'Business Communication I', credits: 1 },
            { name: 'Business Policy and Strategy I', credits: 1 },
            { name: 'Decision Analysis Simulation', credits: 2 },
            { name: 'Financial Accounting & Statement Analysis', credits: 2 },
            { name: 'Managerial Economics I', credits: 2 },
            { name: 'Marketing Management I', credits: 2 },
            { name: 'Operations Management I', credits: 2 },
            { name: 'Organisational Behaviour', credits: 1 },
            { name: 'Quantitative Methods-I', credits: 1 },
            { name: 'Science of Spirituality I', credits: 1, honoursNcl: true },
            { name: 'Wise Innovation Foundation', credits: 1 },
        ],
    },
    {
        id: 'term2', name: 'Term 2', short: 'T2', year: 1, weeks: 12, color: '#4CAF50',
        courses: [
            { name: 'Business Communication II', credits: 2 },
            { name: 'Corporate Finance', credits: 2 },
            { name: 'Data Visualisation for Decision Making', credits: 1 },
            { name: 'Business in Digital Age', credits: 2 },
            { name: 'Managerial Economics II', credits: 3 },
            { name: 'Marketing Management II', credits: 2 },
            { name: 'Operations Management II', credits: 1 },
            { name: 'Organisational Dynamics', credits: 2 },
            { name: 'Quantitative Methods-II', credits: 3 },
        ],
    },
    {
        id: 'term3', name: 'Term 3', short: 'T3', year: 1, weeks: 13, color: '#FF5722',
        courses: [
            { name: 'Business Policy & Strategy II', credits: 2 },
            { name: 'Human Resource Management', credits: 1 },
            { name: 'Decision Science', credits: 2 },
            { name: 'Management Accounting', credits: 2 },
            { name: 'Focus Area course 1', credits: 2 },
            { name: 'Focus Area course 2', credits: 2 },
            { name: 'Focus Area course 3', credits: 2 },
            { name: 'Focus Area course 4', credits: 2 },
        ],
    },
    {
        id: 'ncl1', name: 'NCL (Year 1)', short: 'NCL-1', year: 1, color: '#9C27B0', ncl: true,
        courses: [
            { name: 'Comprehensive Examination', credits: 1, category: 'Year I' },
            { name: 'ADMAP / Start Up', credits: 2, category: 'Term II to IV', absolute: true, honoursNcl: true },
            { name: 'Abhyudaya Mentorship', credits: 2, category: 'Term II to IV', absolute: true, honoursNcl: true },
        ],
    },

    // ── Year 2 (59 credits) ───────────────────────────────
    {
        id: 'term4', name: 'Term 4', short: 'T4', year: 2, weeks: 16, color: '#00897B', editable: true,
        note: 'Focus Area & Strategy courses total 18 credits. Rename the rows to your actual courses and fix credits if any course isn’t 2.',
        courses: [
            ...Array.from({ length: 9 }, (_, i) => ({ name: '', placeholder: `Focus Area / Strategy course ${i + 1}`, credits: 2 })),
            { name: 'Management and Capitalism, Past, Present & Future', credits: 2, fixed: true },
            { name: 'Design Thinking', credits: 2, fixed: true },
        ],
    },
    {
        id: 'term5', name: 'Term 5', short: 'T5', year: 2, weeks: 15, color: '#F9A825',
        note: 'Common electives taken in Term V are counted in Term VI, so enter them on the Term 6 tab.',
        courses: [
            { name: 'Science of Spirituality II', credits: 1 },
            { name: 'International Business', credits: 2 },
            { name: 'Ethical Aspects of Business', credits: 2 },
            { name: 'Legal Aspects of Business', credits: 2 },
            { name: 'Systems Thinking using System Dynamics', credits: 2 },
        ],
    },
    {
        id: 'term6', name: 'Term 6', short: 'T6', year: 2, weeks: 13, color: '#E53935', editable: true,
        note: 'Your allotted common electives (14 credits). Common electives done in Term V count in Term VI. The credit structure lists Term VI as 20 credits, so add rows here if more courses get added. MOOC credits are not counted in CGPA.',
        courses: [
            { name: 'Generative AI for Business', credits: 2, when: 'T5 · Nov–Dec' },
            { name: 'Sales Operations', credits: 2, when: 'T6 · Jan' },
            { name: 'Behavioral Decision Theory', credits: 2, when: 'T6 · Jan' },
            { name: 'Creative Thinking for Innovation', credits: 2, when: 'T6 · Jan' },
            { name: 'Fortunes and Fiascos', credits: 2, when: 'T6 · Mar' },
            { name: 'Investing in Equities', credits: 2, when: 'T6 · Mar' },
            { name: 'International Marketing', credits: 2, when: 'T6 · Mar' },
        ],
    },
    {
        id: 'ncl2', name: 'NCL (Year 2)', short: 'NCL-2', year: 2, color: '#6D4C41', ncl: true,
        courses: [
            { name: 'Corporate Summer Internship', credits: 2, category: 'Year II' },
            { name: 'Development of Corporate Citizenship (incl. SDJ) — DoCC', credits: 4, category: 'Term V', absolute: true, honoursNcl: true },
            { name: 'Applied Research Insights (ARI)', credits: 2, category: 'Term V & VI' },
        ],
    },
];

export const YEAR1_IDS = SECTIONS.filter(s => s.year === 1).map(s => s.id);
export const YEAR2_IDS = SECTIONS.filter(s => s.year === 2).map(s => s.id);

const sumCredits = ids => SECTIONS.filter(s => ids.includes(s.id))
    .reduce((t, s) => t + s.courses.reduce((a, c) => a + c.credits, 0), 0);

export const DEFAULT_YEAR1_CREDITS = sumCredits(YEAR1_IDS); // 54
export const DEFAULT_YEAR2_CREDITS = sumCredits(YEAR2_IDS); // 53 with your 14 elective credits (structure says 59)

/** Table 9: percentage → letter grade for absolute-graded courses. */
export function absoluteGrade(pct) {
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
    const band = ABSOLUTE_GRADE_RANGES.find(r => pct >= r.min);
    return band ? band.grade : 'F';
}
