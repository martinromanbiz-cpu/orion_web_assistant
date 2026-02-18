// assets/js/app.js
// Shared UI (header/footer) + active nav highlighting.
// Robustní: když něco chybí, nic nepadá. (fix: "Unexpected end of input")

(function () {
  "use strict";

  // --- helpers ---
  const byId = (id) => document.getElementById(id);
  const safe = (fn) => {
    try { fn(); } catch (e) { console.error("[app.js]", e); }
  };

  const currentFile = () => {
    const p = location.pathname.split("/").pop();
    return p && p.length ? p : "index.html";
  };

  // --- header/footer templates ---
  function headerHTML() {
    return `
      <header class="topbar">
        <div class="container nav">
          <a class="brand" href="./index.html" aria-label="Orion (domů)">
            <img src="./assets/img/orion-mark.svg" alt="Orion" width="36" height="36" />
            <span class="brandText">Orion</span>
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
  }

  function footerHTML() {
    return `
      <footer class="footer">
        <div class="container">
          <div class="footerInner">
            <div>© <span id="y"></span> Martin Roman • Orion</div>
            <div>Prezentační ukázka • Web/e-shop assistant</div>
          </div>
        </div>
      </footer>
    `;
  }

  // --- inject UI ---
  function injectHeaderFooter() {
    const headerMount = byId("siteHeader");
    const footerMount = byId("siteFooter");

    if (headerMount) headerMount.innerHTML = headerHTML();
    if (footerMount) footerMount.innerHTML = footerHTML();

    // year
    const y = byId("y");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  // --- active nav ---
  function markActiveNav() {
    const cur = currentFile();

    document.querySelectorAll("[data-nav]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const file = href.split("/").pop();
      if (file === cur) a.classList.add("active");
      else a.classList.remove("active");
    });
  }

  // --- ensure chat script loaded (jen když by náhodou nebyl v HTML) ---
  function ensureChatLoaded() {
    const hasChat = [...document.scripts].some((s) => (s.src || "").includes("/assets/js/chat.js"));
    if (hasChat) return;

    const s = document.createElement("script");
    s.src = "./assets/js/chat.js";
    s.defer = true;
    document.head.appendChild(s);
  }

  // --- init ---
  function init() {
    injectHeaderFooter();
    markActiveNav();
    ensureChatLoaded();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => safe(init));
  } else {
    safe(init);
  }
})();
