# PMP Rapid-Fire

Rapid-fire PMP 2026 study app: 42 themed sets of 20 flashcards, exam-style quizzes graded at the end,
1,630 scenario questions, a missed-questions list, and progress tracking.

- Plain HTML/CSS/JS, no build step. Data: `cards.json` (667 cards), `scenarios.json` (loaded on first use).
- Progress is saved in the browser. With `cloud-config.js` filled in, Google sign-in syncs it to Firestore
  (Firebase project `pmp-rapid-fire`) at `users/{uid}/pmp/state` and `users/{uid}/quizzes/{quizId}`.
- Firestore rules lock every path under `users/{uid}` to that signed-in user.
- After changing `cards.json`, `scenarios.json` or `index.html`, bump `VERSION` in `sw.js` so installed copies update.
