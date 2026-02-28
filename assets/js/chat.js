/* assets/js/chat.js
   Orion Chat Widget – robustní:
   - 1 scroll pro celou konverzaci (messages)
   - input je vždy dole (sticky)
   - quick replies jsou součást konverzace (po prvním odeslání se skryjí)
   - při 500/timeout se zobrazí slušná hláška, ale chat se "nezamrzne"
*/
(function () {
  "use strict";

  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  // zabrání dvojité inicializaci (např. při navigaci / reloadu)
  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "style") n.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of Array.isArray(children) ? children : [children]) {
      if (c == null) continue;
      if (typeof c === "string") n.appendChild(document.createTextNode(c));
      else n.appendChild(c);
    }
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

  function ensureStyles() {
    if (document.getElementById("orionChatStyles")) return;

    const css = `
      /* Launcher */
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

      /* Overlay + Panel */
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
        background: #fff;
      }
      .orionChatTitle{ font-weight:800; font-size:16px; line-height:1.2; }
      .orionChatSub{ margin-top:2px; color:rgba(15,23,42,.65); font-size:13px; }

      .orionChatClose{
        width:34px; height:34px; border-radius:12px;
        background:#fff; border:1px solid rgba(15,23,42,.12);
        cursor:pointer;
      }

      /* Layout: flex column, 1 scroll pouze pro messages */
      .orionChatBody{
        height: calc(100% - 64px);
        display:flex; flex-direction:column;
        overflow:hidden;
        background:#fff;
      }

      .orionChatMessages{
        flex:1 1 auto;
        overflow:auto;
        padding:12px 14px;
        display:flex; flex-direction:column; gap:10px;
      }

      /* Bubbles */
      .orionMsg{
        max-width: 100%;
        border-radius:16px;
        padding:10px 12px;
        border:1px solid rgba(30,58,138,.10);
        background:#f6f8ff;
        color:#0b1220;
        line-height:1.35;
        word-break: break-word;
      }
      .orionMsg.user{
        align-self:flex-end;
        background:#1e40af;
        border-color:#1e40af;
        color:#fff;
      }
      .orionMsg.meta{
        background:#fff7ed;
        border-color: rgba(234,88,12,.22);
        color:#7c2d12;
      }

      /* Quick replies as a block inside messages */
      .orionQuickWrap{
        display:flex; flex-wrap:wrap; gap:10px;
        margin-top:4px;
      }
      .orionQR{
        background:#1e40af; color:#fff; border:none; cursor:pointer;
        padding:10px 12px; border-radius:999px; font-weight:700;
      }
      .orionQR:hover{ filter: brightness(.95); }

      /* Input bar fixed at bottom of panel */
      .orionChatInputBar{
        flex:0 0 auto;
        padding:12px 14px;
        border-top:1px solid rgba(15,23,42,.08);
        display:flex; gap:10px;
        background:#fff;
      }
      .orionChatInput{
        flex:1;
        padding:12px 12px;
        border-radius:16px;
        border:1px solid #c9c5ff;
        background:#eef3ff;
        outline:none;
      }
      .orionChatSend{
        width:46px;
        border-radius:16px;
        border:1px solid rgba(15,23,42,.12);
        background:#fff;
        cursor:pointer;
      }

      /* Make sure global CSS won't break it */
      .orionChatPanel *{ box-sizing:border-box; }
    `;

    document.head.appendChild(el("style", { id: "orionChatStyles" }, css));
  }

  async function sendToN8n(text) {
    if (!WEBHOOK) {
      return { ok: false, answer: "Chat není napojený (chybí URL). Prosím ověřte nastavení config.js." };
    }

    // timeout, ať se to nikdy „nezasekne“
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);

    try {
      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: ctrl.signal
      });

      const raw = await r.text().catch(() => "");
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch {}

      // různé možné formáty – sjednotíme na "answer"
      const answer =
        (data && (data.answer || data.text || data.message)) ||
        (raw && raw.trim()) ||
        "";

      if (!r.ok) {
        // 500/400 atd – vrátíme slušnou hlášku, ale bez technického bordelu
        return {
          ok: false,
          answer:
            "Omlouvám se, teď došlo k dočasné chybě na serveru ukázky. Můžete to prosím zkusit znovu, nebo napsat přes kontakt?"
        };
      }

      if (!answer) {
        return {
          ok: true,
          answer:
            "Rozumím. Abych odpověděl přesně, upřesníte prosím, zda jde o e-shop nebo firemní web a co má asistent řešit nejčastěji?"
        };
      }

      return { ok: true, answer: String(answer) };
    } catch (e) {
      const isAbort = String(e && e.name) === "AbortError";
      return {
        ok: false,
        answer: isAbort
          ? "Omlouvám se, server ukázky teď odpovídá pomalu. Zkuste to prosím znovu za chvíli, nebo použijte kontakt."
          : "Omlouvám se, došlo k chybě spojení. Zkuste to prosím znovu, nebo použijte kontakt."
      };
    } finally {
      clearTimeout(t);
    }
  }

  // ---------- mount ----------
  function mount() {
    ensureStyles();

    const overlay = el("div", { class: "orionChatOverlay", id: "orionChatOverlay" });
    const panel = el("div", { class: "orionChatPanel", id: "orionChatPanel" });

    // header
    const header = el("div", { class: "orionChatHeader" }, [
      el("div", {}, [
        el("div", { class: "orionChatTitle" }, "Orion • AI Web Assistant"),
        el("div", { class: "orionChatSub" }, "Prezentační ukázka (web/e-shop scénáře)")
      ]),
      el("button", { class: "orionChatClose", type: "button", "aria-label": "Zavřít" }, "✕")
    ]);

    // body layout
    const body = el("div", { class: "orionChatBody" });
    const messages = el("div", { class: "orionChatMessages", id: "orionChatMessages" });

    // greeting
    messages.appendChild(
      el("div", { class: "orionMsg" },
        "Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže."
      )
    );

    // quick replies block (inside messages)
    const quickWrap = el("div", { class: "orionQuickWrap", id: "orionQuickWrap" });
    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Dá se to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Mám zájem o nezávaznou konzultaci"
    ];
    quick.forEach((t) => {
      const b = el("button", { class: "orionQR", type: "button" }, t);
      b.addEventListener("click", () => handleSend(t));
      quickWrap.appendChild(b);
    });
    messages.appendChild(quickWrap);

    // input bar (fixed bottom)
    const inputBar = el("div", { class: "orionChatInputBar" });
    const input = el("input", {
      class: "orionChatInput",
      placeholder: "Napište dotaz…",
      type: "text",
      autocomplete: "off"
    });
    const send = el("button", { class: "orionChatSend", type: "button", "aria-label": "Odeslat" }, "➤");
    inputBar.appendChild(input);
    inputBar.appendChild(send);

    body.appendChild(messages);
    body.appendChild(inputBar);

    panel.appendChild(header);
    panel.appendChild(body);

    // launcher
    const launcher = el("div", { class: "orionChatLauncher", id: "orionChatLauncher", title: "Otevřít chat" }, [
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
      setTimeout(() => input.focus(), 0);
      scrollToBottom();
    }
    function close() {
      overlay.style.display = "none";
      panel.style.display = "none";
    }
    function scrollToBottom() {
      messages.scrollTop = messages.scrollHeight;
    }

    launcher.addEventListener("click", open);
    overlay.addEventListener("click", close);
    $(".orionChatClose", panel).addEventListener("click", close);

    function addMsg(text, who) {
      const node = el("div", { class: `orionMsg ${who || ""}` }, text);
      messages.appendChild(node);
      scrollToBottom();
      return node;
    }

    let quickHidden = false;

    async function handleSend(text) {
      const t = String(text || "").trim();
      if (!t) return;

      // po prvním odeslání schová quick replies (aby nepřekážely konverzaci)
      if (!quickHidden) {
        quickHidden = true;
        const qw = $("#orionQuickWrap", messages);
        if (qw) qw.remove();
      }

      addMsg(t, "user");
      input.value = "";
      input.focus();

      const typing = addMsg("…", "meta");

      const resp = await sendToN8n(t);
      typing.remove();

      addMsg(resp.answer || "Rozumím. Upřesníte prosím svůj web/e-shop a co má asistent řešit?", "");
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
