/**
 * ORION Web Assistant - Kompletní Chat Logic v2.2
 * Oprava inicializace, CSS závislostí a webhooku
 */

document.addEventListener('DOMContentLoaded', () => {
    // Propojení s config.js
    const cfg = window.ORION_CONFIG || {};
    // Paměť prohlížeče, aby n8n vědělo, že mluví se stejným člověkem
    let sessionId = localStorage.getItem('orion_session_id');
    if (!sessionId) {
        sessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        localStorage.setItem('orion_session_id', sessionId);
    }

    // 1. VYTVOŘENÍ CHATOVÉHO ROZHRANÍ
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
             function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        
        // Ikonka robota
        const assistantAvatar = `
            <div class="chat-avatar assistant-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </div>`;
            
        // Ikonka uživatele
        const userAvatar = `
            <div class="chat-avatar user-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>`;

        // Poskládání HTML (Robot má ikonku vlevo, uživatel vpravo)
        if (sender === 'assistant') {
            msgDiv.innerHTML = `${assistantAvatar}<div class="message-content">${text}</div>`;
        } else {
            msgDiv.innerHTML = `<div class="message-content">${text}</div>${userAvatar}`;
        }

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }
                <form id="chat-form" class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Napište zprávu..." autocomplete="off">
                    <button type="submit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(chatWrapper);

        const fab = document.getElementById('orion-chat-fab');
        const windowChat = document.getElementById('orion-chat-window');
        const close = document.getElementById('close-chat');

        fab.addEventListener('click', () => windowChat.classList.toggle('hidden'));
        close.addEventListener('click', () => windowChat.classList.add('hidden'));
    }

    // SPUSŤ FUNKCI! (Tohle předtím chybělo)
    initChat();

    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        msgDiv.innerHTML = `<div class="message-content">${text}</div>`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    function renderQuickReplies(repliesRaw) {
        const oldReplies = document.querySelector('.quick-replies-container');
        if (oldReplies) oldReplies.remove();
        if (!repliesRaw) return;

        try {
            const replies = typeof repliesRaw === 'string' ? JSON.parse(repliesRaw) : repliesRaw;
            if (Array.isArray(replies) && replies.length > 0) {
                const container = document.createElement('div');
                container.className = 'quick-replies-container';
                replies.forEach(text => {
                    const btn = document.createElement('button');
                    btn.className = 'quick-reply-btn';
                    btn.textContent = text;
                    btn.onclick = () => {
                        handleSendMessage(text);
                        container.remove();
                    };
                    container.appendChild(btn);
                });
                chatMessages.appendChild(container);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } catch (e) { console.error("Chyba Quick Replies:", e); }
    }

    async function handleSendMessage(text) {
        if (!text.trim()) return;
        appendMessage('user', text);
        chatInput.value = '';
        const typingDiv = appendMessage('assistant', '...');

        // Zkontrolujeme, jestli máme URL
        if (!cfg.N8N_WEBHOOK_URL) {
            typingDiv.remove();
            appendMessage('assistant', 'Systém není správně nakonfigurován (chybí webhook).');
            return;
        }

        try {
            const response = await fetch(cfg.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatInput: text,
                    sessionId: sessionId
                })
            });

            const data = await response.json();
            typingDiv.remove();
            
            const aiText = data.output || "Omlouvám se, Orion momentálně neodpovídá.";
            appendMessage('assistant', aiText);

            if (data.kb_quick_replies) {
                renderQuickReplies(data.kb_quick_replies);
            }
        } catch (error) {
            typingDiv.remove();
            appendMessage('assistant', 'Došlo k chybě při komunikaci s mozkem (n8n).');
            console.error("Fetch Error:", error);
        }
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage(chatInput.value);
    });
});
