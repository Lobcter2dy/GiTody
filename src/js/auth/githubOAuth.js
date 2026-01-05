/**
 * GitHub OAuth - Integration with external browser
 */

// CLIENT_ID must come from environment or config - never hardcode
// For frontend, we need to get it from the main process via IPC
const REDIRECT_URI = 'http://localhost:47524/callback';

export class GitHubOAuth
{
    async getClientId ()
    {
        // Get CLIENT_ID from main process (reads from environment variables)
        try
        {
            return await window.ipcRenderer.invoke( 'get-github-client-id' );
        } catch ( error )
        {
            throw new Error( 'GitHub OAuth not configured. GITHUB_CLIENT_ID environment variable is required.' );
        }
    }

    async authorize ()
    {
        const CLIENT_ID = await this.getClientId();
        return new Promise( ( resolve, reject ) =>
        {
            const authUrl = `https://github.com/login/oauth/authorize?client_id=${ CLIENT_ID }&redirect_uri=${ encodeURIComponent( REDIRECT_URI ) }&scope=repo%20read:user%20user:email%20delete_repo%20workflow&state=${ Date.now() }`;

            // Open in external browser
            window.electronAPI?.openExternal( authUrl );

            // Listen for result from main process
            const resultHandler = async ( event, data ) =>
            {
                if ( data.type === 'success' )
                {
                    window.electronAPI?.removeListener( 'github-oauth-result', resultHandler );
                    try
                    {
                        const token = await this.exchangeCodeForToken( data.code );
                        resolve( token );
                    } catch ( e ) { reject( e ); }
                } else if ( data.type === 'error' )
                {
                    window.electronAPI?.removeListener( 'github-oauth-result', resultHandler );
                    reject( new Error( data.error ) );
                }
            };

            window.electronAPI?.on( 'github-oauth-result', resultHandler );

            // Timeout after 5 minutes
            setTimeout( () =>
            {
                window.electronAPI?.removeListener( 'github-oauth-result', resultHandler );
                reject( new Error( 'Auth timeout' ) );
            }, 300000 );
        } );
    }

    async exchangeCodeForToken ( code )
    {
        return await window.ipcRenderer.invoke( 'github-oauth-exchange', code );
    }
}

export const githubOAuth = new GitHubOAuth();
