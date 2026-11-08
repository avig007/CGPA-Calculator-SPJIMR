// ═══════════════════════════════════════════════════════════════
//  Firebase web config — paste yours here to turn on email login.
//
//  Firebase console → Project settings → General → "Your apps" → Web app
//  → copy the values from the `firebaseConfig` snippet.
//
//  These values are NOT secrets: every Firebase web app ships them to the
//  browser. Your data is protected by Firestore security rules
//  (see firestore.rules), which only let each user read/write their own doc.
//
//  Leave apiKey empty and the calculator runs in "this device only" mode.
// ═══════════════════════════════════════════════════════════════

export const firebaseConfig = {
    apiKey: '',                                         // ← paste from Firebase
    authDomain: 'cgpa-calculator-28764.firebaseapp.com',
    projectId: 'cgpa-calculator-28764',
    appId: '',                                          // ← paste from Firebase
};

export const cloudConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
