/**
 * AI Manager - Управление API ключами и интеграция с AI сервисами
 */

class AIManager {
    constructor() {
        this.storageKey = 'gitody_ai_keys';
        this.keys = [];
        this.providers = {
            openai: {
                name: 'OpenAI',
                baseUrl: 'https://api.openai.com/v1',
                models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                testEndpoint: '/models'
            },
            anthropic: {
                name: 'Anthropic',
                baseUrl: 'https://api.anthropic.com/v1',
                models: ['claude-3-opus', 'claude-3-sonnet', 'claude-2'],
                testEndpoint: '/messages',
                headers: { 'anthropic-version': '2023-06-01' }
            },
            google: {
                name: 'Google AI',
                baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                models: ['gemini-pro', 'gemini-pro-vision'],
                testEndpoint: '/models'
            },
            mistral: {
                name: 'Mistral AI',
                baseUrl: 'https://api.mistral.ai/v1',
                models: ['mistral-large', 'mistral-medium', 'mistral-small'],
                testEndpoint: '/models'
            },
            cohere: {
                name: 'Cohere',
                baseUrl: 'https://api.cohere.ai/v1',
                models: ['command', 'command-light', 'embed-english'],
                testEndpoint: '/models'
            },
            huggingface: {
                name: 'Hugging Face',
                baseUrl: 'https://api-inference.huggingface.co',
                models: ['inference-api'],
                testEndpoint: '/models/gpt2'
            },
            replicate: {
                name: 'Replicate',
                baseUrl: 'https://api.replicate.com/v1',
                models: ['llama', 'stable-diffusion'],
                testEndpoint: '/models'
            },
            groq: {
                name: 'Groq',
                baseUrl: 'https://api.groq.com/openai/v1',
                models: ['llama3-70b', 'mixtral-8x7b'],
                testEndpoint: '/models'
            },
            openrouter: {
                name: 'OpenRouter',
                baseUrl: 'https://openrouter.ai/api/v1',
                models: ['multi-provider'],
                testEndpoint: '/models'
            },
            together: {
                name: 'Together AI',
                baseUrl: 'https://api.together.xyz/v1',
                models: ['llama', 'mistral', 'code-llama'],
                testEndpoint: '/models'
            },
            perplexity: {
                name: 'Perplexity',
                baseUrl: 'https://api.perplexity.ai',
                models: ['pplx-7b-online', 'pplx-70b-online'],
                testEndpoint: '/chat/completions'
            },
            custom: {
                name: 'Custom API',
                baseUrl: '',
                models: ['custom'],
                testEndpoint: '/models'
            }
        };
        
        // MCP Integration
        this.mcpServers = []; // { name, url, status }
        this.mcpTools = new Map(); // server -> tools[]
    }

    init() {
        this.load();
        this.render();
        this.setupEventListeners();
        this.initMcp();
    }

    // === MCP Integration ===
    
    async initMcp() {
        // Load MCP config if exists
        try {
            const saved = localStorage.getItem('gitody_mcp_servers');
            this.mcpServers = saved ? JSON.parse(saved) : [];
            this.refreshMcpTools();
        } catch (e) {
            console.error('[MCP] Load error:', e);
        }
    }

    async refreshMcpTools() {
        // In a real app, this would connect to MCP servers via stdio or SSE.
        // Since we are in a browser/Electron environment, we can support SSE-based MCP servers or local bridges.
        // For now, we simulate tool registration based on the user query example.
        
        this.mcpServers.forEach(server => {
            // Simulated discovery
            if (server.name === 'ImageGen') {
                this.registerMcpTool(server.name, 'generate_image', async (params) => {
                    // Simulation of the user provided snippet
                    const RED_CIRCLE_BASE64 = "/9j/4AAQSkZJRgABAgEASABIAAD/2w..."; // Mock
                    return {
                        content: [
                            {
                                type: "image",
                                data: RED_CIRCLE_BASE64, // In reality would be real base64
                                mimeType: "image/jpeg",
                            },
                        ],
                    };
                });
            }
        });
    }

    registerMcpTool(serverName, toolName, handler) {
        if (!this.mcpTools.has(serverName)) {
            this.mcpTools.set(serverName, []);
        }
        const tools = this.mcpTools.get(serverName);
        tools.push({ name: toolName, handler });
        console.log(`[MCP] Registered tool ${toolName} from ${serverName}`);
    }

    async callMcpTool(serverName, toolName, params) {
        const tools = this.mcpTools.get(serverName);
        const tool = tools?.find(t => t.name === toolName);
        if (!tool) throw new Error(`Tool ${toolName} not found on ${serverName}`);
        
        return await tool.handler(params);
    }

    // === Existing AI Methods ===

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            this.keys = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('[AI] Load error:', e);
            this.keys = [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.keys));
        } catch (e) {
            console.error('[AI] Save error:', e);
        }
    }

    setupEventListeners() {
        // Provider selection in modal
        document.addEventListener('change', (e) => {
            if (e.target.id === 'aiProviderSelect') {
                const customUrlGroup = document.getElementById('customUrlGroup');
                if (customUrlGroup) {
                    customUrlGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
                }
            }
        });
    }

    render() {
        const container = document.getElementById('aiKeysList');
        if (!container) return;

        if (this.keys.length === 0) {
            container.innerHTML = '<div class="ai-keys-empty">Нет добавленных ключей</div>';
        } else {
            container.innerHTML = this.keys.map((key, index) => `
                <div class="ai-key-item" data-index="${index}">
                    <div class="ai-key-info">
                        <div class="ai-key-provider">${this.providers[key.provider]?.name || key.provider}</div>
                        <div class="ai-key-value">${this.maskKey(key.key)}</div>
                        ${key.name ? `<div class="ai-key-name">${this.escapeHtml(key.name)}</div>` : ''}
                    </div>
                    <div class="ai-key-actions">
                        <button class="monitor-btn" onclick="aiManager.testKey(${index})" title="Проверить">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                        <button class="monitor-btn" onclick="aiManager.copyKey(${index})" title="Копировать">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </button>
                        <button class="monitor-btn danger" onclick="aiManager.deleteKey(${index})" title="Удалить">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        this.updateProviderStatuses();
        this.renderMcpSection();
    }

    showAddMcpModal() {
        const modalHtml = `
            <div class="modal-overlay active" id="mcpModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <span>Add MCP Server</span>
                        <button class="modal-close" onclick="document.getElementById('mcpModal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="mcpName" class="form-input" placeholder="My Server">
                        </div>
                        <div class="form-group">
                            <label>Config (JSON)</label>
                            <textarea id="mcpConfig" class="form-input" style="height: 100px;" placeholder='{"command": "node", "args": ["server.js"]}'></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="monitor-btn" onclick="document.getElementById('mcpModal').remove()">Cancel</button>
                        <button class="monitor-btn primary" onclick="aiManager.saveMcpServer()">Save</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    saveMcpServer() {
        const name = document.getElementById('mcpName').value;
        const configStr = document.getElementById('mcpConfig').value;
        
        try {
            const config = JSON.parse(configStr);
            this.addMcpServer(name, config);
            document.getElementById('mcpModal').remove();
        } catch (e) {
            alert('Invalid JSON config: ' + e.message);
        }
    }

    importMcpConfig() {
        const input = prompt('Paste MCP Deep Link (cursor://...) or Base64 Config:');
        if (!input) return;

        try {
            let configStr = input;
            let name = 'Imported Server';

            // Check if it's a deep link
            if (input.startsWith('cursor://')) {
                const url = new URL(input);
                name = url.searchParams.get('name') || name;
                const base64Config = url.searchParams.get('config');
                if (base64Config) {
                    configStr = atob(base64Config);
                }
            } else {
                // Try to decode if it looks like base64 (no spaces, basic check)
                if (!input.trim().startsWith('{') && /^[a-zA-Z0-9+/=]+$/.test(input.trim())) {
                    try {
                        const decoded = atob(input);
                        if (decoded.startsWith('{')) configStr = decoded;
                    } catch (e) {
                        // Not base64, treat as raw json
                    }
                }
            }

            const config = JSON.parse(configStr);
            this.addMcpServer(name, config);
            alert(`MCP Server '${name}' imported successfully!`);
        } catch (e) {
            console.error(e);
            alert('Failed to import config: ' + e.message);
        }
    }

    addMcpServer(name, config) {
        // Store config instead of just URL
        this.mcpServers.push({ name, config, status: 'unknown' });
        localStorage.setItem('gitody_mcp_servers', JSON.stringify(this.mcpServers));
        this.refreshMcpTools();
        this.render();
    }

    renderMcpSection() {
        const container = document.getElementById('mcpServersList');
        if (!container) return;
        
        container.innerHTML = this.mcpServers.map(server => `
            <div class="ai-key-item">
                <div class="ai-key-info">
                    <div class="ai-key-provider">MCP: ${this.escapeHtml(server.name)}</div>
                    <div class="ai-key-value" style="font-size: 10px; opacity: 0.7;">${this.escapeHtml(JSON.stringify(server.config).substring(0, 50))}...</div>
                </div>
                <div class="ai-key-actions">
                    <button class="monitor-btn danger" onclick="aiManager.removeMcpServer('${server.name}')">×</button>
                </div>
            </div>
        `).join('');
    }

    removeMcpServer(name) {
        this.mcpServers = this.mcpServers.filter(s => s.name !== name);
        localStorage.setItem('gitody_mcp_servers', JSON.stringify(this.mcpServers));
        this.render();
    }

    updateProviderStatuses() {
        Object.keys(this.providers).forEach(provider => {
            const statusEl = document.getElementById(`${provider}-status`);
            if (statusEl) {
                const hasKey = this.keys.some(k => k.provider === provider);
                statusEl.textContent = hasKey ? 'Подключен' : 'Не подключен';
                statusEl.className = 'provider-status' + (hasKey ? ' connected' : '');
            }
        });
    }

    maskKey(key) {
        if (!key || key.length < 12) return '••••••••';
        return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showAddKeyModal() {
        const providerOptions = Object.entries(this.providers)
            .map(([id, p]) => `<option value="${id}">${p.name}</option>`)
            .join('');

        const modalHtml = `
            <div class="modal-overlay active" id="aiKeyModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <span>Добавить API ключ</span>
                        <button class="modal-close" onclick="aiManager.closeModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Провайдер</label>
                            <select id="aiProviderSelect" class="form-input">
                                ${providerOptions}
                            </select>
                        </div>
                        <div class="form-group" id="customUrlGroup" style="display: none;">
                            <label>Base URL</label>
                            <input type="text" id="aiCustomUrl" class="form-input" placeholder="https://api.example.com/v1">
                        </div>
                        <div class="form-group">
                            <label>API Ключ</label>
                            <input type="password" id="aiKeyInput" class="form-input" placeholder="sk-...">
                        </div>
                        <div class="form-group">
                            <label>Название (опционально)</label>
                            <input type="text" id="aiKeyName" class="form-input" placeholder="Мой ключ">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="monitor-btn" onclick="aiManager.closeModal()">Отмена</button>
                        <button class="monitor-btn primary" onclick="aiManager.saveKey()">Сохранить</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    closeModal() {
        const modal = document.getElementById('aiKeyModal');
        if (modal) modal.remove();
    }

    saveKey() {
        const provider = document.getElementById('aiProviderSelect')?.value;
        const key = document.getElementById('aiKeyInput')?.value.trim();
        const name = document.getElementById('aiKeyName')?.value.trim();
        const customUrl = document.getElementById('aiCustomUrl')?.value.trim();

        if (!provider || !key) {
            alert('Выберите провайдера и введите ключ');
            return;
        }

        const keyData = {
            provider,
            key,
            name: name || '',
            customUrl: provider === 'custom' ? customUrl : '',
            addedAt: Date.now()
        };

        // Remove existing key for same provider
        this.keys = this.keys.filter(k => k.provider !== provider);
        this.keys.push(keyData);
        this.save();
        this.render();
        this.closeModal();
    }

    deleteKey(index) {
        if (confirm('Удалить этот ключ?')) {
            this.keys.splice(index, 1);
            this.save();
            this.render();
        }
    }

    copyKey(index) {
        const key = this.keys[index]?.key;
        if (key) {
            navigator.clipboard.writeText(key).then(() => {
                this.showNotification('Ключ скопирован');
            });
        }
    }

    async testKey(index) {
        const keyData = this.keys[index];
        if (!keyData) return;

        const provider = this.providers[keyData.provider];
        if (!provider) return;

        const baseUrl = keyData.customUrl || provider.baseUrl;
        const testUrl = baseUrl + provider.testEndpoint;

        try {
            const headers = {
                'Authorization': `Bearer ${keyData.key}`,
                'Content-Type': 'application/json',
                ...provider.headers
            };

            // Special handling for different providers
            if (keyData.provider === 'anthropic') {
                headers['x-api-key'] = keyData.key;
                delete headers['Authorization'];
            } else if (keyData.provider === 'google') {
                // Google uses key as query param
            }

            const response = await fetch(testUrl, {
                method: 'GET',
                headers
            });

            if (response.ok) {
                this.showNotification('Ключ работает');
            } else {
                this.showNotification('Ошибка: ' + response.status, 'error');
            }
        } catch (e) {
            this.showNotification('Ошибка подключения', 'error');
            console.error('[AI] Test error:', e);
        }
    }

    getKey(provider) {
        const keyData = this.keys.find(k => k.provider === provider);
        return keyData?.key || null;
    }

    getProvider(provider) {
        const keyData = this.keys.find(k => k.provider === provider);
        if (!keyData) return null;

        return {
            ...this.providers[provider],
            key: keyData.key,
            customUrl: keyData.customUrl
        };
    }

    async chat(provider, messages, options = {}) {
        const providerData = this.getProvider(provider);
        if (!providerData) {
            throw new Error('Provider not configured: ' + provider);
        }

        const baseUrl = providerData.customUrl || providerData.baseUrl;
        const url = baseUrl + '/chat/completions';

        const body = {
            model: options.model || providerData.models[0],
            messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2048,
            stream: options.stream || false
        };

        const headers = {
            'Authorization': `Bearer ${providerData.key}`,
            'Content-Type': 'application/json',
            ...providerData.headers
        };

        // Provider-specific adjustments
        if (provider === 'anthropic') {
            headers['x-api-key'] = providerData.key;
            delete headers['Authorization'];
            body.max_tokens = options.maxTokens || 4096;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Normalize response
        if (provider === 'anthropic') {
            return {
                content: data.content?.[0]?.text || '',
                usage: data.usage
            };
        }

        return {
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage
        };
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'ai-notification ' + type;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

export const aiManager = new AIManager();

