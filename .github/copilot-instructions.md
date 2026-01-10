# Copilot Instructions for GiTody

## Project Overview

GiTody is a GitHub Repository Manager available as both a web application and an Electron desktop app. It provides a comprehensive interface for managing GitHub repositories, branches, pull requests, and includes features like an integrated code editor, chat assistant, and system analytics.

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+ modules), CSS3, HTML5
- **Build Tool**: Vite 7.x
- **Desktop App**: Electron 22.x
- **API**: GitHub REST API
- **Node.js**: Version 18.0.0 or higher required

## Code Style and Conventions

### JavaScript

- Use ES6+ module syntax (`import`/`export`)
- Single quotes for strings (enforced by Prettier)
- Semicolons required
- 2-space indentation (no tabs)
- Arrow functions preferred: use `avoid` style for arrow parens
- Line width: 100 characters maximum
- Trailing commas: ES5 style
- End of line: LF

### File Organization

```
src/
├── js/
│   ├── api/           # GitHub API client implementations
│   ├── ui/            # UI components and managers
│   ├── editor/        # Code editor functionality
│   ├── chat/          # Chat features
│   ├── features/      # Feature modules (system monitor, AI, etc.)
│   ├── auth/          # Authentication logic
│   ├── storage/       # Session and storage management
│   ├── sidebar/       # Sidebar components
│   ├── modal/         # Modal dialogs
│   └── main.js        # Application entry point
├── styles/            # CSS modules
└── index.html         # Main HTML page
```

### Naming Conventions

- Use camelCase for variables and functions
- Use PascalCase for classes and constructors
- Manager objects follow the pattern: `{feature}Manager` (e.g., `tabManager`, `modalManager`)
- Export singleton instances with lowercase names
- Global window objects should match their module names

### Module Pattern

- Each feature is exported as a singleton object
- Manager objects are exposed globally via `window` object in `main.js`
- Use clear, descriptive names for imports and exports

Example:
```javascript
// Export pattern
export const featureManager = {
  init() { /* ... */ },
  // methods
};

// Global exposure in main.js
window.featureManager = featureManager;
```

## Development Workflow

### Commands

- `npm run dev` - Start development server (web) on http://localhost:5173
- `npm run build` - Build web version to `dist/`
- `npm run preview` - Preview production build
- `npm run electron:dev` - Start Electron in development mode
- `npm run electron:build` - Build Electron app with installers
- `npm run electron:pack` - Package Electron app without installer

### Before Committing

1. Ensure code follows Prettier configuration
2. Test changes in both web and Electron environments when applicable
3. Verify build completes successfully: `npm run build`
4. Follow existing patterns and conventions

## Architecture Guidelines

### Separation of Concerns

- API logic belongs in `src/js/api/`
- UI management in `src/js/ui/`
- Feature-specific code in `src/js/features/`
- Authentication/security in `src/js/auth/`

### State Management

- Session management through `src/js/storage/session.js`
- Avoid direct DOM manipulation where manager objects exist
- Use existing modal and tab managers for UI interactions

### GitHub API Integration

- All GitHub API calls should go through `src/js/api/githubManager.js`
- Handle authentication through `src/js/auth/github.js`
- Use personal access tokens for authentication

## Documentation Language

- Primary documentation is in Russian (README, CONTRIBUTING, etc.)
- Code comments should be clear and concise
- Complex logic should be commented in English or Russian

## Security Considerations

- Never commit GitHub tokens or sensitive credentials
- Use environment variables or secure storage for secrets
- Secrets management through `src/js/features/secretsManager.js`
- Follow security policy guidelines in SECURITY.md

## Build Outputs

- Web build: `dist/` directory
- Electron build: `dist-electron/` directory
- Both directories are gitignored
- Electron builds include installers for Windows (NSIS), macOS, and Linux (AppImage)

## Testing

- No formal test framework is currently configured
- Manual testing required for both web and Electron versions
- Test on multiple platforms when making cross-platform changes

## CI/CD

- GitHub Actions workflows in `.github/workflows/`
- Build workflow runs on push/PR to main and develop branches
- Tests multiple Node.js versions (18.x, 20.x) and OS platforms
- CodeQL analysis for security scanning

## Best Practices

1. **Maintain Consistency**: Follow existing patterns in the codebase
2. **Module Independence**: Each module should be self-contained
3. **Clear Comments**: Comment complex logic, especially GitHub API interactions
4. **Error Handling**: Properly handle API errors and edge cases
5. **Performance**: Consider performance for large repositories
6. **Accessibility**: Ensure UI remains accessible
7. **Cross-Platform**: Test changes on multiple operating systems when relevant
8. **Minimal Dependencies**: Prefer vanilla JavaScript, only add dependencies when necessary

## Common Patterns to Follow

### Manager Object Pattern
```javascript
export const exampleManager = {
  init() {
    // Initialization logic
  },
  
  doSomething() {
    // Feature logic
  }
};
```

### Import Order in main.js
1. Styles
2. Core (storage, auth)
3. UI components
4. Features
5. Global exposure

## Electron-Specific Guidelines

- Main process: `electron/main.cjs` (CommonJS)
- Preload script: `electron/preload.cjs` (CommonJS)
- Renderer process: All `src/js/` files (ES Modules)
- Use IPC for secure main/renderer communication
- Run with sandboxing disabled for development: `ELECTRON_DISABLE_SANDBOX=1`

## Version Requirements

- Node.js: >=18.0.0
- Electron: 22.3.27
- Vite: 7.3.0
