/**
 * Code Editor - Monaco Implementation
 */

import { Result } from '../core/result.js';

class CodeEditor {
    constructor() {
        this.editor = null;
        this.models = new Map(); // path -> ITextModel
        this.viewStates = new Map(); // path -> IViewState
        this.currentPath = null;
        this.extensions = new Map(); // id -> { name, activate() }
        
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
        console.log('[CodeEditor] Initializing...');
        
        // Setup Monaco Loader
        if (window.require) {
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});
            require(['vs/editor/editor.main'], () => {
                this.createEditor();
            });
        } else {
            console.error('Monaco loader not found');
            // Fallback?
        }
        
        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveCurrentFile();
            }
        });
    }

    createEditor() {
        const container = document.getElementById('monaco-editor-container');
        if (!container) return;

        // Clean container
        container.innerHTML = '';

        this.editor = monaco.editor.create(container, {
            value: '',
            language: 'plaintext',
            theme: 'vs-dark', // Dark theme to match UI
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            scrollBeyondLastLine: false,
            padding: { top: 10, bottom: 10 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on'
        });

        this.editor.onDidChangeCursorPosition((e) => {
            const pos = e.position;
            const el = document.getElementById('editorCursor');
            if (el) el.textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
        });

        console.log('[CodeEditor] Monaco instance created');
        
        // Register default extensions (Autocompletion samples)
        this.registerExtension({
            id: 'js-snippets',
            name: 'JavaScript Snippets',
            activate: () => {
                monaco.languages.registerCompletionItemProvider('javascript', {
                    provideCompletionItems: () => {
                        return {
                            suggestions: [
                                {
                                    label: 'clog',
                                    kind: monaco.languages.CompletionItemKind.Snippet,
                                    insertText: 'console.log($1);',
                                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                    documentation: 'Log to console'
                                },
                                {
                                    label: 'func',
                                    kind: monaco.languages.CompletionItemKind.Snippet,
                                    insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
                                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                    documentation: 'Function declaration'
                                }
                            ]
                        };
                    }
                });
            }
        });
        
        // Activate extensions
        this.extensions.forEach(ext => ext.activate());
    }

    /**
     * Opens a file in the editor.
     * @param {string} path - Unique identifier/path for the file
     * @param {string} content - File content (optional if already loaded)
     * @param {string} language - Language ID (optional, detected from path)
     */
    openFile(path, content = null, language = null) {
        if (!this.editor) return;

        // 1. Save state of current file
        if (this.currentPath) {
            this.viewStates.set(this.currentPath, this.editor.saveViewState());
        }

        this.currentPath = path;

        // 2. Get or create model
        let model = this.models.get(path);
        
        if (!model) {
            // New file opened
            if (content === null) content = ''; // Handle empty content
            
            // Detect language
            if (!language) {
                const ext = path.split('.').pop();
                const langMap = {
                    'js': 'javascript', 'ts': 'typescript', 'html': 'html', 'css': 'css',
                    'json': 'json', 'md': 'markdown', 'py': 'python'
                };
                language = langMap[ext] || 'plaintext';
            }

            // Create Monaco model
            // We use monaco.Uri to enable some IntelliSense features if needed
            // But strict paths might conflict if duplicate. Using simple path string is safer for virtual files.
            model = monaco.editor.createModel(content, language);
            this.models.set(path, model);
        } else if (content !== null && model.getValue() !== content) {
            // Update content if provided and different (e.g. reload from disk)
            model.setValue(content);
        }

        // 3. Set model to editor
        this.editor.setModel(model);

        // 4. Restore view state (scroll, cursor)
        const state = this.viewStates.get(path);
        if (state) {
            this.editor.restoreViewState(state);
        } else {
            this.editor.setScrollTop(0);
        }

        this.editor.focus();
        this.renderTabs();
        this.updateStatus(language || model.getLanguageId());
    }

    closeFile(path) {
        // Dispose model to free memory
        const model = this.models.get(path);
        if (model) {
            model.dispose();
            this.models.delete(path);
            this.viewStates.delete(path);
        }

        if (this.currentPath === path) {
            // Switch to another tab
            const paths = Array.from(this.models.keys());
            if (paths.length > 0) {
                this.openFile(paths[paths.length - 1]);
            } else {
                this.currentPath = null;
                // Create empty untitled model to prevent editor crash/empty look
                const empty = monaco.editor.createModel('', 'plaintext');
                this.editor.setModel(empty);
                this.updateStatus('None');
            }
        }
        
        this.renderTabs();
    }

    renderTabs() {
        const container = document.getElementById('editorTabs');
        if (!container) return;

        container.innerHTML = Array.from(this.models.keys()).map(path => {
            const name = path.split(/[\\/]/).pop();
            const isActive = path === this.currentPath;
            // Check modified? Monaco model doesn't strictly track "modified" vs disk without extra logic.
            // We'll skip modified indicator for now or add it later.
            
            return `
                <div class="editor-tab ${isActive ? 'active' : ''}" onclick="codeEditor.openFile('${path.replace(/\\/g, '\\\\')}')">
                    <span>${name}</span>
                    <span class="editor-tab-close" onclick="event.stopPropagation(); codeEditor.closeFile('${path.replace(/\\/g, '\\\\')}')">×</span>
                </div>
            `;
        }).join('');
    }

    saveCurrentFile() {
        if (!this.currentPath || !this.editor) return;
        
        const content = this.editor.getValue();
        // Trigger save in RepoManager or FileSystem
        console.log('[CodeEditor] Saving', this.currentPath);
        
        // TODO: Integrate with backend save
        // For now, just alert or log
        // window.repoManager.saveFile(this.currentPath, content);
    }

    updateStatus(lang) {
        const el = document.getElementById('editorLang');
        if (el) el.textContent = lang;
    }

    // === Extension API ===

    registerExtension(ext) {
        if (this.extensions.has(ext.id)) return;
        this.extensions.set(ext.id, ext);
        if (this.editor) {
            ext.activate();
        }
    }

    // Load extension from file/string (for user uploads)
    loadExtension(scriptContent) {
        try {
            // Sandbox execution is hard in browser, but we can eval in a controlled scope or Just Works(tm) for this MVP
            const extFactory = new Function('monaco', scriptContent);
            const ext = extFactory(monaco);
            if (ext && ext.id && ext.activate) {
                this.registerExtension(ext);
                alert(`Extension ${ext.name} loaded!`);
            }
        } catch (e) {
            console.error('Failed to load extension', e);
            alert('Error loading extension: ' + e.message);
        }
    }
}

export const codeEditor = new CodeEditor();
window.codeEditor = codeEditor;
