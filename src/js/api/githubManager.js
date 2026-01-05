/**
 * GitHub Manager - Полноценная интеграция с GitHub API
 */

import { session } from '../storage/session.js';
import { Result } from '../core/result.js';
import { Logger } from '../core/logger.js';

const log = Logger.create('[GitHubManager]');

export class GitHubManager {
    constructor() {
        this.repos = [];
        this.currentRepo = null;
        this.baseUrl = 'https://api.github.com';

        document.addEventListener('DOMContentLoaded', () => {
            this.updateReposList();
        });

        // Авто-синхронизация каждые 2 минуты, если выбран репозиторий
        this.syncTimer = setInterval(() => {
            if (this.token && this.currentRepo) {
                log.info('Auto-refreshing repo data...');
                this.loadRepoData();
            }
        }, 120000);
    }

    get token() { return session.getToken(); }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }

    // === API FETCHERS ===

    async fetchApi(endpoint, options = {}) {
        if (!this.token) return Result.Err('Auth required');
        try {
            const res = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: { ...this.getHeaders(), ...options.headers }
            });
            if (!res.ok) {
                const err = await res.json();
                return Result.Err(err.message || 'API error');
            }
            if (res.status === 204) return Result.Ok(true);
            return Result.Ok(await res.json());
        } catch (e) { return Result.Err(e.message); }
    }

    // === REPOSITORY MANAGEMENT ===

    async loadRepositories() {
        const res = await this.fetchApi('/user/repos?per_page=100&sort=updated');
        if (res.isOk) {
            this.repos = res.value;
            this.updateReposList();
        }
        return res;
    }

    async selectRepo(fullName) {
        log.info(`Selecting repo: ${fullName}`);
        const res = await this.fetchApi(`/repos/${fullName}`);
        if (res.isOk) {
            this.currentRepo = res.value;
            session.setActiveRepo(fullName);
            await this.loadRepoData();
            this.updateCurrentRepoUI();
        }
    }

    async loadRepoData() {
        if (!this.currentRepo) return;
        const name = this.currentRepo.full_name;

        // Сохраняем последний SHA для сравнения
        const lastSha = this.lastCommitSha;

        const [branches, prs, issues, commits, contents, releases, workflows] = await Promise.all([
            this.fetchApi(`/repos/${name}/branches`),
            this.fetchApi(`/repos/${name}/pulls?state=all`),
            this.fetchApi(`/repos/${name}/issues?state=open`),
            this.fetchApi(`/repos/${name}/commits?per_page=20`),
            this.fetchApi(`/repos/${name}/contents`),
            this.fetchApi(`/repos/${name}/releases`),
            this.fetchApi(`/repos/${name}/actions/workflows`)
        ]);

        if (branches.isOk) this.renderBranches(branches.value);
        if (prs.isOk) this.renderPRs(prs.value);
        if (issues.isOk) this.renderIssues(issues.value);
        if (commits.isOk) {
            this.renderCommits(commits.value);
            const currentSha = commits.value[0]?.sha;
            if (lastSha && currentSha && currentSha !== lastSha) {
                log.info('New changes detected on remote!');
                this.showUpdateIndicator(' remote has new commits');
            }
            this.lastCommitSha = currentSha;
        }
        if (contents.isOk) this.renderFileTree(contents.value);
        if (releases.isOk) this.renderReleases(releases.value);
        if (workflows.isOk) this.renderWorkflows(workflows.value.workflows || []);

        // Рендерим информацию о репозитории (таб Information)
        this.renderRepoInfo();

        const infoEl = document.getElementById('sync-info');
        if (infoEl) infoEl.textContent = `Последнее обновление: ${new Date().toLocaleTimeString()}`;
    }

    showUpdateIndicator(msg) {
        const infoEl = document.getElementById('sync-info');
        if (infoEl) {
            infoEl.innerHTML = `<span style="color:#58a6ff; font-weight:bold;">🔔 New changes detected:</span> ${msg}`;
            setTimeout(() => {
                if (infoEl.innerHTML.includes('New changes')) {
                    infoEl.textContent = `Последнее обновление: ${new Date().toLocaleTimeString()}`;
                }
            }, 10000);
        }
    }

    // === MANAGEMENT ACTIONS ===

    promptCreateRepo() {
        const name = prompt('Enter repository name:');
        if (name) this.createRepo(name);
    }

    async createRepo(name) {
        const res = await this.fetchApi('/user/repos', {
            method: 'POST',
            body: JSON.stringify({ name, auto_init: true })
        });
        if (res.isOk) {
            alert('Repo created!');
            await this.loadRepositories();
        } else alert('Error: ' + res.error);
    }

    promptCreateBranch() {
        const name = prompt('Enter branch name:');
        if (name) this.createBranch(name);
    }

    async createBranch(name) {
        if (!this.currentRepo) return;
        const repo = this.currentRepo.full_name;
        const base = await this.fetchApi(`/repos/${repo}/git/refs/heads/${this.currentRepo.default_branch}`);
        if (base.isOk) {
            const res = await this.fetchApi(`/repos/${repo}/git/refs`, {
                method: 'POST',
                body: JSON.stringify({ ref: `refs/heads/${name}`, sha: base.value.object.sha })
            });
            if (res.isOk) {
                alert('Branch created!');
                await this.loadRepoData();
            } else alert('Error: ' + res.error);
        }
    }

    promptCreateIssue() {
        const title = prompt('Issue title:');
        if (title) this.createIssue(title);
    }

    async createIssue(title) {
        if (!this.currentRepo) return;
        const res = await this.fetchApi(`/repos/${this.currentRepo.full_name}/issues`, {
            method: 'POST',
            body: JSON.stringify({ title })
        });
        if (res.isOk) {
            alert('Issue created!');
            await this.loadRepoData();
        }
    }

    async deleteCurrentRepo() {
        if (!this.currentRepo) return;
        const name = this.currentRepo.full_name;
        if (confirm(`DELETE ${name}? This cannot be undone!`)) {
            const res = await this.fetchApi(`/repos/${name}`, { method: 'DELETE' });
            if (res.isOk) {
                alert('Deleted');
                this.currentRepo = null;
                location.reload();
            } else alert('Error: ' + res.error);
        }
    }

    async updateRepoSetting(setting, value) {
        if (!this.currentRepo) return Result.Err('Repo not selected');
        try {
            const res = await this.fetchApi(`/repos/${this.currentRepo.full_name}`, {
                method: 'PATCH',
                body: JSON.stringify({ [setting]: value })
            });
            if (res.isOk) {
                this.currentRepo = res.value;
                alert('Настройка обновлена!');
                this.renderRepoInfo();
                return Result.Ok(res.value);
            } else {
                alert('Ошибка обновления: ' + res.error);
                return Result.Err(res.error);
            }
        } catch (e) {
            log.error('Error updating setting', e);
            return Result.Err(e.message);
        }
    }

    async runWorkflow(id) {
        if (!this.currentRepo) return;
        const res = await this.fetchApi(`/repos/${this.currentRepo.full_name}/actions/workflows/${id}/dispatches`, {
            method: 'POST',
            body: JSON.stringify({ ref: this.currentRepo.default_branch })
        });
        if (res.isOk) alert('Workflow dispatched!');
        else alert('Error: ' + res.error);
    }

    /**
     * Сохранить файл в репозиторий (применить изменения)
     */
    async saveFile(path, content, message = 'Update from Gitody') {
        if (!this.currentRepo) return Result.Err('Repo not selected');
        const repo = this.currentRepo.full_name;

        log.info(`Applying changes to ${path}...`);

        // Сначала пытаемся получить SHA существующего файла
        const currentFile = await this.fetchApi(`/repos/${repo}/contents/${path}`);

        const body = {
            message,
            content: btoa(unescape(encodeURIComponent(content))),
            branch: this.currentRepo.default_branch
        };

        if (currentFile.isOk) {
            body.sha = currentFile.value.sha;
        }

        const res = await this.fetchApi(`/repos/${repo}/contents/${path}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });

        if (res.isOk) {
            log.info('Changes applied successfully');
            await this.loadRepoData();
            return Result.Ok(res.value);
        } else {
            log.error('Failed to apply changes', res.error);
            return Result.Err(res.error);
        }
    }

    async mergePullRequest(number) {
        if (!this.currentRepo) return;
        if (!confirm(`Вы действительно хотите слить PR #${number}?`)) return;

        const res = await this.fetchApi(`/repos/${this.currentRepo.full_name}/pulls/${number}/merge`, {
            method: 'PUT',
            body: JSON.stringify({
                commit_title: `Merge PR #${number}`,
                merge_method: 'merge'
            })
        });

        if (res.isOk) {
            alert('Запрос на слияние выполнен!');
            await this.loadRepoData();
        } else {
            alert('Ошибка слияния: ' + res.error);
        }
    }

    async syncAll() {
        log.info('Полная синхронизация...');
        const infoEl = document.getElementById('sync-info');
        if (infoEl) infoEl.textContent = 'Синхронизация...';

        try {
            await this.loadRepositories();
            if (this.currentRepo) {
                await this.loadRepoData();
            }

            if (infoEl) {
                infoEl.textContent = `Последнее обновление: ${new Date().toLocaleTimeString()}`;
            }
            log.info('Синхронизация завершена');
            return Result.Ok(true);
        } catch (e) {
            log.error('Ошибка синхронизации', e);
            if (infoEl) infoEl.textContent = '❌ Ошибка обновления';
            return Result.Err(e.message);
        }
    }

    // === UI RENDERING ===

    updateReposList() {
        const el = document.getElementById('repoList');
        if (!el) return;
        el.innerHTML = this.repos.map(r => `
            <div class="sidebar-item ${this.currentRepo?.full_name === r.full_name ? 'active' : ''}" 
                 onclick="githubManager.selectRepo('${r.full_name}')">
                ${r.private ? '🔒' : '📁'} ${r.name}
            </div>
        `).join('');
    }

    updateCurrentRepoUI() {
        const title = document.getElementById('headerTitle');
        if (title && this.currentRepo) title.textContent = this.currentRepo.name;
        this.updateReposList();
    }

    renderBranches(list) {
        const el = document.getElementById('branchesList');
        if (el) el.innerHTML = list.map(b => `<div class="card">${b.name}</div>`).join('');
    }

    renderPRs(list) {
        const el = document.getElementById('prList');
        if (!el) return;
        el.innerHTML = list.map(p => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <b>#${p.number}</b> ${p.title} (${p.state})
                    <div style="font-size:11px; color:#8b949e">${p.user.login} • ${this.formatDate(p.created_at)}</div>
                </div>
                ${p.state === 'open' ? `<button class="btn btn-sm btn-primary" onclick="githubManager.mergePullRequest(${p.number})">Слить (Merge)</button>` : ''}
            </div>
        `).join('');
    }

    renderIssues(list) {
        const el = document.getElementById('issuesList');
        if (el) el.innerHTML = list.filter(i => !i.pull_request).map(i => `<div class="card">#${i.number} ${i.title}</div>`).join('');
    }

    renderCommits(list) {
        const el = document.getElementById('commitsList');
        if (el) el.innerHTML = list.map(c => `<div class="card"><code>${c.sha.slice(0, 7)}</code> ${c.commit.message}</div>`).join('');
    }

    renderReleases(list) {
        const el = document.getElementById('releasesList');
        if (el) el.innerHTML = list.map(r => `<div class="card"><b>${r.tag_name}</b> ${r.name || ''}</div>`).join('');
    }

    renderWorkflows(list) {
        const el = document.getElementById('actionsList');
        if (el) el.innerHTML = list.map(w => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                <span>${w.name}</span>
                <button class="btn btn-sm" onclick="githubManager.runWorkflow('${w.id}')">Run</button>
            </div>
        `).join('');
    }

    renderFileTree(list) {
        const el = document.getElementById('repoFileTree');
        if (!el) return;
        el.innerHTML = list.map(item => `
            <div class="tree-item" onclick="githubManager.${item.type === 'dir' ? 'toggleFolder' : 'previewFileContent'}('${item.path}')">
                ${item.type === 'dir' ? '📁' : '📄'} ${item.name}
            </div>
        `).join('');
    }

    async previewFileContent(path) {
        if (!this.currentRepo) return;
        const res = await this.fetchApi(`/repos/${this.currentRepo.full_name}/contents/${path}`);
        if (res.isOk && res.value.content) {
            const decoded = atob(res.value.content.replace(/\s/g, ''));
            const preview = document.getElementById('codePreview');
            const contentArea = document.getElementById('previewContent');
            if (preview && contentArea) {
                preview.style.display = 'block';
                document.getElementById('previewFileName').textContent = path;
                contentArea.value = decoded;
            }
        }
    }

    /**
     * Применить изменения из текстовой области просмотра
     */
    async applyEditedChanges() {
        const path = document.getElementById('previewFileName').textContent;
        const content = document.getElementById('previewContent').value;

        if (!path) return;

        const res = await this.saveFile(path, content);
        if (res.isOk) {
            alert('Изменения успешно применены к GitHub!');
            this.closePreview();
        } else {
            alert('Ошибка при применении изменений: ' + res.error);
        }
    }

    closePreview() {
        const preview = document.getElementById('codePreview');
        if (preview) preview.style.display = 'none';
    }

    async toggleFolder(path) {
        log.info(`Toggling folder: ${path}`);
        // Simple implementation - just reload for now
        const res = await this.fetchApi(`/repos/${this.currentRepo.full_name}/contents/${path}`);
        if (res.isOk) this.renderFileTree(res.value);
    }

    /**
     * Рендеринг подробной информации о репозитории (таб Information)
     */
    renderRepoInfo() {
        if (!this.currentRepo) return;
        const container = document.getElementById('repoInfoPage');
        if (!container) return;

        const repo = this.currentRepo;
        container.innerHTML = `
            <div class="repo-info-container" style="padding:20px; background: #161b22; border-radius: 12px; border: 1px solid #30363d;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
                    <div>
                        <h1 style="margin:0; font-size:24px; color:#58a6ff;">${repo.full_name}</h1>
                        <p style="color:#8b949e; margin:10px 0;">${repo.description || 'Нет описания'}</p>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-sm" onclick="githubManager.syncAll()">Refresh</button>
                        <a href="${repo.html_url}" target="_blank" class="btn btn-sm" style="background:#30363d;">View on GitHub</a>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:15px; margin-bottom:30px;">
                    <div class="card" style="text-align:center;">
                        <div style="font-size:20px; font-weight:bold; color:#d29922;">⭐ ${repo.stargazers_count}</div>
                        <div style="font-size:11px; color:#8b949e;">Stars</div>
                    </div>
                    <div class="card" style="text-align:center;">
                        <div style="font-size:20px; font-weight:bold; color:#58a6ff;">🍴 ${repo.forks_count}</div>
                        <div style="font-size:11px; color:#8b949e;">Forks</div>
                    </div>
                    <div class="card" style="text-align:center;">
                        <div style="font-size:20px; font-weight:bold; color:#3fb950;">👁️ ${repo.watchers_count}</div>
                        <div style="font-size:11px; color:#8b949e;">Watchers</div>
                    </div>
                    <div class="card" style="text-align:center;">
                        <div style="font-size:20px; font-weight:bold; color:#f85149;">❗ ${repo.open_issues_count}</div>
                        <div style="font-size:11px; color:#8b949e;">Issues</div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
                    <div class="settings-group">
                        <h3 style="font-size:14px; text-transform:uppercase; color:#8b949e; border-bottom:1px solid #30363d; padding-bottom:10px;">General Features</h3>
                        <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px;">
                            <label style="display:flex; justify-content:space-between; cursor:pointer;">
                                <span>Issues</span>
                                <input type="checkbox" ${repo.has_issues ? 'checked' : ''} onchange="githubManager.updateRepoSetting('has_issues', this.checked)">
                            </label>
                            <label style="display:flex; justify-content:space-between; cursor:pointer;">
                                <span>Wiki</span>
                                <input type="checkbox" ${repo.has_wiki ? 'checked' : ''} onchange="githubManager.updateRepoSetting('has_wiki', this.checked)">
                            </label>
                            <label style="display:flex; justify-content:space-between; cursor:pointer;">
                                <span>Projects</span>
                                <input type="checkbox" ${repo.has_projects ? 'checked' : ''} onchange="githubManager.updateRepoSetting('has_projects', this.checked)">
                            </label>
                            <label style="display:flex; justify-content:space-between; cursor:pointer;">
                                <span>Discussions</span>
                                <input type="checkbox" ${repo.has_discussions ? 'checked' : ''} onchange="githubManager.updateRepoSetting('has_discussions', this.checked)">
                            </label>
                        </div>
                    </div>
                    <div class="settings-group">
                        <h3 style="font-size:14px; text-transform:uppercase; color:#8b949e; border-bottom:1px solid #30363d; padding-bottom:10px;">Security & Analysis</h3>
                        <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px;">
                            <button class="btn btn-sm" onclick="githubManager.toggleDependabot()">Manage Dependabot</button>
                            <button class="btn btn-sm" onclick="githubManager.toggleSecretScanning()">Manage Secret Scanning</button>
                            <div style="font-size:11px; color:#8b949e; margin-top:5px;">
                                * Настройка Dependabot осуществляется через файл .github/dependabot.yml
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-top:30px;">
                    <h3 style="font-size:14px; text-transform:uppercase; color:#8b949e; border-bottom:1px solid #30363d; padding-bottom:10px;">Repository Topics</h3>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">
                        ${repo.topics?.map(t => `<span class="topic-tag" style="background:rgba(88,166,255,0.1); color:#58a6ff; padding:4px 10px; border-radius:12px; font-size:12px;">${t}</span>`).join('') || '<span style="color:#8b949e">Нет тем</span>'}
                        <button class="btn btn-sm" style="border-radius:12px;" onclick="githubManager.promptEditTopics()">Edit</button>
                    </div>
                </div>
            </div>
        `;
    }

    async toggleDependabot() {
        if (!this.currentRepo) return;
        const confirmMsg = "Хотите добавить/обновить конфигурацию Dependabot (.github/dependabot.yml)?";
        if (!confirm(confirmMsg)) return;

        const config = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"`;

        const res = await this.saveFile('.github/dependabot.yml', config, 'Configure Dependabot');
        if (res.isOk) alert('Dependabot сконфигурирован!');
    }

    async promptEditTopics() {
        if (!this.currentRepo) return;
        const currentTopics = this.currentRepo.topics?.join(', ') || '';
        const newTopics = prompt('Введите темы через запятую:', currentTopics);
        if (newTopics === null) return;

        const topics = newTopics.split(',').map(t => t.trim()).filter(Boolean);
        const res = await this.fetchApi(`/repos/${this.currentRepo.full_name}/topics`, {
            method: 'PUT',
            body: JSON.stringify({ names: topics })
        });

        if (res.isOk) {
            alert('Темы обновлены!');
            await this.selectRepo(this.currentRepo.full_name);
        }
    }

    async toggleSecretScanning() {
        alert('Для настройки расширенной безопасности (Secret Scanning) требуются права администратора организации или GitHub Enterprise.');
    }

    async importRepo() {
        const name = prompt('Введите название для нового репозитория:');
        if (!name) return;

        const res = await this.createRepo(name);
        if (res.isOk) {
            alert('Репозиторий создан! Теперь вы можете добавить в него файлы через вкладку Files -> Apply Changes.');
        }
    }
}

export const githubManager = new GitHubManager();
window.githubManager = githubManager;
