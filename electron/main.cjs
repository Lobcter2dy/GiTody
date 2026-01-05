const { app, BrowserWindow, ipcMain, session, shell } = require( 'electron' );
const path = require( 'path' );
const si = require( 'systeminformation' );
const http = require( 'http' );
const https = require( 'https' );
const fs = require( 'fs' );
const { URL } = require( 'url' );

/**
 * Logger utility with consistent formatting (main process).
 * Avoid using raw console.* directly in app code.
 */
function createLogger ( moduleName )
{
    function format ( level, message )
    {
        const timestamp = new Date().toISOString();
        return `[${ timestamp }] [${ moduleName }] [${ level }] ${ message }`;
    }

    return {
        info: ( message, context = null ) =>
        {
            // eslint-disable-next-line no-console
            console.log( format( 'INFO', message ), context || '' );
        },
        warn: ( message, context = null ) =>
        {
            // eslint-disable-next-line no-console
            console.warn( format( 'WARN', message ), context || '' );
        },
        error: ( message, context = null ) =>
        {
            // eslint-disable-next-line no-console
            console.error( format( 'ERROR', message ), context || '' );
        },
    };
}

const log = createLogger( 'Main' );

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
        log.info( '[Server] Running on http://127.0.0.1:47523' );
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
        log.error( '[IPC:get-cpu-info] Error', { error: error?.message || String( error ) } );
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
        log.error( '[IPC:get-memory-info] Error', { error: error?.message || String( error ) } );
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
        log.error( '[IPC:get-disk-info] Error', { error: error?.message || String( error ) } );
        return { disks: 0, total: '0.00', used: '0.00', percent: '0.0', error: error.message };
    }
} );

ipcMain.handle( 'get-gpu-info', async () =>
{
    try
    {
        const graphics = await si.graphics();
        const controller = graphics?.controllers?.[ 0 ] || null;

        return {
            brand: controller?.vendor || controller?.brand || 'Unknown',
            model: controller?.model || controller?.name || 'Unknown',
            vram: Number( controller?.vram || controller?.vramDynamic || 0 ) || 0,
        };
    } catch ( error )
    {
        log.error( '[IPC:get-gpu-info] Error', { error: error?.message || String( error ) } );
        return { brand: 'Unknown', model: 'Unknown', vram: 0, error: error.message };
    }
} );

ipcMain.handle( 'get-os-info', async () =>
{
    try
    {
        const [ osInfo, time ] = await Promise.all( [ si.osInfo(), si.time() ] );
        return {
            platform: osInfo?.platform || process.platform,
            distro: osInfo?.distro || osInfo?.codename || 'Unknown',
            arch: osInfo?.arch || process.arch,
            kernel: osInfo?.kernel || 'Unknown',
            uptime: Number( time?.uptime || 0 ) || 0,
        };
    } catch ( error )
    {
        log.error( '[IPC:get-os-info] Error', { error: error?.message || String( error ) } );
        return { platform: process.platform, distro: 'Unknown', arch: process.arch, kernel: 'Unknown', uptime: 0, error: error.message };
    }
} );

ipcMain.handle( 'get-processes', async () =>
{
    try
    {
        const procs = await si.processes();
        const list = Array.isArray( procs?.list ) ? procs.list : [];

        const top = list
            .slice()
            .sort( ( a, b ) => ( Number( b?.memRss || b?.mem_rss || 0 ) - Number( a?.memRss || a?.mem_rss || 0 ) ) )
            .slice( 0, 10 )
            .map( p =>
            {
                const memBytes = Number( p?.memRss || p?.mem_rss || 0 ) || 0;
                return {
                    pid: Number( p?.pid || 0 ) || 0,
                    name: p?.name || p?.command || 'unknown',
                    mem: Math.round( memBytes / 1024 / 1024 ),
                };
            } );

        return top;
    } catch ( error )
    {
        log.error( '[IPC:get-processes] Error', { error: error?.message || String( error ) } );
        return [];
    }
} );

ipcMain.handle( 'get-network-info', async () =>
{
    try
    {
        const [ ifaces, stats ] = await Promise.all( [ si.networkInterfaces(), si.networkStats() ] );
        const ifaceCount = Array.isArray( ifaces ) ? ifaces.length : 0;
        const statList = Array.isArray( stats ) ? stats : [];

        const totalBytesPerSec = statList.reduce( ( sum, s ) =>
        {
            const rx = Number( s?.rx_sec || 0 ) || 0;
            const tx = Number( s?.tx_sec || 0 ) || 0;
            return sum + rx + tx;
        }, 0 );

        const totalMbps = ( totalBytesPerSec * 8 ) / 1_000_000;

        return { interfaces: ifaceCount, totalSpeed: totalMbps.toFixed( 1 ) };
    } catch ( error )
    {
        log.error( '[IPC:get-network-info] Error', { error: error?.message || String( error ) } );
        return { interfaces: 0, totalSpeed: '0.0', error: error.message };
    }
} );

async function buildDriversInfo ()
{
    const drivers = [];

    const results = await Promise.allSettled( [
        si.graphics(),
        si.diskLayout(),
        si.networkInterfaces(),
        si.audio(),
        si.osInfo(),
    ] );

    const [ graphicsRes, diskRes, netRes, audioRes, osRes ] = results;

    const graphics = graphicsRes.status === 'fulfilled' ? graphicsRes.value : null;
    const disks = diskRes.status === 'fulfilled' ? diskRes.value : null;
    const nets = netRes.status === 'fulfilled' ? netRes.value : null;
    const audios = audioRes.status === 'fulfilled' ? audioRes.value : null;
    const osInfo = osRes.status === 'fulfilled' ? osRes.value : null;

    if ( graphics?.controllers?.length )
    {
        for ( const c of graphics.controllers )
        {
            drivers.push( {
                id: `gpu:${ c.vendor || 'unknown' }:${ c.model || c.name || 'unknown' }`,
                name: c.model || c.name || 'GPU',
                model: c.vendor || c.brand || '',
                type: 'GPU',
                status: 'Актуален',
                version: c.driverVersion || c.driver || '',
                needsUpdate: false,
            } );
        }
    }

    if ( Array.isArray( disks ) && disks.length )
    {
        for ( const d of disks )
        {
            drivers.push( {
                id: `disk:${ d.device || d.name || 'unknown' }`,
                name: d.name || d.device || 'Disk',
                model: d.vendor || '',
                type: 'Disk',
                status: d.smartStatus === 'Ok' ? 'Актуален' : 'Внимание',
                version: d.firmwareRevision || '',
                needsUpdate: false,
            } );
        }
    }

    if ( Array.isArray( nets ) && nets.length )
    {
        for ( const n of nets )
        {
            drivers.push( {
                id: `net:${ n.iface || n.name || 'unknown' }`,
                name: n.ifaceName || n.iface || n.name || 'Network',
                model: n.ip4 || n.ip6 || '',
                type: 'Network',
                status: n.operstate === 'up' ? 'Актуален' : 'Неактивен',
                version: '',
                needsUpdate: false,
            } );
        }
    }

    if ( Array.isArray( audios ) && audios.length )
    {
        for ( const a of audios )
        {
            drivers.push( {
                id: `audio:${ a.id || a.name || 'unknown' }`,
                name: a.name || 'Audio',
                model: a.manufacturer || '',
                type: 'Audio',
                status: 'Актуален',
                version: '',
                needsUpdate: false,
            } );
        }
    }

    if ( osInfo )
    {
        drivers.push( {
            id: `os:${ osInfo.platform || process.platform }`,
            name: `${ osInfo.distro || 'OS' }`,
            model: osInfo.kernel || '',
            type: 'OS',
            status: 'Актуален',
            version: osInfo.release || '',
            needsUpdate: false,
        } );
    }

    return drivers;
}

ipcMain.handle( 'get-drivers-info', async () =>
{
    try
    {
        return await buildDriversInfo();
    } catch ( error )
    {
        log.error( '[IPC:get-drivers-info] Error', { error: error?.message || String( error ) } );
        return [];
    }
} );

ipcMain.handle( 'check-driver-updates', async () =>
{
    try
    {
        const updates = await buildDriversInfo();
        return { hasUpdates: false, updates };
    } catch ( error )
    {
        log.error( '[IPC:check-driver-updates] Error', { error: error?.message || String( error ) } );
        return { hasUpdates: false, updates: [], error: error.message };
    }
} );

// Driver maintenance actions (disabled by default for safety)
ipcMain.handle( 'update-driver', async ( event, driverId ) =>
{
    log.warn( '[IPC:update-driver] Blocked', { driverId } );
    return { success: false, message: 'Обновление драйверов отключено в этой сборке (безопасность).' };
} );

ipcMain.handle( 'reinstall-driver', async ( event, driverId ) =>
{
    log.warn( '[IPC:reinstall-driver] Blocked', { driverId } );
    return { success: false, message: 'Переустановка драйверов отключена в этой сборке (безопасность).' };
} );

async function getBlockDevicesSafe ()
{
    try
    {
        // Available on most platforms; may fail depending on permissions
        return await si.blockDevices();
    } catch ( error )
    {
        log.warn( '[IPC:blockDevices] Unavailable', { error: error?.message || String( error ) } );
        return null;
    }
}

ipcMain.handle( 'get-volumes', async () =>
{
    try
    {
        const fsSize = await si.fsSize();
        return ( Array.isArray( fsSize ) ? fsSize : [] ).map( v =>
        {
            const sizeGB = ( Number( v.size || 0 ) / 1024 ** 3 ).toFixed( 2 );
            const usedGB = ( Number( v.used || 0 ) / 1024 ** 3 ).toFixed( 2 );
            const percentUsed = ( Number( v.use || 0 ) ).toFixed( 1 );
            return {
                mount: v.mount || v.fs || 'N/A',
                filesystem: v.type || 'N/A',
                used: usedGB,
                size: sizeGB,
                percentUsed,
            };
        } );
    } catch ( error )
    {
        log.error( '[IPC:get-volumes] Error', { error: error?.message || String( error ) } );
        return [];
    }
} );

ipcMain.handle( 'get-disk-list', async () =>
{
    try
    {
        const [ blockDevices, fsSize ] = await Promise.all( [ getBlockDevicesSafe(), si.fsSize() ] );
        const fsList = Array.isArray( fsSize ) ? fsSize : [];

        const devices = Array.isArray( blockDevices ) ? blockDevices : [];
        const disks = devices
            .filter( d => d && ( d.type === 'disk' || d.physical === 'physical' || d.name?.startsWith?.( '/dev/' ) ) )
            .map( d =>
            {
                const mount = d.mount || null;
                const vol = mount ? fsList.find( v => v.mount === mount ) : null;

                const sizeBytes = vol ? Number( vol.size || 0 ) : Number( d.size || 0 );
                const usedBytes = vol ? Number( vol.used || 0 ) : 0;
                const percent = vol ? Number( vol.use || 0 ) : ( sizeBytes > 0 ? ( usedBytes / sizeBytes ) * 100 : 0 );

                return {
                    id: d.uuid || d.name || d.device || String( d?.id || '' ) || 'unknown',
                    name: d.model || d.label || d.name || 'Disk',
                    device: d.name || d.device || 'N/A',
                    type: d.type || 'disk',
                    interface: d.protocol || d.tran || d.interfaceType || 'N/A',
                    used: ( usedBytes / 1024 ** 3 ).toFixed( 2 ),
                    sizeGB: ( sizeBytes / 1024 ** 3 ).toFixed( 2 ),
                    percentUsed: Number.isFinite( percent ) ? percent.toFixed( 1 ) : '0.0',
                };
            } );

        return disks;
    } catch ( error )
    {
        log.error( '[IPC:get-disk-list] Error', { error: error?.message || String( error ) } );
        return [];
    }
} );

ipcMain.handle( 'get-removable-devices', async () =>
{
    try
    {
        const blockDevices = await getBlockDevicesSafe();
        const devices = Array.isArray( blockDevices ) ? blockDevices : [];

        const removable = devices.filter( d => d && ( d.removable === true || d.type === 'usb' || d.type === 'removable' ) );

        return removable.map( d =>
        {
            const sizeGB = d.size ? ( Number( d.size ) / 1024 ** 3 ).toFixed( 2 ) : 'N/A';
            return {
                id: d.uuid || d.name || d.device || 'unknown',
                name: d.model || d.label || d.name || 'Removable',
                type: d.type || 'removable',
                status: d.mount ? 'Смонтирован' : 'Подключен',
                size: sizeGB,
            };
        } );
    } catch ( error )
    {
        log.error( '[IPC:get-removable-devices] Error', { error: error?.message || String( error ) } );
        return [];
    }
} );

// Disk destructive actions (disabled by default for safety)
ipcMain.handle( 'format-disk', async ( event, diskId ) =>
{
    log.warn( '[IPC:format-disk] Blocked', { diskId } );
    return { success: false, message: 'Форматирование диска отключено в этой сборке (безопасность).' };
} );

ipcMain.handle( 'eject-disk', async ( event, diskId ) =>
{
    log.warn( '[IPC:eject-disk] Blocked', { diskId } );
    return { success: false, message: 'Извлечение диска отключено в этой сборке (безопасность).' };
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
            if ( error )
            {
                res.writeHead( 200, { 'Content-Type': 'text/html; charset=utf-8' } );
                if ( mainWindow ) mainWindow.webContents.send( 'github-oauth-result', { type: 'error', error } );
                res.end( '<h1 style="color:red">Ошибка авторизации</h1>' );
            } else if ( code )
            {
                res.writeHead( 200, { 'Content-Type': 'text/html; charset=utf-8' } );
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
