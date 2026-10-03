// Firebase web config for cloud saves (public by design; Firestore rules protect each player's save).
// Left empty on purpose: until a config is set, Settings shows "Cloud saves — coming soon" and nothing loads.
// To enable, either:
//   • reuse the Click to Conquer project (paste its config here) and add a rule for the
//     `battlepass_saves` collection (see README → Cloud saves). Saves never touch `users/{uid}`; or
//   • create a separate Firebase project and paste that config.
window.FIREBASE_CONFIG = null;
