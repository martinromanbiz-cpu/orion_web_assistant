/* assets/js/chat.js
   Widget: vždy vloží ikonku + panel do stránky (nezávisle na HTML).
   - Vykání (stejně jako web)
   - Odpovědi se přidávají do historie (nepřepisují úvodní bublinu)
   - Quick replies zůstávají
   - Posílá payload pro n8n chat trigger: { chatInput, sessionId, history, meta }
*/
(function () {
  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

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

  function getSessionId() {
    const key = "orion_session_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = "web-" + Math.random().toString(16).slice(2) + "-" + Date.now();
      localStorage.setItem(key, id);
    }
    return id;
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

      .orionChatBody{
        height: calc(100% - 64px);
        display:flex; flex-direction:column;
      }

      .orionChatLog{
        padding:12px 14px;
        overflow:auto;
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .orionMsg{
        max-width: 92%;
        border-radius:16px;
        padding:10px 12px;
        border:1px solid rgba(30,58,138,.10);
        background:#f6f8ff;
        color:#0b1220;
      }
      .orionMsg.user{
        align-self:flex-end;
        background:#1e40af;
        color:#fff;
        border-color: rgba(30,58,138,.25);
      }

      .orionChatQuickWrap{
        padding:0 14px 10px 14px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .orionChatQuickRow{ display:flex; flex-wrap:wrap; gap:10px; }
      .orionChatQR{
        background:#1e40af; color:#fff; border:none; cursor:pointer;
        padding:10px 12px; border-radius:999px; font-weight:700;
      }

      .orionChatInputRow{
        display:flex; gap:10px;
        padding:0 14px 14px 14px;
      }
      .orionChatInput{
        flex:1; padding:12px 12px; border-radius:16px;
        border:1px solid #c9c5ff; background:#eef3ff; outline:none;
      }
      .orionChatSend{
        width:46px; border-radius:16px; border:1px solid rgba(15,23,42,.12);
        background:#fff; cursor:pointer;
      }
      .orionChatSend[disabled]{ opacity:.55; cursor:not-allowed; }
    `;

    const style = el("style", { id: "orionChatBaseStyles" }, css);
    document.head.appendChild(style);
  }

  async function sendToN8n(text) {
    if (!WEBHOOK) return { ok: false, answer: "Chat webhook není nastavený." };

    const payload = {
      chatInput: text,
      sessionId: getSessionId(),
      history: [],
      meta: { source: "orion_web" }
    };

    try {
      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // n8n může vracet různé tvary; zkusíme vytěžit text rozumně
      const raw = await r.text().catch(() => "");
      if (!r.ok) {
        return { ok: false, answer: "Došlo k chybě při zpracování požadavku. Zkuste to prosím znovu." };
      }

      let data = null;
      try { data = JSON.parse(raw); } catch { data = null; }

      const answer =
        (data && (data.answer || data.text || data.output || data.message)) ||
        raw ||
        "Hotovo.";

      return { ok: true, answer: String(answer) };
    } catch (e) {
      return { ok: false, answer: "Nepodařilo se odeslat dotaz. Zkontrolujte připojení a zkuste to prosím znovu." };
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

    const log = el("div", { class: "orionChatLog", id: "orionChatLog" });
    function addMsg(text, who) {
      const m = el("div", { class: "orionMsg " + (who || "") }, text);
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    }

    addMsg(
      "Dobrý den, jsem Orion – webový asistent v prezentační ukázce. Napište dotaz, nebo zvolte jednu z možností níže.",
      "bot"
    );

    const quickWrap = el("div", { class: "orionChatQuickWrap" });
    const quickRow = el("div", { class: "orionChatQuickRow" });

    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Je možné to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Mám zájem o nezávaznou konzultaci"
    ];

    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", { class: "orionChatInput", placeholder: "Napište dotaz…", type: "text" });
    const send = el("button", { class: "orionChatSend", type: "button", "aria-label": "Odeslat" }, "➤");
    inputRow.appendChild(input);
    inputRow.appendChild(send);

    async function handleSend(text) {
      const t = (text || "").trim();
      if (!t) return;

      addMsg(t, "user");
      input.value = "";

      send.disabled = true;
      const resp = await sendToN8n(t);
      send.disabled = false;

      addMsg(resp.answer || "Hotovo.", "bot");
    }

    quick.forEach((t) => {
      const b = el("button", { class: "orionChatQR", type: "button" }, t);
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    send.addEventListener("click", () => handleSend(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend(input.value);
    });

    quickWrap.appendChild(quickRow);
    body.appendChild(log);
    body.appendChild(quickWrap);
    body.appendChild(inputRow);
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
