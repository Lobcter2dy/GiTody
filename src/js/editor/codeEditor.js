/**
 * Code Editor Pro - полный редактор кода с подсветкой синтаксиса
 */

class CodeEditor {
    constructor() {
        this.currentFile = null;
        this.files = new Map();
        this.history = [];
        this.historyStep = -1;
        this.syntaxRules = this.initSyntaxRules();
        
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.setupEventListeners();
        this.updateLineNumbers();
    }

    setupEventListeners() {
        const mirror = document.getElementById('codeInput');
        if (!mirror) return;

        mirror.addEventListener('input', () => this.onCodeChange());
        mirror.addEventListener('scroll', () => this.syncScroll());
        mirror.addEventListener('keydown', (e) => this.handleKeyboard(e));
        mirror.addEventListener('keyup', () => this.updateCursorPosition());
        mirror.addEventListener('click', () => this.updateCursorPosition());
    }

    initSyntaxRules() {
        return {
            javascript: {
                keywords: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 
                           'class', 'new', 'this', 'true', 'false', 'null', 'undefined', 'async', 
                           'await', 'try', 'catch', 'throw', 'import', 'export', 'default', 'from',
                           'extends', 'static', 'get', 'set', 'typeof', 'instanceof', 'in', 'of',
                           'switch', 'case', 'break', 'continue', 'do', 'finally', 'debugger', 'delete',
                           'void', 'with', 'yield', 'super'],
                types: ['String', 'Number', 'Boolean', 'Array', 'Object', 'Promise', 'Map', 'Set'],
                builtins: ['console', 'document', 'window', 'Math', 'Date', 'JSON', 'parseInt', 
                          'parseFloat', 'setTimeout', 'setInterval', 'fetch', 'localStorage', 'sessionStorage']
            },
            json: { keywords: ['true', 'false', 'null'] },
            html: { keywords: [] },
            css: { keywords: [] },
            python: {
                keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import',
                          'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'pass', 'break',
                          'continue', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'global',
                          'nonlocal', 'assert', 'yield', 'raise', 'async', 'await', 'del']
            }
        };
    }

    onCodeChange() {
        const mirror = document.getElementById('codeInput');
        if (!mirror) return;

        const content = mirror.value;
        
        if (this.currentFile) {
            this.files.set(this.currentFile, { 
                ...this.files.get(this.currentFile),
                content: content,
                modified: true
            });
        }

        this.highlightCode();
        this.updateLineNumbers();
        this.updateCursorPosition();

        // История
        if (this.history.length === 0 || this.history[this.history.length - 1] !== content) {
            this.history.splice(this.historyStep + 1);
            this.history.push(content);
            this.historyStep++;
            if (this.history.length > 100) {
                this.history.shift();
                this.historyStep--;
            }
        }
    }

    highlightCode() {
        const mirror = document.getElementById('codeInput');
        const display = document.getElementById('codeDisplay');
        if (!mirror || !display) return;

        const content = mirror.value;
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
        const rules = this.syntaxRules.javascript;

        // Комментарии
        code = code.replace(/\/\/.*$/gm, '<span class="comment">$&</span>');
        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');

        // Строки
        code = code.replace(/"([^"\\]|\\.)*"/g, '<span class="string">$&</span>');
        code = code.replace(/'([^'\\]|\\.)*'/g, '<span class="string">$&</span>');
        code = code.replace(/`([^`\\]|\\.)*`/g, '<span class="string">$&</span>');

        // Числа
        code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

        // Ключевые слова
        rules.keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            code = code.replace(regex, `<span class="keyword">${keyword}</span>`);
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
        const rules = this.syntaxRules.python;
        
        code = code.replace(/#.*$/gm, '<span class="comment">$&</span>');
        code = code.replace(/"""[\s\S]*?"""/g, '<span class="string">$&</span>');
        code = code.replace(/'''[\s\S]*?'''/g, '<span class="string">$&</span>');
        code = code.replace(/"([^"\\]|\\.)*"/g, '<span class="string">$&</span>');
        code = code.replace(/'([^'\\]|\\.)*'/g, '<span class="string">$&</span>');
        code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        
        rules.keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            code = code.replace(regex, `<span class="keyword">${keyword}</span>`);
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
        const mirror = document.getElementById('codeInput');
        const display = document.getElementById('codeDisplay');
        const lineNumbers = document.getElementById('lineNumbers');
        
        if (display) {
            display.scrollLeft = mirror.scrollLeft;
            display.scrollTop = mirror.scrollTop;
        }
        if (lineNumbers) {
            lineNumbers.scrollTop = mirror.scrollTop;
        }
    }

    updateLineNumbers() {
        const mirror = document.getElementById('codeInput');
        const lineNumbers = document.getElementById('lineNumbers');
        if (!mirror || !lineNumbers) return;

        const lines = mirror.value.split('\n').length;
        lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => 
            `<div class="line-num">${i + 1}</div>`
        ).join('');
    }

    updateCursorPosition() {
        const mirror = document.getElementById('codeInput');
        if (!mirror) return;

        const text = mirror.value.substring(0, mirror.selectionStart);
        const line = text.split('\n').length;
        const col = text.split('\n').pop().length + 1;
        const chars = mirror.value.length;

        const lineCol = document.getElementById('editorLineCol');
        const charCount = document.getElementById('editorChars');
        
        if (lineCol) lineCol.textContent = `Строка ${line}, Колонка ${col}`;
        if (charCount) charCount.textContent = `${chars} символов`;
    }

    handleKeyboard(e) {
        const mirror = document.getElementById('codeInput');
        if (!mirror) return;

        // Tab
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = mirror.selectionStart;
            const end = mirror.selectionEnd;
            mirror.value = mirror.value.substring(0, start) + '    ' + mirror.value.substring(end);
            mirror.selectionStart = mirror.selectionEnd = start + 4;
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

        // Ctrl+Shift+Z
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
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
        const mirror = document.getElementById('codeInput');
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

        const lang = document.getElementById('editorLang');
        if (lang) lang.textContent = this.getLanguageLabel(filename);
        
        this.renderTabs();
    }

    saveFile() {
        if (!this.currentFile) return;
        
        const mirror = document.getElementById('codeInput');
        if (!mirror) return;
        
        const fileData = this.files.get(this.currentFile);
        if (fileData) {
            fileData.content = mirror.value;
            fileData.modified = false;
            this.files.set(this.currentFile, fileData);
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
                const mirror = document.getElementById('codeInput');
                if (mirror) mirror.value = '';
                this.highlightCode();
                this.updateLineNumbers();
            }
        }
        
        this.renderTabs();
    }

    renderTabs() {
        const container = document.getElementById('editorTabs');
        if (!container) return;

        container.innerHTML = '';
        
        this.files.forEach((data, filename) => {
            const tab = document.createElement('div');
            tab.className = `editor-tab${filename === this.currentFile ? ' active' : ''}${data.modified ? ' modified' : ''}`;
            tab.innerHTML = `
                <span class="tab-name">${filename}</span>
                <span class="tab-close" onclick="event.stopPropagation(); codeEditor.closeFile('${filename}')">×</span>
            `;
            tab.addEventListener('click', () => this.loadFile(filename));
            container.appendChild(tab);
        });
    }

    // === История ===

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            const mirror = document.getElementById('codeInput');
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
            const mirror = document.getElementById('codeInput');
            if (mirror) {
                mirror.value = this.history[this.historyStep];
                this.highlightCode();
                this.updateLineNumbers();
            }
        }
    }

    // === Форматирование ===

    formatCode() {
        const mirror = document.getElementById('codeInput');
        if (!mirror) return;

        try {
            const lang = this.detectLanguage(this.currentFile || 'untitled.js');
            let code = mirror.value;

            if (lang === 'json') {
                code = JSON.stringify(JSON.parse(code), null, 2);
            } else if (lang === 'javascript') {
                // Простое форматирование
                code = code.replace(/\{/g, ' {\n')
                          .replace(/\}/g, '\n}\n')
                          .replace(/;(?!\s*\n)/g, ';\n');
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

        const mirror = document.getElementById('codeInput');
        if (!mirror) return;

        const content = mirror.value;
        const regex = new RegExp(search, 'gi');
        const matches = content.match(regex);
        
        if (matches) {
            this.log(`Найдено: ${matches.length} совпадений`, 'info');
            
            // Выделить первое
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
        const mirror = document.getElementById('codeInput');
        if (!mirror) return;

        this.openConsole();
        this.log('▶ Запуск кода...', 'info');

        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            this.log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'info');
            originalLog(...args);
        };
        console.error = (...args) => {
            this.log(args.join(' '), 'error');
            originalError(...args);
        };
        console.warn = (...args) => {
            this.log(args.join(' '), 'warn');
            originalWarn(...args);
        };

        try {
            eval(mirror.value);
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
        const panel = document.getElementById('consolePanel');
        if (panel) panel.classList.toggle('collapsed');
    }

    openConsole() {
        const panel = document.getElementById('consolePanel');
        if (panel) panel.classList.remove('collapsed');
    }

    clearConsole() {
        const output = document.getElementById('consoleOutput');
        if (output) output.innerHTML = '';
    }

    log(message, type = 'info') {
        const output = document.getElementById('consoleOutput');
        if (!output) return;
        
        output.innerHTML += `<div class="console-log ${type}">${this.escapeHtml(message)}</div>`;
        output.scrollTop = output.scrollHeight;
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
}

export const codeEditor = new CodeEditor();
window.codeEditor = codeEditor;

