/**
 * GitHub Panel Manager - управление внутренними секциями
 */

export class GitHubPanelManager {
    constructor() {
        this.activeSection = 'branches';
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
        // Добавляем обработчики для навигации внутри GitHub панели (новые иконки)
        document.querySelectorAll('.github-icon-btn').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.switchSection(section);
            });
        });

        // Legacy support
        document.querySelectorAll('.github-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.switchSection(section);
            });
        });

        // Показать overview по умолчанию
        this.switchSection('overview');
    }

    switchSection(sectionName) {
        this.activeSection = sectionName;

        // Обновить активную кнопку навигации (новые иконки)
        document.querySelectorAll('.github-icon-btn').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionName);
        });

        // Legacy support
        document.querySelectorAll('.github-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionName);
        });

        // Показать соответствующую секцию
        document.querySelectorAll('.github-section').forEach(section => {
            section.classList.toggle('active', section.id === `section-${sectionName}`);
        });

        // Сохранить состояние
        if (window.stateManager) {
            window.stateManager.set('activeGithubSection', sectionName);
        }
    }

    // API методы для работы с данными
    async loadBranches() {
        console.log('[GitHubPanel] Loading branches...');
        if (window.githubManager?.currentRepo) {
            const branches = await window.githubManager.fetchBranches(window.githubManager.currentRepo.full_name);
            window.githubManager.renderBranches(branches);
        }
    }

    async loadPullRequests() {
        console.log('[GitHubPanel] Loading pull requests...');
        if (window.githubManager?.currentRepo) {
            const pullRequests = await window.githubManager.fetchPullRequests(window.githubManager.currentRepo.full_name);
            window.githubManager.renderPullRequests(pullRequests);
        }
    }

    async loadIssues() {
        console.log('[GitHubPanel] Loading issues...');
        if (window.githubManager?.currentRepo) {
            const issues = await window.githubManager.fetchIssues(window.githubManager.currentRepo.full_name);
            window.githubManager.renderIssues(issues);
        }
    }

    async loadCommits() {
        console.log('[GitHubPanel] Loading commits...');
        if (window.githubManager?.currentRepo) {
            const commits = await window.githubManager.fetchCommits(window.githubManager.currentRepo.full_name);
            window.githubManager.renderCommits(commits);
        }
    }

    async loadActions() {
        console.log('[GitHubPanel] Loading actions...');
        if (window.githubManager?.currentRepo) {
            const workflows = await window.githubManager.fetchWorkflowRuns(window.githubManager.currentRepo.full_name);
            window.githubManager.renderWorkflows(workflows);
        }
    }

    async loadReleases() {
        console.log('[GitHubPanel] Loading releases...');
        if (window.githubManager?.currentRepo) {
            const releases = await window.githubManager.fetchReleases(window.githubManager.currentRepo.full_name);
            this.renderReleases(releases);
        }
    }

    renderReleases(releases) {
        const container = document.getElementById('releasesList');
        if (!container) return;

        if (!releases || releases.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет релизов</div>';
            return;
        }

        container.innerHTML = releases.map(release => `
            <div class="release-item">
                <div class="release-header">
                    <div class="release-tag">${release.tag_name}</div>
                    ${release.prerelease ? '<span class="badge badge-warning">Pre-release</span>' : ''}
                    ${release.draft ? '<span class="badge badge-secondary">Draft</span>' : ''}
                </div>
                <div class="release-title">${release.name || release.tag_name}</div>
                <div class="release-meta">
                    ${release.author?.login || 'Unknown'} • ${window.githubManager.formatDate(release.published_at)}
                </div>
                <div class="release-actions">
                    <a href="${release.html_url}" target="_blank" class="btn btn-sm">View on GitHub</a>
                </div>
            </div>
        `).join('');
    }

    // Создание новых элементов
    async createBranch() {
        if (!window.githubManager?.currentRepo) return;
        
        const defaultBranch = window.githubManager.currentRepo.default_branch || 'main';
        const fromBranch = prompt(`Создать ветку из (по умолчанию: ${defaultBranch}):`, defaultBranch);
        if (!fromBranch) return;
        
        const name = prompt('Введите имя новой ветки:');
        if (name) {
            console.log('[GitHubPanel] Creating branch:', name);
            const success = await window.githubManager.createBranch(
                window.githubManager.currentRepo.full_name,
                name,
                fromBranch
            );
            if (success) {
                alert(`Ветка "${name}" создана из "${fromBranch}"`);
                await this.loadBranches();
            } else {
                alert(`Ошибка при создании ветки "${name}"`);
            }
        }
    }

    createPullRequest() {
        console.log('[GitHubPanel] Creating new PR...');
        if (window.openModal) {
            window.openModal('create-pr');
        } else {
            this.showCreatePRDialog();
        }
    }

    createIssue() {
        console.log('[GitHubPanel] Creating new issue...');
        if (window.openModal) {
            window.openModal('create-issue');
        } else {
            this.showCreateIssueDialog();
        }
    }

    createRelease() {
        console.log('[GitHubPanel] Creating new release...');
        if (window.openModal) {
            window.openModal('create-release');
        } else {
            this.showCreateReleaseDialog();
        }
    }

    // Диалоги создания (fallback если нет модальной системы)
    showCreatePRDialog() {
        if (!window.githubManager?.currentRepo) return;
        
        const title = prompt('Название Pull Request:');
        if (!title) return;
        
        const head = prompt('Исходная ветка (head):');
        if (!head) return;
        
        const defaultBranch = window.githubManager.currentRepo.default_branch || 'main';
        const base = prompt(`Целевая ветка (base, по умолчанию: ${defaultBranch}):`, defaultBranch);
        if (!base) return;
        
        const body = prompt('Описание (опционально):') || '';
        
        this.submitCreatePR(title, head, base, body);
    }

    async submitCreatePR(title, head, base, body) {
        if (!window.githubManager?.currentRepo) return;
        
        const pr = await window.githubManager.createPullRequest(title, head, base, body);
        if (pr) {
            alert(`Pull Request #${pr.number} создан!`);
            await this.loadPullRequests();
        } else {
            alert('Ошибка при создании Pull Request');
        }
    }

    showCreateIssueDialog() {
        const title = prompt('Название Issue:');
        if (!title) return;
        
        const body = prompt('Описание (опционально):') || '';
        
        this.submitCreateIssue(title, body);
    }

    async submitCreateIssue(title, body, labels = []) {
        if (!window.githubManager?.currentRepo) return;
        
        const issue = await window.githubManager.createIssue(title, body, labels);
        if (issue) {
            alert(`Issue #${issue.number} создан!`);
            await this.loadIssues();
        } else {
            alert('Ошибка при создании Issue');
        }
    }

    showCreateReleaseDialog() {
        const tag = prompt('Тег релиза (например, v1.0.0):');
        if (!tag) return;
        
        const name = prompt('Название релиза:', tag);
        if (!name) return;
        
        const body = prompt('Описание релиза (опционально):') || '';
        
        this.submitCreateRelease(tag, name, body);
    }

    async submitCreateRelease(tag, name, body) {
        if (!window.githubManager?.currentRepo) return;
        
        const release = await window.githubManager.createRelease(tag, name, body);
        if (release) {
            alert(`Релиз ${release.tag_name} создан!`);
            await this.loadReleases();
        } else {
            alert('Ошибка при создании релиза');
        }
    }
}

export const githubPanelManager = new GitHubPanelManager();
window.githubPanelManager = githubPanelManager;

