const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    versions: process.versions,
    
    // Управление окном
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    
    // === Микрофон ===
    checkMicrophonePermission: () => ipcRenderer.invoke('check-microphone-permission'),
    requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
    getMediaDevices: () => ipcRenderer.invoke('get-media-devices'),
});

// Expose ipcRenderer for system monitoring
contextBridge.exposeInMainWorld('ipcRenderer', {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
});

// === Инициализация микрофона при загрузке ===
window.addEventListener('DOMContentLoaded', async () => {
    console.log('[Preload] DOM loaded, checking microphone...');
    
    try {
        // Проверить разрешение микрофона
        const result = await ipcRenderer.invoke('check-microphone-permission');
        console.log('[Preload] Microphone status:', result);
        
        if (!result.granted) {
            console.log('[Preload] Requesting microphone permission...');
            const request = await ipcRenderer.invoke('request-microphone-permission');
            console.log('[Preload] Microphone permission result:', request);
        }
    } catch (e) {
        console.error('[Preload] Microphone init error:', e);
    }
});
