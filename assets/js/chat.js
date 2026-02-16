/* assets/js/chat.js */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  const fab = $("#orionFab");
  const panel = $("#orionPanel");
  const closeBtn = $("#orionClose");
  const form = $("#orionForm");
  const input = $("#orionInput");
  const sendBtn = $("#orionSend");
  const msgs = $("#orionMsgs");
  const quick = $("#orionQuick");

  if (!fab || !panel || !closeBtn || !form || !input || !sendBtn || !msgs || !quick) {
    // stránka nemá chat markup -> nic nedělej
    return;
  }

  const cfg = window.ORION_CONFIG || {};
  const WEBHOOK = cfg.N8N_WEBHOOK_URL;

  // Default quick replies (zůstávají viditelné i po odeslání)
  const DEFAULT_QUICK = [
    "Kolik to stojí?",
    "Co umí webový asistent?",
    "Jak to funguje?",
    "Dá se to nasadit na můj web?",
    "Co když se někdo ptá mimo téma?",
    "Chci nezávaznou konzultaci",
  ];

  function openChat() {
    panel.classList.add("open");
    fab.classList.add("hidden");
    input.focus();
  }
  function closeChat() {
    panel.classList.remove("open");
    fab.classList.remove("hidden");
  }

  fab.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);

  function addMsg(role, text) {
    const wrap = document.createElement("div");
    wrap.className = role === "user" ? "msg user" : "msg bot";
    wrap.textContent = text;
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function renderQuick(list) {
    quick.innerHTML = "";
    list.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pillBtn";
      b.textContent = t;
      b.addEventListener("click", () => {
        input.value = t;
        form.requestSubmit();
      });
      quick.appendChild(b);
    });
  }

  // Render quick replies always (not cleared)
  renderQuick(DEFAULT_QUICK);

  // initial bot message
  addMsg(
    "bot",
    "Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže."
  );

  async function send(text) {
    if (!text || !text.trim()) return;
    const clean = text.trim();

    addMsg("user", clean);

    // UI lock
    input.value = "";
    input.focus();
    sendBtn.disabled = true;

    try {
      if (!WEBHOOK) {
        addMsg("bot", "Chybí nastavení N8N webhooku. Zkontrolujte assets/js/config.js.");
        return;
      }

      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean }),
      });

      const data = await res.json().catch(() => ({}));
      const answer =
        (data && (data.answer || data.text || data.message)) ||
        "OK. Potřebuji ještě upřesnit: je to firemní web, nebo e-shop?";

      addMsg("bot", String(answer));

      // DŮLEŽITÉ: quick replies NEmažeme. Zůstávají pořád.
      // Pokud chceš později: dynamické quick replies z odpovědi, můžeš je sem přidat.

    } catch (e) {
      addMsg("bot", "Došlo k chybě při odesílání. Zkuste to prosím znovu.");
    } finally {
      sendBtn.disabled = false;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    send(input.value);
  });
})();
