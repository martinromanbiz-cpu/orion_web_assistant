/* assets/js/chat.js
   Orion chat widget – scrollovatelný feed + quick replies + input dole.
   Robustní: žádné SVG stringy vypsané na stránku, žádná duplicitní inicializace.
*/
(function () {
  "use strict";

  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  // zabrání dvojité inicializaci (např. při víc skriptech / hot reload)
  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    (children || []).forEach((c) => n.appendChild(c));
    return n;
  }

  function ensureStyles() {
    if (document.getElementById("orionChatStyles")) return;

    const css = `
      .orionChatFab{
        position:fixed; right:18px; bottom:18px; z-index:99999;
        width:56px; height:56px; border-radius:18px;
        background:#ffffff; border:1px solid rgba(30,58,138,.18);
        box-shadow:0 16px 40px rgba(0,0,0,.16);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; user-select:none;
      }
      .orionChatFab:hover{ transform: translateY(-1px); }
      .orionChatFabIcon{ width:28px; height:28px; }

      .orionOverlay{
        position:fixed; inset:0; z-index:99998;
        background: rgba(10,14,28,.40);
        display:none;
      }

      .orionPanel{
        position:fixed; right:18px; bottom:86px; z-index:99999;
        width:380px; max-width: calc(100vw - 36px);
        height:560px; max-height: calc(100vh - 120px);
        background:#ffffff;
        border:1px solid rgba(30,58,138,.14);
        border-radius:22px;
        box-shadow:0 28px 90px rgba(0,0,0,.20);
        overflow:hidden;
        display:none;
      }

      .orionHeader{
        padding:14px 14px 12px 14px;
        border-bottom:1px solid rgba(15,23,42,.08);
        display:flex; align-items:flex-start; justify-content:space-between;
        gap:10px;
        background: linear-gradient(180deg, rgba(238,243,255,.9), rgba(255,255,255,1));
      }
      .orionTitle{ font-weight:900; font-size:16px; line-height:1.2; color:#0b1220; }
      .orionSub{ margin-top:2px; font-size:13px; color:rgba(15,23,42,.65); }
      .orionClose{
        width:36px; height:36px; border-radius:14px;
        background:#fff; border:1px solid rgba(15,23,42,.12);
        cursor:pointer;
        display:flex; align-items:center; justify-content:center;
      }

      .orionBody{
        height: calc(100% - 62px);
        display:flex;
        flex-direction:column;
      }

      /* FEED = scroll */
      .orionFeed{
        flex:1;
        overflow:auto;
        padding:14px;
        display:flex;
        flex-direction:column;
        gap:12px;
      }

      .orionMsg{
        display:flex;
        gap:10px;
        align-items:flex-end;
      }
      .orionAvatar{
        width:30px; height:30px; border-radius:50%;
        background:#eef3ff;
        border:1px solid rgba(30,58,138,.14);
        overflow:hidden;
        flex: 0 0 auto;
        display:flex; align-items:center; justify-content:center;
      }
      .orionAvatar img{ width:100%; height:100%; object-fit:cover; }

      .orionBubble{
        max-width: 78%;
        border-radius:16px;
        padding:10px 12px;
        border:1px solid rgba(30,58,138,.12);
        background:#f6f8ff;
        color:#0b1220;
        line-height:1.35;
        font-size:14px;
        white-space:pre-wrap;
        word-break:break-word;
      }

      .orionMsg.user{ justify-content:flex-end; }
      .orionMsg.user .orionAvatar{ display:none; }
      .orionMsg.user .orionBubble{
        background:#1e40af;
        border-color: rgba(30,58,138,.26);
        color:#fff;
      }

      /* quick replies + input are ALWAYS at bottom */
      .orionBottom{
        padding:12px 14px 14px 14px;
        border-top:1px solid rgba(15,23,42,.08);
        background:#fff;
      }
      .orionQuickRow{
        display:flex; flex-wrap:wrap; gap:10px;
        margin-bottom:12px;
      }
      .orionQR{
        background:#1e40af;
        color:#fff;
        border:none;
        cursor:pointer;
        padding:10px 12px;
        border-radius:999px;
        font-weight:800;
        font-size:13px;
      }
      .orionQR:hover{ filter: brightness(0.96); }

      .orionInputRow{
        display:flex; gap:10px;
      }
      .orionInput{
        flex:1;
        padding:12px 12px;
        border-radius:16px;
        border:1px solid rgba(125,115,255,.45);
        background:#eef3ff; /* modro-šedá s nádechem fialové */
        outline:none;
      }
      .orionSend{
        width:48px;
        border-radius:16px;
        border:1px solid rgba(15,23,42,.12);
        background:#fff;
        cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        font-weight:900;
      }

      /* mobile tweak */
      @media (max-width: 480px){
        .orionPanel{ width: calc(100vw - 24px); right:12px; bottom:78px; height: 70vh; }
        .orionChatFab{ right:12px; bottom:12px; }
      }
    `;

    document.head.appendChild(el("style", { id: "orionChatStyles", text: css }));
  }

  async function sendToN8n(text) {
    if (!WEBHOOK) throw new Error("Missing N8N_WEBHOOK_URL");

    const payload = {
      chatInput: text,
      sessionId: localStorage.getItem("orion_sessionId") || "orion-" + Math.random().toString(16).slice(2),
      history: [],
      meta: { source: "orion-web", page: location.pathname }
    };
    localStorage.setItem("orion_sessionId", payload.sessionId);

    const r = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });

    // n8n někdy vrací JSON i text – zvládneme oboje
    const raw = await r.text();
    let data = null;
    try { data = JSON.parse(raw); } catch { data = null; }

    if (!r.ok) {
      const msg = (data && (data.message || data.error)) || raw || "Dočasná chyba serveru.";
      throw new Error(msg);
    }

    // podporujeme několik možných tvarů
    if (data && typeof data === "object") {
      if (typeof data.output === "string") return data.output;
      if (typeof data.answer === "string") return data.answer;
      if (typeof data.text === "string") return data.text;
      if (typeof data.message === "string") return data.message;
    }
    return raw;
  }

  function mount() {
    ensureStyles();

    // UI
    const overlay = el("div", { class: "orionOverlay", id: "orionOverlay" });
    const panel = el("div", { class: "orionPanel", id: "orionChatPanel" });

    const header = el("div", { class: "orionHeader" }, [
      el("div", {}, [
        el("div", { class: "orionTitle", text: "Orion • AI Web Assistant" }),
        el("div", { class: "orionSub", text: "Prezentační ukázka (web/e-shop scénáře)" })
      ]),
      el("button", { class: "orionClose", type: "button", "aria-label": "Zavřít", text: "✕" })
    ]);

    const body = el("div", { class: "orionBody" });
    const feed = el("div", { class: "orionFeed", id: "orionChatFeed" });

    const bottom = el("div", { class: "orionBottom" });
    const quickRow = el("div", { class: "orionQuickRow" });

    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Dá se to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Mám zájem o nezávaznou konzultaci"
    ];

    const inputRow = el("div", { class: "orionInputRow" });
    const input = el("input", { class: "orionInput", placeholder: "Napište dotaz…", type: "text" });
    const sendBtn = el("button", { class: "orionSend", type: "button", "aria-label": "Odeslat", text: "➤" });

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    bottom.appendChild(quickRow);
    bottom.appendChild(inputRow);

    body.appendChild(feed);
    body.appendChild(bottom);

    panel.appendChild(header);
    panel.appendChild(body);

    // FAB (launcher) – SVG přes DOM, ne innerHTML (žádné “viewBox” texty)
    const fab = el("div", { class: "orionChatFab", id: "orionChatFab", title: "Otevřít chat", role: "button", tabindex: "0" });
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.classList.add("orionChatFabIcon");

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M7 8h10M7 12h7M12 20c5 0 9-3.6 9-8s-4-8-9-8-9 3.6-9 8c0 2.2 1 4.2 2.7 5.7L5 20l4.2-1.4c.9.3 1.8.4 2.8.4Z");
    path.setAttribute("stroke", "#1e40af");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    fab.appendChild(svg);

    // Helpers
    function open() {
      overlay.style.display = "block";
      panel.style.display = "block";
      setTimeout(() => input.focus(), 0);
      scrollToBottom();
    }
    function close() {
      overlay.style.display = "none";
      panel.style.display = "none";
    }
    function scrollToBottom() {
      feed.scrollTop = feed.scrollHeight;
    }

    function addMessage(role, text) {
      const isUser = role === "user";
      const msg = el("div", { class: "orionMsg" + (isUser ? " user" : " bot") });

      if (!isUser) {
        const av = el("div", { class: "orionAvatar" }, [
          el("img", { src: "./assets/img/orion-mark.svg", alt: "Orion" })
        ]);
        msg.appendChild(av);
      }

      const bubble = el("div", { class: "orionBubble", text: String(text || "") });
      msg.appendChild(bubble);

      feed.appendChild(msg);
      scrollToBottom();
    }

    async function handleSend(text) {
      const t = (text || "").trim();
      if (!t) return;

      addMessage("user", t);
      input.value = "";

      try {
        const answer = await sendToN8n(t);
        addMessage("bot", answer || "Děkuji. Upřesníte prosím, zda jde o web nebo e-shop a co má asistent řešit?");
      } catch (e) {
        addMessage("bot", "Omlouvám se, došlo k dočasné chybě na serveru ukázky. Zkuste to prosím znovu, případně použijte kontakt.");
      }
    }

    // Quick replies – NEZMIZÍ, jen odešlou dotaz
    quick.forEach((t) => {
      const b = el("button", { class: "orionQR", type: "button", text: t });
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    // Initial greeting (bot)
    addMessage("bot", "Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže.");

    // Events
    fab.addEventListener("click", open);
    fab.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") open(); });

    overlay.addEventListener("click", close);
    header.querySelector(".orionClose").addEventListener("click", close);

    sendBtn.addEventListener("click", () => handleSend(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend(input.value);
    });

    // Mount to DOM
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.body.appendChild(fab);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
