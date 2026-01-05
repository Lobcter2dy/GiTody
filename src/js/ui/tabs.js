/**
 * Tab Manager
 */
export class TabManager {
    constructor() {
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeTabs());
        } else {
            this.initializeTabs();
        }
    }

    initializeTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(tabName);

        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');

        // Сохранить состояние
        if (window.stateManager) {
            window.stateManager.set('activeTab', tabName);
        }
    }

    getActiveTab() {
        return document.querySelector('.tab.active')?.getAttribute('data-tab');
    }
}

export const tabManager = new TabManager();
