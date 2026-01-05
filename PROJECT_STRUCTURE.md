# GITODY PROJECT STRUCTURE

This document serves as the source of truth for the project layout.

## Folders

### `electron/`
- `main.cjs`: The main process entry point. Handles OAuth callback server and system IPC.
- `preload.cjs`: Bridge between Electron and the web page.

### `src/js/api/`
- `githubManager.js`: Core class for GitHub API interaction. Handles repositories, branches, PRs, Issues, Actions, and Releases.

### `src/js/auth/`
- `github.js`: General auth state manager.
- `githubOAuth.js`: OAuth flow handler using external browser redirect.

### `src/js/core/`
- `result.js`: `Result` class for robust error handling.
- `logger.js`: `Logger` class for structured logging.

### `src/js/storage/`
- `session.js`: Handles `localStorage` persistence for tokens, user info, and active states.

### `src/js/features/`
- `aiManager.js`: Integration with AI providers.
- `diskManager.js`: System disk monitoring and management.
- `systemMonitorReal.js`: Real-time system stats (CPU, RAM, GPU).
- `speechManager.js`: Voice control and dictation.

### `src/styles/`
- Structured CSS files for every major component.

## Key Integration Points

1. **OAuth Redirect**: Triggered from `githubOAuth.js`, handled in `main.cjs` via a local server on port 47524.
2. **IPC Bridge**: System stats and browser opening pass through `electronAPI` exposed in `preload.cjs`.
3. **Data Flow**: `githubManager` -> `session` (for persistence) -> `UI managers`.

