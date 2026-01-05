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
            cpuCard.className = 'system-card full-width-card';
            cpuCard.setAttribute('data-type', 'cpu');
            cpuCard.innerHTML = `
                <div class="system-card-header">
                    <span>Central Processing Unit</span>
                    <span class="cpu-model-name">${data.brand || 'CPU'}</span>
                </div>
                <div class="chart-container">
                    <canvas id="cpuChart" height="100"></canvas>
                </div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="label">Load</div>
                        <div class="value value-cpu-load">0%</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Cores</div>
                        <div class="value">${data.cores}</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Temp</div>
                        <div class="value value-cpu-temp">--°C</div>
                    </div>
                </div>
            `;
            if (!cpuSection.querySelector('.system-cards-grid')) {
                const grid = document.createElement('div');
                grid.className = 'system-cards-grid';
                cpuSection.appendChild(grid);
            }
            cpuSection.querySelector('.system-cards-grid').prepend(cpuCard);
            this.initChart('cpuChart', '#58a6ff');
        }

        // Update values
        const load = parseFloat(data.load).toFixed(1);
        cpuCard.querySelector('.value-cpu-load').textContent = `${load}%`;
        cpuCard.querySelector('.value-cpu-temp').textContent = `${parseFloat(data.temp).toFixed(1)}°C`;
        
        this.updateChart('cpuChart', load);
    }

    initChart(id, color) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        // Simple array based history attached to element
        canvas.dataHistory = new Array(60).fill(0);
        canvas.chartColor = color;
    }

    updateChart(id, value) {
        const canvas = document.getElementById(id);
        if (!canvas || !canvas.dataHistory) return;
        
        const history = canvas.dataHistory;
        history.push(value);
        history.shift();
        
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.offsetWidth;
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();
        ctx.strokeStyle = canvas.chartColor;
        ctx.lineWidth = 2;
        
        // Draw line
        const step = w / (history.length - 1);
        history.forEach((val, i) => {
            const y = h - (val / 100 * h);
            if (i===0) ctx.moveTo(0, y);
            else ctx.lineTo(i * step, y);
        });
        ctx.stroke();
        
        // Fill area
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fillStyle = canvas.chartColor + '33'; // 20% opacity
        ctx.fill();
    }

    updateMemoryDisplay(data) {
        // Simplified update for RAM with bar
        const cpuSection = document.getElementById('settings-system');
        let memCard = cpuSection.querySelector('.system-card[data-type="memory"]');
        // ... (similar logic or keep existing but refined)
        // For brevity, I'll rely on the existing structure but ensure it parses data correctly
        if (!memCard) {
             // Create if missing (reuse existing logic but make sure it handles new IPC format)
             memCard = document.createElement('div');
             memCard.className = 'system-card';
             memCard.setAttribute('data-type', 'memory');
             cpuSection.querySelector('.system-cards-grid').appendChild(memCard);
        }
        
        const percent = parseFloat(data.percent).toFixed(1);
        memCard.innerHTML = `
            <div class="system-card-header">Memory</div>
            <div class="pie-chart-container" style="display:flex; justify-content:center; padding:10px;">
                <div class="pie-chart" style="background: conic-gradient(#3fb950 ${percent}%, #30363d 0);">
                    <div class="pie-center">${percent}%</div>
                </div>
            </div>
            <div class="system-card-stat">
                <span class="label">Used</span>
                <span class="value">${data.used} GB</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Total</span>
                <span class="value">${data.total} GB</span>
            </div>
        `;
    }

    updateProcessesDisplay(processes) {
        const cpuSection = document.getElementById('settings-system');
        let procCard = cpuSection.querySelector('.system-card[data-type="processes"]');
        if (!procCard) {
            procCard = document.createElement('div');
            procCard.className = 'system-card full-width-card';
            procCard.setAttribute('data-type', 'processes');
            cpuSection.querySelector('.system-cards-grid').appendChild(procCard);
        }

        let html = `
            <div class="system-card-header">
                <span>Top Processes</span>
                <span style="font-size:10px; color:#8b949e">Sorted by Memory</span>
            </div>
            <div class="process-table-header">
                <span style="flex:2">Name</span>
                <span style="flex:1">PID</span>
                <span style="flex:1">CPU</span>
                <span style="flex:1">Mem</span>
            </div>
            <div class="process-list">
        `;
        
        processes.sort((a, b) => parseFloat(b.mem) - parseFloat(a.mem)); // Sort by MEM
        
        processes.slice(0, 8).forEach(proc => {
            html += `
                <div class="process-item-row">
                    <span class="proc-name" title="${proc.name}">${proc.name}</span>
                    <span class="proc-pid">${proc.pid}</span>
                    <span class="proc-cpu">${proc.cpu}%</span>
                    <span class="proc-mem">${proc.mem}MB</span>
                </div>
            `;
        });
        
        html += `</div>`;
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
