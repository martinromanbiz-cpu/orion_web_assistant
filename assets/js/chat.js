/* assets/js/chat.js
   Orion chat widget – robustní, bez závislosti na HTML.
   FIX: posílá payload kompatibilní s n8n (chatInput + sessionId + history + meta)
        + zároveň posílá i message (fallback kompatibilita).
*/
(function () {
  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

  const TIMEOUT_MS = 45000;

  // sessionId kompatibilní s tvým n8n memory
  const sessionKey = "orion_sessionId";
  const sessionId =
    localStorage.getItem(sessionKey) ||
    (crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + "_" + Math.random().toString(16).slice(2));
  localStorage.setItem(sessionKey, sessionId);

  const state = {
    history: [] // { role: "user"|"assistant", content: "..." }
  };

  function el(tag, attrs = {}, html = "") {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else n.setAttribute(k, v);
    });
    if (html) n.innerHTML = html;
    return n;
  }

  function ensureStyles() {
    if (document.getElementById("orionChatBaseStyles")) return;
    const css = `
      .orionChatLauncher{position:fixed;right:18px;bottom:18px;z-index:99999;width:54px;height:54px;border-radius:16px;background:#fff;border:1px solid rgba(30,58,138,.18);box-shadow:0 16px 40px rgba(0,0,0,.14);display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none}
      .orionChatLauncher svg{width:26px;height:26px}
      .orionChatOverlay{position:fixed;inset:0;z-index:99998;background:rgba(10,14,28,.38);display:none}
      .orionChatPanel{position:fixed;right:18px;bottom:86px;z-index:99999;width:380px;max-width:calc(100vw - 36px);height:560px;max-height:calc(100vh - 120px);background:#fff;border:1px solid rgba(30,58,138,.14);border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.18);display:none;overflow:hidden}
      .orionChatHeader{padding:14px 14px 10px;border-bottom:1px solid rgba(15,23,42,.08);display:flex;justify-content:space-between;gap:10px}
      .orionChatTitle{font-weight:800;font-size:16px;line-height:1.2}
      .orionChatSub{margin-top:2px;color:rgba(15,23,42,.65);font-size:13px}
      .orionChatClose{width:34px;height:34px;border-radius:12px;background:#fff;border:1px solid rgba(15,23,42,.12);cursor:pointer}
      .orionChatBody{height:calc(100% - 62px);display:flex;flex-direction:column;gap:10px;padding:12px 14px 14px}
      .orionChatMessages{flex:1 1 auto;overflow:auto;display:flex;flex-direction:column;gap:10px;padding-right:4px}
      .orionMsg{max-width:92%;border-radius:16px;padding:10px 12px;border:1px solid rgba(30,58,138,.10);background:#f6f8ff;color:#0b1220;white-space:pre-wrap;word-break:break-word}
      .orionMsg.user{margin-left:auto;background:#1e40af;border-color:#1e40af;color:#fff}
      .orionMsg.bot{margin-right:auto}
      .orionChatQuickRow{display:flex;flex-wrap:wrap;gap:10px}
      .orionChatQR{background:#1e40af;color:#fff;border:none;cursor:pointer;padding:10px 12px;border-radius:999px;font-weight:700}
      .orionChatInputRow{display:flex;gap:10px}
      .orionChatInput{flex:1;padding:12px 12px;border-radius:16px;border:1px solid rgba(124,58,237,.25);background:#eef3ff;outline:none}
      .orionChatSend{width:46px;border-radius:16px;border:1px solid rgba(15,23,42,.12);background:#fff;cursor:pointer}
      .orionChatSend[disabled]{opacity:.6;cursor:not-allowed}
    `;
    const style = el("style", { id: "orionChatBaseStyles" }, css);
    document.head.appendChild(style);
  }

  function normalizeBotText(data) {
    if (data == null) return "";
    if (typeof data === "string") {
      // někdy n8n pošle text; zkus vytáhnout JSON z textu
      const trimmed = data.trim();

      // když je to čistý JSON string
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const o = JSON.parse(trimmed);
          return (o.text ?? o.answer ?? o.reply ?? "").toString().trim();
        } catch (_) {}
      }

      return trimmed;
    }

    let o = data;
    if (typeof data.output === "object" && data.output) o = data.output;
    return (o.text ?? o.answer ?? o.reply ?? "").toString().trim();
  }

  async function sendToN8n(userText) {
    if (!WEBHOOK) return { ok: false, text: "Chybí webhook URL v assets/js/config.js." };

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // ✅ Posíláme kompatibilně: chatInput + sessionId + history + meta
      // ✅ Plus fallback: message (kdyby někde byla stará větev)
      const payload = {
        chatInput: userText,
        message: userText,
        sessionId,
        history: state.history.slice(-12),
        meta: { source: "orion_web_assistant", page: location.pathname }
      };

      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const contentType = (r.headers.get("content-type") || "").toLowerCase();
      const raw = contentType.includes("application/json") ? await r.json().catch(() => null) : await r.text();

      if (!r.ok) {
        return { ok: false, text: "Došlo k chybě při zpracování dotazu. Zkuste to prosím znovu.", raw };
      }

      const botText = normalizeBotText(raw);
      return { ok: true, text: botText || "Upřesníte prosím dotaz k webu/e-shopu?", raw };
    } catch (e) {
      const isAbort = e && String(e.name) === "AbortError";
      return {
        ok: false,
        text: isAbort ? "Odpověď trvala déle než obvykle. Zkuste to prosím znovu." : "Nepodařilo se připojit k asistentovi.",
        raw: e
      };
    } finally {
      clearTimeout(t);
    }
  }

  function addMessage(messagesEl, role, text) {
    const msg = el("div", { class: `orionMsg ${role === "user" ? "user" : "bot"}` });
    msg.textContent = String(text || "");
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setSending(sendBtn, inputEl, isSending) {
    sendBtn.disabled = isSending;
    inputEl.disabled = isSending;
    sendBtn.textContent = isSending ? "…" : "➤";
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

    addMessage(
      messages,
      "assistant",
      "Dobrý den, jsem Orion. Jde o prezentační ukázku asistenta pro weby a e-shopy. Napište dotaz, nebo použijte rychlé možnosti níže."
    );

    const quickRow = el("div", { class: "orionChatQuickRow" });
    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Dá se to nasadit na můj web?",
      "Jak řešíte dotazy mimo téma?",
      "Chci nezávaznou konzultaci"
    ];

    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", { class: "orionChatInput", placeholder: "Napište dotaz…", type: "text" });
    const send = el("button", { class: "orionChatSend", type: "button", "aria-label": "Odeslat" }, "➤");

    inputRow.appendChild(input);
    inputRow.appendChild(send);

    body.appendChild(messages);
    body.appendChild(quickRow);
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
      messages.scrollTop = messages.scrollHeight;
    }
    function close() {
      overlay.style.display = "none";
      panel.style.display = "none";
    }

    async function handleSend(text) {
      const t = (text || "").trim();
      if (!t) return;

      addMessage(messages, "user", t);
      state.history.push({ role: "user", content: t });

      input.value = "";
      setSending(send, input, true);

      const resp = await sendToN8n(t);

      setSending(send, input, false);

      addMessage(messages, "assistant", resp.text);
      state.history.push({ role: "assistant", content: resp.text });
    }

    quick.forEach((t) => {
      const b = el("button", { class: "orionChatQR", type: "button" }, t);
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    launcher.addEventListener("click", open);
    overlay.addEventListener("click", close);
    panel.querySelector(".orionChatClose").addEventListener("click", close);

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
