/* assets/js/app.js
   Shared UI (header/footer) + active nav highlighting + optional page helpers.
   Robustní: nespadne, i když na stránce chybí mount point.
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
            <a data-nav href="./web-assistant.html">Web Assistant</a>
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

  // Ukázky: vykreslení demo odkazů z config.js
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
})();/* assets/js/chat.js
   Robustní Orion chat widget:
   - vždy vloží ikonku + panel do stránky
   - posílá payload kompatibilní s n8n (chatInput/sessionId/history/meta)
   - odpověď zobrazí i při různém formátu response
*/
(function () {
  "use strict";

  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  // zabrání dvojité inicializaci
  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

  // stabilní sessionId pro jednu návštěvu
  const SESSION_ID =
    window.__ORION_SESSION__ ||
    (window.__ORION_SESSION__ = "web-" + Math.random().toString(16).slice(2));

  function el(tag, attrs = {}, html = "") {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "style") n.setAttribute("style", v);
      else n.setAttribute(k, v);
    });
    if (html) n.innerHTML = html;
    return n;
  }

  function ensureStyles() {
    if (document.getElementById("orionChatBaseStyles")) return;

    const css = `
      .orionChatLauncher{
        position:fixed; right:18px; bottom:18px; z-index:99999;
        width:54px; height:54px; border-radius:16px;
        background:#ffffff; border:1px solid rgba(30,58,138,.18);
        box-shadow:0 16px 40px rgba(0,0,0,.14);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; user-select:none;
      }
      .orionChatLauncher:hover{ transform: translateY(-1px); }
      .orionChatLauncher svg{ width:26px; height:26px; }

      .orionChatOverlay{
        position:fixed; inset:0; z-index:99998;
        background: rgba(10,14,28,.35);
        display:none;
      }
      .orionChatPanel{
        position:fixed; right:18px; bottom:86px; z-index:99999;
        width:360px; max-width: calc(100vw - 36px);
        height:520px; max-height: calc(100vh - 120px);
        background:#fff; border:1px solid rgba(30,58,138,.14);
        border-radius:22px; box-shadow:0 24px 80px rgba(0,0,0,.18);
        display:none; overflow:hidden;
      }
      .orionChatHeader{
        padding:14px 14px 10px 14px;
        border-bottom:1px solid rgba(15,23,42,.08);
        display:flex; align-items:flex-start; justify-content:space-between;
        gap:10px;
      }
      .orionChatTitle{ font-weight:800; font-size:16px; line-height:1.2; }
      .orionChatSub{ margin-top:2px; color:rgba(15,23,42,.65); font-size:13px; }
      .orionChatClose{
        width:34px; height:34px; border-radius:12px;
        background:#fff; border:1px solid rgba(15,23,42,.12);
        cursor:pointer;
      }
      .orionChatBody{ padding:12px 14px; height: calc(100% - 64px); display:flex; flex-direction:column; gap:10px; }
      .orionChatBubble{
        background:#f6f8ff; border:1px solid rgba(30,58,138,.10);
        border-radius:16px; padding:10px 12px; color:#0b1220;
      }
      .orionChatQuickRow{ display:flex; flex-wrap:wrap; gap:10px; }
      .orionChatQR{
        background:#1e40af; color:#fff; border:none; cursor:pointer;
        padding:10px 12px; border-radius:999px; font-weight:700;
      }
      .orionChatInputRow{ margin-top:auto; display:flex; gap:10px; }
      .orionChatInput{
        flex:1; padding:12px 12px; border-radius:16px;
        border:1px solid #c9c5ff; background:#eef3ff; outline:none;
      }
      .orionChatSend{
        width:46px; border-radius:16px; border:1px solid rgba(15,23,42,.12);
        background:#fff; cursor:pointer;
      }
      .orionChatStatus{
        font-size:12px; color:rgba(15,23,42,.6); margin-top:-4px;
      }
    `;

    document.head.appendChild(el("style", { id: "orionChatBaseStyles" }, css));
  }

  async function sendToN8n(text) {
    if (!WEBHOOK) {
      return { ok: false, message: "Chybí N8N_WEBHOOK_URL v config.js" };
    }

    try {
      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatInput: text,
          sessionId: SESSION_ID,
          history: [],
          meta: { source: "orion_web_assistant" }
        })
      });

      const raw = await r.text();

      // zkusíme JSON, když ne, tak vrátíme text
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (_) {
        data = raw;
      }

      if (!r.ok) {
        return { ok: false, status: r.status, data };
      }

      return { ok: true, data };
    } catch (e) {
      return { ok: false, message: "Nepodařilo se odeslat dotaz.", error: String(e) };
    }
  }

  function mount() {
    ensureStyles();

    const overlay = el("div", { class: "orionChatOverlay", id: "orionChatOverlay" });
    const panel = el("div", { class: "orionChatPanel", id: "orionChatPanel" });

    panel.appendChild(
      el(
        "div",
        { class: "orionChatHeader" },
        `
        <div>
          <div class="orionChatTitle">Orion • AI Web Assistant</div>
          <div class="orionChatSub">Prezentační ukázka (web/e-shop scénáře)</div>
        </div>
        <button class="orionChatClose" type="button" aria-label="Zavřít">✕</button>
      `
      )
    );

    const body = el("div", { class: "orionChatBody" });

    const bubble = el(
      "div",
      { class: "orionChatBubble", id: "orionChatBubble" },
      `Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže.`
    );

    const status = el("div", { class: "orionChatStatus", id: "orionChatStatus" }, "");

    const quickRow = el("div", { class: "orionChatQuickRow" });

    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Dá se to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Mám zájem o nezávaznou konzultaci"
    ];

    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", {
      class: "orionChatInput",
      placeholder: "Napište dotaz…",
      type: "text",
      id: "orionChatInput"
    });
    const send = el("button", { class: "orionChatSend", type: "button", "aria-label": "Odeslat" }, "➤");

    inputRow.appendChild(input);
    inputRow.appendChild(send);

    body.appendChild(bubble);
    body.appendChild(status);
    body.appendChild(quickRow);
    body.appendChild(inputRow);
    panel.appendChild(body);

    const launcher = el(
      "div",
      { class: "orionChatLauncher", id: "orionChatLauncher", title: "Otevřít chat" },
      `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 8h10M7 12h7M12 20c5 0 9-3.6 9-8s-4-8-9-8-9 3.6-9 8c0 2.2 1 4.2 2.7 5.7L5 20l4.2-1.4c.9.3 1.8.4 2.8.4Z"
              stroke="#1e40af" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `
    );

    function open() {
      overlay.style.display = "block";
      panel.style.display = "block";
      input.focus();
    }
    function close() {
      overlay.style.display = "none";
      panel.style.display = "none";
    }

    launcher.addEventListener("click", open);
    overlay.addEventListener("click", close);
    panel.querySelector(".orionChatClose").addEventListener("click", close);

    async function handleSend(text) {
      const q = (text || "").trim();
      if (!q) return;

      status.textContent = "Odesílám…";

      const res = await sendToN8n(q);

      // input vyčistit, quick replies necháme viditelné
      input.value = "";

      if (!res.ok) {
        status.textContent = "";
        bubble.innerHTML =
          `Nastala chyba (${res.status || ""}). ` +
          `Zkuste to prosím znovu, nebo napište přes Kontakt.`;
        return;
      }

      status.textContent = "";

      const data = res.data;

      // vytáhnout text z různých možných formátů
      const answer =
        (data && (data.answer ?? data.text ?? data.output)) ||
        (typeof data === "string" ? data : null);

      if (answer) bubble.innerHTML = String(answer);
      else bubble.innerHTML = "Děkuji. Jaký typ webu/e-shopu řešíte a co má asistent dělat nejčastěji?";
    }

    // quick replies
    quick.forEach((t) => {
      const b = el("button", { class: "orionChatQR", type: "button" }, t);
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    // send button + enter
    send.addEventListener("click", () => handleSend(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend(input.value);
    });

    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.body.appendChild(launcher);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
