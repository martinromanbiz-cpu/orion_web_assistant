// assets/js/app.js
// Orion – shared UI (header/footer) + navigation + small UX helpers
// - Prevents double execution
// - Ensures identical nav on every page
// - Mobile menu
// - Active link highlighting
// - Sticky shadow on scroll
// - Optional: auto-load chat widget once (if chat.js exists)

(function () {
  // ---------- HARD GUARD (prevents double execution) ----------
  if (window.__ORION_APP_LOADED__) return;
  window.__ORION_APP_LOADED__ = true;

  // ---------- HELPERS ----------
  function fileFromPath(pathname) {
    // "/orion_web_assistant/" -> "index.html"
    const parts = (pathname || "").split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    if (!last || !last.includes(".")) return "index.html";
    return last;
  }

  function safeQS(sel, root = document) {
    try {
      return root.querySelector(sel);
    } catch {
      return null;
    }
  }

  function safeQSA(sel, root = document) {
    try {
      return Array.from(root.querySelectorAll(sel));
    } catch {
      return [];
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // Remove previously injected header/footer if any (in case of manual duplicates)
  safeQSA("header.topbar").forEach((el) => el.remove());
  safeQSA("footer.footer").forEach((el) => el.remove());

  const currentFile = fileFromPath(location.pathname);

  // ---------- HEADER / FOOTER TEMPLATE ----------
  const headerHTML = `
    <header class="topbar" id="orionTopbar">
      <div class="container nav">
        <a class="brand" href="./index.html" aria-label="Orion (domů)">
          <img class="brandLogo" src="./assets/img/orion-mark.svg" alt="Orion" width="36" height="36" />
          <span class="brandText">Orion Web Assistant</span>
          <span class="badge">DEMO</span>
        </a>

        <button class="navToggle" type="button" aria-label="Otevřít menu" aria-expanded="false" aria-controls="orionMenu">
          <span class="navToggleBars" aria-hidden="true"></span>
        </button>

        <nav class="menu" id="orionMenu" aria-label="Hlavní navigace">
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
          <div>© <span id="orionYear"></span> Martin Roman • Orion</div>
          <div>Prezentační ukázka • Web/e-shop assistant</div>
        </div>
      </div>
    </footer>
  `;

  // ---------- MOUNT HEADER/FOOTER ----------
  const headerMount = document.getElementById("siteHeader");
  const footerMount = document.getElementById("siteFooter");

  if (headerMount) headerMount.innerHTML = headerHTML;
  if (footerMount) footerMount.innerHTML = footerHTML;

  // Year
  setText("orionYear", String(new Date().getFullYear()));

  // ---------- ACTIVE NAV HIGHLIGHT ----------
  // Mark active based on current file; also handle "/" as index.html
  safeQSA("[data-nav]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const file = fileFromPath(href);
    if (file === currentFile) a.classList.add("active");
  });

  // ---------- MOBILE MENU ----------
  const toggleBtn = safeQS(".navToggle");
  const menu = document.getElementById("orionMenu");

  function closeMenu() {
    if (!toggleBtn || !menu) return;
    toggleBtn.setAttribute("aria-expanded", "false");
    menu.classList.remove("open");
    document.documentElement.classList.remove("navOpen");
  }

  function openMenu() {
    if (!toggleBtn || !menu) return;
    toggleBtn.setAttribute("aria-expanded", "true");
    menu.classList.add("open");
    document.documentElement.classList.add("navOpen");
  }

  if (toggleBtn && menu) {
    toggleBtn.addEventListener("click", () => {
      const expanded = toggleBtn.getAttribute("aria-expanded") === "true";
      if (expanded) closeMenu();
      else openMenu();
    });

    // Close on link click (mobile)
    safeQSA("#orionMenu a").forEach((link) => link.addEventListener("click", closeMenu));

    // Close on ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("open")) return;
      const t = e.target;
      if (t === toggleBtn || toggleBtn.contains(t)) return;
      if (t === menu || menu.contains(t)) return;
      closeMenu();
    });
  }

  // ---------- STICKY SHADOW ON SCROLL ----------
  const topbar = document.getElementById("orionTopbar");
  function onScroll() {
    if (!topbar) return;
    if (window.scrollY > 8) topbar.classList.add("scrolled");
    else topbar.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- OPTIONAL: LOAD CHAT JS SAFELY ONCE ----------
  // If you want chat available on all pages, keep chat.js included in HTML.
  // This is just a guard so chat.js init can check window.__ORION_CHAT_LOADED__.
  window.__ORION_UI_READY__ = true;
})();
