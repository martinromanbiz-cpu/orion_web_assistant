/* assets/js/chat.js
   Orion chat widget – Prémiová B2B verze s Glassmorphism designem.
   Robustní: autoscroll, error handling z n8n, formální vykání.
*/
(function () {
  "use strict";

  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

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

    // Luxusní temné CSS pro chat widget
    const css = `
      .orionChatFab {animation: fabPulse 2.5s infinite;
        position: fixed; right: 24px; bottom: 24px; z-index: 99999;
        width: 60px; height: 60px; border-radius: 20px;
        background: linear-gradient(135deg, #22d3ee, #0284c7);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 10px 25px rgba(34, 211, 238, 0.4);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; user-select: none; transition: all 0.3s ease;
      }
      @keyframes fabPulse {
    0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.5); }
    70% { box-shadow: 0 0 0 15px rgba(34, 211, 238, 0); }
    100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); }
}
      .orionChatFab:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(34, 211, 238, 0.6); }
      .orionChatFabIcon { width: 32px; height: 32px; }

      .orionOverlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(3, 7, 18, 0.6);
        backdrop-filter: blur(4px);
        display: none;
      }

      .orionPanel {
        position: fixed; right: 24px; bottom: 100px; z-index: 99999;
        width: 400px; max-width: calc(100vw - 48px);
        height: 600px; max-height: calc(100vh - 140px);
        background: rgba(17, 24, 39, 0.85);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        display: none;
        flex-direction: column;
        font-family: 'Inter', sans-serif;
      }

      .orionHeader {
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex; align-items: flex-start; justify-content: space-between;
        background: rgba(255, 255, 255, 0.02);
      }
      .orionTitle { font-weight: 700; font-size: 16px; color: #f9fafb; display:flex; align-items:center; gap: 8px;}
      .orionTitle .status-dot { width: 8px; height: 8px; background: #22d3ee; border-radius: 50%; box-shadow: 0 0 8px #22d3ee;}
      .orionSub { margin-top: 4px; font-size: 12px; color: #9ca3af; }
      .orionClose {
        width: 32px; height: 32px; border-radius: 10px;
        background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .orionClose:hover { background: rgba(255, 255, 255, 0.15); }

      .orionBody { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

      .orionFeed {
        flex: 1; overflow-y: auto; padding: 20px;
        display: flex; flex-direction: column; gap: 16px;
      }
      .orionFeed::-webkit-scrollbar { width: 6px; }
      .orionFeed::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

      .orionMsg { display: flex; gap: 12px; align-items: flex-end; }
      .orionAvatar {
        width: 32px; height: 32px; border-radius: 50%;
        background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3);
        flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
        padding: 4px;
      }
      .orionAvatar img { width: 100%; height: 100%; object-fit: contain; filter: brightness(0) invert(1); }

      .orionBubble {
        max-width: 80%; border-radius: 18px; padding: 12px 16px;
        font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;
      }

      .orionMsg.bot .orionBubble {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #e5e7eb;
        border-bottom-left-radius: 4px;
      }
      
      .orionMsg.user { justify-content: flex-end; }
      .orionMsg.user .orionAvatar { display: none; }
      .orionMsg.user .orionBubble {
        background: linear-gradient(135deg, #22d3ee, #0284c7);
        color: #fff;
        border-bottom-right-radius: 4px;
      }

      .orionBottom {
        padding: 16px 20px; border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.2);
      }
      
      .orionQuickRow { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
      .orionQR {
        background: transparent; color: #22d3ee; border: 1px solid rgba(34, 211, 238, 0.4);
        cursor: pointer; padding: 8px 14px; border-radius: 100px;
        font-weight: 500; font-size: 12px; transition: all 0.2s;
      }
      .orionQR:hover { background: rgba(34, 211, 238, 0.1); border-color: #22d3ee; }

      .orionInputRow { display: flex; gap: 10px; }
      .orionInput {
        flex: 1; padding: 12px 16px; border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(0, 0, 0, 0.3); color: #fff; outline: none; transition: border 0.3s;
      }
      .orionInput:focus { border-color: #22d3ee; }
      .orionInput::placeholder { color: #6b7280; }
      
      .orionSend {
        width: 46px; border-radius: 16px; border: none;
        background: #22d3ee; color: #000; cursor: pointer;
        display: flex; align-items: center; justify-content: center; transition: all 0.2s;
      }
      .orionSend:hover { background: #06b6d4; }
      .orionSend svg { width: 20px; height: 20px; fill: currentColor; }

      @media (max-width: 480px){
        .orionPanel{ width: calc(100vw - 24px); right: 12px; bottom: 90px; height: 75vh; }
        .orionChatFab{ right: 16px; bottom: 16px; }
      }
    `;

    document.head.appendChild(el("style", { id: "orionChatStyles", text: css }));
  }

  async function sendToN8n(text) {
    if (!WEBHOOK) throw new Error("Webhook není nastaven.");

    const payload = {
      chatInput: text,
      sessionId: localStorage.getItem("orion_sessionId") || "orion-" + Math.random().toString(16).slice(2)
    };
    localStorage.setItem("orion_sessionId", payload.sessionId);

    const r = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await r.json().catch(() => null);

    if (!r.ok || !data) {
      throw new Error("Chyba serveru.");
    }

    // Extrakce odpovědi z n8n payloadu
    return data.output || data.text || data.answer || data.message || "Omlouvám se, ale momentálně nemohu požadavek zpracovat.";
  }

  function mount() {
    ensureStyles();

    const overlay = el("div", { class: "orionOverlay", id: "orionOverlay" });
    const panel = el("div", { class: "orionPanel", id: "orionChatPanel" });

    const header = el("div", { class: "orionHeader" }, [
      el("div", {}, [
        el("div", { class: "orionTitle" }, [
            el("span", {class: "status-dot"}),
            el("span", {text: "Orion • AI Konzultant"})
        ]),
        el("div", { class: "orionSub", text: "Zabezpečené firemní spojení" })
      ]),
      el("button", { class: "orionClose", type: "button", text: "✕" })
    ]);

    const body = el("div", { class: "orionBody" });
    const feed = el("div", { class: "orionFeed", id: "orionChatFeed" });

    const bottom = el("div", { class: "orionBottom" });
    const quickRow = el("div", { class: "orionQuickRow" });

    const quick = [
      "Jak probíhá integrace?",
      "Cenové modely",
      "Umíte kvalifikovat leady?",
      "Sjednat konzultaci"
    ];

    const inputRow = el("div", { class: "orionInputRow" });
    const input = el("input", { class: "orionInput", placeholder: "Napište svůj dotaz…", type: "text" });
    
    // Odesílací šipka
    const sendBtn = el("button", { class: "orionSend", type: "button", html: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>` });

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);
    bottom.appendChild(quickRow);
    bottom.appendChild(inputRow);
    body.appendChild(feed);
    body.appendChild(bottom);
    panel.appendChild(header);
    panel.appendChild(body);

    // Chat Ikona (FAB)
    const fab = el("div", { class: "orionChatFab", id: "orionChatFab" });
    fab.innerHTML = `<svg class="orionChatFabIcon" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;

    function openChat() {
      overlay.style.display = "block";
      panel.style.display = "flex";
      setTimeout(() => input.focus(), 50);
      scrollToBottom();
    }
    
    function closeChat() {
      overlay.style.display = "none";
      panel.style.display = "none";
    }
    
    function scrollToBottom() {
      feed.scrollTop = feed.scrollHeight;
    }

    function addMessage(role, text) {
      const msg = el("div", { class: `orionMsg ${role}` });

      if (role === "bot") {
        const av = el("div", { class: "orionAvatar" }, [
          // Fallback ikona pokud SVG chybí
          el("img", { src: "./assets/img/orion-mark.svg", onerror: "this.src='https://cdn-icons-png.flaticon.com/512/2082/2082199.png'" })
        ]);
        msg.appendChild(av);
      }

      const bubble = el("div", { class: "orionBubble", text: text });
      msg.appendChild(bubble);
      feed.appendChild(msg);
      scrollToBottom();
    }

    function addTypingIndicator() {
      const id = 'typing-' + Date.now();
      const msg = el("div", { class: "orionMsg bot", id: id });
      const av = el("div", { class: "orionAvatar" }, [
        el("img", { src: "./assets/img/orion-mark.svg", onerror: "this.src='https://cdn-icons-png.flaticon.com/512/2082/2082199.png'" })
      ]);
      const bubble = el("div", { class: "orionBubble", text: "..." });
      msg.appendChild(av);
      msg.appendChild(bubble);
      feed.appendChild(msg);
      scrollToBottom();
      return id;
    }

    async function handleSend(manualText = null) {
      const text = (manualText || input.value).trim();
      if (!text) return;

      if (!manualText) input.value = "";
      addMessage("user", text);
      
      const typingId = addTypingIndicator();

      try {
        const answer = await sendToN8n(text);
        document.getElementById(typingId)?.remove();
        addMessage("bot", answer);
      } catch (e) {
        document.getElementById(typingId)?.remove();
        addMessage("bot", "Omlouvám se, mé spojení se serverem bylo dočasně přerušeno. Prosím, zkuste dotaz zopakovat nebo využijte náš kontaktní formulář.");
      }
    }

    quick.forEach((t) => {
      const b = el("button", { class: "orionQR", type: "button", text: t });
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    // Úvodní B2B zpráva
    addMessage("bot", "Dobrý den, jsem Orion – Váš digitální AI konzultant. Jak Vám mohu pomoci s optimalizací Vašich firemních procesů?");

    fab.addEventListener("click", openChat);
    overlay.addEventListener("click", closeChat);
    header.querySelector(".orionClose").addEventListener("click", closeChat);

    sendBtn.addEventListener("click", () => handleSend());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend();
    });

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
