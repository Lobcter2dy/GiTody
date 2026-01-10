# GiTody - GitHub Repository Manager

## Project Overview

GiTody is a cross-platform GitHub repository manager built with Vanilla JavaScript and Electron. It provides a web interface and desktop application for managing GitHub repositories, branches, pull requests, and includes an integrated code editor and chat assistant.

**Primary Languages**: JavaScript (ES6+), HTML5, CSS3  
**Build Tool**: Vite  
**Desktop Framework**: Electron 22  
**API**: GitHub REST API

## Build & Test

### Prerequisites
- Node.js >= 18.0.0
- npm (comes with Node.js)
- GitHub Personal Access Token for API access

### Development Commands
```bash
# Install dependencies
npm install

# Web development server (http://localhost:5173)
npm run dev

# Electron development mode
npm run electron:dev

# Build web version
npm run build

# Build Electron application
npm run electron:build

# Preview production build
npm run preview
```

### CI/CD
- Automated builds run on push and PR to `main` and `develop` branches
- Tested on Ubuntu, Windows, and macOS
- Node.js versions: 18.x, 20.x
- Build artifacts are uploaded for ubuntu-latest with Node.js 20.x

## Project Structure

```
GiTody/
├── src/                    # Source code
│   ├── js/                # JavaScript modules
│   │   ├── api/           # GitHub API client
│   │   ├── ui/            # UI components
│   │   ├── editor/        # Code editor functionality
│   │   ├── chat/          # Chat assistant features
│   │   ├── auth/          # Authentication logic
│   │   ├── storage/       # Local storage utilities
│   │   ├── modal/         # Modal dialogs
│   │   ├── sidebar/       # Sidebar components
│   │   ├── features/      # Feature modules
│   │   └── main.js        # Main application entry
│   ├── styles/            # CSS modules
│   └── index.html         # Main HTML page
├── electron/              # Electron configuration
│   ├── main.cjs          # Main process
│   └── preload.cjs       # Preload script (security bridge)
├── dist/                 # Built web files (gitignored)
├── dist-electron/        # Built Electron files (gitignored)
└── package.json          # Dependencies and scripts
```

## Code Standards & Conventions

### JavaScript
- Use modern ES6+ features (const/let, arrow functions, async/await, destructuring)
- Use camelCase for variables and functions
- Use PascalCase for class names
- Add JSDoc comments for exported functions and complex logic
- Prefer async/await over raw Promises
- Use template literals for string interpolation
- Avoid using `var` - use `const` by default, `let` when reassignment is needed

### HTML/CSS
- Use semantic HTML5 elements
- CSS modules are organized in `src/styles/`
- Follow existing naming conventions in CSS (kebab-case for class names)
- Ensure responsive design principles are maintained

### File Organization
- Keep related functionality together in modules
- API calls should go in `src/js/api/`
- UI components should go in `src/js/ui/`
- Utility functions should go in `src/js/utils/` (if the directory exists)

### Electron-Specific
- Main process code goes in `electron/main.cjs` (CommonJS)
- Preload scripts go in `electron/preload.cjs` (CommonJS)
- Never expose Node.js/Electron APIs directly to renderer; use contextBridge in preload
- Follow Electron security best practices

## Security Considerations

- Never commit GitHub tokens or sensitive credentials
- All API tokens should be stored securely (local storage or system keychain)
- Follow Electron security guidelines (nodeIntegration: false, contextIsolation: true)
- Sanitize user input before displaying or processing
- Use Content Security Policy (CSP) where applicable

## GitHub API Usage

- Use GitHub REST API v3
- Implement proper error handling for API calls (rate limits, authentication errors)
- Cache API responses when appropriate to reduce rate limit usage
- Handle pagination for large datasets

## Contribution Guidelines

- Create a feature branch from `main` or `develop`
- Use clear, descriptive commit messages
- Test changes locally before submitting PR
- Update documentation if adding new features
- Follow existing code style and patterns
- PRs should target `develop` branch unless it's a hotfix

## Testing

- Test web version with `npm run dev` before committing
- Test Electron version with `npm run electron:dev` for desktop-specific features
- Verify builds complete successfully with `npm run build`
- Check that changes work across different operating systems (if possible)

## Common Tasks

### Adding a new feature
1. Create module in appropriate `src/js/` subdirectory
2. Import and integrate in relevant component or `main.js`
3. Add UI elements if needed
4. Test in both web and Electron environments
5. Update documentation

### Working with GitHub API
- API wrapper functions should be in `src/js/api/`
- Handle authentication state properly
- Implement error handling for network failures
- Consider rate limiting

### Modifying Electron behavior
- Main process changes go in `electron/main.cjs`
- IPC communication should use contextBridge in `electron/preload.cjs`
- Test in Electron dev mode with `npm run electron:dev`

## Notes

- Application supports both Russian and English (primarily Russian in UI)
- Project uses Vite for fast development and optimized builds
- Electron version uses sandbox mode disabled for development (ELECTRON_DISABLE_SANDBOX=1)
- The application is meant to be user-friendly for GitHub repository management
