// app.js - Hlavní logika webu a renderování komponent (Premium B2B verze)
document.addEventListener('DOMContentLoaded', () => {
    // 1. Zkontrolujeme, zda existuje konfigurace
    if (typeof window.ORION_CONFIG === 'undefined') {
        console.error("Kritická chyba: Konfigurace ORION_CONFIG nebyla nalezena (config.js chybí).");
    }

    renderLayout();
    
    // Pokud jsme na stránce ukazky, můžeme případně vykreslit něco dalšího
    // if (document.getElementById('demoLinks')) { renderDemoLinks(); }
});

function renderLayout() {
    const header = document.getElementById('siteHeader');
    const footer = document.getElementById('siteFooter');

    // Nový luxusní Header s glass efektem a premium CSS
    if (header) {
        header.innerHTML = `
            <nav id="premium-nav">
                <a href="index.html" class="logo" style="text-decoration:none;">Orion<span> AI</span></a>
                <div class="nav-links">
                    <a href="o-nas.html">Jak to funguje</a>
                    <a href="cenik.html">Ceník</a>
                    <a href="ukazka.html">Ukázka</a>
                    <a href="kontakt.html" class="btn-nav">Nezávazná konzultace</a>
                </div>
            </nav>
        `;
    }

    // Premium patička
    if (footer) {
        footer.innerHTML = `
            <footer id="premium-footer">
                <a href="index.html" class="logo" style="text-decoration:none;">Orion<span> AI</span></a>
                <p>© 2026 Orion AI Solutions – Martin Roman</p>
                <p style="color: var(--text3);">Vytvořeno v České republice 🇨🇿</p>
            </footer>
        `;
    }
}
