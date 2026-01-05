var L=Object.defineProperty;var $=(o,e,t)=>e in o?L(o,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):o[e]=t;var w=(o,e,t)=>$(o,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function t(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(n){if(n.ep)return;n.ep=!0;const i=t(n);fetch(n.href,i)}})();const KEYS={TOKEN:"GITODY_TOKEN",USER:"GITODY_USER",REPO:"GITODY_REPO",TAB:"GITODY_TAB"};let _token=localStorage.getItem(KEYS.TOKEN),_user=null,_repo=localStorage.getItem(KEYS.REPO),_tab=localStorage.getItem(KEYS.TAB)||"dashboard";try{const o=localStorage.getItem(KEYS.USER);o&&(_user=JSON.parse(o))}catch(o){console.error("[Session] Failed to parse user:",o)}console.log("[Session] Loaded from localStorage:");console.log("  Token:",_token?"YES ("+_token.substring(0,8)+"...)":"NO");console.log("  User:",(_user==null?void 0:_user.login)||"NO");console.log("  Repo:",_repo||"NO");console.log("  Tab:",_tab);const session={getToken(){return _token},setToken(o){_token=o,o?(localStorage.setItem(KEYS.TOKEN,o),console.log("[Session] Token SAVED:",o.substring(0,8)+"...")):(localStorage.removeItem(KEYS.TOKEN),console.log("[Session] Token CLEARED"))},hasToken(){return!!_token},clearToken(){_token=null,localStorage.removeItem(KEYS.TOKEN)},getUser(){return _user},setUser(o){_user=o,o?(localStorage.setItem(KEYS.USER,JSON.stringify(o)),console.log("[Session] User SAVED:",o.login)):(localStorage.removeItem(KEYS.USER),console.log("[Session] User CLEARED"))},clearUser(){_user=null,localStorage.removeItem(KEYS.USER)},getActiveRepo(){return _repo},setActiveRepo(o){_repo=o,o?localStorage.setItem(KEYS.REPO,o):localStorage.removeItem(KEYS.REPO)},getActiveTab(){return _tab},setActiveTab(o){_tab=o,localStorage.setItem(KEYS.TAB,o)},getFolderColors(){try{const o=localStorage.getItem("GITODY_COLORS");return o?JSON.parse(o):{}}catch{return{}}},setFolderColors(o){localStorage.setItem("GITODY_COLORS",JSON.stringify(o))},logout(){this.clearToken(),this.clearUser(),_repo=null,localStorage.removeItem(KEYS.REPO),console.log("[Session] LOGGED OUT")},debug(){console.log("=== SESSION DEBUG ==="),console.log("Token in memory:",_token?"YES":"NO"),console.log("Token in storage:",localStorage.getItem(KEYS.TOKEN)?"YES":"NO"),console.log("User in memory:",(_user==null?void 0:_user.login)||"NO"),console.log("User in storage:",localStorage.getItem(KEYS.USER)?"YES":"NO"),console.log("=====================")}};window.session=session;setInterval(()=>{const o=localStorage.getItem(KEYS.TOKEN);_token&&!o&&(console.error("[Session] TOKEN WAS LOST! Restoring..."),localStorage.setItem(KEYS.TOKEN,_token))},5e3);const scriptRel="modulepreload",assetsURL=function(o,e){return new URL(o,e).href},seen={},__vitePreload=function(e,t,s){let n=Promise.resolve();if(t&&t.length>0){const a=document.getElementsByTagName("link"),r=document.querySelector("meta[property=csp-nonce]"),l=(r==null?void 0:r.nonce)||(r==null?void 0:r.getAttribute("nonce"));n=Promise.allSettled(t.map(c=>{if(c=assetsURL(c,s),c in seen)return;seen[c]=!0;const d=c.endsWith(".css"),u=d?'[rel="stylesheet"]':"";if(!!s)for(let m=a.length-1;m>=0;m--){const v=a[m];if(v.href===c&&(!d||v.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${c}"]${u}`))return;const p=document.createElement("link");if(p.rel=d?"stylesheet":scriptRel,d||(p.as="script"),p.crossOrigin="",p.href=c,l&&p.setAttribute("nonce",l),document.head.appendChild(p),d)return new Promise((m,v)=>{p.addEventListener("load",m),p.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${c}`)))})}))}function i(a){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=a,window.dispatchEvent(r),!r.defaultPrevented)throw a}return n.then(a=>{for(const r of a||[])r.status==="rejected"&&i(r.reason);return e().catch(i)})},API="https://api.github.com";class GitHubAuth{constructor(){this.user=session.getUser(),this.isConnected=!!this.user&&session.hasToken(),this.tokenScopes=null,console.log("[Auth] Created, connected:",this.isConnected)}async init(){return console.log("[Auth] Init..."),this.user&&(this.isConnected=!0,this.updateUI(),console.log("[Auth] Restored user:",this.user.login)),session.hasToken()&&await this.verifyToken(),this.isConnected}async verifyToken(){try{const e=session.getToken();if(!e)return!1;const t=await fetch(`${API}/user`,{headers:{Authorization:`Bearer ${e}`,Accept:"application/vnd.github.v3+json"}});if(!t.ok)return t.status===401?(console.warn("[Auth] Token invalid, removing..."),session.logout(),this.user=null,this.isConnected=!1,this.updateUI(),!1):(console.warn("[Auth] Token check failed:",t.status),!1);const s=t.headers.get("x-oauth-scopes")||t.headers.get("x-accepted-oauth-scopes")||"";this.tokenScopes=s.split(",").map(i=>i.trim()).filter(Boolean);const n=await t.json();return this.user=n,this.isConnected=!0,session.setUser(n),this.updateUI(),console.log("[Auth] Token verified, user:",n.login,"scopes:",this.tokenScopes),this.checkRequiredScopes(),!0}catch(e){return console.warn("[Auth] Network error:",e.message),!1}}checkRequiredScopes(){const t=["repo","read:user","user:email"].filter(s=>{var n;return!((n=this.tokenScopes)!=null&&n.includes(s))});t.length>0&&console.warn("[Auth] Missing scopes:",t)}async connect(e){if(!(e!=null&&e.trim()))return{success:!1,error:"Введите токен"};const t=e.trim();try{const s=await fetch(`${API}/user`,{headers:{Authorization:`Bearer ${t}`,Accept:"application/vnd.github.v3+json"}});if(!s.ok)return s.status===401?{success:!1,error:"Неверный токен. Проверьте правильность токена."}:s.status===403?{success:!1,error:"Доступ запрещён. Проверьте права токена."}:{success:!1,error:`Ошибка ${s.status}: ${s.statusText}`};const n=s.headers.get("x-oauth-scopes")||s.headers.get("x-accepted-oauth-scopes")||"";this.tokenScopes=n.split(",").map(l=>l.trim()).filter(Boolean);const i=await s.json(),r=["repo","read:user"].filter(l=>!this.tokenScopes.includes(l));return r.length>0?{success:!1,error:`Недостаточно прав. Требуются: ${r.join(", ")}. Проверьте настройки токена.`}:(session.setToken(t),session.setUser(i),this.user=i,this.isConnected=!0,this.updateUI(),console.log("[Auth] Connected:",i.login,"scopes:",this.tokenScopes),{success:!0,user:i,scopes:this.tokenScopes})}catch(s){return console.error("[Auth] Connect error:",s),{success:!1,error:"Ошибка сети. Проверьте подключение к интернету."}}}async connectOAuth(){try{const{githubOAuth:e}=await __vitePreload(async()=>{const{githubOAuth:s}=await import("./githubOAuth-NU3ETMsK.js");return{githubOAuth:s}},[],import.meta.url),t=await e.authorize();return{success:!0,message:"OAuth авторизация успешна. Введите полученный токен."}}catch(e){return console.error("[Auth] OAuth error:",e),{success:!1,error:e.message||"Ошибка OAuth авторизации"}}}openTokenPage(){const t=`https://github.com/settings/tokens/new?description=GITODY-${Date.now()}&scopes=repo,read:user,user:email,delete_repo`;window.open(t,"_blank")}logout(){session.logout(),this.user=null,this.isConnected=!1,this.tokenScopes=null,this.updateUI(),console.log("[Auth] Logged out")}updateUI(){var a,r;const e=document.getElementById("userAvatarBtn");e&&(e.innerHTML=(a=this.user)!=null&&a.avatar_url?`<img src="${this.user.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`:'<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/></svg>');const t=document.getElementById("dropdownUserInfo");t&&(t.innerHTML=this.user?`<div class="dropdown-user-name">${this.user.name||this.user.login}</div><div class="dropdown-user-email">@${this.user.login}</div>`:'<div class="dropdown-user-name">Не авторизован</div><div class="dropdown-user-email">Подключите GitHub</div>');const s=document.getElementById("connectCheck");s&&s.classList.toggle("visible",this.isConnected);const n=document.querySelector(".connect-card"),i=document.getElementById("connectInfo");if(n&&n.classList.toggle("connected",this.isConnected),i)if(this.user){const l=(r=this.tokenScopes)!=null&&r.length?`<div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">Права: ${this.tokenScopes.slice(0,3).join(", ")}${this.tokenScopes.length>3?"...":""}</div>`:"";i.innerHTML=`
                    <div class="connect-title" style="color:#3fb950;">✓ Подключено</div>
                    <div class="connect-desc">
                        <img src="${this.user.avatar_url}" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;margin-right:10px;">
                        <strong>${this.user.login}</strong>
                    </div>
                    ${l}
                `}else i.innerHTML=`
                    <div class="connect-title">Не подключено</div>
                    <div class="connect-desc">Подключите GitHub для работы с репозиториями</div>
                `}getToken(){return session.getToken()}getUser(){return this.user}getScopes(){return this.tokenScopes||[]}hasScope(e){var t;return((t=this.tokenScopes)==null?void 0:t.includes(e))||!1}getHeaders(){const e=this.getToken();return{Authorization:e?`Bearer ${e}`:"",Accept:"application/vnd.github.v3+json","Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28"}}}const githubAuth=new GitHubAuth;window.githubAuth=githubAuth;class ModalManager{constructor(){this.activeModal=null,this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.initializeModal()):this.initializeModal()}initializeModal(){document.addEventListener("click",e=>{e.target.classList.contains("modal")&&this.close(e.target.id.replace("Modal",""))})}show(e){this.closeAll();const t=document.getElementById(`${e}Modal`);t&&(t.classList.add("active"),this.activeModal=e)}close(e){const t=document.getElementById(`${e}Modal`);t&&(t.classList.remove("active"),this.activeModal===e&&(this.activeModal=null))}closeAll(){document.querySelectorAll(".modal").forEach(e=>{e.classList.remove("active")}),this.activeModal=null}switch(e,t){this.close(e),this.show(t)}}const modalManager=new ModalManager;class TabManager{constructor(){this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.initializeTabs()):this.initializeTabs()}initializeTabs(){document.querySelectorAll(".tab").forEach(e=>{e.addEventListener("click",()=>{const t=e.getAttribute("data-tab");this.switchTab(t)})})}switchTab(e){document.querySelectorAll(".tab").forEach(n=>n.classList.remove("active")),document.querySelectorAll(".tab-content").forEach(n=>n.classList.remove("active"));const t=document.querySelector(`[data-tab="${e}"]`),s=document.getElementById(e);t&&t.classList.add("active"),s&&s.classList.add("active"),window.stateManager&&window.stateManager.set("activeTab",e)}getActiveTab(){var e;return(e=document.querySelector(".tab.active"))==null?void 0:e.getAttribute("data-tab")}}const tabManager=new TabManager;class DropdownManager{constructor(){this.activeDropdown=null,this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.initializeDropdown()):this.initializeDropdown()}initializeDropdown(){const e=document.getElementById("userAvatarBtn"),t=document.getElementById("userDropdown");e&&t&&(e.addEventListener("click",s=>{s.stopPropagation(),this.toggle("userDropdown")}),t.addEventListener("click",s=>{s.stopPropagation()})),document.addEventListener("click",()=>{this.closeAll()})}toggle(e){const t=document.getElementById(e);t&&(this.activeDropdown===e?(t.classList.remove("active"),this.activeDropdown=null):(this.closeAll(),t.classList.add("active"),this.activeDropdown=e))}closeAll(){document.querySelectorAll(".dropdown-menu").forEach(e=>{e.classList.remove("active")}),this.activeDropdown=null}}const dropdownManager=new DropdownManager;class NavRing{constructor(){this.tabs=["dashboard","github","chat","editor","settings","information","storage"],this.currentIndex=0,this.isInitialized=!1}init(){this.isInitialized||(this.isInitialized=!0,document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.initialize(),{once:!0}):this.initialize())}initialize(){const e=document.getElementById("navArc");if(!e)return;document.querySelectorAll(".nav-arc-item").forEach(n=>{n.addEventListener("click",()=>{const i=parseInt(n.dataset.index);this.goTo(i)})}),e.addEventListener("wheel",n=>{const i=e.getBoundingClientRect(),a=n.clientX-i.left,r=n.clientY-i.top;Math.sqrt(a*a+r*r)<140&&(n.preventDefault(),n.deltaY>0?this.next():this.prev())},!1);const t=session.getActiveTab(),s=this.tabs.indexOf(t);s!==-1&&(this.currentIndex=s),this.updateActive()}next(){this.currentIndex=(this.currentIndex+1)%this.tabs.length,this.updateActive()}prev(){this.currentIndex=(this.currentIndex-1+this.tabs.length)%this.tabs.length,this.updateActive()}goTo(e){e>=0&&e<this.tabs.length&&(this.currentIndex=e,this.updateActive())}updateActive(){const e=this.tabs[this.currentIndex];document.querySelectorAll(".nav-arc-item").forEach(s=>{const n=s.dataset.tab===e;s.classList.toggle("active",n),n&&(s.classList.add("pulse"),setTimeout(()=>s.classList.remove("pulse"),300))}),document.querySelectorAll(".tab-content").forEach(s=>s.classList.remove("active"));const t=document.getElementById(e);t&&t.classList.add("active"),session.setActiveTab(e)}setActiveTab(e){const t=this.tabs.indexOf(e);t!==-1&&(this.currentIndex=t,this.updateActive())}}const navRing=new NavRing;window.navRing=navRing;class GitHubPanelManager{constructor(){this.activeSection="branches",this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.initialize()):this.initialize()}initialize(){document.querySelectorAll(".github-icon-btn").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.section;this.switchSection(t)})}),document.querySelectorAll(".github-nav-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.section;this.switchSection(t)})}),this.switchSection("overview")}switchSection(e){this.activeSection=e,document.querySelectorAll(".github-icon-btn").forEach(t=>{t.classList.toggle("active",t.dataset.section===e)}),document.querySelectorAll(".github-nav-item").forEach(t=>{t.classList.toggle("active",t.dataset.section===e)}),document.querySelectorAll(".github-section").forEach(t=>{t.classList.toggle("active",t.id===`section-${e}`)}),window.stateManager&&window.stateManager.set("activeGithubSection",e)}async loadBranches(){console.log("[GitHubPanel] Loading branches...")}async loadPullRequests(){console.log("[GitHubPanel] Loading pull requests...")}async loadIssues(){console.log("[GitHubPanel] Loading issues...")}async loadCommits(){console.log("[GitHubPanel] Loading commits...")}async loadActions(){console.log("[GitHubPanel] Loading actions...")}async loadReleases(){console.log("[GitHubPanel] Loading releases...")}createBranch(){const e=prompt("Введите имя новой ветки:");e&&(console.log("[GitHubPanel] Creating branch:",e),alert(`Ветка "${e}" создана`))}createPullRequest(){console.log("[GitHubPanel] Creating new PR...")}createIssue(){console.log("[GitHubPanel] Creating new issue...")}createRelease(){console.log("[GitHubPanel] Creating new release...")}}const githubPanelManager=new GitHubPanelManager;window.githubPanelManager=githubPanelManager;class CodeEditor{constructor(){this.currentFile=null,this.files=new Map,this.history=[],this.historyStep=-1,this.syntaxRules=this.initSyntaxRules(),this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.initialize()):this.initialize()}initialize(){this.setupEventListeners(),this.updateLineNumbers()}setupEventListeners(){const o=document.getElementById("codeInput");o&&(o.addEventListener("input",()=>this.onCodeChange()),o.addEventListener("scroll",()=>this.syncScroll()),o.addEventListener("keydown",e=>this.handleKeyboard(e)),o.addEventListener("keyup",()=>this.updateCursorPosition()),o.addEventListener("click",()=>this.updateCursorPosition()))}initSyntaxRules(){return{javascript:{keywords:["function","const","let","var","if","else","for","while","return","class","new","this","true","false","null","undefined","async","await","try","catch","throw","import","export","default","from","extends","static","get","set","typeof","instanceof","in","of","switch","case","break","continue","do","finally","debugger","delete","void","with","yield","super"],types:["String","Number","Boolean","Array","Object","Promise","Map","Set"],builtins:["console","document","window","Math","Date","JSON","parseInt","parseFloat","setTimeout","setInterval","fetch","localStorage","sessionStorage"]},json:{keywords:["true","false","null"]},html:{keywords:[]},css:{keywords:[]},python:{keywords:["def","class","if","elif","else","for","while","return","import","from","as","try","except","finally","with","lambda","pass","break","continue","True","False","None","and","or","not","in","is","global","nonlocal","assert","yield","raise","async","await","del"]}}}onCodeChange(){const o=document.getElementById("codeInput");if(!o)return;const e=o.value;this.currentFile&&this.files.set(this.currentFile,{...this.files.get(this.currentFile),content:e,modified:!0}),this.highlightCode(),this.updateLineNumbers(),this.updateCursorPosition(),(this.history.length===0||this.history[this.history.length-1]!==e)&&(this.history.splice(this.historyStep+1),this.history.push(e),this.historyStep++,this.history.length>100&&(this.history.shift(),this.historyStep--))}highlightCode(){const o=document.getElementById("codeInput"),e=document.getElementById("codeDisplay");if(!o||!e)return;const t=o.value,s=this.detectLanguage(this.currentFile||"untitled.js");let n=this.escapeHtml(t);switch(s){case"javascript":case"typescript":n=this.highlightJavaScript(n);break;case"json":n=this.highlightJSON(n);break;case"python":n=this.highlightPython(n);break;case"html":n=this.highlightHTML(n);break;case"css":n=this.highlightCSS(n);break}e.innerHTML=n}highlightJavaScript(o){const e=this.syntaxRules.javascript;return o=o.replace(/\/\/.*$/gm,'<span class="comment">$&</span>'),o=o.replace(/\/\*[\s\S]*?\*\//g,'<span class="comment">$&</span>'),o=o.replace(/"([^"\\]|\\.)*"/g,'<span class="string">$&</span>'),o=o.replace(/'([^'\\]|\\.)*'/g,'<span class="string">$&</span>'),o=o.replace(/`([^`\\]|\\.)*`/g,'<span class="string">$&</span>'),o=o.replace(/\b(\d+\.?\d*)\b/g,'<span class="number">$1</span>'),e.keywords.forEach(t=>{const s=new RegExp(`\\b${t}\\b`,"g");o=o.replace(s,`<span class="keyword">${t}</span>`)}),o=o.replace(/(\w+)\s*\(/g,'<span class="function">$1</span>('),o=o.replace(/[\{\}\[\]()]/g,'<span class="bracket">$&</span>'),o}highlightJSON(o){return o=o.replace(/"([^"]*)":/g,'<span class="keyword">"$1"</span>:'),o=o.replace(/:\s*"([^"]*)"/g,': <span class="string">"$1"</span>'),o=o.replace(/:\s*(\d+)/g,': <span class="number">$1</span>'),o=o.replace(/\b(true|false|null)\b/g,'<span class="keyword">$1</span>'),o}highlightPython(o){const e=this.syntaxRules.python;return o=o.replace(/#.*$/gm,'<span class="comment">$&</span>'),o=o.replace(/"""[\s\S]*?"""/g,'<span class="string">$&</span>'),o=o.replace(/'''[\s\S]*?'''/g,'<span class="string">$&</span>'),o=o.replace(/"([^"\\]|\\.)*"/g,'<span class="string">$&</span>'),o=o.replace(/'([^'\\]|\\.)*'/g,'<span class="string">$&</span>'),o=o.replace(/\b(\d+\.?\d*)\b/g,'<span class="number">$1</span>'),e.keywords.forEach(t=>{const s=new RegExp(`\\b${t}\\b`,"g");o=o.replace(s,`<span class="keyword">${t}</span>`)}),o=o.replace(/(\w+)\s*\(/g,'<span class="function">$1</span>('),o}highlightHTML(o){return o=o.replace(/&lt;!--[\s\S]*?--&gt;/g,'<span class="comment">$&</span>'),o=o.replace(/&lt;(\/?)([\w-]+)/g,'&lt;$1<span class="keyword">$2</span>'),o=o.replace(/(\w+)=["'][^"']*["']/g,'<span class="function">$&</span>'),o}highlightCSS(o){return o=o.replace(/\/\*[\s\S]*?\*\//g,'<span class="comment">$&</span>'),o=o.replace(/([\w-]+)\s*:/g,'<span class="keyword">$1</span>:'),o=o.replace(/#[\da-fA-F]{3,6}/g,'<span class="string">$&</span>'),o=o.replace(/(\d+)(px|em|rem|%|vh|vw)/g,'<span class="number">$1$2</span>'),o}escapeHtml(o){const e={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return o.replace(/[&<>"']/g,t=>e[t])}syncScroll(){const o=document.getElementById("codeInput"),e=document.getElementById("codeDisplay"),t=document.getElementById("lineNumbers");e&&(e.scrollLeft=o.scrollLeft,e.scrollTop=o.scrollTop),t&&(t.scrollTop=o.scrollTop)}updateLineNumbers(){const o=document.getElementById("codeInput"),e=document.getElementById("lineNumbers");if(!o||!e)return;const t=o.value.split(`
`).length;e.innerHTML=Array.from({length:t},(s,n)=>`<div class="line-num">${n+1}</div>`).join("")}updateCursorPosition(){const o=document.getElementById("codeInput");if(!o)return;const e=o.value.substring(0,o.selectionStart),t=e.split(`
`).length,s=e.split(`
`).pop().length+1,n=o.value.length,i=document.getElementById("editorLineCol"),a=document.getElementById("editorChars");i&&(i.textContent=`Строка ${t}, Колонка ${s}`),a&&(a.textContent=`${n} символов`)}handleKeyboard(o){const e=document.getElementById("codeInput");if(e){if(o.key==="Tab"){o.preventDefault();const t=e.selectionStart,s=e.selectionEnd;e.value=e.value.substring(0,t)+"    "+e.value.substring(s),e.selectionStart=e.selectionEnd=t+4,this.onCodeChange()}(o.ctrlKey||o.metaKey)&&o.key==="s"&&(o.preventDefault(),this.saveFile()),(o.ctrlKey||o.metaKey)&&o.key==="z"&&!o.shiftKey&&(o.preventDefault(),this.undo()),(o.ctrlKey||o.metaKey)&&o.key==="z"&&o.shiftKey&&(o.preventDefault(),this.redo()),(o.ctrlKey||o.metaKey)&&o.key==="f"&&(o.preventDefault(),this.openFind()),o.key==="F5"&&(o.preventDefault(),this.runCode())}}newFile(){let o=1;for(;this.files.has(`untitled${o}.js`);)o++;const e=`untitled${o}.js`;this.files.set(e,{content:"",language:"javascript",modified:!1}),this.loadFile(e),this.renderTabs()}loadFile(o,e=null){this.currentFile=o;const t=document.getElementById("codeInput");if(!t)return;e!==null&&this.files.set(o,{content:e,language:this.detectLanguage(o),modified:!1});const s=this.files.get(o);t.value=(s==null?void 0:s.content)||"",this.highlightCode(),this.updateLineNumbers(),this.history=[t.value],this.historyStep=0;const n=document.getElementById("editorLang");n&&(n.textContent=this.getLanguageLabel(o)),this.renderTabs()}saveFile(){if(!this.currentFile)return;const o=document.getElementById("codeInput");if(!o)return;const e=this.files.get(this.currentFile);e&&(e.content=o.value,e.modified=!1,this.files.set(this.currentFile,e)),this.log(`✓ Сохранено: ${this.currentFile}`,"success"),this.renderTabs()}closeFile(o){if(this.files.delete(o),this.currentFile===o){const e=Array.from(this.files.keys());if(e.length>0)this.loadFile(e[0]);else{this.currentFile=null;const t=document.getElementById("codeInput");t&&(t.value=""),this.highlightCode(),this.updateLineNumbers()}}this.renderTabs()}renderTabs(){const o=document.getElementById("editorTabs");o&&(o.innerHTML="",this.files.forEach((e,t)=>{const s=document.createElement("div");s.className=`editor-tab${t===this.currentFile?" active":""}${e.modified?" modified":""}`,s.innerHTML=`
                <span class="tab-name">${t}</span>
                <span class="tab-close" onclick="event.stopPropagation(); codeEditor.closeFile('${t}')">×</span>
            `,s.addEventListener("click",()=>this.loadFile(t)),o.appendChild(s)}))}undo(){if(this.historyStep>0){this.historyStep--;const o=document.getElementById("codeInput");o&&(o.value=this.history[this.historyStep],this.highlightCode(),this.updateLineNumbers())}}redo(){if(this.historyStep<this.history.length-1){this.historyStep++;const o=document.getElementById("codeInput");o&&(o.value=this.history[this.historyStep],this.highlightCode(),this.updateLineNumbers())}}formatCode(){const o=document.getElementById("codeInput");if(o)try{const e=this.detectLanguage(this.currentFile||"untitled.js");let t=o.value;e==="json"?t=JSON.stringify(JSON.parse(t),null,2):e==="javascript"&&(t=t.replace(/\{/g,` {
`).replace(/\}/g,`
}
`).replace(/;(?!\s*\n)/g,`;
`)),o.value=t,this.onCodeChange(),this.log("Код отформатирован","success")}catch(e){this.log("Ошибка форматирования: "+e.message,"error")}}openFind(){const o=prompt("Поиск:");if(!o)return;const e=document.getElementById("codeInput");if(!e)return;const t=e.value,s=new RegExp(o,"gi"),n=t.match(s);if(n){this.log(`Найдено: ${n.length} совпадений`,"info");const i=t.toLowerCase().indexOf(o.toLowerCase());i!==-1&&(e.focus(),e.setSelectionRange(i,i+o.length))}else this.log("Ничего не найдено","warn")}runCode(){const mirror=document.getElementById("codeInput");if(!mirror)return;this.openConsole(),this.log("▶ Запуск кода...","info");const originalLog=console.log,originalError=console.error,originalWarn=console.warn;console.log=(...o)=>{this.log(o.map(e=>typeof e=="object"?JSON.stringify(e):String(e)).join(" "),"info"),originalLog(...o)},console.error=(...o)=>{this.log(o.join(" "),"error"),originalError(...o)},console.warn=(...o)=>{this.log(o.join(" "),"warn"),originalWarn(...o)};try{eval(mirror.value),this.log("✓ Выполнено успешно","success")}catch(o){this.log("✗ Ошибка: "+o.message,"error")}console.log=originalLog,console.error=originalError,console.warn=originalWarn}toggleConsole(){const o=document.getElementById("consolePanel");o&&o.classList.toggle("collapsed")}openConsole(){const o=document.getElementById("consolePanel");o&&o.classList.remove("collapsed")}clearConsole(){const o=document.getElementById("consoleOutput");o&&(o.innerHTML="")}log(o,e="info"){const t=document.getElementById("consoleOutput");t&&(t.innerHTML+=`<div class="console-log ${e}">${this.escapeHtml(o)}</div>`,t.scrollTop=t.scrollHeight)}detectLanguage(o){const e=o.split(".").pop().toLowerCase();return{js:"javascript",jsx:"javascript",mjs:"javascript",ts:"typescript",tsx:"typescript",json:"json",html:"html",htm:"html",css:"css",scss:"css",less:"css",py:"python",md:"markdown"}[e]||"text"}getLanguageLabel(o){const e=this.detectLanguage(o);return{javascript:"JavaScript",typescript:"TypeScript",json:"JSON",html:"HTML",css:"CSS",python:"Python",markdown:"Markdown",text:"Текст"}[e]||"Текст"}}const codeEditor=new CodeEditor;window.codeEditor=codeEditor;const icons={folder:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H6.17157C6.43679 1.5 6.69114 1.60536 6.87868 1.79289L7.70711 2.62132C7.89464 2.80886 8.149 2.91421 8.41421 2.91421H13C13.8284 2.91421 14.5 3.58579 14.5 4.41421V12C14.5 12.8284 13.8284 13.5 13 13.5H3C2.17157 13.5 1.5 12.8284 1.5 12V3Z" fill="#8b949e" stroke="#6e7681" stroke-width="1"/>
    </svg>`,folderOpen:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H6.17157C6.43679 1.5 6.69114 1.60536 6.87868 1.79289L7.70711 2.62132C7.89464 2.80886 8.149 2.91421 8.41421 2.91421H13C13.8284 2.91421 14.5 3.58579 14.5 4.41421V5.5H2.5V3C2.5 2.72386 2.72386 2.5 3 2.5H6.17157L7 3.32843H13V4.41421" stroke="#58a6ff" stroke-width="1"/>
        <path d="M1 6.5H14L13 13.5H2L1 6.5Z" fill="#58a6ff" fill-opacity="0.2" stroke="#58a6ff" stroke-width="1"/>
    </svg>`,file:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#6e7681" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#6e7681" stroke-width="1"/>
    </svg>`,fileJs:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#f7df1e" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#f7df1e" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="5" font-weight="bold" fill="#f7df1e">JS</text>
    </svg>`,fileTs:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#3178c6" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#3178c6" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="5" font-weight="bold" fill="#3178c6">TS</text>
    </svg>`,fileJson:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#cbcb41" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#cbcb41" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="4" font-weight="bold" fill="#cbcb41">{}</text>
    </svg>`,fileCss:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#264de4" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#264de4" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="4" font-weight="bold" fill="#264de4">CSS</text>
    </svg>`,fileHtml:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#e34c26" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#e34c26" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="3.5" font-weight="bold" fill="#e34c26">HTML</text>
    </svg>`,fileMd:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#519aba" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#519aba" stroke-width="1"/>
        <text x="8" y="11" text-anchor="middle" font-size="4" font-weight="bold" fill="#519aba">MD</text>
    </svg>`,fileGit:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 1.5H9.5L12.5 4.5V14.5H3.5V1.5H3Z" fill="#21262d" stroke="#f05032" stroke-width="1"/>
        <path d="M9.5 1.5V4.5H12.5" stroke="#f05032" stroke-width="1"/>
        <circle cx="8" cy="10" r="2.5" stroke="#f05032" stroke-width="1"/>
    </svg>`,repo:`<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
    </svg>`,chevronRight:`<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,chevronDown:`<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,plus:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,upload:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 10V2M7 2L4 5M7 2L10 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,star:`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 1L8.5 5H13L9.5 8L11 13L7 10L3 13L4.5 8L1 5H5.5L7 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`};function getFileIcon(o){const e=o.split(".").pop().toLowerCase();return o.startsWith(".")&&o.includes("git")?icons.fileGit:{js:icons.fileJs,mjs:icons.fileJs,cjs:icons.fileJs,ts:icons.fileTs,tsx:icons.fileTs,jsx:icons.fileJs,json:icons.fileJson,css:icons.fileCss,scss:icons.fileCss,sass:icons.fileCss,less:icons.fileCss,html:icons.fileHtml,htm:icons.fileHtml,md:icons.fileMd,markdown:icons.fileMd}[e]||icons.file}class RepoManager{constructor(){this.repos=[],this.activeRepo=null,this.expandedFolders=new Set,this.repoFiles={},this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.initialize()):this.initialize()}initialize(){this.repos=[],this.repoFiles={},this.renderSidebar()}renderSidebar(){var s;const e=document.getElementById("mainSidebar");if(!e)return;const t=this.activeRepo?((s=this.repos.find(n=>n.id===this.activeRepo))==null?void 0:s.name)||"Проект":"Проекты";e.innerHTML=`
            <div class="sidebar-header">
                <div class="sidebar-logo">${icons.repo}</div>
                <div class="sidebar-project-name" id="currentProjectName">${t}</div>
            </div>

            <div class="sidebar-actions">
                <button class="sidebar-icon-btn" onclick="repoManager.createRepo()" title="Создать репозиторий">
                    ${icons.plus}
                </button>
                <button class="sidebar-icon-btn" onclick="repoManager.importRepo()" title="Загрузить репозиторий">
                    ${icons.upload}
                </button>
            </div>

            <div class="repos-list" id="reposList">
                ${this.renderReposList()}
            </div>

            <div class="file-structure" id="fileStructure">
                <div class="file-structure-header">
                    <span class="file-structure-title">Файлы</span>
                </div>
                <div class="file-tree" id="repoFileTree">
                    ${this.activeRepo?"":'<div class="empty-state">Выберите репозиторий</div>'}
                </div>
            </div>
        `,this.applyFolderColors()}renderReposList(){return this.repos.length===0?'<div class="empty-state" style="padding: 20px; text-align: center; font-size: 12px; color: var(--text-tertiary);">Нет репозиториев</div>':this.repos.map(e=>`
            <div class="repo-item ${this.activeRepo===e.id?"active":""}" 
                 data-repo-id="${e.id}"
                 onclick="repoManager.selectRepo('${e.id}')">
                <div class="repo-item-icon">${e.isPrivate?icons.lock:icons.repo}</div>
                <div class="repo-item-content">
                    <div class="repo-item-name">${e.name}</div>
                    <div class="repo-item-meta">
                        <span class="repo-lang">${e.language||""}</span>
                    </div>
                </div>
                <div class="repo-item-stats">
                    <span class="repo-stat">${icons.star} ${e.stars||0}</span>
                </div>
            </div>
        `).join("")}selectRepo(e){this.activeRepo=e,document.querySelectorAll(".repo-item").forEach(s=>{s.classList.toggle("active",s.dataset.repoId===e)});const t=this.repos.find(s=>s.id===e);if(t){const s=document.getElementById("headerTitle");s&&(s.textContent=t.name);const n=document.getElementById("currentProjectName");n&&(n.textContent=t.name)}window.githubManager&&window.githubManager.token&&window.githubManager.selectRepo(e),this.renderFileTree(e)}renderFileTree(e){const t=document.getElementById("repoFileTree");if(!t)return;const s=this.repoFiles[e];if(!s||s.length===0){t.innerHTML='<div class="empty-state">Загрузка...</div>';return}t.innerHTML=this.renderTreeItems(s,"",0),this.applyFolderColors()}renderTreeItems(e,t,s){let n="";const i=[...e].sort((a,r)=>a.type==="dir"&&r.type!=="dir"?-1:a.type!=="dir"&&r.type==="dir"?1:a.name.localeCompare(r.name));return i.forEach((a,r)=>{const l=t?`${t}/${a.name}`:a.name,c=this.expandedFolders.has(l),d=r===i.length-1,u=s>0?d?"└── ":"├── ":"";if(a.type==="dir")n+=`
                    <div class="tree-item folder ${c?"expanded":""}" data-path="${l}">
                        <div class="tree-item-header" onclick="repoManager.toggleFolder('${l}')" oncontextmenu="repoManager.showFolderMenu(event, '${l}')">
                            <span class="tree-prefix">${u}</span>
                            <span class="tree-chevron">${c?icons.chevronDown:icons.chevronRight}</span>
                            <span class="tree-icon folder-icon" data-path="${l}">${c?icons.folderOpen:icons.folder}</span>
                            <span class="tree-name">${a.name}</span>
                        </div>
                        <div class="tree-children ${c?"visible":""}">
                            ${c&&a.children?this.renderTreeItems(a.children,l,s+1):""}
                        </div>
                    </div>
                `;else{const g=getFileIcon(a.name);n+=`
                    <div class="tree-item file" data-path="${l}" onclick="repoManager.openFile('${l}')">
                        <span class="tree-prefix">${u}</span>
                        <span class="tree-icon">${g}</span>
                        <span class="tree-name">${a.name}</span>
                    </div>
                `}}),n}async toggleFolder(e){this.expandedFolders.has(e)?this.expandedFolders.delete(e):(this.expandedFolders.add(e),window.githubManager&&await window.githubManager.loadFolderContents(e)),this.renderFileTree(this.activeRepo)}openFile(e){window.navRing&&window.navRing.setActiveTab("editor"),window.githubManager&&window.githubManager.openFile(e)}showFolderMenu(e,t){e.preventDefault(),e.stopPropagation();const s=[{name:"Серый",color:"#8b949e"},{name:"Синий",color:"#58a6ff"},{name:"Зелёный",color:"#3fb950"},{name:"Жёлтый",color:"#d29922"},{name:"Красный",color:"#f85149"},{name:"Фиолетовый",color:"#a371f7"},{name:"Розовый",color:"#db61a2"},{name:"Голубой",color:"#79c0ff"},{name:"Салатовый",color:"#7ee787"},{name:"Оранжевый",color:"#ffa657"}],n=document.getElementById("folderColorMenu");n&&n.remove();const i=document.createElement("div");i.id="folderColorMenu",i.className="folder-color-menu",i.innerHTML=`
            <div class="folder-color-title">Цвет папки</div>
            <div class="folder-color-grid">
                ${s.map(a=>`
                    <button class="folder-color-btn" style="background: ${a.color};" 
                            onclick="repoManager.setFolderColor('${t}', '${a.color}')" 
                            title="${a.name}"></button>
                `).join("")}
            </div>
            <button class="folder-color-reset" onclick="repoManager.setFolderColor('${t}', null)">
                Сбросить
            </button>
        `,i.style.cssText=`position: fixed; left: ${e.clientX}px; top: ${e.clientY}px; z-index: 10000;`,document.body.appendChild(i),setTimeout(()=>{document.addEventListener("click",function a(){i.remove(),document.removeEventListener("click",a)})},10)}setFolderColor(e,t){var a,r;const s=((a=window.session)==null?void 0:a.getFolderColors())||{};t?s[e]=t:delete s[e],(r=window.session)==null||r.setFolderColors(s);const n=document.querySelector(`.folder-icon[data-path="${e}"]`);n&&(n.style.color=t||"");const i=document.getElementById("folderColorMenu");i&&i.remove()}applyFolderColors(){var t;const e=((t=window.session)==null?void 0:t.getFolderColors())||{};Object.entries(e).forEach(([s,n])=>{const i=document.querySelector(`.folder-icon[data-path="${s}"]`);i&&(i.style.color=n)})}createRepo(){var e;(e=window.githubManager)!=null&&e.token?window.showModal("create-repo"):window.showModal("github-connect")}importRepo(){const e=document.createElement("input");e.type="file",e.webkitdirectory=!0,e.multiple=!0,e.onchange=t=>{const s=Array.from(t.target.files);if(s.length===0)return;const n=s[0].webkitRelativePath.split("/")[0],i={id:n.toLowerCase().replace(/\s+/g,"-"),name:n,description:"Импортированный",stars:0,language:"Unknown",isPrivate:!0};this.repos.unshift(i),this.renderSidebar(),this.selectRepo(i.id)},e.click()}}const repoManager=new RepoManager;window.repoManager=repoManager;class GitHubManager{constructor(){w(this,"currentBrowsePath","");w(this,"previewFile",null);this.repos=[],this.currentRepo=null,this.baseUrl="https://api.github.com",this.folderColors=session.getFolderColors(),document.addEventListener("DOMContentLoaded",()=>{this.updateConnectPanel(),this.initFolderContextMenu()})}get token(){return session.getToken()}get user(){var e;return((e=window.githubAuth)==null?void 0:e.user)||session.getUser()}clearData(){this.repos=[],this.currentRepo=null}showReposList(){window.repoManager&&window.repoManager.showReposList()}authViaBrowser(){window.open("https://github.com/settings/tokens/new?description=GITODY%20App&scopes=repo,read:user,user:email,delete_repo,workflow","_blank");const t=document.getElementById("githubConnectStatus");t&&(t.innerHTML=`
                <div style="text-align: left; background: var(--bg-tertiary); padding: 12px; border-radius: 6px; margin-top: 12px;">
                    <div style="font-weight: 600; margin-bottom: 8px;">📋 Инструкция:</div>
                    <div style="font-size: 11px; line-height: 1.6;">
                        1. В открывшейся вкладке нажмите <b>"Generate token"</b><br>
                        2. Скопируйте созданный токен<br>
                        3. Вставьте его в поле выше и нажмите "Подключить"
                    </div>
                </div>
            `)}async connect(){window.connectGitHub&&await window.connectGitHub()}async connectFromPanel(){await this.connect()}updateConnectPanel(){const e=document.querySelector(".connect-card"),t=document.getElementById("connectInfo");this.user?(e&&e.classList.add("connected"),t&&(t.innerHTML=`
                    <div class="connect-title">Подключено</div>
                    <div class="connect-desc">
                        <img src="${this.user.avatar_url}" style="width: 24px; height: 24px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">
                        ${this.user.name||this.user.login}
                    </div>
                `)):(e&&e.classList.remove("connected"),t&&(t.innerHTML=`
                    <div class="connect-title">Не подключено</div>
                    <div class="connect-desc">Подключите GitHub аккаунт для работы с репозиториями</div>
                `))}async loadUser(){window.githubAuth&&await window.githubAuth.init()}async loadRepositories(){if(this.token)try{const e=await fetch(`${this.baseUrl}/user/repos?per_page=100&sort=updated`,{headers:this.getHeaders()});e.ok&&(this.repos=await e.json(),this.updateReposList())}catch(e){console.error("[GitHub] Error loading repos:",e)}}async selectRepo(e){if(this.token)try{const t=await fetch(`${this.baseUrl}/repos/${e}`,{headers:this.getHeaders()});t.ok&&(this.currentRepo=await t.json(),this.updateCurrentRepo(),await this.loadRepoData(),this.updateAllSections(),window.stateManager&&window.stateManager.set("activeRepo",e))}catch(t){console.error("[GitHub] Error selecting repo:",t)}}async loadRepoData(){if(!this.currentRepo)return;const e=this.currentRepo.full_name,[t,s,n,i,a,r,l]=await Promise.all([this.fetchBranches(e),this.fetchPullRequests(e),this.fetchIssues(e),this.fetchCommits(e),this.fetchRepoContents(e),this.fetchLanguages(e),this.fetchContributors(e)]);this.updateStats(t.length,s.length,n.length),this.renderBranches(t),this.renderPullRequests(s),this.renderIssues(n),this.renderCommits(i),this.renderFileTree(a),this.renderRepoInfo(r,l)}async fetchRepoContents(e,t=""){try{const s=t?`${this.baseUrl}/repos/${e}/contents/${t}`:`${this.baseUrl}/repos/${e}/contents`,n=await fetch(s,{headers:this.getHeaders()});return n.ok?await n.json():[]}catch(s){return console.error("[GitHub] Error fetching contents:",s),[]}}renderFileTree(e){const t=document.getElementById("repoFileTree");if(!t)return;if(!e||e.length===0){t.innerHTML='<div class="tree-empty">Репозиторий пуст</div>';return}const s=[...e].sort((n,i)=>n.type==="dir"&&i.type!=="dir"?-1:n.type!=="dir"&&i.type==="dir"?1:n.name.localeCompare(i.name));t.innerHTML=s.map(n=>this.renderTreeItem(n)).join("")}renderTreeItem(e){const t=e.type==="dir",s=this.getFolderColorForPath(e.path),n=t?this.getFolderIcon(s):this.getFileIcon(e.name);return t?`
                <div class="tree-item folder" data-path="${e.path}">
                    <div class="tree-item-header" 
                         onclick="githubManager.toggleFolder('${e.path}')"
                         oncontextmenu="githubManager.showFolderContextMenu(event, '${e.path}')">
                        <span class="tree-chevron">${this.getChevronIcon()}</span>
                        <span class="tree-icon">${n}</span>
                        <span class="tree-name">${e.name}</span>
                    </div>
                    <div class="tree-children" id="folder-${e.path.replace(/\//g,"-")}"></div>
                </div>
            `:`
                <div class="tree-item file" data-path="${e.path}" onclick="githubManager.openFile('${e.path}')">
                    <span class="tree-icon">${n}</span>
                    <span class="tree-name">${e.name}</span>
                </div>
            `}async toggleFolder(e){const t=document.getElementById(`folder-${e.replace(/\//g,"-")}`),s=t==null?void 0:t.closest(".tree-item.folder");if(!t||!s)return;if(s.classList.contains("expanded"))s.classList.remove("expanded"),t.innerHTML="";else{s.classList.add("expanded"),t.innerHTML='<div class="tree-loading">Загрузка...</div>';const r=await this.fetchRepoContents(this.currentRepo.full_name,e);if(r&&r.length>0){const l=[...r].sort((c,d)=>c.type==="dir"&&d.type!=="dir"?-1:c.type!=="dir"&&d.type==="dir"?1:c.name.localeCompare(d.name));t.innerHTML=l.map(c=>this.renderTreeItem(c)).join("")}else t.innerHTML='<div class="tree-empty-folder">Пусто</div>'}const n=s.querySelector(".tree-chevron"),i=s.querySelector(".tree-item-header > .tree-icon"),a=this.getFolderColorForPath(e);n&&(n.innerHTML=s.classList.contains("expanded")?this.getChevronDownIcon():this.getChevronIcon()),i&&(i.innerHTML=s.classList.contains("expanded")?this.getFolderOpenIcon(a||"#58a6ff"):this.getFolderIcon(a))}async openFile(e){if(!this.currentRepo)return;window.tabManager&&window.tabManager.switchTab("editor");const t=await this.getFileContent(this.currentRepo.full_name,e);if(t!==null){const s=document.getElementById("codeInput"),n=document.getElementById("editorTabs");if(s&&(s.value=t,s.dispatchEvent(new Event("input"))),n){const i=e.split("/").pop();n.innerHTML=`
                    <div class="editor-tab active" data-path="${e}">
                        <span>${i}</span>
                        <button class="tab-close" onclick="githubManager.closeEditorTab('${e}')">&times;</button>
                    </div>
                `}this.currentFile={path:e,content:t}}}closeEditorTab(e){const t=document.getElementById("editorTabs"),s=document.getElementById("codeInput");t&&(t.innerHTML=""),s&&(s.value=""),this.currentFile=null}getChevronIcon(){return'<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l4 4-4 4"/></svg>'}getChevronDownIcon(){return'<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>'}getFolderIcon(e="#8b949e"){return`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H6.17157C6.43679 1.5 6.69114 1.60536 6.87868 1.79289L7.70711 2.62132C7.89464 2.80886 8.149 2.91421 8.41421 2.91421H13C13.8284 2.91421 14.5 3.58579 14.5 4.41421V12C14.5 12.8284 13.8284 13.5 13 13.5H3C2.17157 13.5 1.5 12.8284 1.5 12V3Z" fill="${e}" fill-opacity="0.15" stroke="${e}" stroke-width="1"/>
        </svg>`}getFolderOpenIcon(e="#58a6ff"){return`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H6.17157C6.43679 1.5 6.69114 1.60536 6.87868 1.79289L7.70711 2.62132C7.89464 2.80886 8.149 2.91421 8.41421 2.91421H13C13.8284 2.91421 14.5 3.58579 14.5 4.41421V5.5H2.5V3C2.5 2.72386 2.72386 2.5 3 2.5H6.17157L7 3.32843H13V4.41421" stroke="${e}" stroke-width="1"/>
            <path d="M1 6.5H14L13 13.5H2L1 6.5Z" fill="${e}" fill-opacity="0.2" stroke="${e}" stroke-width="1"/>
        </svg>`}getFileIcon(e){const t=e.split(".").pop().toLowerCase(),s={js:'<svg width="16" height="16" viewBox="0 0 16 16" fill="#f7df1e"><rect x="2" y="2" width="12" height="12" rx="1"/><text x="5" y="12" font-size="8" fill="#000">JS</text></svg>',ts:'<svg width="16" height="16" viewBox="0 0 16 16" fill="#3178c6"><rect x="2" y="2" width="12" height="12" rx="1"/><text x="5" y="12" font-size="8" fill="#fff">TS</text></svg>',json:'<svg width="16" height="16" viewBox="0 0 16 16" fill="#cbcb41"><path d="M3 2h10v12H3z"/><text x="4" y="11" font-size="6" fill="#000">{}</text></svg>',md:'<svg width="16" height="16" viewBox="0 0 16 16" fill="#519aba"><path d="M3 2h10v12H3z"/><text x="3" y="11" font-size="6" fill="#fff">MD</text></svg>',html:'<svg width="16" height="16" viewBox="0 0 16 16" fill="#e44d26"><path d="M3 2h10v12H3z"/><text x="2" y="11" font-size="5" fill="#fff">HTML</text></svg>',css:'<svg width="16" height="16" viewBox="0 0 16 16" fill="#563d7c"><path d="M3 2h10v12H3z"/><text x="3" y="11" font-size="6" fill="#fff">CSS</text></svg>',py:'<svg width="16" height="16" viewBox="0 0 16 16" fill="#3776ab"><path d="M3 2h10v12H3z"/><text x="4" y="11" font-size="7" fill="#ffd43b">Py</text></svg>',git:'<svg width="16" height="16" viewBox="0 0 16 16" fill="#f05032"><circle cx="8" cy="8" r="6"/></svg>',default:'<svg width="16" height="16" viewBox="0 0 16 16" fill="#8b949e"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/></svg>'};return e===".gitignore"?s.git:e==="package.json"?s.json:e==="README.md"?s.md:s[t]||s.default}async fetchBranches(e){try{const t=await fetch(`${this.baseUrl}/repos/${e}/branches`,{headers:this.getHeaders()});return t.ok?await t.json():[]}catch{return[]}}async fetchPullRequests(e){try{const t=await fetch(`${this.baseUrl}/repos/${e}/pulls?state=all&per_page=20`,{headers:this.getHeaders()});return t.ok?await t.json():[]}catch{return[]}}async fetchIssues(e){try{const t=await fetch(`${this.baseUrl}/repos/${e}/issues?state=open&per_page=20`,{headers:this.getHeaders()});return t.ok?await t.json():[]}catch{return[]}}async fetchCommits(e,t="main"){try{const s=await fetch(`${this.baseUrl}/repos/${e}/commits?per_page=20`,{headers:this.getHeaders()});return s.ok?await s.json():[]}catch{return[]}}async fetchLanguages(e){try{const t=await fetch(`${this.baseUrl}/repos/${e}/languages`,{headers:this.getHeaders()});return t.ok?await t.json():{}}catch{return{}}}async fetchContributors(e){try{const t=await fetch(`${this.baseUrl}/repos/${e}/contributors?per_page=10`,{headers:this.getHeaders()});return t.ok?await t.json():[]}catch{return[]}}async getFileContent(e,t,s="main"){try{const n=await fetch(`${this.baseUrl}/repos/${e}/contents/${t}?ref=${s}`,{headers:this.getHeaders()});if(n.ok){const i=await n.json();if(i.content)return atob(i.content)}return null}catch{return null}}async saveFile(e,t,s,n,i="main"){try{const a=await fetch(`${this.baseUrl}/repos/${e}/contents/${t}?ref=${i}`,{headers:this.getHeaders()});let r=null;a.ok&&(r=(await a.json()).sha);const l={message:n||`Update ${t}`,content:btoa(unescape(encodeURIComponent(s))),branch:i};return r&&(l.sha=r),(await fetch(`${this.baseUrl}/repos/${e}/contents/${t}`,{method:"PUT",headers:this.getHeaders(),body:JSON.stringify(l)})).ok}catch(a){return console.error("[GitHub] Error saving file:",a),!1}}async createRepository(){const e=document.getElementById("newRepoName"),t=document.getElementById("newRepoDesc"),s=document.querySelectorAll('input[name="repoVisibility"]'),n=document.getElementById("newRepoReadme"),i=document.getElementById("newRepoGitignore"),a=document.getElementById("newRepoLicense"),r=document.getElementById("createRepoStatus"),l=e==null?void 0:e.value.trim();if(!l){this.showStatus(r,"Введите название репозитория","error");return}if(!this.token){this.showStatus(r,"Сначала подключите GitHub аккаунт","error");return}let c=!1;s.forEach(u=>{u.checked&&(c=u.value==="private")});const d={name:l,description:(t==null?void 0:t.value.trim())||"",private:c,auto_init:(n==null?void 0:n.checked)||!1};i!=null&&i.value&&(d.gitignore_template=i.value),a!=null&&a.value&&(d.license_template=a.value),this.showStatus(r,"Создание репозитория...","info");try{const u=await fetch(`${this.baseUrl}/user/repos`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify(d)});if(!u.ok){const p=await u.json();throw new Error(p.message||"Ошибка создания")}const g=await u.json();this.showStatus(r,`Репозиторий "${g.name}" создан!`,"success"),await this.loadRepositories(),e&&(e.value=""),t&&(t.value=""),setTimeout(()=>{window.closeModal("create-repo"),this.selectRepo(g.full_name)},1500)}catch(u){this.showStatus(r,u.message,"error")}}async createBranch(e,t,s="main"){try{const n=await fetch(`${this.baseUrl}/repos/${e}/git/ref/heads/${s}`,{headers:this.getHeaders()});if(!n.ok)return!1;const a=(await n.json()).object.sha;return(await fetch(`${this.baseUrl}/repos/${e}/git/refs`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({ref:`refs/heads/${t}`,sha:a})})).ok?(await this.loadRepoData(),!0):!1}catch(n){return console.error("[GitHub] Error creating branch:",n),!1}}async syncAll(){if(!this.token){window.showModal("github-connect");return}this.currentRepo&&(await this.loadRepoData(),console.log("[GitHub] Синхронизация завершена"))}logout(){window.githubAuth&&window.githubAuth.logout(),this.repos=[],this.currentRepo=null,this.updateConnectPanel(),this.updateReposList()}updateUI(){const e=document.getElementById("dropdownUserInfo"),t=document.getElementById("userAvatarBtn"),s=document.getElementById("connectCheck");this.user?(e&&(e.innerHTML=`
                    <div class="dropdown-user-name">${this.user.name||this.user.login}</div>
                    <div class="dropdown-user-email">${this.user.login}</div>
                `),t&&this.user.avatar_url&&(t.innerHTML=`<img src="${this.user.avatar_url}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%;">`),s&&s.classList.add("visible")):(e&&(e.innerHTML=`
                    <div class="dropdown-user-name">Не авторизован</div>
                    <div class="dropdown-user-email">Подключите GitHub</div>
                `),t&&(t.innerHTML='<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/></svg>'),s&&s.classList.remove("visible"))}updateReposList(){window.repoManager&&(window.repoManager.repos=this.repos.map(e=>({id:e.full_name,name:e.name,description:e.description||"",stars:e.stargazers_count,forks:e.forks_count,language:e.language||"Unknown",isPrivate:e.private,updatedAt:this.formatDate(e.updated_at)})),window.repoManager.renderSidebar())}renderRepoInfo(e,t){var g;if(!this.currentRepo)return;const s=document.getElementById("infoEmptyState"),n=document.getElementById("infoContent");s&&(s.style.display="none"),n&&(n.style.display="block");const i=this.currentRepo,a=document.getElementById("infoRepoName"),r=document.getElementById("infoRepoVisibility"),l=document.getElementById("infoGithubLink");a&&(a.textContent=i.full_name),r&&(r.textContent=i.private?"private":"public",r.className=`info-repo-visibility ${i.private?"private":""}`),l&&(l.href=i.html_url);const c=document.getElementById("infoDescription");c&&(c.textContent=i.description||"Нет описания"),document.getElementById("infoStars").textContent=i.stargazers_count||0,document.getElementById("infoForks").textContent=i.forks_count||0,document.getElementById("infoWatchers").textContent=i.watchers_count||0,document.getElementById("infoIssuesCount").textContent=i.open_issues_count||0,this.renderLanguagesBar(e),document.getElementById("infoDefaultBranch").textContent=i.default_branch||"main",document.getElementById("infoCreatedAt").textContent=this.formatDateFull(i.created_at),document.getElementById("infoUpdatedAt").textContent=this.formatDateFull(i.updated_at),document.getElementById("infoSize").textContent=this.formatSize(i.size),document.getElementById("infoLicense").textContent=((g=i.license)==null?void 0:g.name)||"Нет";const d=document.getElementById("infoTopicsSection"),u=document.getElementById("infoTopics");i.topics&&i.topics.length>0?(d.style.display="block",u.innerHTML=i.topics.map(p=>`<span class="info-topic">${p}</span>`).join("")):d.style.display="none",this.renderContributors(t),document.getElementById("infoVisibilitySelect").value=i.private?"private":"public",document.getElementById("infoHasIssues").checked=i.has_issues,document.getElementById("infoHasWiki").checked=i.has_wiki,document.getElementById("infoHasProjects").checked=i.has_projects}renderLanguagesBar(e){const t=document.getElementById("infoLanguagesBar"),s=document.getElementById("infoLanguagesList");if(!t||!s)return;const n=Object.values(e).reduce((a,r)=>a+r,0);if(n===0){t.innerHTML="",s.innerHTML='<span class="info-loading">Нет данных о языках</span>';return}const i={JavaScript:"#f7df1e",TypeScript:"#3178c6",Python:"#3776ab",HTML:"#e44d26",CSS:"#563d7c",Java:"#b07219","C++":"#f34b7d",C:"#555555","C#":"#178600",Go:"#00add8",Rust:"#dea584",Ruby:"#cc342d",PHP:"#4f5d95",Swift:"#fa7343",Kotlin:"#a97bff",Shell:"#89e051",Vue:"#41b883",SCSS:"#c6538c",Dockerfile:"#384d54"};t.innerHTML=Object.entries(e).sort((a,r)=>r[1]-a[1]).map(([a,r])=>{const l=(r/n*100).toFixed(1),c=i[a]||"#8b949e";return`<div class="lang-segment" style="width: ${l}%; background: ${c};" title="${a}: ${l}%"></div>`}).join(""),s.innerHTML=Object.entries(e).sort((a,r)=>r[1]-a[1]).slice(0,8).map(([a,r])=>{const l=(r/n*100).toFixed(1);return`
                    <div class="info-lang-item">
                        <span class="lang-dot" style="background: ${i[a]||"#8b949e"};"></span>
                        <span>${a}</span>
                        <span class="lang-percent">${l}%</span>
                    </div>
                `}).join("")}renderContributors(e){const t=document.getElementById("infoContributors");if(t){if(!e||e.length===0){t.innerHTML='<span class="info-loading">Нет контрибьюторов</span>';return}t.innerHTML=e.slice(0,8).map(s=>`
            <a href="${s.html_url}" target="_blank" class="info-contributor">
                <img src="${s.avatar_url}" alt="${s.login}">
                <div class="info-contributor-info">
                    <span class="info-contributor-name">${s.login}</span>
                    <span class="info-contributor-commits">${s.contributions} коммитов</span>
                </div>
            </a>
        `).join("")}}async updateRepoVisibility(e){if(!this.currentRepo)return;const t=e==="private";await this.updateRepoSetting("private",t)}async updateRepoSetting(e,t){if(this.currentRepo)try{const s=await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}`,{method:"PATCH",headers:this.getHeaders(),body:JSON.stringify({[e]:t})});s.ok?(this.currentRepo=await s.json(),console.log(`[GitHub] Updated ${e} to ${t}`)):(console.error("[GitHub] Failed to update setting"),alert("Не удалось обновить настройку"))}catch(s){console.error("[GitHub] Error updating setting:",s)}}async archiveRepo(){this.currentRepo&&confirm(`Архивировать репозиторий "${this.currentRepo.name}"? Это действие можно отменить на GitHub.`)&&(await this.updateRepoSetting("archived",!0),alert("Репозиторий архивирован"))}async deleteCurrentRepo(){if(!this.currentRepo)return;const e=this.currentRepo.name;if(prompt(`Для подтверждения удаления введите название репозитория: ${e}`)!==e){alert("Название не совпадает. Удаление отменено.");return}try{const s=await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}`,{method:"DELETE",headers:this.getHeaders()});if(s.ok||s.status===204){alert("Репозиторий удалён"),this.currentRepo=null,await this.loadRepositories();const n=document.getElementById("infoEmptyState"),i=document.getElementById("infoContent");n&&(n.style.display="flex"),i&&(i.style.display="none")}else alert("Не удалось удалить репозиторий")}catch(s){console.error("[GitHub] Error deleting repo:",s),alert("Ошибка при удалении репозитория")}}formatSize(e){return e?e<1024?`${e} KB`:e<1024*1024?`${(e/1024).toFixed(1)} MB`:`${(e/(1024*1024)).toFixed(2)} GB`:"—"}formatDateFull(e){return e?new Date(e).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"}):"—"}updateCurrentRepo(){if(!this.currentRepo)return;const e=document.getElementById("headerTitle");e&&(e.textContent=this.currentRepo.name);const t=document.getElementById("currentProjectName");t&&(t.textContent=this.currentRepo.name)}updateStats(e,t,s){const n=document.getElementById("statPR"),i=document.getElementById("statBranches"),a=document.getElementById("statIssues");n&&(n.textContent=t),i&&(i.textContent=e),a&&(a.textContent=s)}renderBranches(e){const t=document.getElementById("branchesList");if(!t)return;if(e.length===0){t.innerHTML='<div class="empty-state">Нет веток</div>';return}t.innerHTML=e.map(n=>{var i,a;return`
            <div class="branch-card ${n.name===((i=this.currentRepo)==null?void 0:i.default_branch)?"default":""}">
                <div class="branch-info">
                    <span class="branch-name">${n.name}</span>
                    ${n.name===((a=this.currentRepo)==null?void 0:a.default_branch)?'<span class="badge badge-success">default</span>':""}
                </div>
                <div class="branch-actions">
                    <button class="btn btn-sm" onclick="githubManager.checkoutBranch('${n.name}')">Checkout</button>
                </div>
            </div>
        `}).join("");const s=document.getElementById("branchSelect");s&&(s.innerHTML=e.map(n=>`<option value="${n.name}">${n.name}</option>`).join(""))}renderPullRequests(e){const t=document.getElementById("prList");if(t){if(e.length===0){t.innerHTML='<div class="empty-state">Нет Pull Requests</div>';return}t.innerHTML=e.slice(0,10).map(s=>{var n,i,a;return`
            <div class="pr-card">
                <div class="pr-status ${s.state}"></div>
                <div class="pr-content">
                    <div class="pr-title">#${s.number} ${s.title}</div>
                    <div class="pr-meta">
                        <span>${((n=s.head)==null?void 0:n.ref)||""} ← ${((i=s.base)==null?void 0:i.ref)||""}</span>
                        <span>• ${((a=s.user)==null?void 0:a.login)||""} • ${this.formatDate(s.created_at)}</span>
                    </div>
                </div>
            </div>
        `}).join("")}}renderIssues(e){const t=document.getElementById("issuesList");if(!t)return;const s=e.filter(n=>!n.pull_request);if(s.length===0){t.innerHTML='<div class="empty-state">Нет Issues</div>';return}t.innerHTML=s.slice(0,10).map(n=>{var i;return`
            <div class="issue-item ${n.state}">
                <div class="issue-status"></div>
                <div class="issue-content">
                    <div class="issue-title">#${n.number} ${n.title}</div>
                    <div class="issue-meta">${((i=n.user)==null?void 0:i.login)||""} • ${this.formatDate(n.created_at)}</div>
                </div>
            </div>
        `}).join("")}renderCommits(e){const t=document.getElementById("commitsList");if(t){if(e.length===0){t.innerHTML='<div class="empty-state">Нет коммитов</div>';return}t.innerHTML=e.slice(0,15).map(s=>{var n,i,a,r,l,c;return`
            <div class="commit-item">
                <div class="commit-hash">${s.sha.substring(0,7)}</div>
                <div class="commit-content">
                    <div class="commit-message">${((i=(n=s.commit)==null?void 0:n.message)==null?void 0:i.split(`
`)[0])||""}</div>
                    <div class="commit-meta">${((r=(a=s.commit)==null?void 0:a.author)==null?void 0:r.name)||""} • ${this.formatDate((c=(l=s.commit)==null?void 0:l.author)==null?void 0:c.date)}</div>
                </div>
            </div>
        `}).join("")}}getHeaders(){return{Authorization:`Bearer ${this.token}`,Accept:"application/vnd.github.v3+json","Content-Type":"application/json"}}formatDate(e){if(!e)return"";const t=new Date(e),n=new Date-t;return n<6e4?"только что":n<36e5?`${Math.floor(n/6e4)} мин назад`:n<864e5?`${Math.floor(n/36e5)} ч назад`:n<6048e5?`${Math.floor(n/864e5)} дн назад`:t.toLocaleDateString("ru-RU")}showStatus(e,t,s){e&&(e.textContent=t,e.className=`connect-status ${s}`)}checkoutBranch(e){console.log("[GitHub] Checkout branch:",e)}initFolderContextMenu(){this.folderColors=session.getFolderColors(),this.currentContextFolder=null;const e=document.getElementById("folderContextMenu");if(!e)return;document.addEventListener("click",s=>{e.contains(s.target)||e.classList.remove("visible")}),e.querySelectorAll(".color-swatch").forEach(s=>{s.addEventListener("click",()=>{const n=s.dataset.color;this.setFolderColor(this.currentContextFolder,n),e.classList.remove("visible")})});const t=document.getElementById("resetFolderColor");t&&t.addEventListener("click",()=>{this.setFolderColor(this.currentContextFolder,null),e.classList.remove("visible")})}showFolderContextMenu(e,t){e.preventDefault(),e.stopPropagation(),this.currentContextFolder=t;const s=document.getElementById("folderContextMenu");if(!s)return;const n=Math.min(e.clientX,window.innerWidth-180),i=Math.min(e.clientY,window.innerHeight-200);s.style.left=n+"px",s.style.top=i+"px";const a=this.folderColors[t]||"#8b949e";s.querySelectorAll(".color-swatch").forEach(r=>{r.classList.toggle("active",r.dataset.color===a)}),s.classList.add("visible")}setFolderColor(e,t){if(!e)return;t?this.folderColors[e]=t:delete this.folderColors[e],session.setFolderColors(this.folderColors);const s=document.querySelector(`.tree-item.folder[data-path="${e}"]`);if(s){const n=s.querySelector(".tree-item-header > .tree-icon");if(n){const i=s.classList.contains("expanded");n.innerHTML=i?this.getFolderOpenIcon(t||"#58a6ff"):this.getFolderIcon(t||"#8b949e")}}}getFolderColorForPath(e){var t;return((t=this.folderColors)==null?void 0:t[e])||"#8b949e"}async browseCode(e=""){if(!this.currentRepo)return;this.currentBrowsePath=e;const t=document.getElementById("codeBrowser"),s=document.getElementById("codePreview");if(t){t.innerHTML='<div class="loading">Загрузка...</div>',s&&(s.style.display="none");try{const n=e?`${this.baseUrl}/repos/${this.currentRepo.full_name}/contents/${e}`:`${this.baseUrl}/repos/${this.currentRepo.full_name}/contents`,i=await fetch(n,{headers:this.getHeaders()});if(!i.ok)throw new Error("Ошибка загрузки");const a=await i.json();this.updateBreadcrumb(e);const r=a.sort((l,c)=>l.type==="dir"&&c.type!=="dir"?-1:l.type!=="dir"&&c.type==="dir"?1:l.name.localeCompare(c.name));t.innerHTML=`
                <div class="code-file-list">
                    ${e?`<div class="code-file-item folder" onclick="githubManager.browseCode('${this.getParentPath(e)}')">
                        <span class="file-icon">📁</span>
                        <span class="file-name">..</span>
                    </div>`:""}
                    ${r.map(l=>`
                        <div class="code-file-item ${l.type}" onclick="githubManager.${l.type==="dir"?"browseCode":"previewCode"}('${l.path}')">
                            <span class="file-icon">${l.type==="dir"?"📁":this.getFileEmoji(l.name)}</span>
                            <span class="file-name">${l.name}</span>
                            <span class="file-size">${l.type==="file"?this.formatBytes(l.size):""}</span>
                        </div>
                    `).join("")}
                </div>
            `}catch(n){t.innerHTML=`<div class="empty-state">Ошибка: ${n.message}</div>`}}}updateBreadcrumb(e){var a;const t=document.getElementById("codeBreadcrumb");if(!t)return;const s=e?e.split("/"):[];let n=`<span class="breadcrumb-item root" onclick="githubManager.browseCode('')">📁 ${((a=this.currentRepo)==null?void 0:a.name)||"root"}</span>`,i="";s.forEach((r,l)=>{i+=(l>0?"/":"")+r,n+=`<span class="breadcrumb-sep">/</span><span class="breadcrumb-item" onclick="githubManager.browseCode('${i}')">${r}</span>`}),t.innerHTML=n}getParentPath(e){const t=e.split("/");return t.pop(),t.join("/")}async previewCode(e){const t=document.getElementById("codeBrowser"),s=document.getElementById("codePreview"),n=document.getElementById("previewFileName"),i=document.getElementById("previewContent");if(!(!s||!i))try{const a=await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}/contents/${e}`,{headers:this.getHeaders()});if(!a.ok)throw new Error("Ошибка загрузки");const r=await a.json();this.previewFile=r;const l=atob(r.content);t&&(t.style.display="none"),s.style.display="block",n&&(n.textContent=r.name),i.textContent=l}catch(a){alert("Ошибка загрузки файла: "+a.message)}}closePreview(){const e=document.getElementById("codeBrowser"),t=document.getElementById("codePreview");e&&(e.style.display="block"),t&&(t.style.display="none"),this.previewFile=null}async copyFileContent(){if(this.previewFile)try{const e=atob(this.previewFile.content);await navigator.clipboard.writeText(e),alert("Скопировано!")}catch{alert("Ошибка копирования")}}openInEditor(){if(!this.previewFile)return;window.navRing&&window.navRing.setActiveTab("editor");const e=document.getElementById("codeInput");if(e){const t=atob(this.previewFile.content);e.value=t,e.dispatchEvent(new Event("input"))}}getFileEmoji(e){const t=e.split(".").pop().toLowerCase();return{js:"📜",ts:"📘",jsx:"⚛️",tsx:"⚛️",html:"🌐",css:"🎨",scss:"🎨",less:"🎨",json:"📋",xml:"📋",yaml:"📋",yml:"📋",md:"📝",txt:"📄",pdf:"📕",png:"🖼️",jpg:"🖼️",gif:"🖼️",svg:"🖼️",py:"🐍",rb:"💎",go:"🐹",rs:"🦀",java:"☕",php:"🐘",c:"⚙️",cpp:"⚙️",sh:"🐚",bash:"🐚",zsh:"🐚",sql:"🗃️",db:"🗃️",lock:"🔒",env:"🔐"}[t]||"📄"}formatBytes(e){return e?e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB":""}renderRepoSettings(){const e=document.getElementById("repoSettingsContent");if(!e||!this.currentRepo){e&&(e.innerHTML='<div class="empty-state">Выберите репозиторий</div>');return}const t=this.currentRepo;e.innerHTML=`
            <div class="settings-section">
                <h4>Основные</h4>
                <div class="settings-row">
                    <label>Название</label>
                    <input type="text" class="form-input" value="${t.name}" id="settingRepoName" disabled>
                </div>
                <div class="settings-row">
                    <label>Описание</label>
                    <textarea class="form-input" id="settingRepoDesc" rows="2">${t.description||""}</textarea>
                </div>
                <div class="settings-row">
                    <label>Видимость</label>
                    <select class="form-input" id="settingRepoVisibility">
                        <option value="public" ${t.private?"":"selected"}>Публичный</option>
                        <option value="private" ${t.private?"selected":""}>Приватный</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="githubManager.saveRepoSettings()">Сохранить изменения</button>
            </div>

            <div class="settings-section">
                <h4>Функции</h4>
                <div class="settings-toggle-row">
                    <span>Issues</span>
                    <label class="toggle ${t.has_issues?"enabled":""}" onclick="this.classList.toggle('enabled')">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-toggle-row">
                    <span>Wiki</span>
                    <label class="toggle ${t.has_wiki?"enabled":""}" onclick="this.classList.toggle('enabled')">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-toggle-row">
                    <span>Projects</span>
                    <label class="toggle ${t.has_projects?"enabled":""}" onclick="this.classList.toggle('enabled')">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-section danger">
                <h4>⚠️ Опасная зона</h4>
                <button class="btn btn-danger" onclick="githubManager.deleteCurrentRepo()">
                    Удалить репозиторий
                </button>
            </div>
        `}async saveRepoSettings(){var s,n;if(!this.currentRepo)return;const e=(s=document.getElementById("settingRepoDesc"))==null?void 0:s.value,t=(n=document.getElementById("settingRepoVisibility"))==null?void 0:n.value;try{const i=await fetch(`${this.baseUrl}/repos/${this.currentRepo.full_name}`,{method:"PATCH",headers:this.getHeaders(),body:JSON.stringify({description:e,private:t==="private"})});i.ok?(alert("Настройки сохранены"),this.currentRepo=await i.json()):alert("Ошибка сохранения")}catch(i){alert("Ошибка: "+i.message)}}renderDownloadSection(){const e=document.getElementById("downloadContent");if(!e||!this.currentRepo){e&&(e.innerHTML='<div class="empty-state">Выберите репозиторий</div>');return}const t=this.currentRepo;e.innerHTML=`
            <div class="download-options">
                <div class="download-card" onclick="githubManager.downloadZip()">
                    <div class="download-icon">📦</div>
                    <div class="download-info">
                        <div class="download-title">Скачать ZIP</div>
                        <div class="download-desc">Архив с исходным кодом</div>
                    </div>
                </div>
                
                <div class="download-card" onclick="githubManager.copyCloneUrl()">
                    <div class="download-icon">📋</div>
                    <div class="download-info">
                        <div class="download-title">Clone URL</div>
                        <div class="download-desc">${t.clone_url}</div>
                    </div>
                </div>
                
                <div class="download-card" onclick="githubManager.copyCloneSSH()">
                    <div class="download-icon">🔑</div>
                    <div class="download-info">
                        <div class="download-title">Clone SSH</div>
                        <div class="download-desc">${t.ssh_url}</div>
                    </div>
                </div>
                
                <div class="download-card" onclick="githubManager.openInGitHub()">
                    <div class="download-icon">🌐</div>
                    <div class="download-info">
                        <div class="download-title">Открыть на GitHub</div>
                        <div class="download-desc">${t.html_url}</div>
                    </div>
                </div>
            </div>
        `}downloadZip(){this.currentRepo&&window.open(`${this.currentRepo.html_url}/archive/refs/heads/${this.currentRepo.default_branch||"main"}.zip`,"_blank")}async copyCloneUrl(){this.currentRepo&&(await navigator.clipboard.writeText(this.currentRepo.clone_url),alert("URL скопирован!"))}async copyCloneSSH(){this.currentRepo&&(await navigator.clipboard.writeText(this.currentRepo.ssh_url),alert("SSH URL скопирован!"))}openInGitHub(){this.currentRepo&&window.open(this.currentRepo.html_url,"_blank")}updateAllSections(){this.browseCode(""),this.renderRepoSettings(),this.renderDownloadSection()}}const githubManager=new GitHubManager;window.githubManager=githubManager;const STORAGE_KEY="GITODY_SECRETS";class SecretsManager{constructor(){this.items=this.load(),this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.render()):this.render()}load(){try{const e=localStorage.getItem(STORAGE_KEY);return e?JSON.parse(e):[]}catch{return[]}}save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(this.items))}addPassword(e,t,s,n=""){const i={id:Date.now().toString(),type:"password",name:e,login:t,password:s,url:n,createdAt:new Date().toISOString()};return this.items.push(i),this.save(),this.render(),i}addNote(e,t){const s={id:Date.now().toString(),type:"note",title:e,content:t,createdAt:new Date().toISOString()};return this.items.push(s),this.save(),this.render(),s}remove(e){this.items=this.items.filter(t=>t.id!==e),this.save(),this.render()}async copyToClipboard(e,t){try{if(await navigator.clipboard.writeText(e),t){const s=t.innerHTML;t.innerHTML='<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#3fb950" stroke-width="2"><path d="M2 7l3 3 7-7"/></svg>',t.style.background="rgba(63, 185, 80, 0.2)",setTimeout(()=>{t.innerHTML=s,t.style.background=""},1500)}}catch(s){console.error("Copy failed:",s)}}render(){const e=document.getElementById("secretsList");if(e){if(this.items.length===0){e.innerHTML='<div class="empty-state">Нет сохранённых данных</div>';return}e.innerHTML=this.items.map(t=>t.type==="note"?this.renderNote(t):this.renderPassword(t)).join("")}}renderPassword(e){return`
            <div class="secret-item password" data-id="${e.id}">
                <div class="secret-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="7" cy="7" r="5"/>
                        <path d="M11 11l7 7M15 15l2 2M15 18l2-2"/>
                    </svg>
                </div>
                <div class="secret-info">
                    <div class="secret-name">${this.escapeHtml(e.name)}</div>
                    <div class="secret-login">${this.escapeHtml(e.login)}</div>
                </div>
                <div class="secret-actions">
                    <button class="secret-btn copy-login" title="Копировать логин" onclick="secretsManager.copyToClipboard('${this.escapeAttr(e.login)}', this)">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="4" y="4" width="8" height="8" rx="1"/>
                            <path d="M2 10V3a1 1 0 011-1h7"/>
                        </svg>
                    </button>
                    <button class="secret-btn copy-password" title="Копировать пароль" onclick="secretsManager.copyToClipboard('${this.escapeAttr(e.password)}', this)">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="5" cy="5" r="3"/>
                            <path d="M7 7l5 5M10 10l1.5 1.5"/>
                        </svg>
                    </button>
                    <button class="secret-btn delete" title="Удалить" onclick="secretsManager.confirmDelete('${e.id}')">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4"/>
                            <path d="M3 4l1 8h6l1-8"/>
                        </svg>
                    </button>
                </div>
            </div>
        `}renderNote(e){const t=e.content.length>50?e.content.substring(0,50)+"...":e.content;return`
            <div class="secret-item note" data-id="${e.id}">
                <div class="secret-icon note-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="2" width="14" height="16" rx="2"/>
                        <path d="M6 6h8M6 10h8M6 14h5"/>
                    </svg>
                </div>
                <div class="secret-info">
                    <div class="secret-name">${this.escapeHtml(e.title)}</div>
                    <div class="secret-login note-preview">${this.escapeHtml(t)}</div>
                </div>
                <div class="secret-actions">
                    <button class="secret-btn copy-note" title="Копировать" onclick="secretsManager.copyToClipboard(\`${this.escapeAttr(e.content)}\`, this)">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="4" y="4" width="8" height="8" rx="1"/>
                            <path d="M2 10V3a1 1 0 011-1h7"/>
                        </svg>
                    </button>
                    <button class="secret-btn view-note" title="Просмотр" onclick="secretsManager.viewNote('${e.id}')">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="7" cy="7" r="2"/>
                            <path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z"/>
                        </svg>
                    </button>
                    <button class="secret-btn delete" title="Удалить" onclick="secretsManager.confirmDelete('${e.id}')">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4"/>
                            <path d="M3 4l1 8h6l1-8"/>
                        </svg>
                    </button>
                </div>
            </div>
        `}escapeHtml(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}escapeAttr(e){return e?e.replace(/`/g,"\\`").replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\n/g,"\\n"):""}showAddModal(){const e=document.createElement("div");e.className="secrets-modal-overlay",e.innerHTML=`
            <div class="secrets-modal">
                <div class="secrets-modal-header">
                    <h3>Добавить</h3>
                    <button class="secrets-modal-close" onclick="secretsManager.closeModal()">×</button>
                </div>
                <div class="secrets-modal-body">
                    <div class="add-type-buttons">
                        <button class="add-type-btn" onclick="secretsManager.showPasswordModal()">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
                                <circle cx="11" cy="11" r="7"/>
                                <path d="M16 16l12 12M24 24l3 3M24 28l3-3"/>
                            </svg>
                            <span>Пароль / Токен</span>
                        </button>
                        <button class="add-type-btn" onclick="secretsManager.showNoteModal()">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="5" y="3" width="22" height="26" rx="3"/>
                                <path d="M10 10h12M10 16h12M10 22h8"/>
                            </svg>
                            <span>Заметка</span>
                        </button>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(e)}showPasswordModal(){this.closeModal();const e=document.createElement("div");e.className="secrets-modal-overlay",e.innerHTML=`
            <div class="secrets-modal">
                <div class="secrets-modal-header">
                    <h3>Добавить пароль</h3>
                    <button class="secrets-modal-close" onclick="secretsManager.closeModal()">×</button>
                </div>
                <div class="secrets-modal-body">
                    <div class="form-group">
                        <label class="form-label">Название</label>
                        <input type="text" id="secretName" class="form-input" placeholder="GitHub, Google...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Логин / Email</label>
                        <input type="text" id="secretLogin" class="form-input" placeholder="user@example.com">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Пароль / Токен</label>
                        <input type="password" id="secretPassword" class="form-input" placeholder="••••••••">
                    </div>
                    <div class="form-group">
                        <label class="form-label">URL (необязательно)</label>
                        <input type="text" id="secretUrl" class="form-input" placeholder="https://...">
                    </div>
                </div>
                <div class="secrets-modal-footer">
                    <button class="btn btn-secondary" onclick="secretsManager.closeModal()">Отмена</button>
                    <button class="btn btn-primary" onclick="secretsManager.savePassword()">Сохранить</button>
                </div>
            </div>
        `,document.body.appendChild(e),setTimeout(()=>{var t;return(t=document.getElementById("secretName"))==null?void 0:t.focus()},100)}showNoteModal(){this.closeModal();const e=document.createElement("div");e.className="secrets-modal-overlay",e.innerHTML=`
            <div class="secrets-modal">
                <div class="secrets-modal-header">
                    <h3>Добавить заметку</h3>
                    <button class="secrets-modal-close" onclick="secretsManager.closeModal()">×</button>
                </div>
                <div class="secrets-modal-body">
                    <div class="form-group">
                        <label class="form-label">Заголовок</label>
                        <input type="text" id="noteTitle" class="form-input" placeholder="Название заметки">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Содержимое</label>
                        <textarea id="noteContent" class="form-input form-textarea" rows="6" placeholder="Текст заметки, код, данные..."></textarea>
                    </div>
                </div>
                <div class="secrets-modal-footer">
                    <button class="btn btn-secondary" onclick="secretsManager.closeModal()">Отмена</button>
                    <button class="btn btn-primary" onclick="secretsManager.saveNote()">Сохранить</button>
                </div>
            </div>
        `,document.body.appendChild(e),setTimeout(()=>{var t;return(t=document.getElementById("noteTitle"))==null?void 0:t.focus()},100)}viewNote(e){const t=this.items.find(n=>n.id===e);if(!t)return;const s=document.createElement("div");s.className="secrets-modal-overlay",s.innerHTML=`
            <div class="secrets-modal">
                <div class="secrets-modal-header">
                    <h3>${this.escapeHtml(t.title)}</h3>
                    <button class="secrets-modal-close" onclick="secretsManager.closeModal()">×</button>
                </div>
                <div class="secrets-modal-body">
                    <pre class="note-content-view">${this.escapeHtml(t.content)}</pre>
                </div>
                <div class="secrets-modal-footer">
                    <button class="btn btn-secondary" onclick="secretsManager.closeModal()">Закрыть</button>
                    <button class="btn btn-primary" onclick="secretsManager.copyToClipboard(\`${this.escapeAttr(t.content)}\`, this)">Копировать</button>
                </div>
            </div>
        `,document.body.appendChild(s)}closeModal(){const e=document.querySelector(".secrets-modal-overlay");e&&e.remove()}savePassword(){var i,a,r,l;const e=(i=document.getElementById("secretName"))==null?void 0:i.value.trim(),t=(a=document.getElementById("secretLogin"))==null?void 0:a.value.trim(),s=(r=document.getElementById("secretPassword"))==null?void 0:r.value,n=((l=document.getElementById("secretUrl"))==null?void 0:l.value.trim())||"";if(!e){alert("Введите название");return}if(!t){alert("Введите логин");return}if(!s){alert("Введите пароль");return}this.addPassword(e,t,s,n),this.closeModal()}saveNote(){var s,n;const e=(s=document.getElementById("noteTitle"))==null?void 0:s.value.trim(),t=(n=document.getElementById("noteContent"))==null?void 0:n.value;if(!e){alert("Введите заголовок");return}if(!t){alert("Введите содержимое");return}this.addNote(e,t),this.closeModal()}confirmDelete(e){confirm("Удалить?")&&this.remove(e)}}const secretsManager=new SecretsManager;window.secretsManager=secretsManager;class SystemMonitor{constructor(){this.intervalId=null,this.processes=[],this.storageData=[]}init(){this.setupEventListeners(),this.startMonitoring(),this.loadStorageInfo(),this.loadProcesses()}setupEventListeners(){document.querySelectorAll(".settings-icon-btn").forEach(t=>{t.addEventListener("click",()=>{const s=t.dataset.section;this.switchSection(s)})});const e=document.getElementById("processSearch");e&&e.addEventListener("input",t=>{this.filterProcesses(t.target.value)})}switchSection(e){document.querySelectorAll(".settings-icon-btn").forEach(t=>{t.classList.toggle("active",t.dataset.section===e)}),document.querySelectorAll(".settings-section").forEach(t=>{t.classList.toggle("active",t.id===`settings-${e}`)}),e==="storage"?this.loadStorageInfo():e==="processes"&&this.loadProcesses()}startMonitoring(){this.updateSystemInfo(),this.intervalId=setInterval(()=>this.updateSystemInfo(),3e3)}stopMonitoring(){this.intervalId&&(clearInterval(this.intervalId),this.intervalId=null)}updateSystemInfo(){const e=performance.memory,t=performance.timing,s=performance.now();let n=0;for(;performance.now()-s<10;)n++;const i=Math.min(95,Math.max(5,100-n/1e3));let a=0,r=0,l=0;e?(a=e.usedJSHeapSize/(1024*1024),r=e.jsHeapSizeLimit/(1024*1024),l=a/r*100):(l=30+Math.random()*20,a=l*16,r=16384),this.updateElement("cpuPercent",Math.round(i)+"%"),this.updateElement("cpuBar",null,{width:i+"%"}),this.updateElement("cpuDetails",`Загрузка: ${Math.round(i)}%`),this.updateElement("ramPercent",Math.round(l)+"%"),this.updateElement("ramBar",null,{width:l+"%"}),this.updateElement("ramDetails",`${Math.round(a)} / ${Math.round(r)} MB`);const c=10+Math.random()*30;this.updateElement("gpuPercent",Math.round(c)+"%"),this.updateElement("gpuBar",null,{width:c+"%"}),this.updateElement("gpuDetails",`Загрузка: ${Math.round(c)}%`);const d=35+i*.4,u=30+c*.3;this.updateElement("tempValue",Math.round(d)+"°C"),this.updateElement("cpuTemp",Math.round(d)+"°C"),this.updateElement("gpuTemp",Math.round(u)+"°C"),this.updateElement("osInfo",this.getOSInfo()),this.updateElement("cpuModel",navigator.hardwareConcurrency+" ядер"),this.updateElement("totalRam",Math.round(r)+" MB"),this.updateElement("uptime",this.getUptime(t)),this.updateProgressColor("cpuBar",i),this.updateProgressColor("ramBar",l)}updateElement(e,t,s={}){const n=document.getElementById(e);n&&(t!==null&&(n.textContent=t),Object.entries(s).forEach(([i,a])=>{n.style[i]=a}))}updateProgressColor(e,t){const s=document.getElementById(e);s&&(s.classList.remove("warning","danger"),t>80?s.classList.add("danger"):t>60&&s.classList.add("warning"))}getOSInfo(){const e=navigator.userAgent;return e.includes("Windows")?"Windows":e.includes("Mac")?"macOS":e.includes("Linux")?"Linux":e.includes("Android")?"Android":e.includes("iOS")?"iOS":navigator.platform||"Unknown"}getUptime(e){const t=Date.now(),s=(e==null?void 0:e.navigationStart)||t-performance.now(),n=Math.floor((t-s)/1e3),i=Math.floor(n/3600),a=Math.floor(n%3600/60),r=n%60;return i>0?`${i}ч ${a}м ${r}с`:`${a}м ${r}с`}loadStorageInfo(){const e=document.getElementById("storageList");e&&(navigator.storage&&navigator.storage.estimate?navigator.storage.estimate().then(t=>{const s=t.usage||0,n=t.quota||0,i=(s/(1024*1024)).toFixed(1),a=(n/(1024*1024)).toFixed(1),r=n>0?s/n*100:0;e.innerHTML=`
                    <div class="storage-item">
                        <div class="storage-header">
                            <span class="storage-name">Локальное хранилище</span>
                            <span class="storage-size">${i} / ${a} MB</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${r}%"></div>
                        </div>
                        <div class="storage-stats">
                            <span>Использовано: ${i} MB</span>
                            <span>Доступно: ${(a-i).toFixed(1)} MB</span>
                        </div>
                        <div class="storage-actions">
                            <button class="monitor-btn" onclick="systemMonitor.clearCache()">Очистить кеш</button>
                            <button class="monitor-btn" onclick="systemMonitor.exportData()">Экспорт данных</button>
                        </div>
                    </div>
                    ${this.getLocalStorageInfo()}
                `}):e.innerHTML=`
                <div class="storage-item">
                    <div class="storage-header">
                        <span class="storage-name">Хранилище</span>
                    </div>
                    <div class="storage-stats">
                        <span>API хранилища недоступен</span>
                    </div>
                </div>
                ${this.getLocalStorageInfo()}
            `)}getLocalStorageInfo(){let e=0;const t=[];for(let n=0;n<localStorage.length;n++){const i=localStorage.key(n),a=localStorage.getItem(i),r=new Blob([a]).size;e+=r,i.startsWith("gitody_")&&t.push({key:i,size:r})}return`
            <div class="storage-item">
                <div class="storage-header">
                    <span class="storage-name">LocalStorage (приложение)</span>
                    <span class="storage-size">${(e/1024).toFixed(2)} KB</span>
                </div>
                <div class="storage-details">
                    ${t.map(n=>`
                        <div class="storage-detail-row">
                            <span>${n.key.replace("gitody_","")}</span>
                            <span>${(n.size/1024).toFixed(2)} KB</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `}clearCache(){if(confirm("Очистить кеш приложения? Настройки сохранятся.")){const e=["gitody_session","gitody_ai_keys","gitody_secrets"],t=[];for(let s=0;s<localStorage.length;s++)t.push(localStorage.key(s));t.forEach(s=>{s.startsWith("gitody_")&&!e.some(n=>s.includes(n))&&localStorage.removeItem(s)}),this.showNotification("Кеш очищен"),this.loadStorageInfo()}}exportData(){const e={};for(let i=0;i<localStorage.length;i++){const a=localStorage.key(i);a.startsWith("gitody_")&&(e[a]=localStorage.getItem(a))}const t=new Blob([JSON.stringify(e,null,2)],{type:"application/json"}),s=URL.createObjectURL(t),n=document.createElement("a");n.href=s,n.download=`gitody-backup-${Date.now()}.json`,n.click(),URL.revokeObjectURL(s),this.showNotification("Данные экспортированы")}loadProcesses(){if(!document.getElementById("processesList"))return;const t=performance.getEntriesByType("resource"),s=performance.getEntriesByType("navigation");this.processes=[...s.map(n=>({name:"Приложение (main)",type:"navigation",duration:n.duration,size:n.transferSize||0})),...t.slice(-20).map(n=>({name:n.name.split("/").pop()||n.name,type:n.initiatorType,duration:n.duration,size:n.transferSize||0}))],this.renderProcesses()}renderProcesses(e=""){const t=document.getElementById("processesList");if(!t)return;const s=e?this.processes.filter(n=>n.name.toLowerCase().includes(e.toLowerCase())):this.processes;if(s.length===0){t.innerHTML='<div class="driver-loading">Нет процессов</div>';return}t.innerHTML=s.map((n,i)=>`
            <div class="process-item">
                <span class="process-name">${this.escapeHtml(n.name)}</span>
                <div class="process-usage">
                    <span class="process-stat">Время: <span>${n.duration.toFixed(0)}ms</span></span>
                    <span class="process-stat">Размер: <span>${this.formatBytes(n.size)}</span></span>
                </div>
            </div>
        `).join("")}filterProcesses(e){this.renderProcesses(e)}refreshProcesses(){performance.clearResourceTimings(),setTimeout(()=>this.loadProcesses(),100),this.showNotification("Список обновлён")}formatBytes(e){if(e===0)return"0 B";const t=1024,s=["B","KB","MB","GB"],n=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,n)).toFixed(1))+" "+s[n]}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}showNotification(e){const t=document.createElement("div");t.style.cssText=`
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 12px;
            z-index: 10000;
        `,t.textContent=e,document.body.appendChild(t),setTimeout(()=>{t.style.opacity="0",setTimeout(()=>t.remove(),200)},2e3)}destroy(){this.stopMonitoring()}}const systemMonitor=new SystemMonitor;class SystemMonitorReal{constructor(){this.monitoringActive=!1,this.monitoringInterval=null,this.updateInterval=2e3,this.history={cpu:[],mem:[],disk:[],maxHistoryLength:60},this.lastUpdate={}}init(){console.log("[SystemMonitor] Инициализация..."),this.setupEventListeners(),this.startMonitoring(),this.updateAllData(),setTimeout(()=>this.checkForUpdates(),2e3)}setupEventListeners(){document.querySelectorAll(".settings-icon-btn").forEach(e=>{e.addEventListener("click",()=>{this.switchSection(e.dataset.section)})})}switchSection(e){document.querySelectorAll(".settings-section").forEach(s=>{s.classList.remove("active")});const t=document.getElementById(`settings-${e}`);t&&t.classList.add("active"),document.querySelectorAll(".settings-icon-btn").forEach(s=>{s.classList.remove("active"),s.dataset.section===e&&s.classList.add("active")})}async updateAllData(){try{const e=await window.ipcRenderer.invoke("get-cpu-info");e&&e.load!==void 0&&(this.updateCPUDisplay(e),this.history.cpu.push(parseFloat(e.load)),this.history.cpu.length>this.maxHistoryLength&&this.history.cpu.shift(),this.lastUpdate.cpu=e);const t=await window.ipcRenderer.invoke("get-memory-info");t&&t.percent!==void 0&&(this.updateMemoryDisplay(t),this.history.mem.push(parseFloat(t.percent)),this.history.mem.length>this.maxHistoryLength&&this.history.mem.shift(),this.lastUpdate.mem=t);const s=await window.ipcRenderer.invoke("get-disk-info");s&&s.percent!==void 0&&(this.updateDiskDisplay(s),this.history.disk.push(parseFloat(s.percent)),this.history.disk.length>this.maxHistoryLength&&this.history.disk.shift(),this.lastUpdate.disk=s);const n=await window.ipcRenderer.invoke("get-gpu-info");n&&(this.updateGPUDisplay(n),this.lastUpdate.gpu=n);const i=await window.ipcRenderer.invoke("get-os-info");i&&(this.updateOSDisplay(i),this.lastUpdate.os=i);const a=await window.ipcRenderer.invoke("get-processes");a&&(this.updateProcessesDisplay(a),this.lastUpdate.processes=a);const r=await window.ipcRenderer.invoke("get-network-info");r&&(this.updateNetworkDisplay(r),this.lastUpdate.network=r);const l=await window.ipcRenderer.invoke("get-drivers-info");l&&(this.updateDriversDisplay(l),this.lastUpdate.drivers=l),console.log("[SystemMonitor] Обновление завершено")}catch(e){console.error("[SystemMonitor] Ошибка обновления:",e)}}updateCPUDisplay(e){const t=document.getElementById("settings-system");if(!t)return;let s=t.querySelector('.system-card[data-type="cpu"]');if(!s){if(s=document.createElement("div"),s.className="system-card",s.setAttribute("data-type","cpu"),!t.querySelector(".system-cards-grid")){const i=document.createElement("div");i.className="system-cards-grid",t.appendChild(i)}t.querySelector(".system-cards-grid").appendChild(s)}const n=Math.min(100,Math.max(0,parseFloat(e.load)||0));s.innerHTML=`
            <div class="system-card-header">CPU</div>
            <div class="system-card-stat">
                <span class="label">Загрузка</span>
                <span class="value">${e.load}%</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Ядер</span>
                <span class="value">${e.cores}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Температура</span>
                <span class="value">${parseFloat(e.temp||0).toFixed(1)}°C</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${n}%"></div>
            </div>
        `}updateMemoryDisplay(e){const t=document.getElementById("settings-system");if(!t)return;let s=t.querySelector('.system-card[data-type="memory"]');if(!s){if(s=document.createElement("div"),s.className="system-card",s.setAttribute("data-type","memory"),!t.querySelector(".system-cards-grid")){const i=document.createElement("div");i.className="system-cards-grid",t.appendChild(i)}t.querySelector(".system-cards-grid").appendChild(s)}const n=Math.min(100,Math.max(0,parseFloat(e.percent)||0));s.innerHTML=`
            <div class="system-card-header">Память</div>
            <div class="system-card-stat">
                <span class="label">Используется</span>
                <span class="value">${e.used} GB / ${e.total} GB</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Загрузка</span>
                <span class="value">${e.percent}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${n}%"></div>
            </div>
        `}updateDiskDisplay(e){const t=document.getElementById("settings-system");if(!t)return;let s=t.querySelector('.system-card[data-type="disk"]');if(!s){if(s=document.createElement("div"),s.className="system-card",s.setAttribute("data-type","disk"),!t.querySelector(".system-cards-grid")){const i=document.createElement("div");i.className="system-cards-grid",t.appendChild(i)}t.querySelector(".system-cards-grid").appendChild(s)}const n=Math.min(100,Math.max(0,parseFloat(e.percent)||0));s.innerHTML=`
            <div class="system-card-header">Диск</div>
            <div class="system-card-stat">
                <span class="label">Используется</span>
                <span class="value">${e.used} GB / ${e.total} GB</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Загрузка</span>
                <span class="value">${e.percent}%</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Дисков</span>
                <span class="value">${e.disks}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${n}%"></div>
            </div>
        `}updateGPUDisplay(e){const t=document.getElementById("settings-system");if(!t)return;let s=t.querySelector('.system-card[data-type="gpu"]');if(!s){if(s=document.createElement("div"),s.className="system-card",s.setAttribute("data-type","gpu"),!t.querySelector(".system-cards-grid")){const n=document.createElement("div");n.className="system-cards-grid",t.appendChild(n)}t.querySelector(".system-cards-grid").appendChild(s)}s.innerHTML=`
            <div class="system-card-header">GPU</div>
            <div class="system-card-stat">
                <span class="label">Бренд</span>
                <span class="value">${e.brand}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Модель</span>
                <span class="value">${e.model}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">VRAM</span>
                <span class="value">${e.vram} MB</span>
            </div>
        `}updateOSDisplay(e){const t=document.getElementById("settings-system");if(!t)return;let s=t.querySelector('.system-card[data-type="os"]');if(!s){if(s=document.createElement("div"),s.className="system-card",s.setAttribute("data-type","os"),!t.querySelector(".system-cards-grid")){const a=document.createElement("div");a.className="system-cards-grid",t.appendChild(a)}t.querySelector(".system-cards-grid").appendChild(s)}const n=Math.floor((e.uptime||0)/3600),i=Math.floor(n/24);s.innerHTML=`
            <div class="system-card-header">ОС</div>
            <div class="system-card-stat">
                <span class="label">ОС</span>
                <span class="value">${e.platform} ${e.distro}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Архитектура</span>
                <span class="value">${e.arch}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Ядро</span>
                <span class="value">${e.kernel}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Uptime</span>
                <span class="value">${i}д ${n%24}ч</span>
            </div>
        `}updateProcessesDisplay(e){const t=document.getElementById("settings-system");if(!t)return;let s=t.querySelector('.system-card[data-type="processes"]');if(!s){if(s=document.createElement("div"),s.className="system-card",s.setAttribute("data-type","processes"),!t.querySelector(".system-cards-grid")){const i=document.createElement("div");i.className="system-cards-grid",t.appendChild(i)}t.querySelector(".system-cards-grid").appendChild(s)}let n='<div class="system-card-header">Топ процессы</div>';if(e&&e.length>0)for(const i of e.slice(0,5))n+=`
                    <div class="process-item">
                        <span class="proc-name">${i.name}</span>
                        <span class="proc-mem">${i.mem}MB</span>
                    </div>
                `;else n+='<div style="padding: 8px 0; color: var(--text-tertiary); font-size: 10px;">Нет данных</div>';s.innerHTML=n}updateNetworkDisplay(e){const t=document.getElementById("settings-system");if(!t)return;let s=t.querySelector('.system-card[data-type="network"]');if(!s){if(s=document.createElement("div"),s.className="system-card",s.setAttribute("data-type","network"),!t.querySelector(".system-cards-grid")){const n=document.createElement("div");n.className="system-cards-grid",t.appendChild(n)}t.querySelector(".system-cards-grid").appendChild(s)}s.innerHTML=`
            <div class="system-card-header">Сеть</div>
            <div class="system-card-stat">
                <span class="label">Интерфейсов</span>
                <span class="value">${e.interfaces}</span>
            </div>
            <div class="system-card-stat">
                <span class="label">Общая скорость</span>
                <span class="value">${e.totalSpeed} Mbps</span>
            </div>
        `}updateDriversDisplay(e){const t=document.getElementById("settings-system");if(!t)return;let s=t.querySelector('.system-card[data-type="drivers"]');s||(s=document.createElement("div"),s.className="system-card drivers-full-card",s.setAttribute("data-type","drivers"),t.appendChild(s));let n=`
            <div class="system-card-header">Драйверы и устройства (${e.length})</div>
            <div class="drivers-table">
                <div class="drivers-table-header">
                    <div class="col-name">Устройство</div>
                    <div class="col-type">Тип</div>
                    <div class="col-status">Статус</div>
                    <div class="col-version">Версия</div>
                    <div class="col-actions">Действия</div>
                </div>
        `;if(e&&e.length>0)for(const i of e){let a="active",r=i.status||"Актуален";i.needsUpdate?(a="warning",r="ТРЕБУЕТСЯ ОБНОВЛЕНИЕ"):(i.status==="Неактивен"||i.status==="Ошибка")&&(a="error"),n+=`
                    <div class="drivers-table-row ${i.needsUpdate?"needs-update":""}">
                        <div class="col-name">
                            <div class="driver-name-main">${this.escapeHtml(i.name)}</div>
                            <div class="driver-model">${this.escapeHtml(i.model||i.type)}</div>
                        </div>
                        <div class="col-type">${i.type}</div>
                        <div class="col-status">
                            <span class="status-badge ${a}">
                                ${r}
                            </span>
                        </div>
                        <div class="col-version">${this.escapeHtml(i.version||i.current||"N/A")}</div>
                        <div class="col-actions">
                            ${i.needsUpdate?`
                                <button class="driver-btn warning" onclick="systemMonitorReal.updateDriver('${i.id}')" title="Обновить">⚠️</button>
                            `:`
                                <button class="driver-btn" onclick="systemMonitorReal.updateDriver('${i.id}')" title="Обновить">↻</button>
                                <button class="driver-btn" onclick="systemMonitorReal.reinstallDriver('${i.id}')" title="Переустановить">⟳</button>
                            `}
                        </div>
                    </div>
                `}else n+='<div style="padding: 12px; color: var(--text-tertiary); text-align: center;">Драйверы не найдены</div>';n+="</div>",s.innerHTML=n}updateDriver(e){window.ipcRenderer.invoke("update-driver",e).then(t=>{console.log("[Driver Update]",t),t.success?this.showNotification(t.message):this.showNotification("Ошибка: "+t.message,"error")}).catch(t=>console.error("Update error:",t))}reinstallDriver(e){confirm(`Переустановить драйвер ${e}?`)&&window.ipcRenderer.invoke("reinstall-driver",e).then(t=>{console.log("[Driver Reinstall]",t),t.success?this.showNotification(t.message):this.showNotification("Ошибка: "+t.message,"error")}).catch(t=>console.error("Reinstall error:",t))}showNotification(e,t="success"){const s=document.createElement("div");s.className=`monitor-notification ${t}`,s.textContent=e,document.body.appendChild(s),setTimeout(()=>{s.classList.add("fade-out"),setTimeout(()=>s.remove(),300)},3e3)}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}toggleMonitoring(){if(this.monitoringActive){this.stopMonitoring(),this.updateStatusUI("Мониторинг остановлен");const e=document.getElementById("toggleMonitoring");e&&(e.textContent="▶ Запустить мониторинг",e.classList.remove("primary"))}else{this.startMonitoring(),this.updateStatusUI("Мониторинг активен");const e=document.getElementById("toggleMonitoring");e&&(e.textContent="⏸ Остановить мониторинг",e.classList.add("primary"))}}updateStatusUI(e){const t=document.getElementById("monitorStatus");t&&(t.textContent=e,t.classList.add("status-update"),setTimeout(()=>t.classList.remove("status-update"),300))}async checkForUpdates(){try{console.log("[SystemMonitor] Проверка обновлений...");const e=await window.ipcRenderer.invoke("check-driver-updates");e&&e.updates&&(document.querySelector('.system-card[data-type="drivers"]')&&(this.updateDriversDisplay(e.updates),e.hasUpdates?this.showNotification("Доступны обновления драйверов","warning"):this.showNotification("Все драйверы актуальны","success")),this.updateStatusUI(`Проверено: ${new Date().toLocaleTimeString()}`))}catch(e){console.error("[SystemMonitor] Check updates error:",e),this.showNotification("Ошибка при проверке обновлений","error")}}startMonitoring(){this.monitoringActive||(this.monitoringActive=!0,console.log("[SystemMonitor] Мониторинг запущен"),this.monitoringInterval=setInterval(()=>{this.updateAllData()},this.updateInterval))}stopMonitoring(){this.monitoringInterval&&(clearInterval(this.monitoringInterval),this.monitoringInterval=null),this.monitoringActive=!1,console.log("[SystemMonitor] Мониторинг остановлен")}dispose(){this.stopMonitoring()}}const systemMonitorReal=new SystemMonitorReal;class DiskManager{constructor(){this.disks=[],this.volumes=[],this.removableDevices=[],this.updateInterval=5e3,this.monitoringActive=!1}init(){console.log("[DiskManager] Инициализация..."),this.setupEventListeners(),this.startMonitoring(),this.loadAllData()}setupEventListeners(){}async loadAllData(){try{this.disks=await window.ipcRenderer.invoke("get-disk-list"),this.volumes=await window.ipcRenderer.invoke("get-volumes"),this.removableDevices=await window.ipcRenderer.invoke("get-removable-devices"),console.log("[DiskManager] Loaded:",{disks:this.disks.length,volumes:this.volumes.length,removable:this.removableDevices.length}),this.renderDiskMonitor()}catch(e){console.error("[DiskManager] Load error:",e)}}renderDiskMonitor(){let e=document.querySelector("#settings-system .disk-monitor-container");if(!e){console.error("[DiskManager] Disk monitor container not found");return}let t=`
            <div class="disk-monitor-panel">
                <div class="disk-monitor-header">
                    <h3>Монитор накопителей</h3>
                    <button class="disk-monitor-btn" onclick="diskManager.loadAllData()">↻ Обновить</button>
                </div>

                <!-- Диски -->
                <div class="disk-section">
                    <div class="disk-section-title">Жесткие диски (${this.disks.length})</div>
                    <div class="disk-list">
        `;if(this.disks&&this.disks.length>0)for(const s of this.disks){const n=parseFloat(s.percentUsed||0),i=n>80?"critical":n>60?"warning":"normal";t+=`
                    <div class="disk-item ${i}">
                        <div class="disk-info">
                            <div class="disk-name">${s.name} (${s.device})</div>
                            <div class="disk-type">${s.type} • ${s.interface}</div>
                            <div class="disk-usage">
                                <span>${s.used}GB / ${s.sizeGB}GB</span>
                                <span class="percent">${s.percentUsed}%</span>
                            </div>
                            <div class="disk-progress-bar">
                                <div class="disk-progress-fill" style="width: ${n}%"></div>
                            </div>
                        </div>
                        <div class="disk-actions">
                            <button class="disk-btn" onclick="diskManager.showDiskOptions('${s.id}')" title="Параметры">⚙️</button>
                            <button class="disk-btn" onclick="diskManager.formatDisk('${s.id}')" title="Форматировать">🔄</button>
                        </div>
                    </div>
                `}else t+='<div style="padding: 12px; color: var(--text-tertiary);">Диски не найдены</div>';if(t+=`
                    </div>
                </div>

                <!-- Съемные устройства -->
                <div class="disk-section">
                    <div class="disk-section-title">Съемные устройства (${this.removableDevices.length})</div>
                    <div class="disk-list">
        `,this.removableDevices&&this.removableDevices.length>0)for(const s of this.removableDevices)t+=`
                    <div class="disk-item removable">
                        <div class="disk-info">
                            <div class="disk-name">🔌 ${s.name}</div>
                            <div class="disk-type">${s.type} • ${s.status}</div>
                            ${s.size!=="N/A"?`<div class="disk-usage">${s.size}GB</div>`:""}
                        </div>
                        <div class="disk-actions">
                            <button class="disk-btn" onclick="diskManager.formatDisk('${s.id}')" title="Форматировать">🔄</button>
                            <button class="disk-btn eject" onclick="diskManager.ejectDisk('${s.id}')" title="Извлечь">⏏️</button>
                        </div>
                    </div>
                `;else t+='<div style="padding: 12px; color: var(--text-tertiary);">Съемные устройства не подключены</div>';if(t+=`
                    </div>
                </div>

                <!-- Разделы -->
                <div class="disk-section">
                    <div class="disk-section-title">Разделы (${this.volumes.length})</div>
                    <div class="disk-list">
        `,this.volumes&&this.volumes.length>0)for(const s of this.volumes){const n=parseFloat(s.percentUsed),i=n>80?"critical":n>60?"warning":"normal";t+=`
                    <div class="disk-item volume ${i}">
                        <div class="disk-info">
                            <div class="disk-name">${s.mount}</div>
                            <div class="disk-type">${s.filesystem}</div>
                            <div class="disk-usage">
                                <span>${s.used}GB / ${s.size}GB</span>
                                <span class="percent">${s.percentUsed}%</span>
                            </div>
                            <div class="disk-progress-bar">
                                <div class="disk-progress-fill" style="width: ${n}%"></div>
                            </div>
                        </div>
                    </div>
                `}else t+='<div style="padding: 12px; color: var(--text-tertiary);">Разделы не найдены</div>';t+=`
                    </div>
                </div>
            </div>
        `,e.innerHTML=t}showDiskOptions(e){const t=this.disks.find(n=>n.id===e);if(!t)return;const s=`Параметры диска ${t.name}:

1. Форматировать
2. Создать раздел
3. Очистить

Выберите действие (не реализовано в полной версии)`;alert(s)}formatDisk(e){confirm(`Вы уверены? Все данные будут удалены!

Диск: ${e}`)&&window.ipcRenderer.invoke("format-disk",e).then(t=>{t.success?(this.showNotification(t.message,"success"),setTimeout(()=>this.loadAllData(),1e3)):this.showNotification(t.message,"error")})}ejectDisk(e){confirm(`Извлечь диск ${e}?`)&&window.ipcRenderer.invoke("eject-disk",e).then(t=>{t.success?(this.showNotification(t.message,"success"),setTimeout(()=>this.loadAllData(),1e3)):this.showNotification(t.message,"error")})}showNotification(e,t="info"){const s=document.createElement("div");s.className=`disk-notification ${t}`,s.textContent=e,document.body.appendChild(s),setTimeout(()=>{s.classList.add("fade-out"),setTimeout(()=>s.remove(),300)},3e3)}startMonitoring(){this.monitoringActive||(this.monitoringActive=!0,setInterval(()=>{this.loadAllData()},this.updateInterval))}stopMonitoring(){this.monitoringActive=!1}dispose(){this.stopMonitoring()}}const diskManager=new DiskManager;class SpeechToTextEditor{constructor(){this.recognition=null,this.isListening=!1,this.isPaused=!1,this.startTime=null,this.pausedTime=0,this.history=[],this.historyStep=-1,this.transcriptItems=[],this.confidence=0,this.currentLanguage="ru-RU",this.audioContext=null,this.analyser=null,this.dataArray=null,this.animationId=null,this.settings={continuous:!0,interimResults:!0,autoPunctuation:!0,autoCapitalize:!1,soundFeedback:!0,maxAlternatives:3,silenceTimeout:5e3}}init(){this.initSpeechRecognition(),this.setupEventListeners(),this.updateStats()}initSpeechRecognition(){const e=window.SpeechRecognition||window.webkitSpeechRecognition;if(!e){this.addTranscriptItem("❌ Speech Recognition not supported",!1);return}this.recognition=new e,this.recognition.continuous=this.settings.continuous,this.recognition.interimResults=this.settings.interimResults,this.recognition.language=this.currentLanguage,this.recognition.maxAlternatives=this.settings.maxAlternatives,this.recognition.onstart=()=>{console.log("[Speech] EVENT: onstart"),this.onStart()},this.recognition.onresult=t=>{console.log("[Speech] EVENT: onresult",t.results.length),this.onResult(t)},this.recognition.onerror=t=>{console.log("[Speech] EVENT: onerror",t.error,t.message),this.onError(t)},this.recognition.onend=()=>{console.log("[Speech] EVENT: onend"),this.onEnd()},this.recognition.onaudiostart=()=>console.log("[Speech] EVENT: onaudiostart"),this.recognition.onaudioend=()=>console.log("[Speech] EVENT: onaudioend"),this.recognition.onspeechstart=()=>console.log("[Speech] EVENT: onspeechstart"),this.recognition.onspeechend=()=>console.log("[Speech] EVENT: onspeechend"),this.recognition.onsoundstart=()=>console.log("[Speech] EVENT: onsoundstart"),this.recognition.onsoundend=()=>console.log("[Speech] EVENT: onsoundend"),this.recognition.onnomatch=()=>console.log("[Speech] EVENT: onnomatch")}initAudioVisualization(){if(!this.audioContext)try{const e=window.AudioContext||window.webkitAudioContext;this.audioContext=new e,navigator.mediaDevices.getUserMedia({audio:!0,video:!1}).then(t=>{const s=this.audioContext.createMediaStreamSource(t);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=256,this.analyser.smoothingTimeConstant=.85,s.connect(this.analyser),this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.drawEqualizer()}).catch(t=>{console.error("Microphone access error:",t),this.addTranscriptItem("🎤 Разрешите доступ к микрофону",!1)})}catch(e){console.error("Audio initialization error:",e)}}drawEqualizer(){const e=document.getElementById("audioCanvas");if(!e)return;const t=e.getContext("2d"),s=e.offsetWidth,n=e.offsetHeight;e.width=s,e.height=n;const i=()=>{if(!this.analyser||!this.dataArray){this.animationId=requestAnimationFrame(i);return}this.analyser.getByteFrequencyData(this.dataArray),t.fillStyle="#0f0f0f",t.fillRect(0,0,s,n);const a=s/64;let r=0;for(let l=0;l<64;l++){const c=Math.floor(l/64*this.dataArray.length),u=this.dataArray[c]/255*n;l<20?t.fillStyle="#32b8c6":l<45?t.fillStyle="#ffa500":t.fillStyle="#ff6b6b",t.fillRect(r,n-u,a-2,u),r+=a}this.animationId=requestAnimationFrame(i)};i()}setupEventListeners(){var e,t,s,n,i,a,r,l,c,d,u,g,p,m,v,f,y,b,E,k,M,x,B,I,S,C;(e=document.getElementById("startBtn"))==null||e.addEventListener("click",()=>this.startRecording()),(t=document.getElementById("stopBtn"))==null||t.addEventListener("click",()=>this.stopRecording()),(s=document.getElementById("pauseBtn"))==null||s.addEventListener("click",()=>this.pauseRecording()),(n=document.getElementById("resumeBtn"))==null||n.addEventListener("click",()=>this.resumeRecording()),(i=document.getElementById("clearBtn"))==null||i.addEventListener("click",()=>this.clearText()),(a=document.getElementById("copyBtn"))==null||a.addEventListener("click",()=>this.copyText()),(r=document.getElementById("exportBtn"))==null||r.addEventListener("click",()=>this.exportText()),(l=document.getElementById("undoBtn"))==null||l.addEventListener("click",()=>this.undo()),(c=document.getElementById("redoBtn"))==null||c.addEventListener("click",()=>this.redo()),(d=document.getElementById("upperBtn"))==null||d.addEventListener("click",()=>this.toUpperCase()),(u=document.getElementById("lowerBtn"))==null||u.addEventListener("click",()=>this.toLowerCase()),(g=document.getElementById("capitalBtn"))==null||g.addEventListener("click",()=>this.capitalize()),(p=document.getElementById("findBtn"))==null||p.addEventListener("click",()=>this.openFindDialog()),(m=document.getElementById("replaceBtn"))==null||m.addEventListener("click",()=>this.openReplaceDialog()),(v=document.getElementById("textEditor"))==null||v.addEventListener("input",()=>this.updateStats()),(f=document.getElementById("languageSelect"))==null||f.addEventListener("change",h=>this.changeLanguage(h.target.value)),(y=document.getElementById("settingsBtn"))==null||y.addEventListener("click",()=>this.toggleSettings()),(b=document.getElementById("closeSettings"))==null||b.addEventListener("click",()=>this.toggleSettings()),(E=document.getElementById("continuousToggle"))==null||E.addEventListener("click",()=>{var h;this.settings.continuous=!this.settings.continuous,this.recognition.continuous=this.settings.continuous,(h=document.getElementById("continuousToggle"))==null||h.classList.toggle("on")}),(k=document.getElementById("interimToggle"))==null||k.addEventListener("click",()=>{var h;this.settings.interimResults=!this.settings.interimResults,this.recognition.interimResults=this.settings.interimResults,(h=document.getElementById("interimToggle"))==null||h.classList.toggle("on")}),(M=document.getElementById("punctuationToggle"))==null||M.addEventListener("click",()=>{var h;this.settings.autoPunctuation=!this.settings.autoPunctuation,(h=document.getElementById("punctuationToggle"))==null||h.classList.toggle("on")}),(x=document.getElementById("autoCapitalizeToggle"))==null||x.addEventListener("click",()=>{var h;this.settings.autoCapitalize=!this.settings.autoCapitalize,(h=document.getElementById("autoCapitalizeToggle"))==null||h.classList.toggle("on")}),(B=document.getElementById("soundToggle"))==null||B.addEventListener("click",()=>{var h;this.settings.soundFeedback=!this.settings.soundFeedback,(h=document.getElementById("soundToggle"))==null||h.classList.toggle("on")}),(I=document.getElementById("fontSizeInput"))==null||I.addEventListener("change",h=>{document.getElementById("textEditor").style.fontSize=h.target.value+"px"}),(S=document.getElementById("maxAltInput"))==null||S.addEventListener("change",h=>{this.settings.maxAlternatives=parseInt(h.target.value),this.recognition.maxAlternatives=this.settings.maxAlternatives}),(C=document.getElementById("silenceInput"))==null||C.addEventListener("change",h=>{this.settings.silenceTimeout=parseInt(h.target.value)})}startRecording(){if(console.log("=== startRecording ==="),!this.recognition){console.error("Recognition not initialized!");return}const e=document.getElementById("startBtn"),t=document.getElementById("stopBtn"),s=document.getElementById("pauseBtn"),n=document.getElementById("resumeBtn"),i=document.getElementById("statusBadge");e&&(e.disabled=!0),t&&(t.disabled=!1),s&&(s.disabled=!1),n&&(n.disabled=!0),i&&(i.textContent="Запуск...",i.className="status-badge processing"),this.initAudioVisualization(),this.isListening=!0,this.isPaused=!1,this.startTime=Date.now()-this.pausedTime,this.pausedTime=0;try{this.recognition.start(),this.startTimer()}catch(a){console.error("Recognition start error:",a),this.isListening=!1,e&&(e.disabled=!1),t&&(t.disabled=!0),s&&(s.disabled=!0),n&&(n.disabled=!0),i&&(i.textContent="Ошибка: "+a.message,i.className="status-badge")}}stopRecording(){if(console.log("=== stopRecording ==="),!this.recognition)return;if(this.isListening=!1,this.animationId){cancelAnimationFrame(this.animationId),this.animationId=null;const a=document.getElementById("audioCanvas");a&&a.getContext("2d").clearRect(0,0,a.width,a.height)}this.audioContext&&(this.audioContext.close().catch(()=>{}),this.audioContext=null,this.analyser=null,this.dataArray=null);const e=document.getElementById("stopBtn"),t=document.getElementById("pauseBtn"),s=document.getElementById("resumeBtn"),n=document.getElementById("startBtn");e&&(e.disabled=!0),t&&(t.disabled=!0),s&&(s.disabled=!0),n&&(n.disabled=!1);const i=document.getElementById("statusBadge");i&&(i.textContent="Обработка...",i.className="status-badge processing"),this.recognition.stop(),this.timerInterval&&(clearInterval(this.timerInterval),this.timerInterval=null)}pauseRecording(){this.isPaused=!0,this.pausedTime=Date.now()-this.startTime,document.getElementById("pauseBtn").disabled=!0,document.getElementById("resumeBtn").disabled=!1,document.getElementById("statusBadge").textContent="Paused",document.getElementById("statusBadge").className="status-badge warning",this.recognition.abort()}resumeRecording(){this.isPaused=!1,this.startTime=Date.now()-this.pausedTime,document.getElementById("pauseBtn").disabled=!1,document.getElementById("resumeBtn").disabled=!0,document.getElementById("statusBadge").textContent="Listening...",document.getElementById("statusBadge").className="status-badge listening",this.recognition.start()}onStart(){console.log("Speech recognition started");const e=document.getElementById("statusBadge");e&&(e.textContent="Слушаю...",e.className="status-badge listening")}onResult(e){console.log("=== onResult ===",e.results.length,"results");let t="",s="";for(let i=e.resultIndex;i<e.results.length;i++){const a=e.results[i][0].transcript;this.confidence=Math.round(e.results[i][0].confidence*100),console.log("Transcript:",a,"isFinal:",e.results[i].isFinal),e.results[i].isFinal?s+=a+" ":t+=a}if(console.log("Final:",s,"Interim:",t),s){const i=this.settings.autoPunctuation?this.addPunctuation(s):s,a=document.getElementById("textEditor");console.log("Editor element:",!!a),a&&(a.value&&!a.value.endsWith(" ")&&(a.value+=" "),a.value+=i,console.log("Text added:",i),this.saveToHistory(a.value)),this.addTranscriptItem(s,!0)}t&&this.addTranscriptItem(t,!1);const n=document.getElementById("confidence");n&&(n.textContent=this.confidence+"%"),this.updateStats()}onError(e){console.error("Speech recognition error:",e.error),this.isListening=!1,this.animationId&&(cancelAnimationFrame(this.animationId),this.animationId=null);const t=document.getElementById("audioCanvas");if(t){const l=t.getContext("2d");l.fillStyle="#0f0f0f",l.fillRect(0,0,t.width,t.height)}this.audioContext&&(this.audioContext.close().catch(()=>{}),this.audioContext=null,this.analyser=null,this.dataArray=null);const s=document.getElementById("startBtn"),n=document.getElementById("stopBtn"),i=document.getElementById("pauseBtn"),a=document.getElementById("resumeBtn");s&&(s.disabled=!1),n&&(n.disabled=!0),i&&(i.disabled=!0),a&&(a.disabled=!0);const r=document.getElementById("statusBadge");r&&(r.textContent="Ошибка: "+e.error,r.className="status-badge",r.style.borderColor="#ff6b6b",r.style.color="#ff6b6b"),this.timerInterval&&(clearInterval(this.timerInterval),this.timerInterval=null)}onEnd(){console.log("=== onEnd ==="),this.isListening=!1;const e=document.getElementById("statusBadge");e&&(e.textContent="Готов",e.className="status-badge ready");const t=document.getElementById("startBtn"),s=document.getElementById("stopBtn"),n=document.getElementById("pauseBtn"),i=document.getElementById("resumeBtn");t&&(t.disabled=!1),s&&(s.disabled=!0),n&&(n.disabled=!0),i&&(i.disabled=!0),this.timerInterval&&(clearInterval(this.timerInterval),this.timerInterval=null)}addTranscriptItem(e,t){const s=document.createElement("div");s.className="transcript-item"+(t?" final":" interim"),s.textContent=e.substring(0,100),s.title=e,s.addEventListener("click",()=>{const i=document.getElementById("textEditor");i.value+=" "+e,this.updateStats(),this.saveToHistory(i.value)});const n=document.getElementById("transcriptHistory");n.insertBefore(s,n.firstChild),n.children.length>20&&n.removeChild(n.lastChild)}addPunctuation(e){return e.replace(/\s+$/g,"").replace(/([.!?])\s+/g,"$1 ")+"."}startTimer(){this.timerInterval=setInterval(()=>{if(this.isListening){const e=Math.floor((Date.now()-this.startTime)/1e3),t=String(Math.floor(e/60)).padStart(2,"0"),s=String(e%60).padStart(2,"0");document.getElementById("duration").textContent=`${t}:${s}`}},100)}updateStats(){var a;const e=((a=document.getElementById("textEditor"))==null?void 0:a.value)||"",t=e.length,s=e.trim()?e.trim().split(/\s+/).length:0,n=document.getElementById("charCount"),i=document.getElementById("wordCount");n&&(n.textContent=t),i&&(i.textContent=s)}changeLanguage(e){this.currentLanguage=e,this.recognition.language=e;const t={"ru-RU":"🇷🇺 Русский","en-US":"🇺🇸 English","zh-CN":"🇨🇳 中文","de-DE":"🇩🇪 Deutsch","fr-FR":"🇫🇷 Français","es-ES":"🇪🇸 Español","ja-JP":"🇯🇵 日本語"};document.getElementById("langInfo").textContent=t[e]}clearText(){confirm("Clear all text?")&&(document.getElementById("textEditor").value="",document.getElementById("transcriptHistory").innerHTML="",this.history=[],this.historyStep=-1,this.updateStats())}copyText(){const e=document.getElementById("textEditor").value;navigator.clipboard.writeText(e).then(()=>{this.playSound("success"),alert("Text copied to clipboard!")})}exportText(){const e=document.getElementById("textEditor").value,t=new Blob([e],{type:"text/plain"}),s=URL.createObjectURL(t),n=document.createElement("a");n.href=s,n.download=`speech-to-text-${Date.now()}.txt`,n.click(),URL.revokeObjectURL(s)}saveToHistory(e){this.history.splice(this.historyStep+1),this.history.push(e),this.historyStep++,document.getElementById("undoBtn").disabled=this.historyStep===0,document.getElementById("redoBtn").disabled=!0}undo(){this.historyStep>0&&(this.historyStep--,document.getElementById("textEditor").value=this.history[this.historyStep],document.getElementById("redoBtn").disabled=!1,this.historyStep===0&&(document.getElementById("undoBtn").disabled=!0),this.updateStats())}redo(){this.historyStep<this.history.length-1&&(this.historyStep++,document.getElementById("textEditor").value=this.history[this.historyStep],document.getElementById("undoBtn").disabled=!1,this.historyStep===this.history.length-1&&(document.getElementById("redoBtn").disabled=!0),this.updateStats())}toUpperCase(){const e=document.getElementById("textEditor");e.value=e.value.toUpperCase(),this.saveToHistory(e.value),this.updateStats()}toLowerCase(){const e=document.getElementById("textEditor");e.value=e.value.toLowerCase(),this.saveToHistory(e.value),this.updateStats()}capitalize(){const e=document.getElementById("textEditor");e.value=e.value.split(" ").map(t=>t.charAt(0).toUpperCase()+t.slice(1).toLowerCase()).join(" "),this.saveToHistory(e.value),this.updateStats()}openFindDialog(){const e=document.getElementById("speechModalOverlay"),t=document.getElementById("speechModalBody"),s=document.getElementById("speechModalTitle");s.textContent="🔍 Find Text",t.innerHTML=`
            <div style="margin-bottom: 12px;">
                <input type="text" id="findInput" placeholder="Find..." style="width: 100%; padding: 8px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary); margin-bottom: 8px;">
                <div id="findResults" style="max-height: 300px; overflow-y: auto; font-size: 12px;"></div>
            </div>
        `;const n=document.getElementById("findInput"),i=document.getElementById("findResults"),a=document.getElementById("textEditor").value;n.addEventListener("input",()=>{const r=n.value;if(!r){i.innerHTML="";return}const l=new RegExp(r,"gi");let c,d=0;for(i.innerHTML="";(c=l.exec(a))!==null&&d<20;)i.innerHTML+=`<div style="padding: 4px; background: var(--bg-secondary); margin-bottom: 4px; border-radius: 2px;">...${a.substring(Math.max(0,c.index-20),c.index)}<span style="background: var(--accent); color: white;">${c[0]}</span>${a.substring(c.index+c[0].length,c.index+c[0].length+20)}...</div>`,d++;d===0&&(i.innerHTML='<div style="padding: 8px; color: var(--text-secondary);">No matches found</div>')}),e.classList.add("show"),n.focus()}openReplaceDialog(){const e=document.getElementById("speechModalOverlay"),t=document.getElementById("speechModalBody"),s=document.getElementById("speechModalTitle");s.textContent="🔄 Find & Replace",t.innerHTML=`
            <div style="margin-bottom: 12px;">
                <input type="text" id="findReplace" placeholder="Find..." style="width: 100%; padding: 8px; margin-bottom: 8px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary);">
                <input type="text" id="replaceWith" placeholder="Replace with..." style="width: 100%; padding: 8px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary);">
            </div>
        `,document.getElementById("speechModalConfirm").textContent="Replace All",document.getElementById("speechModalConfirm").onclick=()=>{const n=document.getElementById("findReplace").value,i=document.getElementById("replaceWith").value,a=document.getElementById("textEditor"),r=a.value.replaceAll(n,i);a.value=r,this.saveToHistory(r),this.updateStats(),e.classList.remove("show")},e.classList.add("show"),document.getElementById("findReplace").focus()}toggleSettings(){document.getElementById("speechSettingsPanel").classList.toggle("open")}playSound(e){if(!this.settings.soundFeedback)return;const t=new(window.AudioContext||window.webkitAudioContext),s=t.createOscillator(),n=t.createGain();switch(s.connect(n),n.connect(t.destination),e){case"start":s.frequency.value=600,n.gain.setValueAtTime(.3,t.currentTime),n.gain.exponentialRampToValueAtTime(.01,t.currentTime+.1),s.start(t.currentTime),s.stop(t.currentTime+.1);break;case"stop":s.frequency.value=400,n.gain.setValueAtTime(.3,t.currentTime),n.gain.exponentialRampToValueAtTime(.01,t.currentTime+.2),s.start(t.currentTime),s.stop(t.currentTime+.2);break;case"success":s.frequency.value=800,n.gain.setValueAtTime(.2,t.currentTime),n.gain.exponentialRampToValueAtTime(.01,t.currentTime+.15),s.start(t.currentTime),s.stop(t.currentTime+.15);break;case"error":s.frequency.value=300,n.gain.setValueAtTime(.3,t.currentTime),n.gain.exponentialRampToValueAtTime(.01,t.currentTime+.3),s.start(t.currentTime),s.stop(t.currentTime+.3);break}}}const speechManager=new SpeechToTextEditor;class AIManager{constructor(){this.storageKey="gitody_ai_keys",this.keys=[],this.providers={openai:{name:"OpenAI",baseUrl:"https://api.openai.com/v1",models:["gpt-4","gpt-4-turbo","gpt-3.5-turbo"],testEndpoint:"/models"},anthropic:{name:"Anthropic",baseUrl:"https://api.anthropic.com/v1",models:["claude-3-opus","claude-3-sonnet","claude-2"],testEndpoint:"/messages",headers:{"anthropic-version":"2023-06-01"}},google:{name:"Google AI",baseUrl:"https://generativelanguage.googleapis.com/v1beta",models:["gemini-pro","gemini-pro-vision"],testEndpoint:"/models"},mistral:{name:"Mistral AI",baseUrl:"https://api.mistral.ai/v1",models:["mistral-large","mistral-medium","mistral-small"],testEndpoint:"/models"},cohere:{name:"Cohere",baseUrl:"https://api.cohere.ai/v1",models:["command","command-light","embed-english"],testEndpoint:"/models"},huggingface:{name:"Hugging Face",baseUrl:"https://api-inference.huggingface.co",models:["inference-api"],testEndpoint:"/models/gpt2"},replicate:{name:"Replicate",baseUrl:"https://api.replicate.com/v1",models:["llama","stable-diffusion"],testEndpoint:"/models"},groq:{name:"Groq",baseUrl:"https://api.groq.com/openai/v1",models:["llama3-70b","mixtral-8x7b"],testEndpoint:"/models"},openrouter:{name:"OpenRouter",baseUrl:"https://openrouter.ai/api/v1",models:["multi-provider"],testEndpoint:"/models"},together:{name:"Together AI",baseUrl:"https://api.together.xyz/v1",models:["llama","mistral","code-llama"],testEndpoint:"/models"},perplexity:{name:"Perplexity",baseUrl:"https://api.perplexity.ai",models:["pplx-7b-online","pplx-70b-online"],testEndpoint:"/chat/completions"},custom:{name:"Custom API",baseUrl:"",models:["custom"],testEndpoint:"/models"}}}init(){this.load(),this.render(),this.setupEventListeners()}load(){try{const e=localStorage.getItem(this.storageKey);this.keys=e?JSON.parse(e):[]}catch(e){console.error("[AI] Load error:",e),this.keys=[]}}save(){try{localStorage.setItem(this.storageKey,JSON.stringify(this.keys))}catch(e){console.error("[AI] Save error:",e)}}setupEventListeners(){document.addEventListener("change",e=>{if(e.target.id==="aiProviderSelect"){const t=document.getElementById("customUrlGroup");t&&(t.style.display=e.target.value==="custom"?"block":"none")}})}render(){const e=document.getElementById("aiKeysList");e&&(this.keys.length===0?e.innerHTML='<div class="ai-keys-empty">Нет добавленных ключей</div>':e.innerHTML=this.keys.map((t,s)=>{var n;return`
                <div class="ai-key-item" data-index="${s}">
                    <div class="ai-key-info">
                        <div class="ai-key-provider">${((n=this.providers[t.provider])==null?void 0:n.name)||t.provider}</div>
                        <div class="ai-key-value">${this.maskKey(t.key)}</div>
                        ${t.name?`<div class="ai-key-name">${this.escapeHtml(t.name)}</div>`:""}
                    </div>
                    <div class="ai-key-actions">
                        <button class="monitor-btn" onclick="aiManager.testKey(${s})" title="Проверить">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                        <button class="monitor-btn" onclick="aiManager.copyKey(${s})" title="Копировать">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </button>
                        <button class="monitor-btn danger" onclick="aiManager.deleteKey(${s})" title="Удалить">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                    </div>
                </div>
            `}).join(""),this.updateProviderStatuses())}updateProviderStatuses(){Object.keys(this.providers).forEach(e=>{const t=document.getElementById(`${e}-status`);if(t){const s=this.keys.some(n=>n.provider===e);t.textContent=s?"Подключен":"Не подключен",t.className="provider-status"+(s?" connected":"")}})}maskKey(e){return!e||e.length<12?"••••••••":e.substring(0,4)+"••••••••"+e.substring(e.length-4)}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}showAddKeyModal(){const t=`
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
                                ${Object.entries(this.providers).map(([s,n])=>`<option value="${s}">${n.name}</option>`).join("")}
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
        `;document.body.insertAdjacentHTML("beforeend",t)}closeModal(){const e=document.getElementById("aiKeyModal");e&&e.remove()}saveKey(){var a,r,l,c;const e=(a=document.getElementById("aiProviderSelect"))==null?void 0:a.value,t=(r=document.getElementById("aiKeyInput"))==null?void 0:r.value.trim(),s=(l=document.getElementById("aiKeyName"))==null?void 0:l.value.trim(),n=(c=document.getElementById("aiCustomUrl"))==null?void 0:c.value.trim();if(!e||!t){alert("Выберите провайдера и введите ключ");return}const i={provider:e,key:t,name:s||"",customUrl:e==="custom"?n:"",addedAt:Date.now()};this.keys=this.keys.filter(d=>d.provider!==e),this.keys.push(i),this.save(),this.render(),this.closeModal()}deleteKey(e){confirm("Удалить этот ключ?")&&(this.keys.splice(e,1),this.save(),this.render())}copyKey(e){var s;const t=(s=this.keys[e])==null?void 0:s.key;t&&navigator.clipboard.writeText(t).then(()=>{this.showNotification("Ключ скопирован")})}async testKey(e){const t=this.keys[e];if(!t)return;const s=this.providers[t.provider];if(!s)return;const i=(t.customUrl||s.baseUrl)+s.testEndpoint;try{const a={Authorization:`Bearer ${t.key}`,"Content-Type":"application/json",...s.headers};t.provider==="anthropic"?(a["x-api-key"]=t.key,delete a.Authorization):t.provider;const r=await fetch(i,{method:"GET",headers:a});r.ok?this.showNotification("Ключ работает"):this.showNotification("Ошибка: "+r.status,"error")}catch(a){this.showNotification("Ошибка подключения","error"),console.error("[AI] Test error:",a)}}getKey(e){const t=this.keys.find(s=>s.provider===e);return(t==null?void 0:t.key)||null}getProvider(e){const t=this.keys.find(s=>s.provider===e);return t?{...this.providers[e],key:t.key,customUrl:t.customUrl}:null}async chat(e,t,s={}){var u,g,p,m,v,f;const n=this.getProvider(e);if(!n)throw new Error("Provider not configured: "+e);const a=(n.customUrl||n.baseUrl)+"/chat/completions",r={model:s.model||n.models[0],messages:t,temperature:s.temperature||.7,max_tokens:s.maxTokens||2048,stream:s.stream||!1},l={Authorization:`Bearer ${n.key}`,"Content-Type":"application/json",...n.headers};e==="anthropic"&&(l["x-api-key"]=n.key,delete l.Authorization,r.max_tokens=s.maxTokens||4096);const c=await fetch(a,{method:"POST",headers:l,body:JSON.stringify(r)});if(!c.ok){const y=await c.json().catch(()=>({}));throw new Error(((u=y.error)==null?void 0:u.message)||`HTTP ${c.status}`)}const d=await c.json();return e==="anthropic"?{content:((p=(g=d.content)==null?void 0:g[0])==null?void 0:p.text)||"",usage:d.usage}:{content:((f=(v=(m=d.choices)==null?void 0:m[0])==null?void 0:v.message)==null?void 0:f.content)||"",usage:d.usage}}showNotification(e,t="success"){const s=document.createElement("div");s.className="ai-notification "+t,s.textContent=e,document.body.appendChild(s),setTimeout(()=>{s.classList.add("fade-out"),setTimeout(()=>s.remove(),300)},2e3)}}const aiManager=new AIManager;class StorageManager{constructor(){this.storageKey="gitody_storage",this.files=[],this.folders=[],this.currentPath="/",this.currentCategory="all",this.categories={documents:[".js",".ts",".jsx",".tsx",".py",".java",".cpp",".c",".go",".rs",".rb",".php",".html",".css",".json",".xml",".yml",".yaml",".md",".txt"],text:[".txt",".md",".doc",".docx",".rtf",".odt",".pdf"],images:[".jpg",".jpeg",".png",".gif",".webp",".svg",".bmp",".ico"],videos:[".mp4",".webm",".avi",".mov",".mkv",".flv",".wmv"],audio:[".mp3",".wav",".ogg",".flac",".aac",".m4a"]}}init(){this.load(),this.setupEventListeners(),this.render(),this.updateStorageInfo()}load(){try{const e=localStorage.getItem(this.storageKey),t=e?JSON.parse(e):{files:[],folders:[]};this.files=t.files||[],this.folders=t.folders||[]}catch(e){console.error("[Storage] Load error:",e),this.files=[],this.folders=[]}}save(){try{localStorage.setItem(this.storageKey,JSON.stringify({files:this.files,folders:this.folders}))}catch(e){console.error("[Storage] Save error:",e)}}setupEventListeners(){document.querySelectorAll(".storage-icon-btn").forEach(t=>{t.addEventListener("click",()=>{this.currentCategory=t.dataset.category,document.querySelectorAll(".storage-icon-btn").forEach(s=>s.classList.remove("active")),t.classList.add("active"),this.render()})});const e=document.getElementById("filesGrid");e&&(e.addEventListener("dragover",t=>{t.preventDefault(),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",t=>{t.preventDefault(),e.classList.remove("drag-over"),this.handleFileDrop(t.dataTransfer.files)}))}getCategory(e){const t=e.substring(e.lastIndexOf(".")).toLowerCase();for(const[s,n]of Object.entries(this.categories))if(n.includes(t))return s;return"other"}getFileIcon(e){const t=this.getCategory(e),s={documents:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',text:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',images:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',videos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',audio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',other:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>'};return s[t]||s.other}formatSize(e){if(e===0)return"0 B";const t=1024,s=["B","KB","MB","GB"],n=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,n)).toFixed(1))+" "+s[n]}formatDate(e){return new Date(e).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"})}render(){const e=document.getElementById("filesGrid"),t=document.getElementById("storageEmpty");if(!e)return;let s=[];const n=this.folders.filter(a=>a.path===this.currentPath);s.push(...n.map(a=>({...a,type:"folder"})));let i=this.files.filter(a=>a.path===this.currentPath);if(this.currentCategory!=="all"&&(i=i.filter(a=>this.getCategory(a.name)===this.currentCategory)),s.push(...i.map(a=>({...a,type:"file"}))),s.length===0){e.innerHTML="",t&&(t.style.display="flex");return}t&&(t.style.display="none"),e.innerHTML=s.map((a,r)=>a.type==="folder"?`
                    <div class="storage-item folder" data-index="${r}" data-path="${a.fullPath}" ondblclick="storageManager.openFolder('${a.fullPath}')">
                        <div class="item-icon folder-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                            </svg>
                        </div>
                        <div class="item-name">${this.escapeHtml(a.name)}</div>
                        <div class="item-meta">${a.itemCount||0} элементов</div>
                        <div class="item-actions">
                            <button class="item-action-btn" onclick="event.stopPropagation(); storageManager.renameItem('folder', '${a.fullPath}')" title="Переименовать">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            </button>
                            <button class="item-action-btn danger" onclick="event.stopPropagation(); storageManager.deleteItem('folder', '${a.fullPath}')" title="Удалить">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                `:`
                    <div class="storage-item file" data-index="${r}" data-id="${a.id}">
                        <div class="item-icon file-icon">${this.getFileIcon(a.name)}</div>
                        <div class="item-name">${this.escapeHtml(a.name)}</div>
                        <div class="item-meta">${this.formatSize(a.size)} • ${this.formatDate(a.addedAt)}</div>
                        <div class="item-actions">
                            <button class="item-action-btn" onclick="storageManager.downloadFile('${a.id}')" title="Скачать">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                            <button class="item-action-btn" onclick="storageManager.renameItem('file', '${a.id}')" title="Переименовать">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            </button>
                            <button class="item-action-btn danger" onclick="storageManager.deleteItem('file', '${a.id}')" title="Удалить">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                `).join(""),this.updateStorageInfo()}updateBreadcrumb(){const e=document.getElementById("storageBreadcrumb");if(!e)return;const t=this.currentPath.split("/").filter(Boolean);let s=`<span class="breadcrumb-item" data-path="/" onclick="storageManager.navigateTo('/')">Хранилище</span>`,n="";t.forEach(i=>{n+="/"+i,s+='<span class="breadcrumb-separator">/</span>',s+=`<span class="breadcrumb-item" data-path="${n}" onclick="storageManager.navigateTo('${n}')">${this.escapeHtml(i)}</span>`}),e.innerHTML=s}navigateTo(e){this.currentPath=e,this.updateBreadcrumb(),this.render()}openFolder(e){this.navigateTo(e)}async uploadFile(){const e=document.createElement("input");e.type="file",e.multiple=!0,e.onchange=async t=>{const s=Array.from(t.target.files);for(const n of s)await this.addFile(n)},e.click()}async addFile(e){return new Promise(t=>{const s=new FileReader;s.onload=n=>{const i={id:Date.now().toString(36)+Math.random().toString(36).substr(2),name:e.name,size:e.size,type:e.type,path:this.currentPath,data:n.target.result,addedAt:Date.now()};this.files.push(i),this.save(),this.render(),this.showNotification(`Файл "${e.name}" загружен`),t()},s.readAsDataURL(e)})}handleFileDrop(e){Array.from(e).forEach(t=>{this.addFile(t)})}createFolder(){const e=prompt("Название папки:");if(!e||!e.trim())return;const t={name:e.trim(),path:this.currentPath,fullPath:this.currentPath==="/"?"/"+e.trim():this.currentPath+"/"+e.trim(),createdAt:Date.now(),itemCount:0};this.folders.push(t),this.save(),this.render(),this.showNotification(`Папка "${e}" создана`)}downloadFile(e){const t=this.files.find(n=>n.id===e);if(!t)return;const s=document.createElement("a");s.href=t.data,s.download=t.name,s.click()}renameItem(e,t){if(e==="folder"){const s=this.folders.find(a=>a.fullPath===t);if(!s)return;const n=prompt("Новое название:",s.name);if(!n||n===s.name)return;const i=s.fullPath;s.name=n,s.fullPath=s.path==="/"?"/"+n:s.path+"/"+n,this.files.forEach(a=>{a.path.startsWith(i)&&(a.path=a.path.replace(i,s.fullPath))}),this.folders.forEach(a=>{a.path.startsWith(i)&&(a.path=a.path.replace(i,s.fullPath),a.fullPath=a.fullPath.replace(i,s.fullPath))})}else{const s=this.files.find(i=>i.id===t);if(!s)return;const n=prompt("Новое название:",s.name);if(!n||n===s.name)return;s.name=n}this.save(),this.render()}deleteItem(e,t){if(confirm("Удалить этот элемент?")){if(e==="folder"){if(!this.folders.find(n=>n.fullPath===t))return;this.files=this.files.filter(n=>!n.path.startsWith(t)),this.folders=this.folders.filter(n=>!n.fullPath.startsWith(t)&&n.fullPath!==t)}else this.files=this.files.filter(s=>s.id!==t);this.save(),this.render(),this.showNotification("Элемент удалён")}}updateStorageInfo(){const e=this.files.reduce((i,a)=>i+(a.size||0),0),t=this.files.length+this.folders.length,s=document.getElementById("storageUsed"),n=document.getElementById("storageItemsCount");s&&(s.textContent=this.formatSize(e)),n&&(n.textContent=t),navigator.storage&&navigator.storage.estimate&&navigator.storage.estimate().then(i=>{const a=document.getElementById("storageTotal");a&&(a.textContent=this.formatSize(i.quota||0))})}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}showNotification(e){const t=document.createElement("div");t.className="storage-notification",t.textContent=e,document.body.appendChild(t),setTimeout(()=>{t.classList.add("fade-out"),setTimeout(()=>t.remove(),300)},2e3)}}const storageManager=new StorageManager;window.session=session;window.githubAuth=githubAuth;window.modalManager=modalManager;window.tabManager=tabManager;window.dropdownManager=dropdownManager;window.navRing=navRing;window.codeEditor=codeEditor;window.repoManager=repoManager;window.githubPanelManager=githubPanelManager;window.githubManager=githubManager;window.secretsManager=secretsManager;window.systemMonitor=systemMonitor;window.systemMonitorReal=systemMonitorReal;window.diskManager=diskManager;window.speechManager=speechManager;window.aiManager=aiManager;window.storageManager=storageManager;window.showModal=o=>modalManager.show(o);window.closeModal=o=>modalManager.close(o);window.switchModal=(o,e)=>modalManager.switch(o,e);async function initApp(){console.log("[App] Starting...");try{navRing.init(),await githubAuth.init();const o=session.getActiveTab();if(o&&navRing&&navRing.setActiveTab(o),githubAuth.isConnected){console.log("[App] Loading repositories..."),await githubManager.loadRepositories();const e=session.getActiveRepo();e&&await githubManager.selectRepo(e)}systemMonitor.init(),systemMonitorReal.init(),diskManager.init(),speechManager.init(),aiManager.init(),storageManager.init(),console.log("[App] Ready")}catch(o){console.error("[App] Init error:",o)}}document.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll(".toggle").forEach(o=>{o.addEventListener("click",function(){this.classList.toggle("enabled")})}),document.querySelectorAll(".btn-primary").forEach(o=>{o.addEventListener("click",function(){this.getAttribute("disabled")||(this.style.opacity="0.8",setTimeout(()=>this.style.opacity="1",100))})}),initApp()});window.connectGitHub=async()=>{var n;const o=document.getElementById("githubTokenInput"),e=document.getElementById("githubConnectStatus");if(!o){console.error("[App] Token input not found");return}const t=o.value.trim();if(!t){e&&(e.textContent="Введите токен",e.style.color="#f85149");return}e&&(e.textContent="Проверка токена...",e.style.color="#8b949e");const s=await githubAuth.connect(t);if(s.success){if(e){const i=(n=s.scopes)!=null&&n.length?` (${s.scopes.slice(0,2).join(", ")})`:"";e.textContent=`✓ Подключено: ${s.user.login}${i}`,e.style.color="#3fb950"}o.value="",await githubManager.loadRepositories(),setTimeout(()=>closeModal("github-connect"),2e3)}else e&&(e.textContent=s.error||"Ошибка подключения",e.style.color="#f85149")};window.connectGitHubOAuth=async()=>{const o=document.getElementById("githubConnectStatus");o&&(o.textContent="Открывается окно авторизации...",o.style.color="#8b949e");try{const e=await githubAuth.connectOAuth();e.success?o&&(o.textContent=e.message||"Авторизация успешна",o.style.color="#3fb950"):o&&(o.textContent=e.error||"Ошибка OAuth",o.style.color="#f85149")}catch(e){console.error("[App] OAuth error:",e),o&&(o.textContent="Ошибка: "+e.message,o.style.color="#f85149")}};window.openGitHubTokenPage=()=>githubAuth.openTokenPage();window.logoutGitHub=()=>{confirm("Выйти из GitHub?")&&(githubAuth.logout(),githubManager.clearData(),location.reload())};window.showContextMenu=(o,e)=>{o.preventDefault(),window.closeContextMenu();const t=document.getElementById("contextMenu");t&&(t.classList.add("active"),t.style.left=Math.min(o.clientX,window.innerWidth-200)+"px",t.style.top=Math.min(o.clientY,window.innerHeight-150)+"px")};window.closeContextMenu=()=>{const o=document.getElementById("contextMenu");o&&o.classList.remove("active")};document.addEventListener("click",window.closeContextMenu);console.log("[App] Module loaded");
