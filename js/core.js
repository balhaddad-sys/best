/**
 * MedWard Core Module
 * Handles application state, authentication, UI interactions, and API communication
 * @version 2.0.0
 */

const MedWard = (() => {
  'use strict';

  // ============================================
  // STATE
  // ============================================
  const state = {
    user: null,
    uploadedFiles: [],
    analysisHistory: [],
    metrics: { total: 0, cacheHits: 0, totalTime: 0, patterns: 0 },
    cache: new Map()
  };

  // ============================================
  // CONSTANTS
  // ============================================
  const STORAGE_KEYS = {
    USER: 'medward_user',
    METRICS: 'medward_metrics',
    HISTORY: 'medward_history',
    PATTERNS: 'medward_patterns'
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const VALID_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

  // ============================================
  // DOM REFERENCES
  // ============================================
  let dom = {};

  // ============================================
  // UTILITIES
  // ============================================
  const Utils = {
    $(id) { return document.getElementById(id); },
    $$(selector) { return document.querySelectorAll(selector); },
    
    formatFileSize(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    },
    
    formatTimeAgo(date) {
      const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
      if (seconds < 60) return 'Just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    },
    
    escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },
    
    generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    debounce(fn, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    },
    
    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  // ============================================
  // STORAGE
  // ============================================
  const Storage = {
    get(key) {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },
    
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }
  };

  // ============================================
  // API
  // ============================================
  const API = {
    async request(url, data) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(data)
        });
        return await response.json();
      } catch (error) {
        console.error('[API] Request failed:', error);
        throw error;
      }
    },
    
    async uploadAndAnalyze(file, documentType = 'lab') {
      const config = window.MEDWARD_CONFIG;
      if (!config?.BACKEND_URL) {
        throw new Error('Backend URL not configured');
      }
      
      const base64Data = await Utils.fileToBase64(file);
      
      return this.request(config.BACKEND_URL, {
        action: 'uploadAndInterpret',
        image: base64Data,
        documentType,
        username: state.user?.name || 'User',
        provider: 'claude'
      });
    },
    
    async analyzeText(text, documentType = 'lab') {
      const config = window.MEDWARD_CONFIG;
      if (!config?.BACKEND_URL) {
        throw new Error('Backend URL not configured');
      }
      
      return this.request(config.BACKEND_URL, {
        action: 'interpret',
        text,
        documentType,
        username: state.user?.name || 'User',
        provider: 'claude'
      });
    }
  };

  // ============================================
  // UI
  // ============================================
  const UI = {
    showScreen(screenId) {
      Utils.$$('.screen').forEach(s => s.classList.remove('active'));
      const screen = Utils.$(`${screenId}-screen`);
      if (screen) screen.classList.add('active');
      
      Utils.$$('.nav-tab').forEach(t => t.classList.remove('active'));
      const tab = document.querySelector(`.nav-tab[data-screen="${screenId}"]`);
      if (tab) tab.classList.add('active');
    },
    
    showToast(message, type = 'success') {
      const toast = dom.toast;
      const toastMessage = dom.toastMessage;
      if (!toast || !toastMessage) return;
      
      toast.className = `toast ${type}`;
      toastMessage.textContent = message;
      toast.classList.add('show');
      
      setTimeout(() => toast.classList.remove('show'), 3000);
    },
    
    showProcessing(show, text = 'Processing with AI...') {
      if (dom.processingOverlay) {
        dom.processingOverlay.classList.toggle('active', show);
      }
      if (dom.processingText && text) {
        dom.processingText.textContent = text;
      }
    },
    
    openModal(modalId) {
      const modal = Utils.$(modalId);
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    },
    
    closeModal(modalId) {
      const modal = Utils.$(modalId);
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    },
    
    updateMetrics() {
      const m = state.metrics;
      if (dom.metricTotal) dom.metricTotal.textContent = m.total;
      if (dom.metricCache) {
        dom.metricCache.textContent = m.total > 0 
          ? `${Math.round((m.cacheHits / m.total) * 100)}%` 
          : '0%';
      }
      if (dom.metricSpeed) {
        dom.metricSpeed.textContent = m.total > 0 
          ? `${Math.round(m.totalTime / m.total)}ms` 
          : '0ms';
      }
      if (dom.metricPatterns) dom.metricPatterns.textContent = m.patterns;
    },
    
    renderActivityList() {
      if (!dom.activityList) return;
      
      if (state.analysisHistory.length === 0) {
        dom.activityList.innerHTML = `
          <div class="activity-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
            <p>No analyses yet</p>
          </div>
        `;
        return;
      }
      
      dom.activityList.innerHTML = state.analysisHistory.slice(0, 5).map(item => `
        <div class="activity-item" data-id="${item.id}">
          <div class="activity-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="activity-text">
            <div class="activity-title">${Utils.escapeHtml(item.type)}</div>
            <div class="activity-time">${Utils.formatTimeAgo(item.timestamp)}</div>
          </div>
        </div>
      `).join('');
      
      // Add click handlers
      dom.activityList.querySelectorAll('.activity-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          const historyItem = state.analysisHistory.find(h => h.id === id);
          if (historyItem?.results) {
            showResults(historyItem.results);
          }
        });
      });
    },
    
    renderFileList() {
      if (!dom.fileList) return;
      
      if (state.uploadedFiles.length === 0) {
        dom.fileList.innerHTML = '';
        return;
      }
      
      dom.fileList.innerHTML = state.uploadedFiles.map((file, index) => `
        <div class="file-item">
          <div class="file-thumb">
            ${file.type.startsWith('image/') 
              ? `<img src="${URL.createObjectURL(file)}" alt="${Utils.escapeHtml(file.name)}">`
              : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>`
            }
          </div>
          <div class="file-info">
            <div class="file-name">${Utils.escapeHtml(file.name)}</div>
            <div class="file-size">${Utils.formatFileSize(file.size)}</div>
          </div>
          <button class="file-remove" data-index="${index}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `).join('');
      
      // Add remove handlers
      dom.fileList.querySelectorAll('.file-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(btn.dataset.index);
          removeFile(index);
        });
      });
    }
  };

  // ============================================
  // AUTH
  // ============================================
  function login(username) {
    console.log('[MedWard] Login attempt with username:', username);
    
    if (!username?.trim()) {
      UI.showToast('Please enter a username', 'error');
      return false;
    }
    
    state.user = { 
      name: username.trim(), 
      initial: username.trim()[0].toUpperCase() 
    };
    Storage.set(STORAGE_KEYS.USER, state.user);
    
    console.log('[MedWard] Login successful, showing dashboard');
    showDashboard();
    UI.showToast(`Welcome, ${state.user.name}!`);
    return true;
  }

  function logout() {
    state.user = null;
    Storage.remove(STORAGE_KEYS.USER);
    
    dom.navUser?.setAttribute('hidden', '');
    UI.showScreen('login');
  }

  function showDashboard() {
    if (dom.userInitial) dom.userInitial.textContent = state.user.initial;
    if (dom.userName) dom.userName.textContent = state.user.name;
    dom.navUser?.removeAttribute('hidden');
    
    UI.showScreen('dashboard');
  }

  // ============================================
  // FILE HANDLING
  // ============================================
  function processFiles(files) {
    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        UI.showToast(`${file.name} is too large (max 10MB)`, 'error');
        return;
      }
      
      if (!VALID_FILE_TYPES.includes(file.type)) {
        UI.showToast(`${file.name} is not a supported format`, 'error');
        return;
      }
      
      state.uploadedFiles.push(file);
    });
    
    UI.renderFileList();
    updateAnalyzeButton();
  }

  function removeFile(index) {
    state.uploadedFiles.splice(index, 1);
    UI.renderFileList();
    updateAnalyzeButton();
  }

  function clearFiles() {
    state.uploadedFiles = [];
    UI.renderFileList();
    updateAnalyzeButton();
    if (dom.fileInput) dom.fileInput.value = '';
    if (dom.textInput) dom.textInput.value = '';
  }

  function updateAnalyzeButton() {
    if (dom.analyzeBtn) {
      dom.analyzeBtn.disabled = state.uploadedFiles.length === 0;
      
      const count = state.uploadedFiles.length;
      dom.analyzeBtn.innerHTML = count > 1 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
           </svg> Analyze ${count} Files`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
           </svg> Analyze`;
    }
  }

  // ============================================
  // ANALYSIS (with Neural Engine Integration)
  // ============================================
  async function runAnalysis(type) {
    const startTime = performance.now();
    const docType = dom.docTypeSelect?.value || 'lab';
    
    try {
      let textContent = '';
      let result = null;
      let source = 'api';
      
      // Get content for analysis
      if (type === 'image' && state.uploadedFiles.length > 0) {
        UI.showProcessing(true, 'Processing image...');
        // For images, we'll check neural cache after OCR extraction
      } else if (type === 'text') {
        textContent = dom.textInput?.value?.trim();
        if (!textContent) {
          UI.showToast('Please enter medical text to analyze', 'error');
          return;
        }
        
        // === NEURAL ENGINE: Try instant match first ===
        if (typeof NeuralEngine !== 'undefined') {
          UI.showProcessing(true, 'Checking pattern cache...');
          const neuralResult = NeuralEngine.query(textContent, docType);
          
          if (neuralResult.match && neuralResult.confidence >= 0.82) {
            // INSTANT RESULT from learned patterns!
            const elapsed = performance.now() - startTime;
            console.log(`[Neural] Cache HIT! Confidence: ${(neuralResult.confidence * 100).toFixed(1)}%, Time: ${elapsed.toFixed(0)}ms`);
            
            result = {
              success: true,
              ...neuralResult.result,
              extractedText: textContent,
              _neural: {
                cached: true,
                confidence: neuralResult.confidence,
                queryTime: neuralResult.queryTime,
                patternAge: neuralResult.patternAge
              }
            };
            source = 'neural';
            
            // Update neural metrics
            state.metrics.cacheHits++;
            updateNeuralStats();
          } else {
            console.log(`[Neural] Cache miss (score: ${neuralResult.bestScore?.toFixed(2) || 'N/A'}), calling API...`);
          }
        }
      } else {
        UI.showToast('No content to analyze', 'error');
        return;
      }
      
      // === API CALL (if no neural match) ===
      if (!result) {
        UI.showProcessing(true, 'Analyzing with Claude AI...');
        
        if (type === 'image') {
          result = await API.uploadAndAnalyze(state.uploadedFiles[0], docType);
          textContent = result?.extractedText || '';
        } else {
          result = await API.analyzeText(textContent, docType);
        }
        
        if (!result?.success) {
          throw new Error(result?.error || 'Analysis failed');
        }
        
        // === NEURAL ENGINE: Learn from this result ===
        if (typeof NeuralEngine !== 'undefined' && textContent) {
          const learned = NeuralEngine.learn(textContent, docType, result);
          if (learned) {
            console.log('[Neural] Learned new pattern');
            state.metrics.patterns++;
          }
          updateNeuralStats();
        }
      }
      
      // === Update metrics ===
      const elapsed = performance.now() - startTime;
      state.metrics.total++;
      state.metrics.totalTime += elapsed;
      Storage.set(STORAGE_KEYS.METRICS, state.metrics);
      UI.updateMetrics();
      
      // === Add to history ===
      const historyItem = {
        id: Utils.generateId(),
        type: type === 'image' ? 'Image Analysis' : 'Text Analysis',
        source: source,
        timestamp: new Date().toISOString(),
        elapsed: elapsed.toFixed(0) + 'ms',
        results: result
      };
      state.analysisHistory.unshift(historyItem);
      state.analysisHistory = state.analysisHistory.slice(0, 20);
      Storage.set(STORAGE_KEYS.HISTORY, state.analysisHistory);
      UI.renderActivityList();
      
      // === Show results ===
      showResults(result);
      
      UI.showProcessing(false);
      
      // Show appropriate toast
      if (source === 'neural') {
        UI.showToast(`⚡ Instant result (${elapsed.toFixed(0)}ms)`, 'success');
      } else {
        UI.showToast(`Analysis complete (${(elapsed/1000).toFixed(1)}s)`, 'success');
      }
      
    } catch (error) {
      console.error('[Analysis] Error:', error);
      UI.showProcessing(false);
      UI.showToast(error.message || 'Analysis failed', 'error');
    }
  }
  
  /**
   * Update neural engine stats display
   */
  function updateNeuralStats() {
    if (typeof NeuralEngine === 'undefined') return;
    
    const stats = NeuralEngine.getStats();
    
    if (dom.metricPatterns) {
      dom.metricPatterns.textContent = stats.patterns;
    }
    if (dom.metricCache) {
      dom.metricCache.textContent = stats.hitRate;
    }
  }
      
    } catch (error) {
      console.error('[Analysis] Error:', error);
      UI.showProcessing(false);
      UI.showToast(error.message || 'Analysis failed', 'error');
    }
  }

  function showResults(results) {
    UI.openModal('results-modal');
    
    // Render detailed view
    if (typeof ClinicalRenderer !== 'undefined') {
      ClinicalRenderer.renderDetailedView(results);
      ClinicalRenderer.renderLabsView(results);
      ClinicalRenderer.renderWardView(results);
    } else {
      // Fallback rendering
      const detailedView = Utils.$('detailed-view');
      if (detailedView) {
        detailedView.innerHTML = `<pre style="white-space: pre-wrap; color: var(--text-secondary);">${JSON.stringify(results, null, 2)}</pre>`;
      }
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================
  function setupEventListeners() {
    // Login
    console.log('[MedWard] Setting up login listeners, loginBtn:', dom.loginBtn, 'usernameInput:', dom.usernameInput);
    
    dom.loginBtn?.addEventListener('click', () => {
      console.log('[MedWard] Login button clicked');
      login(dom.usernameInput?.value);
    });
    dom.usernameInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        console.log('[MedWard] Enter pressed in username input');
        login(dom.usernameInput?.value);
      }
    });
    
    // Logout
    dom.logoutBtn?.addEventListener('click', logout);
    
    // Navigation
    Utils.$$('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const screen = tab.dataset.screen;
        if (screen) UI.showScreen(screen);
        
        // Load patients when switching to patients screen
        if (screen === 'patients' && typeof PatientManager !== 'undefined') {
          PatientManager.load();
        }
      });
    });
    
    // Upload tabs
    Utils.$$('.upload-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        Utils.$$('.upload-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        Utils.$$('.upload-content').forEach(c => c.classList.toggle('active', c.dataset.content === tabName));
      });
    });
    
    // Dropzone
    dom.dropzone?.addEventListener('click', () => dom.fileInput?.click());
    dom.dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dom.dropzone.classList.add('dragover');
    });
    dom.dropzone?.addEventListener('dragleave', () => {
      dom.dropzone.classList.remove('dragover');
    });
    dom.dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dom.dropzone.classList.remove('dragover');
      processFiles(e.dataTransfer.files);
    });
    
    // File input
    dom.fileInput?.addEventListener('change', (e) => processFiles(e.target.files));
    
    // Analyze buttons
    dom.analyzeBtn?.addEventListener('click', () => runAnalysis('image'));
    dom.analyzeTextBtn?.addEventListener('click', () => runAnalysis('text'));
    
    // Results modal
    dom.modalClose?.addEventListener('click', () => UI.closeModal('results-modal'));
    dom.newAnalysisBtn?.addEventListener('click', () => {
      UI.closeModal('results-modal');
      clearFiles();
    });
    dom.resultsModal?.addEventListener('click', (e) => {
      if (e.target === dom.resultsModal) UI.closeModal('results-modal');
    });
    
    // Modal tabs
    Utils.$$('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        Utils.$$('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
        Utils.$$('.modal-view').forEach(v => v.classList.toggle('active', v.id === `${view}-view`));
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        UI.closeModal('results-modal');
        UI.closeModal('patient-modal');
      }
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    // Cache DOM references
    dom = {
      loginScreen: Utils.$('login-screen'),
      dashboardScreen: Utils.$('dashboard-screen'),
      usernameInput: Utils.$('username-input'),
      loginBtn: Utils.$('login-btn'),
      logoutBtn: Utils.$('logout-btn'),
      navUser: Utils.$('nav-user'),
      userInitial: Utils.$('user-initial'),
      userName: Utils.$('user-name'),
      dropzone: Utils.$('dropzone'),
      fileInput: Utils.$('file-input'),
      fileList: Utils.$('file-list'),
      analyzeBtn: Utils.$('analyze-btn'),
      analyzeTextBtn: Utils.$('analyze-text-btn'),
      textInput: Utils.$('text-input'),
      docTypeSelect: Utils.$('doc-type-select'),
      activityList: Utils.$('activity-list'),
      resultsModal: Utils.$('results-modal'),
      modalClose: Utils.$('modal-close'),
      newAnalysisBtn: Utils.$('new-analysis-btn'),
      processingOverlay: Utils.$('processing-overlay'),
      processingText: Utils.$('processing-text'),
      toast: Utils.$('toast'),
      toastMessage: Utils.$('toast-message'),
      metricTotal: Utils.$('metric-total'),
      metricCache: Utils.$('metric-cache'),
      metricSpeed: Utils.$('metric-speed'),
      metricPatterns: Utils.$('metric-patterns'),
      neuralStatus: Utils.$('neural-status')
    };
    
    setupEventListeners();
    
    // Restore session
    const savedUser = Storage.get(STORAGE_KEYS.USER);
    if (savedUser) {
      state.user = savedUser;
      showDashboard();
    }
    
    // Restore metrics
    const savedMetrics = Storage.get(STORAGE_KEYS.METRICS);
    if (savedMetrics) {
      state.metrics = savedMetrics;
      UI.updateMetrics();
    }
    
    // Restore history
    const savedHistory = Storage.get(STORAGE_KEYS.HISTORY);
    if (savedHistory) {
      state.analysisHistory = savedHistory;
      UI.renderActivityList();
    }
    
    // Initialize Neural Engine stats
    if (typeof NeuralEngine !== 'undefined') {
      updateNeuralStats();
      console.log('[MedWard] Neural Engine stats:', NeuralEngine.getStats());
    }
    
    console.log('[MedWard] Initialized v2.0 with Neural Pattern Learning');
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================
  // PUBLIC API
  // ============================================
  return {
    Utils,
    Storage,
    API,
    UI,
    state,
    login,
    logout,
    runAnalysis,
    showResults,
    clearFiles
  };
})();

// Export for modules
if (typeof window !== 'undefined') window.MedWard = MedWard;
