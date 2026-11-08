// ═══════════════════════════════════════════════════════════════
//  Cloud accounts: Firebase Auth (email + password) and Firestore.
//  Each user's grades live in one document: users/{uid}.
//  The Firebase SDK is loaded only when a config is present.
// ═══════════════════════════════════════════════════════════════

import { firebaseConfig, cloudConfigured } from './firebase-config.js';

const FIREBASE_CDN = 'https://www.gstatic.com/firebasejs/11.10.0';
let sdk = null;

async function ready() {
    if (sdk) return sdk;
    // Loaded from Google's Firebase CDN, so the site runs both as a Vite build
    // and straight from the source files (GitHub Pages "deploy from a branch").
    const [{ initializeApp }, auth, fs] = await Promise.all([
        import(/* @vite-ignore */ `${FIREBASE_CDN}/firebase-app.js`),
        import(/* @vite-ignore */ `${FIREBASE_CDN}/firebase-auth.js`),
        import(/* @vite-ignore */ `${FIREBASE_CDN}/firebase-firestore.js`),
    ]);
    const app = initializeApp(firebaseConfig);
    sdk = { auth, fs, a: auth.getAuth(app), db: fs.getFirestore(app) };
    return sdk;
}

const toUser = u => (u ? { uid: u.uid, email: u.email, verified: u.emailVerified } : null);

export const cloud = {
    enabled: cloudConfigured,

    /** Calls `cb(user|null)` now and whenever the signed-in user changes. */
    async watch(cb) {
        const { a, auth } = await ready();
        auth.onAuthStateChanged(a, u => cb(toUser(u)));
    },

    async signIn(email, password) {
        const { a, auth } = await ready();
        await auth.signInWithEmailAndPassword(a, email, password);
    },

    async signUp(email, password) {
        const { a, auth } = await ready();
        const cred = await auth.createUserWithEmailAndPassword(a, email, password);
        try { await auth.sendEmailVerification(cred.user); } catch (_) { /* not critical */ }
    },

    async resetPassword(email) {
        const { a, auth } = await ready();
        await auth.sendPasswordResetEmail(a, email);
    },

    async signOut() {
        const { a, auth } = await ready();
        await auth.signOut(a);
    },

    /** The user's saved state object, or null if they have none yet. */
    async load(uid) {
        const { db, fs } = await ready();
        const snap = await fs.getDoc(fs.doc(db, 'users', uid));
        if (!snap.exists()) return null;
        try { return JSON.parse(snap.data().data); } catch (_) { return null; }
    },

    async save(uid, email, state) {
        const { db, fs } = await ready();
        await fs.setDoc(fs.doc(db, 'users', uid), {
            data: JSON.stringify(state),
            email: email || '',
            updatedAt: fs.serverTimestamp(),
        });
    },
};

/** Friendly text for Firebase error codes. */
export function authErrorMessage(err) {
    const code = (err && err.code) || '';
    // No Firebase code: the SDK itself couldn't load (offline, or blocked by an extension).
    if (!code) return 'Can’t reach the sign-in service. Check your internet connection, or allow gstatic.com if an ad blocker is on.';
    const map = {
        'auth/invalid-email': 'That email address doesn’t look right.',
        'auth/missing-email': 'Enter your email address.',
        'auth/user-not-found': 'Email or password is incorrect.',
        'auth/wrong-password': 'Email or password is incorrect.',
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/invalid-login-credentials': 'Email or password is incorrect.',
        'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
        'auth/weak-password': 'Use a password with at least 6 characters.',
        'auth/missing-password': 'Enter your password.',
        'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
        'auth/network-request-failed': 'Can’t reach the server. Check your internet connection.',
        'auth/operation-not-allowed': 'Email sign-in isn’t switched on for this site yet.',
        'auth/unauthorized-domain': 'This website isn’t on the allowed list for sign-in yet.',
    };
    return map[code] || `Something went wrong${code ? ` (${code})` : ''}. Please try again.`;
}
