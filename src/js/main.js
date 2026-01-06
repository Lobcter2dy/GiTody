/**
 * Main Application Entry Point
 * GITODY - GitHub Repository Manager
 */

// === Styles ===
import '../styles/main.css';
import '../styles/editor.css';
import '../styles/monitor.css';
import '../styles/speech.css';

// === Core ===
import { session } from './storage/session.js';
import { githubAuth } from './auth/github.js';

// === UI ===
import { modalManager } from './modal/modal.js';
import { tabManager } from './ui/tabs.js';
import { dropdownManager } from './ui/dropdown.js';
import { navRing } from './ui/navRing.js';
import { githubPanelManager } from './ui/githubPanel.js';

// === Features ===
import { codeEditor } from './editor/codeEditor.js';
import { repoManager } from './sidebar/repoManager.js';
import { githubManager } from './api/githubManager.js';
import { secretsManager } from './features/secretsManager.js';
import { systemMonitor } from './features/systemMonitor.js';
import { networkManager } from './features/networkManager.js';
import { diskManager } from './features/diskManager.js';
import { speechManager } from './features/speechManager.js';
import { aiManager } from './features/aiManager.js';
import { storageManager } from './features/storageManager.js';

// === Global Access ===
window.session = session;
window.githubAuth = githubAuth;
window.modalManager = modalManager;
window.tabManager = tabManager;
window.dropdownManager = dropdownManager;
window.navRing = navRing;
window.codeEditor = codeEditor;
window.repoManager = repoManager;
window.githubPanelManager = githubPanelManager;
window.githubManager = githubManager;
window.secretsManager = secretsManager;
window.systemMonitor = systemMonitor;
window.diskManager = diskManager;
window.speechManager = speechManager;
window.aiManager = aiManager;
window.storageManager = storageManager;

// === Modal Shortcuts ===
window.showModal = type => modalManager.show(type);
window.closeModal = type => modalManager.close(type);
window.switchModal = (from, to) => modalManager.switch(from, to);

// === App Initialization ===
async function initApp() {
  console.log('[App] Starting...');

  try {
    // 0. Инициализация UI (navRing ДОЛЖЕН быть инициализирован один раз)
    navRing.init();

    // 1. Авторизация
    await githubAuth.init();

    // 1.1 Попытка авто-логина из SecretsManager, если еще не подключен
    if (!githubAuth.isConnected) {
      console.log('[App] Attempting auto-login from Secrets...');
      const githubSecret = secretsManager.items.find(
        s =>
          s.type === 'password' &&
          typeof s.name === 'string' &&
          s.name.toLowerCase().includes('github')
      );

      if (githubSecret && githubSecret.password) {
        console.log('[App] Found GitHub secret, connecting...');
        await githubAuth.connect(githubSecret.password);
      }
    }

    // 2. Восстановить вкладку
    const savedTab = session.getActiveTab();
    if (savedTab && navRing) {
      navRing.setActiveTab(savedTab);
    }

    // 3. Загрузить репозитории если авторизован
    if (githubAuth.isConnected) {
      console.log('[App] Loading repositories...');
      await githubManager.loadRepositories();

      const savedRepo = session.getActiveRepo();
      if (savedRepo) {
        await githubManager.selectRepo(savedRepo);
      }
    }

    // 4. Инициализация модулей (БЕЗ дублирования)
    systemMonitor.init();
    networkManager.init();
    diskManager.init();
    speechManager.init();
    aiManager.init();
    storageManager.init();

    console.log('[App] Ready');
  } catch (e) {
    console.error('[App] Init error:', e);
  }
}

// === DOM Ready ===
document.addEventListener('DOMContentLoaded', () => {
  // Toggle buttons
  document.querySelectorAll('.toggle').forEach(toggle => {
    toggle.addEventListener('click', function () {
      this.classList.toggle('enabled');
    });
  });

  // Button feedback
  document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', function () {
      if (!this.getAttribute('disabled')) {
        this.style.opacity = '0.8';
        setTimeout(() => (this.style.opacity = '1'), 100);
      }
    });
  });

  initApp();
});

// === GitHub Connect ===
window.connectGitHub = async () => {
  const tokenInput = document.getElementById('githubTokenInput');
  const statusEl = document.getElementById('githubConnectStatus');

  if (!tokenInput) {
    console.error('[App] Token input not found');
    return;
  }

  const token = tokenInput.value.trim();
  if (!token) {
    if (statusEl) {
      statusEl.textContent = 'Введите токен';
      statusEl.style.color = '#f85149';
    }
    return;
  }

  if (statusEl) {
    statusEl.textContent = 'Проверка токена...';
    statusEl.style.color = '#8b949e';
  }

  const result = await githubAuth.connect(token);

  if (result.success) {
    if (statusEl) {
      const scopesInfo = result.scopes?.length ? ` (${result.scopes.slice(0, 2).join(', ')})` : '';
      statusEl.textContent = `✓ Подключено: ${result.user.login}${scopesInfo}`;
      statusEl.style.color = '#3fb950';
    }
    tokenInput.value = '';
    await githubManager.loadRepositories();

    setTimeout(() => closeModal('github-connect'), 2000);
  } else {
    if (statusEl) {
      statusEl.textContent = result.error || 'Ошибка подключения';
      statusEl.style.color = '#f85149';
    }
  }
};

// === GitHub OAuth Connect ===
window.connectGitHubOAuth = async () => {
  const statusEl = document.getElementById('githubConnectStatus');

  if (statusEl) {
    statusEl.textContent = 'Открывается окно авторизации...';
    statusEl.style.color = '#8b949e';
  }

  try {
    const result = await githubAuth.connectOAuth();

    if (result.success) {
      if (statusEl) {
        statusEl.textContent = result.message || 'Авторизация успешна';
        statusEl.style.color = '#3fb950';
      }
      // После OAuth нужно будет ввести токен вручную
      // В реальной реализации здесь будет автоматический обмен кода на токен
    } else {
      if (statusEl) {
        statusEl.textContent = result.error || 'Ошибка OAuth';
        statusEl.style.color = '#f85149';
      }
    }
  } catch (e) {
    console.error('[App] OAuth error:', e);
    if (statusEl) {
      statusEl.textContent = 'Ошибка: ' + e.message;
      statusEl.style.color = '#f85149';
    }
  }
};

window.openGitHubTokenPage = () => githubAuth.openTokenPage();

window.logoutGitHub = () => {
  if (confirm('Выйти из GitHub?')) {
    githubAuth.logout();
    githubManager.clearData();
    location.reload();
  }
};

// === Context Menu ===
window.showContextMenu = (event, menuType) => {
  event.preventDefault();
  window.closeContextMenu();

  const menu = document.getElementById('contextMenu');
  if (!menu) return;

  menu.classList.add('active');
  menu.style.left = Math.min(event.clientX, window.innerWidth - 200) + 'px';
  menu.style.top = Math.min(event.clientY, window.innerHeight - 150) + 'px';
};

window.closeContextMenu = () => {
  const menu = document.getElementById('contextMenu');
  if (menu) menu.classList.remove('active');
};

document.addEventListener('click', window.closeContextMenu);

console.log('[App] Module loaded');
