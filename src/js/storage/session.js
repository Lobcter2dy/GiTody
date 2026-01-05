/**
 * Session Storage - ПРОСТОЕ И НАДЁЖНОЕ
 */

const KEYS = {
    TOKEN: 'GITODY_TOKEN',
    USER: 'GITODY_USER',
    REPO: 'GITODY_REPO',
    TAB: 'GITODY_TAB'
};

// Сразу при загрузке читаем из localStorage
let _token = localStorage.getItem(KEYS.TOKEN);
let _user = null;
let _repo = localStorage.getItem(KEYS.REPO);
let _tab = localStorage.getItem(KEYS.TAB) || 'dashboard';

try {
    const userStr = localStorage.getItem(KEYS.USER);
    if (userStr) _user = JSON.parse(userStr);
} catch (e) {
    console.error('[Session] Failed to parse user:', e);
}

console.log('[Session] Loaded from localStorage:');
console.log('  Token:', _token ? 'YES (' + _token.substring(0, 8) + '...)' : 'NO');
console.log('  User:', _user?.login || 'NO');
console.log('  Repo:', _repo || 'NO');
console.log('  Tab:', _tab);

export const session = {
    // TOKEN
    getToken() {
        return _token;
    },
    
    setToken(token) {
        _token = token;
        if (token) {
            localStorage.setItem(KEYS.TOKEN, token);
            console.log('[Session] Token SAVED:', token.substring(0, 8) + '...');
        } else {
            localStorage.removeItem(KEYS.TOKEN);
            console.log('[Session] Token CLEARED');
        }
    },
    
    hasToken() {
        return !!_token;
    },
    
    clearToken() {
        _token = null;
        localStorage.removeItem(KEYS.TOKEN);
    },

    // USER
    getUser() {
        return _user;
    },
    
    setUser(user) {
        _user = user;
        if (user) {
            localStorage.setItem(KEYS.USER, JSON.stringify(user));
            console.log('[Session] User SAVED:', user.login);
        } else {
            localStorage.removeItem(KEYS.USER);
            console.log('[Session] User CLEARED');
        }
    },
    
    clearUser() {
        _user = null;
        localStorage.removeItem(KEYS.USER);
    },

    // REPO
    getActiveRepo() {
        return _repo;
    },
    
    setActiveRepo(repo) {
        _repo = repo;
        if (repo) {
            localStorage.setItem(KEYS.REPO, repo);
        } else {
            localStorage.removeItem(KEYS.REPO);
        }
    },

    // TAB
    getActiveTab() {
        return _tab;
    },
    
    setActiveTab(tab) {
        _tab = tab;
        localStorage.setItem(KEYS.TAB, tab);
    },

    // FOLDER COLORS
    getFolderColors() {
        try {
            const str = localStorage.getItem('GITODY_COLORS');
            return str ? JSON.parse(str) : {};
        } catch { return {}; }
    },
    
    setFolderColors(colors) {
        localStorage.setItem('GITODY_COLORS', JSON.stringify(colors));
    },

    // LOGOUT
    logout() {
        this.clearToken();
        this.clearUser();
        _repo = null;
        localStorage.removeItem(KEYS.REPO);
        console.log('[Session] LOGGED OUT');
    },

    // DEBUG
    debug() {
        console.log('=== SESSION DEBUG ===');
        console.log('Token in memory:', _token ? 'YES' : 'NO');
        console.log('Token in storage:', localStorage.getItem(KEYS.TOKEN) ? 'YES' : 'NO');
        console.log('User in memory:', _user?.login || 'NO');
        console.log('User in storage:', localStorage.getItem(KEYS.USER) ? 'YES' : 'NO');
        console.log('=====================');
    }
};

window.session = session;

// Проверка каждые 5 секунд что данные не пропали
setInterval(() => {
    const storedToken = localStorage.getItem(KEYS.TOKEN);
    if (_token && !storedToken) {
        console.error('[Session] TOKEN WAS LOST! Restoring...');
        localStorage.setItem(KEYS.TOKEN, _token);
    }
}, 5000);
