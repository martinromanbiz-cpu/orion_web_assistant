/* assets/js/chat.js
   Orion chat widget (robustní):
   - vždy vloží ikonku + overlay + panel do stránky (bez závislosti na HTML)
   - struktura: Header → Messages (scroll) → Quick replies → Input
   - quick replies NEzmizí po odeslání
   - odpovědi se přidávají DOLŮ do konverzace
*/
(function () {
  "use strict";

  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  // zabrání dvojité inicializaci
  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

  // helpers
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

  function safeText(x) {
    return String(x ?? "").trim();
  }

  function ensureStyles() {
    if (document.getElementById("orionChatBaseStyles")) return;

    const css = `
      /* Launcher */
      .orionChatLauncher{
        position:fixed; right:18px; bottom:18px; z-index:99999;
        width:54px; height:54px; border-radius:16px;
        background:#ffffff; border:1px solid rgba(30,58,138,.18);
        box-shadow:0 16px 40px rgba(0,0,0,.14);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; user-select:none;
        transition: transform .12s ease, box-shadow .12s ease;
      }
      .orionChatLauncher:hover{
        transform: translateY(-1px);
        box-shadow:0 18px 46px rgba(0,0,0,.16);
      }
      .orionChatLauncher svg{ width:26px; height:26px; }

      /* Overlay + panel */
      .orionChatOverlay{
        position:fixed; inset:0; z-index:99998;
        background: rgba(10,14,28,.35);
        display:none;
        backdrop-filter: blur(1px);
      }
      .orionChatPanel{
        position:fixed; right:18px; bottom:86px; z-index:99999;
        width:380px; max-width: calc(100vw - 36px);
        height:560px; max-height: calc(100vh - 120px);
        background:#fff; border:1px solid rgba(30,58,138,.14);
        border-radius:22px; box-shadow:0 24px 80px rgba(0,0,0,.18);
        display:none; overflow:hidden;
      }

      /* Header */
      .orionChatHeader{
        padding:14px 14px 10px 14px;
        border-bottom:1px solid rgba(15,23,42,.08);
        display:flex; align-items:flex-start; justify-content:space-between;
        gap:10px;
        background: linear-gradient(180deg, rgba(245,248,255,1) 0%, rgba(255,255,255,1) 70%);
      }
      .orionChatTitle{ font-weight:900; font-size:16px; line-height:1.2; color:#0b1220; }
      .orionChatSub{ margin-top:2px; color:rgba(15,23,42,.65); font-size:13px; }
      .orionChatClose{
        width:36px; height:36px; border-radius:14px;
        background:#fff; border:1px solid rgba(15,23,42,.12);
        cursor:pointer;
        transition: transform .12s ease, background .12s ease;
      }
      .orionChatClose:hover{ transform: scale(1.02); background:#f8fafc; }

      /* Body layout */
      .orionChatBody{
        padding:12px 14px;
        height: calc(100% - 66px);
        display:flex;
        flex-direction:column;
        gap:10px;
        overflow:hidden; /* důležité */
      }

      /* Scrollovatelná konverzace */
      .orionChatMessages{
        flex:1;
        overflow:auto;
        padding-right:6px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .orionChatMessages::-webkit-scrollbar{ width:10px; }
      .orionChatMessages::-webkit-scrollbar-thumb{
        background: rgba(15,23,42,.10);
        border-radius: 999px;
        border:3px solid transparent;
        background-clip: content-box;
      }

      /* Bubliny */
      .orionMsg{
        max-width: 92%;
        border-radius:16px;
        padding:10px 12px;
        border:1px solid rgba(30,58,138,.10);
        background:#f6f8ff;
        color:#0b1220;
        white-space:pre-wrap;
        word-break:break-word;
      }
      .orionMsg.user{
        margin-left:auto;
        background:#1e40af;
        color:#fff;
        border-color: rgba(30,58,138,.20);
      }

      /* Quick replies */
      .orionChatQuickRow{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        max-height: 160px;
        overflow:auto;
        padding-right:6px;
      }
      .orionChatQuickRow::-webkit-scrollbar{ width:10px; }
      .orionChatQuickRow::-webkit-scrollbar-thumb{
        background: rgba(15,23,42,.10);
        border-radius: 999px;
        border:3px solid transparent;
        background-clip: content-box;
      }
      .orionChatQR{
        background:#1e40af; color:#fff; border:none; cursor:pointer;
        padding:10px 12px; border-radius:999px; font-weight:800;
        transition: transform .10s ease, filter .10s ease;
      }
      .orionChatQR:hover{ transform: translateY(-1px); filter: brightness(1.03); }

      /* Input row */
      .orionChatInputRow{
        margin-top:auto;
        display:flex;
        gap:10px;
      }
      .orionChatInput{
        flex:1;
        padding:12px 12px;
        border-radius:16px;
        border:1px solid #c9c5ff;
        background:#eef3ff;
        outline:none;
      }
      .orionChatInput:focus{
        border-color: rgba(30,58,138,.35);
        box-shadow: 0 0 0 4px rgba(30,58,138,.10);
      }
      .orionChatSend{
        width:50px;
        border-radius:16px;
        border:1px solid rgba(15,23,42,.12);
        background:#fff;
        cursor:pointer;
        font-weight:900;
      }
      .orionChatSend:hover{ background:#f8fafc; }

      /* Mobile: panel jako bottom sheet */
      @media (max-width: 520px){
        .orionChatPanel{
          right:12px; left:12px;
          bottom:78px;
          width:auto;
          height: 72vh;
          max-height: 72vh;
        }
        .orionChatLauncher{
          right:12px; bottom:12px;
        }
      }
    `;

    const style = el("style", { id: "orionChatBaseStyles" }, css);
    document.head.appendChild(style);
  }

  async function sendToN8n(text) {
    if (!WEBHOOK) return { ok: false, error: "missing_webhook" };

    try {
      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // držíme jednoduchý payload (n8n si to bere jako message)
        body: JSON.stringify({ message: text })
      });

      const raw = await r.text();
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch (_) {}

      if (!r.ok) {
        return { ok: false, status: r.status, data, raw };
      }
      return { ok: true, status: r.status, data, raw };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  }

  function mount() {
    ensureStyles();

    // elements
    const overlay = el("div", { class: "orionChatOverlay", id: "orionChatOverlay" });
    const panel = el("div", { class: "orionChatPanel", id: "orionChatPanel" });

    // header
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

    // messages scroll
    const messages = el("div", { class: "orionChatMessages", id: "orionChatMessages" });

    // intro assistant message (VYKÁNÍ)
    const intro =
      "Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže.";
    messages.appendChild(el("div", { class: "orionMsg assistant" }, intro));

    // quick replies
    const quickRow = el("div", { class: "orionChatQuickRow" });

    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Dá se to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Mám zájem o nezávaznou konzultaci"
    ];

    // input
    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", {
      class: "orionChatInput",
      placeholder: "Napište dotaz…",
      type: "text",
      autocomplete: "off"
    });
    const sendBtn = el("button", { class: "orionChatSend", type: "button", "aria-label": "Odeslat" }, "➤");
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    body.appendChild(messages);
    body.appendChild(quickRow);
    body.appendChild(inputRow);
    panel.appendChild(body);

    // launcher
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

    // message helpers
    function addMessage(role, text) {
      const t = safeText(text);
      if (!t) return;

      const cls = role === "user" ? "orionMsg user" : "orionMsg assistant";
      messages.appendChild(el("div", { class: cls }, t));

      // autoscroll dolů
      messages.scrollTop = messages.scrollHeight;
    }

    // open/close
    function open() {
      overlay.style.display = "block";
      panel.style.display = "block";
      setTimeout(() => input.focus(), 0);
    }
    function close() {
      overlay.style.display = "none";
      panel.style.display = "none";
    }

    launcher.addEventListener("click", open);
    overlay.addEventListener("click", close);
    panel.querySelector(".orionChatClose").addEventListener("click", close);

    // send handler
    async function handleSend(text) {
      const t = safeText(text);
      if (!t) return;

      addMessage("user", t);
      input.value = "";

      const res = await sendToN8n(t);

      // OK response handling (přizpůsobené na běžné n8n výstupy)
      if (res.ok) {
        // preferujeme data.answer, pak data.text, pak data.message, pak raw
        const d = res.data || {};
        const answer =
          safeText(d.answer) ||
          safeText(d.text) ||
          safeText(d.message) ||
          safeText(res.raw);

        if (answer) addMessage("assistant", answer);
        else addMessage("assistant", "Děkuji. Pokud chcete, napište prosím, zda jde o e-shop nebo firemní web a co má asistent řešit nejčastěji.");
        return;
      }

      // error handling (nezlomí UI)
      if (res.status === 500) {
        addMessage("assistant", "Nastala technická chyba na serveru. Zkuste to prosím za chvíli znovu.");
      } else if (res.status) {
        addMessage("assistant", `Nastala technická chyba (${res.status}). Zkuste to prosím ještě jednou.`);
      } else {
        addMessage("assistant", "Nepodařilo se spojit se serverem. Zkuste to prosím ještě jednou.");
      }
    }

    // quick replies buttons
    quick.forEach((t) => {
      const b = el("button", { class: "orionChatQR", type: "button" }, t);
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    // input events
    sendBtn.addEventListener("click", () => handleSend(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend(input.value);
    });

    // mount to DOM
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.body.appendChild(launcher);

    // initial scroll bottom
    messages.scrollTop = messages.scrollHeight;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
