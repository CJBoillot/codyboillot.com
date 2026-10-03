// Firebase web config for cloud saves (public by design; Firestore rules lock each save to its owner).
// Alpha 0.1.4: Battle Pass: MTX has its own Firebase project, battlepass-mtx. Saves live in battlepass_saves/{uid}.
// No Analytics: the game loads only Auth and Firestore (measurementId is left out on purpose).
// Google sign-in only works on domains authorized in that project, so cloud saves switch on at codyboillot.com (and localhost)
// and stay off elsewhere (a downloaded copy, a preview): there the game says where cloud saves work.
window.FIREBASE_CONFIG = /(^|\.)codyboillot\.com$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) ? {
  apiKey: "AIzaSyDIFxWMsoN8Z4ygP_LipbijkyYL5_Z1FQ8",
  authDomain: "battlepass-mtx.firebaseapp.com",
  projectId: "battlepass-mtx",
  storageBucket: "battlepass-mtx.firebasestorage.app",
  messagingSenderId: "556972276364",
  appId: "1:556972276364:web:2ce051f2af19a49c8799a9"
} : null;
