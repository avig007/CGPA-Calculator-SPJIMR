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
//  Leave apiKey empty (or build with VITE_DEVICE_ONLY=1) and the tracker
//  runs in "this device only" mode with no sign-in.
// ═══════════════════════════════════════════════════════════════

export const firebaseConfig = {
    apiKey: 'AIzaSyCqDboqsrV__r3QtmpIZm7DoJV8V1KE-kk',
    authDomain: 'cgpa-calculator-28764.firebaseapp.com',
    projectId: 'cgpa-calculator-28764',
    appId: '1:23668626111:web:914b26f9eb73fcee076c0a',
};

export const cloudConfigured = !import.meta.env.VITE_DEVICE_ONLY && Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
