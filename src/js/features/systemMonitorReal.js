/**
 * System Monitor Real - Реальный мониторинг системы в реальном времени
 * Использует systeminformation для получения реальных данных системы
 */

class SystemMonitorReal {
    constructor() {
        this.monitoringActive = false;
        this.monitoringInterval = null;
        this.updateInterval = 2000; // 2 секунды
        this.history = {
            cpu: [],
            mem: [],
            disk: [],
            maxHistoryLength: 60
        };
        this.lastUpdate = {};
    }

    init() {
        console.log('[SystemMonitor] Инициализация...');
        this.setupEventListeners();
        this.startMonitoring();
        // Первое обновление сразу
        this.updateAllData();
        // Проверить обновления при запуске
        setTimeout(() => this.checkForUpdates(), 2000);
    }

    setupEventListeners() {
        // Settings icon navigation
        document.querySelectorAll('.settings-icon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSection(btn.dataset.section);
            });
        });
    }

    switchSection(section) {
        // Скрыть все секции
        document.querySelectorAll('.settings-section').forEach(s => {
            s.classList.remove('active');
        });

        // Показать выбранную
        const target = document.getElementById(`settings-${section}`);
        if (target) {
            target.classList.add('active');
        }

        // Обновить активную кнопку
        document.querySelectorAll('.settings-icon-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === section) {
                btn.classList.add('active');
            }
        });
    }

    async updateAllData() {
        try {
            // CPU
            const cpuData = await window.ipcRenderer.invoke('get-cpu-info');
            if (cpuData && cpuData.load !== undefined) {
                this.updateCPUDisplay(cpuData);
                this.history.cpu.push(parseFloat(cpuData.load));
                if (this.history.cpu.length > this.maxHistoryLength) {
                    this.history.cpu.shift();
                }
                this.lastUpdate.cpu = cpuData;
            }

            // Memory
            const memData = await window.ipcRenderer.invoke('get-memory-info');
            if (memData && memData.percent !== undefined) {
                this.updateMemoryDisplay(memData);
                this.history.mem.push(parseFloat(memData.percent));
                if (this.history.mem.length > this.maxHistoryLength) {
                    this.history.mem.shift();
                }
                this.lastUpdate.mem = memData;
            }

            // Disk
            const diskData = await window.ipcRenderer.invoke('get-disk-info');
            if (diskData && diskData.percent !== undefined) {
                this.updateDiskDisplay(diskData);
                this.history.disk.push(parseFloat(diskData.percent));
                if (this.history.disk.length > this.maxHistoryLength) {
                    this.history.disk.shift();
                }
                this.lastUpdate.disk = diskData;
            }

            // GPU
            const gpuData = await window.ipcRenderer.invoke('get-gpu-info');
            if (gpuData) {
                this.updateGPUDisplay(gpuData);
                this.lastUpdate.gpu = gpuData;
            }

            // OS
            const osData = await window.ipcRenderer.invoke('get-os-info');
            if (osData) {
                this.updateOSDisplay(osData);
                this.lastUpdate.os = osData;
            }

            // Processes
            const procData = await window.ipcRenderer.invoke('get-processes');
            if (procData) {
                this.updateProcessesDisplay(procData);
                this.lastUpdate.processes = procData;
            }

            // Network
            const netData = await window.ipcRenderer.invoke('get-network-info');
            if (netData) {
                this.updateNetworkDisplay(netData);
                this.lastUpdate.network = netData;
            }

            // Drivers
            const driversData = await window.ipcRenderer.invoke('get-drivers-info');
            if (driversData) {
                this.updateDriversDisplay(driversData);
                this.lastUpdate.drivers = driversData;
            }

            console.log('[SystemMonitor] Обновление завершено');
        } catch (e) {
            console.error('[SystemMonitor] Ошибка обновления:', e);
        }
    }

    updateCPUDisplay(data) {
        const cpuSection = document.getElementById('settings-system');
        if (!cpuSection) return;

        let cpuCard = cpuSection.querySelector('.system-card[data-type="cpu"]');
        if (!cpuCard) {
            cpuCard = document.createElement('div');
            cpuCard.className = 'system-card';
            cpuCard.setAttribute('data-type', 'cpu');
            if (!cpuSection.querySelector('.system-cards-grid')) {
                const grid = document.createElement('div');
                grid.className = 'system-cards-grid';
                cpuSection.appendChild(grid);
            }
            cpuSection.querySelector('.system-cards-grid').appendChild(cpuCard);
        }

        const progressValue = Math.min(100, Math.max(0, parseFloat(data.load) || 0));
        cpuCard.innerHTML = `
            <div class="system-card-header">CPU</div>
            <div class="system-card-stat">
                <span class="label">Загрузка</span>
                <span class="value">${data.load}%</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Ядер</span>
                <span class="value">${data.cores}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Температура</span>
                <span class="value">${parseFloat(data.temp || 0).toFixed(1)}°C</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressValue}%"></div>
            </div>
        `;
    }

    updateMemoryDisplay(data) {
        const cpuSection = document.getElementById('settings-system');
        if (!cpuSection) return;

        let memCard = cpuSection.querySelector('.system-card[data-type="memory"]');
        if (!memCard) {
            memCard = document.createElement('div');
            memCard.className = 'system-card';
            memCard.setAttribute('data-type', 'memory');
            if (!cpuSection.querySelector('.system-cards-grid')) {
                const grid = document.createElement('div');
                grid.className = 'system-cards-grid';
                cpuSection.appendChild(grid);
            }
            cpuSection.querySelector('.system-cards-grid').appendChild(memCard);
        }

        const progressValue = Math.min(100, Math.max(0, parseFloat(data.percent) || 0));
        memCard.innerHTML = `
            <div class="system-card-header">Память</div>
            <div class="system-card-stat">
                <span class="label">Используется</span>
                <span class="value">${data.used} GB / ${data.total} GB</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Загрузка</span>
                <span class="value">${data.percent}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressValue}%"></div>
            </div>
        `;
    }

    updateDiskDisplay(data) {
        const cpuSection = document.getElementById('settings-system');
        if (!cpuSection) return;

        let diskCard = cpuSection.querySelector('.system-card[data-type="disk"]');
        if (!diskCard) {
            diskCard = document.createElement('div');
            diskCard.className = 'system-card';
            diskCard.setAttribute('data-type', 'disk');
            if (!cpuSection.querySelector('.system-cards-grid')) {
                const grid = document.createElement('div');
                grid.className = 'system-cards-grid';
                cpuSection.appendChild(grid);
            }
            cpuSection.querySelector('.system-cards-grid').appendChild(diskCard);
        }

        const progressValue = Math.min(100, Math.max(0, parseFloat(data.percent) || 0));
        diskCard.innerHTML = `
            <div class="system-card-header">Диск</div>
            <div class="system-card-stat">
                <span class="label">Используется</span>
                <span class="value">${data.used} GB / ${data.total} GB</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Загрузка</span>
                <span class="value">${data.percent}%</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Дисков</span>
                <span class="value">${data.disks}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressValue}%"></div>
            </div>
        `;
    }

    updateGPUDisplay(data) {
        const cpuSection = document.getElementById('settings-system');
        if (!cpuSection) return;

        let gpuCard = cpuSection.querySelector('.system-card[data-type="gpu"]');
        if (!gpuCard) {
            gpuCard = document.createElement('div');
            gpuCard.className = 'system-card';
            gpuCard.setAttribute('data-type', 'gpu');
            if (!cpuSection.querySelector('.system-cards-grid')) {
                const grid = document.createElement('div');
                grid.className = 'system-cards-grid';
                cpuSection.appendChild(grid);
            }
            cpuSection.querySelector('.system-cards-grid').appendChild(gpuCard);
        }

        gpuCard.innerHTML = `
            <div class="system-card-header">GPU</div>
            <div class="system-card-stat">
                <span class="label">Бренд</span>
                <span class="value">${data.brand}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Модель</span>
                <span class="value">${data.model}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">VRAM</span>
                <span class="value">${data.vram} MB</span>
            </div>
        `;
    }

    updateOSDisplay(data) {
        const cpuSection = document.getElementById('settings-system');
        if (!cpuSection) return;

        let osCard = cpuSection.querySelector('.system-card[data-type="os"]');
        if (!osCard) {
            osCard = document.createElement('div');
            osCard.className = 'system-card';
            osCard.setAttribute('data-type', 'os');
            if (!cpuSection.querySelector('.system-cards-grid')) {
                const grid = document.createElement('div');
                grid.className = 'system-cards-grid';
                cpuSection.appendChild(grid);
            }
            cpuSection.querySelector('.system-cards-grid').appendChild(osCard);
        }

        const uptimeHours = Math.floor((data.uptime || 0) / 3600);
        const uptimeDays = Math.floor(uptimeHours / 24);

        osCard.innerHTML = `
            <div class="system-card-header">ОС</div>
            <div class="system-card-stat">
                <span class="label">ОС</span>
                <span class="value">${data.platform} ${data.distro}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Архитектура</span>
                <span class="value">${data.arch}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Ядро</span>
                <span class="value">${data.kernel}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Uptime</span>
                <span class="value">${uptimeDays}д ${uptimeHours % 24}ч</span>
            </div>
        `;
    }

    updateProcessesDisplay(processes) {
        const cpuSection = document.getElementById('settings-system');
        if (!cpuSection) return;

        let procCard = cpuSection.querySelector('.system-card[data-type="processes"]');
        if (!procCard) {
            procCard = document.createElement('div');
            procCard.className = 'system-card';
            procCard.setAttribute('data-type', 'processes');
            if (!cpuSection.querySelector('.system-cards-grid')) {
                const grid = document.createElement('div');
                grid.className = 'system-cards-grid';
                cpuSection.appendChild(grid);
            }
            cpuSection.querySelector('.system-cards-grid').appendChild(procCard);
        }

        let html = `<div class="system-card-header">Топ процессы</div>`;
        if (processes && processes.length > 0) {
            for (const proc of processes.slice(0, 5)) {
                html += `
                    <div class="process-item">
                        <span class="proc-name">${proc.name}</span>
                        <span class="proc-mem">${proc.mem}MB</span>
                    </div>
                `;
            }
        } else {
            html += `<div style="padding: 8px 0; color: var(--text-tertiary); font-size: 10px;">Нет данных</div>`;
        }

        procCard.innerHTML = html;
    }

    updateNetworkDisplay(data) {
        const cpuSection = document.getElementById('settings-system');
        if (!cpuSection) return;

        let netCard = cpuSection.querySelector('.system-card[data-type="network"]');
        if (!netCard) {
            netCard = document.createElement('div');
            netCard.className = 'system-card';
            netCard.setAttribute('data-type', 'network');
            if (!cpuSection.querySelector('.system-cards-grid')) {
                const grid = document.createElement('div');
                grid.className = 'system-cards-grid';
                cpuSection.appendChild(grid);
            }
            cpuSection.querySelector('.system-cards-grid').appendChild(netCard);
        }

        netCard.innerHTML = `
            <div class="system-card-header">Сеть</div>
            <div class="system-card-stat">
                <span class="label">Интерфейсов</span>
                <span class="value">${data.interfaces}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Общая скорость</span>
                <span class="value">${data.totalSpeed} Mbps</span>
            </div>
        `;
    }

    updateDriversDisplay(drivers) {
        const cpuSection = document.getElementById('settings-system');
        if (!cpuSection) return;

        let driverCard = cpuSection.querySelector('.system-card[data-type="drivers"]');
        if (!driverCard) {
            driverCard = document.createElement('div');
            driverCard.className = 'system-card drivers-full-card';
            driverCard.setAttribute('data-type', 'drivers');
            cpuSection.appendChild(driverCard);
        }

        let html = `
            <div class="system-card-header">Драйверы и устройства (${drivers.length})</div>
            <div class="drivers-table">
                <div class="drivers-table-header">
                    <div class="col-name">Устройство</div>
                    <div class="col-type">Тип</div>
                    <div class="col-status">Статус</div>
                    <div class="col-version">Версия</div>
                    <div class="col-actions">Действия</div>
                </div>
        `;
        
        if (drivers && drivers.length > 0) {
            for (const driver of drivers) {
                // Определить класс статуса
                let statusClass = 'active';
                let statusText = driver.status || 'Актуален';
                
                if (driver.needsUpdate) {
                    statusClass = 'warning';
                    statusText = 'ТРЕБУЕТСЯ ОБНОВЛЕНИЕ';
                } else if (driver.status === 'Неактивен' || driver.status === 'Ошибка') {
                    statusClass = 'error';
                }
                
                html += `
                    <div class="drivers-table-row ${driver.needsUpdate ? 'needs-update' : ''}">
                        <div class="col-name">
                            <div class="driver-name-main">${this.escapeHtml(driver.name)}</div>
                            <div class="driver-model">${this.escapeHtml(driver.model || driver.type)}</div>
                        </div>
                        <div class="col-type">${driver.type}</div>
                        <div class="col-status">
                            <span class="status-badge ${statusClass}">
                                ${statusText}
                            </span>
                        </div>
                        <div class="col-version">${this.escapeHtml(driver.version || driver.current || 'N/A')}</div>
                        <div class="col-actions">
                            ${driver.needsUpdate ? `
                                <button class="driver-btn warning" onclick="systemMonitorReal.updateDriver('${driver.id}')" title="Обновить">⚠️</button>
                            ` : `
                                <button class="driver-btn" onclick="systemMonitorReal.updateDriver('${driver.id}')" title="Обновить">↻</button>
                                <button class="driver-btn" onclick="systemMonitorReal.reinstallDriver('${driver.id}')" title="Переустановить">⟳</button>
                            `}
                        </div>
                    </div>
                `;
            }
        } else {
            html += `<div style="padding: 12px; color: var(--text-tertiary); text-align: center;">Драйверы не найдены</div>`;
        }
        
        html += `</div>`;
        driverCard.innerHTML = html;
    }

    updateDriver(driverId) {
        window.ipcRenderer.invoke('update-driver', driverId).then(result => {
            console.log('[Driver Update]', result);
            if (result.success) {
                this.showNotification(result.message);
            } else {
                this.showNotification('Ошибка: ' + result.message, 'error');
            }
        }).catch(e => console.error('Update error:', e));
    }

    reinstallDriver(driverId) {
        if (confirm(`Переустановить драйвер ${driverId}?`)) {
            window.ipcRenderer.invoke('reinstall-driver', driverId).then(result => {
                console.log('[Driver Reinstall]', result);
                if (result.success) {
                    this.showNotification(result.message);
                } else {
                    this.showNotification('Ошибка: ' + result.message, 'error');
                }
            }).catch(e => console.error('Reinstall error:', e));
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `monitor-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toggleMonitoring() {
        if (this.monitoringActive) {
            this.stopMonitoring();
            this.updateStatusUI('Мониторинг остановлен');
            const btn = document.getElementById('toggleMonitoring');
            if (btn) {
                btn.textContent = '▶ Запустить мониторинг';
                btn.classList.remove('primary');
            }
        } else {
            this.startMonitoring();
            this.updateStatusUI('Мониторинг активен');
            const btn = document.getElementById('toggleMonitoring');
            if (btn) {
                btn.textContent = '⏸ Остановить мониторинг';
                btn.classList.add('primary');
            }
        }
    }

    updateStatusUI(status) {
        const statusEl = document.getElementById('monitorStatus');
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.classList.add('status-update');
            setTimeout(() => statusEl.classList.remove('status-update'), 300);
        }
    }

    async checkForUpdates() {
        try {
            console.log('[SystemMonitor] Проверка обновлений...');
            const updateInfo = await window.ipcRenderer.invoke('check-driver-updates');
            
            if (updateInfo && updateInfo.updates) {
                // Обновить таблицу драйверов с информацией об обновлениях
                const driverCard = document.querySelector('.system-card[data-type="drivers"]');
                if (driverCard) {
                    // Обновить драйверы с новой информацией
                    this.updateDriversDisplay(updateInfo.updates);
                    
                    // Показать уведомление если есть обновления
                    if (updateInfo.hasUpdates) {
                        this.showNotification('Доступны обновления драйверов', 'warning');
                    } else {
                        this.showNotification('Все драйверы актуальны', 'success');
                    }
                }
                
                this.updateStatusUI(`Проверено: ${new Date().toLocaleTimeString()}`);
            }
        } catch (e) {
            console.error('[SystemMonitor] Check updates error:', e);
            this.showNotification('Ошибка при проверке обновлений', 'error');
        }
    }

    startMonitoring() {
        if (this.monitoringActive) return;
        this.monitoringActive = true;
        console.log('[SystemMonitor] Мониторинг запущен');

        this.monitoringInterval = setInterval(() => {
            this.updateAllData();
        }, this.updateInterval);
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.monitoringActive = false;
        console.log('[SystemMonitor] Мониторинг остановлен');
    }

    dispose() {
        this.stopMonitoring();
    }
}

export const systemMonitorReal = new SystemMonitorReal();
