// Academic rules from the PGDM(BM) 2025-27 General Guidelines.
//   Rule 2.10: promotion to the second year
//   Rule 2.11: award of the diploma
// Each check returns { id, label, status: 'pass' | 'fail' | 'pending', detail }.

const MIN_GPA = 2.4;

const atLeast = (id, label, value, note = '') => ({
    id,
    label,
    status: value == null ? 'pending' : value >= MIN_GPA ? 'pass' : 'fail',
    detail: value == null ? 'No grades yet' : `${value.toFixed(2)}${note}`,
});

/** 2.10.3 a–c and 2.11.1 a–c share one limit: at most 1 F, and 3 Ds (only 1 D once there is an F). */
function gradeLimits(prefix, counts, scope) {
    const dCap = counts.F > 0 ? 1 : 3;
    const none = counts.total === 0;
    return [
        {
            id: `${prefix}max_f`,
            label: `No more than one F${scope}`,
            status: none ? 'pending' : counts.F <= 1 ? 'pass' : 'fail',
            detail: `${counts.F} F so far`,
        },
        {
            id: `${prefix}max_d`,
            label: `No more than ${dCap === 1 ? 'one D' : 'three Ds'}${scope}${counts.F > 0 ? ' (lower limit because there is an F)' : ''}`,
            status: none ? 'pending' : counts.D <= dCap ? 'pass' : 'fail',
            detail: `${counts.D} D so far`,
        },
    ];
}

/** Rule 2.10: { term1GPA, cgpa, totalCredits, compExamGrade, gradeCounts } */
export function evaluatePromotionRules({ term1GPA, cgpa, totalCredits, compExamGrade, gradeCounts }) {
    const checks = [
        atLeast('term1_gpa', 'Term 1 GPA of at least 2.4', term1GPA),
        {
            id: 'comp_exam',
            label: 'Comprehensive Examination cleared (no F)',
            status: compExamGrade == null ? 'pending' : compExamGrade === 'F' ? 'fail' : 'pass',
            detail: compExamGrade ? `Grade ${compExamGrade}` : 'No grade yet',
        },
        atLeast('cgpa', 'Year 1 CGPA of at least 2.4', cgpa, ` over ${totalCredits} credits`),
        ...gradeLimits('', gradeCounts, ''),
    ];
    if (gradeCounts.I > 0) {
        checks.push({
            id: 'incomplete',
            label: 'No Incomplete (I) grades',
            status: 'fail',
            detail: `${gradeCounts.I} Incomplete: not eligible for promotion (2.10.3 d)`,
        });
    }
    return checks;
}

/** Rule 2.11: { y1CGPA, y2CGPA, combinedCGPA, y2GradeCounts, y2Credits, y2TotalCredits } */
export function evaluateDiplomaRules({ y1CGPA, y2CGPA, combinedCGPA, y2GradeCounts, y2Credits, y2TotalCredits }) {
    return [
        atLeast('y1', 'Year 1 CGPA of at least 2.4', y1CGPA),
        atLeast('y2', 'Year 2 CGPA of at least 2.4', y2CGPA, `, ${y2Credits} of ${y2TotalCredits} credits graded`),
        atLeast('combined', 'Combined CGPA of at least 2.4', combinedCGPA),
        ...gradeLimits('y2_', y2GradeCounts, ' in Year 2'),
        {
            id: 'y2_credits',
            label: 'Every Year 2 credit graded',
            status: y2Credits >= y2TotalCredits ? 'pass' : 'pending',
            detail: `${y2Credits} of ${y2TotalCredits} credits`,
        },
    ];
}

/** 'at-risk' if any check fails, 'pending' if any is open, otherwise 'on-track'. */
export function getOverallStatus(checks) {
    if (checks.some(c => c.status === 'fail')) return 'at-risk';
    if (checks.some(c => c.status === 'pending')) return 'pending';
    return 'on-track';
}
