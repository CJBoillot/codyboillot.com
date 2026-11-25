/* Desktop / Mobile view switch for the Leadership sub pages.
   On a computer, Mobile shows this same page inside a phone-width frame, so its own
   small-screen layout applies. Phones never see the switch. Does nothing when framed. */
(function () {
  if (window.top !== window) { document.documentElement.classList.add("vm-framed"); return; }
  var css = ""
    + ".vm-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;width:min(100% - 2.5rem,1240px);margin:12px auto 0;font:500 14px/1.3 Inter,system-ui,sans-serif}"
    + ".vm-bar a{color:#9aa6bd;text-decoration:none}.vm-bar a:hover{color:#eef2f9}"
    + ".vm-sw{display:flex;align-items:center;gap:8px;color:#9aa6bd;font-size:13px}"
    + ".vm-seg{display:flex;background:#1a2336;border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:3px}"
    + ".vm-seg button{font:600 13px Inter,system-ui,sans-serif;color:#9aa6bd;background:none;border:0;border-radius:7px;padding:6px 12px;cursor:pointer}"
    + ".vm-seg button[aria-pressed=true]{background:#12897b;color:#fff}"
    + ".vm-stage{display:none;justify-content:center;padding:16px 0 28px}"
    + ".vm-stage iframe{width:390px;max-width:100%;height:calc(100vh - 150px);min-height:560px;border:8px solid #1a2336;border-radius:30px;background:#0b0f17;box-shadow:0 20px 60px -20px rgba(0,0,0,.7)}"
    + "body.vm-mobile{display:block!important;min-height:0!important}"
    + "body.vm-mobile>*:not(.vm-bar):not(.vm-stage):not(header):not(script):not(style){display:none!important}"
    + "body.vm-mobile .vm-stage{display:flex}"
    + "@media(max-width:900px){.vm-sw{display:none}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  var bar = document.createElement("div"); bar.className = "vm-bar";
  var me = document.currentScript, back = (me && me.getAttribute("data-back")) || "../leadership/";
  bar.innerHTML = '<a href="' + back + '">&larr; Leadership</a>'
    + '<div class="vm-sw"><span>View</span><div class="vm-seg" role="group" aria-label="Preview this page as desktop or mobile">'
    + '<button type="button" data-vm="desktop" aria-pressed="true">Desktop</button>'
    + '<button type="button" data-vm="mobile" aria-pressed="false">Mobile</button></div></div>';
  var stage = document.createElement("div"); stage.className = "vm-stage";
  function mount() {
    var hdr = document.querySelector("body > header");
    if (hdr) hdr.after(bar); else document.body.prepend(bar);
    bar.after(stage);
  }
  function set(mode) {
    var m = mode === "mobile" && window.innerWidth > 900;
    document.body.classList.toggle("vm-mobile", m);
    if (m && !stage.firstChild) {
      var f = document.createElement("iframe");
      f.title = "This page at phone width"; f.src = location.pathname + location.hash; stage.appendChild(f);
    }
    bar.querySelectorAll("[data-vm]").forEach(function (b) { b.setAttribute("aria-pressed", String((b.dataset.vm === "mobile") === m)); });
  }
  bar.addEventListener("click", function (e) { var b = e.target.closest("[data-vm]"); if (b) set(b.dataset.vm); });
  addEventListener("resize", function () { if (window.innerWidth <= 900) set("desktop"); });
  if (document.body) mount(); else addEventListener("DOMContentLoaded", mount);
})();
