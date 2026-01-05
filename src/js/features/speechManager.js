/**
 * Speech to Text Editor
 * Точная копия из оригинального файла - БЕЗ изменений
 */

class SpeechToTextEditor {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.history = [];
        this.historyStep = -1;
        this.transcriptItems = [];
        this.confidence = 0;
        this.currentLanguage = 'ru-RU';
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;

        this.settings = {
            continuous: true,
            interimResults: true,
            autoPunctuation: true,
            autoCapitalize: false,
            soundFeedback: true,
            maxAlternatives: 3,
            silenceTimeout: 5000
        };
    }

    init() {
        this.initSpeechRecognition();
        this.setupEventListeners();
        this.updateStats();
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            this.addTranscriptItem('❌ Speech Recognition not supported', false);
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = this.settings.continuous;
        this.recognition.interimResults = this.settings.interimResults;
        this.recognition.language = this.currentLanguage;
        this.recognition.maxAlternatives = this.settings.maxAlternatives;

        this.recognition.onstart = () => {
            console.log('[Speech] EVENT: onstart');
            this.onStart();
        };
        this.recognition.onresult = (event) => {
            console.log('[Speech] EVENT: onresult', event.results.length);
            this.onResult(event);
        };
        this.recognition.onerror = (event) => {
            console.log('[Speech] EVENT: onerror', event.error, event.message);
            this.onError(event);
        };
        this.recognition.onend = () => {
            console.log('[Speech] EVENT: onend');
            this.onEnd();
        };
        this.recognition.onaudiostart = () => console.log('[Speech] EVENT: onaudiostart');
        this.recognition.onaudioend = () => console.log('[Speech] EVENT: onaudioend');
        this.recognition.onspeechstart = () => console.log('[Speech] EVENT: onspeechstart');
        this.recognition.onspeechend = () => console.log('[Speech] EVENT: onspeechend');
        this.recognition.onsoundstart = () => console.log('[Speech] EVENT: onsoundstart');
        this.recognition.onsoundend = () => console.log('[Speech] EVENT: onsoundend');
        this.recognition.onnomatch = () => console.log('[Speech] EVENT: onnomatch');
    }

    initAudioVisualization() {
        if (this.audioContext) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then(stream => {
                    const source = this.audioContext.createMediaStreamSource(stream);
                    this.analyser = this.audioContext.createAnalyser();
                    this.analyser.fftSize = 256;
                    this.analyser.smoothingTimeConstant = 0.85;
                    source.connect(this.analyser);
                    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                    this.drawEqualizer();
                })
                .catch(err => {
                    console.error('Microphone access error:', err);
                    this.addTranscriptItem('🎤 Разрешите доступ к микрофону', false);
                });
        } catch (e) {
            console.error('Audio initialization error:', e);
        }
    }

    drawEqualizer() {
        const canvas = document.getElementById('audioCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;

        canvas.width = width;
        canvas.height = height;

        const draw = () => {
            if (!this.analyser || !this.dataArray) {
                this.animationId = requestAnimationFrame(draw);
                return;
            }

            this.analyser.getByteFrequencyData(this.dataArray);

            ctx.fillStyle = '#0f0f0f';
            ctx.fillRect(0, 0, width, height);

            const barWidth = width / 64;
            let x = 0;

            for (let i = 0; i < 64; i++) {
                const index = Math.floor((i / 64) * this.dataArray.length);
                const value = this.dataArray[index];
                const barHeight = (value / 255) * height;

                if (i < 20) {
                    ctx.fillStyle = '#32b8c6';
                } else if (i < 45) {
                    ctx.fillStyle = '#ffa500';
                } else {
                    ctx.fillStyle = '#ff6b6b';
                }

                ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
                x += barWidth;
            }

            this.animationId = requestAnimationFrame(draw);
        };

        draw();
    }

    setupEventListeners() {
        document.getElementById('startBtn')?.addEventListener('click', () => this.startRecording());
        document.getElementById('stopBtn')?.addEventListener('click', () => this.stopRecording());
        document.getElementById('pauseBtn')?.addEventListener('click', () => this.pauseRecording());
        document.getElementById('resumeBtn')?.addEventListener('click', () => this.resumeRecording());

        document.getElementById('clearBtn')?.addEventListener('click', () => this.clearText());
        document.getElementById('copyBtn')?.addEventListener('click', () => this.copyText());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportText());

        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());

        document.getElementById('upperBtn')?.addEventListener('click', () => this.toUpperCase());
        document.getElementById('lowerBtn')?.addEventListener('click', () => this.toLowerCase());
        document.getElementById('capitalBtn')?.addEventListener('click', () => this.capitalize());

        document.getElementById('findBtn')?.addEventListener('click', () => this.openFindDialog());
        document.getElementById('replaceBtn')?.addEventListener('click', () => this.openReplaceDialog());

        document.getElementById('textEditor')?.addEventListener('input', () => this.updateStats());
        document.getElementById('languageSelect')?.addEventListener('change', (e) => this.changeLanguage(e.target.value));

        document.getElementById('settingsBtn')?.addEventListener('click', () => this.toggleSettings());
        document.getElementById('closeSettings')?.addEventListener('click', () => this.toggleSettings());

        // Settings
        document.getElementById('continuousToggle')?.addEventListener('click', () => {
            this.settings.continuous = !this.settings.continuous;
            this.recognition.continuous = this.settings.continuous;
            document.getElementById('continuousToggle')?.classList.toggle('on');
        });

        document.getElementById('interimToggle')?.addEventListener('click', () => {
            this.settings.interimResults = !this.settings.interimResults;
            this.recognition.interimResults = this.settings.interimResults;
            document.getElementById('interimToggle')?.classList.toggle('on');
        });

        document.getElementById('punctuationToggle')?.addEventListener('click', () => {
            this.settings.autoPunctuation = !this.settings.autoPunctuation;
            document.getElementById('punctuationToggle')?.classList.toggle('on');
        });

        document.getElementById('autoCapitalizeToggle')?.addEventListener('click', () => {
            this.settings.autoCapitalize = !this.settings.autoCapitalize;
            document.getElementById('autoCapitalizeToggle')?.classList.toggle('on');
        });

        document.getElementById('soundToggle')?.addEventListener('click', () => {
            this.settings.soundFeedback = !this.settings.soundFeedback;
            document.getElementById('soundToggle')?.classList.toggle('on');
        });

        document.getElementById('fontSizeInput')?.addEventListener('change', (e) => {
            document.getElementById('textEditor').style.fontSize = e.target.value + 'px';
        });

        document.getElementById('maxAltInput')?.addEventListener('change', (e) => {
            this.settings.maxAlternatives = parseInt(e.target.value);
            this.recognition.maxAlternatives = this.settings.maxAlternatives;
        });

        document.getElementById('silenceInput')?.addEventListener('change', (e) => {
            this.settings.silenceTimeout = parseInt(e.target.value);
        });
    }

    startRecording() {
        console.log('=== startRecording ===');
        
        if (!this.recognition) {
            console.error('Recognition not initialized!');
            return;
        }

        // Обновить UI сразу
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resumeBtn = document.getElementById('resumeBtn');
        const statusBadge = document.getElementById('statusBadge');

        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = false;
        if (resumeBtn) resumeBtn.disabled = true;
        
        if (statusBadge) {
            statusBadge.textContent = 'Запуск...';
            statusBadge.className = 'status-badge processing';
        }

        // Запустить визуализацию
        this.initAudioVisualization();
        
        this.isListening = true;
        this.isPaused = false;
        this.startTime = Date.now() - this.pausedTime;
        this.pausedTime = 0;

        // Попробовать запустить распознавание
        try {
            this.recognition.start();
            this.startTimer();
        } catch (e) {
            console.error('Recognition start error:', e);
            // Сбросить состояние
            this.isListening = false;
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
            if (pauseBtn) pauseBtn.disabled = true;
            if (resumeBtn) resumeBtn.disabled = true;
            if (statusBadge) {
                statusBadge.textContent = 'Ошибка: ' + e.message;
                statusBadge.className = 'status-badge';
            }
        }
    }

    stopRecording() {
        console.log('=== stopRecording ===');
        if (!this.recognition) return;

        this.isListening = false;
        
        // Остановить анимацию
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            const canvas = document.getElementById('audioCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        
        // Закрыть аудио контекст для возможности повторного запуска
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
            this.analyser = null;
            this.dataArray = null;
        }
        
        const stopBtn = document.getElementById('stopBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resumeBtn = document.getElementById('resumeBtn');
        const startBtn = document.getElementById('startBtn');
        
        if (stopBtn) stopBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = true;
        if (resumeBtn) resumeBtn.disabled = true;
        if (startBtn) startBtn.disabled = false;

        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) {
            statusBadge.textContent = 'Обработка...';
            statusBadge.className = 'status-badge processing';
        }

        this.recognition.stop();
        
        // Остановить таймер
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    pauseRecording() {
        this.isPaused = true;
        this.pausedTime = Date.now() - this.startTime;

        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('resumeBtn').disabled = false;

        document.getElementById('statusBadge').textContent = 'Paused';
        document.getElementById('statusBadge').className = 'status-badge warning';

        this.recognition.abort();
    }

    resumeRecording() {
        this.isPaused = false;
        this.startTime = Date.now() - this.pausedTime;

        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('resumeBtn').disabled = true;

        document.getElementById('statusBadge').textContent = 'Listening...';
        document.getElementById('statusBadge').className = 'status-badge listening';

        this.recognition.start();
    }

    onStart() {
        console.log('Speech recognition started');
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) {
            statusBadge.textContent = 'Слушаю...';
            statusBadge.className = 'status-badge listening';
        }
    }

    onResult(event) {
        console.log('=== onResult ===', event.results.length, 'results');
        
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            this.confidence = Math.round(event.results[i][0].confidence * 100);
            
            console.log('Transcript:', transcript, 'isFinal:', event.results[i].isFinal);

            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }

        console.log('Final:', finalTranscript, 'Interim:', interimTranscript);

        if (finalTranscript) {
            const processed = this.settings.autoPunctuation ?
                this.addPunctuation(finalTranscript) : finalTranscript;

            const editor = document.getElementById('textEditor');
            console.log('Editor element:', !!editor);
            
            if (editor) {
                if (editor.value && !editor.value.endsWith(' ')) {
                    editor.value += ' ';
                }
                editor.value += processed;
                console.log('Text added:', processed);

                this.saveToHistory(editor.value);
            }
            this.addTranscriptItem(finalTranscript, true);
        }

        if (interimTranscript) {
            this.addTranscriptItem(interimTranscript, false);
        }

        const confEl = document.getElementById('confidence');
        if (confEl) confEl.textContent = this.confidence + '%';
        this.updateStats();
    }

    onError(event) {
        console.error('Speech recognition error:', event.error);

        // Сбросить состояние при ошибке
        this.isListening = false;
        
        // Остановить визуализацию
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Очистить canvas
        const canvas = document.getElementById('audioCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0f0f0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Сбросить аудио контекст
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
            this.analyser = null;
            this.dataArray = null;
        }

        // Сбросить кнопки
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resumeBtn = document.getElementById('resumeBtn');
        
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = true;
        if (resumeBtn) resumeBtn.disabled = true;

        // Обновить статус
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) {
            statusBadge.textContent = 'Ошибка: ' + event.error;
            statusBadge.className = 'status-badge';
            statusBadge.style.borderColor = '#ff6b6b';
            statusBadge.style.color = '#ff6b6b';
        }

        // Остановить таймер
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    onEnd() {
        console.log('=== onEnd ===');
        this.isListening = false;
        
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) {
            statusBadge.textContent = 'Готов';
            statusBadge.className = 'status-badge ready';
        }
        
        // Сбросить кнопки
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resumeBtn = document.getElementById('resumeBtn');
        
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = true;
        if (resumeBtn) resumeBtn.disabled = true;
        
        // Остановить таймер
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    addTranscriptItem(text, isFinal) {
        const item = document.createElement('div');
        item.className = 'transcript-item' + (isFinal ? ' final' : ' interim');
        item.textContent = text.substring(0, 100);
        item.title = text;

        item.addEventListener('click', () => {
            const editor = document.getElementById('textEditor');
            editor.value += ' ' + text;
            this.updateStats();
            this.saveToHistory(editor.value);
        });

        const history = document.getElementById('transcriptHistory');
        history.insertBefore(item, history.firstChild);

        if (history.children.length > 20) {
            history.removeChild(history.lastChild);
        }
    }

    addPunctuation(text) {
        return text
            .replace(/\s+$/g, '')
            .replace(/([.!?])\s+/g, '$1 ')
            + '.';
    }

    startTimer() {
        // Увеличен интервал с 100ms до 1000ms для производительности
        this.timerInterval = setInterval(() => {
            if (this.isListening) {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
                const secs = String(elapsed % 60).padStart(2, '0');
                const durationEl = document.getElementById('duration');
                if (durationEl) durationEl.textContent = `${mins}:${secs}`;
            }
        }, 1000);
    }

    updateStats() {
        const text = document.getElementById('textEditor')?.value || '';
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;

        const charCount = document.getElementById('charCount');
        const wordCount = document.getElementById('wordCount');
        if (charCount) charCount.textContent = chars;
        if (wordCount) wordCount.textContent = words;
    }

    changeLanguage(lang) {
        this.currentLanguage = lang;
        this.recognition.language = lang;

        const langNames = {
            'ru-RU': '🇷🇺 Русский',
            'en-US': '🇺🇸 English',
            'zh-CN': '🇨🇳 中文',
            'de-DE': '🇩🇪 Deutsch',
            'fr-FR': '🇫🇷 Français',
            'es-ES': '🇪🇸 Español',
            'ja-JP': '🇯🇵 日本語'
        };

        document.getElementById('langInfo').textContent = langNames[lang];
    }

    clearText() {
        if (confirm('Clear all text?')) {
            document.getElementById('textEditor').value = '';
            document.getElementById('transcriptHistory').innerHTML = '';
            this.history = [];
            this.historyStep = -1;
            this.updateStats();
        }
    }

    copyText() {
        const text = document.getElementById('textEditor').value;
        navigator.clipboard.writeText(text).then(() => {
            this.playSound('success');
            alert('Text copied to clipboard!');
        });
    }

    exportText() {
        const text = document.getElementById('textEditor').value;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `speech-to-text-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    saveToHistory(text) {
        this.history.splice(this.historyStep + 1);
        this.history.push(text);
        this.historyStep++;

        document.getElementById('undoBtn').disabled = this.historyStep === 0;
        document.getElementById('redoBtn').disabled = true;
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            document.getElementById('textEditor').value = this.history[this.historyStep];
            document.getElementById('redoBtn').disabled = false;
            if (this.historyStep === 0) {
                document.getElementById('undoBtn').disabled = true;
            }
            this.updateStats();
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            document.getElementById('textEditor').value = this.history[this.historyStep];
            document.getElementById('undoBtn').disabled = false;
            if (this.historyStep === this.history.length - 1) {
                document.getElementById('redoBtn').disabled = true;
            }
            this.updateStats();
        }
    }

    toUpperCase() {
        const editor = document.getElementById('textEditor');
        editor.value = editor.value.toUpperCase();
        this.saveToHistory(editor.value);
        this.updateStats();
    }

    toLowerCase() {
        const editor = document.getElementById('textEditor');
        editor.value = editor.value.toLowerCase();
        this.saveToHistory(editor.value);
        this.updateStats();
    }

    capitalize() {
        const editor = document.getElementById('textEditor');
        editor.value = editor.value.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        this.saveToHistory(editor.value);
        this.updateStats();
    }

    openFindDialog() {
        const modal = document.getElementById('speechModalOverlay');
        const modalBody = document.getElementById('speechModalBody');
        const modalTitle = document.getElementById('speechModalTitle');

        modalTitle.textContent = '🔍 Find Text';
        modalBody.innerHTML = `
            <div style="margin-bottom: 12px;">
                <input type="text" id="findInput" placeholder="Find..." style="width: 100%; padding: 8px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary); margin-bottom: 8px;">
                <div id="findResults" style="max-height: 300px; overflow-y: auto; font-size: 12px;"></div>
            </div>
        `;

        const findInput = document.getElementById('findInput');
        const findResults = document.getElementById('findResults');
        const text = document.getElementById('textEditor').value;

        findInput.addEventListener('input', () => {
            const search = findInput.value;
            if (!search) {
                findResults.innerHTML = '';
                return;
            }

            const regex = new RegExp(search, 'gi');
            let match;
            let count = 0;
            findResults.innerHTML = '';

            while ((match = regex.exec(text)) !== null && count < 20) {
                findResults.innerHTML += `<div style="padding: 4px; background: var(--bg-secondary); margin-bottom: 4px; border-radius: 2px;">...${text.substring(Math.max(0, match.index - 20), match.index)}<span style="background: var(--accent); color: white;">${match[0]}</span>${text.substring(match.index + match[0].length, match.index + match[0].length + 20)}...</div>`;
                count++;
            }

            if (count === 0) {
                findResults.innerHTML = '<div style="padding: 8px; color: var(--text-secondary);">No matches found</div>';
            }
        });

        modal.classList.add('show');
        findInput.focus();
    }

    openReplaceDialog() {
        const modal = document.getElementById('speechModalOverlay');
        const modalBody = document.getElementById('speechModalBody');
        const modalTitle = document.getElementById('speechModalTitle');

        modalTitle.textContent = '🔄 Find & Replace';
        modalBody.innerHTML = `
            <div style="margin-bottom: 12px;">
                <input type="text" id="findReplace" placeholder="Find..." style="width: 100%; padding: 8px; margin-bottom: 8px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary);">
                <input type="text" id="replaceWith" placeholder="Replace with..." style="width: 100%; padding: 8px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary);">
            </div>
        `;

        document.getElementById('speechModalConfirm').textContent = 'Replace All';
        document.getElementById('speechModalConfirm').onclick = () => {
            const findText = document.getElementById('findReplace').value;
            const replaceText = document.getElementById('replaceWith').value;
            const editor = document.getElementById('textEditor');
            const newText = editor.value.replaceAll(findText, replaceText);
            editor.value = newText;
            this.saveToHistory(newText);
            this.updateStats();
            modal.classList.remove('show');
        };

        modal.classList.add('show');
        document.getElementById('findReplace').focus();
    }

    toggleSettings() {
        document.getElementById('speechSettingsPanel').classList.toggle('open');
    }

    playSound(type) {
        if (!this.settings.soundFeedback) return;

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        switch(type) {
            case 'start':
                osc.frequency.value = 600;
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
                break;
            case 'stop':
                osc.frequency.value = 400;
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.2);
                break;
            case 'success':
                osc.frequency.value = 800;
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.15);
                break;
            case 'error':
                osc.frequency.value = 300;
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
                break;
        }
    }
}

export const speechManager = new SpeechToTextEditor();
