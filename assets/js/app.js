/* assets/js/app.js
   Shared layout injector:
   - jednotná navigace na všech stránkách
   - footer + rok
   - aktivní záložka (active)
   - volitelně: rendrování demo odkazů do #demoLinks (na ukazky.html)
*/
(function () {
  "use strict";

  // --- helpers --------------------------------------------------------------
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function currentFile() {
    const file = (location.pathname.split("/").pop() || "index.html").split("?")[0];
    return file === "" ? "index.html" : file;
  }

  function safeSetHTML(el, html) {
    if (!el) return;
    el.innerHTML = html;
  }

  // --- inject HEADER / FOOTER ----------------------------------------------
  const headerMount = qs("#siteHeader");
  const footerMount = qs("#siteFooter");

  // Pozn.: používáme stejné href pro všechny stránky (vždy ./soubor.html),
  // aby to fungovalo stejně na GitHub Pages.
  const headerHTML = `
    <header class="topbar">
      <div class="container nav">
        <a class="brand" href="./index.html" aria-label="Orion (Domů)">
          <img class="mark" src="./assets/img/orion-mark.svg" alt="Orion" width="28" height="28" />
          <span class="brandText">Orion Web Assistant</span>
          <span class="badge">DEMO</span>
        </a>

        <nav class="menu" aria-label="Hlavní navigace">
          <a data-nav href="./index.html">Domů</a>
          <a data-nav href="./web-assistant.html">Vyzkoušet</a>
          <a data-nav href="./jak-to-funguje.html">Jak to funguje</a>
          <a data-nav href="./ukazky.html">Ukázky</a>
          <a data-nav href="./kontakt.html">Kontakt</a>
        </nav>

        <div class="cta">
          <a class="btn primary" href="./kontakt.html">Nezávazná konzultace</a>
        </div>
      </div>
    </header>
  `;

  const footerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footerInner">
          <div>© <span id="y"></span> Martin Roman • Orion</div>
          <div>Prezentační ukázka • web / e-shop scénáře</div>
        </div>
      </div>
    </footer>
  `;

  safeSetHTML(headerMount, headerHTML);
  safeSetHTML(footerMount, footerHTML);

  // --- active nav -----------------------------------------------------------
  const file = currentFile();
  qsa("[data-nav]").forEach((a) => {
    const href = (a.getAttribute("href") || "").split("/").pop();
    if (href === file) a.classList.add("active");
  });

  // --- year ----------------------------------------------------------------
  const y = qs("#y");
  if (y) y.textContent = String(new Date().getFullYear());

  // --- demo links (Ukázky) -------------------------------------------------
  // Pokud existuje #demoLinks a je definované ORION_CONFIG.DEMO_LINKS,
  // vyrenderujeme cards/odkazy. Když neexistuje, nic se neděje.
  const demoMount = qs("#demoLinks");
  const cfg = window.ORION_CONFIG || {};
  if (demoMount && Array.isArray(cfg.DEMO_LINKS)) {
    const items = cfg.DEMO_LINKS
      .map(
        (it) => `
          <div class="card">
            <h3>${escapeHTML(it.title || "Ukázka")}</h3>
            <p class="muted">Otevře se v novém panelu. Slouží jako doplňková ukázka.</p>
            <a class="btn soft" target="_blank" rel="noopener" href="${escapeAttr(it.url || "#")}">Otevřít ukázku</a>
          </div>
        `
      )
      .join("");
    demoMount.innerHTML = `<div class="grid3">${items}</div>`;
  }

  // --- small safety: if some page has legacy duplicate nav markup -----------
  // (kdyby ti někde zůstala stará nav lišta v HTML), tak ji můžeš označit:
  // <div data-legacy-nav> ... </div> -> a tady to odstraníme.
  qsa("[data-legacy-nav]").forEach((el) => el.remove());

  // --- utils ---------------------------------------------------------------
  function escapeHTML(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(s) {
    return escapeHTML(s).replaceAll("`", "&#096;");
  }
})();
