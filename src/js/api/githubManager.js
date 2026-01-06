/**
 * GitHub Manager - реальная интеграция с GitHub API
 * Использует session для хранения данных
 */

import { session } from '../storage/session.js';

export class GitHubManager {
    constructor() {
        this.repos = [];
        this.currentRepo = null;
        this.baseUrl = 'https://api.github.com';
        this.folderColors = session.getFolderColors();
        
        // Обновить панель после загрузки DOM
        document.addEventListener('DOMContentLoaded', () => {
            this.updateConnectPanel();
            this.initFolderContextMenu();
        });
    }

    // Получить токен из session
    get token() {
        return session.getToken();
    }

    // Получить user из auth модуля
    get user() {
        return window.githubAuth?.user || session.getUser();
    }

    // Очистить данные
    clearData() {
        this.repos = [];
        this.currentRepo = null;
    }

    // Показать список репозиториев (для кнопки "Назад")
    showReposList() {
        if (window.repoManager) {
            window.repoManager.showReposList();
        }
    }

    // Авторизация через браузер
    authViaBrowser() {
        // URL для создания токена с нужными правами (Classic token)
        const tokenUrl = 'https://github.com/settings/tokens/new?description=GITODY%20App&scopes=repo,read:user,user:email,delete_repo,workflow';
        
        // Открыть в браузере
        window.open(tokenUrl, '_blank');
        
        // Показать инструкции
        const statusEl = document.getElementById('githubConnectStatus');
        if (statusEl) {
            statusEl.innerHTML = `
                <div style="text-align: left; background: var(--bg-tertiary); padding: 12px; border-radius: 6px; margin-top: 12px;">
                    <div style="font-weight: 600; margin-bottom: 8px;">📋 Инструкция:</div>
                    <div style="font-size: 11px; line-height: 1.6;">
                        1. В открывшейся вкладке нажмите <b>"Generate token"</b><br>
                        2. Скопируйте созданный токен<br>
                        3. Вставьте его в поле выше и нажмите "Подключить"
                    </div>
                </div>
            `;
        }
    }

    // Подключение теперь через window.connectGitHub() в main.js
    async connect() {
        if (window.connectGitHub) {
            await window.connectGitHub();
        }
    }

    // Подключение из панели - то же самое
    async connectFromPanel() {
        await this.connect();
    }

    // Обновить панель подключения
    updateConnectPanel() {
        const card = document.querySelector('.connect-card');
        const info = document.getElementById('connectInfo');
        
        if (this.user) {
            if (card) card.classList.add('connected');
            if (info) {
                info.innerHTML = `
                    <div class="connect-title">Подключено</div>
                    <div class="connect-desc">
                        <img src="${this.user.avatar_url}" style="width: 24px; height: 24px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">
                        ${this.user.name || this.user.login}
                    </div>
                `;
            }
        } else {
            if (card) card.classList.remove('connected');
            if (info) {
                info.innerHTML = `
                    <div class="connect-title">Не подключено</div>
                    <div class="connect-desc">Подключите GitHub аккаунт для работы с репозиториями</div>
                `;
            }
        }
    }

    // Загрузить данные пользователя - теперь через githubAuth
    async loadUser() {
        // Авторизация теперь через отдельный модуль githubAuth
        if (window.githubAuth) {
            await window.githubAuth.init();
        }
    }

    // Загрузить репозитории пользователя
    async loadRepositories() {
        if (!this.token) return;

        try {
            const response = await fetch(`${this.baseUrl}/user/repos?per_page=100&sort=updated`, {
                headers: this.getHeaders()
            });

            if (response.ok) {
                this.repos = await response.json();
                this.updateReposList();
            }
        } catch (error) {
            console.error('[GitHub] Error loading repos:', error);
        }
    }

    // Выбрать репозиторий
    async selectRepo(repoFullName) {
        if (!this.token) return;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${repoFullName}`, {
                headers: this.getHeaders()
            });

            if (response.ok) {
                this.currentRepo = await response.json();
                this.updateCurrentRepo();
                await this.loadRepoData();
                
                // Обновить все секции
                this.updateAllSections();

                // Сохранить состояние
                if (window.stateManager) {
                    window.stateManager.set('activeRepo', repoFullName);
                }
            }
        } catch (error) {
            console.error('[GitHub] Error selecting repo:', error);
        }
    }

    // Загрузить данные репозитория (ветки, PR, issues и т.д.)
    async loadRepoData() {
        if (!this.currentRepo) return;

        const repoName = this.currentRepo.full_name;

        // Параллельная загрузка данных
        const [branches, pullRequests, issues, commits, contents, languages, contributors, workflows] = await Promise.all([
            this.fetchBranches(repoName),
            this.fetchPullRequests(repoName),
            this.fetchIssues(repoName),
            this.fetchCommits(repoName),
            this.fetchRepoContents(repoName),
            this.fetchLanguages(repoName),
            this.fetchContributors(repoName),
            this.fetchWorkflowRuns(repoName)
        ]);

        this.updateStats(branches.length, pullRequests.length, issues.length);
        this.renderBranches(branches);
        this.renderPullRequests(pullRequests);
        this.renderIssues(issues);
        this.renderCommits(commits);
        this.renderWorkflows(workflows);
        
        // Отобразить файловую структуру в sidebar
        this.renderFileTree(contents);
        
        // Обновить вкладку Information
        this.renderRepoInfo(languages, contributors);
    }

    // Получить содержимое репозитория (корневая директория)
    async fetchRepoContents(repoName, path = '') {
        try {
            const url = path 
                ? `${this.baseUrl}/repos/${repoName}/contents/${path}`
                : `${this.baseUrl}/repos/${repoName}/contents`;
            
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('[GitHub] Error fetching contents:', error);
            return [];
        }
    }

    // Отрисовать файловое дерево в sidebar
    renderFileTree(contents) {
        const container = document.getElementById('repoFileTree');
        if (!container) return;

        if (!contents || contents.length === 0) {
            container.innerHTML = '<div class="tree-empty">Репозиторий пуст</div>';
            return;
        }

        // Сортировка: папки сначала, потом файлы
        const sorted = [...contents].sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name);
        });

        container.innerHTML = sorted.map(item => this.renderTreeItem(item)).join('');
    }

    // Отрисовать элемент дерева
    renderTreeItem(item) {
        const isDir = item.type === 'dir';
        const folderColor = this.getFolderColorForPath(item.path);
        const icon = isDir ? this.getFolderIcon(folderColor) : this.getFileIcon(item.name);
        
        if (isDir) {
            return `
                <div class="tree-item folder" data-path="${item.path}">
                    <div class="tree-item-header" 
                         onclick="githubManager.toggleFolder('${item.path}')"
                         oncontextmenu="githubManager.showFolderContextMenu(event, '${item.path}')">
                        <span class="tree-chevron">${this.getChevronIcon()}</span>
                        <span class="tree-icon">${icon}</span>
                        <span class="tree-name">${item.name}</span>
                    </div>
                    <div class="tree-children" id="folder-${item.path.replace(/\//g, '-')}"></div>
                </div>
            `;
        } else {
            return `
                <div class="tree-item file" data-path="${item.path}" onclick="githubManager.openFile('${item.path}')">
                    <span class="tree-icon">${icon}</span>
                    <span class="tree-name">${item.name}</span>
                </div>
            `;
        }
    }

    // Развернуть/свернуть папку
    async toggleFolder(path) {
        const container = document.getElementById(`folder-${path.replace(/\//g, '-')}`);
        const folderEl = container?.closest('.tree-item.folder');
        
        if (!container || !folderEl) return;

        if (folderEl.classList.contains('expanded')) {
            // Свернуть
            folderEl.classList.remove('expanded');
            container.innerHTML = '';
        } else {
            // Развернуть - загрузить содержимое
            folderEl.classList.add('expanded');
            container.innerHTML = '<div class="tree-loading">Загрузка...</div>';
            
            const contents = await this.fetchRepoContents(this.currentRepo.full_name, path);
            
            if (contents && contents.length > 0) {
                const sorted = [...contents].sort((a, b) => {
                    if (a.type === 'dir' && b.type !== 'dir') return -1;
                    if (a.type !== 'dir' && b.type === 'dir') return 1;
                    return a.name.localeCompare(b.name);
                });
                container.innerHTML = sorted.map(item => this.renderTreeItem(item)).join('');
            } else {
                container.innerHTML = '<div class="tree-empty-folder">Пусто</div>';
            }
        }
        
        // Обновить иконку chevron и цвет папки
        const chevron = folderEl.querySelector('.tree-chevron');
        const folderIcon = folderEl.querySelector('.tree-item-header > .tree-icon');
        const folderColor = this.getFolderColorForPath(path);
        
        if (chevron) {
            chevron.innerHTML = folderEl.classList.contains('expanded') 
                ? this.getChevronDownIcon() 
                : this.getChevronIcon();
        }
        if (folderIcon) {
            folderIcon.innerHTML = folderEl.classList.contains('expanded')
                ? this.getFolderOpenIcon(folderColor || '#58a6ff')
                : this.getFolderIcon(folderColor);
        }
    }

    // Открыть файл в редакторе
    async openFile(path) {
        if (!this.currentRepo) return;

        // Переключиться на вкладку редактора
        if (window.tabManager) {
            window.tabManager.switchTab('editor');
        }

        // Загрузить содержимое файла
        const content = await this.getFileContent(this.currentRepo.full_name, path);
        
        if (content !== null) {
            const codeInput = document.getElementById('codeInput');
            const editorTabs = document.getElementById('editorTabs');
            
            if (codeInput) {
                codeInput.value = content;
                codeInput.dispatchEvent(new Event('input'));
            }
            
            // Добавить вкладку
            if (editorTabs) {
                const fileName = path.split('/').pop();
                editorTabs.innerHTML = `
                    <div class="editor-tab active" data-path="${path}">
                        <span>${fileName}</span>
                        <button class="tab-close" onclick="githubManager.closeEditorTab('${path}')">&times;</button>
                    </div>
                `;
            }
            
            // Сохранить текущий открытый файл
            this.currentFile = { path, content };
        }
    }

    // Закрыть вкладку редактора
    closeEditorTab(path) {
        const editorTabs = document.getElementById('editorTabs');
        const codeInput = document.getElementById('codeInput');
        
        if (editorTabs) editorTabs.innerHTML = '';
        if (codeInput) codeInput.value = '';
        
        this.currentFile = null;
    }

    // Иконки
    getChevronIcon() {
        return '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l4 4-4 4"/></svg>';
    }

    getChevronDownIcon() {
        return '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>';
    }

    getFolderIcon(color = '#8b949e') {
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H6.17157C6.43679 1.5 6.69114 1.60536 6.87868 1.79289L7.70711 2.62132C7.89464 2.80886 8.149 2.91421 8.41421 2.91421H13C13.8284 2.91421 14.5 3.58579 14.5 4.41421V12C14.5 12.8284 13.8284 13.5 13 13.5H3C2.17157 13.5 1.5 12.8284 1.5 12V3Z" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1"/>
        </svg>`;
    }

    getFolderOpenIcon(color = '#58a6ff') {
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H6.17157C6.43679 1.5 6.69114 1.60536 6.87868 1.79289L7.70711 2.62132C7.89464 2.80886 8.149 2.91421 8.41421 2.91421H13C13.8284 2.91421 14.5 3.58579 14.5 4.41421V5.5H2.5V3C2.5 2.72386 2.72386 2.5 3 2.5H6.17157L7 3.32843H13V4.41421" stroke="${color}" stroke-width="1"/>
            <path d="M1 6.5H14L13 13.5H2L1 6.5Z" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1"/>
        </svg>`;
    }

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const icons = {
            js: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#f7df1e"><rect x="2" y="2" width="12" height="12" rx="1"/><text x="5" y="12" font-size="8" fill="#000">JS</text></svg>',
            ts: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#3178c6"><rect x="2" y="2" width="12" height="12" rx="1"/><text x="5" y="12" font-size="8" fill="#fff">TS</text></svg>',
            json: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#cbcb41"><path d="M3 2h10v12H3z"/><text x="4" y="11" font-size="6" fill="#000">{}</text></svg>',
            md: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#519aba"><path d="M3 2h10v12H3z"/><text x="3" y="11" font-size="6" fill="#fff">MD</text></svg>',
            html: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#e44d26"><path d="M3 2h10v12H3z"/><text x="2" y="11" font-size="5" fill="#fff">HTML</text></svg>',
            css: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#563d7c"><path d="M3 2h10v12H3z"/><text x="3" y="11" font-size="6" fill="#fff">CSS</text></svg>',
            py: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#3776ab"><path d="M3 2h10v12H3z"/><text x="4" y="11" font-size="7" fill="#ffd43b">Py</text></svg>',
            git: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#f05032"><circle cx="8" cy="8" r="6"/></svg>',
            default: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#8b949e"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/></svg>'
        };
        
        // Специальные файлы
        if (fileName === '.gitignore') return icons.git;
        if (fileName === 'package.json') return icons.json;
        if (fileName === 'README.md') return icons.md;
        
        return icons[ext] || icons.default;
    }

    // Получить ветки
    async fetchBranches(repoName) {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${repoName}/branches`, {
                headers: this.getHeaders()
            });
            return response.ok ? await response.json() : [];
        } catch { return []; }
    }

    // Получить Pull Requests
    async fetchPullRequests(repoName) {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${repoName}/pulls?state=all&per_page=20`, {
                headers: this.getHeaders()
            });
            return response.ok ? await response.json() : [];
        } catch { return []; }
    }

    // Получить Issues
    async fetchIssues(repoName) {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${repoName}/issues?state=open&per_page=20`, {
                headers: this.getHeaders()
            });
            return response.ok ? await response.json() : [];
        } catch { return []; }
    }

    // Получить Commits
    async fetchCommits(repoName, branch = 'main') {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${repoName}/commits?per_page=20`, {
                headers: this.getHeaders()
            });
            return response.ok ? await response.json() : [];
        } catch { return []; }
    }

    // Получить языки репозитория
    async fetchLanguages(repoName) {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${repoName}/languages`, {
                headers: this.getHeaders()
            });
            return response.ok ? await response.json() : {};
        } catch { return {}; }
    }

    // Получить контрибьюторов
    async fetchContributors(repoName) {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${repoName}/contributors?per_page=10`, {
                headers: this.getHeaders()
            });
            return response.ok ? await response.json() : [];
        } catch { return []; }
    }

    // Получить содержимое файла
    async getFileContent(repoName, path, branch = 'main') {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${repoName}/contents/${path}?ref=${branch}`, {
                headers: this.getHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                if (data.content) {
                    return atob(data.content);
                }
            }
            return null;
        } catch { return null; }
    }

    // Сохранить файл
    async saveFile(repoName, path, content, message, branch = 'main') {
        try {
            // Сначала получить SHA текущего файла
            const currentFile = await fetch(`${this.baseUrl}/repos/${repoName}/contents/${path}?ref=${branch}`, {
                headers: this.getHeaders()
            });
            
            let sha = null;
            if (currentFile.ok) {
                const data = await currentFile.json();
                sha = data.sha;
            }

            const body = {
                message: message || `Update ${path}`,
                content: btoa(unescape(encodeURIComponent(content))),
                branch: branch
            };

            if (sha) {
                body.sha = sha;
            }

            const response = await fetch(`${this.baseUrl}/repos/${repoName}/contents/${path}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });

            return response.ok;
        } catch (error) {
            console.error('[GitHub] Error saving file:', error);
            return false;
        }
    }

    // Создать новый репозиторий
    async createRepository() {
        const nameInput = document.getElementById('newRepoName');
        const descInput = document.getElementById('newRepoDesc');
        const visibilityInputs = document.querySelectorAll('input[name="repoVisibility"]');
        const readmeCheckbox = document.getElementById('newRepoReadme');
        const gitignoreSelect = document.getElementById('newRepoGitignore');
        const licenseSelect = document.getElementById('newRepoLicense');
        const statusEl = document.getElementById('createRepoStatus');

        const name = nameInput?.value.trim();
        if (!name) {
            this.showStatus(statusEl, 'Введите название репозитория', 'error');
            return;
        }

        if (!this.token) {
            this.showStatus(statusEl, 'Сначала подключите GitHub аккаунт', 'error');
            return;
        }

        let isPrivate = false;
        visibilityInputs.forEach(input => {
            if (input.checked) {
                isPrivate = input.value === 'private';
            }
        });

        const body = {
            name: name,
            description: descInput?.value.trim() || '',
            private: isPrivate,
            auto_init: readmeCheckbox?.checked || false
        };

        if (gitignoreSelect?.value) {
            body.gitignore_template = gitignoreSelect.value;
        }

        if (licenseSelect?.value) {
            body.license_template = licenseSelect.value;
        }

        this.showStatus(statusEl, 'Создание репозитория...', 'info');

        try {
            const response = await fetch(`${this.baseUrl}/user/repos`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка создания');
            }

            const repo = await response.json();
            
            this.showStatus(statusEl, `Репозиторий "${repo.name}" создан!`, 'success');
            
            // Обновить список репозиториев
            await this.loadRepositories();
            
            // Очистить форму
            if (nameInput) nameInput.value = '';
            if (descInput) descInput.value = '';
            
            // Закрыть модальное окно через 1.5 секунды
            setTimeout(() => {
                window.closeModal('create-repo');
                // Выбрать новый репозиторий
                this.selectRepo(repo.full_name);
            }, 1500);
            
        } catch (error) {
            this.showStatus(statusEl, error.message, 'error');
        }
    }

    // Создать новую ветку
    async createBranch(repoName, branchName, fromBranch = 'main') {
        try {
            // Получить SHA последнего коммита
            const refResponse = await fetch(`${this.baseUrl}/repos/${repoName}/git/ref/heads/${fromBranch}`, {
                headers: this.getHeaders()
            });
            
            if (!refResponse.ok) return false;
            
            const refData = await refResponse.json();
            const sha = refData.object.sha;

            // Создать новую ветку
            const response = await fetch(`${this.baseUrl}/repos/${repoName}/git/refs`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    ref: `refs/heads/${branchName}`,
                    sha: sha
                })
            });

            if (response.ok) {
                await this.loadRepoData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('[GitHub] Error creating branch:', error);
            return false;
        }
    }

    // Удалить ветку
    async deleteBranch(branchName) {
        if (!this.currentRepo) return false;
        
        if (branchName === this.currentRepo.default_branch) {
            console.error('[GitHub] Cannot delete default branch');
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/git/refs/heads/${branchName}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (response.ok || response.status === 204) {
                await this.loadRepoData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('[GitHub] Error deleting branch:', error);
            return false;
        }
    }

    // === PULL REQUESTS ===

    // Создать Pull Request
    async createPullRequest(title, head, base, body = '') {
        if (!this.currentRepo) return null;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/pulls`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    title: title,
                    head: head,
                    base: base,
                    body: body
                })
            });

            if (response.ok) {
                const pr = await response.json();
                await this.loadRepoData();
                return pr;
            } else {
                const error = await response.json();
                console.error('[GitHub] Error creating PR:', error.message);
                return null;
            }
        } catch (error) {
            console.error('[GitHub] Error creating PR:', error);
            return null;
        }
    }

    // Слить Pull Request
    async mergePullRequest(prNumber, mergeMethod = 'merge') {
        if (!this.currentRepo) return false;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/pulls/${prNumber}/merge`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    merge_method: mergeMethod
                })
            });

            if (response.ok) {
                await this.loadRepoData();
                return true;
            } else {
                const error = await response.json();
                console.error('[GitHub] Error merging PR:', error.message);
                return false;
            }
        } catch (error) {
            console.error('[GitHub] Error merging PR:', error);
            return false;
        }
    }

    // Закрыть Pull Request
    async closePullRequest(prNumber) {
        if (!this.currentRepo) return false;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/pulls/${prNumber}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    state: 'closed'
                })
            });

            if (response.ok) {
                await this.loadRepoData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('[GitHub] Error closing PR:', error);
            return false;
        }
    }

    // Получить детали PR
    async getPullRequest(prNumber) {
        if (!this.currentRepo) return null;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/pulls/${prNumber}`, {
                headers: this.getHeaders()
            });
            return response.ok ? await response.json() : null;
        } catch { return null; }
    }

    // === ISSUES ===

    // Создать Issue
    async createIssue(title, body = '', labels = []) {
        if (!this.currentRepo) return null;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/issues`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    title: title,
                    body: body,
                    labels: labels
                })
            });

            if (response.ok) {
                const issue = await response.json();
                await this.loadRepoData();
                return issue;
            } else {
                const error = await response.json();
                console.error('[GitHub] Error creating issue:', error.message);
                return null;
            }
        } catch (error) {
            console.error('[GitHub] Error creating issue:', error);
            return null;
        }
    }

    // Закрыть Issue
    async closeIssue(issueNumber) {
        if (!this.currentRepo) return false;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/issues/${issueNumber}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    state: 'closed'
                })
            });

            if (response.ok) {
                await this.loadRepoData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('[GitHub] Error closing issue:', error);
            return false;
        }
    }

    // Открыть Issue (переоткрыть)
    async reopenIssue(issueNumber) {
        if (!this.currentRepo) return false;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/issues/${issueNumber}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    state: 'open'
                })
            });

            if (response.ok) {
                await this.loadRepoData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('[GitHub] Error reopening issue:', error);
            return false;
        }
    }

    // Добавить комментарий к Issue
    async addIssueComment(issueNumber, body) {
        if (!this.currentRepo) return null;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/issues/${issueNumber}/comments`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ body: body })
            });

            return response.ok ? await response.json() : null;
        } catch (error) {
            console.error('[GitHub] Error adding comment:', error);
            return null;
        }
    }

    // Получить комментарии Issue
    async getIssueComments(issueNumber) {
        if (!this.currentRepo) return [];

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/issues/${issueNumber}/comments`, {
                headers: this.getHeaders()
            });
            return response.ok ? await response.json() : [];
        } catch { return []; }
    }

    // === GITHUB ACTIONS ===

    // Получить workflow runs
    async fetchWorkflowRuns(repoName) {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${repoName}/actions/runs?per_page=10`, {
                headers: this.getHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                return data.workflow_runs || [];
            }
            return [];
        } catch { return []; }
    }

    // Получить список workflows
    async fetchWorkflows(repoName) {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${repoName}/actions/workflows`, {
                headers: this.getHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                return data.workflows || [];
            }
            return [];
        } catch { return []; }
    }

    // Перезапустить workflow
    async rerunWorkflow(runId) {
        if (!this.currentRepo) return false;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/actions/runs/${runId}/rerun`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            return response.ok || response.status === 201;
        } catch (error) {
            console.error('[GitHub] Error rerunning workflow:', error);
            return false;
        }
    }

    // Отменить workflow
    async cancelWorkflow(runId) {
        if (!this.currentRepo) return false;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/actions/runs/${runId}/cancel`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            return response.ok || response.status === 202;
        } catch (error) {
            console.error('[GitHub] Error canceling workflow:', error);
            return false;
        }
    }

    // Отрисовать workflows
    renderWorkflows(workflows) {
        const container = document.getElementById('workflowsList');
        if (!container) return;

        if (!workflows || workflows.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет workflow runs</div>';
            return;
        }

        container.innerHTML = workflows.map(run => {
            let statusClass = 'pending';
            let statusText = run.status;
            
            if (run.conclusion === 'success') {
                statusClass = 'success';
                statusText = 'success';
            } else if (run.conclusion === 'failure') {
                statusClass = 'failure';
                statusText = 'failed';
            } else if (run.status === 'in_progress') {
                statusClass = 'running';
                statusText = 'running';
            }

            return `
                <div class="workflow-item ${statusClass}">
                    <div class="workflow-status"></div>
                    <div class="workflow-content">
                        <div class="workflow-name">${run.name}</div>
                        <div class="workflow-meta">${run.head_branch} • ${this.formatDate(run.created_at)}</div>
                    </div>
                    <div class="workflow-actions">
                        ${run.status === 'completed' ? `<button class="btn btn-sm" onclick="githubManager.rerunWorkflow(${run.id})">Rerun</button>` : ''}
                        ${run.status === 'in_progress' ? `<button class="btn btn-sm" onclick="githubManager.cancelWorkflow(${run.id})">Cancel</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Синхронизировать всё
    async syncAll() {
        if (!this.token) {
            window.showModal('github-connect');
            return;
        }

        if (this.currentRepo) {
            await this.loadRepoData();
            console.log('[GitHub] Синхронизация завершена');
        }
    }

    // Выход
    logout() {
        // Logout теперь через githubAuth
        if (window.githubAuth) {
            window.githubAuth.logout();
        }
        this.repos = [];
        this.currentRepo = null;
        this.updateConnectPanel();
        this.updateReposList();
    }

    // Обновить UI
    updateUI() {
        const userInfo = document.getElementById('dropdownUserInfo');
        const avatarBtn = document.getElementById('userAvatarBtn');
        const connectCheck = document.getElementById('connectCheck');

        if (this.user) {
            // Обновить dropdown info
            if (userInfo) {
                userInfo.innerHTML = `
                    <div class="dropdown-user-name">${this.user.name || this.user.login}</div>
                    <div class="dropdown-user-email">${this.user.login}</div>
                `;
            }
            // Обновить аватар
            if (avatarBtn && this.user.avatar_url) {
                avatarBtn.innerHTML = `<img src="${this.user.avatar_url}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%;">`;
            }
            // Показать галочку
            if (connectCheck) {
                connectCheck.classList.add('visible');
            }
        } else {
            if (userInfo) {
                userInfo.innerHTML = `
                    <div class="dropdown-user-name">Не авторизован</div>
                    <div class="dropdown-user-email">Подключите GitHub</div>
                `;
            }
            if (avatarBtn) {
                avatarBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/></svg>`;
            }
            // Скрыть галочку
            if (connectCheck) {
                connectCheck.classList.remove('visible');
            }
        }
    }

    // Обновить список репозиториев в sidebar
    updateReposList() {
        if (window.repoManager) {
            window.repoManager.repos = this.repos.map(repo => ({
                id: repo.full_name,
                name: repo.name,
                description: repo.description || '',
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                language: repo.language || 'Unknown',
                isPrivate: repo.private,
                updatedAt: this.formatDate(repo.updated_at)
            }));
            window.repoManager.renderSidebar();
        }
    }

    // Рендер информации о репозитории (вкладка Information)
    renderRepoInfo(languages, contributors) {
        if (!this.currentRepo) return;

        const emptyState = document.getElementById('infoEmptyState');
        const content = document.getElementById('infoContent');
        
        if (emptyState) emptyState.style.display = 'none';
        if (content) content.style.display = 'block';

        const repo = this.currentRepo;

        // Header
        const repoName = document.getElementById('infoRepoName');
        const visibility = document.getElementById('infoRepoVisibility');
        const githubLink = document.getElementById('infoGithubLink');
        
        if (repoName) repoName.textContent = repo.full_name;
        if (visibility) {
            visibility.textContent = repo.private ? 'private' : 'public';
            visibility.className = `info-repo-visibility ${repo.private ? 'private' : ''}`;
        }
        if (githubLink) githubLink.href = repo.html_url;

        // Description
        const description = document.getElementById('infoDescription');
        if (description) description.textContent = repo.description || 'Нет описания';

        // Stats
        const statsEls = {
            stars: document.getElementById('infoStars'),
            forks: document.getElementById('infoForks'),
            watchers: document.getElementById('infoWatchers'),
            issues: document.getElementById('infoIssuesCount')
        };
        if (statsEls.stars) statsEls.stars.textContent = repo.stargazers_count || 0;
        if (statsEls.forks) statsEls.forks.textContent = repo.forks_count || 0;
        if (statsEls.watchers) statsEls.watchers.textContent = repo.watchers_count || 0;
        if (statsEls.issues) statsEls.issues.textContent = repo.open_issues_count || 0;

        // Languages
        this.renderLanguagesBar(languages);

        // About
        const aboutEls = {
            branch: document.getElementById('infoDefaultBranch'),
            created: document.getElementById('infoCreatedAt'),
            updated: document.getElementById('infoUpdatedAt'),
            size: document.getElementById('infoSize'),
            license: document.getElementById('infoLicense')
        };
        if (aboutEls.branch) aboutEls.branch.textContent = repo.default_branch || 'main';
        if (aboutEls.created) aboutEls.created.textContent = this.formatDateFull(repo.created_at);
        if (aboutEls.updated) aboutEls.updated.textContent = this.formatDateFull(repo.updated_at);
        if (aboutEls.size) aboutEls.size.textContent = this.formatSize(repo.size);
        if (aboutEls.license) aboutEls.license.textContent = repo.license?.name || 'Нет';

        // Topics
        const topicsSection = document.getElementById('infoTopicsSection');
        const topicsContainer = document.getElementById('infoTopics');
        if (topicsSection && topicsContainer) {
            if (repo.topics && repo.topics.length > 0) {
                topicsSection.style.display = 'block';
                topicsContainer.innerHTML = repo.topics.map(t => 
                    `<span class="info-topic">${t}</span>`
                ).join('');
            } else {
                topicsSection.style.display = 'none';
            }
        }

        // Contributors
        this.renderContributors(contributors);

        // Settings
        const settingsEls = {
            visibility: document.getElementById('infoVisibilitySelect'),
            issues: document.getElementById('infoHasIssues'),
            wiki: document.getElementById('infoHasWiki'),
            projects: document.getElementById('infoHasProjects')
        };
        if (settingsEls.visibility) settingsEls.visibility.value = repo.private ? 'private' : 'public';
        if (settingsEls.issues) settingsEls.issues.checked = repo.has_issues;
        if (settingsEls.wiki) settingsEls.wiki.checked = repo.has_wiki;
        if (settingsEls.projects) settingsEls.projects.checked = repo.has_projects;
    }

    // Рендер бара языков
    renderLanguagesBar(languages) {
        const bar = document.getElementById('infoLanguagesBar');
        const list = document.getElementById('infoLanguagesList');
        
        if (!bar || !list) return;

        const total = Object.values(languages).reduce((a, b) => a + b, 0);
        if (total === 0) {
            bar.innerHTML = '';
            list.innerHTML = '<span class="info-loading">Нет данных о языках</span>';
            return;
        }

        const langColors = {
            'JavaScript': '#f7df1e',
            'TypeScript': '#3178c6',
            'Python': '#3776ab',
            'HTML': '#e44d26',
            'CSS': '#563d7c',
            'Java': '#b07219',
            'C++': '#f34b7d',
            'C': '#555555',
            'C#': '#178600',
            'Go': '#00add8',
            'Rust': '#dea584',
            'Ruby': '#cc342d',
            'PHP': '#4f5d95',
            'Swift': '#fa7343',
            'Kotlin': '#a97bff',
            'Shell': '#89e051',
            'Vue': '#41b883',
            'SCSS': '#c6538c',
            'Dockerfile': '#384d54'
        };

        // Bar segments
        bar.innerHTML = Object.entries(languages)
            .sort((a, b) => b[1] - a[1])
            .map(([lang, bytes]) => {
                const percent = (bytes / total * 100).toFixed(1);
                const color = langColors[lang] || '#8b949e';
                return `<div class="lang-segment" style="width: ${percent}%; background: ${color};" title="${lang}: ${percent}%"></div>`;
            }).join('');

        // List
        list.innerHTML = Object.entries(languages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([lang, bytes]) => {
                const percent = (bytes / total * 100).toFixed(1);
                const color = langColors[lang] || '#8b949e';
                return `
                    <div class="info-lang-item">
                        <span class="lang-dot" style="background: ${color};"></span>
                        <span>${lang}</span>
                        <span class="lang-percent">${percent}%</span>
                    </div>
                `;
            }).join('');
    }

    // Рендер контрибьюторов
    renderContributors(contributors) {
        const container = document.getElementById('infoContributors');
        if (!container) return;

        if (!contributors || contributors.length === 0) {
            container.innerHTML = '<span class="info-loading">Нет контрибьюторов</span>';
            return;
        }

        container.innerHTML = contributors.slice(0, 8).map(c => `
            <a href="${c.html_url}" target="_blank" class="info-contributor">
                <img src="${c.avatar_url}" alt="${c.login}">
                <div class="info-contributor-info">
                    <span class="info-contributor-name">${c.login}</span>
                    <span class="info-contributor-commits">${c.contributions} коммитов</span>
                </div>
            </a>
        `).join('');
    }

    // Обновить видимость репозитория
    async updateRepoVisibility(visibility) {
        if (!this.currentRepo) return;

        const isPrivate = visibility === 'private';
        await this.updateRepoSetting('private', isPrivate);
    }

    // Обновить настройку репозитория
    async updateRepoSetting(setting, value) {
        if (!this.currentRepo) return;

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({ [setting]: value })
            });

            if (response.ok) {
                this.currentRepo = await response.json();
                console.log(`[GitHub] Updated ${setting} to ${value}`);
            } else {
                console.error('[GitHub] Failed to update setting');
            }
        } catch (error) {
            console.error('[GitHub] Error updating setting:', error);
        }
    }

    // Архивировать репозиторий
    async archiveRepo() {
        if (!this.currentRepo) return;
        await this.updateRepoSetting('archived', true);
    }

    // Удалить текущий репозиторий
    async deleteCurrentRepo() {
        if (!this.currentRepo) return;

        const name = this.currentRepo.name;
        const input = prompt(`Для подтверждения удаления введите название репозитория: ${name}`);
        
        if (input !== name) {
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (response.ok || response.status === 204) {
                this.currentRepo = null;
                await this.loadRepositories();
                
                // Очистить страницу информации
                const emptyState = document.getElementById('infoEmptyState');
                const content = document.getElementById('infoContent');
                if (emptyState) emptyState.style.display = 'flex';
                if (content) content.style.display = 'none';
            }
        } catch (error) {
            console.error('[GitHub] Error deleting repo:', error);
        }
    }

    // Форматирование размера
    formatSize(kb) {
        if (!kb) return '—';
        if (kb < 1024) return `${kb} KB`;
        if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
        return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
    }

    // Форматирование полной даты
    formatDateFull(dateStr) {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    // Обновить текущий репозиторий
    updateCurrentRepo() {
        if (!this.currentRepo) return;

        const headerTitle = document.getElementById('headerTitle');
        if (headerTitle) {
            headerTitle.textContent = this.currentRepo.name;
        }

        const projectName = document.getElementById('currentProjectName');
        if (projectName) {
            projectName.textContent = this.currentRepo.name;
        }
    }

    // Обновить статистику
    updateStats(branches, prs, issues) {
        const statPR = document.getElementById('statPR');
        const statBranches = document.getElementById('statBranches');
        const statIssues = document.getElementById('statIssues');

        if (statPR) statPR.textContent = prs;
        if (statBranches) statBranches.textContent = branches;
        if (statIssues) statIssues.textContent = issues;
    }

    // Отрисовать ветки
    renderBranches(branches) {
        const container = document.getElementById('branchesList');
        if (!container) return;

        if (branches.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет веток</div>';
            return;
        }

        container.innerHTML = branches.map(branch => `
            <div class="branch-card ${branch.name === this.currentRepo?.default_branch ? 'default' : ''}">
                <div class="branch-info">
                    <span class="branch-name">${branch.name}</span>
                    ${branch.name === this.currentRepo?.default_branch ? '<span class="badge badge-success">default</span>' : ''}
                </div>
                <div class="branch-actions">
                    <button class="btn btn-sm" onclick="githubManager.checkoutBranch('${branch.name}')">Checkout</button>
                    ${branch.name !== this.currentRepo?.default_branch ? `<button class="btn btn-sm btn-danger" onclick="githubManager.confirmDeleteBranch('${branch.name}')">Delete</button>` : ''}
                </div>
            </div>
        `).join('');

        // Обновить select веток
        const branchSelect = document.getElementById('branchSelect');
        if (branchSelect) {
            branchSelect.innerHTML = branches.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
        }
    }

    // Подтверждение удаления ветки
    confirmDeleteBranch(branchName) {
        if (confirm(`Удалить ветку "${branchName}"?`)) {
            this.deleteBranch(branchName);
        }
    }

    // Отрисовать Pull Requests
    renderPullRequests(prs) {
        const container = document.getElementById('prList');
        if (!container) return;

        if (prs.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет Pull Requests</div>';
            return;
        }

        container.innerHTML = prs.slice(0, 10).map(pr => `
            <div class="pr-card">
                <div class="pr-status ${pr.state}"></div>
                <div class="pr-content">
                    <div class="pr-title">#${pr.number} ${pr.title}</div>
                    <div class="pr-meta">
                        <span>${pr.head?.ref || ''} ← ${pr.base?.ref || ''}</span>
                        <span>• ${pr.user?.login || ''} • ${this.formatDate(pr.created_at)}</span>
                    </div>
                </div>
                <div class="pr-actions">
                    ${pr.state === 'open' ? `
                        <button class="btn btn-sm btn-success" onclick="githubManager.confirmMergePR(${pr.number})">Merge</button>
                        <button class="btn btn-sm" onclick="githubManager.closePullRequest(${pr.number})">Close</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // Подтверждение слияния PR
    confirmMergePR(prNumber) {
        if (confirm(`Слить Pull Request #${prNumber}?`)) {
            this.mergePullRequest(prNumber);
        }
    }

    // Отрисовать Issues
    renderIssues(issues) {
        const container = document.getElementById('issuesList');
        if (!container) return;

        // Фильтровать только issues (не PR)
        const realIssues = issues.filter(i => !i.pull_request);

        if (realIssues.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет Issues</div>';
            return;
        }

        container.innerHTML = realIssues.slice(0, 10).map(issue => `
            <div class="issue-item ${issue.state}">
                <div class="issue-status"></div>
                <div class="issue-content">
                    <div class="issue-title">#${issue.number} ${issue.title}</div>
                    <div class="issue-meta">${issue.user?.login || ''} • ${this.formatDate(issue.created_at)}</div>
                </div>
                <div class="issue-actions">
                    ${issue.state === 'open' ? `
                        <button class="btn btn-sm" onclick="githubManager.closeIssue(${issue.number})">Close</button>
                    ` : `
                        <button class="btn btn-sm" onclick="githubManager.reopenIssue(${issue.number})">Reopen</button>
                    `}
                </div>
            </div>
        `).join('');
    }

    // Отрисовать Commits
    renderCommits(commits) {
        const container = document.getElementById('commitsList');
        if (!container) return;

        if (commits.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет коммитов</div>';
            return;
        }

        container.innerHTML = commits.slice(0, 15).map(commit => `
            <div class="commit-item">
                <div class="commit-hash">${commit.sha.substring(0, 7)}</div>
                <div class="commit-content">
                    <div class="commit-message">${commit.commit?.message?.split('\n')[0] || ''}</div>
                    <div class="commit-meta">${commit.commit?.author?.name || ''} • ${this.formatDate(commit.commit?.author?.date)}</div>
                </div>
            </div>
        `).join('');
    }

    // Вспомогательные методы
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн назад`;
        
        return date.toLocaleDateString('ru-RU');
    }

    showStatus(el, message, type) {
        if (!el) return;
        el.textContent = message;
        el.className = `connect-status ${type}`;
    }

    checkoutBranch(branchName) {
        console.log('[GitHub] Checkout branch:', branchName);
    }

    // === Контекстное меню для папок ===
    
    initFolderContextMenu() {
        this.folderColors = session.getFolderColors();
        this.currentContextFolder = null;
        
        const menu = document.getElementById('folderContextMenu');
        if (!menu) return;

        // Закрыть по клику вне меню
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) {
                menu.classList.remove('visible');
            }
        });

        // Обработчики цветов
        menu.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                this.setFolderColor(this.currentContextFolder, color);
                menu.classList.remove('visible');
            });
        });

        // Сброс цвета
        const resetBtn = document.getElementById('resetFolderColor');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.setFolderColor(this.currentContextFolder, null);
                menu.classList.remove('visible');
            });
        }
    }

    showFolderContextMenu(e, folderPath) {
        e.preventDefault();
        e.stopPropagation();
        
        this.currentContextFolder = folderPath;
        const menu = document.getElementById('folderContextMenu');
        if (!menu) return;

        // Позиционирование
        const x = Math.min(e.clientX, window.innerWidth - 180);
        const y = Math.min(e.clientY, window.innerHeight - 200);
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        // Отметить текущий цвет
        const currentColor = this.folderColors[folderPath] || '#8b949e';
        menu.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.toggle('active', swatch.dataset.color === currentColor);
        });

        menu.classList.add('visible');
    }

    setFolderColor(folderPath, color) {
        if (!folderPath) return;

        if (color) {
            this.folderColors[folderPath] = color;
        } else {
            delete this.folderColors[folderPath];
        }
        
        session.setFolderColors(this.folderColors);

        // Обновить иконку папки
        const folderEl = document.querySelector(`.tree-item.folder[data-path="${folderPath}"]`);
        if (folderEl) {
            const iconEl = folderEl.querySelector('.tree-item-header > .tree-icon');
            if (iconEl) {
                const isExpanded = folderEl.classList.contains('expanded');
                iconEl.innerHTML = isExpanded 
                    ? this.getFolderOpenIcon(color || '#58a6ff')
                    : this.getFolderIcon(color || '#8b949e');
            }
        }
    }

    getFolderColorForPath(path) {
        return this.folderColors?.[path] || '#8b949e';
    }

    // === ПРОСМОТР КОДА ===
    
    currentBrowsePath = '';
    previewFile = null;

    async browseCode(path = '') {
        if (!this.currentRepo) return;
        
        this.currentBrowsePath = path;
        const container = document.getElementById('codeBrowser');
        const preview = document.getElementById('codePreview');
        
        if (!container) return;
        
        container.innerHTML = '<div class="loading">Загрузка...</div>';
        if (preview) preview.style.display = 'none';

        try {
            const url = path 
                ? `${this.baseUrl}/repos/${this.currentRepo.full_name}/contents/${path}`
                : `${this.baseUrl}/repos/${this.currentRepo.full_name}/contents`;
            
            const response = await fetch(url, { headers: this.getHeaders() });
            
            if (!response.ok) throw new Error('Ошибка загрузки');
            
            const items = await response.json();
            
            // Обновить breadcrumb
            this.updateBreadcrumb(path);
            
            // Отсортировать: папки сначала
            const sorted = items.sort((a, b) => {
                if (a.type === 'dir' && b.type !== 'dir') return -1;
                if (a.type !== 'dir' && b.type === 'dir') return 1;
                return a.name.localeCompare(b.name);
            });
            
            container.innerHTML = `
                <div class="code-file-list">
                    ${path ? `<div class="code-file-item folder" onclick="githubManager.browseCode('${this.getParentPath(path)}')">
                        <span class="file-icon">..</span>
                        <span class="file-name">..</span>
                    </div>` : ''}
                    ${sorted.map(item => `
                        <div class="code-file-item ${item.type}" onclick="githubManager.${item.type === 'dir' ? 'browseCode' : 'previewCode'}('${item.path}')">
                            <span class="file-icon">${item.type === 'dir' ? this.getFolderIcon() : this.getFileIcon(item.name)}</span>
                            <span class="file-name">${item.name}</span>
                            <span class="file-size">${item.type === 'file' ? this.formatBytes(item.size) : ''}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (e) {
            container.innerHTML = `<div class="empty-state">Ошибка: ${e.message}</div>`;
        }
    }

    updateBreadcrumb(path) {
        const breadcrumb = document.getElementById('codeBreadcrumb');
        if (!breadcrumb) return;
        
        const parts = path ? path.split('/') : [];
        let html = `<span class="breadcrumb-item root" onclick="githubManager.browseCode('')">${this.currentRepo?.name || 'root'}</span>`;
        
        let currentPath = '';
        parts.forEach((part, i) => {
            currentPath += (i > 0 ? '/' : '') + part;
            html += `<span class="breadcrumb-sep">/</span><span class="breadcrumb-item" onclick="githubManager.browseCode('${currentPath}')">${part}</span>`;
        });
        
        breadcrumb.innerHTML = html;
    }

    getParentPath(path) {
        const parts = path.split('/');
        parts.pop();
        return parts.join('/');
    }

    async previewCode(path) {
        const container = document.getElementById('codeBrowser');
        const preview = document.getElementById('codePreview');
        const fileName = document.getElementById('previewFileName');
        const content = document.getElementById('previewContent');
        
        if (!preview || !content) return;
        
        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/contents/${path}`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки');
            
            const file = await response.json();
            this.previewFile = file;
            
            const decoded = atob(file.content);
            
            if (container) container.style.display = 'none';
            preview.style.display = 'block';
            if (fileName) fileName.textContent = file.name;
            content.textContent = decoded;
            
        } catch (e) {
            console.error('[GitHub] Error loading file:', e);
        }
    }

    closePreview() {
        const container = document.getElementById('codeBrowser');
        const preview = document.getElementById('codePreview');
        
        if (container) container.style.display = 'block';
        if (preview) preview.style.display = 'none';
        this.previewFile = null;
    }

    async copyFileContent() {
        if (!this.previewFile) return;
        try {
            const decoded = atob(this.previewFile.content);
            await navigator.clipboard.writeText(decoded);
        } catch (e) {
            console.error('[GitHub] Error copying:', e);
        }
    }

    openInEditor() {
        if (!this.previewFile) return;
        
        // Переключиться на редактор
        if (window.navRing) {
            window.navRing.setActiveTab('editor');
        }
        
        // Загрузить в редактор
        const codeInput = document.getElementById('codeInput');
        if (codeInput) {
            const decoded = atob(this.previewFile.content);
            codeInput.value = decoded;
            codeInput.dispatchEvent(new Event('input'));
        }
    }

    formatBytes(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // === НАСТРОЙКИ РЕПОЗИТОРИЯ ===
    
    renderRepoSettings() {
        const container = document.getElementById('repoSettingsContent');
        if (!container || !this.currentRepo) {
            if (container) container.innerHTML = '<div class="empty-state">Выберите репозиторий</div>';
            return;
        }

        const repo = this.currentRepo;
        container.innerHTML = `
            <div class="settings-section">
                <h4>Основные</h4>
                <div class="settings-row">
                    <label>Название</label>
                    <input type="text" class="form-input" value="${repo.name}" id="settingRepoName" disabled>
                </div>
                <div class="settings-row">
                    <label>Описание</label>
                    <textarea class="form-input" id="settingRepoDesc" rows="2">${repo.description || ''}</textarea>
                </div>
                <div class="settings-row">
                    <label>Видимость</label>
                    <select class="form-input" id="settingRepoVisibility">
                        <option value="public" ${!repo.private ? 'selected' : ''}>Публичный</option>
                        <option value="private" ${repo.private ? 'selected' : ''}>Приватный</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="githubManager.saveRepoSettings()">Сохранить изменения</button>
            </div>

            <div class="settings-section">
                <h4>Функции</h4>
                <div class="settings-toggle-row">
                    <span>Issues</span>
                    <label class="toggle ${repo.has_issues ? 'enabled' : ''}" onclick="this.classList.toggle('enabled')">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-toggle-row">
                    <span>Wiki</span>
                    <label class="toggle ${repo.has_wiki ? 'enabled' : ''}" onclick="this.classList.toggle('enabled')">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-toggle-row">
                    <span>Projects</span>
                    <label class="toggle ${repo.has_projects ? 'enabled' : ''}" onclick="this.classList.toggle('enabled')">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-section danger">
                <h4>Опасная зона</h4>
                <button class="btn btn-danger" onclick="githubManager.deleteCurrentRepo()">
                    Удалить репозиторий
                </button>
            </div>
        `;
    }

    async saveRepoSettings() {
        if (!this.currentRepo) return;
        
        const desc = document.getElementById('settingRepoDesc')?.value;
        const visibility = document.getElementById('settingRepoVisibility')?.value;
        
        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    description: desc,
                    private: visibility === 'private'
                })
            });
            
            if (response.ok) {
                this.currentRepo = await response.json();
            }
        } catch (e) {
            console.error('[GitHub] Error saving settings:', e);
        }
    }

    // === СКАЧИВАНИЕ ===
    
    renderDownloadSection() {
        const container = document.getElementById('downloadContent');
        if (!container || !this.currentRepo) {
            if (container) container.innerHTML = '<div class="empty-state">Выберите репозиторий</div>';
            return;
        }

        const repo = this.currentRepo;
        container.innerHTML = `
            <div class="download-options">
                <div class="download-card" onclick="githubManager.downloadZip()">
                    <div class="download-info">
                        <div class="download-title">Скачать ZIP</div>
                        <div class="download-desc">Архив с исходным кодом</div>
                    </div>
                </div>
                
                <div class="download-card" onclick="githubManager.copyCloneUrl()">
                    <div class="download-info">
                        <div class="download-title">Clone URL</div>
                        <div class="download-desc">${repo.clone_url}</div>
                    </div>
                </div>
                
                <div class="download-card" onclick="githubManager.copyCloneSSH()">
                    <div class="download-info">
                        <div class="download-title">Clone SSH</div>
                        <div class="download-desc">${repo.ssh_url}</div>
                    </div>
                </div>
                
                <div class="download-card" onclick="githubManager.openInGitHub()">
                    <div class="download-info">
                        <div class="download-title">Открыть на GitHub</div>
                        <div class="download-desc">${repo.html_url}</div>
                    </div>
                </div>
            </div>
        `;
    }

    downloadZip() {
        if (!this.currentRepo) return;
        window.open(`${this.currentRepo.html_url}/archive/refs/heads/${this.currentRepo.default_branch || 'main'}.zip`, '_blank');
    }

    async copyCloneUrl() {
        if (!this.currentRepo) return;
        await navigator.clipboard.writeText(this.currentRepo.clone_url);
    }

    async copyCloneSSH() {
        if (!this.currentRepo) return;
        await navigator.clipboard.writeText(this.currentRepo.ssh_url);
    }

    openInGitHub() {
        if (!this.currentRepo) return;
        window.open(this.currentRepo.html_url, '_blank');
    }

    // Обновить все секции при выборе репозитория
    updateAllSections() {
        this.browseCode('');
        this.renderRepoSettings();
        this.renderDownloadSection();
    }
}

export const githubManager = new GitHubManager();
window.githubManager = githubManager;
