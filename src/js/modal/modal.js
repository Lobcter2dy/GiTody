/**
 * Modal Manager
 */
export class ModalManager {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeModal());
        } else {
            this.initializeModal();
        }
    }

    initializeModal() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.close(e.target.id.replace('Modal', ''));
            }
        });
    }

    show(modalType) {
        this.closeAll();
        const modal = document.getElementById(`${modalType}Modal`);
        if (modal) {
            modal.classList.add('active');
            this.activeModal = modalType;
        }
    }

    close(modalType) {
        const modal = document.getElementById(`${modalType}Modal`);
        if (modal) {
            modal.classList.remove('active');
            if (this.activeModal === modalType) {
                this.activeModal = null;
            }
        }
    }

    closeAll() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.activeModal = null;
    }

    switch(fromModal, toModal) {
        this.close(fromModal);
        this.show(toModal);
    }
}

export const modalManager = new ModalManager();
