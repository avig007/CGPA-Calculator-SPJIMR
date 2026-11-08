// Test double for src/cloud.js — same API, backed by localStorage.
// Used only when building with MOCK_CLOUD=1 (see vite.config.js).
const USERS = 'mock-cloud-users', DOCS = 'mock-cloud-docs', SESSION = 'mock-cloud-session';
const read = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (_) { return {}; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const fail = code => { const e = new Error(code); e.code = code; throw e; };
let listener = null;
const current = () => { const s = localStorage.getItem(SESSION); const u = read(USERS)[s]; return u ? { uid: u.uid, email: s, verified: false } : null; };
const delay = () => new Promise(r => setTimeout(r, 150));

export const cloud = {
    enabled: true,
    async watch(cb) { listener = cb; await delay(); cb(current()); },
    async signIn(email, pw) {
        await delay(); const u = read(USERS)[email];
        if (!/^\S+@\S+\.\S+$/.test(email)) fail('auth/invalid-email');
        if (!u || u.pw !== pw) fail('auth/invalid-credential');
        localStorage.setItem(SESSION, email); listener && listener(current());
    },
    async signUp(email, pw) {
        await delay(); const users = read(USERS);
        if (!/^\S+@\S+\.\S+$/.test(email)) fail('auth/invalid-email');
        if (users[email]) fail('auth/email-already-in-use');
        if (!pw || pw.length < 6) fail('auth/weak-password');
        users[email] = { uid: 'u' + Object.keys(users).length + Date.now(), pw }; write(USERS, users);
        localStorage.setItem(SESSION, email); listener && listener(current());
    },
    async resetPassword(email) { await delay(); if (!/^\S+@\S+\.\S+$/.test(email)) fail('auth/invalid-email'); },
    async signOut() { await delay(); localStorage.removeItem(SESSION); listener && listener(null); },
    async load(uid) { await delay(); const d = read(DOCS)[uid]; return d ? JSON.parse(d.data) : null; },
    async save(uid, email, state) { await delay(); const docs = read(DOCS); docs[uid] = { data: JSON.stringify(state), email }; write(DOCS, docs); },
};
export { authErrorMessage } from '../src/cloud.js';
