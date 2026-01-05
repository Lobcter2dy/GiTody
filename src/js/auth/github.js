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
    }

    updateUI() {
        const avatar = document.getElementById('userAvatarBtn');
        if (avatar) {
            avatar.innerHTML = this.user?.avatar_url
                ? `<img src="${this.user.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
                : `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/></svg>`;
        }

        const info = document.getElementById('dropdownUserInfo');
        if (info) {
            info.innerHTML = this.user
                ? `<div class="dropdown-user-name">${this.user.name || this.user.login}</div><div class="dropdown-user-email">@${this.user.login}</div>`
                : `<div class="dropdown-user-name">Не авторизован</div><div class="dropdown-user-email">Подключите GitHub</div>`;
        }

        const check = document.getElementById('connectCheck');
        if (check) check.classList.toggle('visible', this.isConnected);

        const card = document.querySelector('.connect-card');
        const connectInfo = document.getElementById('connectInfo');
        
        if (card) card.classList.toggle('connected', this.isConnected);
        if (connectInfo) {
            if (this.user) {
                const scopesInfo = this.tokenScopes?.length 
                    ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">Права: ${this.tokenScopes.slice(0, 3).join(', ')}${this.tokenScopes.length > 3 ? '...' : ''}</div>`
                    : '';
                connectInfo.innerHTML = `
                    <div class="connect-title" style="color:#3fb950;">✓ Подключено</div>
                    <div class="connect-desc">
                        <img src="${this.user.avatar_url}" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;margin-right:10px;">
                        <strong>${this.user.login}</strong>
                    </div>
                    ${scopesInfo}
                `;
            } else {
                connectInfo.innerHTML = `
                    <div class="connect-title">Не подключено</div>
                    <div class="connect-desc">Подключите GitHub для работы с репозиториями</div>
                `;
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
