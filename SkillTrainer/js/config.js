/*
 * config.js - the handful of knobs worth keeping in one place.
 */

/*
 * The edit gate.
 *
 * BE CLEAR ABOUT WHAT THIS IS: it keeps casual visitors out of the editor, and
 * that is all. The page is static, the hash below ships in the source, and
 * anyone who opens devtools can flip the flag in localStorage. It is a lock on
 * a screen door, deliberately, because the alternative is a login and a server
 * and this is a demo.
 *
 * Nothing here protects data. The content is public either way; the gate only
 * stops someone idly rewriting the trees in their own browser.
 *
 * To change the password, run this in the browser console and paste the result:
 *
 *   crypto.subtle.digest('SHA-256', new TextEncoder().encode('your-password'))
 *     .then(b => console.log([...new Uint8Array(b)]
 *       .map(x => x.toString(16).padStart(2,'0')).join('')))
 *
 * Current password: skilltree
 */
export const EDIT_PASSWORD_SHA256 =
  "27a61b563507a692e7fda12527397e8f75f3a329d31703fb8ed2de61114603e2";

/*
 * Skill points are switched off for now. The model still carries them, and
 * store.treeProgress still computes them, so flipping this back on restores the
 * SWG-style points readout without any other change.
 */
export const POINTS_ENABLED = false;

/*
 * YouTube is embedded through a click-to-play facade: the page shows the
 * thumbnail YouTube already hosts and only loads the player when someone asks
 * for it. Nothing streams until then, so an unwatched video costs one image.
 */
export const YOUTUBE_FACADE = true;

/* Uploads above this go to IndexedDB regardless; below it they still do, but
   the editor stops warning about size. Roughly "a big screenshot". */
export const UPLOAD_SOFT_LIMIT = 2 * 1024 * 1024;
