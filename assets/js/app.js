// app.js - Hlavní logika webu a renderování komponent (Luxusní verze)
document.addEventListener('DOMContentLoaded', () => {
    // 1. Zkontrolujeme, zda existuje konfigurace
    if (typeof window.ORION_CONFIG === 'undefined') {
        console.error("Kritická chyba: Konfigurace ORION_CONFIG nebyla nalezena (config.js chybí).");
        return; 
    }

    renderLayout();
    
    // Pokud jsme na stránce ukazky.html, vykreslíme dema
    if (document.getElementById('demoLinks')) {
        renderDemoLinks();
    }
});

function renderLayout() {
    const header = document.getElementById('siteHeader');
    const footer = document.getElementById('siteFooter');

    // Nový luxusní Header s glass efektem (stylováno v CSS)
    if (header) {
        header.innerHTML = `
            <header class="main-header">
                <div class="container">
                    <div class="logo-area">
                        <img src="./assets/img/orion-mark.svg" alt="Orion" class="logo-img" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2082/2082199.png'">
                        <span class="logo-text">ORION <small>Automation</small></span>
                    </div>
                    <nav class="main-nav">
                        <ul>
                            <li><a href="index.html">Domů</a></li>
                            <li><a href="web-assistant.html">Asistent</a></li>
                            <li><a href="jak-to-funguje.html">Workflow</a></li>
                            <li><a href="ukazky.html">Ukázky</a></li>
                            <li><a href="kontakt.html" class="btn btn-primary btn-cta">Sjednat konzultaci</a></li>
                        </ul>
                    </nav>
                </div>
            </header>
        `;
    }

    // Nová čistší patička
    if (footer) {
        footer.innerHTML = `
            <footer class="main-footer">
                <div class="container">
                    <p>&copy; 2026 Orion AI Solutions. Všechna práva vyhrazena.</p>
                    <p class="muted text-sm mt-10">Exkluzivní integrace na platformě n8n.</p>
                </div>
            </footer>
        `;
    }
}

function renderDemoLinks() {
    const container = document.getElementById('demoLinks');
    if (!container) return;

    // Bezpečné volání konfigurace
    const links = window.ORION_CONFIG?.DEMO_LINKS || [];
    
    if (links.length === 0) {
        container.innerHTML = `<p class="muted">Momentálně nejsou k dispozici žádné úvodní ukázky.</p>`;
        return;
    }

    container.innerHTML = links.map(demo => `
        <div class="card demo-card">
            <h3 class="blue-gradient-text">${demo.title}</h3>
            <p class="muted mt-10 mb-20">${demo.desc || 'Interaktivní ukázka prémiové AI integrace.'}</p>
            <a href="${demo.url}" target="_blank" class="btn btn-secondary">Prohlédnout řešení</a>
        </div>
    `).join('');
}
