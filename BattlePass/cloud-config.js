// Firebase web config for cloud saves (public by design; Firestore rules lock each save to its owner).
// Alpha 0.1.4: shares Click to Conquer's Firebase project, in its own collection (battlepass_saves/{uid}); it never touches users/{uid}.
// Google sign-in only works on domains authorized in that project, so cloud saves switch on at codyboillot.com (and localhost)
// and stay off elsewhere (a downloaded copy, a preview): there the game says where cloud saves work.
window.FIREBASE_CONFIG = /(^|\.)codyboillot\.com$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) ? {
  apiKey: "AIzaSyAOJUp77Nc1q4wOGnUfPS6fJc5scTepFcg",
  authDomain: "click-to-conquer.firebaseapp.com",
  projectId: "click-to-conquer",
  storageBucket: "click-to-conquer.firebasestorage.app",
  messagingSenderId: "1010870501167",
  appId: "1:1010870501167:web:b45e0d42eb01e31b542bda"
} : null;
