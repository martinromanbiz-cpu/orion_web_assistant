/* assets/js/chat.js
   Orion chat widget – self-mount (ikonka + panel vždy), bez závislosti na HTML.
   n8n payload: { chatInput, sessionId, sourceUrl, userAgent }
*/
(function () {
  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  // zabrání dvojité inicializaci (kdyby se script načetl omylem víckrát)
  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

  const LS_KEY = "orion_session_id";
  const sessionId = (localStorage.getItem(LS_KEY) || cryptoId());
  localStorage.setItem(LS_KEY, sessionId);

  function cryptoId() {
    try {
      return (crypto.randomUUID && crypto.randomUUID()) || ("sess_" + Math.random().toString(16).slice(2));
    } catch {
      return "sess_" + Math.random().toString(16).slice(2);
    }
  }

  function el(tag, attrs = {}, text = "") {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "style") n.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    if (text) n.textContent = text;
    return n;
  }

  function ensureStyles() {
    if (document.getElementById("orionChatBaseStyles")) return;

    const css = `
      .orionChatLauncher{
        position:fixed; right:18px; bottom:18px; z-index:99999;
        width:56px; height:56px; border-radius:18px;
        background:#ffffff; border:1px solid rgba(30,58,138,.18);
        box-shadow:0 18px 50px rgba(0,0,0,.18);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; user-select:none;
        transition: transform .12s ease, box-shadow .12s ease;
      }
      .orionChatLauncher:hover{ transform: translateY(-2px); box-shadow:0 22px 60px rgba(0,0,0,.20); }
      .orionChatLauncher svg{ width:26px; height:26px; }

      .orionChatOverlay{
        position:fixed; inset:0; z-index:99998;
        background: rgba(10,14,28,.45);
        display:none;
      }

      .orionChatPanel{
        position:fixed; right:18px; bottom:88px; z-index:99999;
        width:380px; max-width: calc(100vw - 36px);
        height:560px; max-height: calc(100vh - 120px);
        background:#fff;
        border:1px solid rgba(30,58,138,.14);
        border-radius:22px;
        box-shadow:0 30px 90px rgba(0,0,0,.22);
        display:none; overflow:hidden;
      }

      .orionChatHeader{
        padding:14px 14px 12px 14px;
        border-bottom:1px solid rgba(15,23,42,.08);
        display:flex; align-items:flex-start; justify-content:space-between;
        gap:10px;
      }
      .orionChatTitle{ font-weight:800; font-size:16px; line-height:1.2; }
      .orionChatSub{ margin-top:2px; color:rgba(15,23,42,.65); font-size:13px; }

      .orionChatClose{
        width:36px; height:36px; border-radius:14px;
        background:#fff; border:1px solid rgba(15,23,42,.12);
        cursor:pointer;
      }

      .orionChatBody{
        padding:12px 14px;
        height: calc(100% - 68px);
        display:flex; flex-direction:column; gap:10px;
      }

      .orionChatMsgs{
        flex:1;
        overflow:auto;
        padding-right:6px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .orionMsgRow{ display:flex; }
      .orionMsgRow.user{ justify-content:flex-end; }
      .orionMsgRow.bot{ justify-content:flex-start; }

      .orionBubble{
        max-width: 85%;
        border-radius:16px;
        padding:10px 12px;
        border:1px solid rgba(30,58,138,.10);
        background:#f6f8ff;
        color:#0b1220;
        line-height:1.35;
        white-space:pre-wrap;
      }
      .orionMsgRow.user .orionBubble{
        background:#1e40af;
        color:#fff;
        border-color: rgba(30,64,175,.35);
      }

      .orionChatQuickRow{ display:flex; flex-wrap:wrap; gap:10px; }
      .orionChatQR{
        background:#1e40af; color:#fff; border:none; cursor:pointer;
        padding:10px 12px; border-radius:999px; font-weight:800;
      }

      .orionChatInputRow{ display:flex; gap:10px; }
      .orionChatInput{
        flex:1;
        padding:12px 12px;
        border-radius:16px;
        border:1px solid #c7c3ff;
        background:#eef3ff; /* modro-šedá se slabým fialovým nádechem */
        outline:none;
      }
      .orionChatSend{
        width:48px;
        border-radius:16px;
        border:1px solid rgba(15,23,42,.12);
        background:#fff;
        cursor:pointer;
        font-weight:800;
      }

      .orionChatHint{
        margin-top:-4px;
        font-size:12px;
        color:rgba(15,23,42,.55);
      }

      @media (max-width: 420px){
        .orionChatPanel{ width: calc(100vw - 24px); right:12px; bottom:84px; }
        .orionChatLauncher{ right:12px; bottom:12px; }
      }
    `;

    const style = document.createElement("style");
    style.id = "orionChatBaseStyles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  async function callN8n(text) {
  if (!WEBHOOK) return { ok: false, error: "Missing webhook URL" };

  // Pošli více variant klíčů, ať to sedne na workflow (chatInput / message / text)
  const payload = {
    chatInput: text,
    message: text,
    text: text
  };

  try {
    const r = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const raw = await r.text().catch(() => "");
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (_) {}

    return { ok: r.ok, status: r.status, data, raw };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

    const payload = {
      chatInput,
      sessionId,
      sourceUrl: location.href,
      userAgent: navigator.userAgent
    };

    try {
      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const raw = await r.text();
      let json = null;
      try { json = JSON.parse(raw); } catch {}

      if (!r.ok) {
        const msg = (json && (json.message || json.error)) || raw || ("HTTP " + r.status);
        return { ok: false, text: `Chyba (${r.status}): ${msg}` };
      }

      // kompatibilita s různými výstupy z n8n
      const answer =
        (json && (json.output || json.answer || json.text || json.message)) ||
        raw ||
        "OK";

      return { ok: true, text: String(answer) };
    } catch (e) {
      return { ok: false, text: "Síťová chyba: " + (e && e.message ? e.message : String(e)) };
    }
  }

  function mount() {
    ensureStyles();

    const overlay = el("div", { class: "orionChatOverlay", id: "orionChatOverlay" });
    const panel = el("div", { class: "orionChatPanel", id: "orionChatPanel" });

    const header = el("div", { class: "orionChatHeader" });
    const titleWrap = el("div", {});
    const title = el("div", { class: "orionChatTitle" }, "Orion • AI Web Assistant");
    const sub = el("div", { class: "orionChatSub" }, "Prezentační ukázka (web/e-shop scénáře)");
    titleWrap.appendChild(title);
    titleWrap.appendChild(sub);

    const closeBtn = el("button", { class: "orionChatClose", type: "button", "aria-label": "Zavřít" }, "✕");
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    const body = el("div", { class: "orionChatBody" });
    const msgs = el("div", { class: "orionChatMsgs", id: "orionChatMsgs" });

    const intro = addBot("Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže.");
    msgs.appendChild(intro);

    const quickRow = el("div", { class: "orionChatQuickRow" });
    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Dá se to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Chci nezávaznou konzultaci"
    ];

    quick.forEach((t) => {
      const b = el("button", { class: "orionChatQR", type: "button" }, t);
      b.addEventListener("click", () => sendText(t));
      quickRow.appendChild(b);
    });

    const hint = el("div", { class: "orionChatHint" }, "Tip: quick dotazy jsou schválně výrazné – ať je hned vidět demo UX.");

    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", { class: "orionChatInput", placeholder: "Napište dotaz…", type: "text" });
    const send = el("button", { class: "orionChatSend", type: "button", "aria-label": "Odeslat" }, "➤");
    inputRow.appendChild(input);
    inputRow.appendChild(send);

    body.appendChild(msgs);
    body.appendChild(quickRow);
    body.appendChild(hint);
    body.appendChild(inputRow);

    panel.appendChild(header);
    panel.appendChild(body);

    const launcher = document.createElement("div");
    launcher.className = "orionChatLauncher";
    launcher.id = "orionChatLauncher";
    launcher.title = "Otevřít chat";
    launcher.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 8h10M7 12h7M12 20c5 0 9-3.6 9-8s-4-8-9-8-9 3.6-9 8c0 2.2 1 4.2 2.7 5.7L5 20l4.2-1.4c.9.3 1.8.4 2.8.4Z"
              stroke="#1e40af" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    function open() {
      overlay.style.display = "block";
      panel.style.display = "block";
      setTimeout(() => input.focus(), 0);
      scrollBottom();
    }
    function close() {
      overlay.style.display = "none";
      panel.style.display = "none";
    }
    function scrollBottom() {
      msgs.scrollTop = msgs.scrollHeight;
    }

    function addRow(kind, text) {
      const row = el("div", { class: "orionMsgRow " + kind });
      const bubble = el("div", { class: "orionBubble" });
      bubble.textContent = text;
      row.appendChild(bubble);
      return row;
    }
    function addBot(text) { return addRow("bot", text); }
    function addUser(text) { return addRow("user", text); }

    async function sendText(text) {
      const t = String(text || "").trim();
      if (!t) return;

      // UI: zobraz user message hned
      msgs.appendChild(addUser(t));
      scrollBottom();
      input.value = "";

      // “thinking” bubble
      const thinking = addBot("…");
      msgs.appendChild(thinking);
      scrollBottom();

      const resp = await callN8n(t);

      // nahraď thinking
      thinking.querySelector(".orionBubble").textContent = resp.text;
      scrollBottom();
    }

    launcher.addEventListener("click", open);
    overlay.addEventListener("click", close);
    closeBtn.addEventListener("click", close);

    send.addEventListener("click", () => sendText(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendText(input.value);
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
