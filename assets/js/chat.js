/**
 * ORION Web Assistant - Chat Logic v2.0
 * Implementace Quick Replies & n8n Integration
 */

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    // Funkce pro přidání zprávy do okna
    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        msgDiv.innerHTML = `<div class="message-content">${text}</div>`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    // Funkce pro vytvoření Quick Replies (Tlačítek)
    function renderQuickReplies(repliesRaw) {
        // Odstraníme staré bubliny, pokud existují
        const oldReplies = document.querySelector('.quick-replies-container');
        if (oldReplies) oldReplies.remove();

        if (!repliesRaw) return;

        try {
            // n8n posílá pole jako string nebo objekt, musíme to ošetřit
            const replies = typeof repliesRaw === 'string' ? JSON.parse(repliesRaw) : repliesRaw;
            
            if (Array.isArray(replies) && replies.length > 0) {
                const container = document.createElement('div');
                container.className = 'quick-replies-container';

                replies.forEach(text => {
                    const btn = document.createElement('button');
                    btn.className = 'quick-reply-btn';
                    btn.textContent = text;
                    btn.onclick = () => {
                        handleSendMessage(text); // Po kliknutí odešle text jako zprávu
                        container.remove();      // A zmizí
                    };
                    container.appendChild(btn);
                });
                chatMessages.appendChild(container);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } catch (e) {
            console.error("Chyba při parsování Quick Replies:", e);
        }
    }

    // Hlavní funkce pro odeslání zprávy
    async function handleSendMessage(text) {
        if (!text.trim()) return;

        // 1. Zobrazení zprávy uživatele
        appendMessage('user', text);
        chatInput.value = '';

        // 2. Indikátor psaní
        const typingDiv = appendMessage('assistant', '...');

        try {
            const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatInput: text,
                    sessionId: CONFIG.SESSION_ID
                })
            });

            const data = await response.json();
            
            // 3. Odstranění indikátoru a zobrazení odpovědi
            typingDiv.remove();
            
            // n8n vrací text v poli "output"
            const aiText = data.output || "Omlouvám se, spojení bylo přerušeno.";
            appendMessage('assistant', aiText);

            // 4. Vykreslení tlačítek (pokud přišla z n8n)
            if (data.kb_quick_replies) {
                renderQuickReplies(data.kb_quick_replies);
            }

        } catch (error) {
            typingDiv.remove();
            appendMessage('assistant', 'Chyba připojení k systému Orion.');
            console.error("n8n Error:", error);
        }
    }

    // Event listenery
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage(chatInput.value);
    });
});
