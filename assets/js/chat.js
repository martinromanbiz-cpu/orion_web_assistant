/* assets/js/chat.js
   Orion chat widget – robustní:
   - vždy vloží ikonku + overlay + panel (bez závislosti na HTML)
   - konverzace se ukládá do message logu (scrolluje se jen log)
   - quick replies zůstanou viditelné
   - parsuje n8n odpověď primárně z JSON klíče: output
*/
(function () {
  "use strict";

  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  // zabrání dvojité inicializaci
  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "style") n.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null) return;
      if (typeof c === "string") n.appendChild(document.createTextNode(c));
      else n.appendChild(c);
    });
    return n;
  }

  function ensureStyles() {
    if (document.getElementById("orionChatStyles")) return;

    const css = `
      .orionChatLauncher{
        position:fixed; right:18px; bottom:18px; z-index:99999;
        width:56px; height:56px; border-radius:18px;
        background:#ffffff; border:1px solid rgba(30,58,138,.18);
        box-shadow:0 16px 40px rgba(0,0,0,.14);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; user-select:none;
      }
      .orionChatLauncher:hover{ transform: translateY(-1px); }
      .orionChatLauncher svg{ width:26px; height:26px; }

      .orionChatOverlay{
        position:fixed; inset:0; z-index:99998;
        background: rgba(10,14,28,.42);
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
      .orionChatTitle{ font-weight:900; font-size:16px; line-height:1.2; color:#0b1220; }
      .orionChatSub{ margin-top:2px; color:rgba(15,23,42,.65); font-size:13px; }
      .orionChatClose{
        width:34px; height:34px; border-radius:12px;
        background:#fff; border:1px solid rgba(15,23,42,.12);
        cursor:pointer;
      }

      /* TĚLO: flex layout, aby log měl vlastní scroll */
      .orionChatBody{
        height: calc(100% - 64px);
        display:flex; flex-direction:column;
        gap:10px;
        padding:12px 14px 14px 14px;
      }

      /* LOG: JEDINÉ místo, které scrolluje */
      .orionChatMessages{
        flex: 1 1 auto;
        overflow:auto;
        padding-right:6px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .orionMsg{
        max-width: 92%;
        border-radius:16px;
        padding:10px 12px;
        border:1px solid rgba(30,58,138,.10);
        line-height:1.35;
        color:#0b1220;
        word-wrap: break-word;
      }
      .orionMsg.assistant{
        background:#f6f8ff;
        align-self:flex-start;
      }
      .orionMsg.user{
        background:#1e40af;
        color:#fff;
        border:1px solid rgba(30,58,138,.24);
        align-self:flex-end;
      }
      .orionMsg.meta{
        background:#fff7ed;
        border:1px solid rgba(249,115,22,.25);
        align-self:flex-start;
        color:#7c2d12;
      }

      .orionChatQuickRow{
        flex: 0 0 auto;
        display:flex; flex-wrap:wrap; gap:10px;
      }
      .orionChatQR{
        background:#1e40af; color:#fff; border:none; cursor:pointer;
        padding:10px 12px; border-radius:999px; font-weight:800;
      }

      .orionChatInputRow{
        flex: 0 0 auto;
        display:flex; gap:10px; align-items:center;
      }
      .orionChatInput{
        flex:1; padding:12px 12px; border-radius:16px;
        border:1px solid #c9c5ff; background:#eef3ff; outline:none;
      }
      .orionChatSend{
        width:46px; height:46px;
        border-radius:16px; border:1px solid rgba(15,23,42,.12);
        background:#fff; cursor:pointer;
      }
    `;

    document.head.appendChild(el("style", { id: "orionChatStyles" }, css));
  }

  function parseAssistantText(data) {
    // n8n u tebe vrací: { "output": "..." }
    if (!data) return "";
    if (typeof data === "string") return data;

    const candidates = [
      data.output,
      data.answer,
      data.text,
      data.message,
      data.response,
      data.result,
    ];

    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c.trim();
    }

    // fallback: zkus první string uvnitř objektu
    try {
      const firstString = Object.values(data).find(v => typeof v === "string" && v.trim());
      return firstString ? firstString.trim() : "";
    } catch (_) {
      return "";
    }
  }

  async function sendToN8n(userText) {
    if (!WEBHOOK) throw new Error("Chybí N8N_WEBHOOK_URL v config.js");

    // držím stejný payload jako tvůj test (chatInput/sessionId/history/meta)
    const sessionId = localStorage.getItem("orion_sessionId") || "web";
    const payload = {
      chatInput: userText,
      sessionId,
      history: [],
      meta: { source: "web", page: location.pathname }
    };

    const r = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "*/*" },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) {}

    if (!r.ok) {
      const msg = (json && (json.message || json.error)) ? (json.message || json.error) : text;
      throw new Error(msg || `HTTP ${r.status}`);
    }

    return json ?? text;
  }

  function mount() {
    ensureStyles();

    const overlay = el("div", { class: "orionChatOverlay", id: "orionChatOverlay" });
    const panel = el("div", { class: "orionChatPanel", id: "orionChatPanel" });

    // HEADER
    const header = el("div", { class: "orionChatHeader" }, [
      el("div", {}, [
        el("div", { class: "orionChatTitle" }, "Orion • AI Web Assistant"),
        el("div", { class: "orionChatSub" }, "Prezentační ukázka (web/e-shop scénáře)")
      ]),
      el("button", { class: "orionChatClose", type: "button", "aria-label": "Zavřít" }, "✕")
    ]);

    // BODY
    const body = el("div", { class: "orionChatBody" });

    const messages = el("div", { class: "orionChatMessages", id: "orionChatMessages" });

    // Úvodní zpráva (vykání)
    messages.appendChild(el("div", { class: "orionMsg assistant" },
      "Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže."
    ));

    const quickRow = el("div", { class: "orionChatQuickRow" });
    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Dá se to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Mám zájem o nezávaznou konzultaci"
    ];

    quick.forEach((t) => {
      const b = el("button", { class: "orionChatQR", type: "button" }, t);
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", {
      class: "orionChatInput",
      placeholder: "Napište dotaz…",
      type: "text",
      autocomplete: "off"
    });
    const sendBtn = el("button", {
      class: "orionChatSend",
      type: "button",
      "aria-label": "Odeslat"
    }, "➤");

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    body.appendChild(messages);
    body.appendChild(quickRow);
    body.appendChild(inputRow);

    panel.appendChild(header);
    panel.appendChild(body);

    // LAUNCHER
    const launcher = el("div", {
      class: "orionChatLauncher",
      id: "orionChatLauncher",
      title: "Otevřít chat"
    }, [
      el("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" }, [
        el("path", {
          d: "M7 8h10M7 12h7M12 20c5 0 9-3.6 9-8s-4-8-9-8-9 3.6-9 8c0 2.2 1 4.2 2.7 5.7L5 20l4.2-1.4c.9.3 1.8.4 2.8.4Z",
          stroke: "#1e40af",
          "stroke-width": "1.8",
          "stroke-linecap": "round",
          "stroke-linejoin": "round"
        })
      ])
    ]);

    function open() {
      overlay.style.display = "block";
      panel.style.display = "block";
      setTimeout(() => input.focus(), 30);
    }
    function close() {
      overlay.style.display = "none";
      panel.style.display = "none";
    }

    launcher.addEventListener("click", open);
    overlay.addEventListener("click", close);
    header.querySelector(".orionChatClose").addEventListener("click", close);

    function scrollToBottom() {
      messages.scrollTop = messages.scrollHeight;
    }

    function addMsg(text, who) {
      const node = el("div", { class: `orionMsg ${who}` }, text);
      messages.appendChild(node);
      scrollToBottom();
      return node;
    }

    let busy = false;

    async function handleSend(text) {
      const t = String(text || "").trim();
      if (!t || busy) return;

      busy = true;
      sendBtn.disabled = true;
      input.disabled = true;

      addMsg(t, "user");

      // loader
      const loading = addMsg("Ověřuji…", "assistant");

      try {
        const data = await sendToN8n(t);
        const assistantText = parseAssistantText(data) || "Děkuji. Upřesníte prosím, zda jde o e-shop nebo firemní web a co má asistent řešit nejčastěji?";
        loading.textContent = assistantText;
      } catch (e) {
        loading.classList.remove("assistant");
        loading.classList.add("meta");
        loading.textContent =
          "Omlouvám se, došlo k dočasné chybě ukázky. Zkuste to prosím znovu, případně napište přes kontakt.";
      } finally {
        busy = false;
        sendBtn.disabled = false;
        input.disabled = false;
        input.value = "";
        input.focus();
        scrollToBottom();
      }
    }

    sendBtn.addEventListener("click", () => handleSend(input.value));
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
