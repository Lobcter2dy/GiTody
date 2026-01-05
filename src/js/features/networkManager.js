/**
 * Network Manager - Мониторинг сети и VPN клиент
 */
import { Logger } from '../core/logger.js';

const log = Logger.create('[NetworkManager]');

export class NetworkManager {
    constructor() {
        this.updateInterval = 1000;
        this.intervalId = null;
        this.vpnConfigs = [];
        this.activeVpn = null;
        this.history = { rx: [], tx: [] };
    }

    init() {
        this.setupUI();
        this.startMonitoring();
        this.loadVpnConfigs();
    }

    setupUI() {
        // Add tab content handling if needed
    }

    startMonitoring() {
        this.intervalId = setInterval(() => this.updateStats(), this.updateInterval);
    }

    async updateStats() {
        if (!document.getElementById('network-graph-canvas')) return; // Only update if visible

        try {
            const data = await window.ipcRenderer.invoke('get-network-info');
            this.updateDashboard(data);
            this.updateGraph(data.traffic);
        } catch (e) {
            console.error('Network stats error:', e);
        }
    }

    updateDashboard(data) {
        // Speed Indicators
        const downEl = document.getElementById('net-download');
        const upEl = document.getElementById('net-upload');
        if (downEl) downEl.textContent = `${data.traffic.rx} KB/s`;
        if (upEl) upEl.textContent = `${data.traffic.tx} KB/s`;

        // Interface List
        const listEl = document.getElementById('net-interfaces');
        if (listEl) {
            listEl.innerHTML = data.details.map(iface => `
                <div class="interface-item ${iface.ip4 ? 'active' : ''}">
                    <div class="iface-icon">${iface.type === 'wireless' ? '📶' : '🔌'}</div>
                    <div class="iface-info">
                        <div class="iface-name">${iface.iface}</div>
                        <div class="iface-ip">${iface.ip4 || 'No IP'}</div>
                    </div>
                    <div class="iface-speed">${iface.speed || '?'} Mbit/s</div>
                </div>
            `).join('');
        }
    }

    updateGraph(traffic) {
        const canvas = document.getElementById('network-graph-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Push data
        this.history.rx.push(parseFloat(traffic.rx));
        this.history.tx.push(parseFloat(traffic.tx));
        if (this.history.rx.length > 60) {
            this.history.rx.shift();
            this.history.tx.shift();
        }

        // Draw
        ctx.clearRect(0, 0, width, height);
        
        // Grid
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<width; i+=20) { ctx.moveTo(i,0); ctx.lineTo(i,height); }
        for(let i=0; i<height; i+=20) { ctx.moveTo(0,i); ctx.lineTo(width,i); }
        ctx.stroke();

        // Download Line (Green)
        this.drawLine(ctx, this.history.rx, '#3fb950', width, height);
        // Upload Line (Blue)
        this.drawLine(ctx, this.history.tx, '#58a6ff', width, height);
    }

    drawLine(ctx, data, color, w, h) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        const max = Math.max(100, ...data); // Scale dynamic
        
        data.forEach((val, i) => {
            const x = (i / 60) * w;
            const y = h - (val / max) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    // === VPN ===

    async loadVpnConfigs() {
        // In real app, list files from userData/vpn
        // Mock data for now
        this.vpnConfigs = [
            { id: 'wg0', name: 'Work VPN (WireGuard)', type: 'wireguard', status: 'disconnected' },
            { id: 'ovpn1', name: 'Private Relay (OpenVPN)', type: 'openvpn', status: 'disconnected' }
        ];
        this.renderVpnList();
    }

    renderVpnList() {
        const container = document.getElementById('vpn-list');
        if (!container) return;

        container.innerHTML = this.vpnConfigs.map(vpn => `
            <div class="vpn-card ${vpn.status}">
                <div class="vpn-header">
                    <span class="vpn-name">${vpn.name}</span>
                    <span class="vpn-type">${vpn.type}</span>
                </div>
                <div class="vpn-actions">
                    ${vpn.status === 'connected' 
                        ? `<button class="btn btn-danger btn-sm" onclick="networkManager.disconnectVpn('${vpn.id}')">Disconnect</button>`
                        : `<button class="btn btn-primary btn-sm" onclick="networkManager.connectVpn('${vpn.id}')">Connect</button>`
                    }
                    <button class="btn btn-sm" onclick="networkManager.editVpn('${vpn.id}')">⚙️</button>
                </div>
            </div>
        `).join('');
    }

    async connectVpn(id) {
        const vpn = this.vpnConfigs.find(v => v.id === id);
        if (!vpn) return;

        log.info(`Connecting to ${vpn.name}...`);
        vpn.status = 'connecting';
        this.renderVpnList();

        const res = await window.ipcRenderer.invoke('vpn-command', { command: 'up', config: vpn.id });
        if (res.success) {
            vpn.status = 'connected';
            this.activeVpn = id;
            log.info('Connected');
        } else {
            vpn.status = 'error';
            alert('Connection failed');
        }
        this.renderVpnList();
    }

    async disconnectVpn(id) {
        const vpn = this.vpnConfigs.find(v => v.id === id);
        if (!vpn) return;

        const res = await window.ipcRenderer.invoke('vpn-command', { command: 'down', config: vpn.id });
        vpn.status = 'disconnected';
        this.activeVpn = null;
        this.renderVpnList();
    }

    addNewVpn() {
        const name = prompt('Configuration Name:');
        if (!name) return;
        const content = prompt('Paste WireGuard/OpenVPN config content:');
        if (!content) return;

        window.ipcRenderer.invoke('save-vpn-config', { name, content }).then(res => {
            if (res.success) {
                this.vpnConfigs.push({ id: name, name: name, type: 'custom', status: 'disconnected' });
                this.renderVpnList();
            } else {
                alert('Error saving config');
            }
        });
    }
}

export const networkManager = new NetworkManager();
window.networkManager = networkManager;
