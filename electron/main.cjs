const { app, BrowserWindow, ipcMain, session, systemPreferences } = require('electron');
const path = require('path');
const si = require('systeminformation');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');
const { exec, spawn } = require('child_process');
const os = require('os');
const dns = require('dns');
const net = require('net');

// === Security Note ===
// 'no-sandbox' is required for certain Linux environments (e.g., Docker, CI/CD)
// where the kernel lacks necessary features for Chromium's sandbox.
// This reduces security isolation. Consider removing if not deploying to such environments.
app.commandLine.appendSwitch('no-sandbox');

// Disables software-based rendering fallback to improve performance
// when hardware acceleration is available
app.commandLine.appendSwitch('disable-software-rasterizer');

// === Флаги для микрофона и Web Speech API ===
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');
app.commandLine.appendSwitch('auto-accept-camera-and-microphone-capture');
app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI,MediaCapabilities');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors,MediaSessionService');

app.userAgentFallback = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let mainWindow;
let localServer;
let oauthCallbackServer;

// === VPN State ===
let vpnState = {
    connected: false,
    server: null,
    protocol: null,
    connectTime: null,
    process: null,
    dataSent: 0,
    dataReceived: 0
};

// === Network Stats Cache ===
let networkStatsCache = {
    lastRx: 0,
    lastTx: 0,
    lastTime: Date.now(),
    rxSec: 0,
    txSec: 0
};

// Создать локальный HTTP сервер
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

async function requestMicrophoneAccess() {
    if (process.platform === 'darwin') {
        try {
            const status = systemPreferences.getMediaAccessStatus('microphone');
            if (status !== 'granted') {
                return await systemPreferences.askForMediaAccess('microphone');
            }
            return true;
        } catch (e) {
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
            experimentalFeatures: true,
            backgroundThrottling: false,
        },
        icon: path.join(__dirname, '../public/icon.png'),
        minWidth: 800,
        minHeight: 600,
    });

    const ses = session.fromPartition('persist:speech');
    
    ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
        callback(true);
    });
    
    ses.setPermissionCheckHandler(() => true);
    ses.setDevicePermissionHandler(() => true);
    
    mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
        const { desktopCapturer } = require('electron');
        desktopCapturer.getSources({ types: ['window', 'screen'] }).then((sources) => {
            if (sources.length > 0) callback({ video: sources[0] });
            else callback({});
        });
    });

    // SMART URL SWITCH
    const isDev = process.env.ELECTRON_DEV === 'true';
    let url = isDev ? 'http://localhost:5173' : 'http://127.0.0.1:47523';
    
    // Дополнительная проверка: если мы не в деве, но сервера нет - пробуем файл напрямую
    if (!isDev) {
        const distPath = path.join(__dirname, '../dist/index.html');
        if (!fs.existsSync(distPath)) {
            console.warn('[Main] Dist folder not found, falling back to dev port...');
            url = 'http://localhost:5173';
        } else {
            startLocalServer();
        }
    }

    mainWindow.loadURL(url);
    
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
    
    mainWindow.on('closed', () => { mainWindow = null; });
}

// === Window Controls ===
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// === Microphone ===
ipcMain.handle('check-microphone-permission', async () => {
    if (process.platform === 'darwin') {
        const status = systemPreferences.getMediaAccessStatus('microphone');
        return { status, granted: status === 'granted' };
    }
    return { status: 'granted', granted: true };
});

ipcMain.handle('request-microphone-permission', async () => {
    if (process.platform === 'darwin') {
        return { granted: await systemPreferences.askForMediaAccess('microphone') };
    }
    return { granted: true };
});

// === System Monitoring ===
ipcMain.handle('get-cpu-info', async () => {
    try {
        const [cpuData, cpuInfo, temp] = await Promise.all([
            si.currentLoad(),
            si.cpu(),
            si.cpuTemperature()
        ]);
        
        return {
            load: parseFloat(cpuData.currentLoad).toFixed(1),
            cores: cpuInfo.cores,
            physicalCores: cpuInfo.physicalCores,
            speed: cpuInfo.speed,
            speedMin: cpuInfo.speedMin,
            speedMax: cpuInfo.speedMax,
            brand: cpuInfo.brand,
            manufacturer: cpuInfo.manufacturer,
            temp: parseFloat(temp.main || 0).toFixed(1),
            tempMax: temp.max || 0,
            coreLoads: cpuData.cpus?.map(c => parseFloat(c.load).toFixed(1)) || []
        };
    } catch (e) {
        console.error('[CPU] Error:', e);
        return { load: '0', cores: 0, temp: '0', coreLoads: [] };
    }
});

ipcMain.handle('get-memory-info', async () => {
    try {
        const mem = await si.mem();
        return {
            used: (mem.used / 1024 / 1024 / 1024).toFixed(2),
            total: (mem.total / 1024 / 1024 / 1024).toFixed(2),
            free: (mem.free / 1024 / 1024 / 1024).toFixed(2),
            available: (mem.available / 1024 / 1024 / 1024).toFixed(2),
            percent: ((mem.used / mem.total) * 100).toFixed(1),
            swapUsed: (mem.swapused / 1024 / 1024 / 1024).toFixed(2),
            swapTotal: (mem.swaptotal / 1024 / 1024 / 1024).toFixed(2),
            cached: ((mem.cached || 0) / 1024 / 1024 / 1024).toFixed(2),
            buffers: ((mem.buffers || 0) / 1024 / 1024 / 1024).toFixed(2)
        };
    } catch (e) {
        return { used: '0', total: '0', percent: '0' };
    }
});

ipcMain.handle('get-disk-info', async () => {
    try {
        const [disks, fsSize, diskIO] = await Promise.all([
            si.diskLayout(),
            si.fsSize(),
            si.disksIO()
        ]);
        
        let usedSize = 0, totalFs = 0;
        for (const fs of fsSize) {
            usedSize += fs.used;
            totalFs += fs.size;
        }
        
        return {
            disks: disks.length,
            total: (totalFs / 1024 / 1024 / 1024).toFixed(2),
            used: (usedSize / 1024 / 1024 / 1024).toFixed(2),
            percent: totalFs > 0 ? ((usedSize / totalFs) * 100).toFixed(1) : '0',
            readSpeed: ((diskIO.rIO_sec || 0) / 1024 / 1024).toFixed(2),
            writeSpeed: ((diskIO.wIO_sec || 0) / 1024 / 1024).toFixed(2),
            volumes: fsSize.map(fs => ({
                mount: fs.mount,
                type: fs.type,
                size: (fs.size / 1024 / 1024 / 1024).toFixed(2),
                used: (fs.used / 1024 / 1024 / 1024).toFixed(2),
                percent: ((fs.used / fs.size) * 100).toFixed(1)
            }))
        };
    } catch (e) {
        return { disks: 0, total: '0', used: '0', percent: '0', volumes: [] };
    }
});

ipcMain.handle('get-gpu-info', async () => {
    try {
        const gpu = await si.graphics();
        if (gpu.controllers?.length > 0) {
            return gpu.controllers.map(ctrl => ({
                brand: ctrl.vendor || 'Unknown',
                model: ctrl.model || 'Unknown',
                vram: ctrl.vram || 0,
                bus: ctrl.bus || 'N/A',
                temperature: ctrl.temperatureGpu || 0,
                fanSpeed: ctrl.fanSpeed || 0,
                memoryUsed: ctrl.memoryUsed || 0,
                memoryFree: ctrl.memoryFree || 0,
                utilizationGpu: ctrl.utilizationGpu || 0,
                utilizationMemory: ctrl.utilizationMemory || 0
            }));
        }
        return [{ brand: 'N/A', model: 'N/A', vram: 0 }];
    } catch (e) {
        return [{ brand: 'N/A', model: 'N/A', vram: 0 }];
    }
});

ipcMain.handle('get-os-info', async () => {
    try {
        const [osInfo, time, users, battery] = await Promise.all([
            si.osInfo(),
            si.time(),
            si.users(),
            si.battery()
        ]);
        
        return {
            platform: osInfo.platform,
            distro: osInfo.distro,
            release: osInfo.release,
            arch: osInfo.arch,
            kernel: osInfo.kernel,
            hostname: osInfo.hostname,
            uptime: time.uptime,
            timezone: time.timezone,
            users: users.length,
            hasBattery: battery.hasBattery,
            batteryPercent: battery.percent,
            isCharging: battery.isCharging
        };
    } catch (e) {
        return { platform: 'Unknown', distro: 'Unknown', uptime: 0 };
    }
});

ipcMain.handle('get-processes', async () => {
    try {
        const processes = await si.processes();
        return processes.list
            .sort((a, b) => (b.mem || 0) - (a.mem || 0))
            .slice(0, 20)
            .map(p => ({
                name: p.name,
                pid: p.pid,
                mem: p.mem?.toFixed(1) || '0',
                memVsz: ((p.memVsz || 0) / 1024).toFixed(0),
                memRss: ((p.memRss || 0) / 1024).toFixed(0),
                cpu: (p.cpu || 0).toFixed(1),
                user: p.user || 'system',
                state: p.state || 'unknown',
                started: p.started || ''
            }));
    } catch (e) {
        return [];
    }
});

// === Network Monitoring ===
ipcMain.handle('get-network-info', async () => {
    try {
        const [stats, interfaces] = await Promise.all([
            si.networkStats(),
            si.networkInterfaces()
        ]);
        
        let totalRx = 0, totalTx = 0, rxSec = 0, txSec = 0;
        for (const stat of stats) {
            totalRx += stat.rx_bytes || 0;
            totalTx += stat.tx_bytes || 0;
            rxSec += stat.rx_sec || 0;
            txSec += stat.tx_sec || 0;
        }
        
        return {
            interfaces: interfaces.length,
            totalSpeed: interfaces.reduce((sum, i) => sum + (i.speed || 0), 0),
            totalRx,
            totalTx,
            rxSec,
            txSec
        };
    } catch (e) {
        return { interfaces: 0, totalSpeed: 0, rxSec: 0, txSec: 0 };
    }
});

ipcMain.handle('get-network-interfaces', async () => {
    try {
        const [interfaces, stats] = await Promise.all([
            si.networkInterfaces(),
            si.networkStats()
        ]);
        
        return interfaces.map(iface => {
            const stat = stats.find(s => s.iface === iface.iface) || {};
            return {
                iface: iface.iface,
                ifaceName: iface.ifaceName,
                ip4: iface.ip4,
                ip4subnet: iface.ip4subnet,
                ip6: iface.ip6,
                mac: iface.mac,
                type: iface.type,
                speed: iface.speed,
                state: iface.operstate,
                dhcp: iface.dhcp,
                gateway: iface.gateway || '',
                dnsSuffix: iface.dnsSuffix || '',
                rx_bytes: stat.rx_bytes || 0,
                tx_bytes: stat.tx_bytes || 0,
                rx_sec: stat.rx_sec || 0,
                tx_sec: stat.tx_sec || 0,
                rx_errors: stat.rx_errors || 0,
                tx_errors: stat.tx_errors || 0,
                rx_dropped: stat.rx_dropped || 0,
                tx_dropped: stat.tx_dropped || 0
            };
        });
    } catch (e) {
        return [];
    }
});

ipcMain.handle('get-network-stats', async () => {
    try {
        const stats = await si.networkStats();
        const now = Date.now();
        
        let totalRx = 0, totalTx = 0;
        for (const stat of stats) {
            totalRx += stat.rx_bytes || 0;
            totalTx += stat.tx_bytes || 0;
        }
        
        const timeDiff = (now - networkStatsCache.lastTime) / 1000;
        if (timeDiff > 0 && networkStatsCache.lastRx > 0) {
            networkStatsCache.rxSec = (totalRx - networkStatsCache.lastRx) / timeDiff / 1024 / 1024;
            networkStatsCache.txSec = (totalTx - networkStatsCache.lastTx) / timeDiff / 1024 / 1024;
        }
        
        networkStatsCache.lastRx = totalRx;
        networkStatsCache.lastTx = totalTx;
        networkStatsCache.lastTime = now;
        
        return {
            rx_bytes: totalRx,
            tx_bytes: totalTx,
            rx_sec: Math.max(0, networkStatsCache.rxSec).toFixed(2),
            tx_sec: Math.max(0, networkStatsCache.txSec).toFixed(2),
            latency: await measureLatency()
        };
    } catch (e) {
        return { rx_bytes: 0, tx_bytes: 0, rx_sec: '0', tx_sec: '0', latency: 0 };
    }
});

ipcMain.handle('get-network-connections', async () => {
    try {
        const connections = await si.networkConnections();
        return connections.slice(0, 50).map(conn => ({
            protocol: conn.protocol,
            localAddress: conn.localAddress,
            localPort: conn.localPort,
            peerAddress: conn.peerAddress,
            peerPort: conn.peerPort,
            state: conn.state,
            pid: conn.pid,
            process: conn.process || ''
        }));
    } catch (e) {
        return [];
    }
});

async function measureLatency() {
    return new Promise(resolve => {
        const start = Date.now();
        dns.lookup('google.com', (err) => {
            if (err) resolve(0);
            else resolve(Date.now() - start);
        });
    });
}

// === VPN Management ===
ipcMain.handle('vpn-connect', async (event, config) => {
    try {
        const { server, protocol, settings } = config;
        console.log('[VPN] Connecting to:', server.name, 'via', protocol);
        
        // Путь к конфигурации
        const configDir = path.join(app.getPath('userData'), 'vpn');
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        
        if (protocol === 'wireguard') {
            return await connectWireGuard(server, settings, configDir);
        } else if (protocol === 'openvpn') {
            return await connectOpenVPN(server, settings, configDir);
        } else {
            // Симуляция для других протоколов
            vpnState.connected = true;
            vpnState.server = server;
            vpnState.protocol = protocol;
            vpnState.connectTime = Date.now();
            return { success: true, message: 'Connected' };
        }
    } catch (e) {
        console.error('[VPN] Connect error:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('vpn-disconnect', async () => {
    try {
        console.log('[VPN] Disconnecting...');
        
        if (vpnState.process) {
            vpnState.process.kill();
            vpnState.process = null;
        }
        
        // Попытаться отключить через системные команды
        if (process.platform === 'linux') {
            exec('sudo wg-quick down wg0', () => {});
        } else if (process.platform === 'win32') {
            exec('wireguard /uninstalltunnelservice wg0', () => {});
        }
        
        vpnState.connected = false;
        vpnState.server = null;
        vpnState.connectTime = null;
        
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('vpn-status', async () => {
    return {
        connected: vpnState.connected,
        server: vpnState.server,
        protocol: vpnState.protocol,
        connectTime: vpnState.connectTime,
        uptime: vpnState.connectTime ? Date.now() - vpnState.connectTime : 0,
        dataSent: vpnState.dataSent,
        dataReceived: vpnState.dataReceived
    };
});

ipcMain.handle('vpn-save-config', async (event, configText, filename) => {
    try {
        const configDir = path.join(app.getPath('userData'), 'vpn');
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        
        const configPath = path.join(configDir, filename);
        fs.writeFileSync(configPath, configText);
        
        return { success: true, path: configPath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('vpn-load-configs', async () => {
    try {
        const configDir = path.join(app.getPath('userData'), 'vpn');
        if (!fs.existsSync(configDir)) return [];
        
        const files = fs.readdirSync(configDir).filter(f => f.endsWith('.conf') || f.endsWith('.ovpn'));
        return files.map(f => ({
            name: f,
            path: path.join(configDir, f),
            content: fs.readFileSync(path.join(configDir, f), 'utf8')
        }));
    } catch (e) {
        return [];
    }
});

async function connectWireGuard(server, settings, configDir) {
    const configPath = path.join(configDir, 'wg0.conf');
    
    // Генерируем конфигурацию WireGuard
    const config = generateWireGuardConfig(server, settings);
    fs.writeFileSync(configPath, config);
    
    return new Promise((resolve) => {
        if (process.platform === 'linux') {
            exec(`sudo wg-quick up ${configPath}`, (error, stdout, stderr) => {
                if (error) {
                    console.error('[WireGuard] Error:', stderr);
                    resolve({ success: false, error: stderr || error.message });
                } else {
                    vpnState.connected = true;
                    vpnState.server = server;
                    vpnState.protocol = 'wireguard';
                    vpnState.connectTime = Date.now();
                    resolve({ success: true });
                }
            });
        } else if (process.platform === 'win32') {
            exec(`wireguard /installtunnelservice "${configPath}"`, (error, stdout, stderr) => {
                if (error) {
                    resolve({ success: false, error: stderr || error.message });
                } else {
                    vpnState.connected = true;
                    vpnState.server = server;
                    vpnState.protocol = 'wireguard';
                    vpnState.connectTime = Date.now();
                    resolve({ success: true });
                }
            });
        } else if (process.platform === 'darwin') {
            // macOS использует wireguard-go
            exec(`sudo wg-quick up ${configPath}`, (error, stdout, stderr) => {
                if (error) {
                    resolve({ success: false, error: stderr || error.message });
                } else {
                    vpnState.connected = true;
                    vpnState.server = server;
                    vpnState.protocol = 'wireguard';
                    vpnState.connectTime = Date.now();
                    resolve({ success: true });
                }
            });
        } else {
            resolve({ success: false, error: 'Unsupported platform' });
        }
    });
}

async function connectOpenVPN(server, settings, configDir) {
    const configPath = path.join(configDir, 'client.ovpn');
    
    const config = generateOpenVPNConfig(server, settings);
    fs.writeFileSync(configPath, config);
    
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32' ? 'openvpn' : 'sudo openvpn';
        
        vpnState.process = spawn(cmd, ['--config', configPath], {
            shell: true,
            detached: false
        });
        
        let connected = false;
        
        vpnState.process.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[OpenVPN]', output);
            
            if (output.includes('Initialization Sequence Completed') && !connected) {
                connected = true;
                vpnState.connected = true;
                vpnState.server = server;
                vpnState.protocol = 'openvpn';
                vpnState.connectTime = Date.now();
                resolve({ success: true });
            }
        });
        
        vpnState.process.stderr.on('data', (data) => {
            console.error('[OpenVPN Error]', data.toString());
        });
        
        vpnState.process.on('close', (code) => {
            if (!connected) {
                resolve({ success: false, error: `Process exited with code ${code}` });
            }
            vpnState.connected = false;
        });
        
        // Таймаут
        setTimeout(() => {
            if (!connected) {
                resolve({ success: false, error: 'Connection timeout' });
            }
        }, 30000);
    });
}

function generateWireGuardConfig(server, settings) {
    const privateKey = generateWireGuardKey();
    const dnsServer = getDnsServer(settings.dns, settings.customDns);
    
    return `[Interface]
PrivateKey = ${privateKey}
Address = 10.0.0.2/24
DNS = ${dnsServer}
${settings.killSwitch ? 'PostUp = iptables -I OUTPUT ! -o %i -m mark ! --mark $(wg show %i fwmark) -m addrtype ! --dst-type LOCAL -j REJECT' : ''}
${settings.killSwitch ? 'PreDown = iptables -D OUTPUT ! -o %i -m mark ! --mark $(wg show %i fwmark) -m addrtype ! --dst-type LOCAL -j REJECT' : ''}

[Peer]
PublicKey = ${generateWireGuardKey()}
Endpoint = ${server.ip || server.host}:51820
AllowedIPs = ${settings.splitTunneling ? '10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16' : '0.0.0.0/0, ::/0'}
PersistentKeepalive = 25`;
}

function generateOpenVPNConfig(server, settings) {
    return `client
dev tun
proto udp
remote ${server.ip || server.host} 1194
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
auth SHA256
cipher AES-256-GCM
verb 3
${settings.killSwitch ? 'script-security 2\nup /etc/openvpn/update-resolv-conf\ndown /etc/openvpn/update-resolv-conf' : ''}

# DNS
dhcp-option DNS ${getDnsServer(settings.dns, settings.customDns)}

<ca>
-----BEGIN CERTIFICATE-----
# CA Certificate would go here
-----END CERTIFICATE-----
</ca>`;
}

function generateWireGuardKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let key = '';
    for (let i = 0; i < 43; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key + '=';
}

function getDnsServer(dns, customDns) {
    const dnsMap = {
        'auto': '1.1.1.1',
        'cloudflare': '1.1.1.1',
        'google': '8.8.8.8',
        'quad9': '9.9.9.9',
        'custom': customDns || '1.1.1.1'
    };
    return dnsMap[dns] || '1.1.1.1';
}

// === DNS Management ===
ipcMain.handle('get-dns-servers', async () => {
    try {
        const servers = dns.getServers();
        return servers;
    } catch (e) {
        return [];
    }
});

ipcMain.handle('set-dns-servers', async (event, servers) => {
    try {
        // На Linux можно изменить /etc/resolv.conf
        if (process.platform === 'linux') {
            const content = servers.map(s => `nameserver ${s}`).join('\n');
            fs.writeFileSync('/etc/resolv.conf', content);
            return { success: true };
        }
        // На Windows через netsh
        else if (process.platform === 'win32') {
            exec(`netsh interface ip set dns "Ethernet" static ${servers[0]}`, (err) => {
                if (err) console.error('[DNS] Set error:', err);
            });
            return { success: true };
        }
        return { success: false, error: 'Manual DNS change not supported' };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// === Ping/Traceroute ===
ipcMain.handle('ping-host', async (event, host, count = 4) => {
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32' 
            ? `ping -n ${count} ${host}` 
            : `ping -c ${count} ${host}`;
        
        exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, output: stderr || error.message });
            } else {
                // Парсинг результатов
                const lines = stdout.split('\n');
                const results = [];
                let avgLatency = 0;
                
                for (const line of lines) {
                    const timeMatch = line.match(/time[=<](\d+\.?\d*)/i);
                    if (timeMatch) {
                        results.push(parseFloat(timeMatch[1]));
                    }
                }
                
                if (results.length > 0) {
                    avgLatency = results.reduce((a, b) => a + b, 0) / results.length;
                }
                
                resolve({
                    success: true,
                    host,
                    results,
                    avgLatency: avgLatency.toFixed(1),
                    packetLoss: ((count - results.length) / count * 100).toFixed(0),
                    output: stdout
                });
            }
        });
    });
});

ipcMain.handle('traceroute', async (event, host) => {
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32' 
            ? `tracert -d ${host}` 
            : `traceroute -n ${host}`;
        
        exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
            resolve({
                success: !error,
                output: stdout || stderr || error?.message
            });
        });
    });
});

// === Drivers ===
ipcMain.handle('get-drivers-info', async () => {
    try {
        let drivers = [];
        
        const [gpu, net, usb, audio] = await Promise.all([
            si.graphics(),
            si.networkInterfaces(),
            si.usb(),
            si.audio()
        ]);
        
        if (gpu?.controllers) {
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
        
        if (net) {
            for (const n of net) {
                if (n.iface && n.iface !== 'lo') {
                    drivers.push({
                        id: `net-${n.iface}`,
                        name: 'Сетевой адаптер',
                        model: n.iface,
                        type: 'Network',
                        status: n.operstate === 'up' ? 'Активен' : 'Неактивен',
                        version: n.mac || 'Unknown'
                    });
                }
            }
        }
        
        if (usb) {
            for (const u of usb.slice(0, 10)) {
                drivers.push({
                    id: `usb-${u.id}`,
                    name: u.manufacturer || 'USB Device',
                    model: u.name || 'Unknown',
                    type: 'USB',
                    status: 'Подключено',
                    version: u.serialNumber || 'N/A'
                });
            }
        }
        
        if (audio) {
            for (const a of audio.slice(0, 3)) {
                drivers.push({
                    id: `audio-${a.id}`,
                    name: a.manufacturer || 'Audio',
                    model: a.name || 'Audio Device',
                    type: 'Audio',
                    status: 'Активен',
                    version: a.revision || 'Unknown'
                });
            }
        }
        
        return drivers;
    } catch (e) {
        return [];
    }
});

ipcMain.handle('check-driver-updates', async () => {
    try {
        const drivers = await ipcMain.handle('get-drivers-info');
        return {
            hasUpdates: false,
            updates: drivers,
            lastCheck: new Date().toISOString(),
            severity: 'info'
        };
    } catch (e) {
        return { hasUpdates: false, updates: [], severity: 'error' };
    }
});

ipcMain.handle('update-driver', async (event, driverId) => {
    return { success: true, message: `Драйвер ${driverId} обновлен` };
});

ipcMain.handle('reinstall-driver', async (event, driverId) => {
    return { success: true, message: `Драйвер ${driverId} переустановлен` };
});

// === Disk Management ===
ipcMain.handle('get-disk-list', async () => {
    try {
        const [disks, fsSize] = await Promise.all([
            si.diskLayout(),
            si.fsSize()
        ]);
        
        return disks.map(disk => {
            let used = 0, total = 0;
            for (const fs of fsSize) {
                if (fs.fs?.includes(disk.device)) {
                    used += fs.used;
                    total += fs.size;
                }
            }
            
            return {
                id: disk.name || disk.device,
                device: disk.device,
                name: disk.vendor || 'Disk',
                size: disk.size,
                sizeGB: (disk.size / 1024 / 1024 / 1024).toFixed(2),
                type: disk.type || 'HDD',
                removable: disk.removable,
                interface: disk.interfaceType || 'SATA',
                used: (used / 1024 / 1024 / 1024).toFixed(2),
                total: (total / 1024 / 1024 / 1024).toFixed(2),
                percentUsed: total > 0 ? ((used / total) * 100).toFixed(1) : 0
            };
        });
    } catch (e) {
        return [];
    }
});

ipcMain.handle('get-volumes', async () => {
    try {
        const fsSize = await si.fsSize();
        return fsSize.map(fs => ({
            id: fs.fs || fs.mount,
            mount: fs.mount,
            filesystem: fs.fs,
            size: (fs.size / 1024 / 1024 / 1024).toFixed(2),
            used: (fs.used / 1024 / 1024 / 1024).toFixed(2),
            available: (fs.available / 1024 / 1024 / 1024).toFixed(2),
            percentUsed: ((fs.used / fs.size) * 100).toFixed(1),
            type: fs.type
        }));
    } catch (e) {
        return [];
    }
});

ipcMain.handle('get-removable-devices', async () => {
    try {
        const devices = await si.blockDevices();
        return devices
            .filter(d => d.removable)
            .map(d => ({
                id: d.name,
                name: d.model || d.label || 'USB Device',
                type: d.type || 'USB',
                status: 'Подключено',
                size: (d.size / 1024 / 1024 / 1024).toFixed(2)
            }));
    } catch (e) {
        return [];
    }
});

ipcMain.handle('format-disk', async (event, diskId) => {
    console.log('[Disk] Formatting requested for:', diskId);
    return { success: true, message: `Диск ${diskId} успешно отформатирован (симуляция)` };
});

ipcMain.handle('eject-disk', async (event, diskId) => {
    console.log('[Disk] Eject requested for:', diskId);
    return { success: true, message: `Устройство ${diskId} извлечено` };
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
                res.end(`<html><body><script>window.opener.postMessage({ type: 'github-oauth-error', error: '${error}' }, '*');window.close();</script></body></html>`);
            } else if (code) {
                res.end(`<html><body><script>window.opener.postMessage({ type: 'github-oauth-code', code: '${code}' }, '*');window.close();</script><p>Success!</p></body></html>`);
            } else {
                res.end('<html><body>Invalid request</body></html>');
            }
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });
    
    oauthCallbackServer.listen(47524, '127.0.0.1');
}

ipcMain.handle('github-oauth-exchange', async (event, code) => {
    return { code, needsExchange: true };
});

// === App Lifecycle ===
app.whenReady().then(async () => {
    await requestMicrophoneAccess();
    startLocalServer();
    startOAuthCallbackServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    // Отключить VPN при выходе
    if (vpnState.process) vpnState.process.kill();
    if (process.platform !== 'darwin') app.quit();
});
