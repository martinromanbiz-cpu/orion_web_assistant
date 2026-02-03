function orionGetSessionId(){
  const key = "orion_session_id";
  let id = localStorage.getItem(key);
  if(!id){
    id = (crypto.randomUUID ? crypto.randomUUID() : (Date.now()+"-"+Math.random().toString(16).slice(2)));
    localStorage.setItem(key, id);
  }
  return id;
}

function orionLoadHistory(){
  try { return JSON.parse(localStorage.getItem("orion_history") || "[]"); }
  catch(e){ return []; }
}
function orionSaveHistory(history){
  localStorage.setItem("orion_history", JSON.stringify(history.slice(-20)));
}

/** Robust parsing pro různé tvary odpovědi z n8n */
function orionExtractText(data){
  if(!data) return "";
  if(typeof data === "string") return data;

  const candidates = [
    data.text, data.answer, data.output, data.message, data.response,
    data?.data?.text, data?.data?.answer,
    data?.result?.text, data?.result?.answer,
    data?.json?.text, data?.json?.answer, data?.json?.output
  ];
  for(const c of candidates){
    if(typeof c === "string" && c.trim()) return c.trim();
  }

  if(Array.isArray(data)){
    for(const item of data){
      const t = orionExtractText(item?.json || item);
      if(t) return t;
    }
  }

  try { return JSON.stringify(data); } catch(e){ return ""; }
}

function orionExtractQuickReplies(data){
  const tryPaths = [
    data?.quick_replies,
    data?.kb_quick_replies,
    data?.json?.quick_replies,
    data?.json?.kb_quick_replies
  ];

  for(const p of tryPaths){
    if(Array.isArray(p)) return p;
    if(typeof p === "string"){
      try {
        const j = JSON.parse(p);
        if(Array.isArray(j)) return j;
      } catch(e){
        const parts = p.split(/[,;|]/).map(s=>s.trim()).filter(Boolean);
        if(parts.length) return parts;
      }
    }
  }
  return [];
}
