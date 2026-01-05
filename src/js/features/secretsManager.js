/**
 * Secrets Manager - Менеджер паролей, токенов и заметок
 */

const STORAGE_KEY = 'GITODY_SECRETS';

class SecretsManager {
    constructor() {
        this.items = this.load();
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.render());
        } else {
            this.render();
        }
    }

    load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    }

    // Добавить пароль
    addPassword(name, login, password, url = '') {
        const item = {
            id: Date.now().toString(),
            type: 'password',
            name,
            login,
            password,
            url,
            createdAt: new Date().toISOString()
        };
        this.items.push(item);
        this.save();
        this.render();
        return item;
    }

    // Добавить заметку
    addNote(title, content) {
        const item = {
            id: Date.now().toString(),
            type: 'note',
            title,
            content,
            createdAt: new Date().toISOString()
        };
        this.items.push(item);
        this.save();
        this.render();
        return item;
    }

    remove(id) {
        this.items = this.items.filter(s => s.id !== id);
        this.save();
        this.render();
    }

    async copyToClipboard(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#3fb950" stroke-width="2"><path d="M2 7l3 3 7-7"/></svg>`;
                btn.style.background = 'rgba(63, 185, 80, 0.2)';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = '';
                }, 1500);
            }
        } catch (e) {
            console.error('Copy failed:', e);
        }
    }

    render() {
        const container = document.getElementById('secretsList');
        if (!container) return;

        if (this.items.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет сохранённых данных</div>';
            return;
        }

        container.innerHTML = this.items.map(item => {
            if (item.type === 'note') {
                return this.renderNote(item);
            } else {
                return this.renderPassword(item);
            }
        }).join('');
    }

    renderPassword(item) {
        return `
            <div class="secret-item password" data-id="${item.id}">
                <div class="secret-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="7" cy="7" r="5"/>
                        <path d="M11 11l7 7M15 15l2 2M15 18l2-2"/>
                    </svg>
                </div>
                <div class="secret-info">
                    <div class="secret-name">${this.escapeHtml(item.name)}</div>
                    <div class="secret-login">${this.escapeHtml(item.login)}</div>
                </div>
                <div class="secret-actions">
                    <button class="secret-btn copy-login" title="Копировать логин" onclick="secretsManager.copyToClipboard('${this.escapeAttr(item.login)}', this)">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="4" y="4" width="8" height="8" rx="1"/>
                            <path d="M2 10V3a1 1 0 011-1h7"/>
                        </svg>
                    </button>
                    <button class="secret-btn copy-password" title="Копировать пароль" onclick="secretsManager.copyToClipboard('${this.escapeAttr(item.password)}', this)">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="5" cy="5" r="3"/>
                            <path d="M7 7l5 5M10 10l1.5 1.5"/>
                        </svg>
                    </button>
                    <button class="secret-btn delete" title="Удалить" onclick="secretsManager.confirmDelete('${item.id}')">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4"/>
                            <path d="M3 4l1 8h6l1-8"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    renderNote(item) {
        const preview = item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content;
        return `
            <div class="secret-item note" data-id="${item.id}">
                <div class="secret-icon note-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="2" width="14" height="16" rx="2"/>
                        <path d="M6 6h8M6 10h8M6 14h5"/>
                    </svg>
                </div>
                <div class="secret-info">
                    <div class="secret-name">${this.escapeHtml(item.title)}</div>
                    <div class="secret-login note-preview">${this.escapeHtml(preview)}</div>
                </div>
                <div class="secret-actions">
                    <button class="secret-btn copy-note" title="Копировать" onclick="secretsManager.copyToClipboard(\`${this.escapeAttr(item.content)}\`, this)">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="4" y="4" width="8" height="8" rx="1"/>
                            <path d="M2 10V3a1 1 0 011-1h7"/>
                        </svg>
                    </button>
                    <button class="secret-btn view-note" title="Просмотр" onclick="secretsManager.viewNote('${item.id}')">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="7" cy="7" r="2"/>
                            <path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z"/>
                        </svg>
                    </button>
                    <button class="secret-btn delete" title="Удалить" onclick="secretsManager.confirmDelete('${item.id}')">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4"/>
                            <path d="M3 4l1 8h6l1-8"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    escapeAttr(str) {
        if (!str) return '';
        return str.replace(/`/g, '\\`').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }

    // Модал выбора типа
    showAddModal() {
        const modal = document.createElement('div');
        modal.className = 'secrets-modal-overlay';
        modal.innerHTML = `
            <div class="secrets-modal">
                <div class="secrets-modal-header">
                    <h3>Добавить</h3>
                    <button class="secrets-modal-close" onclick="secretsManager.closeModal()">×</button>
                </div>
                <div class="secrets-modal-body">
                    <div class="add-type-buttons">
                        <button class="add-type-btn" onclick="secretsManager.showPasswordModal()">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
                                <circle cx="11" cy="11" r="7"/>
                                <path d="M16 16l12 12M24 24l3 3M24 28l3-3"/>
                            </svg>
                            <span>Пароль / Токен</span>
                        </button>
                        <button class="add-type-btn" onclick="secretsManager.showNoteModal()">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="5" y="3" width="22" height="26" rx="3"/>
                                <path d="M10 10h12M10 16h12M10 22h8"/>
                            </svg>
                            <span>Заметка</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Модал для пароля
    showPasswordModal() {
        this.closeModal();
        const modal = document.createElement('div');
        modal.className = 'secrets-modal-overlay';
        modal.innerHTML = `
            <div class="secrets-modal">
                <div class="secrets-modal-header">
                    <h3>Добавить пароль</h3>
                    <button class="secrets-modal-close" onclick="secretsManager.closeModal()">×</button>
                </div>
                <div class="secrets-modal-body">
                    <div class="form-group">
                        <label class="form-label">Название</label>
                        <input type="text" id="secretName" class="form-input" placeholder="GitHub, Google...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Логин / Email</label>
                        <input type="text" id="secretLogin" class="form-input" placeholder="user@example.com">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Пароль / Токен</label>
                        <input type="password" id="secretPassword" class="form-input" placeholder="••••••••">
                    </div>
                    <div class="form-group">
                        <label class="form-label">URL (необязательно)</label>
                        <input type="text" id="secretUrl" class="form-input" placeholder="https://...">
                    </div>
                </div>
                <div class="secrets-modal-footer">
                    <button class="btn btn-secondary" onclick="secretsManager.closeModal()">Отмена</button>
                    <button class="btn btn-primary" onclick="secretsManager.savePassword()">Сохранить</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('secretName')?.focus(), 100);
    }

    // Модал для заметки
    showNoteModal() {
        this.closeModal();
        const modal = document.createElement('div');
        modal.className = 'secrets-modal-overlay';
        modal.innerHTML = `
            <div class="secrets-modal">
                <div class="secrets-modal-header">
                    <h3>Добавить заметку</h3>
                    <button class="secrets-modal-close" onclick="secretsManager.closeModal()">×</button>
                </div>
                <div class="secrets-modal-body">
                    <div class="form-group">
                        <label class="form-label">Заголовок</label>
                        <input type="text" id="noteTitle" class="form-input" placeholder="Название заметки">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Содержимое</label>
                        <textarea id="noteContent" class="form-input form-textarea" rows="6" placeholder="Текст заметки, код, данные..."></textarea>
                    </div>
                </div>
                <div class="secrets-modal-footer">
                    <button class="btn btn-secondary" onclick="secretsManager.closeModal()">Отмена</button>
                    <button class="btn btn-primary" onclick="secretsManager.saveNote()">Сохранить</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('noteTitle')?.focus(), 100);
    }

    // Просмотр заметки
    viewNote(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        const modal = document.createElement('div');
        modal.className = 'secrets-modal-overlay';
        modal.innerHTML = `
            <div class="secrets-modal">
                <div class="secrets-modal-header">
                    <h3>${this.escapeHtml(item.title)}</h3>
                    <button class="secrets-modal-close" onclick="secretsManager.closeModal()">×</button>
                </div>
                <div class="secrets-modal-body">
                    <pre class="note-content-view">${this.escapeHtml(item.content)}</pre>
                </div>
                <div class="secrets-modal-footer">
                    <button class="btn btn-secondary" onclick="secretsManager.closeModal()">Закрыть</button>
                    <button class="btn btn-primary" onclick="secretsManager.copyToClipboard(\`${this.escapeAttr(item.content)}\`, this)">Копировать</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    closeModal() {
        const modal = document.querySelector('.secrets-modal-overlay');
        if (modal) modal.remove();
    }

    savePassword() {
        const name = document.getElementById('secretName')?.value.trim();
        const login = document.getElementById('secretLogin')?.value.trim();
        const password = document.getElementById('secretPassword')?.value;
        const url = document.getElementById('secretUrl')?.value.trim() || '';

        if (!name) { alert('Введите название'); return; }
        if (!login) { alert('Введите логин'); return; }
        if (!password) { alert('Введите пароль'); return; }

        this.addPassword(name, login, password, url);
        this.closeModal();
    }

    saveNote() {
        const title = document.getElementById('noteTitle')?.value.trim();
        const content = document.getElementById('noteContent')?.value;

        if (!title) { alert('Введите заголовок'); return; }
        if (!content) { alert('Введите содержимое'); return; }

        this.addNote(title, content);
        this.closeModal();
    }

    confirmDelete(id) {
        if (confirm('Удалить?')) {
            this.remove(id);
        }
    }
}

export const secretsManager = new SecretsManager();
window.secretsManager = secretsManager;
