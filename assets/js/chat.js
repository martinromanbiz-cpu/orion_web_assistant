(function(){
  const cfg = window.ORION_CONFIG || {};
  const chatFab = document.getElementById("chatFab");
  const chatPanel = document.getElementById("chatPanel");
  const chatClose = document.getElementById("chatClose");
  const chatBody = document.getElementById("chatBody");
  const chatInput = document.getElementById("chatInput");
  const chatSend = document.getElementById("chatSend");
  const chatHint = document.getElementById("chatHint");
  if(!chatFab || !chatPanel) return;

  let hintTimer = null;
  function showHint(){
    if(!chatHint) return;
    chatHint.classList.add("show");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(()=> chatHint.classList.remove("show"), 2600);
  }
  setTimeout(showHint, 900);

  function openChat(){
    chatPanel.classList.add("open");
    chatInput && chatInput.focus();
    showHint();
  }
  function closeChat(){ chatPanel.classList.remove("open"); }

  chatFab.addEventListener("click", openChat);
  chatClose && chatClose.addEventListener("click", closeChat);

  function addMsg(role, text){
    const row = document.createElement("div");
    row.className = "msg " + (role === "user" ? "user" : "bot");
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    chatBody.appendChild(row);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function addQuickReplies(options){
    if(!options || !options.length) return;
    const wrap = document.createElement("div");
    wrap.className = "quick";
    options.slice(0,10).forEach(label => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", ()=>{ chatInput.value = label; send(); });
      wrap.appendChild(b);
    });
    chatBody.appendChild(wrap);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // Intro only once
  const introKey = "orion_intro_done";
  if(!localStorage.getItem(introKey)){
    const badge = document.createElement("div");
    badge.className = "chatBadge";
    badge.innerHTML = `<span class="codeTag">${cfg.BRAND_NAME || "Orion"}</span><span>${cfg.MODE_BADGE || "PREZENTAČNÍ UKÁZKA"}</span>`;
    chatBody.appendChild(badge);

    addMsg("bot",
      "Dobrý den, jsem Web assistant Orion. Tohle je prezentační ukázka pro firmy — ptejte se na web/e-shop asistenta, možnosti workflow, nasazení nebo orientační cenové balíčky."
    );

    addQuickReplies([
      "Co všechno chatbot umí?",
      "Pro jaké firmy se to hodí?",
      "Jak probíhá nasazení na web?",
      "Jaké jsou cenové balíčky?",
      "Chci ukázku pro e-shop"
    ]);

    localStorage.setItem(introKey, "1");
  }

  async function callN8n(userText){
    const url = (cfg.N8N_WEBHOOK_URL || "").trim();
    if(!url) return { text: "Chybí URL na n8n webhook. Upravte assets/config.js (N8N_WEBHOOK_URL).", quick_replies: [] };

    const sessionId = orionGetSessionId();
    const history = orionLoadHistory();

    // Payload: chatInput + sessionId + history (připravené pro tvůj workflow)
    const payload = {
      chatInput: userText,
      sessionId,
      history,
      meta: { source:"orion-demo-site", page:location.pathname, ts:new Date().toISOString() }
    };

    const res = await fetch(url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(()=> ({}));
    const text = orionExtractText(data) || "Rozumím. Upřesněte prosím web vs e-shop a co má asistent řešit.";
    const quick = orionExtractQuickReplies(data);

    const nextHistory = history.concat([
      { role:"user", content:userText, ts: Date.now() },
      { role:"assistant", content:text, ts: Date.now() }
    ]);
    orionSaveHistory(nextHistory);

    return { text, quick_replies: quick };
  }

  let sending = false;
  async function send(){
    const text = (chatInput.value || "").trim();
    if(!text || sending) return;
    sending = true;
    chatInput.value = "";
    addMsg("user", text);

    const typingRow = document.createElement("div");
    typingRow.className = "msg bot";
    const typingBubble = document.createElement("div");
    typingBubble.className = "bubble muted";
    typingBubble.textContent = "Přemýšlím…";
    typingRow.appendChild(typingBubble);
    chatBody.appendChild(typingRow);
    chatBody.scrollTop = chatBody.scrollHeight;

    try{
      const out = await callN8n(text);
      typingBubble.textContent = out.text;
      addQuickReplies(out.quick_replies);
    }catch(e){
      typingBubble.textContent = "Došlo k chybě při volání ukázky. Zkuste to prosím znovu.";
    }finally{
      sending = false;
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  chatSend.addEventListener("click", send);
  chatInput.addEventListener("keydown", (e)=>{ if(e.key === "Enter") send(); });

  // hook for header button
  window.openChat = openChat;
})();
