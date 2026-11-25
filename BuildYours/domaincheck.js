/* Domain availability check for Build Your Profile Site.
   Asks Verisign's public RDAP service (the .com and .net registry) whether a name is
   registered: 200 = taken, 404 = not registered. Free, no key, no server.
   Only the domain name is sent, and only when the reader clicks Check. */
(function () {
  "use strict";
  var TLDS = { com: 1, net: 1 };

  function clean(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
  /* "Sam J. Lee" -> samlee.com, sam-lee.com, samjlee.com, leesam.com, samlee.net */
  function suggest(name) {
    var w = clean(name).split(/[^a-z0-9]+/).filter(Boolean);
    if (!w.length) return [];
    var out = [], add = function (label, tld) {
      label = label.replace(/^-+|-+$/g, "");
      if (label && label.length <= 63 && out.indexOf(label + "." + tld) < 0) out.push(label + "." + tld);
    };
    if (w.length === 1) { add(w[0], "com"); add(w[0], "net"); return out; }
    var f = w[0], l = w[w.length - 1];
    add(f + l, "com"); add(f + "-" + l, "com");
    if (w.length > 2) add(f + w[1].charAt(0) + l, "com");
    add(l + f, "com"); add(f + l, "net");
    return out.slice(0, 5);
  }
  /* Accepts "samlee", "samlee.com" or "https://www.samlee.com/"; returns "samlee.com" or "" */
  function normalize(input) {
    var d = clean(input).trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
    if (!d) return "";
    if (d.indexOf(".") < 0) d += ".com";
    var parts = d.split(".");
    if (parts.length !== 2 || !TLDS[parts[1]] || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(parts[0])) return "";
    return d;
  }
  /* Resolves to "taken", "free" or "unknown" */
  function check(domain) {
    var tld = domain.split(".").pop();
    var url = "https://rdap.verisign.com/" + tld + "/v1/domain/" + encodeURIComponent(domain);
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : null;
    return fetch(url, ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { return r.status === 200 ? "taken" : r.status === 404 ? "free" : "unknown"; })
      .catch(function () { return "unknown"; })
      .then(function (v) { if (timer) clearTimeout(timer); return v; });
  }
  var R53 = "https://console.aws.amazon.com/route53/domains/home";
  function badge(domain, state) {
    if (state === "free") return "<span class='dc-b dc-free'>Looks available</span> <a href='" + R53 + "' target='_blank' rel='noopener'>Register at Route 53</a>";
    if (state === "taken") return "<span class='dc-b dc-taken'>Taken</span>";
    if (state === "checking") return "<span class='dc-b dc-wait'>Checking…</span>";
    return "<span class='dc-b dc-wait'>Couldn't check</span> <a href='" + R53 + "' target='_blank' rel='noopener'>Try Route 53's search</a>";
  }
  window.DomainCheck = { suggest: suggest, normalize: normalize, check: check, badge: badge };
})();
