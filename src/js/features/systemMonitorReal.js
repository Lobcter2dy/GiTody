/**
 * System Monitor Real - Мониторинг системы
 * По умолчанию ВЫКЛЮЧЕН - запускается вручную
 */

class SystemMonitorReal {
    constructor() {
        this.monitoringActive = false;
        this.monitoringInterval = null;
        this.updateInterval = 2000;
        this.isInitialized = false;
        this.history = {
            cpu: [],
            mem: [],
            maxLength: 60
        };
        this.lastUpdate = {};
        this.charts = {};
        this.currentProcesses = [];
        this.sortBy = 'mem';
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('[SystemMonitor] Готов к работе (выключен по умолчанию)');
        this.renderUI();
        this.addStyles();
    }

    renderUI() {
        const container = document.getElementById('settings-system');
        if (!container) return;

        container.innerHTML = `
            <div class="sysmon">
                <div class="sysmon-header">
                    <div class="sysmon-title">
                        <span class="sysmon-dot" id="statusDot"></span>
                        <span id="monitorStatus">Мониторинг выключен</span>
                    </div>
                    <div class="sysmon-controls">
                        <button class="sysmon-btn primary" onclick="systemMonitorReal.toggleMonitoring()" id="toggleBtn">
                            Включить
                        </button>
                        <button class="sysmon-btn" onclick="systemMonitorReal.updateAllData()" id="refreshBtn" disabled>
                            Обновить
                        </button>
                    </div>
                </div>

                <div class="sysmon-grid">
                    <div class="sysmon-card" id="cpuCard">
                        <div class="card-head">
                            <span class="card-label">CPU</span>
                            <span class="card-value" id="cpuLoad">—</span>
                        </div>
                        <div class="card-chart">
                            <canvas id="cpuChart" width="300" height="60"></canvas>
                        </div>
                        <div class="card-info">
                            <div class="info-row"><span>Модель</span><span id="cpuModel">—</span></div>
                            <div class="info-row"><span>Ядра</span><span id="cpuCores">—</span></div>
                            <div class="info-row"><span>Частота</span><span id="cpuSpeed">—</span></div>
                            <div class="info-row"><span>Температура</span><span id="cpuTemp">—</span></div>
                        </div>
                        <div class="core-grid" id="coreLoads"></div>
                    </div>

                    <div class="sysmon-card" id="memCard">
                        <div class="card-head">
                            <span class="card-label">RAM</span>
                            <span class="card-value" id="memPercent">—</span>
                        </div>
                        <div class="card-chart">
                            <canvas id="memChart" width="300" height="60"></canvas>
                        </div>
                        <div class="mem-bar-wrap">
                            <div class="mem-bar">
                                <div class="mem-used" id="memBar"></div>
                                <div class="mem-cached" id="memCacheBar"></div>
                            </div>
                        </div>
                        <div class="card-info">
                            <div class="info-row"><span>Используется</span><span id="memUsed">—</span></div>
                            <div class="info-row"><span>Всего</span><span id="memTotal">—</span></div>
                            <div class="info-row"><span>Доступно</span><span id="memAvailable">—</span></div>
                            <div class="info-row"><span>Swap</span><span id="memSwap">—</span></div>
                        </div>
                    </div>

                    <div class="sysmon-card" id="gpuCard">
                        <div class="card-head">
                            <span class="card-label">GPU</span>
                            <span class="card-value" id="gpuUsage">—</span>
                        </div>
                        <div class="gpu-model-box">
                            <div class="gpu-name" id="gpuModel">—</div>
                            <div class="gpu-vendor" id="gpuBrand">—</div>
                        </div>
                        <div class="card-info">
                            <div class="info-row"><span>VRAM</span><span id="gpuVram">—</span></div>
                            <div class="info-row"><span>Температура</span><span id="gpuTemp">—</span></div>
                            <div class="info-row"><span>VRAM использовано</span><span id="gpuMemUsage">—</span></div>
                            <div class="info-row"><span>Вентилятор</span><span id="gpuFan">—</span></div>
                        </div>
                    </div>

                    <div class="sysmon-card" id="diskCard">
                        <div class="card-head">
                            <span class="card-label">Диск</span>
                            <span class="card-value" id="diskPercent">—</span>
                        </div>
                        <div class="disk-io">
                            <div class="io-item">
                                <span class="io-label">Чтение</span>
                                <span class="io-val" id="diskRead">—</span>
                            </div>
                            <div class="io-item">
                                <span class="io-label">Запись</span>
                                <span class="io-val" id="diskWrite">—</span>
                            </div>
                        </div>
                        <div class="card-info">
                            <div class="info-row"><span>Используется</span><span id="diskUsed">—</span></div>
                            <div class="info-row"><span>Всего</span><span id="diskTotal">—</span></div>
                        </div>
                        <div class="volumes" id="volumesList"></div>
                    </div>
                </div>

                <div class="sysmon-section">
                    <div class="section-head">
                        <span class="section-title">Система</span>
                    </div>
                    <div class="os-grid">
                        <div class="os-item"><span class="os-lbl">ОС</span><span class="os-val" id="osName">—</span></div>
                        <div class="os-item"><span class="os-lbl">Версия</span><span class="os-val" id="osVersion">—</span></div>
                        <div class="os-item"><span class="os-lbl">Ядро</span><span class="os-val" id="osKernel">—</span></div>
                        <div class="os-item"><span class="os-lbl">Архитектура</span><span class="os-val" id="osArch">—</span></div>
                        <div class="os-item"><span class="os-lbl">Хост</span><span class="os-val" id="osHostname">—</span></div>
                        <div class="os-item"><span class="os-lbl">Uptime</span><span class="os-val mono" id="osUptime">—</span></div>
                    </div>
                </div>

                <div class="sysmon-section">
                    <div class="section-head">
                        <span class="section-title">Процессы</span>
                        <span class="section-count" id="processCount">0</span>
                    </div>
                    <div class="proc-controls">
                        <input type="text" class="proc-search" placeholder="Поиск..." id="processSearch" oninput="systemMonitorReal.filterProcesses(this.value)">
                        <select id="processSortSelect" class="proc-sort" onchange="systemMonitorReal.sortProcesses(this.value)">
                            <option value="mem">RAM ↓</option>
                            <option value="cpu">CPU ↓</option>
                            <option value="name">Имя</option>
                            <option value="pid">PID</option>
                        </select>
                    </div>
                    <div class="proc-table">
                        <div class="proc-head">
                            <div class="col-name">Процесс</div>
                            <div class="col-pid">PID</div>
                            <div class="col-cpu">CPU</div>
                            <div class="col-mem">RAM</div>
                            <div class="col-user">User</div>
                            <div class="col-state">Статус</div>
                        </div>
                        <div class="proc-list" id="processList">
                            <div class="proc-empty">Включите мониторинг</div>
                        </div>
                    </div>
                </div>

                <div class="sysmon-section">
                    <div class="section-head">
                        <span class="section-title">Драйверы</span>
                        <button class="sysmon-btn sm" onclick="systemMonitorReal.checkForUpdates()">Проверить</button>
                    </div>
                    <div class="drivers-list" id="driversList">
                        <div class="proc-empty">Включите мониторинг</div>
                    </div>
                </div>
            </div>
        `;

        this.initCharts();
    }

    addStyles() {
        if (document.getElementById('sysmon-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'sysmon-styles';
        style.textContent = `
            .sysmon {
                padding: 16px;
                max-width: 1200px;
                margin: 0 auto;
            }

            .sysmon-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: rgba(22, 27, 34, 0.8);
                border: 1px solid rgba(48, 54, 61, 0.8);
                border-radius: 6px;
                margin-bottom: 16px;
            }

            .sysmon-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #8b949e;
            }

            .sysmon-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #484f58;
            }

            .sysmon-dot.active {
                background: #3fb950;
                box-shadow: 0 0 8px rgba(63, 185, 80, 0.4);
            }

            .sysmon-controls {
                display: flex;
                gap: 8px;
            }

            .sysmon-btn {
                padding: 5px 12px;
                font-size: 12px;
                font-weight: 500;
                color: #c9d1d9;
                background: rgba(110, 118, 129, 0.1);
                border: 1px solid rgba(48, 54, 61, 0.8);
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.15s, border-color 0.15s;
            }

            .sysmon-btn:hover:not(:disabled) {
                background: rgba(110, 118, 129, 0.2);
                border-color: #8b949e;
            }

            .sysmon-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .sysmon-btn.primary {
                background: rgba(35, 134, 54, 0.15);
                border-color: rgba(63, 185, 80, 0.4);
                color: #3fb950;
            }

            .sysmon-btn.primary:hover {
                background: rgba(35, 134, 54, 0.25);
            }

            .sysmon-btn.sm {
                padding: 4px 10px;
                font-size: 11px;
            }

            .sysmon-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                margin-bottom: 16px;
            }

            @media (max-width: 900px) {
                .sysmon-grid { grid-template-columns: 1fr; }
            }

            .sysmon-card {
                background: rgba(22, 27, 34, 0.8);
                border: 1px solid rgba(48, 54, 61, 0.8);
                border-radius: 6px;
                padding: 16px;
            }

            .card-head {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .card-label {
                font-size: 12px;
                font-weight: 600;
                color: #8b949e;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .card-value {
                font-size: 20px;
                font-weight: 600;
                color: #c9d1d9;
                font-family: 'SF Mono', 'Fira Code', monospace;
            }

            .card-chart {
                margin: 12px 0;
                background: rgba(13, 17, 23, 0.6);
                border-radius: 4px;
                overflow: hidden;
            }

            .card-info {
                display: grid;
                gap: 6px;
            }

            .info-row {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                padding: 4px 0;
                border-bottom: 1px solid rgba(48, 54, 61, 0.4);
            }

            .info-row span:first-child {
                color: #8b949e;
            }

            .info-row span:last-child {
                color: #c9d1d9;
                font-family: 'SF Mono', 'Fira Code', monospace;
            }

            .core-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
                margin-top: 12px;
            }

            .core-item {
                background: rgba(13, 17, 23, 0.6);
                border-radius: 4px;
                padding: 6px;
                text-align: center;
            }

            .core-lbl {
                font-size: 10px;
                color: #8b949e;
                display: block;
            }

            .core-bar {
                height: 3px;
                background: rgba(48, 54, 61, 0.6);
                border-radius: 2px;
                margin: 4px 0;
                overflow: hidden;
            }

            .core-fill {
                height: 100%;
                border-radius: 2px;
                transition: width 0.3s;
            }

            .core-val {
                font-size: 11px;
                font-weight: 600;
                font-family: 'SF Mono', 'Fira Code', monospace;
            }

            .mem-bar-wrap {
                margin: 12px 0;
            }

            .mem-bar {
                height: 6px;
                background: rgba(13, 17, 23, 0.6);
                border-radius: 3px;
                display: flex;
                overflow: hidden;
            }

            .mem-used {
                background: #58a6ff;
                transition: width 0.3s;
            }

            .mem-cached {
                background: rgba(88, 166, 255, 0.3);
                transition: width 0.3s;
            }

            .gpu-model-box {
                background: rgba(13, 17, 23, 0.6);
                border-radius: 4px;
                padding: 10px;
                margin: 12px 0;
            }

            .gpu-name {
                font-size: 13px;
                font-weight: 500;
                color: #c9d1d9;
            }

            .gpu-vendor {
                font-size: 11px;
                color: #8b949e;
                margin-top: 2px;
            }

            .disk-io {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin: 12px 0;
            }

            .io-item {
                background: rgba(13, 17, 23, 0.6);
                border-radius: 4px;
                padding: 10px;
                text-align: center;
            }

            .io-label {
                font-size: 10px;
                color: #8b949e;
                display: block;
                margin-bottom: 4px;
            }

            .io-val {
                font-size: 14px;
                font-weight: 600;
                color: #c9d1d9;
                font-family: 'SF Mono', 'Fira Code', monospace;
            }

            .volumes {
                margin-top: 12px;
                display: grid;
                gap: 6px;
            }

            .vol-item {
                display: grid;
                grid-template-columns: 60px 1fr 80px;
                gap: 8px;
                align-items: center;
                padding: 8px;
                background: rgba(13, 17, 23, 0.6);
                border-radius: 4px;
                font-size: 11px;
            }

            .vol-mount {
                color: #58a6ff;
                font-family: 'SF Mono', 'Fira Code', monospace;
            }

            .vol-bar {
                height: 4px;
                background: rgba(48, 54, 61, 0.6);
                border-radius: 2px;
                overflow: hidden;
            }

            .vol-fill {
                height: 100%;
                border-radius: 2px;
            }

            .vol-info {
                color: #8b949e;
                text-align: right;
                font-family: 'SF Mono', 'Fira Code', monospace;
            }

            .sysmon-section {
                background: rgba(22, 27, 34, 0.8);
                border: 1px solid rgba(48, 54, 61, 0.8);
                border-radius: 6px;
                padding: 16px;
                margin-bottom: 16px;
            }

            .section-head {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .section-title {
                font-size: 13px;
                font-weight: 600;
                color: #c9d1d9;
            }

            .section-count {
                background: rgba(56, 139, 253, 0.15);
                color: #58a6ff;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 500;
            }

            .os-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 10px;
            }

            .os-item {
                background: rgba(13, 17, 23, 0.6);
                border-radius: 4px;
                padding: 10px;
            }

            .os-lbl {
                font-size: 10px;
                color: #8b949e;
                display: block;
                margin-bottom: 4px;
            }

            .os-val {
                font-size: 12px;
                color: #c9d1d9;
            }

            .os-val.mono {
                font-family: 'SF Mono', 'Fira Code', monospace;
                color: #3fb950;
            }

            .proc-controls {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }

            .proc-search {
                flex: 1;
                padding: 6px 10px;
                background: rgba(13, 17, 23, 0.6);
                border: 1px solid rgba(48, 54, 61, 0.8);
                border-radius: 6px;
                color: #c9d1d9;
                font-size: 12px;
            }

            .proc-search:focus {
                outline: none;
                border-color: #58a6ff;
            }

            .proc-sort {
                padding: 6px 10px;
                background: rgba(13, 17, 23, 0.6);
                border: 1px solid rgba(48, 54, 61, 0.8);
                border-radius: 6px;
                color: #c9d1d9;
                font-size: 12px;
                cursor: pointer;
            }

            .proc-table {
                border-radius: 6px;
                overflow: hidden;
            }

            .proc-head {
                display: grid;
                grid-template-columns: 2fr 70px 70px 70px 100px 70px;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(13, 17, 23, 0.8);
                font-size: 11px;
                font-weight: 600;
                color: #8b949e;
                text-transform: uppercase;
            }

            .proc-list {
                max-height: 300px;
                overflow-y: auto;
            }

            .proc-row {
                display: grid;
                grid-template-columns: 2fr 70px 70px 70px 100px 70px;
                gap: 8px;
                padding: 8px 12px;
                font-size: 12px;
                border-bottom: 1px solid rgba(48, 54, 61, 0.3);
            }

            .proc-row:hover {
                background: rgba(48, 54, 61, 0.2);
            }

            .proc-row .col-name {
                color: #c9d1d9;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .proc-row .col-pid {
                color: #8b949e;
                font-family: 'SF Mono', 'Fira Code', monospace;
            }

            .cpu-tag {
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 600;
                font-family: 'SF Mono', 'Fira Code', monospace;
            }

            .state-tag {
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                text-transform: uppercase;
            }

            .state-tag.running {
                background: rgba(63, 185, 80, 0.15);
                color: #3fb950;
            }

            .state-tag.sleeping {
                background: rgba(88, 166, 255, 0.15);
                color: #58a6ff;
            }

            .proc-empty {
                padding: 24px;
                text-align: center;
                color: #8b949e;
                font-size: 12px;
            }

            .drivers-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                gap: 10px;
            }

            .drv-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                background: rgba(13, 17, 23, 0.6);
                border-radius: 6px;
                border-left: 2px solid #3fb950;
            }

            .drv-item.inactive {
                border-left-color: #484f58;
                opacity: 0.6;
            }

            .drv-info {
                flex: 1;
                min-width: 0;
            }

            .drv-name {
                font-size: 12px;
                color: #c9d1d9;
                font-weight: 500;
            }

            .drv-model {
                font-size: 11px;
                color: #8b949e;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .drv-type {
                padding: 2px 6px;
                background: rgba(48, 54, 61, 0.6);
                border-radius: 3px;
                font-size: 10px;
                color: #8b949e;
            }

            .sysmon-toast {
                position: fixed;
                bottom: 16px;
                right: 16px;
                padding: 10px 16px;
                border-radius: 6px;
                font-size: 13px;
                z-index: 10000;
                animation: toastIn 0.2s ease;
            }

            .sysmon-toast.success {
                background: rgba(35, 134, 54, 0.9);
                color: #fff;
            }

            .sysmon-toast.error {
                background: rgba(248, 81, 73, 0.9);
                color: #fff;
            }

            .sysmon-toast.info {
                background: rgba(56, 139, 253, 0.9);
                color: #fff;
            }

            .sysmon-toast.out {
                animation: toastOut 0.2s ease forwards;
            }

            @keyframes toastIn {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            @keyframes toastOut {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(20px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    initCharts() {
        const cpuCanvas = document.getElementById('cpuChart');
        if (cpuCanvas) {
            this.charts.cpu = { canvas: cpuCanvas, ctx: cpuCanvas.getContext('2d') };
        }
        const memCanvas = document.getElementById('memChart');
        if (memCanvas) {
            this.charts.mem = { canvas: memCanvas, ctx: memCanvas.getContext('2d') };
        }
    }

    drawChart(name, data, color) {
        const chart = this.charts[name];
        if (!chart?.ctx) return;

        const ctx = chart.ctx;
        const w = chart.canvas.width;
        const h = chart.canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(13, 17, 23, 0.6)';
        ctx.fillRect(0, 0, w, h);

        if (data.length < 2) return;

        const stepX = w / (this.history.maxLength - 1);
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, h);
        data.forEach((val, i) => {
            ctx.lineTo(i * stepX, h - (val / 100) * h * 0.9);
        });
        ctx.lineTo((data.length - 1) * stepX, h);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = i * stepX;
            const y = h - (val / 100) * h * 0.9;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    toggleMonitoring() {
        if (this.monitoringActive) {
            this.stopMonitoring();
        } else {
            this.startMonitoring();
        }
    }

    startMonitoring() {
        if (this.monitoringActive) return;
        this.monitoringActive = true;

        const dot = document.getElementById('statusDot');
        const status = document.getElementById('monitorStatus');
        const btn = document.getElementById('toggleBtn');
        const refreshBtn = document.getElementById('refreshBtn');

        if (dot) dot.classList.add('active');
        if (status) status.textContent = 'Мониторинг активен';
        if (btn) { btn.textContent = 'Выключить'; btn.classList.remove('primary'); }
        if (refreshBtn) refreshBtn.disabled = false;

        this.updateAllData();
        this.monitoringInterval = setInterval(() => this.updateAllData(), this.updateInterval);
        console.log('[SystemMonitor] Запущен');
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.monitoringActive = false;

        const dot = document.getElementById('statusDot');
        const status = document.getElementById('monitorStatus');
        const btn = document.getElementById('toggleBtn');
        const refreshBtn = document.getElementById('refreshBtn');

        if (dot) dot.classList.remove('active');
        if (status) status.textContent = 'Мониторинг выключен';
        if (btn) { btn.textContent = 'Включить'; btn.classList.add('primary'); }
        if (refreshBtn) refreshBtn.disabled = true;

        console.log('[SystemMonitor] Остановлен');
    }

    async updateAllData() {
        if (!window.ipcRenderer) {
            this.showToast('IPC недоступен', 'error');
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
            console.error('[SystemMonitor] Error:', e);
        }
    }

    updateCPU(data) {
        const load = parseFloat(data.load) || 0;
        this.history.cpu.push(load);
        if (this.history.cpu.length > this.history.maxLength) this.history.cpu.shift();

        this.setText('cpuLoad', `${load}%`);
        this.setText('cpuModel', data.brand || data.model || '—');
        this.setText('cpuCores', `${data.physicalCores || '—'} / ${data.cores || '—'}`);
        this.setText('cpuSpeed', `${data.speed || '—'} GHz`);
        this.setText('cpuTemp', data.temp > 0 ? `${data.temp}°C` : '—');

        const coreLoads = document.getElementById('coreLoads');
        if (coreLoads && data.coreLoads?.length) {
            coreLoads.innerHTML = data.coreLoads.slice(0, 8).map((l, i) => `
                <div class="core-item">
                    <span class="core-lbl">${i}</span>
                    <div class="core-bar"><div class="core-fill" style="width:${l}%;background:${this.getColor(parseFloat(l))}"></div></div>
                    <span class="core-val" style="color:${this.getColor(parseFloat(l))}">${l}%</span>
                </div>
            `).join('');
        }

        this.drawChart('cpu', this.history.cpu, '#3fb950');
        const el = document.getElementById('cpuLoad');
        if (el) el.style.color = this.getColor(load);
    }

    updateMemory(data) {
        const percent = parseFloat(data.percent) || 0;
        this.history.mem.push(percent);
        if (this.history.mem.length > this.history.maxLength) this.history.mem.shift();

        this.setText('memPercent', `${percent}%`);
        this.setText('memUsed', `${data.used} GB`);
        this.setText('memTotal', `${data.total} GB`);
        this.setText('memAvailable', `${data.available} GB`);
        this.setText('memSwap', `${data.swapUsed} / ${data.swapTotal} GB`);

        const memBar = document.getElementById('memBar');
        if (memBar) memBar.style.width = `${percent}%`;
        
        const cachePercent = (parseFloat(data.cached) / parseFloat(data.total)) * 100;
        const memCacheBar = document.getElementById('memCacheBar');
        if (memCacheBar) memCacheBar.style.width = `${Math.min(cachePercent, 100 - percent)}%`;

        this.drawChart('mem', this.history.mem, '#58a6ff');
        const el = document.getElementById('memPercent');
        if (el) el.style.color = this.getColor(percent);
    }

    updateDisk(data) {
        const percent = parseFloat(data.percent) || 0;
        this.setText('diskPercent', `${percent}%`);
        this.setText('diskUsed', `${data.used} GB`);
        this.setText('diskTotal', `${data.total} GB`);
        this.setText('diskRead', `${data.readSpeed || 0} MB/s`);
        this.setText('diskWrite', `${data.writeSpeed || 0} MB/s`);

        const volumesList = document.getElementById('volumesList');
        if (volumesList && data.volumes) {
            volumesList.innerHTML = data.volumes.slice(0, 4).map(v => `
                <div class="vol-item">
                    <span class="vol-mount">${v.mount}</span>
                    <div class="vol-bar"><div class="vol-fill" style="width:${v.percent}%;background:${this.getColor(parseFloat(v.percent))}"></div></div>
                    <span class="vol-info">${v.used}/${v.size}GB</span>
                </div>
            `).join('');
        }

        const el = document.getElementById('diskPercent');
        if (el) el.style.color = this.getColor(percent);
    }

    updateGPU(data) {
        const gpu = Array.isArray(data) ? data[0] : data;
        if (!gpu) return;

        this.setText('gpuModel', gpu.model || '—');
        this.setText('gpuBrand', gpu.brand || '—');
        this.setText('gpuVram', gpu.vram ? `${gpu.vram} MB` : '—');
        this.setText('gpuTemp', gpu.temperature ? `${gpu.temperature}°C` : '—');
        this.setText('gpuUsage', gpu.utilizationGpu ? `${gpu.utilizationGpu}%` : '—');
        this.setText('gpuMemUsage', gpu.utilizationMemory ? `${gpu.utilizationMemory}%` : '—');
        this.setText('gpuFan', gpu.fanSpeed ? `${gpu.fanSpeed}%` : '—');
    }

    updateOS(data) {
        this.setText('osName', `${data.distro || data.platform}`);
        this.setText('osVersion', data.release || '—');
        this.setText('osKernel', data.kernel || '—');
        this.setText('osArch', data.arch || '—');
        this.setText('osHostname', data.hostname || '—');

        const uptime = data.uptime || 0;
        const d = Math.floor(uptime / 86400);
        const h = Math.floor((uptime % 86400) / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        this.setText('osUptime', `${d}d ${h}h ${m}m`);
    }

    updateProcesses(processes) {
        this.currentProcesses = processes;
        this.renderProcesses(processes);
    }

    renderProcesses(processes) {
        const list = document.getElementById('processList');
        const countEl = document.getElementById('processCount');
        if (!list) return;

        if (countEl) countEl.textContent = processes.length;

        if (!processes.length) {
            list.innerHTML = '<div class="proc-empty">Нет данных</div>';
            return;
        }

        list.innerHTML = processes.slice(0, 20).map(p => `
            <div class="proc-row">
                <div class="col-name" title="${this.esc(p.name)}">${this.esc(p.name)}</div>
                <div class="col-pid">${p.pid}</div>
                <div class="col-cpu"><span class="cpu-tag" style="background:${this.getColor(parseFloat(p.cpu))}20;color:${this.getColor(parseFloat(p.cpu))}">${p.cpu}%</span></div>
                <div class="col-mem">${p.mem}%</div>
                <div class="col-user">${this.esc(p.user || '—')}</div>
                <div class="col-state"><span class="state-tag ${p.state === 'running' ? 'running' : 'sleeping'}">${p.state || '—'}</span></div>
            </div>
        `).join('');
    }

    sortProcesses(by) {
        if (!this.currentProcesses) return;
        const sorted = [...this.currentProcesses].sort((a, b) => {
            if (by === 'mem') return parseFloat(b.mem) - parseFloat(a.mem);
            if (by === 'cpu') return parseFloat(b.cpu) - parseFloat(a.cpu);
            if (by === 'name') return a.name.localeCompare(b.name);
            if (by === 'pid') return a.pid - b.pid;
            return 0;
        });
        this.renderProcesses(sorted);
    }

    filterProcesses(q) {
        if (!this.currentProcesses) return;
        const filtered = this.currentProcesses.filter(p => 
            p.name.toLowerCase().includes(q.toLowerCase()) || p.pid.toString().includes(q)
        );
        this.renderProcesses(filtered);
    }

    updateDrivers(drivers) {
        const list = document.getElementById('driversList');
        if (!list) return;

        if (!drivers?.length) {
            list.innerHTML = '<div class="proc-empty">Нет данных</div>';
            return;
        }

        list.innerHTML = drivers.map(d => `
            <div class="drv-item ${d.status === 'Активен' || d.status === 'Подключено' ? '' : 'inactive'}">
                <div class="drv-info">
                    <div class="drv-name">${this.esc(d.name)}</div>
                    <div class="drv-model">${this.esc(d.model)}</div>
                </div>
                <div class="drv-type">${d.type}</div>
            </div>
        `).join('');
    }

    async checkForUpdates() {
        this.showToast('Проверка драйверов...', 'info');
        try {
            const result = await window.ipcRenderer.invoke('check-driver-updates');
            this.showToast(result.hasUpdates ? 'Есть обновления' : 'Всё актуально', result.hasUpdates ? 'info' : 'success');
        } catch (e) {
            this.showToast('Ошибка проверки', 'error');
        }
    }

    getColor(v) {
        if (v < 50) return '#3fb950';
        if (v < 75) return '#d29922';
        return '#f85149';
    }

    setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    esc(t) {
        const d = document.createElement('div');
        d.textContent = t || '';
        return d.innerHTML;
    }

    showToast(msg, type = 'info') {
        const existing = document.querySelector('.sysmon-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `sysmon-toast ${type}`;
        toast.textContent = msg;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('out');
            setTimeout(() => toast.remove(), 200);
        }, 2500);
    }

    dispose() {
        this.stopMonitoring();
    }
}

export const systemMonitorReal = new SystemMonitorReal();
window.systemMonitorReal = systemMonitorReal;
