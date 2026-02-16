// assets/js/app.js
// Jednotný layout pro všechny stránky:
// - vloží stejný header/footer (pokud chybí)
// - vloží chat widget (pokud chybí)
// - zvýrazní aktivní položku v menu
// - vygeneruje Ukázky z ORION_CONFIG.DEMO_LINKS

(function () {
  const currentFile = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  // Ensure mounts exist
  ensureMount("siteHeader", "body", "prepend");
  ensureMount("siteFooter", "body", "append");

  // Inject header
  const headerMount = document.getElementById("siteHeader");
  if (headerMount && headerMount.childElementCount === 0) {
    headerMount.innerHTML = `
      <header class="topbar">
        <div class="container nav">
          <a class="brand" href="./index.html" aria-label="Orion (domů)">
            <img src="./assets/img/orion-mark.svg" alt="Orion" width="36" height="36" />
            <span class="brandText">Orion</span>
            <span class="badge">DEMO</span>
          </a>

          <nav class="menu" aria-label="Hlavní navigace">
            <a data-nav href="./index.html">Domů</a>
            <a data-nav href="./web-assistant.html">Web Assistant</a>
            <a data-nav href="./jak-to-funguje.html">Jak to funguje</a>
            <a data-nav href="./ukazky.html">Ukázky</a>
            <a data-nav href="./dalsi-ukazky.html">Další ukázky</a>
            <a data-nav href="./kontakt.html">Kontakt</a>
          </nav>

          <div class="cta">
            <a class="btn primary" href="./kontakt.html">Nezávazná konzultace</a>
          </div>
        </div>
      </header>
    `;
  }

  // Inject footer
  const footerMount = document.getElementById("siteFooter");
  if (footerMount && footerMount.childElementCount === 0) {
    footerMount.innerHTML = `
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

  // Active nav highlight
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    const file = href.split("/").pop();
    if (!file) return;
    if (file === currentFile) a.classList.add("active");
  });

  // Year
  const y = document.getElementById("y");
  if (y) y.textContent = String(new Date().getFullYear());

  // Inject chat widget if missing
  if (!document.querySelector("[data-chat-fab]")) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <!-- Chat FAB + panel (injected) -->
      <button class="chatFab" data-chat-fab aria-label="Otevřít chat">
        <span class="chatFabIcon">💬</span>
      </button>

      <div class="chatPanel" data-chat-panel aria-hidden="true">
        <div class="chatHeader">
          <div>
            <div class="chatTitle">Orion • AI Web Assistant</div>
            <div class="chatSubtitle">Prezentační ukázka (web/e-shop scénáře)</div>
          </div>
          <button class="chatClose" data-chat-close aria-label="Zavřít">×</button>
        </div>

        <div class="chatBody" data-chat-body></div>

        <div class="chatQuick" data-chat-quick></div>

        <form class="chatForm" data-chat-form>
          <input class="chatInput" data-chat-input type="text" placeholder="Napište dotaz…" autocomplete="off" />
          <button class="chatSend" data-chat-send type="submit" aria-label="Odeslat">➤</button>
        </form>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  // Ukázky: vygeneruj seznam z configu
  const demos = (window.ORION_CONFIG && window.ORION_CONFIG.DEMO_LINKS) || [];
  const list = document.querySelector("[data-demo-list]");
  if (list && demos.length) {
    list.innerHTML = demos
      .map(
        (d) => `
        <div class="bigCard">
          <h3>${escapeHtml(d.title)}</h3>
          <p class="muted" style="margin-bottom:12px">Otevře se v novém panelu. Slouží jako doplňková ukázka.</p>
          <a class="btn soft" target="_blank" rel="noopener" href="${escapeAttr(d.url)}">Otevřít ukázku</a>
        </div>
      `
      )
      .join("");
  }

  function ensureMount(id, parentSel, where) {
    if (document.getElementById(id)) return;
    const el = document.createElement("div");
    el.id = id;
    const parent = document.querySelector(parentSel) || document.body;
    if (where === "prepend") parent.prepend(el);
    else parent.appendChild(el);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replaceAll("'", "&#39;");
  }
})();
