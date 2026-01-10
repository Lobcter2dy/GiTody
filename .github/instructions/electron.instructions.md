---
applyTo: 'electron/**/*.cjs'
---

# Electron Code Guidelines

## File Format

- Electron main and preload scripts use CommonJS (`.cjs` extension)
- Use `require()` for imports, `module.exports` for exports
- Do NOT use ES6 import/export syntax in these files

## Security Best Practices

- **Always** use `contextIsolation: true` in BrowserWindow
- **Never** set `nodeIntegration: true` in renderer process
- Use `contextBridge` in preload script to expose only necessary APIs
- Sanitize all data passed between main and renderer processes
- Validate IPC message data before processing

## Main Process (`electron/main.cjs`)

- Main process controls application lifecycle
- Creates and manages BrowserWindow instances
- Handles system-level operations (file system, native dialogs, etc.)
- Registers IPC handlers for communication with renderer
- Manages application menu and tray icons (if applicable)

## Preload Script (`electron/preload.cjs`)

- Acts as secure bridge between main and renderer processes
- Use `contextBridge.exposeInMainWorld()` to expose APIs
- Only expose necessary, specific functions (principle of least privilege)
- Validate arguments before forwarding to main process
- Document exposed API clearly

## IPC Communication

- Use `ipcMain.handle()` for request/response patterns
- Use `ipcRenderer.invoke()` from renderer (via contextBridge)
- Use `ipcMain.on()` for fire-and-forget messages
- Always validate IPC message payloads
- Use typed event names (constants) to avoid typos

## Window Management

- Set appropriate `webPreferences` for security
- Handle window state (size, position) persistence if needed
- Implement proper window close/minimize/maximize behavior
- Consider multi-window scenarios if applicable

## Development vs Production

- Use `isDev` or similar flag to differentiate environments
- Load dev server in development (`http://localhost:5173`)
- Load built files in production (`file://` protocol)
- Enable DevTools only in development
- Disable sandbox only when absolutely necessary (currently disabled for dev)

## Error Handling

- Log errors in main process to console or file
- Handle uncaught exceptions gracefully
- Don't crash the application on renderer errors
- Provide user feedback for critical errors

## Platform-Specific Code

- Use `process.platform` to detect OS (darwin, win32, linux)
- Handle platform-specific paths and behaviors
- Test on multiple platforms when possible
- Use Electron's cross-platform APIs when available

## Performance

- Minimize main process blocking operations
- Use web workers for CPU-intensive tasks in renderer
- Implement lazy loading for heavy resources
- Monitor memory usage and clean up resources

## Resources and File Access

- Use `app.getPath()` for standard directories
- Handle file paths correctly across platforms (path.join, path.resolve)
- Check file existence before operations
- Handle file access errors gracefully
