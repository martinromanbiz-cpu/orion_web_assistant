/**
 * ORION Web Assistant - Kompletní Chat Logic v2.1
 * Zahrnuje: Vytvoření ikony, Logiku chatu, Quick Replies & n8n
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. VYTVOŘENÍ CHATOVÉHO ROZHRANÍ (Pokud neexistuje v HTML)
    function initChat() {
        if (document.getElementById('orion-chat-wrapper')) return;

        const chatWrapper = document.createElement('div');
        chatWrapper.id = 'orion-chat-wrapper';
        // Upravené třídy tak, aby odpovídaly tvému prémiovému CSS
        chatWrapper.innerHTML = `
            <div id="orion-chat-fab" class="node active" style="position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; cursor: pointer; z-index: 1001;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 30px; height: 30px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </div>
            <div id="orion-chat-window" class="card glass-panel hidden" style="position: fixed; bottom: 100px; right: 30px; width: 350px; height: 500px; z-index: 1001; display: flex; flex-direction: column; padding: 0; overflow: hidden;">
                <div class="chat-header" style="background: var(--bg-dark); padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="width: 8px; height: 8px; background: var(--accent-cyan); border-radius: 50%; box-shadow: 0 0 8px var(--accent-cyan);"></span>
                        <strong class="blue-gradient-text">Orion Assistant</strong>
                    </div>
                    <button id="close-chat" style="background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div id="chat-messages" style="flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px;"></div>
                <form id="chat-form" style="padding: 15px; border-top: 1px solid var(--border-color); display: flex; gap: 10px;">
                    <input type="text" id="chat-input" placeholder="Napište zprávu..." autocomplete="off" style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; color: white; outline: none;">
                    <button type="submit" class="btn btn-primary" style="padding: 10px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button>
                </form>
            </div>
        `;
        document.body.appendChild(chatWrapper);

        const fab = document.getElementById('orion-chat-fab');
        const windowChat = document.getElementById('orion-chat-window');
        const close = document.getElementById('close-chat');

        fab.addEventListener('click', () => {
            windowChat.classList.toggle('hidden');
            if (!windowChat.classList.contains('hidden')) {
                windowChat.style.display = 'flex';
            } else {
                windowChat.style.display = 'none';
            }
        });
        close.addEventListener('click', () => {
            windowChat.classList.add('hidden');
            windowChat.style.display = 'none';
        });
    }

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
            typingDiv.remove();
            
            const aiText = data.output || "Omlouvám se, Orion je momentálně zaneprázdněn.";
            appendMessage('assistant', aiText);

            if (data.kb_quick_replies) {
                renderQuickReplies(data.kb_quick_replies);
            }
        } catch (error) {
            typingDiv.remove();
            appendMessage('assistant', 'Chyba připojení k Orion systému.');
        }
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage(chatInput.value);
    });
});
