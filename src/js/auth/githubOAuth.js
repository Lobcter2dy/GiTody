/**
 * GitHub OAuth - Integration with external browser
 */

const GITHUB_CLIENT_ID = 'Iv1.8a61f9b3a7aba766';
const REDIRECT_URI = 'http://localhost:47524/callback';

export class GitHubOAuth {
    async authorize() {
        return new Promise((resolve, reject) => {
            const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=repo%20read:user%20user:email%20delete_repo&state=${Date.now()}`;

            // Open in external browser
            window.electronAPI?.openExternal(authUrl);

            let timeoutId;
            let resolved = false;

            // Listen for result from main process
            const resultHandler = async (event, data) => {
                if (resolved) return;
                
                if (data.type === 'success') {
                    resolved = true;
                    clearTimeout(timeoutId);
                    window.electronAPI?.removeListener('github-oauth-result', resultHandler);
                    try {
                        const token = await this.exchangeCodeForToken(data.code);
                        resolve(token);
                    } catch (e) { reject(e); }
                } else if (data.type === 'error') {
                    resolved = true;
                    clearTimeout(timeoutId);
                    window.electronAPI?.removeListener('github-oauth-result', resultHandler);
                    reject(new Error(data.error));
                }
            };

            window.electronAPI?.on('github-oauth-result', resultHandler);
            
            // Timeout after 5 minutes
            timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    window.electronAPI?.removeListener('github-oauth-result', resultHandler);
                    reject(new Error('Auth timeout'));
                }
            }, 300000);
        });
    }

    async exchangeCodeForToken(code) {
        return await window.ipcRenderer.invoke('github-oauth-exchange', code);
    }
}

export const githubOAuth = new GitHubOAuth();
