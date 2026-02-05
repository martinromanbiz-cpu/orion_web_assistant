// assets/js/app.js
(function(){
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach(a=>{
    if(a.getAttribute("href") === path) a.classList.add("active");
  });

  // Ukázky: vygeneruj seznam z configu
  const demos = (window.ORION_CONFIG && window.ORION_CONFIG.DEMO_LINKS) || [];
  const list = document.querySelector("[data-demo-list]");
  if(list && demos.length){
    list.innerHTML = demos.map(d => `
      <div class="bigCard">
        <h3>${escapeHtml(d.title)}</h3>
        <p style="margin-bottom:12px">Otevře se v novém panelu. Slouží jako doplňková ukázka.</p>
        <a class="btn soft" target="_blank" rel="noopener" href="${d.url}">Otevřít ukázku</a>
      </div>
    `).join("");
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }
})();
