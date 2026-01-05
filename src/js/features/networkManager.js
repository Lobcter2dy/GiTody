/**
 * Network Manager - Мониторинг сети и VPN
 */

export class NetworkManager {
    constructor() {
        this.isMonitoring = false;
        this.monitorInterval = null;
        this.updateRate = 1000;
        this.vpnConnected = false;
        this.vpnConfig = null;
        this.networkHistory = {
            download: [],
            upload: [],
            maxLength: 60
        };
        this.lastBytes = { rx: 0, tx: 0 };
        this.vpnServers = [
            { id: 'auto', name: 'Автовыбор', country: 'AUTO', ping: 0 },
            { id: 'nl-1', name: 'Netherlands #1', country: 'NL', ip: '185.65.134.100', ping: 45 },
            { id: 'de-1', name: 'Germany #1', country: 'DE', ip: '89.163.140.88', ping: 52 },
            { id: 'us-1', name: 'USA East', country: 'US', ip: '209.141.56.70', ping: 120 },
            { id: 'us-2', name: 'USA West', country: 'US', ip: '45.33.32.156', ping: 150 },
            { id: 'uk-1', name: 'United Kingdom', country: 'UK', ip: '178.62.56.193', ping: 65 },
            { id: 'jp-1', name: 'Japan', country: 'JP', ip: '45.76.98.118', ping: 180 },
            { id: 'sg-1', name: 'Singapore', country: 'SG', ip: '139.59.224.115', ping: 160 },
            { id: 'ru-1', name: 'Russia Moscow', country: 'RU', ip: '185.22.232.100', ping: 35 }
        ];
        this.selectedServer = 'auto';
        this.vpnProtocol = 'wireguard';
        this.vpnSettings = {
            killSwitch: false,
            autoConnect: false,
            splitTunneling: false,
            dns: 'auto',
            customDns: '1.1.1.1'
        };
    }

    init() {
        console.log('[NetworkManager] Инициализация...');
        this.loadSettings();
        this.render();
        this.startMonitoring();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('vpnSettings');
            if (saved) {
                this.vpnSettings = { ...this.vpnSettings, ...JSON.parse(saved) };
            }
            const savedServer = localStorage.getItem('vpnSelectedServer');
            if (savedServer) this.selectedServer = savedServer;
            const savedProtocol = localStorage.getItem('vpnProtocol');
            if (savedProtocol) this.vpnProtocol = savedProtocol;
        } catch (e) {
            console.error('[NetworkManager] Load settings error:', e);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('vpnSettings', JSON.stringify(this.vpnSettings));
            localStorage.setItem('vpnSelectedServer', this.selectedServer);
            localStorage.setItem('vpnProtocol', this.vpnProtocol);
        } catch (e) {
            console.error('[NetworkManager] Save settings error:', e);
        }
    }

    render() {
        const container = document.getElementById('settings-network');
        if (!container) return;

        container.innerHTML = `
            <div class="network-manager">
                <!-- VPN Секция -->
                <div class="network-section vpn-section">
                    <div class="section-header">
                        <span class="section-title">VPN</span>
                        <div class="vpn-status ${this.vpnConnected ? 'connected' : 'disconnected'}">
                            <span class="status-dot"></span>
                            <span class="status-text">${this.vpnConnected ? 'Подключено' : 'Отключено'}</span>
                        </div>
                    </div>
                    
                    <div class="vpn-main-control">
                        <button class="vpn-toggle-btn ${this.vpnConnected ? 'active' : ''}" onclick="networkManager.toggleVPN()">
                            <div class="vpn-toggle-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                </svg>
                            </div>
                            <span>${this.vpnConnected ? 'Отключить' : 'Подключить'}</span>
                        </button>
                    </div>

                    <div class="vpn-server-select">
                        <label>Сервер</label>
                        <select id="vpnServerSelect" onchange="networkManager.selectServer(this.value)">
                            ${this.vpnServers.map(s => `
                                <option value="${s.id}" ${this.selectedServer === s.id ? 'selected' : ''}>
                                    ${s.country} - ${s.name} ${s.ping > 0 ? `(${s.ping}ms)` : ''}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="vpn-protocol-select">
                        <label>Протокол</label>
                        <div class="protocol-options">
                            <button class="protocol-btn ${this.vpnProtocol === 'wireguard' ? 'active' : ''}" onclick="networkManager.setProtocol('wireguard')">WireGuard</button>
                            <button class="protocol-btn ${this.vpnProtocol === 'openvpn' ? 'active' : ''}" onclick="networkManager.setProtocol('openvpn')">OpenVPN</button>
                            <button class="protocol-btn ${this.vpnProtocol === 'ikev2' ? 'active' : ''}" onclick="networkManager.setProtocol('ikev2')">IKEv2</button>
                        </div>
                    </div>

                    ${this.vpnConnected ? `
                        <div class="vpn-stats">
                            <div class="vpn-stat">
                                <span class="stat-label">IP адрес</span>
                                <span class="stat-value" id="vpnCurrentIP">${this.getSelectedServer()?.ip || '...'}</span>
                            </div>
                            <div class="vpn-stat">
                                <span class="stat-label">Время подключения</span>
                                <span class="stat-value" id="vpnUptime">00:00:00</span>
                            </div>
                            <div class="vpn-stat">
                                <span class="stat-label">Передано</span>
                                <span class="stat-value" id="vpnDataSent">0 MB</span>
                            </div>
                            <div class="vpn-stat">
                                <span class="stat-label">Получено</span>
                                <span class="stat-value" id="vpnDataReceived">0 MB</span>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Сетевой мониторинг -->
                <div class="network-section monitoring-section">
                    <div class="section-header">
                        <span class="section-title">Мониторинг сети</span>
                    </div>
                    
                    <div class="network-stats-grid">
                        <div class="network-stat-card download">
                            <div class="stat-icon">↓</div>
                            <div class="stat-info">
                                <span class="stat-value" id="netDownload">0.00</span>
                                <span class="stat-unit">MB/s</span>
                            </div>
                            <span class="stat-label">Загрузка</span>
                        </div>
                        <div class="network-stat-card upload">
                            <div class="stat-icon">↑</div>
                            <div class="stat-info">
                                <span class="stat-value" id="netUpload">0.00</span>
                                <span class="stat-unit">MB/s</span>
                            </div>
                            <span class="stat-label">Отдача</span>
                        </div>
                        <div class="network-stat-card latency">
                            <div class="stat-icon">⚡</div>
                            <div class="stat-info">
                                <span class="stat-value" id="netLatency">0</span>
                                <span class="stat-unit">ms</span>
                            </div>
                            <span class="stat-label">Пинг</span>
                        </div>
                        <div class="network-stat-card total">
                            <div class="stat-icon">∑</div>
                            <div class="stat-info">
                                <span class="stat-value" id="netTotal">0.00</span>
                                <span class="stat-unit">GB</span>
                            </div>
                            <span class="stat-label">Всего</span>
                        </div>
                    </div>

                    <div class="network-graph">
                        <canvas id="networkGraphCanvas" width="400" height="100"></canvas>
                    </div>
                </div>

                <!-- Сетевые интерфейсы -->
                <div class="network-section interfaces-section">
                    <div class="section-header">
                        <span class="section-title">Интерфейсы</span>
                        <button class="refresh-btn" onclick="networkManager.refreshInterfaces()">↻</button>
                    </div>
                    <div class="interfaces-list" id="interfacesList">
                        <div class="loading">Загрузка...</div>
                    </div>
                </div>

                <!-- VPN Настройки -->
                <div class="network-section vpn-settings-section">
                    <div class="section-header">
                        <span class="section-title">Настройки VPN</span>
                    </div>
                    
                    <div class="settings-list">
                        <div class="setting-item">
                            <div class="setting-info">
                                <span class="setting-name">Kill Switch</span>
                                <span class="setting-desc">Блокировать интернет при отключении VPN</span>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" ${this.vpnSettings.killSwitch ? 'checked' : ''} onchange="networkManager.setSetting('killSwitch', this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <span class="setting-name">Автоподключение</span>
                                <span class="setting-desc">Подключать VPN при запуске</span>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" ${this.vpnSettings.autoConnect ? 'checked' : ''} onchange="networkManager.setSetting('autoConnect', this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <span class="setting-name">Split Tunneling</span>
                                <span class="setting-desc">Направлять часть трафика мимо VPN</span>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" ${this.vpnSettings.splitTunneling ? 'checked' : ''} onchange="networkManager.setSetting('splitTunneling', this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <span class="setting-name">DNS</span>
                                <span class="setting-desc">Выбрать DNS сервер</span>
                            </div>
                            <select class="setting-select" onchange="networkManager.setSetting('dns', this.value)">
                                <option value="auto" ${this.vpnSettings.dns === 'auto' ? 'selected' : ''}>Авто</option>
                                <option value="cloudflare" ${this.vpnSettings.dns === 'cloudflare' ? 'selected' : ''}>Cloudflare (1.1.1.1)</option>
                                <option value="google" ${this.vpnSettings.dns === 'google' ? 'selected' : ''}>Google (8.8.8.8)</option>
                                <option value="quad9" ${this.vpnSettings.dns === 'quad9' ? 'selected' : ''}>Quad9 (9.9.9.9)</option>
                                <option value="custom" ${this.vpnSettings.dns === 'custom' ? 'selected' : ''}>Кастомный</option>
                            </select>
                        </div>
                        
                        ${this.vpnSettings.dns === 'custom' ? `
                            <div class="setting-item">
                                <div class="setting-info">
                                    <span class="setting-name">Кастомный DNS</span>
                                </div>
                                <input type="text" class="setting-input" value="${this.vpnSettings.customDns}" 
                                    onchange="networkManager.setSetting('customDns', this.value)" placeholder="1.1.1.1">
                            </div>
                        ` : ''}
                    </div>

                    <!-- Импорт конфигурации -->
                    <div class="vpn-config-section">
                        <div class="config-header">Конфигурация</div>
                        <div class="config-actions">
                            <button class="config-btn" onclick="networkManager.importConfig()">Импорт .conf</button>
                            <button class="config-btn" onclick="networkManager.exportConfig()">Экспорт</button>
                            <button class="config-btn" onclick="networkManager.generateConfig()">Сгенерировать</button>
                        </div>
                        <textarea id="vpnConfigText" class="config-textarea" placeholder="# WireGuard конфигурация\n[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/24\n\n[Peer]\nPublicKey = ...\nEndpoint = server:51820\nAllowedIPs = 0.0.0.0/0"></textarea>
                    </div>
                </div>
            </div>
        `;

        this.initGraph();
        this.refreshInterfaces();
    }

    initGraph() {
        this.canvas = document.getElementById('networkGraphCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.drawGraph();
    }

    drawGraph() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Фон
        ctx.fillStyle = 'rgba(30, 30, 35, 0.5)';
        ctx.fillRect(0, 0, w, h);

        // Сетка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = (h / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        const maxVal = Math.max(...this.networkHistory.download, ...this.networkHistory.upload, 1);
        const stepX = w / this.networkHistory.maxLength;

        // Download
        if (this.networkHistory.download.length > 1) {
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;
            ctx.beginPath();
            this.networkHistory.download.forEach((val, i) => {
                const x = i * stepX;
                const y = h - (val / maxVal) * h * 0.9;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }

        // Upload
        if (this.networkHistory.upload.length > 1) {
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 2;
            ctx.beginPath();
            this.networkHistory.upload.forEach((val, i) => {
                const x = i * stepX;
                const y = h - (val / maxVal) * h * 0.9;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }
    }

    async toggleVPN() {
        if (this.vpnConnected) {
            await this.disconnectVPN();
        } else {
            await this.connectVPN();
        }
    }

    async connectVPN() {
        const server = this.getSelectedServer();
        if (!server) return;

        this.showNotification('Подключение к VPN...', 'info');

        try {
            // Вызвать IPC для подключения VPN
            if (window.ipcRenderer) {
                const result = await window.ipcRenderer.invoke('vpn-connect', {
                    server: server,
                    protocol: this.vpnProtocol,
                    settings: this.vpnSettings
                });
                
                if (result.success) {
                    this.vpnConnected = true;
                    this.vpnConnectTime = Date.now();
                    this.showNotification(`Подключено к ${server.name}`, 'success');
                    this.render();
                    this.startVPNStatsUpdate();
                } else {
                    throw new Error(result.error || 'Ошибка подключения');
                }
            } else {
                // Демо-режим для браузера
                await this.simulateConnection();
                this.vpnConnected = true;
                this.vpnConnectTime = Date.now();
                this.showNotification(`Подключено к ${server.name}`, 'success');
                this.render();
                this.startVPNStatsUpdate();
            }
        } catch (e) {
            console.error('[VPN] Connect error:', e);
            this.showNotification('Ошибка: ' + e.message, 'error');
        }
    }

    async disconnectVPN() {
        this.showNotification('Отключение VPN...', 'info');

        try {
            if (window.ipcRenderer) {
                await window.ipcRenderer.invoke('vpn-disconnect');
            }
            
            this.vpnConnected = false;
            this.vpnConnectTime = null;
            this.showNotification('VPN отключен', 'success');
            this.render();
        } catch (e) {
            console.error('[VPN] Disconnect error:', e);
            this.showNotification('Ошибка: ' + e.message, 'error');
        }
    }

    async simulateConnection() {
        return new Promise(resolve => setTimeout(resolve, 1500));
    }

    startVPNStatsUpdate() {
        if (this.vpnStatsInterval) clearInterval(this.vpnStatsInterval);
        
        this.vpnDataSent = 0;
        this.vpnDataReceived = 0;
        
        this.vpnStatsInterval = setInterval(() => {
            if (!this.vpnConnected) {
                clearInterval(this.vpnStatsInterval);
                return;
            }
            
            // Обновить время подключения
            const elapsed = Date.now() - this.vpnConnectTime;
            const hours = Math.floor(elapsed / 3600000);
            const mins = Math.floor((elapsed % 3600000) / 60000);
            const secs = Math.floor((elapsed % 60000) / 1000);
            const uptimeEl = document.getElementById('vpnUptime');
            if (uptimeEl) {
                uptimeEl.textContent = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            
            // Симуляция данных
            this.vpnDataSent += Math.random() * 0.1;
            this.vpnDataReceived += Math.random() * 0.5;
            
            const sentEl = document.getElementById('vpnDataSent');
            const recvEl = document.getElementById('vpnDataReceived');
            if (sentEl) sentEl.textContent = this.vpnDataSent.toFixed(2) + ' MB';
            if (recvEl) recvEl.textContent = this.vpnDataReceived.toFixed(2) + ' MB';
            
        }, 1000);
    }

    getSelectedServer() {
        return this.vpnServers.find(s => s.id === this.selectedServer);
    }

    selectServer(serverId) {
        this.selectedServer = serverId;
        this.saveSettings();
        
        if (this.vpnConnected) {
            this.showNotification('Переподключение к новому серверу...', 'info');
            this.disconnectVPN().then(() => this.connectVPN());
        }
    }

    setProtocol(protocol) {
        this.vpnProtocol = protocol;
        this.saveSettings();
        this.render();
    }

    setSetting(key, value) {
        this.vpnSettings[key] = value;
        this.saveSettings();
        
        if (key === 'dns') {
            this.render();
        }
    }

    async refreshInterfaces() {
        const container = document.getElementById('interfacesList');
        if (!container) return;

        container.innerHTML = '<div class="loading">Загрузка...</div>';

        try {
            let interfaces = [];
            
            if (window.ipcRenderer) {
                interfaces = await window.ipcRenderer.invoke('get-network-interfaces');
            } else {
                // Демо для браузера
                interfaces = [
                    { iface: 'eth0', ip4: '192.168.1.100', mac: 'AA:BB:CC:DD:EE:FF', type: 'wired', state: 'up', speed: 1000 },
                    { iface: 'wlan0', ip4: '192.168.1.101', mac: '11:22:33:44:55:66', type: 'wireless', state: 'up', speed: 300 },
                    { iface: 'lo', ip4: '127.0.0.1', mac: '00:00:00:00:00:00', type: 'virtual', state: 'up', speed: 0 }
                ];
            }

            if (interfaces.length === 0) {
                container.innerHTML = '<div class="empty">Интерфейсы не найдены</div>';
                return;
            }

            container.innerHTML = interfaces.map(iface => `
                <div class="interface-item ${iface.state === 'up' ? 'active' : 'inactive'}">
                    <div class="iface-icon">
                        ${iface.type === 'wireless' ? '📶' : iface.type === 'virtual' ? '🔄' : '🔌'}
                    </div>
                    <div class="iface-info">
                        <div class="iface-name">${iface.iface}</div>
                        <div class="iface-ip">${iface.ip4 || 'N/A'}</div>
                    </div>
                    <div class="iface-details">
                        <span class="iface-mac">${iface.mac || 'N/A'}</span>
                        <span class="iface-speed">${iface.speed > 0 ? iface.speed + ' Mbps' : ''}</span>
                    </div>
                    <div class="iface-status ${iface.state}">
                        ${iface.state === 'up' ? 'Активен' : 'Неактивен'}
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error('[Network] Interfaces error:', e);
            container.innerHTML = '<div class="error">Ошибка загрузки</div>';
        }
    }

    importConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.conf,.ovpn';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const text = await file.text();
            const textarea = document.getElementById('vpnConfigText');
            if (textarea) textarea.value = text;
            
            this.showNotification('Конфигурация загружена', 'success');
        };
        input.click();
    }

    exportConfig() {
        const textarea = document.getElementById('vpnConfigText');
        if (!textarea || !textarea.value.trim()) {
            this.showNotification('Нет конфигурации для экспорта', 'error');
            return;
        }
        
        const blob = new Blob([textarea.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vpn-config-${Date.now()}.conf`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Конфигурация экспортирована', 'success');
    }

    generateConfig() {
        const server = this.getSelectedServer();
        const privateKey = this.generateKey();
        const publicKey = this.generateKey();
        
        let config = '';
        
        if (this.vpnProtocol === 'wireguard') {
            config = `[Interface]
PrivateKey = ${privateKey}
Address = 10.0.0.2/24
DNS = ${this.getDnsServer()}

[Peer]
PublicKey = ${publicKey}
Endpoint = ${server?.ip || 'server'}:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`;
        } else if (this.vpnProtocol === 'openvpn') {
            config = `client
dev tun
proto udp
remote ${server?.ip || 'server'} 1194
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
auth SHA256
cipher AES-256-GCM
verb 3

<ca>
# CA Certificate
</ca>

<cert>
# Client Certificate
</cert>

<key>
# Client Private Key
</key>`;
        } else {
            config = `# IKEv2 Configuration\nServer: ${server?.ip || 'server'}\nUsername: user\nPassword: ****\nCertificate: /path/to/cert.pem`;
        }
        
        const textarea = document.getElementById('vpnConfigText');
        if (textarea) textarea.value = config;
        
        this.showNotification('Конфигурация сгенерирована', 'success');
    }

    generateKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let key = '';
        for (let i = 0; i < 43; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key + '=';
    }

    getDnsServer() {
        const dnsMap = {
            'auto': '1.1.1.1',
            'cloudflare': '1.1.1.1',
            'google': '8.8.8.8',
            'quad9': '9.9.9.9',
            'custom': this.vpnSettings.customDns
        };
        return dnsMap[this.vpnSettings.dns] || '1.1.1.1';
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        this.monitorInterval = setInterval(() => this.updateNetworkStats(), this.updateRate);
        this.updateNetworkStats();
    }

    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.isMonitoring = false;
    }

    async updateNetworkStats() {
        try {
            let stats;
            
            if (window.ipcRenderer) {
                stats = await window.ipcRenderer.invoke('get-network-stats');
            } else {
                // Демо данные
                stats = {
                    rx_bytes: this.lastBytes.rx + Math.random() * 500000,
                    tx_bytes: this.lastBytes.tx + Math.random() * 100000,
                    rx_sec: Math.random() * 2,
                    tx_sec: Math.random() * 0.5,
                    latency: 20 + Math.random() * 30
                };
            }

            // Обновить UI
            const downloadEl = document.getElementById('netDownload');
            const uploadEl = document.getElementById('netUpload');
            const latencyEl = document.getElementById('netLatency');
            const totalEl = document.getElementById('netTotal');

            if (downloadEl) downloadEl.textContent = (stats.rx_sec || 0).toFixed(2);
            if (uploadEl) uploadEl.textContent = (stats.tx_sec || 0).toFixed(2);
            if (latencyEl) latencyEl.textContent = Math.round(stats.latency || 0);
            if (totalEl) totalEl.textContent = ((stats.rx_bytes + stats.tx_bytes) / 1024 / 1024 / 1024).toFixed(2);

            // Добавить в историю
            this.networkHistory.download.push(stats.rx_sec || 0);
            this.networkHistory.upload.push(stats.tx_sec || 0);
            
            if (this.networkHistory.download.length > this.networkHistory.maxLength) {
                this.networkHistory.download.shift();
            }
            if (this.networkHistory.upload.length > this.networkHistory.maxLength) {
                this.networkHistory.upload.shift();
            }

            this.lastBytes = { rx: stats.rx_bytes, tx: stats.tx_bytes };
            this.drawGraph();
        } catch (e) {
            console.error('[Network] Stats error:', e);
        }
    }

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.network-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `network-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    dispose() {
        this.stopMonitoring();
        if (this.vpnStatsInterval) clearInterval(this.vpnStatsInterval);
    }
}

export const networkManager = new NetworkManager();
window.networkManager = networkManager;
