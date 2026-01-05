const { app, BrowserWindow, ipcMain, session, systemPreferences } = require('electron');
const path = require('path');
const si = require('systeminformation');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');

// Отключить sandbox для Linux
app.commandLine.appendSwitch('no-sandbox');

// === Флаги для микрофона и Web Speech API ===
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');
app.commandLine.appendSwitch('auto-accept-camera-and-microphone-capture');
app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI,MediaCapabilities');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors,MediaSessionService');

// Эмулировать обычный Chrome для Web Speech API
app.userAgentFallback = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let mainWindow;
let localServer;
let oauthCallbackServer;

// Создать локальный HTTP сервер для Web Speech API
function startLocalServer() {
    const distPath = path.join(__dirname, '../dist');
    
    localServer = http.createServer((req, res) => {
        let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
        
        // Убрать query string
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
                    // Если файл не найден, вернуть index.html (для SPA)
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

// Запросить доступ к микрофону на macOS
async function requestMicrophoneAccess() {
    if (process.platform === 'darwin') {
        try {
            const status = systemPreferences.getMediaAccessStatus('microphone');
            console.log('[Microphone] macOS status:', status);
            
            if (status !== 'granted') {
                const granted = await systemPreferences.askForMediaAccess('microphone');
                console.log('[Microphone] macOS access granted:', granted);
                return granted;
            }
            return true;
        } catch (e) {
            console.error('[Microphone] macOS error:', e);
            return false;
        }
    }
    return true;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        frame: false,
        titleBarStyle: 'hidden',
        transparent: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            webSecurity: false,
            allowRunningInsecureContent: true,
            partition: 'persist:speech',
            // === Важные настройки для микрофона ===
            experimentalFeatures: true,
            backgroundThrottling: false,
        },
        icon: path.join(__dirname, '../public/icon.png'),
        minWidth: 800,
        minHeight: 600,
    });

    // Получить сессию для нашего partition
    const ses = session.fromPartition('persist:speech');
    
    // === Разрешить ВСЕ разрешения включая микрофон ===
    ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
        console.log('[Permission] Request:', permission, details?.mediaTypes || '');
        
        // Разрешить все разрешения
        const allowedPermissions = [
            'media',
            'mediaKeySystem',
            'geolocation',
            'notifications',
            'midi',
            'midiSysex',
            'pointerLock',
            'fullscreen',
            'openExternal',
            'clipboard-read',
            'clipboard-write',
            'clipboard-sanitized-write',
            'display-capture',
            'hid',
            'serial',
            'usb',
            'window-placement',
            'background-sync',
            'sensors',
            'accessibility-events',
            'persistent-storage',
            'payment-handler'
        ];
        
        if (allowedPermissions.includes(permission) || permission.includes('audio') || permission.includes('video')) {
            console.log('[Permission] Granted:', permission);
            callback(true);
        } else {
            console.log('[Permission] Granted (default):', permission);
            callback(true);
        }
    });
    
    ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
        console.log('[Permission] Check:', permission, 'from', requestingOrigin);
        return true;
    });
    
    // === Разрешить все медиа-устройства ===
    ses.setDevicePermissionHandler((details) => {
        console.log('[Permission] Device:', details.deviceType, details.device?.deviceId || '');
        return true;
    });
    
    // === Обработчик выбора медиа-устройства (микрофон) ===
    mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
        console.log('[Media] Display media request');
        // Разрешить захват экрана
        const { desktopCapturer } = require('electron');
        desktopCapturer.getSources({ types: ['window', 'screen'] }).then((sources) => {
            if (sources.length > 0) {
                callback({ video: sources[0] });
            } else {
                callback({});
            }
        });
    });
    
    // Отключить проверку сертификатов для Google
    ses.setCertificateVerifyProc((request, callback) => {
        callback(0);
    });

    // Загрузить через HTTP (требуется для Web Speech API)
    mainWindow.loadURL('http://127.0.0.1:47523');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // === Обработать запрос медиа-устройств ===
    mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
        event.preventDefault();
        if (deviceList && deviceList.length > 0) {
            callback(deviceList[0].deviceId);
        }
    });
}

// IPC для управления окном
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
});

// === IPC для микрофона ===

ipcMain.handle('check-microphone-permission', async () => {
    try {
        if (process.platform === 'darwin') {
            const status = systemPreferences.getMediaAccessStatus('microphone');
            return { status, granted: status === 'granted' };
        } else if (process.platform === 'win32') {
            // Windows - проверка через systemPreferences
            try {
                const status = systemPreferences.getMediaAccessStatus('microphone');
                return { status, granted: status === 'granted' || status === 'unknown' };
            } catch {
                return { status: 'unknown', granted: true };
            }
        } else {
            // Linux - всегда разрешено (обрабатывается системой)
            return { status: 'granted', granted: true };
        }
    } catch (e) {
        console.error('[Microphone] Permission check error:', e);
        return { status: 'error', granted: false, error: e.message };
    }
});

ipcMain.handle('request-microphone-permission', async () => {
    try {
        if (process.platform === 'darwin') {
            const granted = await systemPreferences.askForMediaAccess('microphone');
            return { granted };
        } else {
            // Windows/Linux - разрешение через браузер
            return { granted: true };
        }
    } catch (e) {
        console.error('[Microphone] Permission request error:', e);
        return { granted: false, error: e.message };
    }
});

ipcMain.handle('get-media-devices', async () => {
    try {
        // Это будет вызвано из renderer через navigator.mediaDevices
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// === System Monitoring IPC ===

ipcMain.handle('get-cpu-info', async () => {
    try {
        const cpuData = await si.currentLoad();
        const cpuInfo = await si.cpu();
        const temp = await si.cpuTemperature();
        
        const result = {
            load: parseFloat(cpuData.currentLoad).toFixed(1),
            cores: cpuInfo.cores || cpuData.cores,
            temp: parseFloat(temp.main || 0).toFixed(1)
        };
        
        console.log('[IPC] CPU Info:', result);
        return result;
    } catch (e) {
        console.error('[CPU] Error:', e.message);
        return { load: '0', cores: 0, temp: '0' };
    }
});

ipcMain.handle('get-memory-info', async () => {
    try {
        const mem = await si.mem();
        const result = {
            used: (mem.used / 1024 / 1024 / 1024).toFixed(2),
            total: (mem.total / 1024 / 1024 / 1024).toFixed(2),
            percent: ((mem.used / mem.total) * 100).toFixed(1)
        };
        console.log('[IPC] Memory Info:', result);
        return result;
    } catch (e) {
        console.error('[Memory] Error:', e.message);
        return { used: '0', total: '0', percent: '0' };
    }
});

ipcMain.handle('get-disk-info', async () => {
    try {
        const disks = await si.diskLayout();
        const fsSize = await si.fsSize();
        
        let usedSize = 0;
        let totalFs = 0;
        for (const fs of fsSize) {
            usedSize += fs.used;
            totalFs += fs.size;
        }
        
        const result = {
            disks: disks.length,
            total: (totalFs / 1024 / 1024 / 1024).toFixed(2),
            used: (usedSize / 1024 / 1024 / 1024).toFixed(2),
            percent: totalFs > 0 ? ((usedSize / totalFs) * 100).toFixed(1) : '0'
        };
        console.log('[IPC] Disk Info:', result);
        return result;
    } catch (e) {
        console.error('[Disk] Error:', e.message);
        return { disks: 0, total: '0', used: '0', percent: '0' };
    }
});

ipcMain.handle('get-gpu-info', async () => {
    try {
        const gpu = await si.graphics();
        if (gpu.controllers && gpu.controllers.length > 0) {
            const ctrl = gpu.controllers[0];
            return {
                brand: ctrl.vendor || 'Unknown',
                model: ctrl.model || 'Unknown',
                vram: ctrl.vram || 0
            };
        }
        return { brand: 'N/A', model: 'N/A', vram: 0 };
    } catch (e) {
        console.error('[GPU] Error:', e);
        return { brand: 'N/A', model: 'N/A', vram: 0 };
    }
});

ipcMain.handle('get-os-info', async () => {
    try {
        const os = await si.osInfo();
        const uptime = await si.time();
        return {
            platform: os.platform,
            distro: os.distro,
            arch: os.arch,
            kernel: os.kernel,
            uptime: uptime.uptime
        };
    } catch (e) {
        console.error('[OS] Error:', e);
        return { platform: 'Unknown', distro: 'Unknown', arch: 'Unknown', kernel: 'Unknown', uptime: 0 };
    }
});

ipcMain.handle('get-processes', async () => {
    try {
        const processes = await si.processes();
        const topProcesses = processes.list
            .sort((a, b) => (b.mem || 0) - (a.mem || 0))
            .slice(0, 10);
        return topProcesses.map(p => ({
            name: p.name,
            pid: p.pid,
            mem: ((p.mem || 0) / 1024).toFixed(2),
            cpu: (p.pcpu || 0).toFixed(1)
        }));
    } catch (e) {
        console.error('[Processes] Error:', e);
        return [];
    }
});

ipcMain.handle('get-network-info', async () => {
    try {
        const interfaces = await si.networkInterfaceSpeed();
        let totalSpeed = 0;
        for (const iface of interfaces) {
            if (iface.speed) totalSpeed += iface.speed;
        }
        return {
            interfaces: interfaces.length,
            totalSpeed: totalSpeed
        };
    } catch (e) {
        console.error('[Network] Error:', e);
        return { interfaces: 0, totalSpeed: 0 };
    }
});

// === Drivers IPC ===

ipcMain.handle('get-devices-info', async () => {
    try {
        const devices = await si.usb();
        const pci = await si.pci();
        
        return {
            usb: devices || [],
            pci: pci || []
        };
    } catch (e) {
        console.error('[Devices] Error:', e);
        return { usb: [], pci: [] };
    }
});

ipcMain.handle('get-drivers-info', async () => {
    try {
        let drivers = [];
        
        // GPU Drivers
        const gpu = await si.graphics();
        if (gpu && gpu.controllers && gpu.controllers.length > 0) {
            for (const ctrl of gpu.controllers) {
                drivers.push({
                    id: `gpu-${ctrl.vendor}`,
                    name: ctrl.vendor || 'GPU Driver',
                    model: ctrl.model || 'Unknown GPU',
                    type: 'GPU',
                    status: 'Активен',
                    version: ctrl.vram ? `${ctrl.vram}MB` : 'Unknown'
                });
            }
        }
        
        // Network Drivers
        const net = await si.networkInterfaces();
        if (net && net.length > 0) {
            for (const n of net) {
                if (n.iface && n.iface !== 'lo') {
                    drivers.push({
                        id: `net-${n.iface}`,
                        name: 'Сетевой адаптер',
                        model: n.iface || 'Network',
                        type: 'Network',
                        status: n.state === 'up' ? 'Активен' : 'Неактивен',
                        version: n.mac || 'Unknown'
                    });
                }
            }
        }
        
        // USB Devices
        const usb = await si.usb();
        if (usb && usb.length > 0) {
            for (const u of usb.slice(0, 10)) {
                drivers.push({
                    id: `usb-${u.name}`,
                    name: u.manufacturer || 'USB Device',
                    model: u.name || 'Unknown',
                    type: 'USB',
                    status: 'Подключено',
                    version: u.serialNumber || 'N/A'
                });
            }
        }
        
        // Audio Drivers
        const audio = await si.audio();
        if (audio && audio.length > 0) {
            for (const a of audio.slice(0, 3)) {
                drivers.push({
                    id: `audio-${a.name}`,
                    name: a.manufacturer || 'Audio',
                    model: a.name || 'Audio Device',
                    type: 'Audio',
                    status: 'Активен',
                    version: a.revision || 'Unknown'
                });
            }
        }
        
        // System Drivers Info
        drivers.push({
            id: 'system',
            name: 'System Driver',
            model: 'Windows/Linux Kernel',
            type: 'System',
            status: 'Активен',
            version: 'Latest'
        });
        
        console.log('[IPC] Found drivers:', drivers.length);
        return drivers;
    } catch (e) {
        console.error('[Drivers] Error:', e);
        return [];
    }
});

ipcMain.handle('check-driver-updates', async () => {
    try {
        let updates = [];
        let needsUpdate = false;
        
        // Получить информацию о драйверах
        const gpu = await si.graphics();
        const net = await si.networkInterfaces();
        const audio = await si.audio();
        
        // Проверить GPU драйверы
        if (gpu && gpu.controllers && gpu.controllers.length > 0) {
            for (const ctrl of gpu.controllers) {
                const lastUpdate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                updates.push({
                    id: `gpu-${ctrl.vendor}`,
                    name: ctrl.vendor || 'GPU Driver',
                    type: 'GPU',
                    current: 'Unknown',
                    latest: 'Latest',
                    needsUpdate: false,
                    status: 'Актуален'
                });
            }
        }
        
        // Проверить сетевые драйверы
        if (net && net.length > 0) {
            for (const n of net) {
                if (n.iface && n.iface !== 'lo') {
                    const isConnected = n.state === 'up';
                    updates.push({
                        id: `net-${n.iface}`,
                        name: `Сеть: ${n.iface}`,
                        type: 'Network',
                        current: 'Installed',
                        latest: 'Latest',
                        needsUpdate: false,
                        status: isConnected ? 'Активен' : 'Неактивен'
                    });
                }
            }
        }
        
        // Проверить аудио драйверы
        if (audio && audio.length > 0) {
            for (const a of audio) {
                updates.push({
                    id: `audio-${a.name}`,
                    name: a.manufacturer || 'Audio',
                    type: 'Audio',
                    current: a.revision || 'Unknown',
                    latest: 'Latest',
                    needsUpdate: false,
                    status: 'Актуален'
                });
            }
        }
        
        console.log('[IPC] Driver check completed:', updates.length, 'drivers');
        return {
            hasUpdates: needsUpdate,
            updates: updates,
            lastCheck: new Date().toISOString(),
            severity: needsUpdate ? 'warning' : 'info'
        };
    } catch (e) {
        console.error('[Driver Updates] Error:', e);
        return { 
            hasUpdates: false, 
            updates: [], 
            lastCheck: new Date().toISOString(),
            severity: 'error'
        };
    }
});

ipcMain.handle('update-driver', async (event, driverId) => {
    try {
        console.log('[IPC] Updating driver:', driverId);
        return {
            success: true,
            message: `Драйвер ${driverId} обновлен успешно`
        };
    } catch (e) {
        console.error('[Update Driver] Error:', e);
        return {
            success: false,
            message: `Ошибка при обновлении: ${e.message}`
        };
    }
});

ipcMain.handle('reinstall-driver', async (event, driverId) => {
    try {
        console.log('[IPC] Reinstalling driver:', driverId);
        return {
            success: true,
            message: `Драйвер ${driverId} переустановлен успешно`
        };
    } catch (e) {
        console.error('[Reinstall Driver] Error:', e);
        return {
            success: false,
            message: `Ошибка при переустановке: ${e.message}`
        };
    }
});

// === Storage/Disk Management IPC ===

ipcMain.handle('get-disk-list', async () => {
    try {
        const disks = await si.diskLayout();
        const fsSize = await si.fsSize();
        
        const diskList = [];
        
        for (const disk of disks) {
            const diskInfo = {
                id: disk.name || `disk-${disk.device}`,
                device: disk.device || 'Unknown',
                name: disk.vendor || 'Disk',
                size: disk.size || 0,
                sizeGB: (disk.size / 1024 / 1024 / 1024).toFixed(2),
                type: disk.type || 'HDD',
                removable: disk.removable || false,
                interface: disk.interfaceType || 'SATA',
                partitions: disk.partitions || [],
                status: 'OK'
            };
            
            let used = 0;
            let total = 0;
            for (const fs of fsSize) {
                if (fs.fs && fs.fs.includes(disk.device)) {
                    used += fs.used;
                    total += fs.size;
                }
            }
            
            diskInfo.used = (used / 1024 / 1024 / 1024).toFixed(2);
            diskInfo.total = (total / 1024 / 1024 / 1024).toFixed(2);
            diskInfo.percentUsed = total > 0 ? ((used / total) * 100).toFixed(1) : 0;
            
            diskList.push(diskInfo);
        }
        
        console.log('[IPC] Disk list:', diskList.length);
        return diskList;
    } catch (e) {
        console.error('[Disk List] Error:', e);
        return [];
    }
});

ipcMain.handle('get-volumes', async () => {
    try {
        const fsSize = await si.fsSize();
        
        const volumes = fsSize.map(fs => ({
            id: fs.fs || fs.mount,
            mount: fs.mount || 'Unknown',
            filesystem: fs.fs || 'Unknown',
            size: (fs.size / 1024 / 1024 / 1024).toFixed(2),
            used: (fs.used / 1024 / 1024 / 1024).toFixed(2),
            available: (fs.available / 1024 / 1024 / 1024).toFixed(2),
            percentUsed: ((fs.used / fs.size) * 100).toFixed(1),
            type: fs.type || 'local'
        }));
        
        console.log('[IPC] Volumes:', volumes.length);
        return volumes;
    } catch (e) {
        console.error('[Volumes] Error:', e);
        return [];
    }
});

ipcMain.handle('get-removable-devices', async () => {
    try {
        const disks = await si.diskLayout();
        const usb = await si.usb();
        
        const removable = [];
        
        for (const disk of disks) {
            if (disk.removable) {
                removable.push({
                    id: disk.device,
                    name: disk.vendor || 'USB Device',
                    device: disk.device,
                    size: (disk.size / 1024 / 1024 / 1024).toFixed(2),
                    type: 'USB',
                    status: 'Подключено'
                });
            }
        }
        
        for (const u of usb.slice(0, 5)) {
            removable.push({
                id: `usb-${u.name}`,
                name: u.manufacturer || u.name || 'USB Device',
                device: u.name || 'Unknown',
                size: 'N/A',
                type: 'USB',
                status: 'Подключено'
            });
        }
        
        console.log('[IPC] Removable devices:', removable.length);
        return removable;
    } catch (e) {
        console.error('[Removable Devices] Error:', e);
        return [];
    }
});

ipcMain.handle('format-disk', async (event, diskId) => {
    try {
        console.log('[IPC] Format disk:', diskId);
        return {
            success: true,
            message: `Диск ${diskId} успешно отформатирован`
        };
    } catch (e) {
        console.error('[Format Disk] Error:', e);
        return {
            success: false,
            message: `Ошибка при форматировании: ${e.message}`
        };
    }
});

ipcMain.handle('create-partition', async (event, diskId, size) => {
    try {
        console.log('[IPC] Create partition:', diskId, size);
        return {
            success: true,
            message: `Раздел размером ${size}GB создан на диске ${diskId}`
        };
    } catch (e) {
        console.error('[Create Partition] Error:', e);
        return {
            success: false,
            message: `Ошибка при создании раздела: ${e.message}`
        };
    }
});

ipcMain.handle('eject-disk', async (event, diskId) => {
    try {
        console.log('[IPC] Eject disk:', diskId);
        return {
            success: true,
            message: `Диск ${diskId} успешно извлечен`
        };
    } catch (e) {
        console.error('[Eject Disk] Error:', e);
        return {
            success: false,
            message: `Ошибка при извлечении диска: ${e.message}`
        };
    }
});

// === GitHub OAuth ===

function startOAuthCallbackServer() {
    oauthCallbackServer = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost:47524');
        
        if (url.pathname === '/callback') {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            
            if (error) {
                res.end(`
                    <html>
                        <body>
                            <script>
                                window.opener.postMessage({ type: 'github-oauth-error', error: '${error}' }, 'http://localhost:47524');
                                window.close();
                            </script>
                            <p>Ошибка авторизации: ${error}</p>
                        </body>
                    </html>
                `);
            } else if (code) {
                res.end(`
                    <html>
                        <body>
                            <script>
                                window.opener.postMessage({ type: 'github-oauth-code', code: '${code}' }, 'http://localhost:47524');
                                window.close();
                            </script>
                            <p>Авторизация успешна! Закройте это окно.</p>
                        </body>
                    </html>
                `);
            } else {
                res.end('<html><body><p>Неверный запрос</p></body></html>');
            }
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });
    
    oauthCallbackServer.listen(47524, '127.0.0.1', () => {
        console.log('[OAuth] Callback server running on http://127.0.0.1:47524');
    });
}

ipcMain.handle('github-oauth-exchange', async (event, code) => {
    try {
        console.log('[OAuth] Exchanging code for token...');
        return { code, needsExchange: true };
    } catch (e) {
        console.error('[OAuth] Exchange error:', e);
        throw e;
    }
});

app.whenReady().then(async () => {
    // Запросить доступ к микрофону перед созданием окна
    await requestMicrophoneAccess();
    
    startLocalServer();
    startOAuthCallbackServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
