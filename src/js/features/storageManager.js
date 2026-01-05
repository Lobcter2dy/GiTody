/**
 * Storage Manager - Управление файловым хранилищем
 */

class StorageManager {
    constructor() {
        this.storageKey = 'gitody_storage';
        this.files = [];
        this.folders = [];
        this.currentPath = '/';
        this.currentCategory = 'all';
        
        // Категории файлов (только 5 основных)
        this.categories = {
            documents: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.rb', '.php', '.html', '.css', '.json', '.xml', '.yml', '.yaml', '.md', '.txt'],
            text: ['.txt', '.md', '.doc', '.docx', '.rtf', '.odt', '.pdf'],
            images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'],
            videos: ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv'],
            audio: ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a']
        };
    }

    init() {
        this.load();
        this.setupEventListeners();
        this.render();
        this.updateStorageInfo();
    }

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            const data = saved ? JSON.parse(saved) : { files: [], folders: [] };
            this.files = data.files || [];
            this.folders = data.folders || [];
        } catch (e) {
            console.error('[Storage] Load error:', e);
            this.files = [];
            this.folders = [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                files: this.files,
                folders: this.folders
            }));
        } catch (e) {
            console.error('[Storage] Save error:', e);
        }
    }

    setupEventListeners() {
        // Category icon navigation
        document.querySelectorAll('.storage-icon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentCategory = btn.dataset.category;
                document.querySelectorAll('.storage-icon-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.render();
            });
        });

        // Drag and drop
        const filesGrid = document.getElementById('filesGrid');
        if (filesGrid) {
            filesGrid.addEventListener('dragover', (e) => {
                e.preventDefault();
                filesGrid.classList.add('drag-over');
            });

            filesGrid.addEventListener('dragleave', () => {
                filesGrid.classList.remove('drag-over');
            });

            filesGrid.addEventListener('drop', (e) => {
                e.preventDefault();
                filesGrid.classList.remove('drag-over');
                this.handleFileDrop(e.dataTransfer.files);
            });
        }
    }

    getCategory(filename) {
        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        for (const [category, extensions] of Object.entries(this.categories)) {
            if (extensions.includes(ext)) {
                return category;
            }
        }
        return 'other';
    }

    getFileIcon(filename) {
        const category = this.getCategory(filename);
        const icons = {
            documents: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
            text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
            images: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
            videos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
            audio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
            other: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`
        };
        return icons[category] || icons.other;
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    render() {
        const container = document.getElementById('filesGrid');
        const emptyState = document.getElementById('storageEmpty');
        if (!container) return;

        // Filter by path and category
        let items = [];

        // Add folders for current path
        const currentFolders = this.folders.filter(f => f.path === this.currentPath);
        items.push(...currentFolders.map(f => ({ ...f, type: 'folder' })));

        // Add files for current path
        let currentFiles = this.files.filter(f => f.path === this.currentPath);
        
        // Filter by category
        if (this.currentCategory !== 'all') {
            currentFiles = currentFiles.filter(f => this.getCategory(f.name) === this.currentCategory);
        }
        
        items.push(...currentFiles.map(f => ({ ...f, type: 'file' })));

        if (items.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        container.innerHTML = items.map((item, index) => {
            if (item.type === 'folder') {
                return `
                    <div class="storage-item folder" data-index="${index}" data-path="${item.fullPath}" ondblclick="storageManager.openFolder('${item.fullPath}')">
                        <div class="item-icon folder-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                            </svg>
                        </div>
                        <div class="item-name">${this.escapeHtml(item.name)}</div>
                        <div class="item-meta">${item.itemCount || 0} элементов</div>
                        <div class="item-actions">
                            <button class="item-action-btn" onclick="event.stopPropagation(); storageManager.renameItem('folder', '${item.fullPath}')" title="Переименовать">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            </button>
                            <button class="item-action-btn danger" onclick="event.stopPropagation(); storageManager.deleteItem('folder', '${item.fullPath}')" title="Удалить">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="storage-item file" data-index="${index}" data-id="${item.id}">
                        <div class="item-icon file-icon">${this.getFileIcon(item.name)}</div>
                        <div class="item-name">${this.escapeHtml(item.name)}</div>
                        <div class="item-meta">${this.formatSize(item.size)} • ${this.formatDate(item.addedAt)}</div>
                        <div class="item-actions">
                            <button class="item-action-btn" onclick="storageManager.downloadFile('${item.id}')" title="Скачать">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                            <button class="item-action-btn" onclick="storageManager.renameItem('file', '${item.id}')" title="Переименовать">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            </button>
                            <button class="item-action-btn danger" onclick="storageManager.deleteItem('file', '${item.id}')" title="Удалить">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                `;
            }
        }).join('');

        this.updateStorageInfo();
    }

    updateBreadcrumb() {
        const container = document.getElementById('storageBreadcrumb');
        if (!container) return;

        const parts = this.currentPath.split('/').filter(Boolean);
        let html = `<span class="breadcrumb-item" data-path="/" onclick="storageManager.navigateTo('/')">Хранилище</span>`;

        let path = '';
        parts.forEach(part => {
            path += '/' + part;
            html += `<span class="breadcrumb-separator">/</span>`;
            html += `<span class="breadcrumb-item" data-path="${path}" onclick="storageManager.navigateTo('${path}')">${this.escapeHtml(part)}</span>`;
        });

        container.innerHTML = html;
    }

    navigateTo(path) {
        this.currentPath = path;
        this.updateBreadcrumb();
        this.render();
    }

    openFolder(path) {
        this.navigateTo(path);
    }

    async uploadFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await this.addFile(file);
            }
        };
        input.click();
    }

    async addFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileData = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    path: this.currentPath,
                    data: e.target.result,
                    addedAt: Date.now()
                };

                this.files.push(fileData);
                this.save();
                this.render();
                this.showNotification(`Файл "${file.name}" загружен`);
                resolve();
            };
            reader.readAsDataURL(file);
        });
    }

    handleFileDrop(fileList) {
        Array.from(fileList).forEach(file => {
            this.addFile(file);
        });
    }

    createFolder() {
        const name = prompt('Название папки:');
        if (!name || !name.trim()) return;

        const folder = {
            name: name.trim(),
            path: this.currentPath,
            fullPath: this.currentPath === '/' ? '/' + name.trim() : this.currentPath + '/' + name.trim(),
            createdAt: Date.now(),
            itemCount: 0
        };

        this.folders.push(folder);
        this.save();
        this.render();
        this.showNotification(`Папка "${name}" создана`);
    }

    downloadFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        const a = document.createElement('a');
        a.href = file.data;
        a.download = file.name;
        a.click();
    }

    renameItem(type, id) {
        if (type === 'folder') {
            const folder = this.folders.find(f => f.fullPath === id);
            if (!folder) return;
            
            const newName = prompt('Новое название:', folder.name);
            if (!newName || newName === folder.name) return;

            const oldPath = folder.fullPath;
            folder.name = newName;
            folder.fullPath = folder.path === '/' ? '/' + newName : folder.path + '/' + newName;

            // Update all files and subfolders
            this.files.forEach(f => {
                if (f.path.startsWith(oldPath)) {
                    f.path = f.path.replace(oldPath, folder.fullPath);
                }
            });
            this.folders.forEach(f => {
                if (f.path.startsWith(oldPath)) {
                    f.path = f.path.replace(oldPath, folder.fullPath);
                    f.fullPath = f.fullPath.replace(oldPath, folder.fullPath);
                }
            });
        } else {
            const file = this.files.find(f => f.id === id);
            if (!file) return;

            const newName = prompt('Новое название:', file.name);
            if (!newName || newName === file.name) return;

            file.name = newName;
        }

        this.save();
        this.render();
    }

    deleteItem(type, id) {
        if (!confirm('Удалить этот элемент?')) return;

        if (type === 'folder') {
            const folder = this.folders.find(f => f.fullPath === id);
            if (!folder) return;

            // Delete folder and all contents
            this.files = this.files.filter(f => !f.path.startsWith(id));
            this.folders = this.folders.filter(f => !f.fullPath.startsWith(id) && f.fullPath !== id);
        } else {
            this.files = this.files.filter(f => f.id !== id);
        }

        this.save();
        this.render();
        this.showNotification('Элемент удалён');
    }

    updateStorageInfo() {
        const totalSize = this.files.reduce((sum, f) => sum + (f.size || 0), 0);
        const itemCount = this.files.length + this.folders.length;

        const usedEl = document.getElementById('storageUsed');
        const countEl = document.getElementById('storageItemsCount');

        if (usedEl) usedEl.textContent = this.formatSize(totalSize);
        if (countEl) countEl.textContent = itemCount;

        // Try to get quota
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                const totalEl = document.getElementById('storageTotal');
                if (totalEl) {
                    totalEl.textContent = this.formatSize(estimate.quota || 0);
                }
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'storage-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

export const storageManager = new StorageManager();

