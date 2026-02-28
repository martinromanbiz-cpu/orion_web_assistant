/* assets/js/app.js
   Orion – Shared header/footer + active nav + demo links
   + HARD FIX pro layout chatu (bez úprav chat.js)
*/
(function () {
  "use strict";

  // -------- helpers ----------
  const byId = (id) => document.getElementById(id);

  const headerMount =
    byId("siteHeader") || byId("siteheader") || byId("SiteHeader");
  const footerMount =
    byId("siteFooter") || byId("sitefooter") || byId("SiteFooter");

  const currentFile = (location.pathname.split("/").pop() || "index.html").split("?")[0];

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // -------- header/footer ----------
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

    const bar = byId("orionTopbar");
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

    const y = byId("y");
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

  // -------- Ukázky: demo links ----------
  function renderDemoLinksIfPresent() {
    const mount = byId("demoLinks");
    if (!mount) return;

    const cfg = window.ORION_CONFIG || {};
    const links = Array.isArray(cfg.DEMO_LINKS) ? cfg.DEMO_LINKS : [];

    if (!links.length) {
      mount.innerHTML =
        `<p class="muted">Externí demo odkazy nejsou nastavené v <code>assets/js/config.js</code> (<code>ORION_CONFIG.DEMO_LINKS</code>).</p>`;
      return;
    }

    mount.innerHTML = links
      .map((l) => {
        const title = esc(l.title || "Ukázka");
        const url = esc(l.url || "#");
        return `
          <div class="demoLinkCard">
            <div class="demoLinkTitle">${title}</div>
            <a class="btn" href="${url}" target="_blank" rel="noopener">Otevřít ukázku</a>
          </div>
        `;
      })
      .join("");
  }

  // -------- HARD FIX: chat layout ----------
  // Cíl: ať konverzace je vidět a scrolluje se “message area”, ne půlka panelu.
  function patchChatLayoutOnce() {
    const panel =
      byId("orionChatPanel") ||
      document.querySelector(".orionChatPanel") ||
      document.querySelector("[data-orion-chat-panel]");

    if (!panel) return false;

    // panel jako flex sloupec
    panel.style.display = panel.style.display || ""; // nechat řídit chat.js (open/close)
    panel.style.overflow = "hidden";
    panel.style.height = panel.style.height || "";
    panel.style.maxHeight = "calc(100vh - 120px)";
    panel.style.minHeight = "420px";
    panel.style.boxSizing = "border-box";

    // najdi v panelu části (podle tvých className z chat.js)
    const body =
      panel.querySelector(".orionChatBody") ||
      panel.querySelector("[data-orion-body]") ||
      panel;

    // body musí být flex sloupec, aby šla konverzace do flex:1
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.style.height = "100%";
    body.style.minHeight = "0"; // důležité pro scroll

    // header + input + quick
    const header = panel.querySelector(".orionChatHeader");
    const inputRow = panel.querySelector(".orionChatInputRow");
    const quickRow = panel.querySelector(".orionChatQuickRow");

    // message area: zkus najít “messages” / “log”
    // (když nemáš message list, aspoň bublina dostane scroll)
    const messages =
      panel.querySelector("#orionChatMessages") ||
      panel.querySelector(".orionChatMessages") ||
      panel.querySelector(".chatMessages") ||
      panel.querySelector(".messages") ||
      panel.querySelector(".orionChatBubble"); // fallback

    if (messages) {
      messages.style.flex = "1";
      messages.style.minHeight = "0";
      messages.style.overflowY = "auto";
      messages.style.overflowX = "hidden";
      messages.style.paddingBottom = "8px";
    }

    // quickRow má být pod messages (ale nad input)
    if (quickRow) {
      quickRow.style.flex = "0 0 auto";
      quickRow.style.marginTop = "10px";
    }

    if (inputRow) {
      inputRow.style.flex = "0 0 auto";
      inputRow.style.marginTop = "10px";
    }

    // pokud panel obsahuje header, tak zbytek musí mít minHeight:0 (scroll fix)
    if (header) {
      header.style.flex = "0 0 auto";
    }

    return true;
  }

  function patchChatLayout() {
    // opakovaně párkrát, protože chat.js mountuje později
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const ok = patchChatLayoutOnce();
      if (ok || tries >= 25) clearInterval(timer);
    }, 200);
  }

  // -------- boot ----------
  function boot() {
    try {
      injectHeader();
      injectFooter();
      setActiveNav();
      renderDemoLinksIfPresent();
      patchChatLayout();
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
