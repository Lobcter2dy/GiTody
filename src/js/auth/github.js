/**
 * GitHub Auth - Полноценная авторизация с OAuth и верификацией
 */

import { session } from '../storage/session.js';

const API = 'https://api.github.com';

class GitHubAuth {
    constructor() {
        this.user = session.getUser();
        this.isConnected = !!this.user && session.hasToken();
        this.tokenScopes = null; // Права доступа токена
        console.log('[Auth] Created, connected:', this.isConnected);
    }

    async init() {
        console.log('[Auth] Init...');
        
        // Если есть кэшированный пользователь - сразу показать
        if (this.user) {
            this.isConnected = true;
            this.updateUI();
            console.log('[Auth] Restored user:', this.user.login);
        }
        
        // Проверить токен в фоне с полной верификацией
        if (session.hasToken()) {
            await this.verifyToken();
        }
        
        return this.isConnected;
    }

    /**
     * Полная верификация токена с проверкой прав доступа
     */
    async verifyToken() {
        try {
            const token = session.getToken();
            if (!token) return false;

            // Проверить токен и получить информацию о пользователе
            const res = await fetch(`${API}/user`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!res.ok) {
                if (res.status === 401) {
                    // Токен невалидный - удалить
                    console.warn('[Auth] Token invalid, removing...');
                    session.logout();
                    this.user = null;
                    this.isConnected = false;
                    this.updateUI();
                    return false;
                }
                console.warn('[Auth] Token check failed:', res.status);
                return false;
            }

            // Получить права доступа из заголовков
            const scopes = res.headers.get('x-oauth-scopes') || res.headers.get('x-accepted-oauth-scopes') || '';
            this.tokenScopes = scopes.split(',').map(s => s.trim()).filter(Boolean);

            const user = await res.json();
            this.user = user;
            this.isConnected = true;
            session.setUser(user);
            this.updateUI();
            
            console.log('[Auth] Token verified, user:', user.login, 'scopes:', this.tokenScopes);
            
            // Проверить наличие необходимых прав
            this.checkRequiredScopes();
            
            return true;
        } catch (e) {
            console.warn('[Auth] Network error:', e.message);
            // Не удаляем токен при сетевой ошибке
            return false;
        }
    }

    /**
     * Проверить наличие необходимых прав доступа
     */
    checkRequiredScopes() {
        const required = ['repo', 'read:user', 'user:email'];
        const missing = required.filter(scope => !this.tokenScopes?.includes(scope));
        
        if (missing.length > 0) {
            console.warn('[Auth] Missing scopes:', missing);
            // Можно показать предупреждение пользователю
        }
    }

    /**
     * Подключение через Personal Access Token
     */
    async connect(token) {
        if (!token?.trim()) {
            return { success: false, error: 'Введите токен' };
        }
        
        const cleanToken = token.trim();
        
        try {
            const res = await fetch(`${API}/user`, {
                headers: {
                    'Authorization': `Bearer ${cleanToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    return { success: false, error: 'Неверный токен. Проверьте правильность токена.' };
                }
                if (res.status === 403) {
                    return { success: false, error: 'Доступ запрещён. Проверьте права токена.' };
                }
                return { success: false, error: `Ошибка ${res.status}: ${res.statusText}` };
            }

            // Получить права доступа
            const scopes = res.headers.get('x-oauth-scopes') || res.headers.get('x-accepted-oauth-scopes') || '';
            this.tokenScopes = scopes.split(',').map(s => s.trim()).filter(Boolean);

            const user = await res.json();
            
            // Проверить права
            const required = ['repo', 'read:user'];
            const missing = required.filter(scope => !this.tokenScopes.includes(scope));
            
            if (missing.length > 0) {
                return { 
                    success: false, 
                    error: `Недостаточно прав. Требуются: ${missing.join(', ')}. Проверьте настройки токена.` 
                };
            }
            
            // СОХРАНИТЬ
            session.setToken(cleanToken);
            session.setUser(user);
            
            this.user = user;
            this.isConnected = true;
            this.updateUI();
            
            console.log('[Auth] Connected:', user.login, 'scopes:', this.tokenScopes);
            
            return { success: true, user, scopes: this.tokenScopes };
        } catch (e) {
            console.error('[Auth] Connect error:', e);
            return { success: false, error: 'Ошибка сети. Проверьте подключение к интернету.' };
        }
    }

    /**
     * Подключение через OAuth (открыть окно авторизации)
     */
    async connectOAuth() {
        try {
            // Импортировать OAuth модуль динамически
            const { githubOAuth } = await import('./githubOAuth.js');
            
            // Запустить OAuth flow
            const result = await githubOAuth.authorize();
            
            // После получения кода - обменять на токен
            // В реальности это делается через backend, здесь используем упрощённую версию
            // Пользователь должен будет ввести токен вручную после OAuth
            
            return { success: true, message: 'OAuth авторизация успешна. Введите полученный токен.' };
        } catch (e) {
            console.error('[Auth] OAuth error:', e);
            return { success: false, error: e.message || 'Ошибка OAuth авторизации' };
        }
    }

    /**
     * Открыть страницу создания токена
     */
    openTokenPage() {
        const scopes = 'repo,read:user,user:email,delete_repo';
        const url = `https://github.com/settings/tokens/new?description=GITODY-${Date.now()}&scopes=${scopes}`;
        window.open(url, '_blank');
    }

    /**
     * Выйти из аккаунта
     */
    logout() {
        session.logout();
        this.user = null;
        this.isConnected = false;
        this.tokenScopes = null;
        this.updateUI();
        console.log('[Auth] Logged out');
    }

    /**
     * Обновить UI элементы
     */
    updateUI() {
        // Аватар
        const avatar = document.getElementById('userAvatarBtn');
        if (avatar) {
            avatar.innerHTML = this.user?.avatar_url
                ? `<img src="${this.user.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
                : `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/></svg>`;
        }

        // Dropdown
        const info = document.getElementById('dropdownUserInfo');
        if (info) {
            info.innerHTML = this.user
                ? `<div class="dropdown-user-name">${this.user.name || this.user.login}</div><div class="dropdown-user-email">@${this.user.login}</div>`
                : `<div class="dropdown-user-name">Не авторизован</div><div class="dropdown-user-email">Подключите GitHub</div>`;
        }

        // Галочка
        const check = document.getElementById('connectCheck');
        if (check) check.classList.toggle('visible', this.isConnected);

        // Панель подключения
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

    /**
     * Получить токен
     */
    getToken() { 
        return session.getToken(); 
    }

    /**
     * Получить пользователя
     */
    getUser() { 
        return this.user; 
    }

    /**
     * Получить права доступа токена
     */
    getScopes() {
        return this.tokenScopes || [];
    }

    /**
     * Проверить наличие права доступа
     */
    hasScope(scope) {
        return this.tokenScopes?.includes(scope) || false;
    }

    /**
     * Получить заголовки для API запросов
     */
    getHeaders() {
        const token = this.getToken();
        return {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }
}

export const githubAuth = new GitHubAuth();
window.githubAuth = githubAuth;
