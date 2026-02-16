// assets/js/chat.js
(function(){
  const cfg = window.ORION_CONFIG || {};
  const webhook = cfg.N8N_WEBHOOK_URL;

  const fab = document.querySelector("[data-chat-fab]");
  const panel = document.querySelector("[data-chat-panel]");
  const closeBtn = document.querySelector("[data-chat-close]");
  const body = document.querySelector("[data-chat-body]");
  const input = document.querySelector("[data-chat-input]");
  const send = document.querySelector("[data-chat-send]");
  const quickWrap = document.querySelector("[data-chat-quick]");

  if(!fab || !panel || !body || !input || !send) return;

  const sessionKey = "orion_session_id";
  const historyKey = "orion_history";
  const sessionId = localStorage.getItem(sessionKey) || cryptoRandomId();
  localStorage.setItem(sessionKey, sessionId);

  let history = safeJson(localStorage.getItem(historyKey), []);
  if(!Array.isArray(history)) history = [];

  const DEFAULT_QUICK = (cfg.QUICK_REPLIES && Array.isArray(cfg.QUICK_REPLIES) && cfg.QUICK_REPLIES.length)
    ? cfg.QUICK_REPLIES
    : [
        "Kolik to stojí?",
        "Co umí webový asistent?",
        "Jak to funguje?",
        "Dá se to nasadit na můj web?",
        "Co když se někdo ptá mimo téma?",
        "Chci nezávaznou konzultaci"
      ];

  function open(){
    panel.classList.add("open");
    input.focus();
    if(body.children.length === 0){
      // Úvodní zpráva + quick replies (fixní)
      bot(`Dobrý den, jsem Orion — webový asistent v prezentační ukázce. Napište dotaz, nebo klikněte na jednu z možností níže.`);
      renderQuick(DEFAULT_QUICK);
    }
  }
  function close(){ panel.classList.remove("open"); }

  fab.addEventListener("click", ()=> panel.classList.contains("open") ? close() : open());
  closeBtn && closeBtn.addEventListener("click", close);

  send.addEventListener("click", onSend);
  input.addEventListener("keydown", (e)=>{ if(e.key==="Enter") onSend(); });

  function onSend(){
    const text = input.value.trim();
    if(!text) return;
    input.value = "";
    user(text);
    // Quick replies zůstávají viditelné (ať nemizí po prvním kliknutí)
    renderQuick(DEFAULT_QUICK);
    ask(text);
  }

  function user(text){
    body.insertAdjacentHTML("beforeend", `<div class="msg user">${escapeHtml(text)}</div>`);
    scrollDown();
  }
  function bot(text){
    body.insertAdjacentHTML("beforeend", `<div class="msg bot">${escapeHtml(text)}</div>`);
    scrollDown();
  }
  function renderQuick(items){
    if(!quickWrap) return;
    if(!items || !items.length){
      quickWrap.innerHTML = "";
      return;
    }
    quickWrap.innerHTML = `<div class="quick">${
      items.map(t=>`<button class="pill" type="button">${escapeHtml(t)}</button>`).join("")
    }</div>`;
    quickWrap.querySelectorAll(".pill").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        input.value = btn.textContent;
        onSend();
      });
    });
  }

  async function ask(text){
    if(!webhook){
      bot("Webhook není nastavený. Doplňte ho do assets/js/config.js a zkuste to znovu.");
      return;
    }

    // history: udržuj krátké (kvůli tokenům)
    const compactHistory = history.slice(-10);

    const payload = {
      chatInput: text,
      sessionId,
      history: compactHistory,
      meta: {
        source: "orion_web_assistant",
        page: window.location.pathname
      }
    };

    try{
      const res = await fetch(webhook, {
        method:"POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(()=> ({}));

      // n8n chat trigger obvykle vrací { output: "..." } nebo přímo string.
      const answer =
        (typeof data === "string" && data) ||
        data.output ||
        data.text ||
        data.answer ||
        data.message ||
        JSON.stringify(data);

      // ulož do historie pro další dotazy
      history.push({ role:"user", content:text });
      history.push({ role:"assistant", content: String(answer) });
      localStorage.setItem(historyKey, JSON.stringify(history.slice(-30)));

      bot(String(answer));
    } catch(e){
      bot("Teď se nepovedlo ukázku doručit. Zkuste to prosím znovu, nebo napište dotaz jinak (web/e-shop scénář).");
    }
  }

  function scrollDown(){ body.scrollTop = body.scrollHeight; }
  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }
  function safeJson(s, fallback){
    try{ return JSON.parse(s); } catch { return fallback; }
  }
  function cryptoRandomId(){
    // jednoduché ID i bez crypto supportu
    if(window.crypto && crypto.getRandomValues){
      const a = new Uint32Array(4);
      crypto.getRandomValues(a);
      return Array.from(a).map(n=>n.toString(16)).join("");
    }
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
})();
