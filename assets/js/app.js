// assets/js/app.js
// Shared UI (header/footer) + active nav highlighting.

(function () {
  const current = (location.pathname.split('/').pop() || 'index.html');

  // Inject header/footer to keep navigation identical on every page
  const headerMount = document.getElementById('siteHeader');
  const footerMount = document.getElementById('siteFooter');

  if (headerMount) {
    headerMount.innerHTML = `
      <header class="topbar">
        <div class="container nav">
          <a class="brand" href="./index.html" aria-label="Orion (domů)">
            <img src="./assets/img/orion-mark.svg" alt="Orion" width="36" height="36" />
            <span class="brandText">Orion</span>
            <span class="badge">DEMO</span>
          </a>

          <nav class="menu" aria-label="Hlavní navigace">
            <a data-nav href="./index.html">Domů</a>
            <a data-nav href="./web-assistant.html">Vyzkoušet</a>
            <a data-nav href="./jak-to-funguje.html">Jak to funguje</a>
            <a data-nav href="./ukazky.html">Ukázky</a>
            <a data-nav href="./kontakt.html">Kontakt</a>
          </nav>

          <div class="cta">
            <a class="btn primary" href="./kontakt.html">Nezávazná konzultace</a>
          </div>
        </div>
      </header>
    `;
  }

  if (footerMount) {
    footerMount.innerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footerInner">
            <div>© <span id="y"></span> Martin Roman • Orion</div>
            <div>Prezentační ukázka • Web/e-shop assistant</div>
          </div>
        </div>
      </footer>
    `;
  }

  // Active menu state
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const file = href.split('/').pop();
    if (file === current) a.classList.add('active');
  });

  // Year
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();
