/* assets/js/chat.js
   Robustní widget: vždy vloží ikonku + panel do stránky.
   Odpovědi se zobrazují DOLE (pod quick replies) v message logu.
*/
(function () {
  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  // zabrání dvojité inicializaci
  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

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
        transition: transform .12s ease;
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
        padding:12px 14px;
        height: calc(100% - 64px);
        display:flex; flex-direction:column;
        gap:10px;
      }

      /* horní intro (NEMĚNÍME) */
      .orionChatIntro{
        background:#f6f8ff; border:1px solid rgba(30,58,138,.10);
        border-radius:16px; padding:10px 12px; color:#0b1220;
      }

      .orionChatQuickRow{ display:flex; flex-wrap:wrap; gap:10px; }
      .orionChatQR{
        background:#1e40af; color:#fff; border:none; cursor:pointer;
        padding:10px 12px; border-radius:999px; font-weight:700;
      }
      .orionChatQR:active{ transform: translateY(1px); }

      /* LOG ZPRÁV: POD quick replies */
      .orionChatMessages{
        flex:1;
        overflow:auto;
        display:flex;
        flex-direction:column;
        gap:10px;
        padding:6px 2px;
      }

      .orionMsg{
        max-width: 92%;
        border-radius:16px;
        padding:10px 12px;
        border:1px solid rgba(15,23,42,.10);
        background:#fff;
        color:#0b1220;
        line-height:1.35;
        word-break: break-word;
      }
      .orionMsg.user{
        margin-left:auto;
        border-color: rgba(30,58,138,.18);
        background:#eef3ff;
      }
      .orionMsg.bot{
        margin-right:auto;
        background:#f8fafc;
      }
      .orionMsg.meta{
        opacity:.75;
        font-size:12px;
        padding:8px 10px;
        border-style:dashed;
      }

      .orionChatInputRow{ display:flex; gap:10px; }
      .orionChatInput{
        flex:1; padding:12px 12px; border-radius:16px;
        border:1px solid #c9c5ff; background:#eef3ff; outline:none;
      }
      .orionChatSend{
        width:46px; border-radius:16px; border:1px solid rgba(15,23,42,.12);
        background:#fff; cursor:pointer;
      }
    `;

    const style = el("style", { id: "orionChatBaseStyles" }, css);
    document.head.appendChild(style);
  }

  function extractAnswer(resp) {
    // pokus o několik běžných struktur
    if (!resp) return "";
    if (typeof resp === "string") return resp;

    if (resp.answer) return String(resp.answer);
    if (resp.text) return String(resp.text);
    if (resp.message && typeof resp.message === "string") return String(resp.message);

    if (resp.output) {
      if (resp.output.answer) return String(resp.output.answer);
      if (resp.output.text) return String(resp.output.text);
      if (resp.output.message) return String(resp.output.message);
    }

    // někdy přijde pole nebo objekt s první položkou
    if (Array.isArray(resp) && resp.length) {
      const first = resp[0];
      return extractAnswer(first);
    }

    // fallback: zkus JSON stringify
    try {
      return JSON.stringify(resp);
    } catch {
      return "";
    }
  }

  async function sendToN8n(text) {
    if (!WEBHOOK) return { ok: false, error: "missing_webhook" };

    try {
      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // držíme kompatibilitu s tvým webhookem – posíláme message
        body: JSON.stringify({ message: text })
      });

      const raw = await r.text();
      let data = null;
      try { data = JSON.parse(raw); } catch { data = raw; }

      if (!r.ok) return { ok: false, status: r.status, data };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: String(e) };
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

    // Intro – zůstává nahoře, NIKDY ho nepřepisujeme
    const intro = el(
      "div",
      { class: "orionChatIntro" },
      `Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže.`
    );

    const quickRow = el("div", { class: "orionChatQuickRow" });
    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Dá se to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Mám zájem o nezávaznou konzultaci"
    ];

    const messages = el("div", { class: "orionChatMessages", id: "orionChatMessages" });

    function pushMessage(kind, text) {
      const msg = el("div", { class: `orionMsg ${kind}` }, String(text));
      messages.appendChild(msg);
      // scroll dolů
      messages.scrollTop = messages.scrollHeight;
    }

    quick.forEach((t) => {
      const b = el("button", { class: "orionChatQR", type: "button" }, t);
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", { class: "orionChatInput", placeholder: "Napište dotaz…", type: "text" });
    const send = el("button", { class: "orionChatSend", type: "button", "aria-label": "Odeslat" }, "➤");
    inputRow.appendChild(input);
    inputRow.appendChild(send);

    body.appendChild(intro);
    body.appendChild(quickRow);
    body.appendChild(messages);
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
      const q = String(text || "").trim();
      if (!q) return;

      // user message do logu (DOLE)
      pushMessage("user", q);
      input.value = "";

      // meta message
      const meta = el("div", { class: "orionMsg meta" }, "Odesílám…");
      messages.appendChild(meta);
      messages.scrollTop = messages.scrollHeight;

      const resp = await sendToN8n(q);

      // odstraníme “Odesílám…”
      meta.remove();

      if (!resp.ok) {
        // když n8n selže, nedělej paniku – jen slušná hláška
        pushMessage("bot", "Omlouvám se, teď se ukázka nepodařila odeslat. Zkuste to prosím za chvíli, nebo napište přes kontakt.");
        return;
      }

      const answer = extractAnswer(resp.data);
      if (answer) pushMessage("bot", answer);
      else pushMessage("bot", "Děkuji. Můžete prosím upřesnit, zda jde o e-shop nebo firemní web a co má asistent řešit nejčastěji?");
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
