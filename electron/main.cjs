const { app, BrowserWindow, ipcMain, session, shell } = require( 'electron' );
const path = require( 'path' );
const si = require( 'systeminformation' );
const http = require( 'http' );
const https = require( 'https' );
const fs = require( 'fs' );
const { URL } = require( 'url' );

// Отключить sandbox для Linux
app.commandLine.appendSwitch( 'no-sandbox' );

// Эмулировать обычный Chrome для Web Speech API
app.commandLine.appendSwitch( 'disable-features', 'OutOfBlinkCors' );
app.userAgentFallback = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let mainWindow;
let localServer;
let oauthCallbackServer;

// Создать локальный HTTP сервер для Web Speech API
function startLocalServer ()
{
    const distPath = path.join( __dirname, '../dist' );

    localServer = http.createServer( ( req, res ) =>
    {
        let filePath = path.join( distPath, req.url === '/' ? 'index.html' : req.url );
        filePath = filePath.split( '?' )[ 0 ];

        const ext = path.extname( filePath );
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2'
        };

        const contentType = mimeTypes[ ext ] || 'application/octet-stream';

        fs.readFile( filePath, ( err, content ) =>
        {
            if ( err )
            {
                if ( err.code === 'ENOENT' )
                {
                    fs.readFile( path.join( distPath, 'index.html' ), ( e, c ) =>
                    {
                        res.writeHead( 200, { 'Content-Type': 'text/html' } );
                        res.end( c, 'utf-8' );
                    } );
                } else
                {
                    res.writeHead( 500 );
                    res.end( 'Server Error' );
                }
            } else
            {
                res.writeHead( 200, { 'Content-Type': contentType } );
                res.end( content, 'utf-8' );
            }
        } );
    } );

    localServer.listen( 47523, '127.0.0.1', () =>
    {
        console.log( '[Server] Running on http://127.0.0.1:47523' );
    } );
}

function createWindow ()
{
    mainWindow = new BrowserWindow( {
        width: 1400,
        height: 900,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join( __dirname, 'preload.cjs' ),
            webSecurity: false,
            allowRunningInsecureContent: true,
            partition: 'persist:speech',
        },
        icon: path.join( __dirname, '../public/icon.png' ),
        minWidth: 800,
        minHeight: 600,
    } );

    const ses = session.fromPartition( 'persist:speech' );
    ses.setPermissionRequestHandler( ( webContents, permission, callback ) => callback( true ) );
    ses.setPermissionCheckHandler( () => true );
    ses.setDevicePermissionHandler( () => true );
    ses.setCertificateVerifyProc( ( request, callback ) => callback( 0 ) );

    mainWindow.loadURL( 'http://127.0.0.1:47523' );

    mainWindow.on( 'closed', () =>
    {
        mainWindow = null;
    } );
}

// IPC Handlers
ipcMain.on( 'window-minimize', () => mainWindow?.minimize() );
ipcMain.on( 'window-maximize', () =>
{
    if ( mainWindow?.isMaximized() ) mainWindow.unmaximize();
    else mainWindow?.maximize();
} );
ipcMain.on( 'window-close', () => mainWindow?.close() );

// System Monitoring
ipcMain.handle( 'get-cpu-info', async () =>
{
    try
    {
        const cpuData = await si.currentLoad();
        const cpuInfo = await si.cpu();
        const temp = await si.cpuTemperature();
        return { load: parseFloat( cpuData.currentLoad ).toFixed( 1 ), cores: cpuInfo.cores, temp: parseFloat( temp.main || 0 ).toFixed( 1 ) };
    } catch ( error )
    {
        console.error( '[IPC] get-cpu-info error:', error );
        return { load: '0.0', cores: 0, temp: '0.0', error: error.message };
    }
} );

ipcMain.handle( 'get-memory-info', async () =>
{
    try
    {
        const mem = await si.mem();
        const usedGB = ( mem.used / 1024 ** 3 ).toFixed( 2 );
        const totalGB = ( mem.total / 1024 ** 3 ).toFixed( 2 );
        const percent = mem.total > 0 ? ( ( mem.used / mem.total ) * 100 ).toFixed( 1 ) : '0.0';
        return { used: usedGB, total: totalGB, percent };
    } catch ( error )
    {
        console.error( '[IPC] get-memory-info error:', error );
        return { used: '0.00', total: '0.00', percent: '0.0', error: error.message };
    }
} );

ipcMain.handle( 'get-disk-info', async () =>
{
    try
    {
        const fsSize = await si.fsSize();
        let used = 0, total = 0;
        fsSize.forEach( f => { used += f.used; total += f.size; } );
        const totalGB = ( total / 1024 ** 3 ).toFixed( 2 );
        const usedGB = ( used / 1024 ** 3 ).toFixed( 2 );
        const percent = total > 0 ? ( ( used / total ) * 100 ).toFixed( 1 ) : '0.0';
        return { disks: fsSize.length, total: totalGB, used: usedGB, percent };
    } catch ( error )
    {
        console.error( '[IPC] get-disk-info error:', error );
        return { disks: 0, total: '0.00', used: '0.00', percent: '0.0', error: error.message };
    }
} );

// GitHub OAuth
function startOAuthCallbackServer ()
{
    oauthCallbackServer = http.createServer( ( req, res ) =>
    {
        const url = new URL( req.url, 'http://localhost:47524' );
        if ( url.pathname === '/callback' )
        {
            const code = url.searchParams.get( 'code' );
            const error = url.searchParams.get( 'error' );
            res.writeHead( 200, { 'Content-Type': 'text/html; charset=utf-8' } );
            if ( error )
            {
                if ( mainWindow ) mainWindow.webContents.send( 'github-oauth-result', { type: 'error', error } );
                res.end( '<h1 style="color:red">Ошибка авторизации</h1>' );
            } else if ( code )
            {
                if ( mainWindow ) mainWindow.webContents.send( 'github-oauth-result', { type: 'success', code } );
                res.end( '<h1 style="color:green">✓ Успешно! Можете закрыть окно.</h1><script>setTimeout(()=>window.close(),2000)</script>' );
            } else
            {
                // Fallback: neither error nor code present
                res.writeHead( 400, { 'Content-Type': 'text/html; charset=utf-8' } );
                res.end( '<h1 style="color:orange">Неверный запрос</h1><p>Отсутствуют необходимые параметры авторизации.</p>' );
            }
        } else
        {
            // Handle non-callback paths
            res.writeHead( 404, { 'Content-Type': 'text/html; charset=utf-8' } );
            res.end( '<h1>404 - Not Found</h1>' );
        }
    } );
    oauthCallbackServer.listen( 47524, '127.0.0.1' );
}

ipcMain.on( 'open-external-url', ( event, url ) => shell.openExternal( url ) );

// Expose CLIENT_ID to renderer (safe - CLIENT_ID is public, only SECRET must be protected)
ipcMain.handle( 'get-github-client-id', async () =>
{
    const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    if ( !CLIENT_ID )
    {
        throw new Error( 'GITHUB_CLIENT_ID environment variable not set' );
    }
    return CLIENT_ID;
} );

ipcMain.handle( 'github-oauth-exchange', async ( event, code ) =>
{
    // Load credentials from environment variables (secure)
    // Never hardcode secrets - violates project security rules
    const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

    if ( !CLIENT_ID || !CLIENT_SECRET )
    {
        return Promise.reject( new Error( 'GitHub OAuth credentials not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.' ) );
    }

    return new Promise( ( resolve, reject ) =>
    {
        const data = JSON.stringify( { client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code } );
        const options = { hostname: 'github.com', port: 443, path: '/login/oauth/access_token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } };
        const req = https.request( options, ( res ) =>
        {
            let body = '';
            res.on( 'data', chunk => body += chunk );
            res.on( 'end', () =>
            {
                try
                {
                    const json = JSON.parse( body );
                    if ( json.access_token ) resolve( json.access_token );
                    else reject( new Error( json.error_description || 'Auth failed' ) );
                } catch ( e ) { reject( e ); }
            } );
        } );
        req.on( 'error', reject );
        req.write( data );
        req.end();
    } );
} );

app.whenReady().then( () =>
{
    startLocalServer();
    startOAuthCallbackServer();
    createWindow();
} );

app.on( 'window-all-closed', () => { if ( process.platform !== 'darwin' ) app.quit(); } );
