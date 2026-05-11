document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const textInput = document.getElementById('user-input');
    const feedBox = document.getElementById('chat-history');
    const historyList = document.getElementById('history-list');
    const btnNewChat = document.getElementById('btn-new-chat');

    const modeTabs = document.querySelectorAll('.mode-tab');
    const filePicker = document.getElementById('file-picker');
    const btnAttach = document.getElementById('btn-attach');

    const modeSelector = document.getElementById('ai-mode-selector');
    const customBar = document.getElementById('custom-prompt-bar');
    const customInput = document.getElementById('custom-system-input');

    const mediaPreview = document.getElementById('composer-media-preview');
    const mediaVisual = document.getElementById('media-visual-container');
    const filenameLabel = document.getElementById('media-filename');
    const btnClearMedia = document.getElementById('btn-clear-media');
    
    const btnSend = document.getElementById('btn-send');
    const btnStop = document.getElementById('btn-stop');
    const innerSidebar = document.getElementById('itinerary-panel');
    const sidepanelItinBtn = document.getElementById('sidepanel-itin-btn');
    const itinChevron = document.getElementById('itin-chevron-icon');

    if (sidepanelItinBtn && innerSidebar) {
        sidepanelItinBtn.addEventListener('click', () => {
            innerSidebar.classList.toggle('collapsed');
            if(itinChevron) {
                itinChevron.classList.toggle('closed');
            }
        });
    }

    let currentMode = 'text'; 
    let conversationHistory = [];
    let currentMediaData = null;
    let currentSessionId = null;
    let activeController = null; 

    const SYSTEM_PROMPTS = {
        default: "Kamu adalah Asisten Travel Pintar. Jawab dengan ramah, rapi, dan informatif.",
        itinerary: "Kamu adalah Perencana Perjalanan. Buatkan rute terstruktur, hitungan budget, dan waktu yang efisien.",
        translator: "Kamu adalah Penerjemah Ahli. Terjemahkan input dan berikan konteks budaya yang relevan."
    };

    modeTabs.forEach(item => {
        item.addEventListener('click', () => {
            modeTabs.forEach(t => t.classList.remove('active'));
            item.classList.add('active');

            currentMode = item.getAttribute('data-mode');
            const acceptTypes = item.getAttribute('data-accept');
            
            filePicker.setAttribute('accept', acceptTypes);
            
            if (currentMode === 'text') {
                btnAttach.style.opacity = '0.3';
                btnAttach.style.pointerEvents = 'none';
                clearCurrentMedia();
            } else {
                btnAttach.style.opacity = '1';
                btnAttach.style.pointerEvents = 'auto';
            }
        });
    });

    modeSelector.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customBar.style.display = 'block';
            customInput.focus();
        } else {
            customBar.style.display = 'none';
        }
    });

    function getActivePersona() {
        const val = modeSelector.value;
        if (val === 'custom') {
            return customInput.value.trim() || SYSTEM_PROMPTS.default;
        }
        return SYSTEM_PROMPTS[val] || SYSTEM_PROMPTS.default;
    }

    btnAttach.addEventListener('click', () => filePicker.click());

    filePicker.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const base64Full = evt.target.result;
            currentMediaData = {
                data: base64Full.split(',')[1],
                mimeType: file.type,
                name: file.name,
                full: base64Full
            };
            
            renderPreviewThumb(file.type, base64Full);
            filenameLabel.innerText = file.name;
            mediaPreview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    });

    function renderPreviewThumb(mime, dataUrl) {
        mediaVisual.innerHTML = '';
        if (mime.startsWith('image/')) {
            mediaVisual.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
        } else if (mime.startsWith('audio/')) {
            mediaVisual.innerHTML = `<span style="font-size: 16px;">🎵</span>`;
        } else {
            mediaVisual.innerHTML = `<span style="font-size: 16px;">📄</span>`;
        }
    }

    function clearCurrentMedia() {
        currentMediaData = null;
        filePicker.value = "";
        mediaPreview.style.display = 'none';
    }
    btnClearMedia.addEventListener('click', clearCurrentMedia);

    function getAllSessions() {
        const d = localStorage.getItem('zag_travel_logs');
        return d ? JSON.parse(d) : {};
    }
    function saveAllSessions(obj) {
        localStorage.setItem('zag_travel_logs', JSON.stringify(obj));
    }

    function initSession() {
        currentSessionId = 'trip_' + Date.now();
        conversationHistory = [];
        feedBox.innerHTML = `
        <div class="welcome-console" id="welcome-screen">
          <div class="pulse-ring" style="background: #e0f2fe; border-color: #7dd3fc; font-size: 2.5rem; width: 80px; height: 80px; margin-bottom: 24px;">🗻</div>
          <h2 style="font-size: 1.8rem; margin-bottom: 12px; color: #0f172a; letter-spacing: -0.03em;">Persiapan ke Tokyo, BigBoss?</h2>
          <p style="color: #64748b; margin-bottom: 32px; font-size: 1rem;">Jadwal terbangmu tinggal 5 hari lagi! Ada yang mau dipersiapkan?</p>
          
          <div class="quick-suggestions">
             <div class="suggestion-card" onclick="document.getElementById('user-input').value='Buatkan itinerary jalan kaki 1 hari penuh eksplorasi Shinjuku dan Shibuya.'; document.getElementById('chat-form').dispatchEvent(new Event('submit'));">
                <span class="sugg-icon">🗺️</span>
                <div class="sugg-text">Itinerary Shinjuku</div>
             </div>
             <div class="suggestion-card" onclick="document.getElementById('user-input').value='Apa saja rekomendasi makanan street-food Halal di sekitar Asakusa Tokyo?'; document.getElementById('chat-form').dispatchEvent(new Event('submit'));">
                <span class="sugg-icon">🍜</span>
                <div class="sugg-text">Cari Kuliner Halal</div>
             </div>
             <div class="suggestion-card" onclick="document.getElementById('user-input').value='Tolong buatkan list frasa bahasa Jepang dasar untuk belanja dan menawar harga.'; document.getElementById('chat-form').dispatchEvent(new Event('submit'));">
                <span class="sugg-icon">🗣️</span>
                <div class="sugg-text">Panduan Bahasa</div>
             </div>
          </div>
        </div>`;
        renderSidebar();
    }

    function loadSession(id) {
        const sessions = getAllSessions();
        const session = sessions[id];
        if (!session) return;

        currentSessionId = id;
        conversationHistory = session.history;
        feedBox.innerHTML = '';

        for (let i = 0; i < conversationHistory.length; i += 2) {
            const userMsg = conversationHistory[i];
            const modelMsg = conversationHistory[i+1];
            if (!userMsg || userMsg.role !== 'user') continue;

            const mediaHtml = getMediaRenderHtml(userMsg.mediaInfo);
            renderChatPair(userMsg.text, mediaHtml, modelMsg ? modelMsg.text : '');
        }
        renderSidebar();
    }

    function getMediaRenderHtml(media) {
        if (!media || !media.mimeType) return "";
        if (media.mimeType.startsWith('image/')) {
            return `<img src="data:${media.mimeType};base64,${media.data}" class="inline-media">`;
        }
        if (media.mimeType.startsWith('audio/')) {
            return `<div class="inline-media-tag">🎵 Lampiran Audio: ${media.name}</div>`;
        }
        return `<div class="inline-media-tag">📄 Lampiran Dokumen: ${media.name}</div>`;
    }

    function commitSession(firstPrompt) {
        const sessions = getAllSessions();
        if (!sessions[currentSessionId]) {
            sessions[currentSessionId] = {
                id: currentSessionId,
                title: firstPrompt.substring(0, 25) + '...',
                stamp: Date.now(),
                history: []
            };
        }
        sessions[currentSessionId].history = conversationHistory;
        saveAllSessions(sessions);
        renderSidebar();
    }

    function renderSidebar() {
        const sessions = getAllSessions();
        historyList.innerHTML = '';
        const ids = Object.keys(sessions).sort((a,b) => sessions[b].stamp - sessions[a].stamp);
        if (ids.length === 0) {
            historyList.innerHTML = '<div style="padding:10px; color:#9ca3af; font-size:0.8rem; font-style:italic;">Belum ada riwayat percakapan.</div>';
            return;
        }
        ids.forEach(id => {
            const s = sessions[id];
            const item = document.createElement('div');
            item.className = `history-item ${id === currentSessionId ? 'active' : ''}`;
            item.innerText = s.title;
            item.addEventListener('click', () => loadSession(id));
            historyList.appendChild(item);
        });
    }

    function renderChatPair(inputText, mediaHtml, initialOutput = "") {
        const currentW = document.getElementById('welcome-screen');
        if (currentW) currentW.style.display = 'none';

        const pairWrap = document.createElement('div');
        pairWrap.className = 'travel-interaction-block';
        
        pairWrap.innerHTML = `
            <div class="travel-query-pill">
                <span style="font-size:1.1rem;">📍</span>
                <span>${inputText || 'Pencarian Media'}</span>
            </div>
            ${mediaHtml ? `<div style="margin-bottom:16px;">${mediaHtml}</div>` : ''}
            <div class="travel-result-card">
                <div class="result-body">${formatMd(initialOutput)}</div>
            </div>
        `;

        feedBox.appendChild(pairWrap);
        scrollBtm();
        return pairWrap.querySelector('.result-body');
    }

    function formatMd(str) {
        if (!str) return "";
        try {
            return DOMPurify.sanitize(marked.parse(str));
        } catch(e) { return str; }
    }

    function scrollBtm() {
        feedBox.scrollTop = feedBox.scrollHeight;
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = textInput.value.trim();
        if (!prompt && !currentMediaData) return;

        const frozenMedia = currentMediaData;
        const activeMode = currentMode;
        const isFirst = (conversationHistory.length === 0);

        textInput.value = "";
        textInput.style.height = 'auto';
        clearCurrentMedia();

        const userEntry = { role: 'user', text: prompt, mode: activeMode };
        if (frozenMedia) {
            userEntry.image = { data: frozenMedia.data, mimeType: frozenMedia.mimeType };
            userEntry.mediaInfo = { data: frozenMedia.data, mimeType: frozenMedia.mimeType, name: frozenMedia.name };
        }
        conversationHistory.push(userEntry);

        const mediaMarkup = getMediaRenderHtml(userEntry.mediaInfo);
        const outputNode = renderChatPair(prompt, mediaMarkup, "");
        outputNode.classList.add('typing-line');

        btnSend.style.display = 'none';
        btnStop.style.display = 'flex';
        activeController = new AbortController();

        let buffer = "";
        const chosenSystemPrompt = getActivePersona();
        
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: activeController.signal, 
                body: JSON.stringify({
                    conversation: conversationHistory,
                    systemPrompt: chosenSystemPrompt
                })
            });

            if (!res.ok) throw new Error("Fail");

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                outputNode.innerHTML = formatMd(buffer);
                scrollBtm();
            }

            conversationHistory.push({ role: 'model', text: buffer });
            commitSession(isFirst ? (prompt || frozenMedia.name) : null);

        } catch (err) {
            if (err.name === 'AbortError') {
                outputNode.innerHTML += ` <span style="color:#9ca3af; font-style:italic;">(Dihentikan)</span>`;
                conversationHistory.push({ role: 'model', text: buffer + " (Dihentikan)" });
            } else {
                outputNode.innerHTML = `<span style="color:#ef4444;">Koneksi gagal. Silakan periksa jaringan Anda.</span>`;
            }
        } finally {
            outputNode.classList.remove('typing-line');
            scrollBtm();
            textInput.focus();
            activeController = null;

            btnSend.style.display = 'flex';
            btnStop.style.display = 'none';
        }
    });

    btnStop.addEventListener('click', () => {
        if (activeController) {
            activeController.abort();
        }
    });

    textInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
    
    textInput.addEventListener('keydown', function(e) {
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    })

    initSession();
});
