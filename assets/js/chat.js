/* assets/js/chat.js
   Robustní widget: vždy vloží ikonku + panel do stránky. Bez závislosti na HTML.
   FIX:
   - posílá do n8n i chatInput + sessionId (kompatibilní s n8n Chat Trigger)
   - zachová sessionId v localStorage (konzistence/paměť)
   - quick replies NEzmizí
   - odpovědi se renderují do messages logu (pod quick replies)
*/
(function () {
  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  // zabrání dvojité inicializaci
  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

  // === sessionId (persist) ===
  const SESSION_KEY = "orion_session_id";
  function getSessionId() {
    try {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const sid = "web-" + Math.random().toString(16).slice(2) + Date.now().toString(16);
      localStorage.setItem(SESSION_KEY, sid);
      return sid;
    } catch (e) {
      return "web-" + Math.random().toString(16).slice(2) + Date.now().toString(16);
    }
  }

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

      .orionChatBody{
        padding:12px 14px;
        height: calc(100% - 64px);
        display:flex; flex-direction:column;
        gap:10px;
      }

      .orionChatIntro{
        background:#f6f8ff; border:1px solid rgba(30,58,138,.10);
        border-radius:16px; padding:10px 12px; color:#0b1220;
      }

      .orionChatQuickRow{ display:flex; flex-wrap:wrap; gap:10px; }
      .orionChatQR{
        background:#1e40af; color:#fff; border:none; cursor:pointer;
        padding:10px 12px; border-radius:999px; font-weight:700;
      }

      .orionChatMessages{
        flex:1;
        overflow:auto;
        display:flex; flex-direction:column;
        gap:10px;
        padding-right:2px;
      }
      .orionChatMsg{
        max-width: 92%;
        border-radius:16px;
        padding:10px 12px;
        border:1px solid rgba(15,23,42,.10);
        background:#ffffff;
        color:#0b1220;
        line-height:1.35;
      }
      .orionChatMsg.user{
        margin-left:auto;
        background:#1e40af;
        border-color: rgba(30,58,138,.20);
        color:#ffffff;
      }
      .orionChatMsg.bot{
        margin-right:auto;
        background:#f6f8ff;
        border-color: rgba(30,58,138,.10);
      }
      .orionChatTyping{
        opacity:.8;
        font-style: italic;
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

  function tryParseJson(s) {
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  }

  // n8n někdy vrací JSON, někdy “stream” (více JSON řádků). Zkusíme z toho vytáhnout text.
  function extractN8nAnswer(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return "";

    const direct = tryParseJson(trimmed);
    if (direct) {
      return (
        direct.answer ||
        direct.output ||
        direct.text ||
        (direct.data && (direct.data.answer || direct.data.output || direct.data.text)) ||
        ""
      );
    }

    const lines = trimmed.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    let chunks = [];
    let last = null;

    for (const ln of lines) {
      const obj = tryParseJson(ln);
      if (!obj) continue;
      last = obj;

      const d = obj.data || obj.delta || obj.payload || null;
      const t =
        obj.answer || obj.output || obj.text ||
        (d && (d.answer || d.output || d.text || d.content || d.message)) ||
        null;

      if (typeof t === "string" && t.trim()) chunks.push(t);
    }

    if (chunks.length) return chunks.join("").trim();
    if (last) {
      const d = last.data || {};
      const t = last.answer || last.output || last.text || d.answer || d.output || d.text;
      if (typeof t === "string") return t.trim();
    }
    return trimmed;
  }

  function extractAnswer(resp) {
    if (!resp) return "";
    if (typeof resp === "string") return extractN8nAnswer(resp);

    if (typeof resp.answer === "string") return resp.answer;
    if (typeof resp.text === "string") return resp.text;
    if (typeof resp.message === "string") return resp.message;
    if (typeof resp.output === "string") return resp.output;

    if (resp.output && typeof resp.output === "object") {
      if (typeof resp.output.answer === "string") return resp.output.answer;
      if (typeof resp.output.text === "string") return resp.output.text;
      if (typeof resp.output.message === "string") return resp.output.message;
    }

    if (Array.isArray(resp) && resp.length) return extractAnswer(resp[0]);

    if (typeof resp.raw === "string") return extractN8nAnswer(resp.raw);
    if (typeof resp.data === "string") return extractN8nAnswer(resp.data);

    try {
      return extractN8nAnswer(JSON.stringify(resp));
    } catch {
      return "";
    }
  }

  async function sendToN8n(text) {
    if (!WEBHOOK) return { ok: false, status: 0, error: "missing_webhook" };

    try {
      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          // DŮLEŽITÉ: kompatibilita s n8n Chat Trigger
          chatInput: text,
          // fallback pro případ, že někde čteš “message”
          message: text,
          sessionId: getSessionId(),
          history: [],
          meta: { source: "orion-web" },
        }),
      });

      const raw = await r.text();
      let data = tryParseJson(raw);
      if (!data) data = raw;

      if (!r.ok) return { ok: false, status: r.status, error: raw || "request_failed" };
      return { ok: true, status: r.status, data };
    } catch (e) {
      return { ok: false, status: 0, error: String(e && e.message ? e.message : e) };
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

    const introEl = el(
      "div",
      { class: "orionChatIntro" },
      `Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže.`
    );

    // Quick replies (zůstávají)
    const quickRow = el("div", { class: "orionChatQuickRow" });
    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Dá se to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Mám zájem o nezávaznou konzultaci",
    ];
    quick.forEach((t) => {
      const b = el("button", { class: "orionChatQR", type: "button" }, t);
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    // Messages log (odpovědi se přidávají sem)
    const messages = el("div", { class: "orionChatMessages", id: "orionChatMessages" });

    // Input row
    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", {
      class: "orionChatInput",
      placeholder: "Napište dotaz…",
      type: "text",
      autocomplete: "off",
    });
    const send = el("button", { class: "orionChatSend", type: "button", "aria-label": "Odeslat" }, "➤");
    inputRow.appendChild(input);
    inputRow.appendChild(send);

    body.appendChild(introEl);
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

    function pushMessage(who, text) {
      const m = el("div", { class: `orionChatMsg ${who === "user" ? "user" : "bot"}` }, String(text));
      messages.appendChild(m);
      messages.scrollTop = messages.scrollHeight;
      return m;
    }

    async function handleSend(text) {
      const q = String(text || "").trim();
      if (!q) return;

      pushMessage("user", q);
      input.value = "";

      const typing = pushMessage("assistant", "…");
      typing.classList.add("orionChatTyping");

      const res = await sendToN8n(q);

      // remove typing
      typing.remove();

      if (!res.ok) {
        pushMessage("assistant", `Nastala chyba (${res.status}). Prosím zkuste to znovu za chvíli.`);
        return;
      }

      const answer = extractAnswer(res.data);
      pushMessage("assistant", answer || "Děkuji. Je to spíše e-shop, nebo firemní web?");
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
