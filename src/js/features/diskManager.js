/**
 * Disk Manager - Полное управление дисками и накопителями
 */

class DiskManager {
    constructor() {
        this.disks = [];
        this.volumes = [];
        this.removableDevices = [];
        this.updateInterval = 5000; // 5 секунд
        this.monitoringActive = false;
    }

    init() {
        console.log('[DiskManager] Инициализация...');
        this.setupEventListeners();
        this.startMonitoring();
        this.loadAllData();
    }

    setupEventListeners() {
        // Монитор дисков будет в Storage tab
    }

    async loadAllData() {
        try {
            // Загрузить дисков
            this.disks = await window.ipcRenderer.invoke('get-disk-list');
            this.volumes = await window.ipcRenderer.invoke('get-volumes');
            this.removableDevices = await window.ipcRenderer.invoke('get-removable-devices');
            
            console.log('[DiskManager] Loaded:', {
                disks: this.disks.length,
                volumes: this.volumes.length,
                removable: this.removableDevices.length
            });
            
            this.renderDiskMonitor();
        } catch (e) {
            console.error('[DiskManager] Load error:', e);
        }
    }

    renderDiskMonitor() {
        // Найти контейнер в System tab (он теперь внутри .system-monitor-container)
        let monitorContainer = document.querySelector('.disk-monitor-container');
        
        if (!monitorContainer) {
            // Если контейнер не найден, проверим активна ли вообще вкладка системного монитора
            const systemSection = document.getElementById('settings-system');
            if (systemSection && systemSection.classList.contains('active')) {
                console.warn('[DiskManager] Disk monitor container not found in active system section');
            }
            return;
        }

        let html = `
            <div class="disk-monitor-panel">
                <div class="disk-monitor-header">
                    <h3>Монитор накопителей</h3>
                    <button class="disk-monitor-btn" onclick="diskManager.loadAllData()">↻ Обновить</button>
                </div>

                <!-- Диски -->
                <div class="disk-section">
                    <div class="disk-section-title">Жесткие диски (${this.disks.length})</div>
                    <div class="disk-list">
        `;

        if (this.disks && this.disks.length > 0) {
            for (const disk of this.disks) {
                const percentUsed = parseFloat(disk.percentUsed || 0);
                const progressClass = percentUsed > 80 ? 'critical' : percentUsed > 60 ? 'warning' : 'normal';
                
                html += `
                    <div class="disk-item ${progressClass}">
                        <div class="disk-info">
                            <div class="disk-name">${disk.name} (${disk.device})</div>
                            <div class="disk-type">${disk.type} • ${disk.interface}</div>
                            <div class="disk-usage">
                                <span>${disk.used}GB / ${disk.sizeGB}GB</span>
                                <span class="percent">${disk.percentUsed}%</span>
                            </div>
                            <div class="disk-progress-bar">
                                <div class="disk-progress-fill" style="width: ${percentUsed}%"></div>
                            </div>
                        </div>
                        <div class="disk-actions">
                            <button class="disk-btn" onclick="diskManager.showDiskOptions('${disk.id}')" title="Параметры">⚙️</button>
                            <button class="disk-btn" onclick="diskManager.formatDisk('${disk.id}')" title="Форматировать">🔄</button>
                        </div>
                    </div>
                `;
            }
        } else {
            html += `<div style="padding: 12px; color: var(--text-tertiary);">Диски не найдены</div>`;
        }

        html += `
                    </div>
                </div>

                <!-- Съемные устройства -->
                <div class="disk-section">
                    <div class="disk-section-title">Съемные устройства (${this.removableDevices.length})</div>
                    <div class="disk-list">
        `;

        if (this.removableDevices && this.removableDevices.length > 0) {
            for (const device of this.removableDevices) {
                html += `
                    <div class="disk-item removable">
                        <div class="disk-info">
                            <div class="disk-name">🔌 ${device.name}</div>
                            <div class="disk-type">${device.type} • ${device.status}</div>
                            ${device.size !== 'N/A' ? `<div class="disk-usage">${device.size}GB</div>` : ''}
                        </div>
                        <div class="disk-actions">
                            <button class="disk-btn" onclick="diskManager.formatDisk('${device.id}')" title="Форматировать">🔄</button>
                            <button class="disk-btn eject" onclick="diskManager.ejectDisk('${device.id}')" title="Извлечь">⏏️</button>
                        </div>
                    </div>
                `;
            }
        } else {
            html += `<div style="padding: 12px; color: var(--text-tertiary);">Съемные устройства не подключены</div>`;
        }

        html += `
                    </div>
                </div>

                <!-- Разделы -->
                <div class="disk-section">
                    <div class="disk-section-title">Разделы (${this.volumes.length})</div>
                    <div class="disk-list">
        `;

        if (this.volumes && this.volumes.length > 0) {
            for (const vol of this.volumes) {
                const percentUsed = parseFloat(vol.percentUsed);
                const progressClass = percentUsed > 80 ? 'critical' : percentUsed > 60 ? 'warning' : 'normal';
                
                html += `
                    <div class="disk-item volume ${progressClass}">
                        <div class="disk-info">
                            <div class="disk-name">${vol.mount}</div>
                            <div class="disk-type">${vol.filesystem}</div>
                            <div class="disk-usage">
                                <span>${vol.used}GB / ${vol.size}GB</span>
                                <span class="percent">${vol.percentUsed}%</span>
                            </div>
                            <div class="disk-progress-bar">
                                <div class="disk-progress-fill" style="width: ${percentUsed}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
        } else {
            html += `<div style="padding: 12px; color: var(--text-tertiary);">Разделы не найдены</div>`;
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        monitorContainer.innerHTML = html;
    }

    showDiskOptions(diskId) {
        const disk = this.disks.find(d => d.id === diskId);
        if (!disk) return;

        const options = `Параметры диска ${disk.name}:\n\n1. Форматировать\n2. Создать раздел\n3. Очистить\n\nВыберите действие (не реализовано в полной версии)`;
        alert(options);
    }

    formatDisk(diskId) {
        if (confirm(`Вы уверены? Все данные будут удалены!\n\nДиск: ${diskId}`)) {
            window.ipcRenderer.invoke('format-disk', diskId).then(result => {
                if (result.success) {
                    this.showNotification(result.message, 'success');
                    setTimeout(() => this.loadAllData(), 1000);
                } else {
                    this.showNotification(result.message, 'error');
                }
            });
        }
    }

    ejectDisk(diskId) {
        if (confirm(`Извлечь диск ${diskId}?`)) {
            window.ipcRenderer.invoke('eject-disk', diskId).then(result => {
                if (result.success) {
                    this.showNotification(result.message, 'success');
                    setTimeout(() => this.loadAllData(), 1000);
                } else {
                    this.showNotification(result.message, 'error');
                }
            });
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `disk-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    startMonitoring() {
        if (this.monitoringActive) return;
        this.monitoringActive = true;
        
        setInterval(() => {
            this.loadAllData();
        }, this.updateInterval);
    }

    stopMonitoring() {
        this.monitoringActive = false;
    }

    dispose() {
        this.stopMonitoring();
    }
}

export const diskManager = new DiskManager();

