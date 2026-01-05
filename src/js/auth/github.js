/**
 * GitHub Auth - Полноценная авторизация с улучшенной диагностикой
 */

import { session } from '../storage/session.js';

const API = 'https://api.github.com';

class GitHubAuth {
    constructor() {
        this.user = session.getUser();
        this.isConnected = !!this.user && session.hasToken();
        this.tokenScopes = null;
        console.log('[Auth] Создан, подключен:', this.isConnected);
    }

    async init() {
        console.log('[Auth] Инициализация...');

        if (this.user) {
            this.isConnected = true;
            this.updateUI();
            console.log('[Auth] Восстановлен пользователь:', this.user.login);
        }

        if (session.hasToken()) {
            console.log('[Auth] Проверка токена...');
            await this.verifyToken();
        }

        return this.isConnected;
    }

    async verifyToken() {
        try {
            const token = session.getToken();
            if (!token) {
                console.warn('[Auth] Нет токена');
                return false;
            }

            console.log('[Auth] Проверка токена:', token.substring(0, 10) + '...');

            const res = await fetch(`${API}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            console.log('[Auth] Ответ сервера:', res.status, res.statusText);

            if (!res.ok) {
                if (res.status === 401) {
                    console.error('[Auth] Токен невалиден!');
                    session.logout();
                    this.user = null;
                    this.isConnected = false;
                    this.updateUI();
                    return false;
                }
                console.warn('[Auth] Ошибка проверки:', res.status);
                return false;
            }

            const scopes = res.headers.get('x-oauth-scopes') || '';
            this.tokenScopes = scopes.split(',').map(s => s.trim()).filter(Boolean);
            console.log('[Auth] Права токена:', this.tokenScopes);

            const user = await res.json();
            this.user = user;
            this.isConnected = true;
            session.setUser(user);
            this.updateUI();

            console.log('[Auth] ✓ Токен валиден, пользователь:', user.login);
            return true;
        } catch (e) {
            console.error('[Auth] Ошибка сети:', e);
            return false;
        }
    }

    async connect(token) {
        console.log('[Auth] === НАЧАЛО ПОДКЛЮЧЕНИЯ ===');

        if (!token?.trim()) {
            console.error('[Auth] Пустой токен');
            return { success: false, error: 'Введите токен' };
        }

        const cleanToken = token.trim();
        console.log('[Auth] Токен:', cleanToken.substring(0, 15) + '... (длина: ' + cleanToken.length + ')');

        // Проверка формата токена
        if (cleanToken.startsWith('ghp_') && cleanToken.length < 40) {
            return { success: false, error: 'Токен слишком короткий. Проверьте, что скопировали полностью.' };
        }

        try {
            console.log('[Auth] Отправка запроса к GitHub API...');

            const res = await fetch(`${API}/user`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${cleanToken}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            console.log('[Auth] Ответ:', res.status, res.statusText);
            console.log('[Auth] Headers:', Object.fromEntries(res.headers.entries()));

            if (!res.ok) {
                let errorMsg = 'Ошибка подключения';

                if (res.status === 401) {
                    errorMsg = 'Неверный токен. Проверьте:\n\n1. Токен скопирован полностью\n2. Токен не удалён на GitHub\n3. Нет лишних пробелов';
                } else if (res.status === 403) {
                    errorMsg = 'Доступ запрещён. Проверьте права токена (repo, read:user)';
                } else if (res.status === 404) {
                    errorMsg = 'Неверный API endpoint. Обновите приложение.';
                } else {
                    errorMsg = `Ошибка ${res.status}: ${res.statusText}`;
                }

                console.error('[Auth] Ошибка:', errorMsg);
                return { success: false, error: errorMsg };
            }

            // Права доступа
            const scopes = res.headers.get('x-oauth-scopes') || '';
            this.tokenScopes = scopes.split(',').map(s => s.trim()).filter(Boolean);
            console.log('[Auth] Права:', this.tokenScopes);

            const user = await res.json();
            console.log('[Auth] Пользователь:', user.login, user.name);

            // Проверка обязательных прав
            const required = ['repo'];
            const hasRequired = required.every(scope => this.tokenScopes.includes(scope));

            if (!hasRequired && this.tokenScopes.length > 0) {
                const missing = required.filter(scope => !this.tokenScopes.includes(scope));
                console.warn('[Auth] Недостающие права:', missing);
                return {
                    success: false,
                    error: `Недостаточно прав. \n\nТребуется: ${missing.join(', ')}\nЕсть: ${this.tokenScopes.join(', ') || 'нет'}\n\nСоздайте новый токен с правами 'repo'.`
                };
            }

            // СОХРАНИТЬ
            console.log('[Auth] Сохранение токена и пользователя...');
            session.setToken(cleanToken);
            session.setUser(user);

            this.user = user;
            this.isConnected = true;
            this.updateUI();

            console.log('[Auth] === ✓ ПОДКЛЮЧЕНИЕ УСПЕШНО ===');
            console.log('[Auth] User:', user.login);
            console.log('[Auth] Scopes:', this.tokenScopes);

            // Проверка что токен реально сохранён
            setTimeout(() => {
                const saved = session.getToken();
                console.log('[Auth] Проверка сохранения:', saved ? '✓ OK' : '✗ ПРОБЛЕМА!');
            }, 100);

            return { success: true, user, scopes: this.tokenScopes };
        } catch (e) {
            console.error('[Auth] Ошибка сети:', e);
            return {
                success: false,
                error: 'Ошибка сети:\n\n' + e.message + '\n\nПроверьте интернет соединение.'
            };
        }
    }

    async connectOAuth() {
        try {
            const { githubOAuth } = await import('./githubOAuth.js');
            const result = await githubOAuth.authorize();
            return { success: true, message: 'OAuth авторизация успешна. Введите полученный токен.' };
        } catch (e) {
            console.error('[Auth] OAuth error:', e);
            return { success: false, error: e.message || 'Ошибка OAuth авторизации' };
        }
    }

    openTokenPage() {
        const scopes = 'repo,read:user,user:email,delete_repo,admin:repo_hook,admin:org_hook';
        const description = `GITODY-${Date.now()}`;
        const url = `https://github.com/settings/tokens/new?description=${encodeURIComponent(description)}&scopes=${scopes}`;
        console.log('[Auth] Открытие страницы создания токена:', url);
        window.open(url, '_blank');
    }

    logout() {
        console.log('[Auth] Выход...');
        session.logout();
        this.user = null;
        this.isConnected = false;
        this.tokenScopes = null;
        this.updateUI();
        console.log('[Auth] Вышли');
        location.reload(); // Перезагрузка для очистки всех данных в UI
    }

    updateUI() {
        const avatar = document.getElementById('userAvatarBtn');
        if (avatar && this.user) {
            avatar.innerHTML = `<img src="${this.user.avatar_url}" style="width:100%;height:100%;border-radius:50%;cursor:pointer;" onclick="showModal('profile')">`;
        }
        const check = document.getElementById('connectCheck');
        if (check) check.classList.toggle('visible', this.isConnected);

        if (this.isConnected && this.user) {
            this.renderProfile();
        }
    }

    renderProfile() {
        const container = document.getElementById('profileContent');
        if (!container || !this.user) return;

        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:25px; margin-bottom:30px;">
                <div style="position:relative;">
                    <img src="${this.user.avatar_url}" style="width:90px; height:90px; border-radius:50%; border:3px solid #30363d; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    <div style="position:absolute; bottom:5px; right:5px; width:15px; height:15px; background:#3fb950; border-radius:50%; border:2px solid #161b22;"></div>
                </div>
                <div>
                    <h2 style="margin:0; font-size:24px; color:#fff;">${this.user.login}</h2>
                    <p style="color:#8b949e; margin:5px 0; font-size:14px;">${this.user.email || 'Публичный email не указан'}</p>
                    <div style="display:flex; gap:15px; margin-top:10px; font-size:12px; color:#8b949e;">
                        <span><strong>${this.user.followers}</strong> followers</span>
                        <span><strong>${this.user.following}</strong> following</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-field">
                <label class="profile-label">Отображаемое имя</label>
                <input type="text" id="prof-name" class="profile-input" value="${this.user.name || ''}" placeholder="Ваше имя">
            </div>
            
            <div class="profile-field">
                <label class="profile-label">О себе (Bio)</label>
                <textarea id="prof-bio" class="profile-input" style="height:80px; resize:none;" placeholder="Краткая информация о вас">${this.user.bio || ''}</textarea>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="profile-field">
                    <label class="profile-label">Местоположение</label>
                    <input type="text" id="prof-location" class="profile-input" value="${this.user.location || ''}" placeholder="Город, страна">
                </div>
                <div class="profile-field">
                    <label class="profile-label">Сайт</label>
                    <input type="text" id="prof-blog" class="profile-input" value="${this.user.blog || ''}" placeholder="https://...">
                </div>
            </div>
            
            <div style="display:flex; gap:12px; margin-top:25px;">
                <button class="btn btn-primary" style="flex:2; background:#238636;" onclick="githubAuth.updateProfile()">💾 Сохранить изменения</button>
                <button class="btn" style="flex:1; background:#30363d; color:#c9d1d9;" onclick="closeModal('profile')">Отмена</button>
            </div>
            
            <div id="profileStatus" style="margin-top:15px; text-align:center; font-size:12px; height:15px; font-weight:500;"></div>
        `;
    }

    async updateProfile() {
        const statusEl = document.getElementById('profileStatus');
        if (statusEl) {
            statusEl.textContent = '⏳ Синхронизация с GitHub...';
            statusEl.style.color = '#58a6ff';
        }

        const data = {
            name: document.getElementById('prof-name').value,
            bio: document.getElementById('prof-bio').value,
            location: document.getElementById('prof-location').value,
            blog: document.getElementById('prof-blog').value
        };

        try {
            const token = session.getToken();
            const res = await fetch(`${API}/user`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github+json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                this.user = await res.json();
                session.setUser(this.user);
                this.updateUI();
                if (statusEl) {
                    statusEl.textContent = '✅ Профиль успешно обновлен на GitHub!';
                    statusEl.style.color = '#3fb950';
                    setTimeout(() => statusEl.textContent = '', 4000);
                }
            } else {
                const err = await res.json();
                throw new Error(err.message);
            }
        } catch (e) {
            if (statusEl) {
                statusEl.textContent = '❌ Ошибка: ' + e.message;
                statusEl.style.color = '#f85149';
            }
        }
    }

    getToken() { return session.getToken(); }
    getUser() { return this.user; }
    getScopes() { return this.tokenScopes || []; }
    hasScope(scope) { return this.tokenScopes?.includes(scope) || false; }

    getHeaders() {
        const token = this.getToken();
        return {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }
}

export const githubAuth = new GitHubAuth();
window.githubAuth = githubAuth;
