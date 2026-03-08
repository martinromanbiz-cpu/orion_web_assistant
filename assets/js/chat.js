/**
 * ORION Web Assistant - Chat Logic v4.1 (Full Fix)
 */

document.addEventListener('DOMContentLoaded', () => {
    const cfg = window.ORION_CONFIG || {};
    
    // Inicializace Session ID
    let sessionId = localStorage.getItem('orion_session_id');
    if (!sessionId) {
        sessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        localStorage.setItem('orion_session_id', sessionId);
    }

    // 1. Funkce pro vytvoření HTML struktury chatu
    function initChat() {
        if (document.getElementById('orion-chat-wrapper')) return;

        const chatWrapper = document.createElement('div');
        chatWrapper.id = 'orion-chat-wrapper';
        
        chatWrapper.innerHTML = `
            <div id="orion-chat-fab" class="chat-fab">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </div>
            <div id="orion-chat-window" class="chat-window hidden">
                <div class="chat-header">
                    <div class="header-info">
                        <span class="status-dot"></span>
                        <strong>Orion Assistant</strong>
                    </div>
                    <button id="close-chat">&times;</button>
                </div>
                
                <div id="chat-messages" class="chat-messages">
                    <div class="message assistant-message">
                        <div class="chat-avatar assistant-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </div>
                        <div class="message-content">Dobrý den, jsem digitální asistent Orion. Pomáhám firmám ušetřit desítky hodin měsíčně tím, že za lidi vyřizuji neustále se opakující dotazy zákazníků. Co Váš tým aktuálně nejvíce zdržuje od skutečné práce?</div>
                    </div>
                </div>

                <div id="chat-suggestions" class="chat-suggestions"></div>

                <form id="chat-form" class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Napište zprávu..." autocomplete="off">
                    <button type="submit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(chatWrapper);

        // Eventy pro otevírání/zavírání
        const fab = document.getElementById('orion-chat-fab');
        const windowChat = document.getElementById('orion-chat-window');
        const close = document.getElementById('close-chat');

        if (fab && windowChat && close) {
            fab.addEventListener('click', () => windowChat.classList.toggle('hidden'));
            close.addEventListener('click', () => windowChat.classList.add('hidden'));
        }
    }

    // Spuštění inicializace
    initChat();

    // Reference na elementy
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatSuggestions = document.getElementById('chat-suggestions');

    // 2. Funkce pro přidání bubliny do chatu
    function appendMessage(sender, text) {
        if (!chatMessages) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        
        const assistantAvatar = `
            <div class="chat-avatar assistant-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </div>`;
            
        const userAvatar = `
            <div class="chat-avatar user-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>`;

        if (sender === 'assistant') {
            msgDiv.innerHTML = `${assistantAvatar}<div class="message-content">${text}</div>`;
        } else {
            msgDiv.innerHTML = `<div class="message-content">${text}</div>${userAvatar}`;
        }

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    // 3. Funkce pro správu rychlých odpovědí ve spodní liště
    function updateSuggestions(repliesArray) {
        if (!chatSuggestions) return;
        chatSuggestions.innerHTML = '';
        
        if (!repliesArray || repliesArray.length === 0) {
            chatSuggestions.style.display = 'none';
            return;
        }
        
        chatSuggestions.style.display = 'flex';
        repliesArray.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.textContent = text;
            btn.onclick = () => {
                handleSendMessage(text);
                chatSuggestions.style.display = 'none';
            };
            chatSuggestions.appendChild(btn);
        });
    }

    // 4. Hlavní funkce pro odeslání zprávy a komunikaci s n8n
    async function handleSendMessage(text) {
        if (!text || !text.trim()) return;
        
        appendMessage('user', text);
        chatInput.value = '';
        const typingDiv = appendMessage('assistant', '...');

        if (!cfg.N8N_WEBHOOK_URL) {
            if (typingDiv) typingDiv.remove();
            appendMessage('assistant', 'Chyba: Webhook není nakonfigurován.');
            return;
        }

        try {
            const response = await fetch(cfg.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatInput: text, sessionId: sessionId })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            if (typingDiv) typingDiv.remove();
            
            // Extrakce textu z n8n odpovědi (podporuje různé formáty)
            const aiText = data.output || data.text || data.message || "Omlouvám se, Orion momentálně neodpovídá.";
            appendMessage('assistant', aiText);

            // Zobrazení nových tlačítek z n8n
            if (data.kb_quick_replies) {
                let replies = data.kb_quick_replies;
                if (typeof replies === 'string') {
                    try { replies = JSON.parse(replies); } catch(e) { replies = []; }
                }
                updateSuggestions(replies);
            }
        } catch (error) {
            if (typingDiv) typingDiv.remove();
            appendMessage('assistant', 'Došlo k chybě při spojení se serverem.');
            console.error('Chat error:', error);
        }
    }

    // Event listener pro formulář
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSendMessage(chatInput.value);
        });
    }

    // Úvodní sada tlačítek
    updateSuggestions([
        "Kolik to stojí?",
        "Co asistent umí?",
        "Dá se to nasadit na náš web?",
        "Jak dlouho trvá nasazení?",
        "Mám zájem o konzultaci"
    ]);
});
