/**
 * GitHub OAuth - Полноценная авторизация через OAuth
 */

const GITHUB_CLIENT_ID = 'Iv1.8a61f9b3a7aba766'; // Публичный ID (можно использовать)
const GITHUB_CLIENT_SECRET = ''; // Не нужен для public OAuth
const REDIRECT_URI = 'http://localhost:47524/callback';

class GitHubOAuth {
    constructor() {
        this.authWindow = null;
        this.authPromise = null;
    }

    /**
     * Запустить OAuth flow
     */
    async authorize() {
        return new Promise((resolve, reject) => {
            // Если уже есть открытое окно - закрыть
            if (this.authWindow) {
                this.authWindow.close();
            }

            const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=repo%20read:user%20user:email%20delete_repo&state=${Date.now()}`;

            // Создать окно авторизации
            this.authWindow = window.open(
                authUrl,
                'GitHub Authorization',
                'width=600,height=700,modal=yes'
            );

            // Слушать сообщения от окна авторизации
            const messageListener = (event) => {
                if (event.origin !== 'http://localhost:47524') return;

                if (event.data.type === 'github-oauth-success') {
                    window.removeEventListener('message', messageListener);
                    if (this.authWindow) {
                        this.authWindow.close();
                        this.authWindow = null;
                    }
                    resolve(event.data.token);
                } else if (event.data.type === 'github-oauth-error') {
                    window.removeEventListener('message', messageListener);
                    if (this.authWindow) {
                        this.authWindow.close();
                        this.authWindow = null;
                    }
                    reject(new Error(event.data.error));
                }
            };

            window.addEventListener('message', messageListener);

            // Проверка закрытия окна
            const checkClosed = setInterval(() => {
                if (this.authWindow?.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageListener);
                    reject(new Error('Авторизация отменена'));
                }
            }, 500);
        });
    }

    /**
     * Обменять код на токен (через IPC к Electron)
     */
    async exchangeCodeForToken(code) {
        try {
            // Вызвать IPC для обмена кода на токен
            const token = await window.ipcRenderer.invoke('github-oauth-exchange', code);
            return token;
        } catch (e) {
            console.error('[OAuth] Exchange error:', e);
            throw e;
        }
    }
}

export const githubOAuth = new GitHubOAuth();

