/**
 * Arc Navigation - иконки по дуге
 */

import { session } from '../storage/session.js';

export class NavRing {
    constructor() {
        this.tabs = ['dashboard', 'github', 'chat', 'editor', 'settings', 'information', 'storage'];
        this.currentIndex = 0;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return; // Предотвращение дублирования
        this.isInitialized = true;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize(), { once: true });
        } else {
            this.initialize();
        }
    }

    initialize() {
        const arc = document.getElementById('navArc');
        if (!arc) return;

        // Обработчики для кнопок
        document.querySelectorAll('.nav-arc-item').forEach((item) => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.goTo(index);
            });
        });

        // Колесико мыши - ТОЛЬКОнад кольцом, БЕЗ preventDefault
        arc.addEventListener('wheel', (e) => {
            // Только если мышь внутри активной зоны кольца (140px в углу)
            const rect = arc.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const distance = Math.sqrt(x * x + y * y);
            
            // Только если в радиусе 140px от центра (правый нижний угол)
            if (distance < 140) {
                e.preventDefault();
                if (e.deltaY > 0) {
                    this.next();
                } else {
                    this.prev();
                }
            }
        }, false);

        // Восстановить сохранённую вкладку
        const savedTab = session.getActiveTab();
        const savedIndex = this.tabs.indexOf(savedTab);
        if (savedIndex !== -1) {
            this.currentIndex = savedIndex;
        }
        
        this.updateActive();
    }

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.tabs.length;
        this.updateActive();
    }

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.tabs.length) % this.tabs.length;
        this.updateActive();
    }

    goTo(index) {
        if (index >= 0 && index < this.tabs.length) {
            this.currentIndex = index;
            this.updateActive();
        }
    }

    updateActive() {
        const tabName = this.tabs[this.currentIndex];

        // Batch DOM обновления через requestAnimationFrame
        requestAnimationFrame(() => {
            // Обновить кнопки - кешируем NodeList
            if (!this._navItems) {
                this._navItems = document.querySelectorAll('.nav-arc-item');
            }
            
            this._navItems.forEach((item) => {
                const isActive = item.dataset.tab === tabName;
                item.classList.toggle('active', isActive);
                
                if (isActive) {
                    item.classList.add('pulse');
                    setTimeout(() => item.classList.remove('pulse'), 300);
                }
            });

            // Переключить контент - кешируем
            if (!this._tabContents) {
                this._tabContents = document.querySelectorAll('.tab-content');
            }
            
            this._tabContents.forEach(c => c.classList.remove('active'));
            const content = document.getElementById(tabName);
            if (content) content.classList.add('active');
        });

<<<<<<< Current (Your changes)
=======
        // Переключить контент
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const content = document.getElementById(tabName);
        if (content) content.classList.add('active');

        // Lazy init мониторов при переходе на settings
        if (tabName === 'settings') {
            this.initMonitorsOnDemand();
        } else {
            // Остановить мониторы при уходе со страницы
            this.stopMonitors();
        }

>>>>>>> Incoming (Background Agent changes)
        // СОХРАНИТЬ в session
        session.setActiveTab(tabName);
    }

    initMonitorsOnDemand() {
        // Инициализировать мониторы только при переходе на settings
        if (window.systemMonitorReal) {
            window.systemMonitorReal.init();
        }
        if (window.diskManager) {
            window.diskManager.init();
            window.diskManager.renderDiskMonitor();
        }
    }

    stopMonitors() {
        // Остановить мониторы при уходе с вкладки для экономии ресурсов
        if (window.systemMonitorReal?.monitoringActive) {
            window.systemMonitorReal.stopMonitoring();
        }
        if (window.diskManager?.monitoringActive) {
            window.diskManager.stopMonitoring();
        }
    }

    setActiveTab(tabName) {
        const index = this.tabs.indexOf(tabName);
        if (index !== -1) {
            this.currentIndex = index;
            this.updateActive();
        }
    }
}

export const navRing = new NavRing();
window.navRing = navRing;
