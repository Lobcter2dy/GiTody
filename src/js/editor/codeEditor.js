/**
 * Code Editor Pro - оптимизированный редактор кода с подсветкой синтаксиса
 * @module CodeEditor
 */

const CONFIG = {
    HIGHLIGHT_DEBOUNCE: 100,    // Дебаунс подсветки синтаксиса
    LINE_NUMBERS_DEBOUNCE: 50,  // Дебаунс обновления номеров строк
    MAX_HISTORY: 100,           // Максимум записей истории
    TAB_SIZE: 4,                // Размер табуляции
};

class CodeEditor {
    constructor() {
        this.currentFile = null;
        this.files = new Map();
        this.history = [];
        this.historyStep = -1;
        this.syntaxRules = this.initSyntaxRules();
        
        // Дебаунс таймеры
        this._highlightTimer = null;
        this._lineNumbersTimer = null;
        this._historyTimer = null;
        
        // Кэш элементов DOM
        this._elements = {};
        
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize(), { once: true });
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.cacheElements();
        this.setupEventListeners();
        this.updateLineNumbers();
    }

    /**
     * Кэширование DOM элементов для производительности
     */
    cacheElements() {
        this._elements = {
            mirror: document.getElementById('codeInput'),
            display: document.getElementById('codeDisplay'),
            lineNumbers: document.getElementById('lineNumbers'),
            tabs: document.getElementById('editorTabs'),
            lineCol: document.getElementById('editorLineCol'),
            charCount: document.getElementById('editorChars'),
            lang: document.getElementById('editorLang'),
            console: document.getElementById('consoleOutput'),
            consolePanel: document.getElementById('consolePanel')
        };
    }

    setupEventListeners() {
        const { mirror } = this._elements;
        if (!mirror) return;

        // Используем passive listeners где возможно
        mirror.addEventListener('input', () => this.onCodeChange(), { passive: true });
        mirror.addEventListener('scroll', () => this.syncScroll(), { passive: true });
        mirror.addEventListener('keydown', (e) => this.handleKeyboard(e));
        mirror.addEventListener('keyup', () => this.updateCursorPosition(), { passive: true });
        mirror.addEventListener('click', () => this.updateCursorPosition(), { passive: true });
    }

    initSyntaxRules() {
        return {
            javascript: {
                keywords: new Set(['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 
                           'class', 'new', 'this', 'true', 'false', 'null', 'undefined', 'async', 
                           'await', 'try', 'catch', 'throw', 'import', 'export', 'default', 'from',
                           'extends', 'static', 'get', 'set', 'typeof', 'instanceof', 'in', 'of',
                           'switch', 'case', 'break', 'continue', 'do', 'finally', 'debugger', 'delete',
                           'void', 'with', 'yield', 'super']),
                types: new Set(['String', 'Number', 'Boolean', 'Array', 'Object', 'Promise', 'Map', 'Set']),
                builtins: new Set(['console', 'document', 'window', 'Math', 'Date', 'JSON', 'parseInt', 
                          'parseFloat', 'setTimeout', 'setInterval', 'fetch', 'localStorage', 'sessionStorage'])
            },
            json: { keywords: new Set(['true', 'false', 'null']) },
            html: { keywords: new Set() },
            css: { keywords: new Set() },
            python: {
                keywords: new Set(['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import',
                          'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'pass', 'break',
                          'continue', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'global',
                          'nonlocal', 'assert', 'yield', 'raise', 'async', 'await', 'del'])
            }
        };
    }

    onCodeChange() {
        const { mirror } = this._elements;
        if (!mirror) return;

        const content = mirror.value;
        
        if (this.currentFile) {
            const fileData = this.files.get(this.currentFile);
            if (fileData) {
                fileData.content = content;
                fileData.modified = true;
            }
        }

        // Дебаунс подсветки синтаксиса
        clearTimeout(this._highlightTimer);
        this._highlightTimer = setTimeout(() => {
            requestAnimationFrame(() => this.highlightCode());
        }, CONFIG.HIGHLIGHT_DEBOUNCE);

        // Дебаунс номеров строк
        clearTimeout(this._lineNumbersTimer);
        this._lineNumbersTimer = setTimeout(() => {
            this.updateLineNumbers();
        }, CONFIG.LINE_NUMBERS_DEBOUNCE);

        this.updateCursorPosition();

        // Дебаунс истории
        clearTimeout(this._historyTimer);
        this._historyTimer = setTimeout(() => {
            this.addToHistory(content);
        }, 300);
    }

    addToHistory(content) {
        if (this.history.length === 0 || this.history[this.historyStep] !== content) {
            this.history.splice(this.historyStep + 1);
            this.history.push(content);
            this.historyStep++;
            
            if (this.history.length > CONFIG.MAX_HISTORY) {
                this.history.shift();
                this.historyStep--;
            }
        }
    }

    highlightCode() {
        const { mirror, display } = this._elements;
        if (!mirror || !display) return;

        const content = mirror.value;
        
        // Для больших файлов пропускаем подсветку
        if (content.length > 50000) {
            display.textContent = content;
            return;
        }

        const language = this.detectLanguage(this.currentFile || 'untitled.js');
        let highlighted = this.escapeHtml(content);

        switch(language) {
            case 'javascript':
            case 'typescript':
                highlighted = this.highlightJavaScript(highlighted);
                break;
            case 'json':
                highlighted = this.highlightJSON(highlighted);
                break;
            case 'python':
                highlighted = this.highlightPython(highlighted);
                break;
            case 'html':
                highlighted = this.highlightHTML(highlighted);
                break;
            case 'css':
                highlighted = this.highlightCSS(highlighted);
                break;
        }

        display.innerHTML = highlighted;
    }

    highlightJavaScript(code) {
        const { keywords } = this.syntaxRules.javascript;

        // Комментарии
        code = code.replace(/\/\/.*$/gm, '<span class="comment">$&</span>');
        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');

        // Строки
        code = code.replace(/"([^"\\]|\\.)*"/g, '<span class="string">$&</span>');
        code = code.replace(/'([^'\\]|\\.)*'/g, '<span class="string">$&</span>');
        code = code.replace(/`([^`\\]|\\.)*`/g, '<span class="string">$&</span>');

        // Числа
        code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

        // Ключевые слова - используем Set для O(1) lookup
        code = code.replace(/\b([a-z]+)\b/gi, (match) => {
            if (keywords.has(match)) {
                return `<span class="keyword">${match}</span>`;
            }
            return match;
        });

        // Функции
        code = code.replace(/(\w+)\s*\(/g, '<span class="function">$1</span>(');

        // Скобки
        code = code.replace(/[\{\}\[\]()]/g, '<span class="bracket">$&</span>');

        return code;
    }

    highlightJSON(code) {
        code = code.replace(/"([^"]*)":/g, '<span class="keyword">"$1"</span>:');
        code = code.replace(/:\s*"([^"]*)"/g, ': <span class="string">"$1"</span>');
        code = code.replace(/:\s*(\d+)/g, ': <span class="number">$1</span>');
        code = code.replace(/\b(true|false|null)\b/g, '<span class="keyword">$1</span>');
        return code;
    }

    highlightPython(code) {
        const { keywords } = this.syntaxRules.python;
        
        code = code.replace(/#.*$/gm, '<span class="comment">$&</span>');
        code = code.replace(/"""[\s\S]*?"""/g, '<span class="string">$&</span>');
        code = code.replace(/'''[\s\S]*?'''/g, '<span class="string">$&</span>');
        code = code.replace(/"([^"\\]|\\.)*"/g, '<span class="string">$&</span>');
        code = code.replace(/'([^'\\]|\\.)*'/g, '<span class="string">$&</span>');
        code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        
        code = code.replace(/\b([a-zA-Z_]+)\b/g, (match) => {
            if (keywords.has(match)) {
                return `<span class="keyword">${match}</span>`;
            }
            return match;
        });

        code = code.replace(/(\w+)\s*\(/g, '<span class="function">$1</span>(');
        return code;
    }

    highlightHTML(code) {
        code = code.replace(/&lt;!--[\s\S]*?--&gt;/g, '<span class="comment">$&</span>');
        code = code.replace(/&lt;(\/?)([\w-]+)/g, '&lt;$1<span class="keyword">$2</span>');
        code = code.replace(/(\w+)=["'][^"']*["']/g, '<span class="function">$&</span>');
        return code;
    }

    highlightCSS(code) {
        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');
        code = code.replace(/([\w-]+)\s*:/g, '<span class="keyword">$1</span>:');
        code = code.replace(/#[\da-fA-F]{3,6}/g, '<span class="string">$&</span>');
        code = code.replace(/(\d+)(px|em|rem|%|vh|vw)/g, '<span class="number">$1$2</span>');
        return code;
    }

    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, (char) => map[char]);
    }

    syncScroll() {
        const { mirror, display, lineNumbers } = this._elements;
        if (!mirror) return;

        // Используем requestAnimationFrame для плавной синхронизации
        requestAnimationFrame(() => {
            if (display) {
                display.scrollLeft = mirror.scrollLeft;
                display.scrollTop = mirror.scrollTop;
            }
            if (lineNumbers) {
                lineNumbers.scrollTop = mirror.scrollTop;
            }
        });
    }

    updateLineNumbers() {
        const { mirror, lineNumbers } = this._elements;
        if (!mirror || !lineNumbers) return;

        const lines = mirror.value.split('\n').length;
        const currentLines = lineNumbers.childElementCount;

        // Оптимизация: только добавляем/удаляем нужные строки
        if (lines === currentLines) return;

        // Используем DocumentFragment для batch insert
        const fragment = document.createDocumentFragment();
        for (let i = 1; i <= lines; i++) {
            const div = document.createElement('div');
            div.className = 'line-num';
            div.textContent = i;
            fragment.appendChild(div);
        }

        lineNumbers.innerHTML = '';
        lineNumbers.appendChild(fragment);
    }

    updateCursorPosition() {
        const { mirror, lineCol, charCount } = this._elements;
        if (!mirror) return;

        const text = mirror.value.substring(0, mirror.selectionStart);
        const line = text.split('\n').length;
        const col = text.split('\n').pop().length + 1;
        const chars = mirror.value.length;

        if (lineCol) lineCol.textContent = `Строка ${line}, Колонка ${col}`;
        if (charCount) charCount.textContent = `${chars} символов`;
    }

    handleKeyboard(e) {
        const { mirror } = this._elements;
        if (!mirror) return;

        // Tab
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = mirror.selectionStart;
            const end = mirror.selectionEnd;
            const spaces = ' '.repeat(CONFIG.TAB_SIZE);
            mirror.value = mirror.value.substring(0, start) + spaces + mirror.value.substring(end);
            mirror.selectionStart = mirror.selectionEnd = start + CONFIG.TAB_SIZE;
            this.onCodeChange();
        }

        // Ctrl+S
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveFile();
        }

        // Ctrl+Z
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }

        // Ctrl+Shift+Z / Ctrl+Y
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            this.redo();
        }

        // Ctrl+F
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.openFind();
        }

        // F5
        if (e.key === 'F5') {
            e.preventDefault();
            this.runCode();
        }
    }

    // === Файловые операции ===

    newFile() {
        let num = 1;
        while (this.files.has(`untitled${num}.js`)) num++;
        const newFilename = `untitled${num}.js`;
        
        this.files.set(newFilename, { content: '', language: 'javascript', modified: false });
        this.loadFile(newFilename);
        this.renderTabs();
    }

    loadFile(filename, content = null) {
        this.currentFile = filename;
        const { mirror, lang } = this._elements;
        if (!mirror) return;

        if (content !== null) {
            this.files.set(filename, { 
                content, 
                language: this.detectLanguage(filename), 
                modified: false 
            });
        }

        const fileData = this.files.get(filename);
        mirror.value = fileData?.content || '';
        
        this.highlightCode();
        this.updateLineNumbers();
        this.history = [mirror.value];
        this.historyStep = 0;

        if (lang) lang.textContent = this.getLanguageLabel(filename);
        
        this.renderTabs();
    }

    saveFile() {
        if (!this.currentFile) return;
        
        const { mirror } = this._elements;
        if (!mirror) return;
        
        const fileData = this.files.get(this.currentFile);
        if (fileData) {
            fileData.content = mirror.value;
            fileData.modified = false;
        }

        this.log(`✓ Сохранено: ${this.currentFile}`, 'success');
        this.renderTabs();
    }

    closeFile(filename) {
        this.files.delete(filename);
        
        if (this.currentFile === filename) {
            const remaining = Array.from(this.files.keys());
            if (remaining.length > 0) {
                this.loadFile(remaining[0]);
            } else {
                this.currentFile = null;
                const { mirror } = this._elements;
                if (mirror) mirror.value = '';
                this.highlightCode();
                this.updateLineNumbers();
            }
        }
        
        this.renderTabs();
    }

    renderTabs() {
        const { tabs } = this._elements;
        if (!tabs) return;

        // Используем DocumentFragment
        const fragment = document.createDocumentFragment();
        
        this.files.forEach((data, filename) => {
            const tab = document.createElement('div');
            tab.className = `editor-tab${filename === this.currentFile ? ' active' : ''}${data.modified ? ' modified' : ''}`;
            tab.innerHTML = `
                <span class="tab-name">${filename}</span>
                <span class="tab-close" data-file="${filename}">×</span>
            `;
            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-close')) {
                    e.stopPropagation();
                    this.closeFile(e.target.dataset.file);
                } else {
                    this.loadFile(filename);
                }
            });
            fragment.appendChild(tab);
        });

        tabs.innerHTML = '';
        tabs.appendChild(fragment);
    }

    // === История ===

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            const { mirror } = this._elements;
            if (mirror) {
                mirror.value = this.history[this.historyStep];
                this.highlightCode();
                this.updateLineNumbers();
            }
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            const { mirror } = this._elements;
            if (mirror) {
                mirror.value = this.history[this.historyStep];
                this.highlightCode();
                this.updateLineNumbers();
            }
        }
    }

    // === Форматирование ===

    formatCode() {
        const { mirror } = this._elements;
        if (!mirror) return;

        try {
            const lang = this.detectLanguage(this.currentFile || 'untitled.js');
            let code = mirror.value;

            if (lang === 'json') {
                code = JSON.stringify(JSON.parse(code), null, 2);
            }

            mirror.value = code;
            this.onCodeChange();
            this.log('Код отформатирован', 'success');
        } catch (e) {
            this.log('Ошибка форматирования: ' + e.message, 'error');
        }
    }

    // === Поиск ===

    openFind() {
        const search = prompt('Поиск:');
        if (!search) return;

        const { mirror } = this._elements;
        if (!mirror) return;

        const content = mirror.value;
        const regex = new RegExp(search, 'gi');
        const matches = content.match(regex);
        
        if (matches) {
            this.log(`Найдено: ${matches.length} совпадений`, 'info');
            
            const index = content.toLowerCase().indexOf(search.toLowerCase());
            if (index !== -1) {
                mirror.focus();
                mirror.setSelectionRange(index, index + search.length);
            }
        } else {
            this.log('Ничего не найдено', 'warn');
        }
    }

    // === Запуск ===

    runCode() {
        const { mirror } = this._elements;
        if (!mirror) return;

        this.openConsole();
        this.log('▶ Запуск кода...', 'info');

        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        const self = this;

        console.log = (...args) => {
            self.log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'info');
            originalLog.apply(console, args);
        };
        console.error = (...args) => {
            self.log(args.join(' '), 'error');
            originalError.apply(console, args);
        };
        console.warn = (...args) => {
            self.log(args.join(' '), 'warn');
            originalWarn.apply(console, args);
        };

        try {
            // Безопасное выполнение в try-catch
            const result = new Function(mirror.value)();
            if (result !== undefined) {
                this.log('← ' + String(result), 'success');
            }
            this.log('✓ Выполнено успешно', 'success');
        } catch (e) {
            this.log('✗ Ошибка: ' + e.message, 'error');
        }

        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
    }

    // === Консоль ===

    toggleConsole() {
        const { consolePanel } = this._elements;
        if (consolePanel) consolePanel.classList.toggle('collapsed');
    }

    openConsole() {
        const { consolePanel } = this._elements;
        if (consolePanel) consolePanel.classList.remove('collapsed');
    }

    clearConsole() {
        const { console: consoleEl } = this._elements;
        if (consoleEl) consoleEl.innerHTML = '';
    }

    log(message, type = 'info') {
        const { console: consoleEl } = this._elements;
        if (!consoleEl) return;
        
        const div = document.createElement('div');
        div.className = `console-log ${type}`;
        div.textContent = message;
        consoleEl.appendChild(div);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    // === Утилиты ===

    detectLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const map = {
            'js': 'javascript', 'jsx': 'javascript', 'mjs': 'javascript',
            'ts': 'typescript', 'tsx': 'typescript',
            'json': 'json',
            'html': 'html', 'htm': 'html',
            'css': 'css', 'scss': 'css', 'less': 'css',
            'py': 'python',
            'md': 'markdown'
        };
        return map[ext] || 'text';
    }

    getLanguageLabel(filename) {
        const lang = this.detectLanguage(filename);
        const labels = {
            'javascript': 'JavaScript',
            'typescript': 'TypeScript',
            'json': 'JSON',
            'html': 'HTML',
            'css': 'CSS',
            'python': 'Python',
            'markdown': 'Markdown',
            'text': 'Текст'
        };
        return labels[lang] || 'Текст';
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        clearTimeout(this._highlightTimer);
        clearTimeout(this._lineNumbersTimer);
        clearTimeout(this._historyTimer);
    }
}

export const codeEditor = new CodeEditor();
window.codeEditor = codeEditor;
