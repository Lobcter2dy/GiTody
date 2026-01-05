/**
 * Dropdown Menu Manager
 */
export class DropdownManager {
    constructor() {
        this.activeDropdown = null;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeDropdown());
        } else {
            this.initializeDropdown();
        }
    }

    initializeDropdown() {
        const userAvatarBtn = document.getElementById('userAvatarBtn');
        const userDropdown = document.getElementById('userDropdown');

        if (userAvatarBtn && userDropdown) {
            userAvatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle('userDropdown');
            });

            userDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        document.addEventListener('click', () => {
            this.closeAll();
        });
    }

    toggle(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            if (this.activeDropdown === dropdownId) {
                dropdown.classList.remove('active');
                this.activeDropdown = null;
            } else {
                this.closeAll();
                dropdown.classList.add('active');
                this.activeDropdown = dropdownId;
            }
        }
    }

    closeAll() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('active');
        });
        this.activeDropdown = null;
    }
}

export const dropdownManager = new DropdownManager();
