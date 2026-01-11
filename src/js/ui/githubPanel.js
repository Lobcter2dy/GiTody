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
        if (!window.githubManager || !window.githubManager.currentRepo) {
            console.warn('[GitHubPanel] GitHubManager not available or no repo selected');
            return [];
        }
        const repoName = window.githubManager.currentRepo.full_name;
        return await window.githubManager.fetchBranches(repoName);
    }

    async loadPullRequests() {
        if (!window.githubManager || !window.githubManager.currentRepo) {
            console.warn('[GitHubPanel] GitHubManager not available or no repo selected');
            return [];
        }
        const repoName = window.githubManager.currentRepo.full_name;
        return await window.githubManager.fetchPullRequests(repoName);
    }

    async loadIssues() {
        if (!window.githubManager || !window.githubManager.currentRepo) {
            console.warn('[GitHubPanel] GitHubManager not available or no repo selected');
            return [];
        }
        const repoName = window.githubManager.currentRepo.full_name;
        return await window.githubManager.fetchIssues(repoName);
    }

    async loadCommits(branch = 'main') {
        if (!window.githubManager || !window.githubManager.currentRepo) {
            console.warn('[GitHubPanel] GitHubManager not available or no repo selected');
            return [];
        }
        const repoName = window.githubManager.currentRepo.full_name;
        return await window.githubManager.fetchCommits(repoName, branch);
    }

    async loadActions() {
        if (!window.githubManager || !window.githubManager.currentRepo) {
            console.warn('[GitHubPanel] GitHubManager not available or no repo selected');
            return [];
        }
        const repoName = window.githubManager.currentRepo.full_name;
        return await window.githubManager.fetchWorkflowRuns(repoName);
    }

    async loadReleases() {
        if (!window.githubManager || !window.githubManager.currentRepo) {
            console.warn('[GitHubPanel] GitHubManager not available or no repo selected');
            return [];
        }
        const repoName = window.githubManager.currentRepo.full_name;
        return await window.githubManager.fetchReleases(repoName);
    }

    // Создание новых элементов
    async createBranch(branchName, baseBranch = 'main') {
        if (!window.githubManager || !window.githubManager.currentRepo) {
            throw new Error('GitHubManager not available or no repo selected');
        }
        const repoName = window.githubManager.currentRepo.full_name;
        return await window.githubManager.createBranch(repoName, branchName, baseBranch);
    }

    createPullRequest() {
        // Используется модальное окно из основного UI
        if (window.showModal) {
            window.showModal('createPR');
        } else {
            console.warn('[GitHubPanel] Modal manager not available');
        }
    }

    createIssue() {
        // Используется модальное окно из основного UI
        if (window.showModal) {
            window.showModal('createIssue');
        } else {
            console.warn('[GitHubPanel] Modal manager not available');
        }
    }

    createRelease() {
        // Используется модальное окно из основного UI
        if (window.showModal) {
            window.showModal('createRelease');
        } else {
            console.warn('[GitHubPanel] Modal manager not available');
        }
    }
}

export const githubPanelManager = new GitHubPanelManager();
window.githubPanelManager = githubPanelManager;

