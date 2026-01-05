const { app, BrowserWindow, ipcMain, session, shell, dialog } = require('electron');
const path = require('path');
const si = require('systeminformation');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');
const { exec } = require('child_process');

// Отключить sandbox для Linux
app.commandLine.appendSwitch('no-sandbox');

// Эмулировать обычный Chrome для Web Speech API
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.userAgentFallback = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let mainWindow;
let localServer;
let oauthCallbackServer;

// Создать локальный HTTP сервер для Web Speech API
function startLocalServer() {
    const distPath = path.join(__dirname, '../dist');
    
    localServer = http.createServer((req, res) => {
        let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
        filePath = filePath.split('?')[0];
        
        const ext = path.extname(filePath);
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
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    fs.readFile(path.join(distPath, 'index.html'), (e, c) => {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(c, 'utf-8');
                    });
                } else {
                    res.writeHead(500);
                    res.end('Server Error');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });
    
    localServer.listen(47523, '127.0.0.1', () => {
        console.log('[Server] Running on http://127.0.0.1:47523');
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            webSecurity: false,
            allowRunningInsecureContent: true,
            partition: 'persist:speech',
        },
        icon: path.join(__dirname, '../public/icon.png'),
        minWidth: 800,
        minHeight: 600,
    });

    const ses = session.fromPartition('persist:speech');
    ses.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
    ses.setPermissionCheckHandler(() => true);
    ses.setDevicePermissionHandler(() => true);
    ses.setCertificateVerifyProc((request, callback) => callback(0));

    mainWindow.loadURL('http://127.0.0.1:47523');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC Handlers
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// System Monitoring
ipcMain.handle('get-cpu-info', async () => {
    const cpuData = await si.currentLoad();
    const cpuInfo = await si.cpu();
    const temp = await si.cpuTemperature();
    return { load: parseFloat(cpuData.currentLoad).toFixed(1), cores: cpuInfo.cores, temp: parseFloat(temp.main || 0).toFixed(1) };
});

ipcMain.handle('get-memory-info', async () => {
    const mem = await si.mem();
    return { used: (mem.used / 1024**3).toFixed(2), total: (mem.total / 1024**3).toFixed(2), percent: ((mem.used / mem.total) * 100).toFixed(1) };
});

ipcMain.handle('get-disk-info', async () => {
    const fsSize = await si.fsSize();
    let used = 0, total = 0;
    fsSize.forEach(f => { used += f.used; total += f.size; });
    return { disks: fsSize.length, total: (total / 1024**3).toFixed(2), used: (used / 1024**3).toFixed(2), percent: ((used / total) * 100).toFixed(1) };
});

ipcMain.handle('get-gpu-info', async () => {
    const data = await si.graphics();
    const gpu = data.controllers[0] || {};
    return {
        brand: gpu.vendor || 'Unknown',
        model: gpu.model || 'Unknown',
        vram: gpu.vram || 0,
        utilization: gpu.utilizationGpu || 0
    };
});

ipcMain.handle('get-os-info', async () => {
    const os = await si.osInfo();
    const time = si.time();
    return {
        platform: os.platform,
        distro: os.distro,
        arch: os.arch,
        kernel: os.kernel,
        uptime: time.uptime
    };
});

ipcMain.handle('get-processes', async () => {
    const data = await si.processes();
    return data.list.slice(0, 20).map(p => ({
        name: p.name,
        pid: p.pid,
        cpu: p.cpu.toFixed(1),
        mem: (p.mem / 1024 / 1024).toFixed(1), // MB
        user: p.user
    }));
});

ipcMain.handle('get-network-info', async () => {
    const ifaces = await si.networkInterfaces();
    const stats = await si.networkStats();
    
    // Calculate total speed
    let rx = 0, tx = 0;
    stats.forEach(s => { rx += s.rx_sec; tx += s.tx_sec; });
    
    return {
        interfaces: ifaces.length,
        totalSpeed: ((rx + tx) / 1024 / 1024).toFixed(2), // Mbps
        details: ifaces.map(i => ({
            iface: i.iface,
            ip4: i.ip4,
            mac: i.mac,
            type: i.type,
            speed: i.speed
        })),
        traffic: {
            rx: (rx / 1024).toFixed(1), // KB/s
            tx: (tx / 1024).toFixed(1)
        }
    };
});

ipcMain.handle('get-drivers-info', async () => {
    // Simulated drivers check (real one requires complex OS-specific calls)
    return [];
});

// VPN Handlers
ipcMain.handle('vpn-command', async (event, { command, config }) => {
    return new Promise((resolve) => {
        // Check for wg-quick existence first
        exec('which wg-quick', (err) => {
            if (err) {
                resolve({ success: false, message: 'WireGuard tools (wg-quick) not found. Please install wireguard-tools.' });
                return;
            }
            
            // Simulation for safety unless explicit root permission logic is added
            // In a real production app, you'd use sudo/pkexec
            setTimeout(() => {
                resolve({ success: true, message: `[SIMULATION] Command '${command}' executed for ${config}` });
            }, 1000);
        });
    });
});

ipcMain.handle('save-vpn-config', async (event, { name, content }) => {
    const configPath = path.join(app.getPath('userData'), 'vpn', `${name}.conf`);
    try {
        await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
        await fs.promises.writeFile(configPath, content);
        return { success: true, path: configPath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// GitHub OAuth
function startOAuthCallbackServer() {
    oauthCallbackServer = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost:47524');
        if (url.pathname === '/callback') {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            
            if (error) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                if (mainWindow) mainWindow.webContents.send('github-oauth-result', { type: 'error', error });
                res.end('<h1 style="color:red">Ошибка авторизации</h1>');
            } else if (code) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                if (mainWindow) mainWindow.webContents.send('github-oauth-result', { type: 'success', code });
                res.end('<h1 style="color:green">✓ Успешно! Можете закрыть окно.</h1><script>setTimeout(()=>window.close(),2000)</script>');
            } else {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Bad Request: Missing code or error parameter');
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    });
    oauthCallbackServer.listen(47524, '127.0.0.1');
}

// Git & File System Operations
// File System Operations
ipcMain.handle('read-dir', async (event, dirPath) => {
    try {
        const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
        return dirents.map(dirent => ({
            name: dirent.name,
            type: dirent.isDirectory() ? 'dir' : 'file',
            path: path.join(dirPath, dirent.name)
        })).sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'dir' ? -1 : 1;
        });
    } catch (e) {
        throw e.message;
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        return await fs.promises.readFile(filePath, 'utf-8');
    } catch (e) {
        throw e.message;
    }
});

ipcMain.handle('dialog-open-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('git-clone', async (event, { url, targetPath, token }) => {
    return new Promise((resolve, reject) => {
        // Вставляем токен в URL для авторизации
        const authUrl = url.replace('https://', `https://x-access-token:${token}@`);
        
        exec(`git clone ${authUrl} "${targetPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Git clone error: ${error.message}`);
                reject(error.message);
                return;
            }
            resolve(stdout || stderr);
        });
    });
});

ipcMain.on('open-external-url', (event, url) => shell.openExternal(url));

ipcMain.handle('github-oauth-exchange', async (event, code) => {
    const CLIENT_ID = 'Iv1.8a61f9b3a7aba766';
    const CLIENT_SECRET = 'A1cfff789c17d5f118dd058facd054513ab66ef0';
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code });
        const options = { hostname: 'github.com', port: 443, path: '/login/oauth/access_token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json.access_token) resolve(json.access_token);
                    else reject(new Error(json.error_description || 'Auth failed'));
                } catch(e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
});

app.whenReady().then(() => {
    startLocalServer();
    startOAuthCallbackServer();
    createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
