/* assets/js/chat.js
   Robustní widget: vždy vloží ikonku + panel do stránky.
   Pokud n8n spadne (500), ukáže fallback odpovědi, aby demo nikdy nepůsobilo rozbitě.
*/
(function () {
  "use strict";

  const CFG = window.ORION_CONFIG || {};
  const WEBHOOK = CFG.N8N_WEBHOOK_URL || "";

  if (window.__ORION_CHAT_MOUNTED__) return;
  window.__ORION_CHAT_MOUNTED__ = true;

  function el(tag, attrs = {}, html = "") {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "style") n.setAttribute("style", v);
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
        display:flex; flex-direction:column; gap:10px;
      }

      .orionChatLog{
        flex: 1;
        overflow:auto;
        display:flex;
        flex-direction:column;
        gap:10px;
        padding-right:4px;
      }

      .orionMsg{
        max-width: 86%;
        border-radius:16px;
        padding:10px 12px;
        border:1px solid rgba(30,58,138,.10);
        background:#f6f8ff;
        color:#0b1220;
        line-height:1.35;
      }
      .orionMsg.user{
        margin-left:auto;
        background:#1e40af;
        color:#fff;
        border-color: rgba(30,58,138,.22);
      }
      .orionMsg.meta{
        background:#fff7ed;
        border-color: rgba(234,88,12,.20);
        color:#7c2d12;
      }

      .orionChatQuickRow{ display:flex; flex-wrap:wrap; gap:10px; }
      .orionChatQR{
        background:#1e40af; color:#fff; border:none; cursor:pointer;
        padding:10px 12px; border-radius:999px; font-weight:700;
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
    document.head.appendChild(el("style", { id: "orionChatBaseStyles" }, css));
  }

  function extractAnswer(data) {
    if (!data) return "";
    if (typeof data === "string") return data;
    if (data.answer) return String(data.answer);
    if (data.text) return String(data.text);
    if (data.output) return String(data.output);
    if (data.message) return String(data.message);
    return "";
  }

  const FALLBACK = {
    "Kolik to stojí?":
      "Cena se určuje podle rozsahu (počet stránek/scénářů, integrace, jazykové mutace). Nejrychlejší je krátká konzultace a návrh řešení na míru.",
    "Co umí webový asistent?":
      "Zodpovídá opakující se dotazy (FAQ), pomáhá s orientací na webu/e-shopu, doporučí další krok a u obchodních dotazů navede na kontakt nebo předá poptávku.",
    "Jak to funguje?":
      "Uživatel napíše dotaz nebo klikne na rychlou volbu. Asistent odpoví stručně a drží hranice tématu. U nejasností položí doplňující otázku.",
    "Je možné to nasadit na můj web?":
      "Ano. Řeší se umístění (widget), scénáře, napojení na interní systémy (CRM, e-mail, helpdesk) a bezpečnostní pravidla (GDPR, přístupy).",
    "Co když se někdo ptá mimo téma?":
      "Asistent odpoví slušně, ale udržuje hranice – vrátí konverzaci zpět k webu/e-shopu, aby odpovědi byly konzistentní a použitelné.",
    "Mám zájem o nezávaznou konzultaci":
      "Napište stručně typ webu/e-shopu a co chcete, aby asistent řešil nejčastěji. Následně navrhnu variantu nasazení a doporučím další postup."
  };

  async function sendToN8n(text) {
    if (!WEBHOOK) return { ok: false, answer: "Chybí nastavený webhook v config.js." };

    try {
      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      const raw = await r.text().catch(() => "");
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }

      if (!r.ok) {
        // n8n error -> fallback
        return {
          ok: false,
          answer:
            FALLBACK[text] ||
            "Dočasně není dostupná odpověď z backendu. Demo rozhraní je funkční, ale webhook vrací chybu."
        };
      }

      const ans = extractAnswer(data) || "Děkuji. Můžete prosím upřesnit, co přesně chcete zjistit?";
      return { ok: true, answer: ans };
    } catch (e) {
      return {
        ok: false,
        answer: FALLBACK[text] || "Dočasně se nepodařilo odeslat dotaz. Zkuste to prosím znovu."
      };
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
    const log = el("div", { class: "orionChatLog", id: "orionChatLog" });

    function addMsg(text, who = "bot", extraClass = "") {
      const cls = ["orionMsg", who === "user" ? "user" : "", extraClass].filter(Boolean).join(" ");
      const m = el("div", { class: cls }, String(text));
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    }

    addMsg(
      "Ahoj, jsem Orion — webový asistent v demo ukázce. Napiš dotaz, nebo klikni na jednu z možností níže.",
      "bot"
    );

    const quickRow = el("div", { class: "orionChatQuickRow" });
    const quick = [
      "Kolik to stojí?",
      "Co umí webový asistent?",
      "Jak to funguje?",
      "Je možné to nasadit na můj web?",
      "Co když se někdo ptá mimo téma?",
      "Mám zájem o nezávaznou konzultaci"
    ];

    const inputRow = el("div", { class: "orionChatInputRow" });
    const input = el("input", {
      class: "orionChatInput",
      placeholder: "Napište dotaz…",
      type: "text"
    });
    const send = el("button", { class: "orionChatSend", type: "button", "aria-label": "Odeslat" }, "➤");
    inputRow.appendChild(input);
    inputRow.appendChild(send);

    async function handleSend(text) {
      const t = String(text || "").trim();
      if (!t) return;

      addMsg(t, "user");
      input.value = "";

      const resp = await sendToN8n(t);
      if (!resp.ok) {
        addMsg(resp.answer, "bot", "meta");
      } else {
        addMsg(resp.answer, "bot");
      }
    }

    quick.forEach((t) => {
      const b = el("button", { class: "orionChatQR", type: "button" }, t);
      b.addEventListener("click", () => handleSend(t));
      quickRow.appendChild(b);
    });

    send.addEventListener("click", () => handleSend(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend(input.value);
    });

    body.appendChild(log);
    body.appendChild(quickRow);
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
      setTimeout(() => input.focus(), 0);
    }
    function close() {
      overlay.style.display = "none";
      panel.style.display = "none";
    }

    launcher.addEventListener("click", open);
    overlay.addEventListener("click", close);
    panel.querySelector(".orionChatClose").addEventListener("click", close);

    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.body.appendChild(launcher);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
