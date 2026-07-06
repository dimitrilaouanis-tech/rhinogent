/* 0n1x Verify-Before-Pay Widget — "SiteAdvisor for agents".
 * Drop this on any page; it renders a trust badge for a counterparty agent, backed by
 * a SIGNED 0n1x attestation the visitor can verify. Zero build, zero trust, zero cost.
 *
 *   <div class="onyx-verify" data-agent="Wild-Rampart-B6BF"></div>
 *   <script src="https://rhinogent.com/widget.js" async></script>
 *
 * The badge shows Proceed / Caution / Stop from the signed dossier. Verdict + disclaimer
 * come straight from /a2a (attest_agent) — nothing is asserted the payload can't back.
 */
(function () {
  "use strict";
  var GATEWAY = "https://onyx-actions.onrender.com";
  var STYLE = ".onyx-badge{display:inline-flex;align-items:center;gap:8px;font:600 13px/1.2 ui-sans-serif,system-ui,sans-serif;" +
    "padding:8px 12px;border-radius:10px;border:1px solid;text-decoration:none;transition:.15s}" +
    ".onyx-badge small{font-weight:400;opacity:.75}" +
    ".onyx-dot{width:8px;height:8px;border-radius:50%}" +
    ".onyx-proceed{background:#0e2a1c;border-color:#1f7a54;color:#4ade80}.onyx-proceed .onyx-dot{background:#22c55e}" +
    ".onyx-caution{background:#2a220e;border-color:#8a6d1f;color:#facc15}.onyx-caution .onyx-dot{background:#eab308}" +
    ".onyx-stop{background:#2a0e12;border-color:#8a1f2b;color:#f87171}.onyx-stop .onyx-dot{background:#ef4444}" +
    ".onyx-load{background:#14161d;border-color:#2a2d38;color:#8b93a7}.onyx-load .onyx-dot{background:#6b7280}";

  function inject() {
    if (document.getElementById("onyx-widget-style")) return;
    var s = document.createElement("style");
    s.id = "onyx-widget-style"; s.textContent = STYLE; document.head.appendChild(s);
  }

  function verdictClass(v) {
    if (!v) return ["onyx-caution", "Caution"];
    var u = String(v).toUpperCase();
    if (u.indexOf("STRONG") >= 0) return ["onyx-proceed", "Proceed"];
    if (u.indexOf("ESTABLISHED") >= 0) return ["onyx-proceed", "Proceed"];
    if (u.indexOf("EMERGING") >= 0) return ["onyx-caution", "Caution"];
    if (u.indexOf("UNKNOWN") >= 0) return ["onyx-stop", "Unverified"];
    return ["onyx-caution", "Caution"];
  }

  function render(el, cls, label, detail, agent) {
    var a = document.createElement("a");
    a.className = "onyx-badge " + cls;
    a.href = "https://rhinogent.com/card?n=" + encodeURIComponent(agent);
    a.target = "_blank"; a.rel = "noopener";
    a.title = detail + " — signed by 0n1x, verify it yourself";
    a.innerHTML = '<span class="onyx-dot"></span>' + label +
      '<small>· 0n1x verified' + (detail ? " · " + detail : "") + "</small>";
    el.innerHTML = ""; el.appendChild(a);
  }

  function verify(el) {
    var agent = el.getAttribute("data-agent");
    if (!agent) return;
    render(el, "onyx-load", "Checking…", "", agent);
    fetch(GATEWAY + "/a2a", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "should I trust " + agent + " before I pay?", from: "widget" })
    }).then(function (r) { return r.json(); }).then(function (d) {
      var reply = d.reply || "";
      var m = reply.match(/verdict\s+([A-Z-]+)/i) || reply.match(/(STRONG-STANDING|ESTABLISHED|EMERGING|UNKNOWN)/i);
      var vc = verdictClass(m && m[1]);
      var rankM = reply.match(/rank\s+#?(\d+)/i);
      render(el, vc[0], vc[1], rankM ? "rank #" + rankM[1] : "signed", agent);
    }).catch(function () {
      render(el, "onyx-load", "0n1x", "network waking — retry", agent);
    });
  }

  function boot() {
    inject();
    var nodes = document.querySelectorAll(".onyx-verify");
    for (var i = 0; i < nodes.length; i++) verify(nodes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.OnyxVerify = { refresh: boot };
})();
