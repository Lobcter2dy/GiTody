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

        // Обновить активную кнопку навигации
        document.querySelectorAll('.github-icon-btn').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionName);
        });

        // Показать соответствующую секцию
        document.querySelectorAll('.github-section').forEach(section => {
            section.classList.toggle('active', section.id === `section-${sectionName}`);
        });

        // Если это Overview, обновить данные
        if (sectionName === 'overview' && window.githubManager) {
            window.githubManager.syncAll();
        }
    }

    // API методы для работы с данными
    async loadBranches() {
        // TODO: Загрузка веток из GitHub API
        console.log('[GitHubPanel] Loading branches...');
    }

    async loadPullRequests() {
        // TODO: Загрузка PR из GitHub API
        console.log('[GitHubPanel] Loading pull requests...');
    }

    async loadIssues() {
        // TODO: Загрузка issues из GitHub API
        console.log('[GitHubPanel] Loading issues...');
    }

    async loadCommits() {
        // TODO: Загрузка коммитов из GitHub API
        console.log('[GitHubPanel] Loading commits...');
    }

    async loadActions() {
        // TODO: Загрузка actions из GitHub API
        console.log('[GitHubPanel] Loading actions...');
    }

    async loadReleases() {
        // TODO: Загрузка релизов из GitHub API
        console.log('[GitHubPanel] Loading releases...');
    }

    // Создание новых элементов
    createBranch() {
        const name = prompt('Введите имя новой ветки:');
        if (name) {
            console.log('[GitHubPanel] Creating branch:', name);
            // TODO: API call
            alert(`Ветка "${name}" создана`);
        }
    }

    createPullRequest() {
        console.log('[GitHubPanel] Creating new PR...');
        // TODO: Открыть модальное окно для создания PR
    }

    createIssue() {
        console.log('[GitHubPanel] Creating new issue...');
        // TODO: Открыть модальное окно для создания issue
    }

    createRelease() {
        console.log('[GitHubPanel] Creating new release...');
        // TODO: Открыть модальное окно для создания релиза
    }
}

export const githubPanelManager = new GitHubPanelManager();
window.githubPanelManager = githubPanelManager;

