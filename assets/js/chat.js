/* assets/js/chat.js
   Orion chat widget – robustní, scrollovatelný, zprávy dole, quick replies zůstávají.
   Payload do n8n: { chatInput, sessionId, history, meta }
*/
(function () {
  "use strict";

  // zabrání dvojité inicializaci (když se omylem načte skript 2×)
  if (window.__ORION_CHAT_WIDGET__) return;
  window.__ORION_CHAT_WIDGET__ = true;

  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = (CFG.N8N_WEBHOOK_URL || "").trim();

  // -------- helpers
  const qs = (sel, root = document) => root.querySelector(sel);

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "style") n.style.cssText = String(v);
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, String(v));
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c === null || c === undefined) return;
      if (typeof c === "string") n.appendChild(document.createTextNode(c));
      else n.appendChild(c);
    });
    return n;
  }

  function escapeHTML(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function makeSessionId() {
    const key = "orion_sessionId";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = "orion-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
    localStorage.setItem(key, id);
    return id;
  }

  // history ukládáme jako array: [{role:"user"|"assistant", content:"..."}]
  function loadHistory() {
    try {
      const raw = localStorage.getItem("orion_history");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function saveHistory(arr) {
    try {
      localStorage.setItem("orion_history", JSON.stringify(arr.slice(-12)));
    } catch {}
  }

  function normalizeAnswer(data) {
    if (!data) return "";
    if (typeof data === "string") return data;
    if (typeof data.output === "string") return data.output;
    if (typeof data.answer === "string") return data.answer;
    if (typeof data.text === "string") return data.text;
    // fallback: první string v objektu
    for (const k of Object.keys(data)) {
      if (typeof data[k] === "string") return data[k];
    }
    return "";
  }

  // -------- styles
  function ensureStyles() {
    if (document.getElementById("orionChatStyles")) return;

    const css = `
      :root{
        --orion-blue:#1e40af;
        --orion-blue2:#2563eb;
        --orion-ink:#0b1220;
        --orion-muted: rgba(11,18,32,.68);
        --orion-card:#ffffff;
        --orion-bg: rgba(10,14,28,.38);
        --orion-lav:#f2f3ff;
        --orion-input:#eef3ff;
        --orion-border: rgba(30,58,138,.16);
        --orion-shadow: 0 24px 80px rgba(0,0,0,.20);
        --orion-radius: 22px;
      }

      /* launcher */
      .orionChatFab{
        position:fixed; right:18px; bottom:18px; z-index:99999;
        width:56px; height:56px; border-radius:18px;
        background:var(--orion-card);
        border:1px solid var(--orion-border);
        box-shadow:0 16px 40px rgba(0,0,0,.14);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; user-select:none;
        transition: transform .12s ease, box-shadow .12s ease;
      }
      .orionChatFab:hover{ transform: translateY(-1px); box-shadow:0 18px 44px rgba(0,0,0,.16); }
      .orionChatFab svg{ width:26px; height:26px; }

      /* overlay + panel */
      .orionChatOverlay{
        position:fixed; inset:0; z-index:99998;
        background: var(--orion-bg);
        display:none;
      }
      .orionChatPanel{
        position:fixed; right:18px; bottom:86px; z-index:99999;
        width:390px; max-width: calc(100vw - 36px);
        height:560px; max-height: calc(100vh - 120px);
        background:var(--orion-card);
        border:1px solid var(--orion-border);
        border-radius: var(--orion-radius);
        box-shadow: var(--orion-shadow);
        display:none;
        overflow:hidden;
      }

      /* header */
      .orionChatHeader{
        padding:14px 14px 10px 14px;
        border-bottom:1px solid rgba(15,23,42,.08);
        display:flex; align-items:flex-start; justify-content:space-between; gap:10px;
        background: linear-gradient(180deg, rgba(242,243,255,.95), rgba(255,255,255,1));
      }
      .orionChatTitle{ font-weight:900; font-size:16px; line-height:1.2; color:var(--orion-ink); }
      .orionChatSub{ margin-top:2px; color:var(--orion-muted); font-size:13px; }
      .orionChatClose{
        width:36px; height:36px; border-radius:14px;
        background:#fff; border:1px solid rgba(15,23,42,.14);
        cursor:pointer;
      }

      /* layout: messages (scroll) + quick + input */
      .orionChatMain{
        height: calc(100% - 64px);
        display:flex; flex-direction:column;
      }

      .orionChatMessages{
        flex:1;
        overflow-y:auto;
        padding:12px 14px;
        display:flex;
        flex-direction:column;
        gap:10px;
        background: #ffffff;
      }

      .orionMsgRow{
        display:flex; gap:10px; align-items:flex-end;
      }
      .orionMsgRow.user{ justify-content:flex-end; }
      .orionAvatar{
        width:28px; height:28px; border-radius:999px;
        border:1px solid rgba(15,23,42,.12);
        background:#fff;
        display:flex; align-items:center; justify-content:center;
        overflow:hidden;
        flex:0 0 auto;
      }
      .orionAvatar img{ width:100%; height:100%; object-fit:cover; display:block; }
      .orionAvatarUser{
        background: #f3f4f6;
        color: rgba(15,23,42,.55);
        font-weight:800;
        font-size:12px;
      }

      .orionBubble{
        max-width: 78%;
        border-radius: 18px;
        padding: 10px 12px;
        border:1px solid rgba(30,58,138,.10);
        background: var(--orion-lav);
        color: var(--orion-ink);
        line-height:1.35;
        word-break: break-word;
        white-space: pre-wrap;
      }
      .orionBubble.user{
        background: #1e40af;
        border-color: rgba(30,58,138,.22);
        color:#fff;
      }

      .orionChatQuickWrap{
        padding:10px 14px 10px 14px;
        border-top:1px solid rgba(15,23,42,.06);
        background: linear-gradient(180deg, rgba(255,255,255,1), rgba(242,243,255,.75));
      }
      .orionChatQuickRow{
        display:flex; flex-wrap:wrap; gap:10px;
      }
      .orionChip{
        background: var(--orion-blue);
        color:#fff;
        border:none;
        cursor:pointer;
        padding:10px 12px;
        border-radius:999px;
        font-weight:800;
        font-size:14px;
        line-height:1;
        box-shadow: 0 8px 18px rgba(30,64,175,.18);
      }
      .orionChip:hover{ background: var(--orion-blue2); }

      .orionChatInputRow{
        padding:10px 14px 14px 14px;
        display:flex; gap:10px;
        background: rgba(255,255,255,1);
      }
      .orionChatInput{
        flex:1;
        padding:12px 12px;
        border-radius:16px;
        border:1px solid rgba(140, 122, 255, .45);
        background: var(--orion-input);
        outline:none;
      }
      .orionChatSend{
        width:52px;
        border-radius:16px;
        border:1px solid rgba(15,23,42,.14);
        background:#fff;
        cursor:pointer;
        display:flex; align-items:center; justify-content:center;
      }
      .orionChatSend svg{ width:18px; height:18px; }

      .orionTyping{
        opacity:.7;
        font-size:13px;
      }
    `;

    document.head.appendChild(el("style", { id: "orionChatStyles" }, css));
  }

  // -------- widget
  function mount() {
    ensureStyles();

    // UI
    const overlay = el("div", { class: "orionChatOverlay", id: "orionChatOverlay" });
    const panel = el("div", { class: "orionChatPanel", id: "orionChatPanel" });

    const header = el("div", { class: "orionChatHeader" }, [
      el("div", {}, [
        el("div", { class: "orionChatTitle" }, ["Orion • AI Web Assistant"]),
        el("div", { class: "orionChatSub" }, ["Prezentační ukázka (web/e-shop scénáře)"]),
      ]),
      el("button", { class: "orionChatClose", type: "button", "aria-label": "Zavřít" }, ["✕"]),
    ]);

    const main = el("div", { class: "orionChatMain" });

    const messages = el("div", { class: "orionChatMessages", id: "orionChatMessages" });
    const quickWrap = el("div", { class: "orionChatQuickWrap" });
    const quickRow = el("div", { class: "orionChatQuickRow" });
    quickWrap.appendChild(quickRow);

    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", {
      class: "orionChatInput",
      type: "text",
      placeholder: "Napište dotaz…",
      autocomplete: "off",
    });
    const sendBtn = el(
      "button",
      { class: "orionChatSend", type: "button", "aria-label": "Odeslat" },
      el(
        "svg",
        { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
        el("path", {
          d: "M4 12l16-8-4 16-4-6-4 2 1-4z",
          stroke: "#1e40af",
          "stroke-width": "1.8",
          "stroke-linejoin": "round",
        })
      )
    );

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    main.appendChild(messages);
    main.appendChild(quickWrap);
    main.appendChild(inputRow);

    panel.appendChild(header);
    panel.appendChild(main);

    // launcher
    const launcher = el(
      "div",
      { class: "orionChatFab", id: "orionChatFab", title: "Otevřít chat", "aria-label": "Otevřít chat", role: "button" },
      `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 8h10M7 12h7M12 20c5 0 9-3.6 9-8s-4-8-9-8-9 3.6-9 8c0 2.2 1 4.2 2.7 5.7L5 20l4.2-1.4c.9.3 1.8.4 2.8.4Z"
              stroke="#1e40af" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `
    );

    // avatars
    const ORION_AVATAR_URL = "./assets/img/orion-mark.svg";

    function avatarOrion() {
      const a = el("div", { class: "orionAvatar" });
      a.appendChild(el("img", { src: ORION_AVATAR_URL, alt: "Orion" }));
      return a;
    }
    function avatarUser() {
      // čisté “blank” kolečko bez externích assetů
      const a = el("div", { class: "orionAvatar orionAvatarUser", title: "Vy" }, ["●"]);
      return a;
    }

    // state
    const sessionId = makeSessionId();
    let history = loadHistory(); // [{role,content}]
    let isOpen = false;

    const QUICK = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Dá se to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Mám zájem o nezávaznou konzultaci",
    ];

    QUICK.forEach((t) => {
      const b = el("button", { class: "orionChip", type: "button" }, t);
      b.addEventListener("click", () => send(t));
      quickRow.appendChild(b);
    });

    function scrollToBottom() {
      // vždycky dotáhnout na poslední zprávu
      messages.scrollTop = messages.scrollHeight;
    }

    function addMessage(role, text) {
      const isUser = role === "user";
      const row = el("div", { class: "orionMsgRow " + (isUser ? "user" : "assistant") });

      if (!isUser) row.appendChild(avatarOrion());

      const bubble = el("div", { class: "orionBubble " + (isUser ? "user" : "") });
      bubble.innerHTML = escapeHTML(text);
      row.appendChild(bubble);

      if (isUser) row.appendChild(avatarUser());

      messages.appendChild(row);
      scrollToBottom();
      return bubble;
    }

    function ensureIntro() {
      if (history.length) return;

      const intro =
        "Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže.";
      addMessage("assistant", intro);
      history.push({ role: "assistant", content: intro });
      saveHistory(history);
    }

    function rebuildFromHistory() {
      messages.innerHTML = "";
      if (!history.length) {
        ensureIntro();
        return;
      }
      history.forEach((m) => addMessage(m.role, m.content));
    }

    async function callN8n(userText) {
      if (!WEBHOOK) {
        return { ok: false, answer: "Chybí napojení na webhook (N8N_WEBHOOK_URL)." };
      }

      // n8n router workflow typicky chce chatInput/sessionId/history/meta
      const payload = {
        chatInput: userText,
        sessionId,
        history: history.map((m) => ({ role: m.role, content: m.content })).slice(-12),
        meta: { source: "orion_web", page: location.pathname },
      };

      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await r.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // někdy n8n vrací text
        data = { output: text };
      }

      return { ok: r.ok, status: r.status, data };
    }

    async function send(text) {
      const userText = String(text || "").trim();
      if (!userText) return;

      // user message
      addMessage("user", userText);
      history.push({ role: "user", content: userText });
      history = history.slice(-12);
      saveHistory(history);

      // typing placeholder (assistant)
      const typingBubble = addMessage("assistant", "Píšu odpověď…");
      typingBubble.classList.add("orionTyping");

      try {
        const res = await callN8n(userText);
        const answer = normalizeAnswer(res.data) || "";

        if (!res.ok) {
          typingBubble.innerHTML =
            escapeHTML("Došlo k dočasné chybě v ukázce. Zkuste to prosím znovu, případně použijte kontakt.");
        } else if (!answer) {
          typingBubble.innerHTML =
            escapeHTML("Děkuji. Upřesníte prosím dotaz k webu nebo e-shopu (co má asistent řešit nejčastěji)?");
        } else {
          typingBubble.innerHTML = escapeHTML(answer);
        }
      } catch (e) {
        typingBubble.innerHTML =
          escapeHTML("Došlo k dočasné chybě v ukázce. Zkuste to prosím znovu, případně použijte kontakt.");
      } finally {
        typingBubble.classList.remove("orionTyping");

        // uložíme assistant odpověď do historie (aby se v konverzaci držel kontext)
        const lastText = typingBubble.textContent || "";
        history.push({ role: "assistant", content: lastText });
        history = history.slice(-12);
        saveHistory(history);

        scrollToBottom();
      }
    }

    function open() {
      isOpen = true;
      overlay.style.display = "block";
      panel.style.display = "block";
      // při otevření vždy zrekonstruovat historii (když se stránka refreshne)
      rebuildFromHistory();
      setTimeout(() => input.focus(), 0);
      scrollToBottom();
    }
    function close() {
      isOpen = false;
      overlay.style.display = "none";
      panel.style.display = "none";
    }

    launcher.addEventListener("click", () => (isOpen ? close() : open()));
    overlay.addEventListener("click", close);
    qs(".orionChatClose", header).addEventListener("click", close);

    sendBtn.addEventListener("click", () => send(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send(input.value);
    });

    // mount to body
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.body.appendChild(launcher);

    // intro only once
    ensureIntro();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
