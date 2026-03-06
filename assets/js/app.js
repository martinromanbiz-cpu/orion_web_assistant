// app.js - Hlavní logika webu a renderování komponent
document.addEventListener('DOMContentLoaded', () => {
    renderLayout();
    
    // Pokud jsme na stránce ukazky.html, vykreslíme dema
    if (document.getElementById('demoLinks')) {
        renderDemoLinks();
    }

    // Inicializace kontaktniho formuláře, pokud existuje
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        initContactForm(contactForm);
    }
});

function renderLayout() {
    const header = document.getElementById('siteHeader');
    const footer = document.getElementById('siteFooter');

    if (header) {
        header.innerHTML = `
            <header class="main-header">
                <div class="container">
                    <div class="logo-area">
                        <img src="./assets/img/orion-mark.svg" alt="Orion" class="logo-img" onerror="this.style.display='none'">
                        <span class="logo-text">ORION <small>Assistant</small></span>
                    </div>
                    <nav class="main-nav">
                        <ul>
                            <li><a href="index.html">Domů</a></li>
                            <li><a href="web-assistant.html">Web Assistant</a></li>
                            <li><a href="jak-to-funguje.html">Jak to funguje</a></li>
                            <li><a href="ukazky.html">Ukázky</a></li>
                            <li><a href="kontakt.html" class="btn-cta">Kontakt</a></li>
                        </ul>
                    </nav>
                </div>
            </header>
        `;
    }

    if (footer) {
        footer.innerHTML = `
            <footer class="main-footer">
                <div class="container">
                    <p>&copy; 2026 Orion AI. Všechna práva vyhrazena. | Profesionální automatizace pro Váš business.</p>
                </div>
            </footer>
        `;
    }
}

function renderDemoLinks() {
    const container = document.getElementById('demoLinks');
    if (!container) return;

    container.innerHTML = CONFIG.DEMO_LINKS.map(demo => `
        <div class="demo-card">
            <h3>${demo.title}</h3>
            <p>${demo.desc}</p>
            <a href="${demo.url}" target="_blank" class="btn-secondary">Prohlédnout demo</a>
        </div>
    `).join('');
}

async function initContactForm(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        const originalText = btn.innerText;
        
        const formData = {
            name: form.name.value,
            email: form.email.value,
            phone: form.phone.value,
            message: form.message.value
        };

        try {
            btn.innerText = "Odesílám...";
            btn.disabled = true;

            const response = await fetch(CONFIG.CONTACT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                form.innerHTML = `<div class="success-msg"><h3>Děkujeme!</h3><p>Vaše zpráva byla úspěšně odeslána. Budeme Vás kontaktovat co nejdříve.</p></div>`;
            } else {
                throw new Error();
            }
        } catch (error) {
            alert("Omlouváme se, došlo k chybě. Prosím, zkuste to znovu nebo nám napište přímo.");
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}
