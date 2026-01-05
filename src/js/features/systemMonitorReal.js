/**
 * System Monitor Real - Продвинутый мониторинг системы
 * Реальные данные через systeminformation
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
        this.currentProcesses = [];
        this.sortBy = 'mem';
    }

    init() {
        console.log('[SystemMonitor] Инициализация...');
        this.renderUI();
        this.initCharts();
        this.startMonitoring();
        this.updateAllData();
    }

    renderUI() {
        const container = document.getElementById('settings-system');
        if (!container) return;

        container.innerHTML = `
            <div class="system-monitor-container">
                <!-- Заголовок с управлением -->
                <div class="monitor-header">
                    <div class="monitor-status">
                        <span class="status-indicator active" id="statusIndicator"></span>
                        <span id="monitorStatus">Мониторинг активен</span>
                    </div>
                    <div class="monitor-actions">
                        <button class="monitor-btn" onclick="systemMonitorReal.toggleMonitoring()" id="toggleMonitoring">
                            <span class="btn-icon">⏸</span> Пауза
                        </button>
                        <button class="monitor-btn" onclick="systemMonitorReal.updateAllData()">
                            <span class="btn-icon">↻</span> Обновить
                        </button>
                    </div>
                </div>

                <!-- Сетка метрик -->
                <div class="metrics-grid">
                    <!-- CPU Card -->
                    <div class="metric-card cpu-card" id="cpuCard">
                        <div class="metric-header">
                            <div class="metric-title-row">
                                <span class="metric-icon">💻</span>
                                <span class="metric-title">Процессор</span>
                            </div>
                            <span class="metric-value" id="cpuLoad">0%</span>
                        </div>
                        <div class="metric-chart-container">
                            <canvas id="cpuChart" width="280" height="70"></canvas>
                        </div>
                        <div class="metric-details">
                            <div class="detail-row"><span>Модель</span><span id="cpuModel" class="detail-value">-</span></div>
                            <div class="detail-row"><span>Ядра</span><span id="cpuCores" class="detail-value">-</span></div>
                            <div class="detail-row"><span>Частота</span><span id="cpuSpeed" class="detail-value">-</span></div>
                            <div class="detail-row"><span>Температура</span><span id="cpuTemp" class="detail-value temp">-</span></div>
                        </div>
                        <div class="core-loads" id="coreLoads"></div>
                    </div>

                    <!-- Memory Card -->
                    <div class="metric-card memory-card" id="memoryCard">
                        <div class="metric-header">
                            <div class="metric-title-row">
                                <span class="metric-icon">🧠</span>
                                <span class="metric-title">Память</span>
                            </div>
                            <span class="metric-value" id="memPercent">0%</span>
                        </div>
                        <div class="metric-chart-container">
                            <canvas id="memChart" width="280" height="70"></canvas>
                        </div>
                        <div class="memory-bar-wrapper">
                            <div class="memory-bar">
                                <div class="memory-used" id="memBar" style="width: 0%"></div>
                                <div class="memory-cached" id="memCacheBar" style="width: 0%"></div>
                            </div>
                            <div class="memory-legend">
                                <span><i class="legend-dot used"></i>Используется</span>
                                <span><i class="legend-dot cached"></i>Кэш</span>
                            </div>
                        </div>
                        <div class="metric-details">
                            <div class="detail-row"><span>Используется</span><span id="memUsed" class="detail-value">-</span></div>
                            <div class="detail-row"><span>Всего</span><span id="memTotal" class="detail-value">-</span></div>
                            <div class="detail-row"><span>Доступно</span><span id="memAvailable" class="detail-value">-</span></div>
                            <div class="detail-row"><span>Swap</span><span id="memSwap" class="detail-value">-</span></div>
                        </div>
                    </div>

                    <!-- GPU Card -->
                    <div class="metric-card gpu-card" id="gpuCard">
                        <div class="metric-header">
                            <div class="metric-title-row">
                                <span class="metric-icon">🎮</span>
                                <span class="metric-title">Видеокарта</span>
                            </div>
                            <span class="metric-value" id="gpuUsage">-</span>
                        </div>
                        <div class="gpu-info-main">
                            <div class="gpu-model" id="gpuModel">-</div>
                            <div class="gpu-brand" id="gpuBrand">-</div>
                        </div>
                        <div class="metric-details">
                            <div class="detail-row"><span>VRAM</span><span id="gpuVram" class="detail-value">-</span></div>
                            <div class="detail-row"><span>Температура</span><span id="gpuTemp" class="detail-value temp">-</span></div>
                            <div class="detail-row"><span>Использование VRAM</span><span id="gpuMemUsage" class="detail-value">-</span></div>
                            <div class="detail-row"><span>Вентилятор</span><span id="gpuFan" class="detail-value">-</span></div>
                        </div>
                    </div>

                    <!-- Disk Card -->
                    <div class="metric-card disk-card" id="diskCard">
                        <div class="metric-header">
                            <div class="metric-title-row">
                                <span class="metric-icon">💾</span>
                                <span class="metric-title">Хранилище</span>
                            </div>
                            <span class="metric-value" id="diskPercent">0%</span>
                        </div>
                        <div class="disk-io-stats">
                            <div class="io-stat read">
                                <span class="io-icon">📖</span>
                                <span class="io-label">Чтение</span>
                                <span class="io-value" id="diskRead">0 MB/s</span>
                            </div>
                            <div class="io-stat write">
                                <span class="io-icon">✏️</span>
                                <span class="io-label">Запись</span>
                                <span class="io-value" id="diskWrite">0 MB/s</span>
                            </div>
                        </div>
                        <div class="metric-details">
                            <div class="detail-row"><span>Используется</span><span id="diskUsed" class="detail-value">-</span></div>
                            <div class="detail-row"><span>Всего</span><span id="diskTotal" class="detail-value">-</span></div>
                        </div>
                        <div class="volumes-list" id="volumesList"></div>
                    </div>
                </div>

                <!-- Информация об ОС -->
                <div class="os-info-panel" id="osInfoPanel">
                    <div class="os-info-header">
                        <span class="os-icon">🖥️</span>
                        <span>Информация о системе</span>
                    </div>
                    <div class="os-info-grid">
                        <div class="os-item">
                            <span class="os-label">Операционная система</span>
                            <span class="os-value" id="osName">-</span>
                        </div>
                        <div class="os-item">
                            <span class="os-label">Версия</span>
                            <span class="os-value" id="osVersion">-</span>
                        </div>
                        <div class="os-item">
                            <span class="os-label">Ядро</span>
                            <span class="os-value" id="osKernel">-</span>
                        </div>
                        <div class="os-item">
                            <span class="os-label">Архитектура</span>
                            <span class="os-value" id="osArch">-</span>
                        </div>
                        <div class="os-item">
                            <span class="os-label">Имя хоста</span>
                            <span class="os-value" id="osHostname">-</span>
                        </div>
                        <div class="os-item">
                            <span class="os-label">Время работы</span>
                            <span class="os-value uptime" id="osUptime">-</span>
                        </div>
                        <div class="os-item" id="batteryItem" style="display:none">
                            <span class="os-label">Батарея</span>
                            <span class="os-value" id="osBattery">-</span>
                        </div>
                    </div>
                </div>

                <!-- Процессы -->
                <div class="processes-panel" id="processesPanel">
                    <div class="processes-header">
                        <div class="processes-title">
                            <span class="processes-icon">⚡</span>
                            <span>Процессы</span>
                            <span class="process-count" id="processCount">0</span>
                        </div>
                        <div class="process-controls">
                            <input type="text" class="process-search" placeholder="Поиск..." id="processSearch" oninput="systemMonitorReal.filterProcesses(this.value)">
                            <select id="processSortSelect" onchange="systemMonitorReal.sortProcesses(this.value)">
                                <option value="mem">По памяти ↓</option>
                                <option value="cpu">По CPU ↓</option>
                                <option value="name">По имени</option>
                                <option value="pid">По PID</option>
                            </select>
                        </div>
                    </div>
                    <div class="processes-table">
                        <div class="process-table-header">
                            <div class="col-name">Процесс</div>
                            <div class="col-pid">PID</div>
                            <div class="col-cpu">CPU</div>
                            <div class="col-mem">RAM</div>
                            <div class="col-user">Пользователь</div>
                            <div class="col-state">Статус</div>
                        </div>
                        <div class="process-list" id="processList">
                            <div class="loading-processes">Загрузка процессов...</div>
                        </div>
                    </div>
                </div>

                <!-- Драйверы -->
                <div class="drivers-panel" id="driversPanel">
                    <div class="drivers-header">
                        <div class="drivers-title">
                            <span class="drivers-icon">⚙️</span>
                            <span>Драйверы и устройства</span>
                        </div>
                        <button class="check-updates-btn" onclick="systemMonitorReal.checkForUpdates()">
                            <span>🔍</span> Проверить обновления
                        </button>
                    </div>
                    <div class="drivers-grid" id="driversList">
                        <div class="loading-drivers">Загрузка драйверов...</div>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
    }

    addStyles() {
        if (document.getElementById('system-monitor-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'system-monitor-styles';
        style.textContent = `
            .system-monitor-container {
                padding: 20px;
                max-width: 1400px;
                margin: 0 auto;
            }
            
            .monitor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding: 15px 20px;
                background: linear-gradient(135deg, rgba(40, 40, 50, 0.9), rgba(30, 30, 40, 0.9));
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .monitor-status {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                color: #e0e0e0;
            }
            
            .status-indicator {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #666;
            }
            
            .status-indicator.active {
                background: #4ade80;
                box-shadow: 0 0 10px #4ade80;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .monitor-actions {
                display: flex;
                gap: 10px;
            }
            
            .monitor-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: #e0e0e0;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            
            .monitor-btn:hover {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.3);
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 20px;
            }
            
            @media (max-width: 1200px) {
                .metrics-grid {
                    grid-template-columns: 1fr;
                }
            }
            
            .metric-card {
                background: linear-gradient(145deg, rgba(35, 35, 45, 0.95), rgba(25, 25, 35, 0.95));
                border-radius: 16px;
                padding: 20px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                transition: all 0.3s ease;
            }
            
            .metric-card:hover {
                border-color: rgba(255, 255, 255, 0.15);
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .metric-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .metric-title-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .metric-icon {
                font-size: 24px;
            }
            
            .metric-title {
                font-size: 16px;
                font-weight: 600;
                color: #fff;
            }
            
            .metric-value {
                font-size: 28px;
                font-weight: 700;
                color: #4ade80;
                font-family: 'JetBrains Mono', monospace;
            }
            
            .metric-chart-container {
                margin: 15px 0;
                border-radius: 8px;
                overflow: hidden;
                background: rgba(0, 0, 0, 0.2);
            }
            
            .metric-details {
                display: grid;
                gap: 8px;
                margin-top: 15px;
            }
            
            .detail-row {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                padding: 6px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .detail-row span:first-child {
                color: #888;
            }
            
            .detail-value {
                color: #e0e0e0;
                font-family: 'JetBrains Mono', monospace;
            }
            
            .detail-value.temp {
                color: #fbbf24;
            }
            
            .core-loads {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                margin-top: 15px;
            }
            
            .core-load-item {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                padding: 8px;
                text-align: center;
            }
            
            .core-label {
                font-size: 11px;
                color: #888;
                display: block;
            }
            
            .core-bar {
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                margin: 5px 0;
                overflow: hidden;
            }
            
            .core-fill {
                height: 100%;
                border-radius: 2px;
                transition: width 0.3s ease;
            }
            
            .core-value {
                font-size: 12px;
                font-weight: 600;
                font-family: 'JetBrains Mono', monospace;
            }
            
            .memory-bar-wrapper {
                margin: 15px 0;
            }
            
            .memory-bar {
                height: 8px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                overflow: hidden;
                display: flex;
            }
            
            .memory-used {
                background: linear-gradient(90deg, #60a5fa, #3b82f6);
                transition: width 0.3s ease;
            }
            
            .memory-cached {
                background: rgba(96, 165, 250, 0.3);
                transition: width 0.3s ease;
            }
            
            .memory-legend {
                display: flex;
                gap: 15px;
                margin-top: 8px;
                font-size: 11px;
                color: #888;
            }
            
            .legend-dot {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 2px;
                margin-right: 5px;
            }
            
            .legend-dot.used {
                background: #60a5fa;
            }
            
            .legend-dot.cached {
                background: rgba(96, 165, 250, 0.3);
            }
            
            .gpu-info-main {
                margin: 15px 0;
                padding: 12px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
            }
            
            .gpu-model {
                font-size: 15px;
                font-weight: 600;
                color: #fff;
            }
            
            .gpu-brand {
                font-size: 12px;
                color: #888;
                margin-top: 4px;
            }
            
            .disk-io-stats {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin: 15px 0;
            }
            
            .io-stat {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 10px;
                padding: 12px;
                text-align: center;
            }
            
            .io-stat.read {
                border-left: 3px solid #4ade80;
            }
            
            .io-stat.write {
                border-left: 3px solid #f97316;
            }
            
            .io-icon {
                font-size: 18px;
            }
            
            .io-label {
                display: block;
                font-size: 11px;
                color: #888;
                margin: 4px 0;
            }
            
            .io-value {
                font-size: 16px;
                font-weight: 600;
                font-family: 'JetBrains Mono', monospace;
                color: #e0e0e0;
            }
            
            .volumes-list {
                margin-top: 15px;
                display: grid;
                gap: 8px;
            }
            
            .volume-item {
                display: grid;
                grid-template-columns: auto 1fr auto;
                gap: 10px;
                align-items: center;
                padding: 10px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                font-size: 12px;
            }
            
            .volume-mount {
                color: #60a5fa;
                font-weight: 500;
                font-family: 'JetBrains Mono', monospace;
            }
            
            .volume-bar {
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
            }
            
            .volume-fill {
                height: 100%;
                background: linear-gradient(90deg, #4ade80, #22c55e);
                border-radius: 3px;
            }
            
            .volume-info {
                color: #888;
                font-family: 'JetBrains Mono', monospace;
                white-space: nowrap;
            }
            
            .os-info-panel {
                background: linear-gradient(145deg, rgba(35, 35, 45, 0.95), rgba(25, 25, 35, 0.95));
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid rgba(255, 255, 255, 0.08);
            }
            
            .os-info-header {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                font-weight: 600;
                color: #fff;
                margin-bottom: 20px;
            }
            
            .os-info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .os-item {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 10px;
                padding: 12px 15px;
            }
            
            .os-label {
                display: block;
                font-size: 11px;
                color: #888;
                margin-bottom: 5px;
            }
            
            .os-value {
                font-size: 14px;
                color: #e0e0e0;
                font-weight: 500;
            }
            
            .os-value.uptime {
                color: #4ade80;
                font-family: 'JetBrains Mono', monospace;
            }
            
            .processes-panel {
                background: linear-gradient(145deg, rgba(35, 35, 45, 0.95), rgba(25, 25, 35, 0.95));
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid rgba(255, 255, 255, 0.08);
            }
            
            .processes-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .processes-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                font-weight: 600;
                color: #fff;
            }
            
            .process-count {
                background: rgba(96, 165, 250, 0.2);
                color: #60a5fa;
                padding: 2px 10px;
                border-radius: 12px;
                font-size: 12px;
            }
            
            .process-controls {
                display: flex;
                gap: 10px;
            }
            
            .process-search {
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #e0e0e0;
                font-size: 13px;
                width: 150px;
            }
            
            .process-search:focus {
                outline: none;
                border-color: rgba(96, 165, 250, 0.5);
            }
            
            #processSortSelect {
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #e0e0e0;
                font-size: 13px;
                cursor: pointer;
            }
            
            .processes-table {
                border-radius: 10px;
                overflow: hidden;
            }
            
            .process-table-header {
                display: grid;
                grid-template-columns: 2fr 80px 80px 80px 120px 80px;
                gap: 10px;
                padding: 12px 15px;
                background: rgba(0, 0, 0, 0.3);
                font-size: 12px;
                font-weight: 600;
                color: #888;
                text-transform: uppercase;
            }
            
            .process-list {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .process-row {
                display: grid;
                grid-template-columns: 2fr 80px 80px 80px 120px 80px;
                gap: 10px;
                padding: 10px 15px;
                font-size: 13px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                transition: background 0.2s;
            }
            
            .process-row:hover {
                background: rgba(255, 255, 255, 0.03);
            }
            
            .process-row .col-name {
                color: #e0e0e0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .process-row .col-pid {
                color: #888;
                font-family: 'JetBrains Mono', monospace;
            }
            
            .cpu-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                font-family: 'JetBrains Mono', monospace;
            }
            
            .state-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 10px;
                text-transform: uppercase;
            }
            
            .state-badge.running {
                background: rgba(74, 222, 128, 0.2);
                color: #4ade80;
            }
            
            .state-badge.sleeping {
                background: rgba(96, 165, 250, 0.2);
                color: #60a5fa;
            }
            
            .drivers-panel {
                background: linear-gradient(145deg, rgba(35, 35, 45, 0.95), rgba(25, 25, 35, 0.95));
                border-radius: 16px;
                padding: 20px;
                border: 1px solid rgba(255, 255, 255, 0.08);
            }
            
            .drivers-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .drivers-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                font-weight: 600;
                color: #fff;
            }
            
            .check-updates-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                background: rgba(96, 165, 250, 0.2);
                border: 1px solid rgba(96, 165, 250, 0.3);
                border-radius: 8px;
                color: #60a5fa;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            
            .check-updates-btn:hover {
                background: rgba(96, 165, 250, 0.3);
            }
            
            .drivers-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 12px;
            }
            
            .driver-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 10px;
                border-left: 3px solid #4ade80;
            }
            
            .driver-item.inactive {
                border-left-color: #888;
                opacity: 0.7;
            }
            
            .driver-icon {
                font-size: 24px;
            }
            
            .driver-info {
                flex: 1;
                min-width: 0;
            }
            
            .driver-name {
                font-size: 13px;
                font-weight: 500;
                color: #e0e0e0;
            }
            
            .driver-model {
                font-size: 11px;
                color: #888;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .driver-type-badge {
                padding: 3px 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                font-size: 10px;
                color: #888;
            }
            
            .loading-processes, .loading-drivers {
                padding: 40px;
                text-align: center;
                color: #888;
            }
            
            .system-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 10px;
                font-size: 14px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            }
            
            .system-notification.success {
                background: rgba(74, 222, 128, 0.9);
                color: #000;
            }
            
            .system-notification.error {
                background: rgba(248, 113, 113, 0.9);
                color: #fff;
            }
            
            .system-notification.info {
                background: rgba(96, 165, 250, 0.9);
                color: #fff;
            }
            
            .system-notification.fade-out {
                animation: slideOut 0.3s ease forwards;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    initCharts() {
        const cpuCanvas = document.getElementById('cpuChart');
        if (cpuCanvas) {
            this.charts.cpu = {
                canvas: cpuCanvas,
                ctx: cpuCanvas.getContext('2d')
            };
        }

        const memCanvas = document.getElementById('memChart');
        if (memCanvas) {
            this.charts.mem = {
                canvas: memCanvas,
                ctx: memCanvas.getContext('2d')
            };
        }
    }

    drawChart(chartName, data, color, gradientColor) {
        const chart = this.charts[chartName];
        if (!chart || !chart.ctx) return;

        const ctx = chart.ctx;
        const w = chart.canvas.width;
        const h = chart.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Фон
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, w, h);

        // Сетка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const y = (h / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        if (data.length < 2) return;

        const maxVal = 100;
        const stepX = w / (this.history.maxLength - 1);

        // Градиент заливки
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, (gradientColor || color) + '60');
        gradient.addColorStop(1, (gradientColor || color) + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, h);
        data.forEach((val, i) => {
            const x = i * stepX;
            const y = h - (val / maxVal) * h * 0.95;
            ctx.lineTo(x, y);
        });
        ctx.lineTo((data.length - 1) * stepX, h);
        ctx.closePath();
        ctx.fill();

        // Линия
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = i * stepX;
            const y = h - (val / maxVal) * h * 0.95;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Точка на конце
        if (data.length > 0) {
            const lastX = (data.length - 1) * stepX;
            const lastY = h - (data[data.length - 1] / maxVal) * h * 0.95;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    async updateAllData() {
        if (!window.ipcRenderer) {
            console.warn('[SystemMonitor] IPC not available');
            this.showNotification('IPC недоступен - запустите в Electron', 'error');
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
        
        this.history.cpu.push(load);
        if (this.history.cpu.length > this.history.maxLength) {
            this.history.cpu.shift();
        }

        this.setText('cpuLoad', `${load}%`);
        this.setText('cpuModel', data.brand || data.model || '-');
        this.setText('cpuCores', `${data.physicalCores || '-'} / ${data.cores || '-'}`);
        this.setText('cpuSpeed', `${data.speed || '-'} GHz`);
        this.setText('cpuTemp', data.temp > 0 ? `${data.temp}°C` : '-');

        // Загрузка ядер
        const coreLoadsEl = document.getElementById('coreLoads');
        if (coreLoadsEl && data.coreLoads && data.coreLoads.length > 0) {
            coreLoadsEl.innerHTML = data.coreLoads.slice(0, 8).map((load, i) => `
                <div class="core-load-item">
                    <span class="core-label">Ядро ${i}</span>
                    <div class="core-bar">
                        <div class="core-fill" style="width: ${load}%; background: ${this.getLoadColor(parseFloat(load))}"></div>
                    </div>
                    <span class="core-value" style="color: ${this.getLoadColor(parseFloat(load))}">${load}%</span>
                </div>
            `).join('');
        }

        this.drawChart('cpu', this.history.cpu, '#4ade80', '#22c55e');
        
        const valueEl = document.getElementById('cpuLoad');
        if (valueEl) {
            valueEl.style.color = this.getLoadColor(load);
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
        this.setText('memAvailable', `${data.available} GB`);
        this.setText('memSwap', `${data.swapUsed} / ${data.swapTotal} GB`);

        const memBar = document.getElementById('memBar');
        if (memBar) memBar.style.width = `${percent}%`;
        
        const cachePercent = (parseFloat(data.cached) / parseFloat(data.total)) * 100;
        const memCacheBar = document.getElementById('memCacheBar');
        if (memCacheBar) memCacheBar.style.width = `${Math.min(cachePercent, 100 - percent)}%`;

        this.drawChart('mem', this.history.mem, '#60a5fa', '#3b82f6');

        const valueEl = document.getElementById('memPercent');
        if (valueEl) {
            valueEl.style.color = this.getLoadColor(percent);
        }

        this.lastUpdate.mem = data;
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
                <div class="volume-item">
                    <span class="volume-mount">${v.mount}</span>
                    <div class="volume-bar">
                        <div class="volume-fill" style="width: ${v.percent}%; background: ${this.getLoadColor(parseFloat(v.percent))}"></div>
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
        this.setText('gpuMemUsage', gpu.utilizationMemory ? `${gpu.utilizationMemory}%` : '-');
        this.setText('gpuFan', gpu.fanSpeed ? `${gpu.fanSpeed}%` : '-');

        this.lastUpdate.gpu = data;
    }

    updateOS(data) {
        this.setText('osName', `${data.distro || data.platform}`);
        this.setText('osVersion', data.release || '-');
        this.setText('osKernel', data.kernel || '-');
        this.setText('osArch', data.arch || '-');
        this.setText('osHostname', data.hostname || '-');

        const uptimeSec = data.uptime || 0;
        const days = Math.floor(uptimeSec / 86400);
        const hours = Math.floor((uptimeSec % 86400) / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        this.setText('osUptime', `${days}д ${hours}ч ${mins}м`);

        if (data.hasBattery) {
            const batteryItem = document.getElementById('batteryItem');
            if (batteryItem) batteryItem.style.display = 'block';
            this.setText('osBattery', `${data.batteryPercent}% ${data.isCharging ? '⚡' : '🔋'}`);
        }

        this.lastUpdate.os = data;
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

        if (processes.length === 0) {
            list.innerHTML = '<div class="loading-processes">Нет процессов</div>';
            return;
        }

        list.innerHTML = processes.slice(0, 20).map(p => `
            <div class="process-row">
                <div class="col-name" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</div>
                <div class="col-pid">${p.pid}</div>
                <div class="col-cpu">
                    <span class="cpu-badge" style="background: ${this.getLoadColor(parseFloat(p.cpu))}20; color: ${this.getLoadColor(parseFloat(p.cpu))}">${p.cpu}%</span>
                </div>
                <div class="col-mem">${p.mem}%</div>
                <div class="col-user">${this.escapeHtml(p.user || '-')}</div>
                <div class="col-state">
                    <span class="state-badge ${p.state === 'running' ? 'running' : 'sleeping'}">${p.state || '-'}</span>
                </div>
            </div>
        `).join('');
    }

    sortProcesses(by) {
        this.sortBy = by;
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

    filterProcesses(query) {
        if (!this.currentProcesses) return;
        
        const filtered = this.currentProcesses.filter(p => 
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.pid.toString().includes(query)
        );
        
        this.renderProcesses(filtered);
    }

    updateDrivers(drivers) {
        const list = document.getElementById('driversList');
        if (!list) return;

        if (!drivers || drivers.length === 0) {
            list.innerHTML = '<div class="loading-drivers">Драйверы не найдены</div>';
            return;
        }

        list.innerHTML = drivers.map(d => `
            <div class="driver-item ${d.status === 'Активен' || d.status === 'Подключено' ? '' : 'inactive'}">
                <div class="driver-icon">${this.getDriverIcon(d.type)}</div>
                <div class="driver-info">
                    <div class="driver-name">${this.escapeHtml(d.name)}</div>
                    <div class="driver-model">${this.escapeHtml(d.model)}</div>
                </div>
                <div class="driver-type-badge">${d.type}</div>
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

    async checkForUpdates() {
        try {
            this.showNotification('Проверка обновлений...', 'info');
            const result = await window.ipcRenderer.invoke('check-driver-updates');
            
            if (result.hasUpdates) {
                this.showNotification('Доступны обновления драйверов', 'warning');
            } else {
                this.showNotification('Все драйверы актуальны', 'success');
            }
        } catch (e) {
            this.showNotification('Ошибка проверки', 'error');
        }
    }

    toggleMonitoring() {
        const indicator = document.getElementById('statusIndicator');
        const btn = document.getElementById('toggleMonitoring');
        
        if (this.monitoringActive) {
            this.stopMonitoring();
            this.setText('monitorStatus', 'Мониторинг приостановлен');
            if (indicator) indicator.classList.remove('active');
            if (btn) btn.innerHTML = '<span class="btn-icon">▶</span> Запустить';
        } else {
            this.startMonitoring();
            this.setText('monitorStatus', 'Мониторинг активен');
            if (indicator) indicator.classList.add('active');
            if (btn) btn.innerHTML = '<span class="btn-icon">⏸</span> Пауза';
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
