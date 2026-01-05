/**
 * SVG Icons для файлов и папок
 */

export const icons = {
    // Папка закрытая
    folder: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H6.17157C6.43679 1.5 6.69114 1.60536 6.87868 1.79289L7.70711 2.62132C7.89464 2.80886 8.149 2.91421 8.41421 2.91421H13C13.8284 2.91421 14.5 3.58579 14.5 4.41421V12C14.5 12.8284 13.8284 13.5 13 13.5H3C2.17157 13.5 1.5 12.8284 1.5 12V3Z" fill="#8b949e" stroke="#6e7681" stroke-width="1"/>
    </svg>`,
    
    // Папка открытая
    folderOpen: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H6.17157C6.43679 1.5 6.69114 1.60536 6.87868 1.79289L7.70711 2.62132C7.89464 2.80886 8.149 2.91421 8.41421 2.91421H13C13.8284 2.91421 14.5 3.58579 14.5 4.41421V5.5H2.5V3C2.5 2.72386 2.72386 2.5 3 2.5H6.17157L7 3.32843H13V4.41421" stroke="#58a6ff" stroke-width="1"/>
        <path d="M1 6.5H14L13 13.5H2L1 6.5Z" fill="#58a6ff" fill-opacity="0.2" stroke="#58a6ff" stroke-width="1"/>
    </svg>`,
    
    // Файл по умолчанию
    file: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#6e7681" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#6e7681" stroke-width="1"/>
    </svg>`,
    
    // JavaScript файл
    fileJs: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#f7df1e" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#f7df1e" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="5" font-weight="bold" fill="#f7df1e">JS</text>
    </svg>`,
    
    // TypeScript файл
    fileTs: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#3178c6" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#3178c6" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="5" font-weight="bold" fill="#3178c6">TS</text>
    </svg>`,
    
    // JSON файл
    fileJson: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#cbcb41" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#cbcb41" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="4" font-weight="bold" fill="#cbcb41">{}</text>
    </svg>`,
    
    // CSS файл
    fileCss: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#264de4" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#264de4" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="4" font-weight="bold" fill="#264de4">CSS</text>
    </svg>`,
    
    // HTML файл
    fileHtml: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#e34c26" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#e34c26" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="3.5" font-weight="bold" fill="#e34c26">HTML</text>
    </svg>`,
    
    // Markdown файл
    fileMd: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#519aba" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#519aba" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="4" font-weight="bold" fill="#519aba">MD</text>
    </svg>`,
    
    // Gitignore файл
    fileGit: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#f05032" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#f05032" stroke-width="1"/>
        <circle cx="8" cy="10" r="2.5" stroke="#f05032" stroke-width="1"/>
    </svg>`,
    
    // Репозиторий
    repo: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
    </svg>`,
    
    // Стрелка вправо (для раскрытия)
    chevronRight: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    
    // Стрелка вниз (раскрыто)
    chevronDown: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    
    // Плюс (добавить)
    plus: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    // Загрузить
    upload: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 10V2M7 2L4 5M7 2L10 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    // Информация
    info: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
        <path d="M7 6V10M7 4.5V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    // Настройки
    settings: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M7 1V3M7 11V13M1 7H3M11 7H13M2.5 2.5L4 4M10 10L11.5 11.5M11.5 2.5L10 4M4 10L2.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    // Pull Request
    pullRequest: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="3.5" cy="3.5" r="2" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="3.5" cy="10.5" r="2" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="10.5" cy="10.5" r="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M3.5 5.5V8.5M10.5 8.5V5.5C10.5 4.5 9.5 3.5 8.5 3.5H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    // Branch
    branch: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="4" cy="3" r="1.5" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="4" cy="11" r="1.5" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="10" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M4 4.5V9.5M4 5.5C4 5.5 4 6 5 6C6 6 8.5 6 8.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    // Issue
    issue: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="7" cy="7" r="2" fill="currentColor"/>
    </svg>`,
    
    // Star
    star: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 1L8.5 5H13L9.5 8L11 13L7 10L3 13L4.5 8L1 5H5.5L7 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`,
    
    // Fork
    fork: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="4" cy="3" r="1.5" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="10" cy="3" r="1.5" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="7" cy="11" r="1.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M4 4.5V6C4 7 5 8 7 8C9 8 10 7 10 6V4.5M7 8V9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    
    // Watch/Eye
    eye: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 7C1 7 3 3 7 3C11 3 13 7 13 7C13 7 11 11 7 11C3 11 1 7 1 7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.5"/>
    </svg>`
};

/**
 * Получить иконку по расширению файла
 */
export function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const dotfile = filename.startsWith('.');
    
    if (dotfile && filename.includes('git')) return icons.fileGit;
    
    const iconMap = {
        'js': icons.fileJs,
        'mjs': icons.fileJs,
        'cjs': icons.fileJs,
        'ts': icons.fileTs,
        'tsx': icons.fileTs,
        'jsx': icons.fileJs,
        'json': icons.fileJson,
        'css': icons.fileCss,
        'scss': icons.fileCss,
        'sass': icons.fileCss,
        'less': icons.fileCss,
        'html': icons.fileHtml,
        'htm': icons.fileHtml,
        'md': icons.fileMd,
        'markdown': icons.fileMd
    };
    
    return iconMap[ext] || icons.file;
}

export default icons;

