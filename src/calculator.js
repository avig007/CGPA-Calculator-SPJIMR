// GPA maths for the PGDM(BM) grading system (General Guidelines §2.7.2, Table 7).

import { GRADE_SCALE } from './data.js';

const POINTS = new Map(GRADE_SCALE.filter(g => g.value !== null).map(g => [g.label, g.value]));

/** Grade points for a letter grade, or null when there is no grade yet. */
export const gradeToPoints = grade => (POINTS.has(grade) ? POINTS.get(grade) : null);

/**
 * Credit-weighted GPA over the graded rows of `rows` ([{ credits, grade }]).
 * Ungraded rows are ignored.
 */
export function calcTermGPA(rows) {
    const graded = rows
        .map(r => ({ credits: Number(r.credits) || 0, points: gradeToPoints(r.grade) }))
        .filter(r => r.points !== null);
    const gradedCredits = graded.reduce((sum, r) => sum + r.credits, 0);
    const weighted = graded.reduce((sum, r) => sum + r.points * r.credits, 0);
    return { gpa: gradedCredits ? weighted / gradedCredits : 0, gradedCredits };
}

/** Average GPA needed on `remaining` credits to finish exactly at `target`. */
export function requiredGPA(points, credits, remaining, target) {
    return remaining > 0 ? (target * (credits + remaining) - points) / remaining : null;
}

/** How many graded rows, Fs, Ds and Incompletes are in `rows`. */
export function countGrades(rows) {
    const tally = { total: 0, F: 0, D: 0, I: 0 };
    rows.forEach(({ grade }) => {
        if (!grade || grade === '—') return;
        tally.total += 1;
        if (grade in tally) tally[grade] += 1;
    });
    return tally;
}
