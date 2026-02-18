// assets/js/app.js
// Shared UI (header/footer) + active nav + Ukázky (externí odkazy)

(function () {
  "use strict";

  // --- helpers ---
  function safeMount(id, html) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = html;
  }

  function currentFile() {
    var p = (location.pathname || "").split("/").pop();
    return p && p.length ? p : "index.html";
  }

  // --- header/footer injection ---
  var headerHtml =
    '<header class="topbar">' +
    '  <div class="container nav">' +
    '    <a class="brand" href="./index.html" aria-label="Orion (domů)">' +
    '      <img src="./assets/img/orion-mark.svg" alt="Orion" width="36" height="36" />' +
    '      <span class="brandText">Orion Web Assistant</span>' +
    '      <span class="badge">DEMO</span>' +
    "    </a>" +
    '    <nav class="menu" aria-label="Hlavní navigace">' +
    '      <a data-nav href="./index.html">Domů</a>' +
    '      <a data-nav href="./web-assistant.html">Vyzkoušet</a>' +
    '      <a data-nav href="./jak-to-funguje.html">Jak to funguje</a>' +
    '      <a data-nav href="./ukazky.html">Ukázky</a>' +
    '      <a data-nav href="./kontakt.html">Kontakt</a>' +
    "    </nav>" +
    '    <div class="cta">' +
    '      <a class="btn primary" href="./kontakt.html">Nezávazná konzultace</a>' +
    "    </div>" +
    "  </div>" +
    "</header>";

  var footerHtml =
    '<footer class="footer">' +
    '  <div class="container">' +
    '    <div class="footerInner">' +
    '      <div>© <span id="y"></span> Martin Roman • Orion</div>' +
    "      <div>Prezentační ukázka • Web/e-shop assistant</div>" +
    "    </div>" +
    "  </div>" +
    "</footer>";

  safeMount("siteHeader", headerHtml);
  safeMount("siteFooter", footerHtml);

  // --- active nav ---
  var cur = currentFile();
  var navLinks = document.querySelectorAll("[data-nav]");
  for (var i = 0; i < navLinks.length; i++) {
    var href = navLinks[i].getAttribute("href") || "";
    var file = href.split("/").pop();
    if (file === cur) navLinks[i].classList.add("active");
  }

  // --- year ---
  var y = document.getElementById("y");
  if (y) y.textContent = String(new Date().getFullYear());

  // --- ukazky.html: external demo links ---
  // očekává v ukazky.html prvek <div id="demoLinks"></div>
  var demoMount = document.getElementById("demoLinks");
  if (demoMount) {
    var cfg = window.ORION_CONFIG || {};
    var links = Array.isArray(cfg.DEMO_LINKS) ? cfg.DEMO_LINKS : [];

    if (!links.length) {
      demoMount.innerHTML =
        '<div class="muted">Odkazy nejsou nastavené v <code>assets/js/config.js</code> (DEMO_LINKS).</div>';
    } else {
      var cards = [];
      for (var j = 0; j < links.length; j++) {
        var item = links[j] || {};
        var title = item.title || "Ukázka";
        var url = item.url || "#";

        cards.push(
          '<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
            '<div>' +
              "<h3 style=\"margin:0 0 6px 0\">" + title + "</h3>" +
              '<div class="muted" style="word-break:break-all">' + url + "</div>" +
            "</div>" +
            '<a class="btn btn-primary" target="_blank" rel="noopener" href="' + url + '">Otevřít</a>' +
          "</div>"
        );
      }
      demoMount.innerHTML =
        '<div class="grid2" style="margin-top:10px">' + cards.join("") + "</div>";
    }
  }
})();
