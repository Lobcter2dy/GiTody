/**
 * System Monitor Real - Реальный мониторинг системы в реальном времени
 * Использует systeminformation для получения реальных данных
 */

class SystemMonitorReal {
    constructor() {
        this.monitoringActive = false;
        this.monitoringInterval = null;
        this.updateInterval = 1500;
        this.history = {
            cpu: [],
            mem: [],
            disk: [],
            netRx: [],
            netTx: [],
            maxLength: 60
        };
        this.lastUpdate = {};
        this.charts = {};
    }

    init() {
        console.log('[SystemMonitor] Инициализация...');
        this.setupEventListeners();
        this.renderUI();
        this.startMonitoring();
        this.updateAllData();
    }

    setupEventListeners() {
        document.querySelectorAll('.settings-icon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSection(btn.dataset.section);
            });
        });
    }

    switchSection(section) {
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`settings-${section}`);
        if (target) target.classList.add('active');

        document.querySelectorAll('.settings-icon-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === section) btn.classList.add('active');
        });
    }

    renderUI() {
        const container = document.getElementById('settings-system');
        if (!container) return;

        container.innerHTML = `
            <div class="system-monitor-container">
                <!-- Верхняя панель статуса -->
                <div class="monitor-header">
                    <div class="monitor-status">
                        <span class="status-indicator active"></span>
                        <span id="monitorStatus">Мониторинг активен</span>
                    </div>
                    <div class="monitor-actions">
                        <button class="monitor-btn" onclick="systemMonitorReal.toggleMonitoring()" id="toggleMonitoring">⏸ Пауза</button>
                        <button class="monitor-btn" onclick="systemMonitorReal.updateAllData()">↻ Обновить</button>
                    </div>
                </div>

                <!-- Основные метрики -->
                <div class="metrics-grid">
                    <!-- CPU -->
                    <div class="metric-card cpu-card" id="cpuCard">
                        <div class="metric-header">
                            <span class="metric-icon">💻</span>
                            <span class="metric-title">CPU</span>
                            <span class="metric-value" id="cpuLoad">0%</span>
                        </div>
                        <div class="metric-chart">
                            <canvas id="cpuChart" width="300" height="80"></canvas>
                        </div>
                        <div class="metric-details" id="cpuDetails">
                            <div class="detail-row"><span>Ядра</span><span id="cpuCores">-</span></div>
                            <div class="detail-row"><span>Температура</span><span id="cpuTemp">-</span></div>
                            <div class="detail-row"><span>Частота</span><span id="cpuSpeed">-</span></div>
                        </div>
                        <div class="core-loads" id="coreLoads"></div>
                    </div>

                    <!-- Memory -->
                    <div class="metric-card memory-card" id="memoryCard">
                        <div class="metric-header">
                            <span class="metric-icon">🧠</span>
                            <span class="metric-title">Память</span>
                            <span class="metric-value" id="memPercent">0%</span>
                        </div>
                        <div class="metric-chart">
                            <canvas id="memChart" width="300" height="80"></canvas>
                        </div>
                        <div class="metric-details">
                            <div class="detail-row"><span>Используется</span><span id="memUsed">-</span></div>
                            <div class="detail-row"><span>Всего</span><span id="memTotal">-</span></div>
                            <div class="detail-row"><span>Swap</span><span id="memSwap">-</span></div>
                            <div class="detail-row"><span>Кэш</span><span id="memCached">-</span></div>
                        </div>
                        <div class="memory-bar-container">
                            <div class="memory-bar">
                                <div class="memory-used" id="memBar" style="width: 0%"></div>
                                <div class="memory-cached" id="memCacheBar" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- GPU -->
                    <div class="metric-card gpu-card" id="gpuCard">
                        <div class="metric-header">
                            <span class="metric-icon">🎮</span>
                            <span class="metric-title">GPU</span>
                            <span class="metric-value" id="gpuUsage">-</span>
                        </div>
                        <div class="metric-details">
                            <div class="detail-row"><span>Модель</span><span id="gpuModel">-</span></div>
                            <div class="detail-row"><span>Производитель</span><span id="gpuBrand">-</span></div>
                            <div class="detail-row"><span>VRAM</span><span id="gpuVram">-</span></div>
                            <div class="detail-row"><span>Температура</span><span id="gpuTemp">-</span></div>
                        </div>
                    </div>

                    <!-- Disk -->
                    <div class="metric-card disk-card" id="diskCard">
                        <div class="metric-header">
                            <span class="metric-icon">💾</span>
                            <span class="metric-title">Диск</span>
                            <span class="metric-value" id="diskPercent">0%</span>
                        </div>
                        <div class="metric-details">
                            <div class="detail-row"><span>Используется</span><span id="diskUsed">-</span></div>
                            <div class="detail-row"><span>Всего</span><span id="diskTotal">-</span></div>
                            <div class="detail-row"><span>Чтение</span><span id="diskRead">-</span></div>
                            <div class="detail-row"><span>Запись</span><span id="diskWrite">-</span></div>
                        </div>
                        <div class="volumes-list" id="volumesList"></div>
                    </div>
                </div>

                <!-- ОС Информация -->
                <div class="os-info-panel" id="osInfoPanel">
                    <div class="os-info-header">💻 Система</div>
                    <div class="os-info-grid">
                        <div class="os-item"><span>ОС</span><span id="osName">-</span></div>
                        <div class="os-item"><span>Версия</span><span id="osVersion">-</span></div>
                        <div class="os-item"><span>Ядро</span><span id="osKernel">-</span></div>
                        <div class="os-item"><span>Архитектура</span><span id="osArch">-</span></div>
                        <div class="os-item"><span>Uptime</span><span id="osUptime">-</span></div>
                        <div class="os-item"><span>Пользователи</span><span id="osUsers">-</span></div>
                        <div class="os-item" id="batteryItem" style="display:none"><span>Батарея</span><span id="osBattery">-</span></div>
                    </div>
                </div>

                <!-- Процессы -->
                <div class="processes-panel" id="processesPanel">
                    <div class="processes-header">
                        <span>⏱ Процессы</span>
                        <div class="process-sort">
                            <select id="processSortSelect" onchange="systemMonitorReal.sortProcesses(this.value)">
                                <option value="mem">По памяти</option>
                                <option value="cpu">По CPU</option>
                                <option value="name">По имени</option>
                            </select>
                        </div>
                    </div>
                    <div class="processes-table">
                        <div class="process-table-header">
                            <div class="col-name">Имя</div>
                            <div class="col-pid">PID</div>
                            <div class="col-cpu">CPU</div>
                            <div class="col-mem">RAM</div>
                            <div class="col-user">Пользователь</div>
                        </div>
                        <div class="process-list" id="processList"></div>
                    </div>
                </div>

                <!-- Драйверы -->
                <div class="drivers-panel" id="driversPanel">
                    <div class="drivers-header">
                        <span>⚙️ Драйверы и устройства</span>
                        <button class="check-updates-btn" onclick="systemMonitorReal.checkForUpdates()">Проверить обновления</button>
                    </div>
                    <div class="drivers-list" id="driversList"></div>
                </div>
            </div>
        `;

        this.initCharts();
    }

    initCharts() {
        // CPU Chart
        const cpuCanvas = document.getElementById('cpuChart');
        if (cpuCanvas) {
            this.charts.cpu = {
                canvas: cpuCanvas,
                ctx: cpuCanvas.getContext('2d')
            };
        }

        // Memory Chart
        const memCanvas = document.getElementById('memChart');
        if (memCanvas) {
            this.charts.mem = {
                canvas: memCanvas,
                ctx: memCanvas.getContext('2d')
            };
        }
    }

    drawChart(chartName, data, color) {
        const chart = this.charts[chartName];
        if (!chart || !chart.ctx) return;

        const ctx = chart.ctx;
        const w = chart.canvas.width;
        const h = chart.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Фон
        ctx.fillStyle = 'rgba(30, 30, 40, 0.5)';
        ctx.fillRect(0, 0, w, h);

        // Сетка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const y = (h / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        if (data.length < 2) return;

        const maxVal = Math.max(...data, 100);
        const stepX = w / (this.history.maxLength - 1);

        // Заливка под графиком
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, h);
        data.forEach((val, i) => {
            const x = i * stepX;
            const y = h - (val / maxVal) * h * 0.9;
            if (i === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo((data.length - 1) * stepX, h);
        ctx.closePath();
        ctx.fill();

        // Линия графика
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = i * stepX;
            const y = h - (val / maxVal) * h * 0.9;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    async updateAllData() {
        if (!window.ipcRenderer) {
            console.warn('[SystemMonitor] IPC not available');
            return;
        }

        try {
            const [cpu, mem, disk, gpu, osInfo, processes, drivers] = await Promise.all([
                window.ipcRenderer.invoke('get-cpu-info').catch(() => null),
                window.ipcRenderer.invoke('get-memory-info').catch(() => null),
                window.ipcRenderer.invoke('get-disk-info').catch(() => null),
                window.ipcRenderer.invoke('get-gpu-info').catch(() => null),
                window.ipcRenderer.invoke('get-os-info').catch(() => null),
                window.ipcRenderer.invoke('get-processes').catch(() => null),
                window.ipcRenderer.invoke('get-drivers-info').catch(() => null)
            ]);

            if (cpu) this.updateCPU(cpu);
            if (mem) this.updateMemory(mem);
            if (disk) this.updateDisk(disk);
            if (gpu) this.updateGPU(gpu);
            if (osInfo) this.updateOS(osInfo);
            if (processes) this.updateProcesses(processes);
            if (drivers) this.updateDrivers(drivers);

        } catch (e) {
            console.error('[SystemMonitor] Update error:', e);
        }
    }

    updateCPU(data) {
        const load = parseFloat(data.load) || 0;
        
        // Обновить историю
        this.history.cpu.push(load);
        if (this.history.cpu.length > this.history.maxLength) {
            this.history.cpu.shift();
        }

        // UI
        this.setText('cpuLoad', `${load}%`);
        this.setText('cpuCores', `${data.physicalCores || data.cores} / ${data.cores}`);
        this.setText('cpuTemp', `${data.temp}°C`);
        this.setText('cpuSpeed', `${data.speed || '-'} GHz`);

        // Загрузка ядер
        const coreLoadsEl = document.getElementById('coreLoads');
        if (coreLoadsEl && data.coreLoads) {
            coreLoadsEl.innerHTML = data.coreLoads.slice(0, 8).map((load, i) => `
                <div class="core-load-item">
                    <span class="core-label">Я${i}</span>
                    <div class="core-bar">
                        <div class="core-fill" style="width: ${load}%; background: ${this.getLoadColor(load)}"></div>
                    </div>
                    <span class="core-value">${load}%</span>
                </div>
            `).join('');
        }

        // График
        this.drawChart('cpu', this.history.cpu, '#4ade80');
        
        // Цвет карточки
        const card = document.getElementById('cpuCard');
        if (card) {
            card.style.borderColor = this.getLoadColor(load);
        }

        this.lastUpdate.cpu = data;
    }

    updateMemory(data) {
        const percent = parseFloat(data.percent) || 0;
        
        this.history.mem.push(percent);
        if (this.history.mem.length > this.history.maxLength) {
            this.history.mem.shift();
        }

        this.setText('memPercent', `${percent}%`);
        this.setText('memUsed', `${data.used} GB`);
        this.setText('memTotal', `${data.total} GB`);
        this.setText('memSwap', `${data.swapUsed} / ${data.swapTotal} GB`);
        this.setText('memCached', `${data.cached || 0} GB`);

        // Прогресс-бар
        const memBar = document.getElementById('memBar');
        if (memBar) memBar.style.width = `${percent}%`;
        
        const cachePercent = (parseFloat(data.cached) / parseFloat(data.total)) * 100;
        const memCacheBar = document.getElementById('memCacheBar');
        if (memCacheBar) memCacheBar.style.width = `${cachePercent}%`;

        this.drawChart('mem', this.history.mem, '#60a5fa');

        const card = document.getElementById('memoryCard');
        if (card) {
            card.style.borderColor = this.getLoadColor(percent);
        }

        this.lastUpdate.mem = data;
    }

    updateDisk(data) {
        const percent = parseFloat(data.percent) || 0;
        
        this.history.disk.push(percent);
        if (this.history.disk.length > this.history.maxLength) {
            this.history.disk.shift();
        }

        this.setText('diskPercent', `${percent}%`);
        this.setText('diskUsed', `${data.used} GB`);
        this.setText('diskTotal', `${data.total} GB`);
        this.setText('diskRead', `${data.readSpeed || 0} MB/s`);
        this.setText('diskWrite', `${data.writeSpeed || 0} MB/s`);

        // Тома
        const volumesList = document.getElementById('volumesList');
        if (volumesList && data.volumes) {
            volumesList.innerHTML = data.volumes.slice(0, 4).map(v => `
                <div class="volume-item">
                    <span class="volume-mount">${v.mount}</span>
                    <div class="volume-bar">
                        <div class="volume-fill" style="width: ${v.percent}%"></div>
                    </div>
                    <span class="volume-info">${v.used}/${v.size} GB</span>
                </div>
            `).join('');
        }

        this.lastUpdate.disk = data;
    }

    updateGPU(data) {
        const gpu = Array.isArray(data) ? data[0] : data;
        if (!gpu) return;

        this.setText('gpuModel', gpu.model || '-');
        this.setText('gpuBrand', gpu.brand || '-');
        this.setText('gpuVram', gpu.vram ? `${gpu.vram} MB` : '-');
        this.setText('gpuTemp', gpu.temperature ? `${gpu.temperature}°C` : '-');
        this.setText('gpuUsage', gpu.utilizationGpu ? `${gpu.utilizationGpu}%` : '-');

        this.lastUpdate.gpu = data;
    }

    updateOS(data) {
        this.setText('osName', `${data.platform} ${data.distro}`);
        this.setText('osVersion', data.release || '-');
        this.setText('osKernel', data.kernel || '-');
        this.setText('osArch', data.arch || '-');
        this.setText('osUsers', data.users || '-');

        // Uptime
        const uptimeSec = data.uptime || 0;
        const days = Math.floor(uptimeSec / 86400);
        const hours = Math.floor((uptimeSec % 86400) / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        this.setText('osUptime', `${days}д ${hours}ч ${mins}м`);

        // Батарея
        if (data.hasBattery) {
            const batteryItem = document.getElementById('batteryItem');
            if (batteryItem) batteryItem.style.display = 'flex';
            this.setText('osBattery', `${data.batteryPercent}% ${data.isCharging ? '⚡' : ''}`);
        }

        this.lastUpdate.os = data;
    }

    updateProcesses(processes) {
        const list = document.getElementById('processList');
        if (!list) return;

        this.currentProcesses = processes;

        list.innerHTML = processes.slice(0, 15).map(p => `
            <div class="process-row">
                <div class="col-name" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</div>
                <div class="col-pid">${p.pid}</div>
                <div class="col-cpu">
                    <span class="cpu-badge" style="background: ${this.getLoadColor(parseFloat(p.cpu))}">${p.cpu}%</span>
                </div>
                <div class="col-mem">${p.mem}%</div>
                <div class="col-user">${this.escapeHtml(p.user || '-')}</div>
            </div>
        `).join('');

        this.lastUpdate.processes = processes;
    }

    sortProcesses(by) {
        if (!this.currentProcesses) return;
        
        const sorted = [...this.currentProcesses].sort((a, b) => {
            if (by === 'mem') return parseFloat(b.mem) - parseFloat(a.mem);
            if (by === 'cpu') return parseFloat(b.cpu) - parseFloat(a.cpu);
            if (by === 'name') return a.name.localeCompare(b.name);
            return 0;
        });
        
        this.updateProcesses(sorted);
    }

    updateDrivers(drivers) {
        const list = document.getElementById('driversList');
        if (!list) return;

        list.innerHTML = drivers.map(d => `
            <div class="driver-item ${d.status === 'Активен' ? 'active' : 'inactive'}">
                <div class="driver-icon">${this.getDriverIcon(d.type)}</div>
                <div class="driver-info">
                    <div class="driver-name">${this.escapeHtml(d.name)}</div>
                    <div class="driver-model">${this.escapeHtml(d.model)}</div>
                </div>
                <div class="driver-type">${d.type}</div>
                <div class="driver-status ${d.status === 'Активен' ? 'active' : ''}">${d.status}</div>
                <div class="driver-actions">
                    <button class="driver-btn" onclick="systemMonitorReal.updateDriver('${d.id}')" title="Обновить">↻</button>
                </div>
            </div>
        `).join('');

        this.lastUpdate.drivers = drivers;
    }

    getDriverIcon(type) {
        const icons = {
            'GPU': '🎮',
            'Network': '🌐',
            'USB': '🔌',
            'Audio': '🔊',
            'System': '⚙️'
        };
        return icons[type] || '📦';
    }

    getLoadColor(load) {
        if (load < 50) return '#4ade80';
        if (load < 75) return '#fbbf24';
        return '#f87171';
    }

    setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    async updateDriver(driverId) {
        try {
            const result = await window.ipcRenderer.invoke('update-driver', driverId);
            this.showNotification(result.message, result.success ? 'success' : 'error');
        } catch (e) {
            this.showNotification('Ошибка обновления', 'error');
        }
    }

    async checkForUpdates() {
        try {
            this.showNotification('Проверка обновлений...', 'info');
            const result = await window.ipcRenderer.invoke('check-driver-updates');
            
            if (result.hasUpdates) {
                this.showNotification('Доступны обновления', 'warning');
            } else {
                this.showNotification('Все драйверы актуальны', 'success');
            }
            
            if (result.updates) {
                this.updateDrivers(result.updates);
            }
        } catch (e) {
            this.showNotification('Ошибка проверки', 'error');
        }
    }

    toggleMonitoring() {
        if (this.monitoringActive) {
            this.stopMonitoring();
            this.setText('monitorStatus', 'Мониторинг остановлен');
            const btn = document.getElementById('toggleMonitoring');
            if (btn) btn.textContent = '▶ Запустить';
        } else {
            this.startMonitoring();
            this.setText('monitorStatus', 'Мониторинг активен');
            const btn = document.getElementById('toggleMonitoring');
            if (btn) btn.textContent = '⏸ Пауза';
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

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.system-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `system-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    dispose() {
        this.stopMonitoring();
    }
}

export const systemMonitorReal = new SystemMonitorReal();
window.systemMonitorReal = systemMonitorReal;
