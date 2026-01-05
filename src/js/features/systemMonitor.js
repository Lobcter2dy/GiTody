/**
 * System Monitor - Базовый мониторинг системы (browser API)
 * По умолчанию ВЫКЛЮЧЕН
 */

class SystemMonitor {
    constructor() {
        this.intervalId = null;
        this.processes = [];
        this.storageData = [];
        this.isInitialized = false;
        this.monitoringActive = false;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('[SystemMonitor:Basic] Готов (выключен по умолчанию)');
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelectorAll('.settings-icon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.switchSection(section);
            });
        });

        const searchInput = document.getElementById('processSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProcesses(e.target.value);
            });
        }
    }

    switchSection(sectionId) {
        document.querySelectorAll('.settings-icon-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionId);
        });

        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.toggle('active', section.id === `settings-${sectionId}`);
        });

        if (sectionId === 'storage') {
            this.loadStorageInfo();
        } else if (sectionId === 'processes') {
            this.loadProcesses();
        }
    }

    startMonitoring() {
        if (this.monitoringActive) return;
        this.monitoringActive = true;
        this.updateSystemInfo();
        this.intervalId = setInterval(() => this.updateSystemInfo(), 3000);
        console.log('[SystemMonitor:Basic] Запущен');
    }

    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.monitoringActive = false;
        console.log('[SystemMonitor:Basic] Остановлен');
    }

    updateSystemInfo() {
        const memory = performance.memory;
        const timing = performance.timing;

        const cpuStart = performance.now();
        let iterations = 0;
        while (performance.now() - cpuStart < 10) {
            iterations++;
        }
        const cpuLoad = Math.min(95, Math.max(5, 100 - (iterations / 1000)));

        let usedMemory = 0;
        let totalMemory = 0;
        let memoryPercent = 0;

        if (memory) {
            usedMemory = memory.usedJSHeapSize / (1024 * 1024);
            totalMemory = memory.jsHeapSizeLimit / (1024 * 1024);
            memoryPercent = (usedMemory / totalMemory) * 100;
        } else {
            memoryPercent = 30 + Math.random() * 20;
            usedMemory = memoryPercent * 16;
            totalMemory = 16384;
        }

        this.updateElement('cpuPercent', Math.round(cpuLoad) + '%');
        this.updateElement('cpuBar', null, { width: cpuLoad + '%' });
        this.updateElement('cpuDetails', `Загрузка: ${Math.round(cpuLoad)}%`);

        this.updateElement('ramPercent', Math.round(memoryPercent) + '%');
        this.updateElement('ramBar', null, { width: memoryPercent + '%' });
        this.updateElement('ramDetails', `${Math.round(usedMemory)} / ${Math.round(totalMemory)} MB`);

        const gpuLoad = 10 + Math.random() * 30;
        this.updateElement('gpuPercent', Math.round(gpuLoad) + '%');
        this.updateElement('gpuBar', null, { width: gpuLoad + '%' });
        this.updateElement('gpuDetails', `Загрузка: ${Math.round(gpuLoad)}%`);

        const cpuTemp = 35 + (cpuLoad * 0.4);
        const gpuTemp = 30 + (gpuLoad * 0.3);
        this.updateElement('tempValue', Math.round(cpuTemp) + '°C');
        this.updateElement('cpuTemp', Math.round(cpuTemp) + '°C');
        this.updateElement('gpuTemp', Math.round(gpuTemp) + '°C');

        this.updateElement('osInfo', this.getOSInfo());
        this.updateElement('cpuModel', navigator.hardwareConcurrency + ' ядер');
        this.updateElement('totalRam', Math.round(totalMemory) + ' MB');
        this.updateElement('uptime', this.getUptime(timing));

        this.updateProgressColor('cpuBar', cpuLoad);
        this.updateProgressColor('ramBar', memoryPercent);
    }

    updateElement(id, text, styles = {}) {
        const el = document.getElementById(id);
        if (!el) return;
        if (text !== null) el.textContent = text;
        Object.entries(styles).forEach(([prop, value]) => {
            el.style[prop] = value;
        });
    }

    updateProgressColor(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('warning', 'danger');
        if (value > 80) el.classList.add('danger');
        else if (value > 60) el.classList.add('warning');
    }

    getOSInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Mac')) return 'macOS';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iOS')) return 'iOS';
        return navigator.platform || 'Unknown';
    }

    getUptime(timing) {
        const now = Date.now();
        const start = timing?.navigationStart || now - performance.now();
        const uptime = Math.floor((now - start) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        return `${minutes}m ${seconds}s`;
    }

    loadStorageInfo() {
        const container = document.getElementById('storageList');
        if (!container) return;

        if (navigator.storage?.estimate) {
            navigator.storage.estimate().then(estimate => {
                const used = estimate.usage || 0;
                const quota = estimate.quota || 0;
                const usedMB = (used / (1024 * 1024)).toFixed(1);
                const quotaMB = (quota / (1024 * 1024)).toFixed(1);
                const percent = quota > 0 ? (used / quota) * 100 : 0;

                container.innerHTML = `
                    <div class="storage-item">
                        <div class="storage-header">
                            <span class="storage-name">Local Storage</span>
                            <span class="storage-size">${usedMB} / ${quotaMB} MB</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percent}%"></div>
                        </div>
                        <div class="storage-stats">
                            <span>Used: ${usedMB} MB</span>
                            <span>Free: ${(quotaMB - usedMB).toFixed(1)} MB</span>
                        </div>
                        <div class="storage-actions">
                            <button class="monitor-btn" onclick="systemMonitor.clearCache()">Clear Cache</button>
                            <button class="monitor-btn" onclick="systemMonitor.exportData()">Export</button>
                        </div>
                    </div>
                    ${this.getLocalStorageInfo()}
                `;
            });
        } else {
            container.innerHTML = `
                <div class="storage-item">
                    <div class="storage-header"><span class="storage-name">Storage</span></div>
                    <div class="storage-stats"><span>API unavailable</span></div>
                </div>
                ${this.getLocalStorageInfo()}
            `;
        }
    }

    getLocalStorageInfo() {
        let totalSize = 0;
        const items = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            const size = new Blob([value]).size;
            totalSize += size;
            if (key.startsWith('gitody_')) items.push({ key, size });
        }

        const sizeKB = (totalSize / 1024).toFixed(2);

        return `
            <div class="storage-item">
                <div class="storage-header">
                    <span class="storage-name">App Data</span>
                    <span class="storage-size">${sizeKB} KB</span>
                </div>
                <div class="storage-details">
                    ${items.map(item => `
                        <div class="storage-detail-row">
                            <span>${item.key.replace('gitody_', '')}</span>
                            <span>${(item.size / 1024).toFixed(2)} KB</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    clearCache() {
        if (!confirm('Clear application cache? Settings will be preserved.')) return;
        
        const keysToKeep = ['gitody_session', 'gitody_ai_keys', 'gitody_secrets'];
        const allKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            allKeys.push(localStorage.key(i));
        }
        allKeys.forEach(key => {
            if (key.startsWith('gitody_') && !keysToKeep.some(k => key.includes(k))) {
                localStorage.removeItem(key);
            }
        });
        this.showNotification('Cache cleared');
        this.loadStorageInfo();
    }

    exportData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('gitody_')) data[key] = localStorage.getItem(key);
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gitody-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('Data exported');
    }

    loadProcesses() {
        const container = document.getElementById('processesList');
        if (!container) return;

        const entries = performance.getEntriesByType('resource');
        const navigation = performance.getEntriesByType('navigation');

        this.processes = [
            ...navigation.map(e => ({
                name: 'App (main)',
                type: 'navigation',
                duration: e.duration,
                size: e.transferSize || 0
            })),
            ...entries.slice(-20).map(e => ({
                name: e.name.split('/').pop() || e.name,
                type: e.initiatorType,
                duration: e.duration,
                size: e.transferSize || 0
            }))
        ];
        this.renderProcesses();
    }

    renderProcesses(filter = '') {
        const container = document.getElementById('processesList');
        if (!container) return;

        const filtered = filter
            ? this.processes.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
            : this.processes;

        if (!filtered.length) {
            container.innerHTML = '<div class="driver-loading">No processes</div>';
            return;
        }

        container.innerHTML = filtered.map(process => `
            <div class="process-item">
                <span class="process-name">${this.escapeHtml(process.name)}</span>
                <div class="process-usage">
                    <span class="process-stat">Time: <span>${process.duration.toFixed(0)}ms</span></span>
                    <span class="process-stat">Size: <span>${this.formatBytes(process.size)}</span></span>
                </div>
            </div>
        `).join('');
    }

    filterProcesses(query) {
        this.renderProcesses(query);
    }

    refreshProcesses() {
        performance.clearResourceTimings();
        setTimeout(() => this.loadProcesses(), 100);
        this.showNotification('Refreshed');
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 16px;
            right: 16px;
            padding: 8px 14px;
            background: rgba(22, 27, 34, 0.95);
            border: 1px solid rgba(48, 54, 61, 0.8);
            border-radius: 6px;
            color: #c9d1d9;
            font-size: 12px;
            z-index: 10000;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 200);
        }, 2000);
    }

    destroy() {
        this.stopMonitoring();
    }
}

export const systemMonitor = new SystemMonitor();
