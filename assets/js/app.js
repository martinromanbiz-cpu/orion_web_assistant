/* assets/js/app.js
   Shared UI (header/footer) + active nav highlighting + Ukázky page demo links.
   + HOTFIX: chrání chat widget před přepsáním layoutu globálním CSS (aby byla vidět celá konverzace).

   POZNÁMKA: Chat je pořád jen v assets/js/chat.js – tady jen zajišťujeme, že ho webové CSS „nezlomí“.
*/
(function () {
  "use strict";

  // --- mounts (různé stránky historicky používaly různé ID)
  const headerMount =
    document.getElementById("siteHeader") ||
    document.getElementById("siteheader") ||
    document.getElementById("headerMount");

  const footerMount =
    document.getElementById("siteFooter") ||
    document.getElementById("sitefooter") ||
    document.getElementById("footerMount");

  const currentFile = (location.pathname.split("/").pop() || "index.html").split("?")[0];

  // --- utils
  function safeHTML(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // --- CHAT LAYOUT HOTFIX (nejčastější problém = globální CSS přepisuje overflow/height/flex)
  function injectChatLayoutHotfix() {
    if (document.getElementById("orionChatLayoutHotfix")) return;

    const css = `
      /* Zabrání, aby webové CSS rozbilo chat layout */
      #orionChatPanel.orionChatPanel,
      .orionChatPanel {
        overflow: hidden !important;
      }

      /* Tohle je klíčové: konverzace MUSÍ mít vlastní scroll a flex:1 */
      #orionChatMessages.orionChatMessages,
      .orionChatMessages {
        flex: 1 1 auto !important;
        min-height: 140px !important;
        overflow: auto !important;
      }

      /* Quick replies nesmí „sežrat“ celou výšku panelu */
      .orionChatQuickRow {
        flex: 0 0 auto !important;
        max-height: 160px !important;
        overflow: auto !important;
      }

      /* Body musí být flex-column a nesmí být přepsané na block */
      .orionChatBody {
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
      }

      /* Input vždy dole */
      .orionChatInputRow {
        flex: 0 0 auto !important;
      }

      /* Pokud někde web nasadí globálně: div { overflow:hidden } nebo * { box-sizing } apod. */
      .orionMsg { box-sizing: border-box !important; }
    `;

    const style = document.createElement("style");
    style.id = "orionChatLayoutHotfix";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // --- HEADER
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

    // jemný shadow při scrollu (polish)
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

  // --- FOOTER
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

  // --- ACTIVE NAV
  function setActiveNav() {
    document.querySelectorAll("[data-nav]").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0];
      const file = href.split("/").pop();
      if (file === currentFile) a.classList.add("active");
      else a.classList.remove("active");
    });
  }

  // --- UKÁZKY: render odkazy z ORION_CONFIG.DEMO_LINKS do #demoLinks
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

  // --- BOOT
  function boot() {
    try {
      injectChatLayoutHotfix(); // důležité: před renderem/po renderu je to jedno, ale chci to mít vždy
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
