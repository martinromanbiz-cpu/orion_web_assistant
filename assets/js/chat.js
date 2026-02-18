/* assets/js/chat.js
   Robustní widget: vždy vloží ikonku + panel do stránky. Bez závislosti na HTML.
*/
(() => {
  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  // zabrání dvojité inicializaci
  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

  const QUICK = [
    "Kolik to stojí?",
    "Co umí webový asistent?",
    "Jak to funguje?",
    "Je možné to nasadit na můj web?",
    "Co když se někdo ptá mimo téma?",
    "Mám zájem o nezávaznou konzultaci"
  ];

  function el(tag, attrs = {}, html = "") {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "style") n.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
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
        background: rgba(10,14,28,.38);
        display:none;
      }

      .orionChatPanel{
        position:fixed; right:18px; bottom:86px; z-index:99999;
        width:380px; max-width: calc(100vw - 36px);
        height:560px; max-height: calc(100vh - 120px);
        background:#ffffff; border:1px solid rgba(30,58,138,.14);
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

      .orionChatBody{
        padding:12px 14px;
        height: calc(100% - 64px);
        display:flex; flex-direction:column; gap:10px;
      }

      .orionChatMessages{
        flex:1;
        overflow:auto;
        padding-right:6px;
        display:flex; flex-direction:column; gap:10px;
      }

      .orionMsgRow{ display:flex; }
      .orionMsgRow.user{ justify-content:flex-end; }
      .orionMsgRow.bot{ justify-content:flex-start; }

      .orionBubble{
        max-width: 88%;
        border-radius:16px;
        padding:10px 12px;
        border:1px solid rgba(30,58,138,.10);
        background:#f6f8ff;
        color:#0b1220;
        white-space:pre-wrap;
      }
      .orionBubble.user{
        background:#1e40af;
        border-color: rgba(30,58,138,.25);
        color:#fff;
      }

      .orionChatQuickRow{ display:flex; flex-wrap:wrap; gap:10px; }
      .orionChatQR{
        background:#1e40af; color:#fff; border:none; cursor:pointer;
        padding:10px 12px; border-radius:999px; font-weight:700;
      }

      .orionChatInputRow{ display:flex; gap:10px; }
      .orionChatInput{
        flex:1;
        padding:12px 12px;
        border-radius:16px;
        border:1px solid rgba(124,58,237,.28);          /* jemně do fialova */
        background: rgba(241,245,249,.92);               /* modro-šedá */
        outline:none;
      }
      .orionChatSend{
        width:46px; border-radius:16px;
        border:1px solid rgba(15,23,42,.12);
        background:#fff; cursor:pointer;
      }

      .orionChatHint{
        color: rgba(15,23,42,.55);
        font-size: 12px;
      }
    `;

    document.head.appendChild(el("style", { id: "orionChatBaseStyles" }, css));
  }

  function extractAnswer(data) {
    if (!data) return null;
    if (typeof data === "string") return data;
    // nejběžnější varianty
    if (typeof data.answer === "string") return data.answer;
    if (typeof data.output === "string") return data.output;
    if (typeof data.text === "string") return data.text;
    if (typeof data.message === "string") return data.message;

    // někdy n8n vrací pole objektů
    if (Array.isArray(data) && data.length) {
      const first = data[0];
      return extractAnswer(first);
    }

    return null;
  }

  async function sendToN8n(text) {
    if (!WEBHOOK) return { ok: false, answer: "Webhook není nastavený (ORION_CONFIG.N8N_WEBHOOK_URL)." };

    // Posíláme více klíčů, aby to sedlo na různé n8n workflow
    const payload = {
      message: text,
      chatInput: text,
      text: text,
      source: "orion_web_assistant",
      page: location.pathname,
      ts: Date.now()
    };

    try {
      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const raw = await r.text().catch(() => "");
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }

      if (!r.ok) {
        // zobrazíme čitelně příčinu
        const msg = extractAnswer(data) || (typeof data === "string" ? data : null) || "Server error";
        return { ok: false, answer: `Nastala chyba (${r.status}). ${msg}` };
      }

      const ans = extractAnswer(data);
      return { ok: true, answer: ans || "Děkuji. Zpráva byla odeslána, ale odpověď nebyla ve správném formátu." };
    } catch (e) {
      return { ok: false, answer: "Nepodařilo se odeslat zprávu (síť / CORS / webhook nedostupný)." };
    }
  }

  function mount() {
    ensureStyles();

    const overlay = el("div", { class: "orionChatOverlay", id: "orionChatOverlay" });
    const panel = el("div", { class: "orionChatPanel", id: "orionChatPanel" });

    panel.appendChild(el("div", { class: "orionChatHeader" }, `
      <div>
        <div class="orionChatTitle">Orion • AI Web Assistant</div>
        <div class="orionChatSub">Prezentační ukázka (web/e-shop scénáře)</div>
      </div>
      <button class="orionChatClose" type="button" aria-label="Zavřít">✕</button>
    `));

    const body = el("div", { class: "orionChatBody" });

    const messages = el("div", { class: "orionChatMessages", id: "orionChatMessages" });
    const intro = "Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže.";
    messages.appendChild(renderBot(intro));

    const quickRow = el("div", { class: "orionChatQuickRow" });
    QUICK.forEach((t) => {
      const b = el("button", { class: "orionChatQR", type: "button" }, t);
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", { class: "orionChatInput", placeholder: "Napište dotaz…", type: "text" });
    const send = el("button", { class: "orionChatSend", type: "button", "aria-label": "Odeslat" }, "➤");
    inputRow.appendChild(input);
    inputRow.appendChild(send);

    const hint = el("div", { class: "orionChatHint" }, WEBHOOK ? "" : "Pozn.: Webhook není nastavený v config.js");

    body.appendChild(messages);
    body.appendChild(quickRow);
    body.appendChild(inputRow);
    body.appendChild(hint);
    panel.appendChild(body);

    const launcher = el("div", { class: "orionChatLauncher", id: "orionChatLauncher", title: "Otevřít chat" }, `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 8h10M7 12h7M12 20c5 0 9-3.6 9-8s-4-8-9-8-9 3.6-9 8c0 2.2 1 4.2 2.7 5.7L5 20l4.2-1.4c.9.3 1.8.4 2.8.4Z"
              stroke="#1e40af" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `);

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

    function renderBot(text) {
      const row = el("div", { class: "orionMsgRow bot" });
      row.appendChild(el("div", { class: "orionBubble bot" }, escapeHTML(text)));
      return row;
    }
    function renderUser(text) {
      const row = el("div", { class: "orionMsgRow user" });
      row.appendChild(el("div", { class: "orionBubble user" }, escapeHTML(text)));
      return row;
    }
    function escapeHTML(s) {
      return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    }
    function scrollDown() {
      messages.scrollTop = messages.scrollHeight;
    }

    async function handleSend(text) {
      const t = String(text || "").trim();
      if (!t) return;

      messages.appendChild(renderUser(t));
      scrollDown();

      input.value = "";

      const loadingRow = el("div", { class: "orionMsgRow bot" });
      loadingRow.appendChild(el("div", { class: "orionBubble bot" }, "Odesílám…"));
      messages.appendChild(loadingRow);
      scrollDown();

      const resp = await sendToN8n(t);

      loadingRow.remove();
      messages.appendChild(renderBot(resp.answer || "Hotovo."));
      scrollDown();
    }

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
