/**
 * Repository Manager - управление списком репозиториев в левой панели
 */
import { icons, getFileIcon } from '../icons.js';

export class RepoManager {
    constructor() {
        this.repos = [];
        this.activeRepo = null;
        this.expandedFolders = new Set();
        this.repoFiles = {};
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
        this.repos = [];
        this.repoFiles = {};
        this.specialFolders = new Set(['node_modules', '.git', '.idea', '.vscode', 'dist', 'build', 'coverage']);
        this.renderSidebar();
    }

    renderSidebar() {
        const sidebar = document.getElementById('mainSidebar');
        if (!sidebar) return;

        const activeRepoName = this.activeRepo ? 
            (this.repos.find(r => r.id === this.activeRepo)?.name || 'Проект') : 
            'Проекты';

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-logo">${icons.repo}</div>
                <div class="sidebar-project-name" id="currentProjectName">${activeRepoName}</div>
            </div>

            <div class="sidebar-actions">
                <button class="sidebar-icon-btn" onclick="repoManager.createRepo()" title="Создать репозиторий">
                    ${icons.plus}
                </button>
                <button class="sidebar-icon-btn" onclick="repoManager.openLocalRepo()" title="Открыть локальную папку">
                    ${icons.folderOpen}
                </button>
                <button class="sidebar-icon-btn" onclick="repoManager.importRepo()" title="Загрузить репозиторий">
                    ${icons.upload}
                </button>
            </div>

            <div class="repos-list" id="reposList">
                ${this.renderReposList()}
            </div>

            <div class="file-structure" id="fileStructure">
                <div class="file-structure-header">
                    <span class="file-structure-title">Файлы</span>
                </div>
                <div class="file-tree" id="repoFileTree">
                    ${this.activeRepo ? '' : '<div class="empty-state">Выберите репозиторий</div>'}
                </div>
            </div>
        `;

        // Восстановить цвета папок
        this.applyFolderColors();
    }

    async openLocalRepo() {
        try {
            const path = await window.ipcRenderer.invoke('dialog-open-directory');
            if (!path) return;

            const name = path.split(/[\\/]/).pop();
            const id = 'local-' + Date.now();
            
            const newRepo = {
                id,
                name,
                path, // Local path
                isLocal: true,
                stars: 0,
                language: 'Local',
                isPrivate: true
            };

            this.repos.unshift(newRepo);
            this.renderSidebar();
            
            // Load root files
            await this.loadLocalDir(id, path);
            this.selectRepo(id);
            
        } catch (e) {
            alert('Error opening folder: ' + e);
        }
    }

    async loadLocalDir(repoId, dirPath) {
        try {
            const items = await window.ipcRenderer.invoke('read-dir', dirPath);
            this.repoFiles[repoId] = items.map(item => ({
                ...item,
                path: item.path
            }));
            this.renderFileTree(repoId);
        } catch (e) {
            console.error('Failed to load dir:', e);
        }
    }

    async loadLocalChildren(dirPath) {
        try {
            const children = await window.ipcRenderer.invoke('read-dir', dirPath);
            
            const updateTree = (nodes) => {
                for (let node of nodes) {
                    if (node.path === dirPath) {
                        node.children = children.map(c => ({...c, path: c.path}));
                        return true;
                    }
                    if (node.children) {
                        if (updateTree(node.children)) return true;
                    }
                }
                return false;
            };

            const rootItems = this.repoFiles[this.activeRepo];
            if (updateTree(rootItems)) {
                this.renderFileTree(this.activeRepo);
            }

        } catch (e) {
            console.error(e);
        }
    }

    renderReposList() {
        if (this.repos.length === 0) {
            return '<div class="empty-state" style="padding: 20px; text-align: center; font-size: 12px; color: var(--text-tertiary);">Нет репозиториев</div>';
        }

        return this.repos.map(repo => `
            <div class="repo-item ${this.activeRepo === repo.id ? 'active' : ''}" 
                 data-repo-id="${repo.id}"
                 onclick="repoManager.selectRepo('${repo.id}')">
                <div class="repo-item-icon">${repo.isPrivate ? icons.lock : icons.repo}</div>
                <div class="repo-item-content">
                    <div class="repo-item-name">${repo.name}</div>
                    <div class="repo-item-meta">
                        <span class="repo-lang">${repo.language || ''}</span>
                    </div>
                </div>
                <div class="repo-item-stats">
                    <span class="repo-stat">${icons.star} ${repo.stars || 0}</span>
                </div>
            </div>
        `).join('');
    }

    selectRepo(repoId) {
        this.activeRepo = repoId;
        
        // Обновить активный класс
        document.querySelectorAll('.repo-item').forEach(item => {
            item.classList.toggle('active', item.dataset.repoId === repoId);
        });

        // Обновить заголовок
        const repo = this.repos.find(r => r.id === repoId);
        if (repo) {
            const headerTitle = document.getElementById('headerTitle');
            if (headerTitle) headerTitle.textContent = repo.name;
            
            const projectName = document.getElementById('currentProjectName');
            if (projectName) projectName.textContent = repo.name;
        }

        // Загрузить данные из GitHub
        if (window.githubManager && window.githubManager.token) {
            window.githubManager.selectRepo(repoId);
        }

        // Обновить файловое дерево
        this.renderFileTree(repoId);
    }

    renderFileTree(repoId) {
        const container = document.getElementById('repoFileTree');
        if (!container) return;

        const files = this.repoFiles[repoId];
        if (!files || files.length === 0) {
            container.innerHTML = '<div class="empty-state">Загрузка...</div>';
            return;
        }

        container.innerHTML = this.renderTreeItems(files, '', 0);
        this.applyFolderColors();
    }

    renderTreeItems(items, path, depth) {
        let html = '';
        
        // Сначала папки, потом файлы
        const sorted = [...items].sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name);
        });

        sorted.forEach((item, i) => {
            const itemPath = path ? `${path}/${item.name}` : item.name;
            const isExpanded = this.expandedFolders.has(itemPath);
            const isLast = i === sorted.length - 1;
            const prefix = depth > 0 ? (isLast ? '└── ' : '├── ') : '';

            if (item.type === 'dir') {
                html += `
                    <div class="tree-item folder ${isExpanded ? 'expanded' : ''}" data-path="${itemPath}">
                        <div class="tree-item-header" onclick="repoManager.toggleFolder('${itemPath}')" oncontextmenu="repoManager.showFolderMenu(event, '${itemPath}')">
                            <span class="tree-prefix">${prefix}</span>
                            <span class="tree-chevron">${isExpanded ? icons.chevronDown : icons.chevronRight}</span>
                            <span class="tree-icon folder-icon" data-path="${itemPath}">${isExpanded ? icons.folderOpen : icons.folder}</span>
                            <span class="tree-name">${item.name}</span>
                        </div>
                        <div class="tree-children ${isExpanded ? 'visible' : ''}">
                            ${isExpanded && item.children ? this.renderTreeItems(item.children, itemPath, depth + 1) : ''}
                        </div>
                    </div>
                `;
            } else {
                const icon = getFileIcon(item.name);
                html += `
                    <div class="tree-item file" data-path="${itemPath}" onclick="repoManager.openFile('${itemPath}')">
                        <span class="tree-prefix">${prefix}</span>
                        <span class="tree-icon">${icon}</span>
                        <span class="tree-name">${item.name}</span>
                    </div>
                `;
            }
        });

        return html;
    }

    async toggleFolder(path) {
        if (this.expandedFolders.has(path)) {
            this.expandedFolders.delete(path);
        } else {
            this.expandedFolders.add(path);
            // Загрузить содержимое папки
            if (window.githubManager) {
                await window.githubManager.loadFolderContents(path);
            }
        }
        this.renderFileTree(this.activeRepo);
    }

    openFile(path) {
        // Переключиться на редактор
        if (window.navRing) {
            window.navRing.setActiveTab('editor');
        }
        
        // Загрузить файл
        if (window.githubManager) {
            window.githubManager.openFile(path);
        }
    }

    showFolderMenu(event, path) {
        event.preventDefault();
        event.stopPropagation();
        
        const colors = [
            { name: 'Серый', color: '#8b949e' },
            { name: 'Синий', color: '#58a6ff' },
            { name: 'Зелёный', color: '#3fb950' },
            { name: 'Жёлтый', color: '#d29922' },
            { name: 'Красный', color: '#f85149' },
            { name: 'Фиолетовый', color: '#a371f7' },
            { name: 'Розовый', color: '#db61a2' },
            { name: 'Голубой', color: '#79c0ff' },
            { name: 'Салатовый', color: '#7ee787' },
            { name: 'Оранжевый', color: '#ffa657' }
        ];

        const oldMenu = document.getElementById('folderColorMenu');
        if (oldMenu) oldMenu.remove();

        const menu = document.createElement('div');
        menu.id = 'folderColorMenu';
        menu.className = 'folder-color-menu';
        menu.innerHTML = `
            <div class="folder-color-title">Цвет папки</div>
            <div class="folder-color-grid">
                ${colors.map(c => `
                    <button class="folder-color-btn" style="background: ${c.color};" 
                            onclick="repoManager.setFolderColor('${path}', '${c.color}')" 
                            title="${c.name}"></button>
                `).join('')}
            </div>
            <button class="folder-color-reset" onclick="repoManager.setFolderColor('${path}', null)">
                Сбросить
            </button>
        `;

        menu.style.cssText = `position: fixed; left: ${event.clientX}px; top: ${event.clientY}px; z-index: 10000;`;
        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', function close() {
                menu.remove();
                document.removeEventListener('click', close);
            });
        }, 10);
    }

    setFolderColor(path, color) {
        const folderColors = window.session?.getFolderColors() || {};
        
        if (color) {
            folderColors[path] = color;
        } else {
            delete folderColors[path];
        }
        
        window.session?.setFolderColors(folderColors);

        const icon = document.querySelector(`.folder-icon[data-path="${path}"]`);
        if (icon) icon.style.color = color || '';

        const menu = document.getElementById('folderColorMenu');
        if (menu) menu.remove();
    }

    applyFolderColors() {
        const colors = window.session?.getFolderColors() || {};
        Object.entries(colors).forEach(([path, color]) => {
            const icon = document.querySelector(`.folder-icon[data-path="${path}"]`);
            if (icon) icon.style.color = color;
        });
    }

    createRepo() {
        if (window.githubManager?.token) {
            window.showModal('create-repo');
        } else {
            window.showModal('github-connect');
        }
    }

    importRepo() {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;

        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            const rootPath = files[0].webkitRelativePath.split('/')[0];
            
            const newRepo = {
                id: rootPath.toLowerCase().replace(/\s+/g, '-'),
                name: rootPath,
                description: 'Импортированный',
                stars: 0,
                language: 'Unknown',
                isPrivate: true
            };

            const fileStructure = [];
            // ... обработка файлов

            this.repos.unshift(newRepo);
            this.renderSidebar();
            this.selectRepo(newRepo.id);
        };

        input.click();
    }
}

export const repoManager = new RepoManager();
window.repoManager = repoManager;
