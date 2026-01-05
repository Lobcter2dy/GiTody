/**
 * Disk Manager - Управление дисками
 * По умолчанию ВЫКЛЮЧЕН
 */

class DiskManager {
    constructor() {
        this.disks = [];
        this.volumes = [];
        this.removableDevices = [];
        this.updateInterval = 10000;
        this.monitoringActive = false;
        this.intervalId = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('[DiskManager] Готов (выключен по умолчанию)');
    }

    startMonitoring() {
        if (this.monitoringActive) return;
        this.monitoringActive = true;
        this.loadAllData();
        this.intervalId = setInterval(() => this.loadAllData(), this.updateInterval);
        console.log('[DiskManager] Запущен');
    }

    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.monitoringActive = false;
        console.log('[DiskManager] Остановлен');
    }

    async loadAllData() {
        if (!window.ipcRenderer) return;
        
        try {
            const [disks, volumes, removable] = await Promise.all([
                window.ipcRenderer.invoke('get-disk-list').catch(() => []),
                window.ipcRenderer.invoke('get-volumes').catch(() => []),
                window.ipcRenderer.invoke('get-removable-devices').catch(() => [])
            ]);
            
            this.disks = disks || [];
            this.volumes = volumes || [];
            this.removableDevices = removable || [];
            
            this.renderDiskMonitor();
        } catch (e) {
            console.error('[DiskManager] Error:', e);
        }
    }

    renderDiskMonitor() {
        const container = document.querySelector('#settings-system .disk-monitor-container');
        if (!container) return;

        container.innerHTML = `
            <div class="disk-panel">
                <div class="disk-header">
                    <span class="disk-title">Storage Devices</span>
                    <div class="disk-actions-bar">
                        <button class="disk-btn-sm" onclick="diskManager.loadAllData()">Refresh</button>
                        <button class="disk-btn-sm ${this.monitoringActive ? 'active' : ''}" onclick="diskManager.toggleMonitoring()">
                            ${this.monitoringActive ? 'Stop' : 'Start'}
                        </button>
                    </div>
                </div>

                <div class="disk-section">
                    <div class="disk-section-label">Hard Drives (${this.disks.length})</div>
                    <div class="disk-items">
                        ${this.disks.length ? this.disks.map(d => this.renderDisk(d)).join('') : '<div class="disk-empty">No drives found</div>'}
                    </div>
                </div>

                <div class="disk-section">
                    <div class="disk-section-label">Removable (${this.removableDevices.length})</div>
                    <div class="disk-items">
                        ${this.removableDevices.length ? this.removableDevices.map(d => this.renderRemovable(d)).join('') : '<div class="disk-empty">No devices</div>'}
                    </div>
                </div>

                <div class="disk-section">
                    <div class="disk-section-label">Partitions (${this.volumes.length})</div>
                    <div class="disk-items">
                        ${this.volumes.length ? this.volumes.map(v => this.renderVolume(v)).join('') : '<div class="disk-empty">No partitions</div>'}
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
    }

    renderDisk(disk) {
        const percent = parseFloat(disk.percentUsed || 0);
        return `
            <div class="disk-item">
                <div class="disk-info">
                    <div class="disk-name">${disk.name} (${disk.device})</div>
                    <div class="disk-meta">${disk.type} / ${disk.interface}</div>
                    <div class="disk-usage">${disk.used}GB / ${disk.sizeGB}GB <span class="disk-pct">${disk.percentUsed}%</span></div>
                    <div class="disk-bar"><div class="disk-fill" style="width:${percent}%;background:${this.getColor(percent)}"></div></div>
                </div>
                <div class="disk-btns">
                    <button class="disk-act" onclick="diskManager.showDiskOptions('${disk.id}')">Options</button>
                </div>
            </div>
        `;
    }

    renderRemovable(device) {
        return `
            <div class="disk-item removable">
                <div class="disk-info">
                    <div class="disk-name">${device.name}</div>
                    <div class="disk-meta">${device.type} / ${device.status}</div>
                    ${device.size !== 'N/A' ? `<div class="disk-usage">${device.size}GB</div>` : ''}
                </div>
                <div class="disk-btns">
                    <button class="disk-act eject" onclick="diskManager.ejectDisk('${device.id}')">Eject</button>
                </div>
            </div>
        `;
    }

    renderVolume(vol) {
        const percent = parseFloat(vol.percentUsed || 0);
        return `
            <div class="disk-item volume">
                <div class="disk-info">
                    <div class="disk-name">${vol.mount}</div>
                    <div class="disk-meta">${vol.filesystem}</div>
                    <div class="disk-usage">${vol.used}GB / ${vol.size}GB <span class="disk-pct">${vol.percentUsed}%</span></div>
                    <div class="disk-bar"><div class="disk-fill" style="width:${percent}%;background:${this.getColor(percent)}"></div></div>
                </div>
            </div>
        `;
    }

    toggleMonitoring() {
        if (this.monitoringActive) {
            this.stopMonitoring();
        } else {
            this.startMonitoring();
        }
        this.renderDiskMonitor();
    }

    getColor(v) {
        if (v < 60) return '#3fb950';
        if (v < 80) return '#d29922';
        return '#f85149';
    }

    addStyles() {
        if (document.getElementById('disk-styles')) return;
        const style = document.createElement('style');
        style.id = 'disk-styles';
        style.textContent = `
            .disk-panel {
                padding: 16px;
            }
            .disk-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            .disk-title {
                font-size: 13px;
                font-weight: 600;
                color: #c9d1d9;
            }
            .disk-actions-bar {
                display: flex;
                gap: 8px;
            }
            .disk-btn-sm {
                padding: 4px 10px;
                font-size: 11px;
                background: rgba(110, 118, 129, 0.1);
                border: 1px solid rgba(48, 54, 61, 0.8);
                border-radius: 4px;
                color: #c9d1d9;
                cursor: pointer;
            }
            .disk-btn-sm:hover {
                background: rgba(110, 118, 129, 0.2);
            }
            .disk-btn-sm.active {
                background: rgba(248, 81, 73, 0.15);
                border-color: rgba(248, 81, 73, 0.4);
                color: #f85149;
            }
            .disk-section {
                margin-bottom: 16px;
            }
            .disk-section-label {
                font-size: 11px;
                font-weight: 500;
                color: #8b949e;
                text-transform: uppercase;
                margin-bottom: 8px;
                letter-spacing: 0.5px;
            }
            .disk-items {
                display: grid;
                gap: 8px;
            }
            .disk-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                background: rgba(22, 27, 34, 0.8);
                border: 1px solid rgba(48, 54, 61, 0.8);
                border-radius: 6px;
            }
            .disk-info {
                flex: 1;
            }
            .disk-name {
                font-size: 12px;
                font-weight: 500;
                color: #c9d1d9;
            }
            .disk-meta {
                font-size: 11px;
                color: #8b949e;
                margin-top: 2px;
            }
            .disk-usage {
                font-size: 11px;
                color: #8b949e;
                margin-top: 4px;
            }
            .disk-pct {
                color: #c9d1d9;
                font-family: 'SF Mono', monospace;
            }
            .disk-bar {
                height: 4px;
                background: rgba(48, 54, 61, 0.6);
                border-radius: 2px;
                margin-top: 6px;
                overflow: hidden;
            }
            .disk-fill {
                height: 100%;
                border-radius: 2px;
                transition: width 0.3s;
            }
            .disk-btns {
                display: flex;
                gap: 6px;
            }
            .disk-act {
                padding: 4px 8px;
                font-size: 10px;
                background: transparent;
                border: 1px solid rgba(48, 54, 61, 0.8);
                border-radius: 4px;
                color: #8b949e;
                cursor: pointer;
            }
            .disk-act:hover {
                background: rgba(48, 54, 61, 0.4);
                color: #c9d1d9;
            }
            .disk-act.eject {
                color: #d29922;
                border-color: rgba(210, 153, 34, 0.4);
            }
            .disk-empty {
                padding: 12px;
                text-align: center;
                color: #8b949e;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    showDiskOptions(diskId) {
        const disk = this.disks.find(d => d.id === diskId);
        if (!disk) return;
        alert(`Disk: ${disk.name}\nDevice: ${disk.device}\nSize: ${disk.sizeGB}GB\nUsed: ${disk.percentUsed}%`);
    }

    formatDisk(diskId) {
        if (!confirm(`Format disk ${diskId}? All data will be lost!`)) return;
        window.ipcRenderer?.invoke('format-disk', diskId).then(result => {
            this.showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) setTimeout(() => this.loadAllData(), 1000);
        });
    }

    ejectDisk(diskId) {
        if (!confirm(`Eject ${diskId}?`)) return;
        window.ipcRenderer?.invoke('eject-disk', diskId).then(result => {
            this.showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) setTimeout(() => this.loadAllData(), 1000);
        });
    }

    showNotification(message, type = 'info') {
        const el = document.createElement('div');
        el.style.cssText = `
            position: fixed;
            bottom: 16px;
            right: 16px;
            padding: 8px 14px;
            background: ${type === 'success' ? 'rgba(35, 134, 54, 0.9)' : type === 'error' ? 'rgba(248, 81, 73, 0.9)' : 'rgba(56, 139, 253, 0.9)'};
            border-radius: 6px;
            color: #fff;
            font-size: 12px;
            z-index: 10000;
        `;
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 200);
        }, 2500);
    }

    dispose() {
        this.stopMonitoring();
    }
}

export const diskManager = new DiskManager();
