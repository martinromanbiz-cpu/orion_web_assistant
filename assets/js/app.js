/* assets/js/app.js
   Shared UI (header/footer) + active nav highlighting + Ukázky demo links.
   DŮLEŽITÉ: app.js NESMÍ upravovat chat layout. Chat řeší pouze assets/js/chat.js.
*/
(function () {
  "use strict";

  const headerMount =
    document.getElementById("siteHeader") || document.getElementById("siteheader");
  const footerMount =
    document.getElementById("siteFooter") || document.getElementById("sitefooter");

  const currentFile = (location.pathname.split("/").pop() || "index.html").split("?")[0];

  function safeHTML(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function injectHeader() {
    if (!headerMount) return;

    headerMount.innerHTML = `
      <header class="topbar" id="orionTopbar">
        <div class="container nav">
          <a class="brand" href="./index.html" aria-label="Orion (domů)">
            <img src="./assets/img/orion-mark.svg" alt="Orion" width="36" height="36" />
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

    // jemný stín při scrollu
    const bar = document.getElementById("orionTopbar");
    if (bar) {
      const onScroll = () => {
        if (window.scrollY > 6) bar.classList.add("scrolled");
        else bar.classList.remove("scrolled");
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  function injectFooter() {
    if (!footerMount) return;

    footerMount.innerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footerInner">
            <div>© <span id="y"></span> Martin Roman • Orion</div>
            <div>Prezentační ukázka AI asistenta pro weby a e-shopy</div>
          </div>
        </div>
      </footer>
    `;

    const y = document.getElementById("y");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  function setActiveNav() {
    document.querySelectorAll("[data-nav]").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0];
      const file = href.split("/").pop();
      if (file === currentFile) a.classList.add("active");
      else a.classList.remove("active");
    });
  }

  // Ukázky: render odkazy z ORION_CONFIG.DEMO_LINKS do #demoLinks
  function renderDemoLinksIfPresent() {
    const mount = document.getElementById("demoLinks");
    if (!mount) return;

    const cfg = window.ORION_CONFIG || {};
    const links = Array.isArray(cfg.DEMO_LINKS) ? cfg.DEMO_LINKS : [];

    if (!links.length) {
      mount.innerHTML =
        `<p class="muted">Externí demo odkazy nejsou nastavené v <code>assets/js/config.js</code> (pole <code>ORION_CONFIG.DEMO_LINKS</code>).</p>`;
      return;
    }

    mount.innerHTML = links
      .map((l) => {
        const title = safeHTML(l.title || "Ukázka");
        const url = safeHTML(l.url || "#");
        return `
          <div class="demoLinkCard">
            <div class="demoLinkTitle">${title}</div>
            <a class="btn" href="${url}" target="_blank" rel="noopener">Otevřít ukázku</a>
          </div>
        `;
      })
      .join("");
  }

  function boot() {
    try {
      injectHeader();
      injectFooter();
      setActiveNav();
      renderDemoLinksIfPresent();
    } catch (e) {
      console.error("Orion app.js failed safely:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
