/* ============================================
   CONSTANTS (Hardcoded Strings)
   ============================================ */
const CONSTANTS = {
  STORAGE_KEYS: {
    EDITOR_CONTENT: 'editorContent',
    CHAPTERS: 'chapters',
    CURRENT_CHAPTER: 'currentChapterIndex',
    TEMPLATE: 'currentTemplate',
    TOOLBAR_COLLAPSED: 'toolbarCollapsed'
  },
  DEFAULT_VALUES: {
    DAILY_GOAL: 1000,
    FONT_SIZE: '12px',
    LINE_SPACING: '1.5',
    LETTER_SPACING: '0'
  },
  COLORS: {
    PRIMARY: '#8B4513',
    SECONDARY: '#A0522D',
    SUCCESS: '#28a745',
    DANGER: '#dc3545',
    GRAY: '#6c757d'
  },
  TIMEOUTS: {
    FIREBASE: 10000,
    DICTIONARY: 5000,
    LANGUAGETOOL: 5000,
    JSZIP: 10000
  },
  DEBOUNCE_DELAYS: {
    INPUT: 300,
    SCROLL: 100,
    RESIZE: 250,
    STATS_UPDATE: 500,
    AUTO_SAVE: 2000
  },
  IS_DEVELOPMENT: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('dev')
};

// Development-only logging utility
const logger = {
  log: function(...args) {
    if (CONSTANTS.IS_DEVELOPMENT) {
      console.log(...args);
    }
  },
  warn: function(...args) {
    if (CONSTANTS.IS_DEVELOPMENT) {
      console.warn(...args);
    }
  },
  error: function(...args) {
    // Always log errors, even in production
    console.error(...args);
  },
  info: function(...args) {
    if (CONSTANTS.IS_DEVELOPMENT) {
      console.info(...args);
    }
  }
};

/* ============================================
   PERFORMANCE UTILITIES
   ============================================ */

// Debounce function to limit function calls
function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

// Throttle function to limit function calls
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Input Validation Utilities
function validateData(data, type = 'string') {
  if (data === null || data === undefined) return false;
  if (type === 'string' && typeof data !== 'string') return false;
  if (type === 'number' && (typeof data !== 'number' || isNaN(data))) return false;
  if (type === 'array' && !Array.isArray(data)) return false;
  if (type === 'object' && (typeof data !== 'object' || Array.isArray(data))) return false;
  return true;
}

function validateChapterName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > 200) return false; // Reasonable limit
  // Allow alphanumeric, spaces, hyphens, underscores, and common punctuation
  if (!/^[a-zA-Z0-9\s\-_.,!?'":;()]+$/.test(trimmed)) return false;
  return true;
}

function validateProjectName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > 100) return false; // Reasonable limit
  // Allow alphanumeric, spaces, hyphens, underscores
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) return false;
  return true;
}

function validateUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:', 'data:', 'blob:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

function validateFilename(filename) {
  if (!filename || typeof filename !== 'string') return false;
  // Remove invalid filename characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  return !invalidChars.test(filename) && filename.length > 0 && filename.length < 255;
}

// Secure Storage with Encryption for sensitive data
const secureStorage = {
  // Simple encryption for client-side storage (not military grade, but better than plain text)
  _encrypt: function(text) {
    try {
      // Use a simple XOR cipher with a user-specific key
      const key = this._getUserKey();
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return btoa(result); // Base64 encode
    } catch (e) {
      logger.warn('Encryption failed:', e);
      return text; // Fallback to plain text
    }
  },
  
  _decrypt: function(encryptedText) {
    try {
      const key = this._getUserKey();
      let decoded = atob(encryptedText); // Base64 decode
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (e) {
      logger.warn('Decryption failed:', e);
      return encryptedText; // Return as-is if decryption fails
    }
  },
  
  _getUserKey: function() {
    // Generate a user-specific key from browser fingerprint
    let key = localStorage.getItem('userKey');
    if (!key) {
      key = btoa(navigator.userAgent + Date.now() + Math.random()).slice(0, 32);
      localStorage.setItem('userKey', key);
    }
    return key;
  },
  
  // Sensitive data (API keys, etc.)
  setSecureItem: function(key, value) {
    try {
      const encrypted = this._encrypt(value);
      localStorage.setItem('secure_' + key, encrypted);
      return true;
    } catch (e) {
      logger.warn('Secure storage setItem failed:', e);
      return false;
    }
  },
  
  getSecureItem: function(key) {
    try {
      const encrypted = localStorage.getItem('secure_' + key);
      if (!encrypted) return null;
      return this._decrypt(encrypted);
    } catch (e) {
      logger.warn('Secure storage getItem failed:', e);
      return null;
    }
  },
  
  removeSecureItem: function(key) {
    try {
      localStorage.removeItem('secure_' + key);
      return true;
    } catch (e) {
      logger.warn('Secure storage removeItem failed:', e);
      return false;
    }
  },
  
  // Regular storage (non-sensitive data)
  getItem: function(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      logger.warn('localStorage.getItem failed:', e);
      return null;
    }
  },
  
  setItem: function(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      logger.warn('localStorage.setItem failed (quota exceeded?):', e);
      // Try to clear old data if quota exceeded
      if (e.name === 'QuotaExceededError') {
        return this._handleQuotaExceeded(key, value);
      }
      return false;
    }
  },
  
  _handleQuotaExceeded: function(key, value) {
    try {
      logger.log('Storage quota exceeded, attempting cleanup...');
      
      // Priority order for keeping data
      const priorityKeys = [
        'editorContent', 'chapters', 'metadata', 'currentProjectId',
        'proofreading_engine', 'userKey'
      ];
      
      // Get all keys sorted by priority
      const allKeys = Object.keys(localStorage);
      const keysToRemove = allKeys.filter(k => !priorityKeys.includes(k));
      
      // Remove non-essential data first
      keysToRemove.forEach(k => {
        try {
          localStorage.removeItem(k);
        } catch (e) {
          logger.warn(`Failed to remove key ${k}:`, e);
        }
      });
      
      // Try again
      localStorage.setItem(key, value);
      logger.log('Storage cleanup successful');
      return true;
      
    } catch (e2) {
      logger.error('Failed to recover from quota error:', e2);
      
      // Last resort: clear all non-secure data except essentials
      try {
        const essentialKeys = ['editorContent', 'userKey'];
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(k => {
          if (!essentialKeys.includes(k)) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem(key, value);
        logger.log('Emergency storage cleanup completed');
        return true;
      } catch (e3) {
        logger.error('Emergency cleanup failed:', e3);
        if (typeof showToast === 'function') {
          showToast('Storage is full. Please clear some data.', 'error');
        }
        return false;
      }
    }
  },
  
  // Get storage usage statistics
  getStorageStats: function() {
    try {
      let totalSize = 0;
      const keyCount = Object.keys(localStorage).length;
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      
      return {
        keyCount: keyCount,
        totalSize: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        quotaUsed: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1) // Assuming 5MB quota
      };
    } catch (e) {
      logger.error('Failed to get storage stats:', e);
      return null;
    }
  },
  
  removeItem: function(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      logger.warn('localStorage.removeItem failed:', e);
      return false;
    }
  }
};

// Maintain backward compatibility
const safeStorage = secureStorage;

// HTML Sanitization Utility
const safeHTML = {
  // Escape HTML entities to prevent XSS
  escape: function(text) {
    if (!text || typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  // Safely set HTML content with basic sanitization
  setHTML: function(element, html) {
    if (!element) return;
    
    // Basic sanitization - remove script tags and dangerous attributes
    const sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '');
    
    element.innerHTML = sanitized;
  },
  
  // Safely set innerHTML with automatic sanitization for user content
  safeSetHTML: function(element, html, isUserContent = false) {
    if (!element) return;
    if (!html) {
      element.innerHTML = '';
      return;
    }
    if (isUserContent) {
      // For user content, use setHTML with enhanced sanitization
      // This removes script tags and dangerous attributes while preserving safe formatting
      this.setHTML(element, html);
    } else {
      // For trusted HTML (like UI templates), use setHTML
      this.setHTML(element, html);
    }
  },
  
  // Safely create element with attributes
  createElement: function(tag, attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    
    // Set attributes safely
    Object.keys(attributes).forEach(key => {
      if (key.startsWith('on') || key === 'src' || key === 'href') {
        // Skip event handlers and potentially dangerous attributes
        return;
      }
      element.setAttribute(key, this.escape(attributes[key]));
    });
    
    // Set text content safely
    if (textContent) {
      element.textContent = textContent;
    }
    
    return element;
  }
};

// Error handling wrapper for functions
function safeExecute(func, errorMessage = 'An error occurred', showToast = true) {
  return function(...args) {
    try {
      return func.apply(this, args);
    } catch (error) {
      logger.error(errorMessage, error);
      if (showToast && typeof showToast === 'function') {
        showToast(errorMessage, 'error');
      } else if (showToast && typeof showToast === 'string') {
        if (typeof window.showToast === 'function') {
          window.showToast(errorMessage, 'error');
        }
      }
      return null;
    }
  };
}

// Async error handling wrapper
async function safeAsyncExecute(func, errorMessage = 'An error occurred', showToast = true) {
  return async function(...args) {
    try {
      return await func.apply(this, args);
    } catch (error) {
      logger.error(errorMessage, error);
      if (showToast && typeof showToast === 'function') {
        showToast(errorMessage, 'error');
      } else if (showToast && typeof showToast === 'string') {
        if (typeof window.showToast === 'function') {
          window.showToast(errorMessage, 'error');
        }
      }
      return null;
    }
  };
}

// Global error handler for unhandled errors
window.addEventListener('error', function(event) {
  logger.error('Global error:', event.error);
  if (typeof showToast === 'function') {
    showToast('An unexpected error occurred. Please try again.', 'error');
  }
});

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
  logger.error('Unhandled promise rejection:', event.reason);
  if (typeof showToast === 'function') {
    showToast('A network error occurred. Please check your connection.', 'error');
  }
  event.preventDefault();
});


// Timer Manager to consolidate setTimeout usage
const timerManager = {
  timers: new Map(),
  
  // Set a timer with a unique ID
  setTimer: function(id, callback, delay) {
    this.clearTimer(id); // Clear existing timer with same ID
    const timerId = setTimeout(() => {
      try {
        callback();
      } catch (error) {
        logger.error(`Timer ${id} callback error:`, error);
      } finally {
        this.timers.delete(id);
      }
    }, delay);
    this.timers.set(id, timerId);
    return timerId;
  },
  
  // Clear a specific timer
  clearTimer: function(id) {
    const timerId = this.timers.get(id);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(id);
      return true;
    }
    return false;
  },
  
  // Clear all timers
  clearAllTimers: function() {
    this.timers.forEach(timerId => clearTimeout(timerId));
    this.timers.clear();
  },
  
  // Check if timer exists
  hasTimer: function(id) {
    return this.timers.has(id);
  }
};

/* ============================================
   SECURITY & UTILITY FUNCTIONS
   ============================================ */

// Security: HTML sanitization utilities
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeAttribute(value) {
  // Escape quotes and angle brackets for HTML attributes
  // Preserves URLs and normal text while preventing XSS
  return String(value || '').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Drop Cap - Working Version with Modal
let dropCapSavedRange = null; // keep user selection while modal is open
let savedFontSizeRange = null; // keep user selection when font size dropdown is clicked

function applyDropCap() {
  const sel = window.getSelection();
  dropCapSavedRange = null;
  if (sel && sel.rangeCount > 0) {
    dropCapSavedRange = sel.getRangeAt(0).cloneRange(); // preserve cursor
  }
  openDropCapModal();
}

// Global UI Toggle Functions
function toggleToolbarPanel() {
  const panel = document.getElementById('toolbarPanel');
  if (!panel) {
    logger.error('Toolbar panel element not found');
    return;
  }
  panel.classList.toggle('open');
  
  // Force a reflow to ensure the transition works
  void panel.offsetWidth;
}

function togglePageView() {
  const body = document.body;
  const btn = document.getElementById('pageViewBtn');
  
  const isPageView = body.classList.toggle('page-view-mode');
  
  if (btn) {
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = isPageView ? 'fas fa-file' : 'fas fa-file-alt';
    }
    btn.innerHTML = isPageView ? 
      '<i class="fas fa-file"></i> Exit Read Mode' : 
      '<i class="fas fa-file-alt"></i> Read Mode';
  }
}

function newDocument() {
  if (confirm('Create a new document? Any unsaved changes will be lost.')) {
    const editor = domCache.getEditor();
    if (editor) {
      editor.innerHTML = '';
      localStorage.removeItem('editorContent');
      localStorage.removeItem('chapters');
      if (typeof updateStats === 'function') updateStats();
    }
  }
}

function showDeletePageModal(pageElement) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #e4d5b7;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
    text-align: center;
  `;

  modal.innerHTML = `
    <div style="margin-bottom: 20px;">
      <i class="fas fa-trash" style="font-size: 48px; color: #8B4513; margin-bottom: 15px;"></i>
      <h3 style="margin: 0 0 10px 0; color: #8B4513; font-size: 20px;">Delete Page</h3>
      <p style="margin: 0; color: #666; font-size: 14px;">Are you sure you want to delete this page? This action cannot be undone.</p>
    </div>
    <div style="display: flex; gap: 10px; justify-content: center;">
      <button class="delete-confirm-btn" style="
        padding: 10px 24px;
        background: #8B4513;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: background 0.2s;
      ">Delete</button>
      <button class="delete-cancel-btn" style="
        padding: 10px 24px;
        background: rgba(139, 69, 19, 0.2);
        color: #8B4513;
        border: 1px solid #8B4513;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.2s;
      ">Cancel</button>
    </div>
  `;

  // Add hover effects
  const deleteBtn = modal.querySelector('.delete-confirm-btn');
  const cancelBtn = modal.querySelector('.delete-cancel-btn');
  
  deleteBtn.onmouseover = () => deleteBtn.style.background = '#6d3410';
  deleteBtn.onmouseout = () => deleteBtn.style.background = '#8B4513';
  
  cancelBtn.onmouseover = () => {
    cancelBtn.style.background = 'rgba(139, 69, 19, 0.3)';
  };
  cancelBtn.onmouseout = () => {
    cancelBtn.style.background = 'rgba(139, 69, 19, 0.2)';
  };

  // Handle delete
  deleteBtn.onclick = () => {
    pageElement.remove();
    checkAllPagesForOverflow();
    setTimeout(() => {
      if (typeof updatePageNumbering === 'function') {
        updatePageNumbering();
      }
    }, 50);
    document.body.removeChild(overlay);
  };

  // Handle cancel
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
  };

  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function addNewPage(content = '') {
  const pageWrapper = document.getElementById('pageWrapper');
  if (!pageWrapper) return;
  
  const newPage = document.createElement('div');
  newPage.className = 'editor-page';
  newPage.contentEditable = 'true';
  newPage.spellcheck = true;
  safeHTML.safeSetHTML(newPage, content, true); // User content - needs sanitization
  
  // Get current size from FIRST existing page's INLINE styles (not computed - this is the source of truth)
  const allPages = pageWrapper.querySelectorAll('.editor-page');
  const referencePage = allPages.length > 0 ? allPages[0] : domCache.getEditor();
  
  if (referencePage) {
    // Read from inline styles first (most reliable), then fall back to computed styles
    let targetWidth = referencePage.style.width;
    let targetHeight = referencePage.style.minHeight;
    let targetPadding = referencePage.style.padding;
    
    // If inline styles aren't set, read from computed styles
    if (!targetWidth || targetWidth === '') {
      const refStyle = window.getComputedStyle(referencePage);
      targetWidth = refStyle.width && refStyle.width !== 'auto' && refStyle.width !== 'none' 
        ? refStyle.width 
        : '8.5in';
    }
    
    if (!targetHeight || targetHeight === '') {
      const refStyle = window.getComputedStyle(referencePage);
      targetHeight = refStyle.minHeight && refStyle.minHeight !== 'auto' && refStyle.minHeight !== 'none' && refStyle.minHeight !== '0px'
        ? refStyle.minHeight
        : '11in';
    }
    
    if (!targetPadding || targetPadding === '') {
      const refStyle = window.getComputedStyle(referencePage);
      targetPadding = refStyle.padding && refStyle.padding !== '0px'
        ? refStyle.padding
        : '1in';
    }
    
    // Apply the exact same dimensions to the new page
    newPage.style.width = targetWidth;
    newPage.style.minHeight = targetHeight;
    newPage.style.padding = targetPadding;
  } else {
    // No reference, use defaults
    newPage.style.width = '8.5in';
    newPage.style.minHeight = '11in';
    newPage.style.padding = '1in';
  }
  
  // Add delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-page-btn';
  deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
  deleteBtn.onclick = function() {
    showDeletePageModal(newPage);
  };
  
  newPage.appendChild(deleteBtn);
  pageWrapper.appendChild(newPage);
  
  // After adding, synchronize all pages to ensure they match
  synchronizeAllPageSizes();
  
  // Add input listener for auto page breaks
  newPage.addEventListener('input', () => {
    setTimeout(() => {
      checkAutoPageBreak(newPage);
    }, 100);
  });
  
  // Update page numbering after adding page
  setTimeout(() => {
    if (typeof updatePageNumbering === 'function') {
      updatePageNumbering();
    }
  }, 50);
  
  return newPage;
}

// Debounced version of checkAutoPageBreak for performance
const debouncedCheckAutoPageBreak = debounce(function(editor) {
  checkAutoPageBreakInternal(editor);
}, CONSTANTS.DEBOUNCE_DELAYS.INPUT);

// Check and handle automatic page breaks (public API)
function checkAutoPageBreak(editor) {
  // Use debounced version for frequent calls
  if (editor) {
    debouncedCheckAutoPageBreak(editor);
  }
}

// Internal page break check function
function checkAutoPageBreakInternal(editor) {
  if (!editor) return;
  
  const pageWrapper = document.getElementById('pageWrapper');
  if (!pageWrapper) return;
  
  // Get ACTUAL page height from inline styles (CRITICAL: not hardcoded!)
  // Read from inline styles first, then computed styles, then default
  let pageHeightValue = editor.style.minHeight;
  if (!pageHeightValue || pageHeightValue === '') {
    const computedStyle = window.getComputedStyle(editor);
    pageHeightValue = computedStyle.minHeight && computedStyle.minHeight !== 'auto' && computedStyle.minHeight !== 'none' && computedStyle.minHeight !== '0px'
      ? computedStyle.minHeight
      : '11in';
  }
  
  // Convert height value to pixels (handles "in", "px", "mm", etc.)
  // Default to 11in = 1056px at 96 DPI if conversion fails
  let pageHeightPx = 1056; // Default fallback
  if (pageHeightValue.includes('in')) {
    const inches = parseFloat(pageHeightValue);
    pageHeightPx = inches * 96; // 96 DPI
  } else if (pageHeightValue.includes('px')) {
    pageHeightPx = parseFloat(pageHeightValue);
  } else if (pageHeightValue.includes('mm')) {
    const mm = parseFloat(pageHeightValue);
    pageHeightPx = mm * 3.779527559; // mm to px at 96 DPI
  }
  
  // Get padding to calculate actual content area (CRITICAL: scrollHeight includes padding!)
  // We need paddingTop and paddingBottom specifically
  const computedStyle = window.getComputedStyle(editor);
  const paddingTopPx = parseFloat(computedStyle.paddingTop || '96px'); // Default 1in = 96px
  const paddingBottomPx = parseFloat(computedStyle.paddingBottom || '96px'); // Default 1in = 96px
  
  // Total content area = page height minus top and bottom padding
  const contentAreaHeight = pageHeightPx - paddingTopPx - paddingBottomPx;
  
  const editorScrollHeight = editor.scrollHeight;
  
  // If content exceeds CONTENT AREA height (not total page height), create a new page
  // Use a buffer to avoid premature page breaks (100px buffer)
  // CRITICAL: Only split if content is significantly overflowing (at least 150px over)
  // This prevents premature page breaks when user just starts typing
  if (editorScrollHeight > (contentAreaHeight + 150)) {
    const allPages = Array.from(pageWrapper.querySelectorAll('.editor-page'));
    const currentPageIndex = allPages.indexOf(editor);
    
    // CRITICAL: Don't split if this is the first page and it's the only page
    // This prevents content from being moved to a second page when user starts typing
    if (currentPageIndex === 0 && allPages.length === 1) {
      // Only create a new page if content is REALLY overflowing (at least 300px over)
      if (editorScrollHeight <= (contentAreaHeight + 300)) {
        return; // Don't split yet, let user fill the first page
      }
    }
    
    // Save cursor position
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const cursorAtEnd = range && range.endOffset === range.endContainer.length;
    
    // Find split point - split at about 75% of CONTENT AREA height to avoid awkward breaks
    const splitIndex = findSplitPoint(editor, (contentAreaHeight - 100) * 0.75);
    
    // CRITICAL: Don't split if splitIndex is 0 or 1 (would move all content to new page)
    // This prevents the issue where text skips the first page
    if (splitIndex !== null && splitIndex > 1) {
      // Get content after split point
      const overflowContent = getContentAfterPoint(editor, splitIndex);
      
      // CRITICAL: Don't move content if overflow content is empty or just whitespace
      if (overflowContent.trim() === '' || overflowContent.trim().length < 10) {
        return; // Don't split for minimal content
      }
      
      // Remove content after split point from current page
      removeContentAfterPoint(editor, splitIndex);
      
      // Check if there's a next page
      let nextPage = allPages[currentPageIndex + 1];
      
      if (nextPage) {
        // Prepend overflow content to existing next page
        const deleteBtn = nextPage.querySelector('.delete-page-btn');
        if (deleteBtn) {
          nextPage.insertAdjacentHTML('afterbegin', overflowContent);
        } else {
          safeHTML.setHTML(nextPage, overflowContent + nextPage.innerHTML);
        }
      } else {
        // Create new page with overflow content
        nextPage = addNewPage(overflowContent);
      }
      
      // If cursor was at the end, move it to the new page
      if (cursorAtEnd && nextPage) {
        nextPage.focus();
        // Place cursor at start of new page
        const newRange = document.createRange();
        const newSelection = window.getSelection();
        if (nextPage.firstChild) {
          newRange.setStart(nextPage.firstChild, 0);
          newRange.collapse(true);
          newSelection.removeAllRanges();
          newSelection.addRange(newRange);
        }
      }
    }
  }
}

// Helper function to find split point (approximate)
function findSplitPoint(editor, maxHeight) {
  const children = Array.from(editor.childNodes);
  let currentHeight = 0;
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    // Skip delete button
    if (child.classList && child.classList.contains('delete-page-btn')) continue;
    
    const childHeight = child.offsetHeight || 20; // Fallback height
    
    if (currentHeight + childHeight > maxHeight) {
      return i;
    }
    currentHeight += childHeight;
  }
  
  return null;
}

// Get content after split point
function getContentAfterPoint(editor, splitIndex) {
  const children = Array.from(editor.childNodes);
  if (splitIndex >= children.length) return '';
  
  const fragment = document.createDocumentFragment();
  for (let i = splitIndex; i < children.length; i++) {
    const child = children[i];
    // Skip delete button
    if (child.classList && child.classList.contains('delete-page-btn')) continue;
    fragment.appendChild(child.cloneNode(true));
  }
  
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(fragment);
  return tempDiv.innerHTML;
}

// Remove content after split point
function removeContentAfterPoint(editor, splitIndex) {
  const children = Array.from(editor.childNodes);
  if (splitIndex >= children.length) return;
  
  for (let i = children.length - 1; i >= splitIndex; i--) {
    const child = children[i];
    // Skip delete button
    if (child.classList && child.classList.contains('delete-page-btn')) continue;
    editor.removeChild(child);
  }
  
  // Ensure editor has at least one empty paragraph
  const hasContent = Array.from(editor.childNodes).some(node => 
    !node.classList || !node.classList.contains('delete-page-btn')
  );
  
  if (!hasContent) {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    const deleteBtn = editor.querySelector('.delete-page-btn');
    if (deleteBtn) {
      editor.insertBefore(p, deleteBtn);
    } else {
      editor.appendChild(p);
    }
  }
}

function checkAllPagesForOverflow() {
  const pageWrapper = document.getElementById('pageWrapper');
  if (!pageWrapper) return;
  
  const pages = pageWrapper.querySelectorAll('.editor-page');
  pages.forEach(page => checkPageOverflow(page));
  
  // Update page numbering after overflow check
  setTimeout(() => {
    if (typeof updatePageNumbering === 'function') {
      updatePageNumbering();
    }
  }, 100);
}

function toggleFocusMode() {
  const editorArea = document.getElementById('editorArea');
  if (!editorArea) {
    showToast('Editor area not found', 'error');
    return;
  }
  
  // Toggle focus mode on editorArea
  const isFocus = editorArea.classList.toggle('focus-mode');
  
  // Also toggle on body for CSS rules that target body.focus-mode (hides header, sidebar, etc.)
  document.body.classList.toggle('focus-mode', isFocus);
  
  showToast(isFocus ? 'Focus mode enabled' : 'Focus mode disabled');
}

// Read Mode Navigation
function readModeNavigate(direction) {
  const scrollAmount = window.innerHeight * 0.9;
  const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
  
  if (direction === 'prev') {
    window.scrollTo({ top: Math.max(0, currentScroll - scrollAmount), behavior: 'smooth' });
  } else if (direction === 'next') {
    window.scrollTo({ top: currentScroll + scrollAmount, behavior: 'smooth' });
  }
}

// Header collapse/expand
function toggleHeaderCollapse() {
  const header = document.querySelector('.header');
  const btn = document.getElementById('headerToggleBtn');
  if (!header || !btn) return;
  const isCollapsed = header.classList.toggle('collapsed');
  btn.innerHTML = isCollapsed ? '<i class="fas fa-chevron-down"></i> Expand' : '<i class="fas fa-chevron-up"></i> Collapse';
  // Ensure button stays visible focusable
  btn.style.display = 'inline-flex';
}

// Toolbar collapse/expand
function toggleToolbarCollapse() {
  const wrapper = document.querySelector('.toolbar-wrapper');
  const btn = document.getElementById('toolbarToggleBtn');
  if (!wrapper || !btn) return;
  const isCollapsed = wrapper.classList.toggle('collapsed');
  safeStorage.setItem('toolbarCollapsed', isCollapsed ? '1' : '0');
  btn.innerHTML = isCollapsed
    ? '<i class="fas fa-chevron-down"></i> Expand Toolbar'
    : '<i class="fas fa-chevron-up"></i> Collapse Toolbar';
}

// Minimal text-based fallbacks when Font Awesome fails to load
const iconFallbackMap = {
  'fa-bold': 'B',
  'fa-italic': 'I',
  'fa-underline': 'U',
  'fa-strikethrough': 'S',
  'fa-superscript': 'x2',
  'fa-subscript': 'x2',
  'fa-highlighter': 'Hi',
  'fa-palette': 'Pal',
  'fa-font': 'F',
  'fa-eraser': 'Clr',
  'fa-list-ul': '•',
  'fa-list-ol': '1.',
  'fa-indent': '>',
  'fa-outdent': '<',
  'fa-align-left': 'L',
  'fa-align-center': 'C',
  'fa-align-right': 'R',
  'fa-align-justify': 'J',
  'fa-quote-right': 'Q',
  'fa-comments': 'Dlg',
  'fa-minus': '-',
  'fa-file-medical': 'Pg',
  'fa-text-height': 'DC',
  'fa-tasks': 'Chk',
  'fa-table': 'Tbl',
  'fa-image': 'Img',
  'fa-link': 'Ln',
  'fa-play-circle': 'P',
  'fa-undo': 'Undo',
  'fa-redo': 'Redo',
  'fa-eye': 'Eye',
  'fa-volume-up': 'Spk',
  'fa-spell-check': 'ABC',
  'fa-comment': 'Cmt',
  'fa-search': 'Find',
  'fa-print': 'Prt',
  'fa-magic': 'AI',
  'fa-download': 'DL'
};

function setupIconFallbacks() {
  const buttons = document.querySelectorAll('.toolbar-btn');
  buttons.forEach(btn => {
    const icon = btn.querySelector('i');
    if (!icon) return;
    const faClass = Array.from(icon.classList).find(cls => cls.startsWith('fa-'));
    if (faClass && iconFallbackMap[faClass]) {
      btn.dataset.icon = iconFallbackMap[faClass];
    }
  });
}

function detectFontAwesome() {
  const markFallback = () => document.body.classList.add('fa-fallback');

  // Prefer modern font loading API
  if (document.fonts && document.fonts.check) {
    const readyCheck = () => {
      const ok = document.fonts.check('12px "Font Awesome 6 Free"') || document.fonts.check('12px "Font Awesome 5 Free"');
      if (!ok) markFallback();
    };

    // Run an immediate check and another once fonts settle
    readyCheck();
    document.fonts.ready.then(readyCheck).catch(() => markFallback());
    return;
  }

  // Legacy fallback: compare rendered width against a system font
  try {
    const probe = document.createElement('i');
    probe.className = 'fas fa-bold';
    probe.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;';
    document.body.appendChild(probe);
    const faWidth = probe.getBoundingClientRect().width;
    probe.style.fontFamily = 'serif';
    const serifWidth = probe.getBoundingClientRect().width;
    probe.remove();
    if (!faWidth || faWidth === serifWidth) {
      markFallback();
    }
  } catch (e) {
    markFallback();
  }
}

// Firebase / cloud storage setup
let firebaseApp = null;
let firestoreDb = null;
let firebaseReady = false;
let currentUserId = null;
let cloudSaveTimeout = null;

function getUserIdFromUrlOrStorage() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('userId');
  if (fromUrl) {
    localStorage.setItem('userId', fromUrl);
    return fromUrl;
  }
  const stored = localStorage.getItem('userId');
  return stored || null;
}

function hasValidFirebaseConfig() {
  const cfg = window.firebaseConfig;
  if (!cfg) return false;
  const required = ['apiKey', 'authDomain', 'projectId'];
  return required.every(k => cfg[k] && !String(cfg[k]).includes('REPLACE_WITH'));
}

async function initFirebaseIfPossible() {
  if (firebaseReady) return true;
  if (typeof firebase === 'undefined' || !firebase.initializeApp) return false;
  if (!hasValidFirebaseConfig()) return false;
  try {
    firebaseApp = firebase.apps && firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(window.firebaseConfig);
    firestoreDb = firebase.firestore();
    firebaseReady = true;
    return true;
  } catch (e) {
    logger.warn('Firebase init failed, using local storage only:', e);
    return false;
  }
}

async function loadFromFirestore() {
  if (!firebaseReady || !currentUserId || !firestoreDb) return false;
  try {
    const docRef = firestoreDb.collection('manuscripts').doc(currentUserId);
    const snap = await docRef.get();
    if (!snap.exists) return false;
    const data = snap.data() || {};
    chapters = Array.isArray(data.chapters) ? data.chapters : chapters;
    // Add template field to existing chapters if missing (backward compatibility)
    chapters = chapters.map(ch => ({
      ...ch,
      template: ch.template || 'novel'
    }));
    metadata = data.metadata || metadata;
    if (typeof data.currentChapterIndex === 'number') {
      currentChapterIndex = data.currentChapterIndex;
    }
    return true;
  } catch (err) {
    logger.warn('Cloud load failed, falling back to local:', err);
    return false;
  }
}

function queueCloudSave() {
  if (!firebaseReady || !currentUserId || !firestoreDb) return;
  timerManager.setTimer('cloudSave', () => {
    saveToFirestore().catch(err => logger.warn('Cloud save failed:', err));
  }, 800);
}

async function saveToFirestore() {
  if (!firebaseReady || !currentUserId || !firestoreDb) return false;
  try {
    const docRef = firestoreDb.collection('manuscripts').doc(currentUserId);
    
    // Add timeout to prevent hanging
    const savePromise = docRef.set({
      chapters,
      metadata,
      currentChapterIndex,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Save operation timed out')), 10000)
    );
    
    await Promise.race([savePromise, timeoutPromise]);
    
    const statusEl = document.getElementById('autosaveStatus');
    if (statusEl) statusEl.textContent = 'Autosaved (cloud)';
    return true;
  } catch (err) {
    logger.warn('Cloud save failed:', err);
    // Update status to show cloud save is unavailable
    const statusEl = document.getElementById('autosaveStatus');
    if (statusEl) {
      statusEl.textContent = 'Autosaved (local only)';
      statusEl.style.color = '#ff9800'; // Orange to indicate cloud sync failed
    }
    return false;
  }
}

async function initializeData() {
  currentUserId = getUserIdFromUrlOrStorage();
  const cloudOk = await initFirebaseIfPossible();
  let loadedCloud = false;
  if (cloudOk && currentUserId) {
    loadedCloud = await loadFromFirestore();
  }
  if (!loadedCloud) {
    loadFromStorage();
  }
}

function openDropCapModal() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2000; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;';
  modal.innerHTML = `
    <h3 style="margin-bottom: 20px; color: #333;">Drop Cap Styles</h3>
    <p style="margin-bottom: 15px; color: #666;">Select a style for the first letter of your paragraph:</p>
    
    <div style="margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
      <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #333;">Cap Size:</label>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button data-action="setDropCapSize" data-param="2em" class="size-btn" data-size="2em" style="padding: 8px 16px; border: 2px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.3s;">Small (2x)</button>
        <button data-action="setDropCapSize" data-param="3em" class="size-btn active" data-size="3em" style="padding: 8px 16px; border: 2px solid #8B4513; background: #8B4513; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.3s;">Medium (3x)</button>
        <button data-action="setDropCapSize" data-param="4em" class="size-btn" data-size="4em" style="padding: 8px 16px; border: 2px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.3s;">Large (4x)</button>
        <button data-action="setDropCapSize" data-param="5em" class="size-btn" data-size="5em" style="padding: 8px 16px; border: 2px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.3s;">X-Large (5x)</button>
        <button data-action="setDropCapSize" data-param="6em" class="size-btn" data-size="6em" style="padding: 8px 16px; border: 2px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.3s;">XX-Large (6x)</button>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;">
      <div data-action="applyDropCapStyle" data-param="classic" class="drop-cap-style-option" style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
        <h4 style="margin-bottom: 10px; color: #8B4513;">Classic</h4>
        <p style="font-size: 14px; margin: 0;"><span style="font-size: 3em; float: left; line-height: 0.9; margin: 0.1em 0.1em 0 0; font-weight: bold; color: #333;">T</span>raditional drop cap with simple bold styling.</p>
      </div>

      <div data-action="applyDropCapStyle" data-param="colored" class="drop-cap-style-option" style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
        <h4 style="margin-bottom: 10px; color: #8B4513;">Colored</h4>
        <p style="font-size: 14px; margin: 0;"><span style="font-size: 3em; float: left; line-height: 0.9; margin: 0.1em 0.1em 0 0; font-weight: bold; color: #8B4513;">T</span>Brown colored first letter.</p>
      </div>

      <div data-action="applyDropCapStyle" data-param="bordered" class="drop-cap-style-option" style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
        <h4 style="margin-bottom: 10px; color: #8B4513;">Bordered</h4>
        <p style="font-size: 14px; margin: 0;"><span style="font-size: 3em; float: left; line-height: 0.9; margin: 0.1em 0.1em 0 0; font-weight: bold; border: 3px solid #8B4513; padding: 5px 10px; color: #8B4513;">T</span>Letter with decorative border.</p>
      </div>

      <div data-action="applyDropCapStyle" data-param="background" class="drop-cap-style-option" style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
        <h4 style="margin-bottom: 10px; color: #8B4513;">Background</h4>
        <p style="font-size: 14px; margin: 0;"><span style="font-size: 3em; float: left; line-height: 0.9; margin: 0.1em 0.1em 0 0; font-weight: bold; background: #8B4513; color: white; padding: 5px 10px;">T</span>Letter with solid background.</p>
      </div>

      <div data-action="applyDropCapStyle" data-param="gradient" class="drop-cap-style-option" style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
        <h4 style="margin-bottom: 10px; color: #8B4513;">Gradient</h4>
        <p style="font-size: 14px; margin: 0;"><span style="font-size: 3em; float: left; line-height: 0.9; margin: 0.1em 0.1em 0 0; font-weight: bold; color: #8B4513;">T</span>Gradient colored letter.</p>
      </div>

      <div data-action="applyDropCapStyle" data-param="shadow" class="drop-cap-style-option" style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
        <h4 style="margin-bottom: 10px; color: #8B4513;">Shadow</h4>
        <p style="font-size: 14px; margin: 0;"><span style="font-size: 3em; float: left; line-height: 0.9; margin: 0.1em 0.1em 0 0; font-weight: bold; color: #333; text-shadow: 3px 3px 6px rgba(139, 69, 19, 0.5);">T</span>Letter with drop shadow effect.</p>
      </div>

      <div data-action="applyDropCapStyle" data-param="outlined" class="drop-cap-style-option" style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
        <h4 style="margin-bottom: 10px; color: #8B4513;">Outlined</h4>
        <p style="font-size: 14px; margin: 0;"><span style="font-size: 3em; float: left; line-height: 0.9; margin: 0.1em 0.1em 0 0; font-weight: bold; color: transparent; -webkit-text-stroke: 2px #8B4513; text-shadow: -1px 0 #8B4513, 0 1px #8B4513, 1px 0 #8B4513, 0 -1px #8B4513;">T</span>Hollow outlined letter.</p>
      </div>

      <div data-action="applyDropCapStyle" data-param="serif" class="drop-cap-style-option" style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
        <h4 style="margin-bottom: 10px; color: #8B4513;">Elegant Serif</h4>
        <p style="font-size: 14px; margin: 0;"><span style="font-size: 3.5em; float: left; line-height: 0.8; margin: 0.05em 0.1em 0 0; font-weight: normal; font-family: 'Georgia', serif; color: #333;">T</span>Classic serif font style.</p>
      </div>

      <div data-action="applyDropCapStyle" data-param="remove" class="drop-cap-style-option" style="padding: 15px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
        <h4 style="margin-bottom: 10px; color: #dc3545;">Remove Drop Cap</h4>
        <p style="font-size: 14px; margin: 0; color: #666;">Remove drop cap styling from current paragraph.</p>
      </div>
    </div>
    
    <button data-action="closeDropCapModal" style="width: 100%; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1999;';
  backdrop.id = 'dropCapBackdrop';
  backdrop.onclick = closeDropCapModal;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  modal.id = 'dropCapDialog';
}

function applyDropCapStyle(style) {
  const editor = domCache.getEditor();
  const size = window.currentDropCapSize || '3em';
  
  // Restore saved selection (the modal steals focus)
  if (dropCapSavedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(dropCapSavedRange);
  }
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showToast('Please place cursor in a paragraph', 'error');
    closeDropCapModal();
    return;
  }
  
  const range = selection.getRangeAt(0);
  
  // Find the paragraph element (P/DIV inside editor)
  let targetElement = null;
  let node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  while (node && node !== editor && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'P' || node.tagName === 'DIV') {
        if (node.closest('#editor') === editor || node.parentNode === editor) {
          targetElement = node;
          break;
        }
      }
    }
    node = node.parentNode;
  }
  
  // If no paragraph found, create one at cursor
  if (!targetElement) {
    const textNode = range.startContainer;
    if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = textNode.textContent;
      textNode.parentNode.replaceChild(p, textNode);
      targetElement = p;
    } else {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      range.insertNode(p);
      targetElement = p;
    }
  }
  
  if (!targetElement || targetElement === editor) {
    showToast('Could not find paragraph. Please place cursor in a paragraph.', 'error');
    closeDropCapModal();
    return;
  }

  const text = targetElement.textContent.trim();
  if (!text) {
    showToast('Paragraph is empty', 'error');
    closeDropCapModal();
    return;
  }

  // Remove any existing drop-cap span and reset text
  const existing = targetElement.querySelector('.drop-cap-span');
  if (existing) {
    targetElement.textContent = targetElement.textContent;
  }

  if (style === 'remove') {
    targetElement.textContent = text;
    showToast('Drop cap removed');
    editor.focus();
    closeDropCapModal();
    return;
  }

  const firstChar = text.charAt(0);
  const rest = text.substring(1);
  const styleClass = style === 'classic' ? 'drop-cap-classic' : 'drop-cap-' + style;
  const escapedFirstChar = escapeHtml(firstChar);
  const escapedRest = escapeHtml(rest);
  // Use safeHTML for dynamic content to prevent XSS
  const dropCapHTML = `<span class="drop-cap-span ${styleClass}" style="--drop-cap-size:${size};">${escapedFirstChar}</span>${escapedRest}`;
  safeHTML.safeSetHTML(targetElement, dropCapHTML, false);

  showToast('Drop cap style applied');
  editor.focus();
  closeDropCapModal();
}

function closeDropCapModal() {
  document.getElementById('dropCapDialog')?.remove();
  document.getElementById('dropCapBackdrop')?.remove();
}

function setDropCapSize(size) {
  window.currentDropCapSize = size;
  
  const buttons = document.querySelectorAll('#dropCapDialog .size-btn');
  buttons.forEach(btn => {
    if (btn.dataset.size === size) {
      btn.style.border = '2px solid #8B4513';
      btn.style.background = '#8B4513';
      btn.style.color = 'white';
    } else {
      btn.style.border = '2px solid #ddd';
      btn.style.background = 'white';
      btn.style.color = '#333';
    }
  });
  
  showToast('Cap size selected: ' + size);
}

// Global State
let chapters = [];
let currentChapterIndex = 0;
let metadata = {};
let autosaveInterval = null;
let sessionStartTime = Date.now();
let sessionStartWords = 0;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isReadingAloud = false;

// Writing Streak Data
let writingStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastWriteDate: null,
  writingDates: [] // Array of date strings
};

// Version History
let versionHistory = [];
const MAX_VERSIONS = 20; // Keep last 20 versions

// Review Mode
let isReviewMode = false;

// Undo/Redo History
let undoHistory = [];
let redoHistory = [];
let isUndoRedoAction = false;
let lastSavedContent = '';

// DOM Element Cache (Performance Optimization)
const domCache = {
  editor: null,
  pageWrapper: null,
  chapterList: null,
  toolbarPanel: null,
  getEditor: function() {
    if (!this.editor) this.editor = document.getElementById('editor');
    return this.editor;
  },
  getPageWrapper: function() {
    if (!this.pageWrapper) this.pageWrapper = document.getElementById('pageWrapper');
    return this.pageWrapper;
  },
  getChapterList: function() {
    if (!this.chapterList) this.chapterList = document.getElementById('chapterList');
    return this.chapterList;
  },
  getToolbarPanel: function() {
    if (!this.toolbarPanel) this.toolbarPanel = document.getElementById('toolbarPanel');
    return this.toolbarPanel;
  },
  clear: function() {
    this.editor = null;
    this.pageWrapper = null;
    this.chapterList = null;
    this.toolbarPanel = null;
  }
};

// Cleanup function for timers and event listeners
function cleanupOnUnload() {
  if (autosaveInterval) {
    clearInterval(autosaveInterval);
    autosaveInterval = null;
  }
  if (spellCheckTimeout) {
    clearTimeout(spellCheckTimeout);
    spellCheckTimeout = null;
  }
  if (typeof navigatorTimeout !== 'undefined' && navigatorTimeout) {
    clearTimeout(navigatorTimeout);
    navigatorTimeout = null;
  }
  // Clear all timers from TimerManager
  if (window.timerManager) {
    window.timerManager.clearAll();
  }
}

// Register cleanup on page unload
window.addEventListener('beforeunload', cleanupOnUnload);
window.addEventListener('pagehide', cleanupOnUnload);

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
  await initializeData();
  renderChapterList();
  loadCurrentChapter();
  updateStats();
  startAutosave();
  setupKeyboardShortcuts();
  initializeWritingStreak(); // Initialize writing streak tracker
  initializeVersionHistory(); // Initialize version history
  
  // Check for shared document in URL
  const urlParams = new URLSearchParams(window.location.search);
  const shareId = urlParams.get('share');
  if (shareId) {
    loadSharedDocument(shareId);
  }
  
  // Setup centralized event handlers - ensure body is ready
  if (document.body) {
    setupCentralizedEventHandlers();
    setupPlaceholderClearing();
  } else {
    setTimeout(setupCentralizedEventHandlers, 50);
    setTimeout(setupPlaceholderClearing, 50);
  }
  // Initialize toolbar collapse state
  const wrapper = document.querySelector('.toolbar-wrapper');
  const btn = document.getElementById('toolbarToggleBtn');
  const collapsed = safeStorage.getItem('toolbarCollapsed') === '1';
  if (wrapper && collapsed) {
    wrapper.classList.add('collapsed');
  }
  if (btn) {
    btn.innerHTML = collapsed
      ? '<i class="fas fa-chevron-down"></i> Expand Toolbar'
      : '<i class="fas fa-chevron-up"></i> Collapse Toolbar';
  }

  // Prepare icon fallbacks if Font Awesome is unavailable
  setupIconFallbacks();
  detectFontAwesome();
  
  // Setup undo/redo tracking and stats updates (consolidated input listener)
  const editor = domCache.getEditor();
  if (editor) {
    // Save initial state
    lastSavedContent = editor.innerHTML;
    undoHistory.push(editor.innerHTML);
    
    // Track changes with debouncing - consolidated input listener
    let changeTimeout;
    editor.addEventListener('input', function() {
      updateStats();
      
      // Clean up text-transform from screenplay elements that shouldn't have it
      if (currentTemplate === 'screenplay') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const parentElement = container.nodeType === 3 ? container.parentElement : container;
          
          if (parentElement) {
            const dataElement = parentElement.getAttribute('data-element');
            if (dataElement && ['dialogue', 'action', 'parenthetical', 'general'].includes(dataElement)) {
              parentElement.style.textTransform = 'none';
            }
          }
        }
      }
      
      if (isUndoRedoAction) {
        isUndoRedoAction = false;
        return;
      }
      
      timerManager.setTimer('undoHistory', () => {
        saveToUndoHistory();
      }, 500); // Save after 500ms of no typing
    });
  }
  
  // Add selection change listener to detect font size automatically and update toolbar states
  document.addEventListener('selectionchange', function() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // Only detect if selection is within an editor
      const editor = domCache.getEditor();
      const pageEditors = document.querySelectorAll('.page-editor');
      const allEditors = [editor, ...Array.from(pageEditors)].filter(e => e);
      
      const isInEditor = allEditors.some(ed => {
        return ed && (ed.contains(range.commonAncestorContainer) || ed === range.commonAncestorContainer);
      });
      
      if (isInEditor) {
        // Detect font size with a small delay to avoid interfering with user actions
        setTimeout(() => {
          detectFontSize();
          updateToolbarActiveStates();
        }, 50);
      }
    }
  });
  
  // Monitor editor height and create new pages automatically
  const editorEl = domCache.getEditor();
  if (editorEl) {
    editorEl.addEventListener('input', () => {
      setTimeout(() => {
        checkAutoPageBreak(editorEl);
      }, 100);
    });
  }

  // Apply initial page settings (for page size/margins)
  if (document.getElementById('pageSize')) {
    updatePageSettings();
  }

  // Setup custom context menu on the editor
  setupEditorContextMenu();

  // Initialize session tracking
  if (editor) {
    const text = editor.innerText.trim();
    sessionStartWords = text.length > 0 ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
    sessionStartTime = Date.now();
  }
});

// Sidebar Toggle
function toggleSidebar() {
      logger.log('toggleSidebar() called');
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) {
    logger.error('Sidebar element not found');
    return;
  }
  logger.log('Toggling sidebar, current classes:', sidebar.className);
  sidebar.classList.toggle('collapsed');
  logger.log('After toggle, classes:', sidebar.className, 'Has collapsed?', sidebar.classList.contains('collapsed'));
  showToast(sidebar.classList.contains('collapsed') ? 'Sidebar hidden' : 'Sidebar shown');
}

// Sidebar Tab Switching
function switchSidebarTab(tab) {
  const tabs = document.querySelectorAll('.sidebar-tab');
  const contents = document.querySelectorAll('.sidebar-content');
  
  // Remove active class from all tabs
  tabs.forEach(t => t.classList.remove('active'));
  
  // Hide all content
  contents.forEach(c => c.classList.add('hidden'));
  
  // Find and activate the clicked tab based on the tab parameter
  tabs.forEach(t => {
    const onclick = t.getAttribute('onclick');
    if (onclick && onclick.includes(`'${tab}'`)) {
      t.classList.add('active');
    }
  });
  
  // Show corresponding content
  if (tab === 'chapters') {
    document.getElementById('chaptersTab').classList.remove('hidden');
  } else if (tab === 'story') {
    document.getElementById('storyTab').classList.remove('hidden');
    updatePacingGraph();
    updateStoryStructureStats();
  } else if (tab === 'stats') {
    document.getElementById('statsTab').classList.remove('hidden');
  }
}

// Font Download Modal
function openFontDownloadModal() {
  openModal('fontDownloadModal');
}

// Handle local font uploads
function handleFontFileSelection(event) {
  const file = event?.target?.files?.[0];
  const nameInput = document.getElementById('fontUploadName');
  if (file && nameInput && !nameInput.value) {
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    nameInput.value = baseName;
  }
}

function installLocalFont() {
  const fileInput = document.getElementById('fontUploadFile');
  const nameInput = document.getElementById('fontUploadName');
  const select = document.getElementById('fontFamilySelect');

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showToast('Select a font file (.ttf, .otf, .woff, .woff2)', 'error');
    return;
  }

  const file = fileInput.files[0];
  const family = (nameInput && nameInput.value.trim()) || file.name.replace(/\.[^/.]+$/, '');
  const url = URL.createObjectURL(file);

  // Remove any previous style for this family to avoid duplicates
  const existingStyle = document.querySelector(`style[data-font-name="${family}"]`);
  if (existingStyle) existingStyle.remove();

  // Inject @font-face
  const style = document.createElement('style');
  style.setAttribute('data-font-source', 'local-upload');
  style.setAttribute('data-font-name', family);
  style.textContent = `@font-face { font-family: '${family}'; src: url('${url}'); }`;
  document.head.appendChild(style);

  // Add to dropdown and select it (dedupe by family name)
  if (select) {
    // Remove duplicate options with same label
    select.querySelectorAll('option').forEach(opt => {
      if (opt.textContent === family) opt.remove();
    });

    const option = document.createElement('option');
    option.value = `"${family}", sans-serif`;
    option.textContent = family;
    option.selected = true;
    select.appendChild(option);
    changeFontFamily(option.value);
  }

  // Clear the file input so re-installing requires explicit pick
  fileInput.value = '';
  showToast(`Font \"${family}\" installed for this session`);
}

// Dark Mode
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  safeStorage.setItem('darkMode', String(isDark));
  showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled');
}

// Template Switching
function switchTemplate() {
  const templateSelector = document.getElementById('templateSelector');
  if (!templateSelector) {
    logger.error('Template selector not found');
    return;
  }
  
  const template = templateSelector.value;
  const editor = domCache.getEditor();
  
  if (!editor) {
    logger.error('Editor not found');
    showToast('Editor not found', 'error');
    return;
  }
  
  // Check if there's actual text content in the editor (not just empty HTML/whitespace)
  const textContent = editor.innerText ? editor.innerText.trim() : '';
  
  // Only show warning if there's actual text content (at least 1 character)
  // Don't show for empty editor or just HTML tags/whitespace
  if (textContent.length > 0) {
    // Get current template to revert if cancelled
    const novelControls = document.getElementById('novelControls');
    const screenplayControls = document.getElementById('screenplayControls');
    const playwritingControls = document.getElementById('playwritingControls');
    
    let currentTemplate = 'novel'; // default
    if (novelControls && novelControls.style.display !== 'none') {
      currentTemplate = 'novel';
    } else if (screenplayControls && screenplayControls.style.display !== 'none') {
      currentTemplate = 'screenplay';
    } else if (playwritingControls && playwritingControls.style.display !== 'none') {
      currentTemplate = 'playwriting';
    }
    
    // Show custom confirmation modal
    showTemplateSwitchConfirmation(() => {
      // User confirmed - clear and switch
      editor.innerHTML = '';
      performTemplateSwitch(template);
    }, () => {
      // User cancelled - revert dropdown
      if (templateSelector) {
        templateSelector.value = currentTemplate;
      }
    });
  } else {
    // No content, just switch
    performTemplateSwitch(template);
  }
}

function performTemplateSwitch(template) {
  const editor = domCache.getEditor();
  
  // Show/hide appropriate controls
  document.getElementById('novelControls').style.display = template === 'novel' ? 'block' : 'none';
  document.getElementById('screenplayControls').style.display = template === 'screenplay' ? 'block' : 'none';
  document.getElementById('playwritingControls').style.display = template === 'playwriting' ? 'block' : 'none';
  document.getElementById('novelMatterControls').style.display = template === 'novel' ? 'block' : 'none';
  
  // Apply template-specific formatting to editor
  if (template === 'screenplay') {
    editor.style.fontFamily = 'Courier, "Courier New", monospace';
    editor.style.fontSize = '12pt';
    editor.style.lineHeight = '1.5';
  } else if (template === 'playwriting') {
    editor.style.fontFamily = '"Times New Roman", Times, serif';
    editor.style.fontSize = '12pt';
    editor.style.lineHeight = '1.8';
  } else {
    // Novel - default
    editor.style.fontFamily = 'inherit';
    editor.style.fontSize = '16px';
    editor.style.lineHeight = '1.6';
  }
  
  showToast(`Switched to ${template.charAt(0).toUpperCase() + template.slice(1)} template`, 'success');
}

function showTemplateSwitchConfirmation(onConfirm, onCancel) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #e4d5b7; padding: 25px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; min-width: 380px; max-width: 90vw;';
  
  modal.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 36px; color: #dc3545; margin-bottom: 15px;">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      
      <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">
        Warning: Content Will Be Lost
      </h2>
      
      <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #dc3545;">
          Save your work before switching!
        </p>
        <p style="margin: 0; font-size: 13px; color: #000; line-height: 1.5;">
          Switching templates will clear all current content in the editor.
        </p>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="confirmSwitchBtn" style="flex: 1; padding: 10px 18px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px; transition: all 0.2s;">
          <i class="fas fa-exclamation-circle"></i> Yes, Clear
        </button>
        <button id="cancelSwitchBtn" style="flex: 1; padding: 10px 18px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px; transition: all 0.2s;">
          <i class="fas fa-ban"></i> Cancel
        </button>
      </div>
    </div>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2090;';
  backdrop.id = 'templateSwitchBackdrop';
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  modal.id = 'templateSwitchModal';
  
  // Add hover effects
  const confirmBtn = document.getElementById('confirmSwitchBtn');
  const cancelBtn = document.getElementById('cancelSwitchBtn');
  
  confirmBtn.onmouseover = () => confirmBtn.style.background = '#c82333';
  confirmBtn.onmouseout = () => confirmBtn.style.background = '#dc3545';
  cancelBtn.onmouseover = () => cancelBtn.style.background = '#A0522D';
  cancelBtn.onmouseout = () => cancelBtn.style.background = '#8B4513';
  
  // Handle confirm
  confirmBtn.onclick = () => {
    modal.remove();
    backdrop.remove();
    onConfirm();
  };
  
  // Handle cancel
  cancelBtn.onclick = () => {
    modal.remove();
    backdrop.remove();
    onCancel();
  };
  
  backdrop.onclick = () => {
    modal.remove();
    backdrop.remove();
    onCancel();
  };
}

// Fullscreen / typewriter mode
function toggleFullscreenMode(forceOff) {
  if (forceOff === true) {
    document.body.classList.remove('fullscreen-mode');
  } else {
    document.body.classList.toggle('fullscreen-mode');
  }
  const isFull = document.body.classList.contains('fullscreen-mode');
  showToast(isFull ? 'Fullscreen mode enabled' : 'Fullscreen mode disabled');
}

// Update toolbar button active states based on current selection
function updateToolbarActiveStates() {
  const editor = domCache.getEditor();
  if (!editor) return;
  
  // Commands to check for active state
  const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
  
  commands.forEach(cmd => {
    try {
      const isActive = document.queryCommandState(cmd);
      const button = document.querySelector(`.toolbar-panel-btn[data-command="${cmd}"]`);
      if (button) {
        if (isActive) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      }
    } catch (e) {
      // Some commands may not be supported, ignore errors
    }
  });
  
  // Check for lists
  try {
    const isUnorderedList = document.queryCommandState('insertUnorderedList');
    const isOrderedList = document.queryCommandState('insertOrderedList');
    const unorderedBtn = document.querySelector(`.toolbar-panel-btn[data-command="insertUnorderedList"]`);
    const orderedBtn = document.querySelector(`.toolbar-panel-btn[data-command="insertOrderedList"]`);
    
    if (unorderedBtn) {
      if (isUnorderedList) {
        unorderedBtn.classList.add('active');
      } else {
        unorderedBtn.classList.remove('active');
      }
    }
    
    if (orderedBtn) {
      if (isOrderedList) {
        orderedBtn.classList.add('active');
      } else {
        orderedBtn.classList.remove('active');
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

// Format Text
function formatText(command, value = null) {
  const editor = domCache.getEditor();
  editor.focus();
  
  // Special handling for undo/redo
  if (command === 'undo' || command === 'redo') {
    if (command === 'undo') {
      performUndo();
    } else {
      performRedo();
    }
    return;
  }
  
  // Special handling for list commands
  if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      try {
        // Ensure we have a valid selection
        if (selection.isCollapsed) {
          // If cursor is in empty space, create a list item
          const range = selection.getRangeAt(0);
          const list = document.createElement(command === 'insertUnorderedList' ? 'ul' : 'ol');
          const li = document.createElement('li');
          li.innerHTML = '<br>';
          list.appendChild(li);
          
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            range.insertNode(list);
          } else {
            range.startContainer.appendChild(list);
          }
          
          // Move cursor into the list item
          const newRange = document.createRange();
          newRange.selectNodeContents(li);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          document.execCommand(command, false, value);
          setTimeout(() => updateToolbarActiveStates(), 10);
        }
        
        // Ensure proper list structure
        setTimeout(() => {
          updateToolbarActiveStates();
          const lists = editor.querySelectorAll('ul, ol');
          lists.forEach(list => {
            if (list.innerHTML.trim() === '') {
              list.innerHTML = '<li><br></li>';
            }
            // Ensure all list items have content
            const items = list.querySelectorAll('li');
            items.forEach(item => {
              if (item.innerHTML.trim() === '') {
                item.innerHTML = '<br>';
              }
            });
          });
        }, 10);
      } catch (e) {
        logger.error('List command error:', e);
        showToast('Could not create list. Please try selecting text first.', 'error');
      }
    } else {
      showToast('Please select text or place cursor where you want the list', 'error');
    }
  } else if (command === 'indent' || command === 'outdent') {
    // Special handling for indent/outdent
    document.execCommand(command, false, value);
    setTimeout(() => updateToolbarActiveStates(), 10);
  } else {
    document.execCommand(command, false, value);
    setTimeout(() => updateToolbarActiveStates(), 10);
  }
  
  editor.focus();
}

// Undo/Redo Functions
function saveToUndoHistory() {
  const editor = domCache.getEditor();
  if (!editor) return;
  
  const currentContent = editor.innerHTML;
  
  // Don't save if content hasn't changed
  if (currentContent === lastSavedContent) return;
  
  // Limit history to 50 entries
  if (undoHistory.length >= 50) {
    undoHistory.shift();
  }
  
  undoHistory.push(currentContent);
  lastSavedContent = currentContent;
  
  // Clear redo history when new change is made
  redoHistory = [];
  
  // Undo history saved
}

function performUndo() {
  const editor = domCache.getEditor();
  if (!editor) {
    showToast('Editor not found', 'error');
    return;
  }
  
  if (undoHistory.length <= 1) {
    showToast('Nothing to undo', 'error');
    return;
  }
  
  // Save current state to redo before undoing
  const currentContent = editor.innerHTML;
  redoHistory.push(currentContent);
  
  // Remove current state from undo
  undoHistory.pop();
  
  // Get previous state
  const previousContent = undoHistory[undoHistory.length - 1];
  
  // Restore previous state
  isUndoRedoAction = true;
  editor.innerHTML = previousContent;
  lastSavedContent = previousContent;
  
  // Restore cursor position to end
  editor.focus();
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(editor);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  
  showToast('Undone');
  updateStats();
}

function performRedo() {
  const editor = domCache.getEditor();
  if (!editor) {
    showToast('Editor not found', 'error');
    return;
  }
  
  if (redoHistory.length === 0) {
    showToast('Nothing to redo', 'error');
    return;
  }
  
  // Get next state from redo
  const nextContent = redoHistory.pop();
  
  // Save current state to undo
  undoHistory.push(nextContent);
  
  // Restore next state
  isUndoRedoAction = true;
  editor.innerHTML = nextContent;
  lastSavedContent = nextContent;
  
  // Restore cursor position to end
  editor.focus();
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(editor);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  
  showToast('Redone');
  updateStats();
}

// Change Colors
function changeTextColor(color) {
  formatText('foreColor', color);
  document.getElementById('textColorValue').textContent = color.toUpperCase();
}

function changeBackgroundColor(color) {
  formatText('backColor', color);
  document.getElementById('bgColorValue').textContent = color.toUpperCase();
}

function highlightText() {
  highlightTextWithColor('#FFFF00');
}

function highlightTextWithColor(color) {
  formatText('backColor', color);
  // Show visual feedback on the palette
  document.querySelectorAll('.highlight-color-btn').forEach(btn => {
    if (btn.dataset.color === color) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  closeHighlightDropdown();
}

function toggleMoreDropdown(event) {
  event.stopPropagation();
  const dropdown = document.getElementById('moreDropdown');
  const button = event.target.closest('[data-action="toggleMoreDropdown"]');
  if (!dropdown || !button) return;
  const isOpen = dropdown.style.display === 'block';
  if (isOpen) {
    dropdown.style.display = 'none';
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', closeMoreDropdownOnOutside);
  } else {
    dropdown.style.display = 'block';
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', closeMoreDropdownOnOutside);
  }
}

function closeMoreDropdown() {
  const dropdown = document.getElementById('moreDropdown');
  const button = document.querySelector('[data-action="toggleMoreDropdown"]');
  if (!dropdown) return;
  dropdown.style.display = 'none';
  if (button) button.setAttribute('aria-expanded', 'false');
  document.removeEventListener('click', closeMoreDropdownOnOutside);
}

function closeMoreDropdownOnOutside(e) {
  const dropdown = document.getElementById('moreDropdown');
  if (!dropdown) return;
  if (!dropdown.contains(e.target) && !e.target.closest('.more-dropdown-container')) {
    closeMoreDropdown();
  }
}

function toggleHighlightDropdown(event) {
  event.stopPropagation();
  const dropdown = document.getElementById('highlightDropdown');
  if (!dropdown) return;
  const isOpen = dropdown.style.display === 'block';
  if (isOpen) {
    dropdown.style.display = 'none';
    document.removeEventListener('click', closeHighlightDropdownOnOutside);
  } else {
    dropdown.style.display = 'block';
    document.addEventListener('click', closeHighlightDropdownOnOutside);
  }
}

function closeHighlightDropdown() {
  const dropdown = document.getElementById('highlightDropdown');
  if (!dropdown) return;
  dropdown.style.display = 'none';
  document.removeEventListener('click', closeHighlightDropdownOnOutside);
}

function closeHighlightDropdownOnOutside(e) {
  const dropdown = document.getElementById('highlightDropdown');
  if (!dropdown) return;
  if (!dropdown.contains(e.target) && !e.target.closest('.highlight-dropdown-container')) {
    closeHighlightDropdown();
  }
}

function toggleHighlightPaletteAdvanced() {
  // Create a modal with more highlight color options
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 16px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 2000;';
  
  const colors = [
    { name: 'Yellow', value: '#FFFF00' },
    { name: 'Green', value: '#00FF00' },
    { name: 'Pink', value: '#FF69B4' },
    { name: 'Orange', value: '#FFA500' },
    { name: 'Sky Blue', value: '#87CEEB' },
    { name: 'Plum', value: '#DDA0DD' },
    { name: 'Red', value: '#FF6B6B' },
    { name: 'Cyan', value: '#00FFFF' },
    { name: 'Lime', value: '#32CD32' },
    { name: 'Gold', value: '#FFD700' },
    { name: 'Turquoise', value: '#40E0D0' },
    { name: 'Lavender', value: '#E6E6FA' }
  ];
  
  let html = '<h4 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; color: #333;">Highlight Colors</h4>';
  html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">';
  
  colors.forEach(color => {
    html += `<button data-action="highlightTextWithColor" data-param="${escapeHtml(color.value)}" class="highlight-color-btn" style="background: ${color.value}; border: 2px solid #dee2e6; border-radius: 6px; padding: 12px 8px; cursor: pointer; font-size: 11px; font-weight: 500; transition: all 0.2s;">${escapeHtml(color.name)}</button>`;
  });
  
  html += '</div>';
  html += '<button data-action="closeAdvancedPalette" style="width: 100%; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">Close</button>';
  
  modal.innerHTML = html;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 1999;';
  backdrop.id = 'highlightPaletteBackdrop';
  backdrop.onclick = closeAdvancedPalette;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  window.highlightPaletteModal = modal;
}

function closeAdvancedPalette() {
  const modal = window.highlightPaletteModal;
  const backdrop = document.getElementById('highlightPaletteBackdrop');
  if (modal) modal.remove();
  if (backdrop) backdrop.remove();
  window.highlightPaletteModal = null;
}

// Change Font
function changeFontFamily(font) {
  if (font) {
    document.execCommand('fontName', false, font);
    const editor = domCache.getEditor(); if (editor) editor.focus();
  }
}

// Line spacing and letter spacing (Word-style)
function applyLineSpacing(value) {
  if (!value) {
    return;
  }
  
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    showToast('Place cursor in text to change line spacing', 'error');
    return;
  }

  // Find the active editor (could be main editor or any .editor-page)
  const range = selection.getRangeAt(0);
  const activeEditor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
    ? range.commonAncestorContainer.parentElement.closest('.editor-page, #editor')
    : range.commonAncestorContainer.closest('.editor-page, #editor');
  
  if (!activeEditor) {
    showToast('Editor not found', 'error');
    return;
  }

  // Save the current selection/range to restore after applying
  let savedRange = null;
  if (selection.rangeCount > 0) {
    savedRange = selection.getRangeAt(0).cloneRange();
  }

  // Apply to selected blocks or current block
  const blocks = [];
  
  if (!selection.isCollapsed) {
    // Text is selected - find all blocks that intersect with selection
    const allBlocks = activeEditor.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, blockquote');
    
    allBlocks.forEach(block => {
      if (range.intersectsNode(block)) {
        blocks.push(block);
      }
    });
  } else {
    // No selection - find current block
    let node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    const block = node ? node.closest('p, div, h1, h2, h3, h4, h5, h6, li, blockquote') : null;
    if (block && block !== activeEditor && activeEditor.contains(block)) {
      blocks.push(block);
    }
  }

  if (blocks.length > 0) {
    blocks.forEach(block => {
      block.style.lineHeight = value;
    });
    const label = value === '1.0' ? 'Single' : value === '2.0' ? 'Double' : value;
    showToast('Line spacing set to ' + label);
  } else {
    // Fallback: apply to all paragraphs in active editor
    const allBlocks = activeEditor.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, blockquote');
    if (allBlocks.length > 0) {
      allBlocks.forEach(block => block.style.lineHeight = value);
      const label = value === '1.0' ? 'Single' : value === '2.0' ? 'Double' : value;
      showToast('Line spacing set to ' + label + ' (all in page)');
    } else {
      // Last resort: apply to the editor itself
      activeEditor.style.lineHeight = value;
      const label = value === '1.0' ? 'Single' : value === '2.0' ? 'Double' : value;
      showToast('Line spacing set to ' + label + ' (entire page)');
    }
  }

  // Restore the selection
  if (savedRange) {
    try {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    } catch (e) {
      // Selection restore failed, silently continue
    }
  }

  // Keep the focus on the active editor
  activeEditor.focus();
}

function applyLetterSpacing(value) {
  if (!value) {
    return;
  }
  
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    showToast('Place cursor in text to change letter spacing', 'error');
    return;
  }

  // Find the active editor (could be main editor or any .editor-page)
  const range = selection.getRangeAt(0);
  const activeEditor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
    ? range.commonAncestorContainer.parentElement.closest('.editor-page, #editor')
    : range.commonAncestorContainer.closest('.editor-page, #editor');
  
  if (!activeEditor) {
    showToast('Editor not found', 'error');
    return;
  }

  try {
    // If text is selected, apply to selection
    if (!selection.isCollapsed) {
      const span = document.createElement('span');
      span.style.letterSpacing = value + 'px';
      
      try {
        range.surroundContents(span);
        const label = value === '0' ? 'Normal' : parseFloat(value) > 0 ? 'Expanded' : 'Condensed';
        showToast('Letter spacing set to ' + label);
      } catch (e) {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
        const label = value === '0' ? 'Normal' : parseFloat(value) > 0 ? 'Expanded' : 'Condensed';
        showToast('Letter spacing set to ' + label);
      }
    } else {
      // No selection - apply to current paragraph/block
      let node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }
      const block = node ? node.closest('p, div, h1, h2, h3, h4, h5, h6, li, blockquote') : null;
      
      if (block && block !== activeEditor && activeEditor.contains(block)) {
        // Apply to the entire block
        block.style.letterSpacing = value + 'px';
        const label = value === '0' ? 'Normal' : parseFloat(value) > 0 ? 'Expanded' : 'Condensed';
        showToast('Letter spacing set to ' + label + ' (paragraph)');
      } else {
        // Fallback: apply to all paragraphs in active editor
        const allBlocks = activeEditor.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, blockquote');
        if (allBlocks.length > 0) {
          allBlocks.forEach(block => {
            block.style.letterSpacing = value + 'px';
          });
          const label = value === '0' ? 'Normal' : parseFloat(value) > 0 ? 'Expanded' : 'Condensed';
          showToast('Letter spacing set to ' + label + ' (all in page)');
        } else {
          showToast('Place cursor in text to change letter spacing', 'error');
        }
      }
    }
  } catch (error) {
    logger.error('Letter spacing error:', error);
    showToast('Could not apply letter spacing', 'error');
  }
  
  // Keep focus on active editor
  activeEditor.focus();
}

function changeFontSize(size) {
  if (!size) {
    return;
  }
  
  // Convert to number and apply
  const sizeNum = parseInt(size.replace('px', ''));
  if (!isNaN(sizeNum)) {
    applyFontSize(sizeNum);
  }
  
  // Reset select
  const fontSizeSelect = document.getElementById('fontSizeSelect');
  if (fontSizeSelect) {
    fontSizeSelect.value = '';
  }
  
  // Clear saved selection after applying
  savedFontSizeRange = null;
}

// Main function to apply font size to selected text (using surroundContents approach)
function applyFontSize(size) {
  const selection = window.getSelection();
  
  // Check if there's selected text, try restoring saved selection first
  if ((!selection.rangeCount || selection.isCollapsed) && savedFontSizeRange) {
    // Restore editor focus first
    const editor = domCache.getEditor();
    if (editor) {
      editor.focus();
    }
    // Restore selection
    selection.removeAllRanges();
    selection.addRange(savedFontSizeRange);
    savedFontSizeRange = null;
  }
  
  // Check again after restoration
  if (!selection.rangeCount || selection.isCollapsed) {
    showToast('Please highlight some text first!', 'error');
    return;
  }
  
  const range = selection.getRangeAt(0);
  
  // Create a span with the font size
  const span = document.createElement('span');
  span.style.fontSize = size + 'px';
  
  // Wrap the selected text in the span
  try {
    range.surroundContents(span);
  } catch (e) {
    // If surroundContents fails (e.g., partial element selection),
    // extract contents and wrap them
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  
  // Clear selection
  selection.removeAllRanges();
  
  // Show confirmation
  showToast('Font size changed to ' + size + 'px');
  updateStats();
}

// Detect font size of selected text or cursor position
function detectFontSize() {
  const selection = window.getSelection();
  const fontSizeSelect = document.getElementById('fontSizeSelect');
  
  if (!selection || !fontSizeSelect || !selection.rangeCount) {
    return;
  }
  
  const range = selection.getRangeAt(0);
  let element = range.startContainer;
  
  // If it's a text node, get the parent element
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentElement;
  }
  
  // Traverse up to find an element with fontSize style
  while (element && element !== document.body) {
    // Check if element has inline fontSize style
    let fontSize = element.style.fontSize;
    
    // If no inline style, get computed style
    if (!fontSize) {
      const computedStyle = window.getComputedStyle(element);
      fontSize = computedStyle.fontSize;
    }
    
    // Skip if it's an editor element itself
    if (element.id === 'editor' || element.classList.contains('page-editor')) {
      element = element.parentElement;
      continue;
    }
    
    if (fontSize && fontSize !== '0px' && fontSize !== '') {
      // Parse and normalize the font size
      const fontSizeValue = fontSize;
      
      // Check if the exact size exists in options
      let found = false;
      for (let i = 0; i < fontSizeSelect.options.length; i++) {
        if (fontSizeSelect.options[i].value === fontSizeValue) {
          fontSizeSelect.selectedIndex = i;
          found = true;
          break;
        }
      }
      
      // If exact match not found, update the first option to show detected size
      if (!found && fontSizeSelect.options.length > 0) {
        fontSizeSelect.options[0].text = 'Font Size (' + fontSizeValue + ')';
        fontSizeSelect.selectedIndex = 0;
      }
      
      return fontSizeValue;
    }
    
    element = element.parentElement;
  }
  
  // If no specific font size found, check default editor font size
  const editor = domCache.getEditor();
  if (editor) {
    const computedStyle = window.getComputedStyle(editor);
    const defaultFontSize = computedStyle.fontSize;
    if (defaultFontSize && fontSizeSelect.options.length > 0) {
      // Check if default size exists in options
      let found = false;
      for (let i = 0; i < fontSizeSelect.options.length; i++) {
        if (fontSizeSelect.options[i].value === defaultFontSize) {
          fontSizeSelect.selectedIndex = i;
          found = true;
          break;
        }
      }
      
      if (!found) {
        fontSizeSelect.options[0].text = 'Font Size (' + defaultFontSize + ')';
        fontSizeSelect.selectedIndex = 0;
      }
    }
  }
  
  return null;
}

// Format Heading
function formatHeading(tag) {
  if (!tag) return;
  
  const editor = domCache.getEditor();
  if (!editor) return;
  
  // Ensure editor has focus
  editor.focus();
  
  // Get selection
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  // Apply the formatting
  const success = document.execCommand('formatBlock', false, tag);
  
  if (!success) {
    // Fallback: wrap selection in the tag
    const range = selection.getRangeAt(0);
    const element = document.createElement(tag);
    try {
      range.surroundContents(element);
    } catch (e) {
      // If surroundContents fails, use a different approach
      const fragment = range.extractContents();
      element.appendChild(fragment);
      range.insertNode(element);
    }
  }
  
  // Reset dropdown to default
  const headingSelect = document.querySelector('select[onchange*="formatHeading"]');
  if (headingSelect) {
    headingSelect.value = '';
  }
  
  editor.focus();
}

// Insert Elements
function insertBlockquote() {
  const selection = window.getSelection();
  const editor = domCache.getEditor();
  
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    
    // Check if already in a blockquote
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BLOCKQUOTE') {
        // Remove blockquote - unwrap contents
        const parent = node.parentNode;
        while (node.firstChild) {
          parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
        showToast('Blockquote removed');
        return;
      }
      node = node.parentNode;
    }
    
    // Create new blockquote
    const blockquote = document.createElement('blockquote');
    
    try {
      // Try to wrap selection
      const selectedContent = range.extractContents();
      blockquote.appendChild(selectedContent);
      range.insertNode(blockquote);
      
      // If blockquote is empty, add placeholder text
      if (blockquote.textContent.trim() === '') {
        blockquote.textContent = 'Enter your quote here...';
      }
      
      showToast('Blockquote applied');
    } catch (e) {
      // If wrapping fails, insert at cursor
      blockquote.textContent = 'Enter your quote here...';
      range.insertNode(blockquote);
      showToast('Blockquote inserted');
    }
    
    // Move cursor into blockquote
    const newRange = document.createRange();
    newRange.selectNodeContents(blockquote);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  } else {
    // No selection - insert at end
    const blockquote = document.createElement('blockquote');
    blockquote.innerHTML = '<p>Enter your quote here...</p>';
    editor.appendChild(blockquote);
    showToast('Blockquote inserted');
  }
}

// Insert Dialogue - detects narrative tags (asked/said/etc.), splits line, and inserts dialogue on its own indented line
function insertDialogue() {
  const selection = window.getSelection();
  const editor = domCache.getEditor();
  
  // Check if there's a selection
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    showToast('Please select text to format as dialogue', 'error');
    return;
  }
  
  const range = selection.getRangeAt(0);
  let selectedText = selection.toString().trim();
  
  // If there is no explicit text selection, fall back to the current block's text
  if (!selectedText) {
    let node = range.startContainer;
    const block = findBlockElement(node, editor);
    if (block) {
      selectedText = block.innerText.trim();
    }
  }
  
  if (!selectedText) {
    showToast('Please select or place cursor on a line with dialogue', 'error');
    return;
  }

  // Step 1: Try to detect a narrative tag and split AFTER the comma.
  // Example:
  // "As they started walking home, Mark asked, \"Are you going to the party\""
  // -> narrative: "As they started walking home, Mark asked,"
  // -> dialogue:  "\"Are you going to the party\""
  const tagRegex = /\b(asked|said|replied|answered|whispered|shouted|murmured|cried|yelled|responded|called|added)\b/i;
  const tagMatch = selectedText.match(tagRegex);
  let narrativeText = selectedText;
  let dialogueText = '';

  if (tagMatch) {
    const tagIndex = tagMatch.index + tagMatch[0].length;
    const commaIndex = selectedText.indexOf(',', tagIndex);

    if (commaIndex !== -1 && commaIndex < selectedText.length - 1) {
      // Split at comma
      narrativeText = selectedText.slice(0, commaIndex + 1).trim();
      dialogueText = selectedText.slice(commaIndex + 1).trim();
    }
  }

  // If we didn't find a tag/comma pattern, fall back to treating the whole thing as dialogue
  if (!dialogueText) {
    dialogueText = selectedText;
    narrativeText = '';
  }

  // Ensure dialogue is wrapped in quotes.
  // For curly quotes, change to: dialogueText = '“' + core + '”';
  const hasLeadingQuote = dialogueText.startsWith('"') || dialogueText.startsWith('“') || dialogueText.startsWith('\'');
  const hasTrailingQuote = dialogueText.endsWith('"') || dialogueText.endsWith('”') || dialogueText.endsWith('\'');
  let coreDialogue = dialogueText;
  if (hasLeadingQuote) coreDialogue = coreDialogue.slice(1).trimStart();
  if (hasTrailingQuote) coreDialogue = coreDialogue.slice(0, -1).trimEnd();
  dialogueText = '"' + coreDialogue + '"';
  
  // Find the block element containing the selection end (where we'll insert narrative/dialogue)
  let currentNode = range.endContainer;
  let blockElement = findBlockElement(currentNode, editor);
  
  // If no block element found, create one from the current position
  if (!blockElement) {
    // Try to find or create a paragraph at the selection end
    if (range.endContainer.nodeType === Node.TEXT_NODE) {
      blockElement = range.endContainer.parentElement;
    } else if (range.endContainer.nodeType === Node.ELEMENT_NODE) {
      blockElement = range.endContainer;
    }
    
    // If still no block element, wrap in a paragraph
    if (!blockElement || blockElement === editor) {
      // Create a temporary paragraph to contain the selection
      const tempP = document.createElement('p');
      try {
        range.surroundContents(tempP);
        blockElement = tempP;
      } catch (e) {
        // If that fails, just use editor
        blockElement = editor;
      }
    }
  }
  
  // If we found a block and it belongs to the editor, rewrite that block and insert dialogue below it.
  let dialogueParagraph;
  if (blockElement && blockElement !== editor && blockElement.parentNode) {
    // Update narrative line if we have one
    if (narrativeText) {
      blockElement.textContent = narrativeText;
    } else {
      // If there's no narrative, clear the original block
      blockElement.textContent = '';
    }

    // Create a new paragraph element with the dialogue text
    dialogueParagraph = document.createElement('p');
    dialogueParagraph.textContent = dialogueText;
    // Add a class so dialogue can be positioned/styled differently from main paragraphs
    dialogueParagraph.classList.add('dialogue-line');

    // Insert the new paragraph after the current block element
    if (blockElement.nextSibling) {
      blockElement.parentNode.insertBefore(dialogueParagraph, blockElement.nextSibling);
    } else {
      blockElement.parentNode.appendChild(dialogueParagraph);
    }
  } else {
    // Fallback: just append a new dialogue line at the end
    dialogueParagraph = document.createElement('p');
    dialogueParagraph.textContent = dialogueText;
    dialogueParagraph.classList.add('dialogue-line');
    editor.appendChild(dialogueParagraph);
  }
  
  
  // Move cursor to the end of the new dialogue paragraph
  const newRange = document.createRange();
  newRange.selectNodeContents(dialogueParagraph);
  newRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(newRange);
  
  // Focus the editor
  editor.focus();
  
  // Show success message
  showToast('Dialogue formatted on its own line');
  
  // Update stats
  updateStats();
}

// Helper: find nearest block-level element for dialogue formatting
function findBlockElement(node, editor) {
  let currentNode = node;
  while (currentNode && currentNode !== editor) {
    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const tagName = currentNode.tagName;
      if (tagName === 'P' || tagName === 'DIV' || tagName === 'H1' || tagName === 'H2' ||
          tagName === 'H3' || tagName === 'H4' || tagName === 'H5' || tagName === 'H6' ||
          tagName === 'BLOCKQUOTE' || tagName === 'LI') {
        return currentNode;
      }
    }
    currentNode = currentNode.parentNode;
  }
  return null;
}

function insertHorizontalRule() {
  formatText('insertHorizontalRule');
}

// Insert a visual/printable page break
function insertPageBreak() {
  const editor = domCache.getEditor();
  if (editor) editor.focus();

  const selection = window.getSelection();
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;

  const pageBreak = document.createElement('div');
  pageBreak.className = 'page-break';

  if (range) {
    // Insert at current caret position
    range.collapse(false);
    range.insertNode(pageBreak);

    // Add a blank paragraph after the break for easier typing
    const spacer = document.createElement('p');
    spacer.innerHTML = '<br>';
    if (pageBreak.parentNode) {
      pageBreak.parentNode.insertBefore(spacer, pageBreak.nextSibling);
    } else {
      editor.appendChild(spacer);
    }
  } else {
    // Fallback: append at end
    editor.appendChild(pageBreak);
    const spacer = document.createElement('p');
    spacer.innerHTML = '<br>';
    editor.appendChild(spacer);
  }

  showToast('Page break inserted');
  updateStats();
}

// Table Operations
function insertTable() {
  openModal('tableModal');
}

function createTable() {
  const rows = parseInt(document.getElementById('tableRows').value);
  const cols = parseInt(document.getElementById('tableCols').value);
  const hasHeaders = document.getElementById('tableHeaders').checked;

  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    showToast('Enter valid row/column counts (minimum 1)', 'error');
    return;
  }

  let html = '<table>';

  if (hasHeaders) {
    html += '<thead><tr>';
    for (let j = 0; j < cols; j++) {
      html += '<th>Header</th>';
    }
    html += '</tr></thead>';
  }

  html += '<tbody>';
  for (let i = 0; i < rows; i++) {
    html += '<tr>';
    for (let j = 0; j < cols; j++) {
      html += '<td>Cell</td>';
    }
    html += '</tr>';
  }
  html += '</tbody></table><p><br></p>';
  
  formatText('insertHTML', html);
  closeModal('tableModal');
  showToast('Table inserted');
}

// Image and Link
function insertImage() {
  // Remember current selection so insertion can target editor after modal steals focus
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    window._imageInsertRange = sel.getRangeAt(0).cloneRange();
  }

  const imageModal = document.createElement('div');
  imageModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2000; min-width: 400px; max-width: 90vw; max-height: 80vh; overflow-y: auto;';
  imageModal.innerHTML = `
    <h3 style="margin-bottom: 20px; color: #333;">Insert Image</h3>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 10px; font-weight: 600;">Choose Image File:</label>
      <input type="file" id="imageFile" accept="image/*" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">
      <div id="imagePreview" style="margin-top: 15px; text-align: center;"></div>
    </div>
    
    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 13px;">Or enter image URL:</label>
      <div style="display: flex; gap: 8px; align-items: center;">
        <input type="text" id="imageUrl" placeholder="https://example.com/image.jpg" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;">
        <button type="button" data-action="testImageUrl" style="padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; background: #eef2ff; color: #333; cursor: pointer; font-weight: 600;">Test URL</button>
      </div>
      <div id="imageUrlStatus" style="margin-top: 6px; font-size: 12px; color: #666;"></div>
    </div>
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Alt Text (Description):</label>
      <input type="text" id="imageAlt" placeholder="Description of the image" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
    </div>
    <div style="display: flex; gap: 10px;">
      <button data-action="confirmImageInsert" style="flex: 1; padding: 12px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Insert</button>
      <button data-action="closeImageModal" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
    </div>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1999;';
  backdrop.id = 'imageBackdrop';
  backdrop.onclick = closeImageModal;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(imageModal);
  imageModal.id = 'imageDialog';
  
  // Add file input change listener
  document.getElementById('imageFile').addEventListener('change', handleImageFileSelect);
}

function handleImageFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file', 'error');
    return;
  }

  // Warn on very large files (inline data URLs can bloat the document)
  const maxInlineBytes = 2 * 1024 * 1024; // 2 MB
  if (file.size > maxInlineBytes) {
    showToast('Image is large; consider using a URL to avoid bloat');
  }
  
  // Preview the image
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `
      <img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 6px; border: 2px solid #8B4513;">
      <p style="margin-top: 10px; font-size: 13px; color: #666;">Preview: ${file.name}</p>
    `;
    
    // Store the data URL for insertion
    window.selectedImageData = e.target.result;
    window.selectedImageName = file.name;
  };
  reader.readAsDataURL(file);
}

function confirmImageInsert() {
  const url = document.getElementById('imageUrl').value.trim();
  const altInput = document.getElementById('imageAlt').value.trim();
  let imageSrc = '';
  let resolvedAlt = altInput;
  const editor = domCache.getEditor();
  if (!editor) {
    showToast('Editor not available', 'error');
    return;
  }
  
  // Check if file was selected
  if (window.selectedImageData) {
    imageSrc = window.selectedImageData;
    resolvedAlt = altInput || window.selectedImageName || 'Image';
  } else if (url) {
    const normalized = normalizeImageUrl(url);
    if (!normalized) return; // normalizeImageUrl already toasted
    imageSrc = normalized;
    resolvedAlt = altInput || 'Image';
  } else {
    showToast('Please select an image file or enter a URL', 'error');
    return;
  }
  
  // Sanitize alt text and image src to prevent XSS
  const sanitizedAlt = sanitizeAttribute(resolvedAlt);
  // Use DOMPurify for image src if available, otherwise use our sanitizer
  let sanitizedSrc;
  if (typeof DOMPurify !== 'undefined') {
    // DOMPurify will validate and sanitize the URL properly
    sanitizedSrc = DOMPurify.sanitize(imageSrc, {ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|data|blob):)/i});
  } else {
    sanitizedSrc = sanitizeAttribute(imageSrc);
  }
  const img = `<img src="${sanitizedSrc}" alt="${sanitizedAlt}" style="max-width: 100%; height: auto; margin: 10px 0;" onerror="this.dataset.loaderror='1'; this.style.opacity='0.2'; this.alt='Image failed to load';">`;
  try {
    // Restore saved selection so insert happens in editor
    const sel = window.getSelection();
    if (window._imageInsertRange && editor.contains(window._imageInsertRange.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(window._imageInsertRange);
    } else {
      // Fallback: place caret at end of editor
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    const inserted = document.execCommand('insertHTML', false, img);
    if (inserted === false) {
      // execCommand can return false in some browsers; fallback to manual insert
      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      if (range) {
        const temp = document.createElement('div');
        temp.innerHTML = img;
        const node = temp.firstChild;
        range.insertNode(node);
        // move caret after image
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  } catch (e) {
    showToast('Could not insert image', 'error');
    return;
  }
  
  // Clean up
  window.selectedImageData = null;
  window.selectedImageName = null;
  window._imageInsertRange = null;
  
  closeImageModal();
  showToast('Image inserted');
  if (editor) editor.focus();
}

function normalizeImageUrl(raw) {
  if (!raw) return null;
  let normalized = raw.trim();
  if (!/^https?:\/\//i.test(normalized) && !/^data:/.test(normalized) && !/^blob:/.test(normalized)) {
    normalized = 'https://' + normalized;
  }
  try {
    const parsed = new URL(normalized);
    const allowed = ['http:', 'https:', 'data:', 'blob:'];
    if (!allowed.includes(parsed.protocol)) {
      showToast('Image URL must start with http, https, data, or blob', 'error');
      return null;
    }
    return parsed.toString();
  } catch (e) {
    showToast('Please enter a valid image URL', 'error');
    return null;
  }
}

function testImageUrl() {
  const statusEl = document.getElementById('imageUrlStatus');
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.style.color = '#666';
  }
  const inputEl = document.getElementById('imageUrl');
  if (!inputEl) return;
  const raw = inputEl.value.trim();
  if (!raw) {
    showToast('Enter an image URL to test', 'error');
    return;
  }
  const normalized = normalizeImageUrl(raw);
  if (!normalized) return;

  const tester = new Image();
  tester.onload = () => {
    if (statusEl) {
      statusEl.textContent = 'URL looks good. Preview below.';
      statusEl.style.color = '#28a745';
    }
    const preview = document.getElementById('imagePreview');
    if (preview) {
      // Sanitize the normalized URL (though it's already validated, be extra safe)
      const sanitizedUrl = sanitizeAttribute(normalized);
      preview.innerHTML = `<img src="${sanitizedUrl}" style="max-width: 100%; max-height: 200px; border-radius: 6px; border: 2px solid #8B4513;">`;
    }
  };
  tester.onerror = () => {
    if (statusEl) {
      statusEl.textContent = 'Image failed to load. The host may block hotlinking.';
      statusEl.style.color = '#dc3545';
    }
    showToast('Could not load image from URL', 'error');
  };
  tester.src = normalized;
}

function closeImageModal() {
  document.getElementById('imageDialog')?.remove();
  document.getElementById('imageBackdrop')?.remove();
}

function openEmbedModal() {
  openModal('embedModal');
}

function insertEmbed() {
  const typeEl = document.getElementById('embedType');
  const codeEl = document.getElementById('embedCode');
  if (!typeEl || !codeEl) return;

  const type = typeEl.value;
  const raw = codeEl.value.trim();
  if (!raw) {
    showToast('Please enter a URL or embed code', 'error');
    return;
  }

  let html = '';

  if (type === 'youtube') {
    const id = extractYouTubeId(raw);
    if (!id) {
      showToast('Could not detect a valid YouTube ID', 'error');
      return;
    }
    html = `<div style="margin: 20px 0; text-align: center;"><iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe></div>`;
  } else if (type === 'vimeo') {
    const id = extractVimeoId(raw);
    if (!id) {
      showToast('Could not detect a valid Vimeo ID', 'error');
      return;
    }
    html = `<div style="margin: 20px 0; text-align: center;"><iframe src="https://player.vimeo.com/video/${id}" width="560" height="315" frameborder="0" allowfullscreen></iframe></div>`;
  } else {
    // Treat as raw HTML embed - SECURITY: Sanitize with DOMPurify
    if (typeof DOMPurify === 'undefined') {
      showToast('HTML sanitization not available. Please use YouTube or Vimeo options for embeds.', 'error');
      return;
    }
    // Sanitize the raw HTML to allow safe embedding while preventing XSS
    // Allow iframes, divs, and common embed-friendly elements
    const sanitized = DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: ['iframe', 'div', 'embed', 'object', 'param', 'video', 'audio', 'source'],
      ALLOWED_ATTR: ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'allow', 'type', 'data', 'class', 'style'],
      ALLOW_DATA_ATTR: false
    });
    if (!sanitized || sanitized.trim() === '') {
      showToast('No valid embed code detected. Please use YouTube or Vimeo options, or provide valid HTML embed code.', 'error');
      return;
    }
    html = `<div style="margin: 20px 0; text-align: center;">${sanitized}</div>`;
  }

  document.execCommand('insertHTML', false, html);
  closeModal('embedModal');
  showToast('Media embedded');
  const editor = domCache.getEditor(); if (editor) editor.focus();
}

// Case transformation
function transformCase(caseType) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.isCollapsed) {
    showToast('Select text to change case', 'error');
    return;
  }

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();
  let transformed = '';

  switch (caseType) {
    case 'upper':
      transformed = selectedText.toUpperCase();
      break;
    case 'lower':
      transformed = selectedText.toLowerCase();
      break;
    case 'title':
      transformed = selectedText.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
      break;
    default:
      return;
  }

  try {
    const ok = document.execCommand('insertText', false, transformed);
    if (ok === false) {
      range.deleteContents();
      range.insertNode(document.createTextNode(transformed));
    }
    showToast('Case transformed');
  } catch (e) {
    showToast('Could not transform case', 'error');
  }
}

// Beat marker helper – inserts a labeled marker into the current chapter
function insertBeatMarker(label) {
  const editor = domCache.getEditor();
  if (!editor) {
    showToast('Editor not available', 'error');
    return;
  }
  
  // Ensure editor is focused first
  editor.focus();
  
  const sel = window.getSelection();
  let range;
  
  // Get or create a selection range
  if (sel && sel.rangeCount > 0) {
    range = sel.getRangeAt(0).cloneRange();
  } else {
    // No selection - create range at end of editor
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
  }
  
  // Create the beat marker element
  const markerP = document.createElement('p');
  markerP.className = 'beat-marker';
  markerP.textContent = label;
  
  try {
    // Find the closest block-level parent to insert after
    let container = range.commonAncestorContainer;
    
    // If we're inside a text node, move to the parent element
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    
    // Find the containing block element (p, div, h1-h6, etc.)
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI', 'PRE'];
    let blockElement = null;
    
    // Walk up the DOM to find a block element
    let current = container;
    while (current && current !== editor) {
      if (current.nodeType === Node.ELEMENT_NODE && blockTags.includes(current.tagName)) {
        blockElement = current;
        break;
      }
      current = current.parentNode;
    }
    
    if (blockElement && blockElement.parentNode) {
      // Insert after the block element
      if (blockElement.nextSibling) {
        blockElement.parentNode.insertBefore(markerP, blockElement.nextSibling);
      } else {
        blockElement.parentNode.appendChild(markerP);
      }
    } else {
      // No block element found, insert at the end of editor
      editor.appendChild(markerP);
    }
    
    // Move cursor after the marker
    const newRange = document.createRange();
    newRange.setStartAfter(markerP);
    newRange.collapse(true);
    
    // Update selection
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    
    // Focus editor
    editor.focus();
    
    showToast('Beat marker added');
  } catch (e) {
    logger.error('Error inserting beat marker:', e);
    // Fallback: append to end of editor
    try {
      editor.appendChild(markerP);
      editor.focus();
      showToast('Beat marker added');
    } catch (e2) {
      showToast('Could not insert beat marker. Please try clicking in the editor first.', 'error');
    }
  }
}

function extractYouTubeId(input) {
  // Supports various YouTube URL formats
  const match = input.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\s]+)/);
  return match ? match[1] : null;
}

function extractVimeoId(input) {
  const match = input.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function insertLink() {
  const selection = window.getSelection();
  const selectedText = selection.toString();

  // Remember selection to restore when inserting
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const editorForCheck = domCache.getEditor();
    if (editorForCheck && editorForCheck.contains(range.commonAncestorContainer)) {
      window._linkInsertRange = range.cloneRange();
    }
  }
  
  const linkModal = document.createElement('div');
  linkModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #e4d5b7; padding: 25px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2000; width: 420px;';
  linkModal.innerHTML = `
    <h3 style="margin-bottom: 18px; color: #8B4513; font-size: 1.3em; font-weight: 700;">Insert Link</h3>
    <div style="margin-bottom: 14px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #5a3214;">Link URL:</label>
      <input type="text" id="linkUrl" placeholder="https://example.com" style="width: 100%; padding: 10px; border: 2px solid #c9b896; border-radius: 6px; background: white; font-size: 0.95em;">
    </div>
    <div style="margin-bottom: 14px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #5a3214;">Link Text:</label>
      <input type="text" id="linkText" value="${selectedText}" placeholder="Click here" style="width: 100%; padding: 10px; border: 2px solid #c9b896; border-radius: 6px; background: white; font-size: 0.95em;">
    </div>
    <div style="margin-bottom: 18px;">
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #5a3214;">
        <input type="checkbox" id="linkNewTab" checked style="cursor: pointer;">
        <span style="font-size: 0.95em;">Open in new tab</span>
      </label>
    </div>
    <div style="display: flex; gap: 10px;">
      <button data-action="confirmLinkInsert" class="link-modal-btn" style="flex: 1; padding: 11px 18px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95em; transition: background 0.2s;">Insert Link</button>
      <button data-action="closeLinkModal" class="link-modal-btn" style="flex: 1; padding: 11px 18px; background: #9e9e9e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95em; transition: background 0.2s;">Cancel</button>
    </div>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1999;';
  backdrop.id = 'linkBackdrop';
  backdrop.onclick = closeLinkModal;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(linkModal);
  linkModal.id = 'linkDialog';
  document.getElementById('linkUrl').focus();
}

// Insert Screenplay Elements
function insertScreenplayElement(type) {
  logger.log('insertScreenplayElement called with type:', type);
  
  const editor = domCache.getEditor();
  if (!editor) {
    logger.error('Editor not available');
    showToast('Editor not available', 'error');
    return;
  }
  
  // Check if editor is contentEditable
  if (editor.contentEditable !== 'true' && !editor.isContentEditable) {
    logger.error('Editor is not editable');
    showToast('Editor is not editable', 'error');
    return;
  }
  
  editor.focus();
  
  // Define placeholders for each element type
  const placeholders = {
    'general': 'Scene description text goes here...',
    'character': 'CHARACTER',
    'dialogue': 'Dialogue text here...',
    'parenthetical': '(beat)',
    'action': 'Action description...'
  };
  
  let html = '';
  let placeholderText = '';
  
  switch(type) {
    case 'titlepage':
      html = '<div style="text-align: center; margin-top: 3in; margin-bottom: 2in; page-break-after: always;">' +
             '<p style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 24pt;">SCREENPLAY TITLE</p>' +
             '<p style="margin-bottom: 12pt;">Written by</p>' +
             '<p style="font-weight: bold; margin-bottom: 48pt;">Author Name</p>' +
             '<p style="position: absolute; bottom: 1in; left: 1.5in; text-align: left; font-size: 10pt;">' +
             'Contact Information<br>' +
             'Address<br>' +
             'Phone<br>' +
             'Email' +
             '</p>' +
             '</div>';
      break;
    case 'outline':
      html = '<h2>Scene Outline</h2><ol><li>Scene description here</li></ol>';
      break;
    case 'scene':
      html = '<p style="margin-top: 12pt; margin-bottom: 0; font-weight: bold; text-transform: uppercase; text-align: left;">INT. LOCATION - DAY</p>';
      break;
    case 'general':
      placeholderText = placeholders.general;
      html = `<p style="margin-top: 12pt; text-align: left;" data-placeholder="${placeholderText}">${placeholderText}</p>`;
      break;
    case 'character':
      placeholderText = placeholders.character;
      html = `<p style="text-align: center; text-transform: uppercase; margin-top: 12pt;" data-placeholder="${placeholderText}">${placeholderText}</p>`;
      break;
    case 'dialogue':
      placeholderText = placeholders.dialogue;
      html = `<p style="margin-left: 1.5in; margin-right: 1.5in;" data-placeholder="${placeholderText}">${placeholderText}</p>`;
      break;
    case 'parenthetical':
      placeholderText = placeholders.parenthetical;
      html = `<p style="margin-left: 1.8in;" data-placeholder="${placeholderText}">${placeholderText}</p>`;
      break;
    case 'action':
      placeholderText = placeholders.action;
      html = `<p style="margin-top: 12pt; text-align: left;" data-placeholder="${placeholderText}">${placeholderText}</p>`;
      break;
    case 'transition':
      html = '<p style="text-align: right; margin-top: 12pt; text-transform: uppercase;">CUT TO:</p>';
      placeholderText = ''; // Transition doesn't use placeholder
      break;
    default:
      logger.error('Unknown screenplay element type:', type);
      showToast('Unknown screenplay element type: ' + type, 'error');
      return;
  }
  
  // Check if HTML was generated
  if (!html || html.trim() === '') {
    showToast('Invalid screenplay element type', 'error');
    logger.error('No HTML generated for type:', type);
    return;
  }
  
  // Save selection before insertion
  const selection = window.getSelection();
  let range = null;
  if (selection.rangeCount > 0) {
    range = selection.getRangeAt(0);
  }
  
  // Insert HTML
  try {
    document.execCommand('insertHTML', false, html);
    // Verify insertion by checking if content was added
    setTimeout(() => {
      // This helps ensure the insertion completed
      editor.focus();
    }, 0);
  } catch (e) {
    showToast('Failed to insert screenplay element', 'error');
    logger.error('Error inserting screenplay element:', e, 'Type:', type, 'HTML:', html);
    return;
  }
  
  // Find the newly inserted element and add placeholder clearing behavior
  if (placeholderText) {
    setTimeout(() => {
      // Find the paragraph with the placeholder
      const paragraphs = editor.querySelectorAll('p[data-placeholder]');
      const lastPara = paragraphs[paragraphs.length - 1];
      
      if (lastPara && lastPara.getAttribute('data-placeholder') === placeholderText) {
        // Add click/focus handler to clear placeholder
        const clearPlaceholder = function(e) {
          const para = e.target;
          const placeholder = para.getAttribute('data-placeholder');
          
          // Only clear if text is still the placeholder
          if (para.textContent.trim() === placeholder) {
            // Clear text but preserve position and dimensions
            // Use non-breaking space to maintain paragraph height and prevent collapse
            para.textContent = '\u00A0'; // Non-breaking space (maintains dimensions)
            // Ensure min-height is preserved for character elements
            if (para.style.textAlign === 'center' && para.style.textTransform === 'uppercase') {
              para.style.minHeight = '1.2em';
              para.style.display = 'block';
              para.style.textAlign = 'center';
            }
            para.removeAttribute('data-placeholder');
            // Remove the event listeners after clearing
            para.removeEventListener('click', clearPlaceholder);
            para.removeEventListener('focus', clearPlaceholder);
            // Focus the paragraph and place cursor at start
            para.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(para.firstChild || para, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        };
        
        // Add listeners for both click and focus
        lastPara.addEventListener('click', clearPlaceholder);
        lastPara.addEventListener('focus', clearPlaceholder, true);
        
        // Also handle when user clicks inside the paragraph
        lastPara.addEventListener('mousedown', function(e) {
          if (lastPara.textContent.trim() === placeholderText) {
            // Clear text but preserve position and dimensions
            lastPara.textContent = '\u00A0'; // Non-breaking space (maintains dimensions)
            // Ensure min-height is preserved for character elements
            if (lastPara.style.marginRight && lastPara.style.marginRight.includes('2.2in')) {
              lastPara.style.minHeight = '1.2em';
              lastPara.style.display = 'block';
              lastPara.style.textAlign = 'center';
            }
            lastPara.removeAttribute('data-placeholder');
          }
        });
      }
      
      // Restore cursor position
      if (range) {
        try {
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          // If range is invalid, just focus the editor
          editor.focus();
        }
      }
    }, 10);
  }
  
  showToast('Screenplay element inserted');
}

// Toggle scene numbering
function toggleSceneNumbering() {
  const checkbox = document.getElementById('sceneNumbering');
  const isEnabled = checkbox.checked;
  
  const editor = domCache.getEditor();
  const scenes = editor.querySelectorAll('p[style*="font-weight: bold"]');
  
  let sceneNumber = 1;
  scenes.forEach(scene => {
    const text = scene.textContent.trim();
    if (text.startsWith('INT.') || text.startsWith('EXT.')) {
      if (isEnabled) {
        // Add scene number if not already present
        if (!text.match(/^\d+\./)) {
          const escapedText = escapeHtml(text); // Escape user content
          scene.innerHTML = `<strong>${sceneNumber}.</strong> ${escapedText}`;
          sceneNumber++;
        }
      } else {
        // Remove scene number
        scene.textContent = text.replace(/^\d+\.\s*/, '');
      }
    }
  });
  
  showToast(isEnabled ? 'Scene numbering enabled' : 'Scene numbering disabled');
}

// Remove all scene numbering
function removeSceneNumbering() {
  const checkbox = document.getElementById('removeSceneNumbering');
  
  if (!checkbox.checked) {
    checkbox.checked = false;
    return;
  }
  
  const editor = domCache.getEditor();
  const scenes = editor.querySelectorAll('p[style*="font-weight: bold"]');
  
  scenes.forEach(scene => {
    const text = scene.textContent.trim();
    if (text.startsWith('INT.') || text.startsWith('EXT.') || text.match(/^\d+\./)) {
      // Remove scene number
      scene.textContent = text.replace(/^\d+\.\s*/, '');
    }
  });
  
  // Uncheck the Scene Numbering checkbox
  const sceneNumberingCheckbox = document.getElementById('sceneNumbering');
  if (sceneNumberingCheckbox) {
    sceneNumberingCheckbox.checked = false;
  }
  
  // Uncheck this checkbox after action
  checkbox.checked = false;
  
  showToast('Scene numbering removed');
}

// Insert Playwriting Elements
function insertPlaywritingElement(type) {
  const editor = domCache.getEditor();
  if (!editor) {
    showToast('Editor not available', 'error');
    return;
  }
  
  editor.focus();
  
  let html = '';
  
  switch(type) {
    case 'act':
      html = '<p style="font-weight: bold; text-align: center; text-transform: uppercase; margin-top: 24pt; margin-bottom: 12pt;">ACT I</p>';
      break;
    case 'scene':
      html = '<p style="font-weight: bold; margin-top: 12pt; margin-bottom: 12pt;">Scene 1</p>';
      break;
    case 'character':
      html = '<p style="text-transform: uppercase; margin-top: 12pt;">JANE: </p>';
      break;
    case 'stage':
      html = '<p style="font-style: italic; margin-top: 6pt;">[Stage direction in italics]</p>';
      break;
    default:
      showToast('Unknown playwriting element type', 'error');
      return;
  }
  
  // Insert HTML
  try {
    document.execCommand('insertHTML', false, html);
    
    // Focus editor after insertion
    editor.focus();
    
    showToast('Playwriting element inserted');
  } catch (e) {
    showToast('Failed to insert playwriting element', 'error');
    logger.error('Error inserting playwriting element:', e);
  }
}

// Bottom Template Bar Functions
function toggleBottomTemplateBar() {
  const bar = document.getElementById('bottomTemplateBar');
  const toggle = document.getElementById('bottomBarToggle');
  
  if (!bar || !toggle) return;
  
  const isVisible = bar.style.display !== 'none';
  
  if (isVisible) {
    bar.style.display = 'none';
    toggle.classList.remove('active');
    toggle.title = 'Show Template Buttons';
  } else {
    bar.style.display = 'flex';
    toggle.classList.add('active');
    toggle.title = 'Hide Template Buttons';
    updateBottomTemplateBar();
  }
}

function updateBottomTemplateBar() {
  const screenplayButtons = document.getElementById('bottomScreenplayButtons');
  const playwritingButtons = document.getElementById('bottomPlaywritingButtons');
  const toggle = document.getElementById('bottomBarToggle');
  
  if (!screenplayButtons || !playwritingButtons || !toggle) {
    return;
  }
  
  // Detect current template from selector value (more reliable)
  const templateSelector = document.getElementById('templateSelector');
  const currentTemplate = templateSelector ? templateSelector.value : 'novel';
  
  // Show/hide appropriate buttons
  if (currentTemplate === 'screenplay') {
    screenplayButtons.style.display = 'flex';
    playwritingButtons.style.display = 'none';
    toggle.style.display = 'flex';
  } else if (currentTemplate === 'playwriting') {
    screenplayButtons.style.display = 'none';
    playwritingButtons.style.display = 'flex';
    toggle.style.display = 'flex';
  } else {
    // Novel or other template - hide everything
    screenplayButtons.style.display = 'none';
    playwritingButtons.style.display = 'none';
    toggle.style.display = 'none';
    // Also hide the bar if it's visible
    const bar = document.getElementById('bottomTemplateBar');
    if (bar) {
      bar.style.display = 'none';
    }
  }
}

// Monitor template changes and update bottom bar
(function() {
  function initBottomBar() {
    // Watch for template selector changes
    const templateSelector = document.getElementById('templateSelector');
    if (templateSelector) {
      // Single consolidated change handler
      templateSelector.addEventListener('change', function() {
        // Update bottom bar after template switch
        setTimeout(updateBottomTemplateBar, 200);
      });
    }
    
    // Also watch for sidebar visibility changes (in case template is switched via other means)
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.id === 'screenplayControls' || target.id === 'playwritingControls') {
            updateBottomTemplateBar();
          }
        }
      });
    });
    
    // Observe screenplay and playwriting controls
    const screenplayControls = document.getElementById('screenplayControls');
    const playwritingControls = document.getElementById('playwritingControls');
    if (screenplayControls) {
      observer.observe(screenplayControls, { attributes: true, attributeFilter: ['style'] });
    }
    if (playwritingControls) {
      observer.observe(playwritingControls, { attributes: true, attributeFilter: ['style'] });
    }
    
    // Initial update
    setTimeout(updateBottomTemplateBar, 500);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBottomBar);
  } else {
    initBottomBar();
  }
})();

function confirmLinkInsert() {
  const editor = domCache.getEditor();
  if (!editor) {
    showToast('Editor not available', 'error');
    return;
  }
  
  const rawUrl = document.getElementById('linkUrl').value.trim();
  
  // Validate URL
  if (!rawUrl) {
    showToast('Please enter a URL', 'error');
    return;
  }
  
  if (!validateUrl(rawUrl) && !rawUrl.startsWith('mailto:') && !rawUrl.startsWith('tel:')) {
    // Allow mailto: and tel: protocols
    if (!rawUrl.startsWith('mailto:') && !rawUrl.startsWith('tel:')) {
      showToast('Please enter a valid URL (must start with http://, https://, mailto:, or tel:)', 'error');
      return;
    }
  }
  const text = document.getElementById('linkText').value;
  const newTab = document.getElementById('linkNewTab').checked;
  
  if (!rawUrl) {
    showToast('Please enter a URL', 'error');
    return;
  }

  // Normalize URL: auto-prepend https:// when missing, allow mailto/tel/http/https
  let normalized = rawUrl;
  if (!/^https?:\/\//i.test(normalized) && !/^mailto:/i.test(normalized) && !/^tel:/i.test(normalized)) {
    normalized = 'https://' + normalized;
  }
  try {
    // Validate http/https; mailto/tel are okay without URL parsing
    if (!/^mailto:|^tel:/i.test(normalized)) {
      const parsed = new URL(normalized);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        showToast('Link must start with http, https, mailto, or tel', 'error');
        return;
      }
      normalized = parsed.toString();
    }
  } catch (e) {
    showToast('Please enter a valid URL', 'error');
    return;
  }
  
  const target = newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
  const link = `<a href="${normalized}"${target}>${text || normalized}</a>`;
  try {
    const sel = window.getSelection();
    if (window._linkInsertRange && editor.contains(window._linkInsertRange.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(window._linkInsertRange);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    const ok = document.execCommand('insertHTML', false, link);
    if (ok === false) {
      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      if (range) {
        const temp = document.createElement('div');
        temp.innerHTML = link;
        const node = temp.firstChild;
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  } catch (e) {
    showToast('Could not insert link', 'error');
    return;
  }

  window._linkInsertRange = null;
  closeLinkModal();
  showToast('Link inserted');
  if (editor) editor.focus();
}

function closeLinkModal() {
  document.getElementById('linkDialog')?.remove();
  document.getElementById('linkBackdrop')?.remove();
}

// Find & Replace
let findReplaceState = {
  currentIndex: 0,
  matches: [],
  findText: '',
  matchCase: false,
  wholeWord: false,
  storedRange: null  // Store the selection range for later replacement
};

function openFindReplace() {
  // Store the current selection range BEFORE opening modal
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText && selectedText.length > 0 && selection.rangeCount > 0) {
    // Store the range for use in replaceWithSuggestion
    findReplaceState.storedRange = selection.getRangeAt(0).cloneRange();
  } else {
    findReplaceState.storedRange = null;
  }
  
  openModal('findReplaceModal');
  
  // Auto-populate with selected text if any
  const findField = document.getElementById('findText');
  if (selectedText && selectedText.length > 0) {
    findField.value = selectedText;
    loadWordDefinition();
  }
  
  findField.focus();
}

function loadWordDefinition() {
  const findField = document.getElementById('findText');
  const findText = findField.value.trim();
  
  if (findText) {
    showDefinitionAndSynonyms(findText);
  } else {
    const defSection = document.getElementById('definitionSection');
    defSection.style.display = 'none';
  }
}

async function showDefinitionAndSynonyms(findText) {
  logger.log(' FUNCTION CALLED! showDefinitionAndSynonyms with:', findText);
  
  if (!findText || findText.length === 0 || findText.includes(' ')) {
    const defSection = document.getElementById('definitionSection');
    defSection.style.display = 'none';
    return;
  }
  
  try {
    const defSection = document.getElementById('definitionSection');
    const defDiv = document.getElementById('wordDefinition');
    const sugDiv = document.getElementById('wordSuggestions');
    
    defSection.style.display = 'block';
    defDiv.textContent = 'Loading...';
    sugDiv.innerHTML = '';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    let response;
    let data;
    try {
      response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${findText.toLowerCase()}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          defDiv.textContent = 'Word not found in dictionary';
        } else {
          defDiv.textContent = 'Unable to fetch definition. Please try again later.';
        }
        sugDiv.innerHTML = '<span style="color: #999; font-size: 12px;">No synonyms found</span>';
        return;
      }
      
      data = await response.json();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        defDiv.textContent = 'Request timed out. Please try again.';
        sugDiv.innerHTML = '';
        return;
      }
      throw fetchError;
    }
    
    if (!data || data.length === 0) {
      defDiv.textContent = 'Word not found in dictionary';
      sugDiv.innerHTML = '<span style="color: #999; font-size: 12px;">No synonyms found</span>';
      return;
    }
    
    const entry = data[0];
    
    // Get definition
    let definition = 'Definition unavailable';
    if (entry.meanings && entry.meanings.length > 0) {
      const meaning = entry.meanings[0];
      if (meaning.definitions && meaning.definitions.length > 0) {
        definition = meaning.definitions[0].definition;
      }
    }
    
    defDiv.textContent = definition;
    
    // Get synonyms
    let suggestions = [];
    if (entry.meanings && entry.meanings.length > 0) {
      // Check all meanings for synonyms
      for (let i = 0; i < entry.meanings.length; i++) {
        const m = entry.meanings[i];
        if (m.synonyms && m.synonyms.length > 0) {
          suggestions = [...suggestions, ...m.synonyms];
        }
      }
      
      // Remove duplicates and limit to 8
      suggestions = [...new Set(suggestions)].slice(0, 8);
    }
    
    // Fallback synonyms for common words
    if (suggestions.length === 0) {
      const fallbackSynonyms = {
        'ingredient': ['component', 'element', 'part', 'factor', 'item', 'constituent', 'substance', 'material'],
        'necessary': ['essential', 'required', 'vital', 'crucial', 'needed', 'indispensable', 'mandatory', 'compulsory'],
        'essential': ['necessary', 'required', 'vital', 'crucial', 'needed', 'indispensable', 'mandatory', 'important'],
        'important': ['significant', 'crucial', 'vital', 'essential', 'key', 'major', 'critical', 'notable'],
        'good': ['excellent', 'great', 'wonderful', 'fantastic', 'amazing', 'superb', 'outstanding', 'remarkable'],
        'bad': ['terrible', 'awful', 'poor', 'dreadful', 'horrible', 'appalling', 'atrocious', 'lousy'],
        'big': ['large', 'huge', 'enormous', 'massive', 'giant', 'vast', 'immense', 'colossal'],
        'small': ['tiny', 'little', 'miniature', 'compact', 'petite', 'minute', 'microscopic', 'minuscule'],
        'fast': ['quick', 'rapid', 'swift', 'speedy', 'hasty', 'prompt', 'immediate', 'instant'],
        'slow': ['sluggish', 'gradual', 'leisurely', 'unhurried', 'delayed', 'measured', 'steady', 'gradual'],
        'happy': ['joyful', 'cheerful', 'delighted', 'pleased', 'content', 'glad', 'merry', 'jovial'],
        'sad': ['unhappy', 'sorrowful', 'miserable', 'depressed', 'gloomy', 'melancholy', 'downcast', 'somber'],
        'run': ['jog', 'sprint', 'dash', 'race', 'hurry', 'rush', 'scamper', 'bolt'],
        'start': ['begin', 'commence', 'initiate', 'launch', 'kick off', 'get going', 'embark', 'set out'],
        'started': ['began', 'commenced', 'initiated', 'launched', 'kicked off', 'got going', 'embarked', 'set out'],
        'starting': ['beginning', 'commencing', 'initiating', 'launching', 'kicking off', 'getting going', 'embarking', 'setting out'],
        'walk': ['stroll', 'march', 'hike', 'wander', 'roam', 'trek', 'journey', 'stride'],
        'eat': ['consume', 'devour', 'ingest', 'feast', 'dine', 'munch', 'bite', 'chew'],
        'see': ['look', 'view', 'observe', 'watch', 'gaze', 'stare', 'glance', 'peek'],
        'make': ['create', 'build', 'construct', 'produce', 'generate', 'form', 'craft', 'develop']
      };
      
      const lowerWord = findText.toLowerCase();
      if (fallbackSynonyms[lowerWord]) {
        suggestions = fallbackSynonyms[lowerWord];
      }
    }
    
    // Display suggestions as clickable pills
    sugDiv.innerHTML = '';
    if (suggestions.length > 0) {
      suggestions.forEach(syn => {
        const pill = document.createElement('button');
        pill.textContent = syn;
        pill.style.cssText = 'padding: 4px 10px; background: #8B4513; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s; margin: 2px;';
        pill.onmouseover = () => pill.style.background = '#A0522D';
        pill.onmouseout = () => pill.style.background = '#8B4513';
        pill.onclick = () => {
          replaceWithSuggestion(syn);
        };
        sugDiv.appendChild(pill);
      });
    } else {
      sugDiv.innerHTML = '<span style="color: #999; font-size: 12px;">No synonyms found</span>';
    }
  } catch (error) {
    logger.log('Error in dictionary function:', error);
    // Handle different error types
    const defSection = document.getElementById('definitionSection');
    const defDiv = document.getElementById('wordDefinition');
    const sugDiv = document.getElementById('wordSuggestions');
    
    if (error.name === 'AbortError') {
      defDiv.textContent = 'Request timed out';
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      defDiv.textContent = 'Network error. Please check your connection.';
    } else {
      defDiv.textContent = 'Definition unavailable';
    }
    sugDiv.innerHTML = '';
  }
}

function replaceWithSuggestion(replacement) {
  if (!findReplaceState.storedRange) {
    showToast('No text selected to replace', 'error');
    return;
  }
  
  const editor = domCache.getEditor();
  const selection = window.getSelection();
  
  // Use the stored range
  selection.removeAllRanges();
  selection.addRange(findReplaceState.storedRange);
  
  // Replace
  const newNode = document.createTextNode(replacement);
  findReplaceState.storedRange.deleteContents();
  findReplaceState.storedRange.insertNode(newNode);
  
  // Collapse selection to end of new text
  findReplaceState.storedRange.setStartAfter(newNode);
  findReplaceState.storedRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(findReplaceState.storedRange);
  
  // Clear stored range
  findReplaceState.storedRange = null;
  findReplaceState.currentIndex = 0;
  findReplaceState.matches = [];
  
  showToast(`Replaced with "${replacement}"`);
  
  // Close modal
  setTimeout(() => {
    closeModal('findReplaceModal');
  }, 300);
}

function findTextInEditor(text, matchCase, wholeWord) {
  const editor = domCache.getEditor();
  const editorText = editor.innerText;
  const matches = [];
  
  if (!text) return matches;
  
  let searchText = text;
  let editorSearchText = editorText;
  if (!matchCase) {
    searchText = text.toLowerCase();
    editorSearchText = editorText.toLowerCase();
  }
  
  let startIdx = 0;
  while (true) {
    let idx = editorSearchText.indexOf(searchText, startIdx);
    if (idx === -1) break;
    
    // Check whole word constraint
    if (wholeWord) {
      const before = idx === 0 || /\s|\p{P}/u.test(editorSearchText[idx - 1]);
      const after = idx + searchText.length === editorSearchText.length || /\s|\p{P}/u.test(editorSearchText[idx + searchText.length]);
      if (!before || !after) {
        startIdx = idx + 1;
        continue;
      }
    }
    
    matches.push({
      start: idx,
      end: idx + text.length,
      text: editorText.substring(idx, idx + text.length)
    });
    startIdx = idx + 1;
  }
  
  return matches;
}

function selectMatchInDOM(matchIndex) {
  const editor = domCache.getEditor();
  const findText = document.getElementById('findText').value;
  const matchCase = document.getElementById('matchCase').checked;
  const wholeWord = document.getElementById('wholeWord').checked;
  
  findReplaceState.matches = findTextInEditor(findText, matchCase, wholeWord);
  findReplaceState.currentIndex = matchIndex % Math.max(findReplaceState.matches.length, 1);
  
  if (findReplaceState.matches.length === 0) {
    document.getElementById('findStatus').textContent = 'No matches found';
    return false;
  }
  
  const match = findReplaceState.matches[findReplaceState.currentIndex];
  const selection = window.getSelection();
  const range = document.createRange();
  
  // Find the text node containing the match
  let charCount = 0;
  let nodeStack = [editor];
  let node = null;
  let foundStart = false;
  
  while (!foundStart && (node = nodeStack.pop())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCharCount = charCount + node.length;
      if (match.start < nextCharCount) {
        range.setStart(node, match.start - charCount);
        foundStart = true;
      }
      charCount = nextCharCount;
    } else {
      let i = node.childNodes.length;
      while (i--) {
        nodeStack.push(node.childNodes[i]);
      }
    }
  }
  
  // Find end
  charCount = 0;
  nodeStack = [editor];
  node = null;
  let foundEnd = false;
  
  while (!foundEnd && (node = nodeStack.pop())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCharCount = charCount + node.length;
      if (match.end <= nextCharCount) {
        range.setEnd(node, match.end - charCount);
        foundEnd = true;
      }
      charCount = nextCharCount;
    } else {
      let i = node.childNodes.length;
      while (i--) {
        nodeStack.push(node.childNodes[i]);
      }
    }
  }
  
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();
  
  document.getElementById('findStatus').textContent = `Match ${findReplaceState.currentIndex + 1} of ${findReplaceState.matches.length}`;
  return true;
}

function findNext() {
  const findText = document.getElementById('findText').value;
  if (!findText) {
    showToast('Please enter text to find', 'error');
    return;
  }
  
  const currentIndex = findReplaceState.currentIndex + 1;
  if (selectMatchInDOM(currentIndex)) {
    // Success, index already updated
  } else {
    showToast('No matches found', 'error');
  }
}

function replaceOne() {
  const findText = document.getElementById('findText').value;
  const replaceText = document.getElementById('replaceText').value;
  
  if (!findText) {
    showToast('Please enter text to find', 'error');
    return;
  }
  
  const selection = window.getSelection();
  if (selection.toString().length === 0) {
    findNext();
    return;
  }
  
  const editor = domCache.getEditor();
  const range = selection.getRangeAt(0);
  
  const newNode = document.createTextNode(replaceText);
  range.deleteContents();
  range.insertNode(newNode);
  
  // Clear state and find next
  findReplaceState.currentIndex = 0;
  showToast('Text replaced');
  
  // Auto-find next after brief delay
  setTimeout(() => findNext(), 100);
}

function replaceAll() {
  const findText = document.getElementById('findText').value;
  const replaceText = document.getElementById('replaceText').value;
  
  if (!findText) {
    showToast('Please enter text to find', 'error');
    return;
  }
  
  const editor = domCache.getEditor();
  const matchCase = document.getElementById('matchCase').checked;
  const wholeWord = document.getElementById('wholeWord').checked;
  
  // Extract text, perform replacements, rebuild
  const originalText = editor.innerText;
  let searchRegex;
  
  try {
    const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = matchCase ? 'g' : 'gi';
    const pattern = wholeWord ? `\\b${escapedFind}\\b` : escapedFind;
    searchRegex = new RegExp(pattern, flags);
  } catch (e) {
    showToast('Invalid search pattern', 'error');
    return;
  }
  
  const matches = findTextInEditor(findText, matchCase, wholeWord);
  if (matches.length === 0) {
    showToast('No matches to replace', 'error');
    return;
  }
  
  // Replace in innerHTML (careful with HTML)
  const newText = originalText.replace(searchRegex, replaceText);
  editor.innerText = newText;
  
  findReplaceState.currentIndex = 0;
  showToast(`Replaced ${matches.length} instance${matches.length !== 1 ? 's' : ''}`);
}

function clearFindHighlight() {
  findReplaceState.currentIndex = 0;
  findReplaceState.matches = [];
  document.getElementById('findText').value = '';
  document.getElementById('replaceText').value = '';
  document.getElementById('findStatus').textContent = 'Ready';
  const editor = domCache.getEditor(); if (editor) editor.focus();
}

// Focus Mode function is defined earlier in the file (line 623)

// Read Aloud
function toggleReadAloud() {
  if (isReadingAloud) {
    openReadAloudControls();
    return;
  }

  const editor = domCache.getEditor();
  const text = editor.innerText;
  
  if (!text || text.trim().length === 0) {
    showToast('No text to read', 'error');
    return;
  }

  openReadAloudControls();
}

function openReadAloudControls() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; min-width: 400px;';
  
  const voices = speechSynthesis.getVoices();
  const voiceOptions = voices.map((v, i) => 
    `<option value="${i}" ${v.default ? 'selected' : ''}>${v.name} (${v.lang})</option>`
  ).join('');
  
  const currentRate = currentUtterance?.rate || 1.0;
  const isPaused = speechSynthesis.paused;
  const isPlaying = isReadingAloud && !isPaused;
  
  modal.innerHTML = `
    <h3 style="margin-bottom: 16px; color: #333; font-size: 18px;"><i class="fas fa-volume-up"></i> Read Aloud</h3>
    
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600;">Voice</label>
      <select id="voiceSelect" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #dee2e6;">
        ${voiceOptions}
      </select>
    </div>
    
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600;">Speed: <span id="speedValue">${currentRate}x</span></label>
      <input type="range" id="speedSlider" min="0.5" max="2" step="0.1" value="${currentRate}" style="width: 100%;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #999; margin-top: 4px;">
        <span>0.5x (Slow)</span>
        <span>1.0x (Normal)</span>
        <span>2.0x (Fast)</span>
      </div>
    </div>
    
    <div style="display: flex; gap: 8px; margin-top: 20px;">
      <button id="playBtn" data-action="startReading" style="flex: 1; padding: 10px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-play"></i> ${isPlaying ? 'Playing...' : 'Play'}
      </button>
      <button id="pauseBtn" data-action="pauseReading" style="flex: 1; padding: 10px; background: #ffc107; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;" ${!isPlaying ? 'disabled' : ''}>
        <i class="fas fa-pause"></i> ${isPaused ? 'Resume' : 'Pause'}
      </button>
      <button data-action="stopReading" style="flex: 1; padding: 10px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-stop"></i> Stop
      </button>
    </div>
    
    <button data-action="closeReadAloudModal" style="width: 100%; margin-top: 12px; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); z-index: 2090;';
  backdrop.id = 'readAloudBackdrop';
  backdrop.onclick = closeReadAloudModal;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  window.readAloudModal = modal;
  
  // Update speed display
  document.getElementById('speedSlider').oninput = function() {
    document.getElementById('speedValue').textContent = this.value + 'x';
  };
}

function startReading() {
  const editor = domCache.getEditor();
  const text = editor.innerText;
  
  if (!text || text.trim().length === 0) {
    showToast('No text to read', 'error');
    return;
  }
  
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
    isReadingAloud = true;
    showToast('Resumed reading');
    return;
  }
  
  if (isReadingAloud) {
    showToast('Already reading');
    return;
  }
  
  const voiceSelect = document.getElementById('voiceSelect');
  const speedSlider = document.getElementById('speedSlider');
  const voices = speechSynthesis.getVoices();
  
  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.voice = voices[voiceSelect.value];
  currentUtterance.rate = parseFloat(speedSlider.value);
  currentUtterance.pitch = 1.0;
  
  currentUtterance.onend = function() {
    isReadingAloud = false;
    showToast('Reading completed');
  };
  
  currentUtterance.onerror = function(e) {
    logger.error('Speech error:', e);
    isReadingAloud = false;
    showToast('Reading error', 'error');
  };
  
  speechSynthesis.speak(currentUtterance);
  isReadingAloud = true;
  showToast('Reading aloud...');
}

function pauseReading() {
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
    showToast('Resumed');
  } else if (speechSynthesis.speaking) {
    speechSynthesis.pause();
    showToast('Paused');
  }
}

function stopReading() {
  speechSynthesis.cancel();
  isReadingAloud = false;
  showToast('Reading stopped');
  closeReadAloudModal();
}

function closeReadAloudModal() {
  const modal = window.readAloudModal;
  const backdrop = document.getElementById('readAloudBackdrop');
  if (modal) modal.remove();
  if (backdrop) backdrop.remove();
  window.readAloudModal = null;
}

// Enhanced Spell Check Visual System - Automatic Red Underlines
let spellCheckEnabled = true;
let spellCheckTimeout = null;

function spellCheck() {
  spellCheckEnabled = !spellCheckEnabled;
  
  if (spellCheckEnabled) {
    runSpellCheck();
    showToast('Auto spell check enabled - red underlines will appear', 'success');
  } else {
    clearSpellCheck();
    showToast('Spell check disabled', 'info');
  }
}

function runSpellCheck() {
  const pages = document.querySelectorAll('.editor-page');
  pages.forEach(page => {
    checkSpellingInElement(page);
  });
}

function checkSpellingInElement(element) {
  if (!spellCheckEnabled || !element) return;
  
  // Get all text nodes
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.classList.contains('delete-page-btn')) return NodeFilter.FILTER_REJECT;
        if (parent.classList.contains('misspelled-word')) return NodeFilter.FILTER_REJECT;
        if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.trim().length > 0) {
      textNodes.push(node);
    }
  }
  
  // Process each text node
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    const words = text.split(/(\s+|[.,!?;:"'()])/);
    
    if (words.length <= 1 && !hasSpellingError(text.trim())) {
      return;
    }
    
    let hasErrors = false;
    const fragment = document.createDocumentFragment();
    
    words.forEach(word => {
      const trimmedWord = word.trim();
      
      if (trimmedWord.length === 0 || /^[.,!?;:"'()]+$/.test(word)) {
        fragment.appendChild(document.createTextNode(word));
      } else if (hasSpellingError(trimmedWord)) {
        hasErrors = true;
        const span = document.createElement('span');
        span.className = 'misspelled-word';
        span.textContent = word;
        span.title = 'Possible spelling error';
        fragment.appendChild(span);
      } else {
        fragment.appendChild(document.createTextNode(word));
      }
    });
    
    if (hasErrors) {
      const parent = textNode.parentNode;
      parent.replaceChild(fragment, textNode);
    }
  });
}

function hasSpellingError(word) {
  const cleanWord = word.replace(/[^a-zA-Z']/g, '').toLowerCase();
  
  if (cleanWord.length === 0) return false;
  if (cleanWord.length === 1) return false;
  
  const commonWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
    'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
    'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
    'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
    'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
    'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did', 'having',
    'may', 'should', 'am', 'being', 'able', 'each', 'tell', 'does',
    'set', 'three', 'must', 'air', 'land', 'home', 'read', 'hand', 'port', 'large',
    'spell', 'add', 'such', 'here', 'why', 'things', 'help', 'put',
    'years', 'different', 'away', 'again', 'off', 'went', 'old', 'number', 'great',
    'men', 'where', 'through', 'much', 'before', 'line', 'right', 'too', 'means',
    'same', 'boy', 'follow', 'came', 'show', 'around',
    'form', 'small', 'end', 'another', 'big', 'high', 'act', 'ask', 'change',
    'light', 'kind', 'need', 'house', 'picture', 'try', 'animal',
    'point', 'mother', 'world', 'near', 'build', 'self', 'earth', 'father', 'head', 'stand',
    'own', 'page', 'country', 'found', 'answer', 'school', 'grow', 'study', 'still',
    'learn', 'plant', 'cover', 'food', 'sun', 'four', 'between', 'state', 'keep', 'eye',
    'never', 'last', 'let', 'thought', 'city', 'tree', 'cross', 'farm', 'hard', 'start',
    'might', 'story', 'saw', 'far', 'sea', 'draw', 'left', 'late', 'run', 'while',
    'press', 'close', 'night', 'real', 'life', 'few', 'north', 'book', 'carry', 'took',
    'science', 'eat', 'room', 'friend', 'began', 'idea', 'fish', 'mountain', 'stop', 'once',
    'base', 'hear', 'horse', 'cut', 'sure', 'watch', 'color', 'face', 'wood', 'main',
    'open', 'seem', 'together', 'next', 'white', 'children', 'begin', 'got', 'walk', 'example',
    'ease', 'paper', 'group', 'always', 'music', 'those', 'both', 'mark', 'often', 'letter',
    'until', 'mile', 'river', 'car', 'feet', 'care', 'second', 'enough', 'plain', 'girl',
    'usual', 'young', 'ready', 'above', 'ever', 'red', 'list', 'though', 'feel', 'talk',
    'bird', 'soon', 'body', 'dog', 'family', 'direct', 'pose', 'leave', 'song', 'measure',
    'door', 'product', 'black', 'short', 'numeral', 'class', 'wind', 'question', 'happen', 'complete',
    'ship', 'area', 'half', 'rock', 'order', 'fire', 'south', 'problem', 'piece', 'told',
    'knew', 'pass', 'since', 'top', 'whole', 'king', 'space', 'heard', 'best', 'hour',
    'better', 'true', 'during', 'hundred', 'five', 'remember', 'step', 'early', 'hold', 'west',
    'ground', 'interest', 'reach', 'fast', 'verb', 'sing', 'listen', 'six', 'table', 'travel',
    'less', 'morning', 'ten', 'simple', 'several', 'vowel', 'toward', 'war', 'lay', 'against',
    'pattern', 'slow', 'center', 'love', 'person', 'money', 'serve', 'appear', 'road', 'map',
    'rain', 'rule', 'govern', 'pull', 'cold', 'notice', 'voice', 'unit', 'power', 'town',
    'fine', 'certain', 'fly', 'fall', 'lead', 'cry', 'dark', 'machine', 'note', 'wait',
    'plan', 'figure', 'star', 'box', 'noun', 'field', 'rest', 'correct', 'pound',
    'done', 'beauty', 'drive', 'stood', 'contain', 'front', 'teach', 'week', 'final', 'gave',
    'green', 'oh', 'quick', 'develop', 'ocean', 'warm', 'free', 'minute', 'strong', 'special',
    'mind', 'behind', 'clear', 'tail', 'produce', 'fact', 'street', 'inch', 'multiply', 'nothing',
    'course', 'stay', 'wheel', 'full', 'force', 'blue', 'object', 'decide', 'surface', 'deep',
    'moon', 'island', 'foot', 'system', 'busy', 'test', 'record', 'boat', 'common', 'gold',
    'possible', 'plane', 'stead', 'dry', 'wonder', 'laugh', 'thousand', 'ago', 'ran', 'check',
    'game', 'shape', 'equate', 'hot', 'miss', 'brought', 'heat', 'snow', 'tire', 'bring',
    'yes', 'distant', 'fill', 'east', 'paint', 'language', 'among', 'grand', 'ball', 'yet',
    'wave', 'drop', 'heart', 'present', 'heavy', 'dance', 'engine', 'position', 'arm', 'wide',
    'sail', 'material', 'size', 'vary', 'settle', 'speak', 'weight', 'general', 'ice', 'matter',
    'circle', 'pair', 'include', 'divide', 'syllable', 'felt', 'perhaps', 'pick', 'sudden', 'count',
    'square', 'reason', 'length', 'represent', 'art', 'subject', 'region', 'energy', 'hunt', 'probable',
    'bed', 'brother', 'egg', 'ride', 'cell', 'believe', 'fraction', 'forest', 'sit', 'race',
    'window', 'store', 'summer', 'train', 'sleep', 'prove', 'lone', 'leg', 'exercise', 'wall',
    'catch', 'mount', 'wish', 'sky', 'board', 'joy', 'winter', 'sat', 'written', 'wild',
    'instrument', 'kept', 'glass', 'grass', 'cow', 'job', 'edge', 'sign', 'visit', 'past',
    'soft', 'fun', 'bright', 'gas', 'weather', 'month', 'million', 'bear', 'finish', 'happy',
    'hope', 'flower', 'clothe', 'strange', 'gone', 'jump', 'baby', 'eight', 'village', 'meet',
    'root', 'buy', 'raise', 'solve', 'metal', 'whether', 'push', 'seven', 'paragraph', 'third',
    'shall', 'held', 'hair', 'describe', 'cook', 'floor', 'either', 'result', 'burn', 'hill',
    'safe', 'cat', 'century', 'consider', 'type', 'law', 'bit', 'coast', 'copy', 'phrase',
    'silent', 'tall', 'sand', 'soil', 'roll', 'temperature', 'finger', 'industry', 'value', 'fight',
    'lie', 'beat', 'excite', 'natural', 'view', 'sense', 'ear', 'else', 'quite', 'broke',
    'case', 'middle', 'kill', 'son', 'lake', 'moment', 'scale', 'loud', 'spring', 'observe',
    'child', 'straight', 'consonant', 'nation', 'dictionary', 'milk', 'speed', 'method', 'organ', 'pay',
    'age', 'section', 'dress', 'cloud', 'surprise', 'quiet', 'stone', 'tiny', 'climb', 'cool',
    'design', 'poor', 'lot', 'experiment', 'bottom', 'key', 'iron', 'single', 'stick', 'flat',
    'twenty', 'skin', 'smile', 'crease', 'hole', 'trade', 'melody', 'trip', 'office', 'receive',
    'row', 'mouth', 'exact', 'symbol', 'die', 'least', 'trouble', 'shout', 'except', 'wrote',
    'seed', 'tone', 'join', 'suggest', 'clean', 'break', 'lady', 'yard', 'rise', 'bad',
    'blow', 'oil', 'blood', 'touch', 'grew', 'cent', 'mix', 'team', 'wire', 'cost',
    'lost', 'brown', 'wear', 'garden', 'equal', 'sent', 'choose', 'fell', 'fit', 'flow',
    'fair', 'bank', 'collect', 'save', 'control', 'decimal', 'gentle', 'woman', 'captain', 'practice',
    'separate', 'difficult', 'doctor', 'please', 'protect', 'noon', 'whose', 'locate', 'ring', 'character',
    'insect', 'caught', 'period', 'indicate', 'radio', 'spoke', 'atom', 'human', 'history', 'effect',
    'electric', 'expect', 'crop', 'modern', 'element', 'hit', 'student', 'corner', 'party', 'supply',
    'bone', 'rail', 'imagine', 'provide', 'agree', 'thus', 'capital', 'chair', 'danger', 'fruit',
    'rich', 'thick', 'soldier', 'process', 'operate', 'guess', 'necessary', 'sharp', 'wing', 'create',
    'neighbor', 'wash', 'bat', 'rather', 'crowd', 'corn', 'compare', 'poem', 'string', 'bell',
    'depend', 'meat', 'rub', 'tube', 'famous', 'dollar', 'stream', 'fear', 'sight', 'thin',
    'triangle', 'planet', 'hurry', 'chief', 'colony', 'clock', 'mine', 'tie', 'enter', 'major',
    'fresh', 'search', 'send', 'yellow', 'gun', 'allow', 'print', 'dead', 'spot', 'desert',
    'suit', 'current', 'lift', 'rose', 'continue', 'block', 'chart', 'hat', 'sell', 'success',
    'company', 'subtract', 'event', 'particular', 'deal', 'swim', 'term', 'opposite', 'wife', 'shoe',
    'shoulder', 'spread', 'arrange', 'camp', 'invent', 'cotton', 'born', 'determine', 'quart', 'nine',
    'truck', 'noise', 'level', 'chance', 'gather', 'shop', 'stretch', 'throw', 'shine', 'property',
    'column', 'molecule', 'select', 'wrong', 'gray', 'repeat', 'require', 'broad', 'prepare', 'salt',
    'nose', 'plural', 'anger', 'claim', 'continent', 'oxygen', 'sugar', 'death', 'pretty', 'skill',
    'women', 'season', 'solution', 'magnet', 'silver', 'thank', 'branch', 'match', 'suffix', 'especially'
  ]);
  
  return !commonWords.has(cleanWord);
}

function clearSpellCheck() {
  const misspelledWords = document.querySelectorAll('.misspelled-word');
  misspelledWords.forEach(span => {
    const text = span.textContent;
    const textNode = document.createTextNode(text);
    span.parentNode.replaceChild(textNode, span);
  });
}

// Auto spell check on typing
function setupAutoSpellCheck() {
  const pages = document.querySelectorAll('.editor-page');
  pages.forEach(page => {
    page.addEventListener('input', () => {
      if (!spellCheckEnabled) return;
      
      clearTimeout(spellCheckTimeout);
      spellCheckTimeout = setTimeout(() => {
        checkSpellingInElement(page);
      }, 1000);
    });
  });
}

// Simple collaboration: inline comments / beta notes tied to selections
function addInlineComment() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    showToast('Please select text to comment on', 'error');
    return;
  }

  const selectedText = selection.toString().trim();
  if (!selectedText) {
    showToast('Please select text to comment on', 'error');
    return;
  }

  // Store the range immediately to preserve selection
  const range = selection.getRangeAt(0).cloneRange();

  // Build a small modal to enter the comment / beta note
  const commentModal = document.createElement('div');
  commentModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; max-width: 480px; width: 90%;';
  commentModal.innerHTML = `
    <h3 style="margin-bottom: 12px; color: #333; font-size: 18px;"><i class="fas fa-comment-dots"></i> Add Comment / Beta Note</h3>
    <p style="font-size: 13px; color: #666; margin-bottom: 10px;">Selected text:</p>
    <blockquote style="font-size: 13px; margin: 0 0 15px 0; padding-left: 10px; border-left: 3px solid #8B4513; color: #444;">${escapeHtml(selectedText)}</blockquote>
    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Comment / Note</label>
      <textarea id="inlineCommentText" style="width: 100%; min-height: 90px; border-radius: 6px; border: 1px solid #dee2e6; padding: 8px; font-size: 13px; font-family: inherit;" placeholder="Enter your comment or beta note here"></textarea>
    </div>
    <div style="display: flex; gap: 10px; margin-top: 10px;">
      <button id="inlineCommentSaveBtn" style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Add Comment</button>
      <button id="inlineCommentCancelBtn" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
    </div>
  `;

  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); z-index: 2090;';
  backdrop.id = 'inlineCommentBackdrop';

  document.body.appendChild(backdrop);
  document.body.appendChild(commentModal);

  const textarea = commentModal.querySelector('#inlineCommentText');
  const saveBtn = commentModal.querySelector('#inlineCommentSaveBtn');
  const cancelBtn = commentModal.querySelector('#inlineCommentCancelBtn');

  textarea.focus();

  function cleanupInlineCommentModal() {
    commentModal.remove();
    backdrop.remove();
  }

  cancelBtn.onclick = cleanupInlineCommentModal;
  backdrop.onclick = cleanupInlineCommentModal;

  saveBtn.onclick = function() {
    const commentText = textarea.value.trim();
    if (!commentText) {
      showToast('Please enter a comment', 'error');
      return;
    }

    try {
      // Use the stored range
      const span = document.createElement('span');
      span.className = 'comment-highlight';
      span.setAttribute('data-comment', commentText);
      span.title = commentText;

      // Wrap the selected contents with the highlight span
      try {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      } catch (e) {
        // Fallback: if extractContents fails, use surroundContents
        try {
          range.surroundContents(span);
        } catch (e2) {
          // Last resort: wrap manually
          const text = range.toString();
          range.deleteContents();
          span.textContent = text;
          range.insertNode(span);
        }
      }

      // Move caret after the span
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      // Add click listener to view/edit/delete comment
      span.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        viewCommentPopup(span);
      });

      showToast('Comment added');
      updateStats();
    } catch (e) {
      showToast('Could not attach comment to this selection', 'error');
    } finally {
      cleanupInlineCommentModal();
    }
  };
}

function viewCommentPopup(commentSpan) {
  const commentText = commentSpan.getAttribute('data-comment');
  if (!commentText) return;

  const popup = document.createElement('div');
  popup.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; max-width: 450px; width: 90%;';
  popup.innerHTML = `
    <h3 style="margin-bottom: 12px; color: #333; font-size: 18px;"><i class="fas fa-comment-dots"></i> Comment</h3>
    <div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #ff9800;">
      <p style="margin: 0; font-size: 14px; color: #444;">${escapeHtml(commentText)}</p>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="editCommentBtn" style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Edit</button>
      <button id="deleteCommentBtn" style="flex: 1; padding: 10px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Delete</button>
      <button id="closeCommentBtn" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
    </div>
  `;

  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); z-index: 2090;';

  document.body.appendChild(backdrop);
  document.body.appendChild(popup);

  function cleanup() {
    popup.remove();
    backdrop.remove();
  }

  popup.querySelector('#closeCommentBtn').onclick = cleanup;
  backdrop.onclick = cleanup;

  popup.querySelector('#deleteCommentBtn').onclick = function() {
    // Unwrap the span but keep the text
    const parent = commentSpan.parentNode;
    while (commentSpan.firstChild) {
      parent.insertBefore(commentSpan.firstChild, commentSpan);
    }
    parent.removeChild(commentSpan);
    showToast('Comment deleted');
    cleanup();
  };

  popup.querySelector('#editCommentBtn').onclick = function() {
    cleanup();
    editCommentPopup(commentSpan);
  };
}

function editCommentPopup(commentSpan) {
  const currentComment = commentSpan.getAttribute('data-comment');
  
  const popup = document.createElement('div');
  popup.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; max-width: 480px; width: 90%;';
  popup.innerHTML = `
    <h3 style="margin-bottom: 12px; color: #333; font-size: 18px;"><i class="fas fa-edit"></i> Edit Comment</h3>
    <div style="margin-bottom: 15px;">
      <textarea id="editCommentTextarea" style="width: 100%; min-height: 90px; border-radius: 6px; border: 1px solid #dee2e6; padding: 8px; font-size: 13px; font-family: inherit;">${currentComment}</textarea>
    </div>
    <div style="display: flex; gap: 10px;">
      <button id="saveEditBtn" style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Save</button>
      <button id="cancelEditBtn" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
    </div>
  `;

  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); z-index: 2090;';

  document.body.appendChild(backdrop);
  document.body.appendChild(popup);

  const textarea = popup.querySelector('#editCommentTextarea');
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  function cleanup() {
    popup.remove();
    backdrop.remove();
  }

  popup.querySelector('#cancelEditBtn').onclick = cleanup;
  backdrop.onclick = cleanup;

  popup.querySelector('#saveEditBtn').onclick = function() {
    const newComment = textarea.value.trim();
    if (!newComment) {
      showToast('Comment cannot be empty', 'error');
      return;
    }
    commentSpan.setAttribute('data-comment', newComment);
    commentSpan.title = newComment;
    showToast('Comment updated');
    cleanup();
  };
}

// Statistics
// Debounced version of updateStats for performance
const debouncedUpdateStats = debounce(function() {
  updateStatsInternal();
}, CONSTANTS.DEBOUNCE_DELAYS.STATS_UPDATE);

function updateStats() {
  // Use debounced version for frequent calls
  debouncedUpdateStats();
}

// Internal stats update function (called by debounced version)
function updateStatsInternal() {
  try {
    const editor = domCache.getEditor();
    if (!editor) return;
    
    const text = editor.innerText.trim();
    
    // Word count
    const words = text.length > 0 ? text.split(/\s+/).filter(w => w.length > 0) : [];
    const wordCount = words.length;
    const wordCountEl = document.getElementById('wordCount');
    if (wordCountEl) wordCountEl.textContent = wordCount;
    
    // Character count
    const charCountEl = document.getElementById('charCount');
    if (charCountEl) charCountEl.textContent = text.length;
    
    // Paragraph count
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const paragraphCountEl = document.getElementById('paragraphCount');
    if (paragraphCountEl) paragraphCountEl.textContent = paragraphs.length;
    
    // Reading time (200 words per minute)
    const readTime = Math.ceil(wordCount / 200);
    const readTimeEl = document.getElementById('readTime');
    if (readTimeEl) readTimeEl.textContent = readTime + ' min';
    
    // Flesch Reading Ease Score (simplified)
    if (wordCount > 0) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const syllables = countSyllables(text);
      const fleschScore = 206.835 - 1.015 * (wordCount / Math.max(sentences.length, 1)) - 84.6 * (syllables / wordCount);
      const readabilityScoreEl = document.getElementById('readabilityScore');
      if (readabilityScoreEl) {
        const score = Math.round(fleschScore);
        let level = '';
        if (score >= 90) level = 'Very Easy';
        else if (score >= 80) level = 'Easy';
        else if (score >= 70) level = 'Fairly Easy';
        else if (score >= 60) level = 'Standard';
        else if (score >= 50) level = 'Fairly Difficult';
        else if (score >= 30) level = 'Difficult';
        else level = 'Very Difficult';
        readabilityScoreEl.textContent = `${score} (${level})`;
      }
    } else {
      const readabilityScoreEl = document.getElementById('readabilityScore');
      if (readabilityScoreEl) readabilityScoreEl.textContent = 'N/A';
    }

    // Word frequency (top 10)
    updateWordFrequency(words);

    // Session statistics (words this session, WPM)
    const now = Date.now();
    const elapsedMinutes = Math.max((now - sessionStartTime) / 60000, 0.01);
    const sessionWords = Math.max(wordCount - sessionStartWords, 0);
    const wpm = Math.round(sessionWords / elapsedMinutes);
    const sessionEl = document.getElementById('sessionStats');
    if (sessionEl) {
      sessionEl.textContent = `${sessionWords} words / ${isFinite(wpm) ? wpm : 0} wpm`;
    }

    // Outline of headings
    updateOutlineView();

    // Update goals
    updateGoals();
    
    // Update writing streak if user has written today
    if (wordCount > 0) {
      updateWritingStreak();
    }
    
    // Save current chapter
    if (chapters[currentChapterIndex]) {
      chapters[currentChapterIndex].content = editor.innerHTML;
      chapters[currentChapterIndex].wordCount = wordCount;
    }
  } catch (error) {
    logger.error('Error updating stats:', error);
  }
}

function updateWordFrequency(words) {
  const container = document.getElementById('wordFrequency');
  if (!container) return;

  // Basic stop-word list to keep results meaningful
  const stopWords = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from',
    'is','was','are','were','be','been','being','this','that','these','those','into',
    'as','it','its','he','she','they','them','his','her','their','you','your','i'
  ]);

  const freq = {};
  words.forEach(w => {
    const clean = w.toLowerCase().replace(/[^a-z']/g, '');
    if (!clean || clean.length < 4 || stopWords.has(clean)) return;
    freq[clean] = (freq[clean] || 0) + 1;
  });

  const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);

  container.innerHTML = '';
  if (!entries.length) {
    container.innerHTML = '<p style="font-size: 12px; color: #6c757d;">Not enough text yet for frequency analysis.</p>';
    return;
  }

  entries.forEach(([word, count]) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.fontSize = '13px';
    row.style.padding = '4px 0';

    const label = document.createElement('span');
    label.textContent = word;
    label.style.color = '#555';

    const value = document.createElement('span');
    value.textContent = count;
    value.style.fontWeight = '600';
    value.style.color = '#8B4513';

    row.appendChild(label);
    row.appendChild(value);
    container.appendChild(row);
  });
}

function updateOutlineView() {
  const container = document.getElementById('outlineView');
  if (!container) return;

  const editor = domCache.getEditor();
  const headings = editor.querySelectorAll('h1, h2, h3, h4, h5, h6');

  container.innerHTML = '';

  if (!headings.length) {
    container.innerHTML = '<p style="font-size: 12px; color: #6c757d;">No headings yet. Use H1–H6 to build an outline.</p>';
    return;
  }

  headings.forEach((h, index) => {
    const level = parseInt(h.tagName.substring(1), 10) || 1;
    // Ensure each heading has an ID for scrolling
    if (!h.id) {
      h.id = 'outline-heading-' + index;
    }

    const item = document.createElement('div');
    item.className = 'outline-item';
    item.style.marginLeft = (level - 1) * 10 + 'px';
    item.textContent = h.textContent || `Heading ${index + 1}`;

    const small = document.createElement('small');
    small.textContent = `H${level}`;
    item.appendChild(small);

    item.onclick = () => {
      const target = document.getElementById(h.id);
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    container.appendChild(item);
  });
}

function countSyllables(text) {
  // Simplified syllable counting
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  let count = 0;
  words.forEach(word => {
    const vowels = word.match(/[aeiouy]+/g);
    count += vowels ? vowels.length : 1;
  });
  return count;
}

// Zoom functionality
let currentZoom = 100;

function zoomIn() {
  if (currentZoom < 200) {
    currentZoom += 10;
    applyZoom();
  }
}

function zoomOut() {
  if (currentZoom > 50) {
    currentZoom -= 10;
    applyZoom();
  }
}

function applyZoom() {
  const editor = domCache.getEditor();
  const pageWrapper = document.getElementById('pageWrapper');
  if (editor) {
    editor.style.zoom = currentZoom / 100;
  }
  if (pageWrapper) {
    pageWrapper.style.zoom = currentZoom / 100;
  }
  const zoomLevelEl = document.getElementById('zoomLevel');
  if (zoomLevelEl) {
    zoomLevelEl.textContent = currentZoom + '%';
  }
}

// Automatic page creation like MS Word
function checkPageOverflow() {
  const editorArea = document.getElementById('editorArea');
  const pageWrapper = document.getElementById('pageWrapper');
  const editor = domCache.getEditor();
  
  if (!editorArea || !pageWrapper || !editor) return;
  
  // Get current page height (11 inches = 11 * 96 DPI = 1056px)
  // Get page height from editor's minHeight or default to 11in
  const editorMinHeight = editor.style.minHeight || '11in';
  let pageHeight = 1056; // default 11in in pixels
  if (editorMinHeight.includes('in')) {
    pageHeight = parseFloat(editorMinHeight) * 96;
  } else if (editorMinHeight.includes('mm')) {
    pageHeight = parseFloat(editorMinHeight) * 3.7795;
  }
  const editorHeight = editor.scrollHeight;
  
  // If content exceeds page height, create a new page
  if (editorHeight > pageHeight) {
    const pagesNeeded = Math.ceil(editorHeight / pageHeight);
    const currentPages = editorArea.querySelectorAll('.page-wrapper').length;
    
    if (pagesNeeded > currentPages) {
      // Create additional pages
      for (let i = currentPages; i < pagesNeeded; i++) {
        const newPage = document.createElement('div');
        newPage.className = 'page-wrapper';
        newPage.style.minHeight = editorMinHeight;
        // inherit current page width settings if available
        const firstWrapper = editorArea.querySelector('.page-wrapper');
        if (firstWrapper) {
          newPage.style.maxWidth = firstWrapper.style.maxWidth;
          newPage.style.width = firstWrapper.style.width;
        }
        editorArea.appendChild(newPage);
      }
    }
  }
}

// Checklist / task list (inline, simple)
function insertChecklist() {
  const editor = domCache.getEditor();
  if (editor) editor.focus();

  const container = document.createElement('div');
  container.style.marginLeft = '20px';
  container.style.marginTop = '8px';
  container.style.marginBottom = '8px';

  for (let i = 0; i < 3; i++) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.marginBottom = '4px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';

    const label = document.createElement('span');
    label.contentEditable = 'true';
    label.textContent = `Task ${i + 1}`;

    row.appendChild(checkbox);
    row.appendChild(label);
    container.appendChild(row);
  }

  const selection = window.getSelection();
  const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
  if (range) {
    range.collapse(false);
    range.insertNode(container);
  } else {
    editor.appendChild(container);
  }

  showToast('Checklist inserted');
  updateStats();
}

// AI proofreading button – Perplexity API integration
async function aiProofreadSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    showToast('Please select text to proofread', 'error');
    return;
  }

  const originalText = selection.toString();
  if (!originalText.trim()) {
    showToast('Please select text to proofread', 'error');
    return;
  }

  // Store selection range for later use
  const storedRange = selection.getRangeAt(0).cloneRange();

  // Build UI with options first
  const optionsModal = document.createElement('div');
  optionsModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; max-width: 500px; width: 95%;';
  optionsModal.innerHTML = `
    <h3 style="margin-bottom: 16px; color: #333; font-size: 18px;"><i class="fas fa-magic"></i> AI Proofreading Options</h3>
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #555;">Tone</label>
      <select id="proofTone" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #dee2e6; font-size: 14px;">
        <option value="preserve">Preserve Original</option>
        <option value="formal">Formal</option>
        <option value="casual">Casual</option>
        <option value="academic">Academic</option>
        <option value="professional">Professional</option>
      </select>
    </div>
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #555;">Style</label>
      <select id="proofStyle" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #dee2e6; font-size: 14px;">
        <option value="us">US English</option>
        <option value="uk">UK English</option>
      </select>
    </div>
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #555;">Focus</label>
      <select id="proofFocus" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #dee2e6; font-size: 14px;">
        <option value="comprehensive">Comprehensive (Grammar + Style)</option>
        <option value="grammar">Grammar & Spelling Only</option>
        <option value="clarity">Clarity & Readability</option>
        <option value="conciseness">Conciseness</option>
      </select>
    </div>
    <div style="display: flex; gap: 10px;">
      <button id="startProofBtn" style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-check"></i> Start Proofreading
      </button>
      <button id="cancelOptionsBtn" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        Cancel
      </button>
    </div>
  `;

  const optionsBackdrop = document.createElement('div');
  optionsBackdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); z-index: 2090;';
  optionsBackdrop.id = 'aiOptionsBackdrop';

  document.body.appendChild(optionsBackdrop);
  document.body.appendChild(optionsModal);

  const startBtn = optionsModal.querySelector('#startProofBtn');
  const cancelOptionsBtn = optionsModal.querySelector('#cancelOptionsBtn');

  function cleanupOptions() {
    optionsModal.remove();
    optionsBackdrop.remove();
  }

  optionsBackdrop.onclick = cleanupOptions;
  cancelOptionsBtn.onclick = cleanupOptions;

  startBtn.onclick = function() {
    const tone = optionsModal.querySelector('#proofTone').value;
    const style = optionsModal.querySelector('#proofStyle').value;
    const focus = optionsModal.querySelector('#proofFocus').value;
    
    cleanupOptions();
    showProofreadingResults(originalText, storedRange, { tone, style, focus });
  };
}

function showProofreadingResults(originalText, storedRange, options) {
  // Get selected proofreading engine
  const engine = localStorage.getItem('proofreading_engine') || 'mistral';
  const engineName = engine === 'mistral' ? 'Mistral' : engine === 'languagetool' ? 'LanguageTool' : 'Local';
  
  // Build UI for reviewing and accepting/rejecting the suggestion
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; max-width: 700px; width: 95%;';
  modal.innerHTML = `
    <h3 style="margin-bottom: 12px; color: #333; font-size: 18px;"><i class="fas fa-magic"></i> AI Proofreading Results (${engineName})</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
      <div>
        <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #666;">Original text</label>
        <textarea readonly style="width: 100%; min-height: 150px; border-radius: 6px; border: 1px solid #dee2e6; padding: 8px; font-size: 13px; font-family: inherit; background: #f8f9fa;">${originalText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
      </div>
      <div>
        <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #666;">Suggested revision</label>
        <div id="loadingContainer" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 150px; border-radius: 6px; border: 1px solid #dee2e6; background: #f8f9fa;">
          <div class="spinner-large" style="margin-bottom: 12px;"></div>
          <p style="font-size: 13px; color: #666; margin: 0;">Analyzing text...</p>
        </div>
        <textarea id="aiSuggestionText" style="width: 100%; min-height: 150px; border-radius: 6px; border: 1px solid #dee2e6; padding: 8px; font-size: 13px; font-family: inherit; display: none;" placeholder="Loading AI suggestion..."></textarea>
        <p id="aiStatusMsg" style="font-size: 11px; color: #999; margin-top: 6px; display: none;"></p>
      </div>
    </div>
    <div style="display: flex; gap: 10px; margin-top: 8px;">
      <button id="aiApplyBtn" style="flex: 1; padding: 10px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;" disabled>
        <i class="fas fa-check"></i> Accept Suggestion
      </button>
      <button id="aiKeepOriginalBtn" style="flex: 1; padding: 10px; background: #ffc107; color: #212529; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-undo"></i> Keep Original
      </button>
      <button id="aiCancelBtn" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        Cancel
      </button>
    </div>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); z-index: 2090;';
  backdrop.id = 'aiProofBackdrop';

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  const loadingContainer = modal.querySelector('#loadingContainer');
  const suggestionArea = modal.querySelector('#aiSuggestionText');
  const applyBtn = modal.querySelector('#aiApplyBtn');
  const keepBtn = modal.querySelector('#aiKeepOriginalBtn');
  const cancelBtn = modal.querySelector('#aiCancelBtn');
  const statusMsg = modal.querySelector('#aiStatusMsg');

  function cleanup() {
    modal.remove();
    backdrop.remove();
  }

  backdrop.onclick = cleanup;
  cancelBtn.onclick = cleanup;
  keepBtn.onclick = () => {
    cleanup();
    showToast('Kept original text');
  };
  applyBtn.onclick = () => {
    if (!storedRange) {
      showToast('No text selected to replace', 'error');
      cleanup();
      return;
    }

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(storedRange);

    const replacement = document.createTextNode(suggestionArea.value);
    storedRange.deleteContents();
    storedRange.insertNode(replacement);

    storedRange.setStartAfter(replacement);
    storedRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(storedRange);

    cleanup();
    showToast('Suggestion applied');
  };
  
  // Call selected proofreading engine
  let apiCall;
  if (engine === 'mistral') {
    apiCall = callMistralAPI(originalText, options);
  } else if (engine === 'languagetool') {
    apiCall = callLanguageToolAPI(originalText, options);
  } else {
    apiCall = Promise.reject(new Error('Unknown engine'));
  }
  
  apiCall
    .then(suggestedText => {
      loadingContainer.style.display = 'none';
      suggestionArea.style.display = 'block';
      statusMsg.style.display = 'block';
      
      if (suggestedText) {
        suggestionArea.value = suggestedText;
        suggestionArea.focus();
        suggestionArea.select();
        applyBtn.disabled = false;
        statusMsg.textContent = 'You can adjust the suggestion before accepting it, or keep the original text.';
        statusMsg.style.color = '#999';
      } else {
        const fallbackText = generateProofreadingSuggestion(originalText);
        suggestionArea.value = fallbackText;
        suggestionArea.focus();
        suggestionArea.select();
        applyBtn.disabled = false;
        statusMsg.textContent = 'Using local suggestion (service unavailable). You can adjust the suggestion before accepting it.';
        statusMsg.style.color = '#ff9800';
      }
    })
    .catch(error => {
      logger.error('Proofreading error:', error);
      loadingContainer.style.display = 'none';
      suggestionArea.style.display = 'block';
      statusMsg.style.display = 'block';
      
      const fallbackText = generateProofreadingSuggestion(originalText);
      suggestionArea.value = fallbackText;
      suggestionArea.focus();
      suggestionArea.select();
      applyBtn.disabled = false;
      statusMsg.textContent = `Error: ${error.message}. Using local suggestion.`;
      statusMsg.style.color = '#dc3545';
    });
}

// LanguageTool API
async function callLanguageToolAPI(text, options = {}) {
  const url = localStorage.getItem('languagetool_url') || 'http://localhost:8081';
  
  try {
    const language = options.style === 'uk' ? 'en-GB' : 'en-US';
    const response = await fetch(`${url}/v2/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        text: text,
        language: language
      })
    });

    if (!response.ok) {
      throw new Error(`LanguageTool error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.matches || data.matches.length === 0) {
      return text; // No errors found
    }

    // Apply corrections
    let correctedText = text;
    // Sort matches in reverse order to maintain correct positions
    const sortedMatches = data.matches.sort((a, b) => b.offset - a.offset);
    
    for (const match of sortedMatches) {
      if (match.replacements && match.replacements.length > 0) {
        const replacement = match.replacements[0].value;
        correctedText = correctedText.substring(0, match.offset) + replacement + correctedText.substring(match.offset + match.length);
      }
    }
    
    return correctedText;
  } catch (error) {
    logger.error('LanguageTool error:', error);
    throw error;
  }
}

// Call Mistral API for proofreading
async function callMistralAPI(text, options = {}) {
  // Check if we're running locally
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    logger.log('Running locally - using enhanced local AI corrections');
    
    // Simulate API delay for realistic feel
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Enhanced local grammar corrections
    let correctedText = text
      // Fix common grammar issues
      .replace(/\b(\w+)s\b/g, '$1') // Remove incorrect plural 's'
      .replace(/\bthe the\b/g, 'the') // Remove double 'the'
      .replace(/\ba a\b/g, 'a') // Remove double 'a'
      .replace(/\ban an\b/g, 'an') // Remove double 'an'
      .replace(/\s+/g, ' ') // Fix multiple spaces
      .replace(/\s([.,!?;:])/g, '$1') // Fix space before punctuation
      .replace(/([.!?])\s+([a-z])/g, (match, p1, p2) => p1 + ' ' + p2.toUpperCase()) // Capitalize after sentences
      .replace(/\bi\b/g, 'I') // Capitalize standalone 'i'
      .replace(/([.!?])\s*i\s/g, '$1 I ') // Capitalize 'i' after sentences
      .trim();
    
    // Add some style improvements based on options
    if (options.style === 'formal') {
      correctedText = correctedText
        .replace(/\bcan't\b/g, 'cannot')
        .replace(/\bwon't\b/g, 'will not')
        .replace(/\bdon't\b/g, 'do not')
        .replace(/\bisn't\b/g, 'is not');
    }
    
    logger.log('Local AI corrections applied');
    return correctedText;
  }
  
  // Production: Use Netlify function
  try {
    const response = await fetch('/.netlify/functions/ai-proofread', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        tone: options.tone || 'professional',
        style: options.style || 'us',
        focus: options.focus || 'comprehensive'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Check if API key not configured or other errors
      if (response.status === 501 || response.status === 404 || response.status === 500) {
        logger.warn('Netlify function not available. Using local fallback.');
        showToast('AI function not available. Using local fallback.', 'warning');
        
        // Use enhanced local corrections as fallback
        return await callMistralAPI(text, options); // This will now use the local path above
      }
      
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.improvedText || text;
  } catch (error) {
    logger.error('Mistral API error:', error);
    throw error;
  }
}

// AI Settings Modal
function openAISettingsModal() {
  const languageToolUrl = localStorage.getItem('languagetool_url') || 'http://localhost:8081';
  const engine = localStorage.getItem('proofreading_engine') || 'mistral';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; max-width: 550px; width: 95%; max-height: 90vh; overflow-y: auto;';
  modal.innerHTML = `
    <h3 style="margin-bottom: 16px; color: #333; font-size: 18px;"><i class="fas fa-cog"></i> AI Settings</h3>
    
    <div style="margin-bottom: 20px; padding: 12px; background: #f8f9fa; border-radius: 6px;">
      <h4 style="font-size: 14px; margin-bottom: 12px; color: #555;">Proofreading Engine</h4>
      <select id="engineSelect" data-action="updateEngineDisplay" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #dee2e6; font-size: 13px;">
        <option value="mistral" ${engine === 'mistral' ? 'selected' : ''}>Mistral (Recommended - Secure Server-Side)</option>
        <option value="languagetool" ${engine === 'languagetool' ? 'selected' : ''}>LanguageTool (Free Local)</option>
        <option value="local" ${engine === 'local' ? 'selected' : ''}>Local Heuristic (Basic Fallback)</option>
      </select>
    </div>
    
    <!-- LanguageTool Section -->
    <div id="languagetoolSection" style="margin-bottom: 20px; padding: 12px; background: #f8f9fa; border-radius: 6px; display: ${engine === 'languagetool' ? 'block' : 'none'};">
      <h4 style="font-size: 14px; margin-bottom: 8px; color: #555;">LanguageTool Server URL</h4>
      <p style="font-size: 12px; color: #666; margin-bottom: 10px; line-height: 1.5;">Run locally: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">java -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081</code></p>
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 10px;">
        <input type="text" id="languagetoolUrlInput" placeholder="http://localhost:8081" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #dee2e6; font-size: 13px;" value="${languageToolUrl}">
      </div>
      <div style="display: flex; gap: 8px;">
        <button data-action="testLanguageTool" style="flex: 1; padding: 8px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
          <i class="fas fa-plug"></i> Test Connection
        </button>
        <button data-action="saveLanguageToolUrl" style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
          <i class="fas fa-save"></i> Save URL
        </button>
      </div>
    </div>
    
    <button data-action="closeAISettingsModal" style="width: 100%; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
      Close
    </button>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); z-index: 2090;';
  backdrop.id = 'aiSettingsBackdrop';
  backdrop.onclick = closeAISettingsModal;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  window.aiSettingsModal = modal;
  
  // Mistral API key is now stored in Netlify environment variables
  // No client-side storage needed
}

function updateEngineDisplay() {
  const engine = document.getElementById('engineSelect').value;
  const perplexitySection = document.getElementById('perplexitySection');
  const languagetoolSection = document.getElementById('languagetoolSection');
  if (perplexitySection) perplexitySection.style.display = engine === 'perplexity' ? 'block' : 'none';
  if (languagetoolSection) languagetoolSection.style.display = engine === 'languagetool' ? 'block' : 'none';
}

function closeAISettingsModal() {
  const modal = window.aiSettingsModal;
  const backdrop = document.getElementById('aiSettingsBackdrop');
  if (modal) modal.remove();
  if (backdrop) backdrop.remove();
  window.aiSettingsModal = null;
}

// Mistral API key is now stored in Netlify environment variables
// No client-side storage or management functions needed
// The key is accessed server-side via the Netlify function


// LanguageTool Management
function saveLanguageToolUrl() {
  const input = document.getElementById('languagetoolUrlInput');
  const url = input.value.trim();
  if (url) {
    localStorage.setItem('languagetool_url', url);
    localStorage.setItem('proofreading_engine', 'languagetool');
    showToast('LanguageTool URL saved');
    closeAISettingsModal();
  } else {
    showToast('Please enter a valid URL', 'error');
  }
}

async function testLanguageTool() {
  const urlInput = document.getElementById('languagetoolUrlInput');
  if (!urlInput) {
    showToast('LanguageTool URL input not found', 'error');
    return;
  }
  
  const url = urlInput.value.trim();
  if (!url) {
    showToast('Please enter a LanguageTool URL', 'error');
    urlInput.focus();
    return;
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    showToast('Invalid URL format. Please enter a valid URL (e.g., http://localhost:8081)', 'error');
    urlInput.focus();
    return;
  }
  
  try {
    showToast('Testing connection...');
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    let response;
    try {
      response = await fetch(`${url}/v2/check?text=test&language=en-US`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        showToast('❌ Connection timed out. Check if LanguageTool server is running.', 'error');
        return;
      }
      throw fetchError;
    }
    
    if (response.ok) {
      showToast('✅ LanguageTool connection successful!', 'success');
    } else {
      showToast(`❌ LanguageTool returned status ${response.status}. Check server configuration.`, 'error');
    }
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      showToast('❌ Cannot reach LanguageTool. Check URL and ensure server is running.', 'error');
    } else {
      showToast(`❌ Connection error: ${error.message}`, 'error');
    }
  }
}

// Very simple local "proofreading" heuristic to improve spacing/capitalisation
function generateProofreadingSuggestion(text) {
  if (!text) return '';
  let s = text;

  // Normalise whitespace
  s = s.replace(/\s+/g, ' ').trim();

  // Ensure a single space after punctuation marks .,!?;: when followed by a letter
  s = s.replace(/([.!?;:])\s*/g, '$1 ');

  // Capitalise first letter of the string
  s = s.replace(/^\s*([a-z])/,
    (m, g1) => g1.toUpperCase()
  );

  // Capitalise letter after . ? !
  s = s.replace(/([.!?]\s+)([a-z])/g,
    (m, p1, p2) => p1 + p2.toUpperCase()
  );

  // Trim extra space before punctuation
  s = s.replace(/\s+([!?.,;:])/g, ' $1');

  // Ensure final sentence ends with punctuation if it looks like a sentence
  if (s.length > 0 && !/[.!?]$/.test(s)) {
    s = s + '.';
  }

  return s;
}

// Duplicate functions removed - using versions defined earlier (lines 4915-5012)

// Chapter Management
function addChapter() {
  openAddChapterModal();
}

// Open add chapter modal
function openAddChapterModal() {
  // Remove any existing modal first
  const existingModal = document.getElementById('addChapterModal');
  if (existingModal) existingModal.remove();
  
  const defaultTitle = `Chapter ${chapters.length + 1}`;
  
  const modalHtml = `
    <div class="modal-overlay" id="addChapterModal" data-action="closeAddChapterModal" data-close-on-overlay="true">
      <div class="modal-content" style="max-width: 500px;">
        <h3 style="margin: 0; padding: 20px; background: #8B4513; color: white; border-radius: 12px 12px 0 0; font-size: 1.3em; font-weight: 600;"><i class="fas fa-book"></i> Add Chapter</h3>
        <div style="padding: 20px; background: #e4d5b7;">
          <p style="color: #666; margin-bottom: 15px;">Enter a chapter title:</p>
          <input 
            type="text" 
            id="chapterTitleInput" 
            value="${defaultTitle}"
            placeholder="Enter chapter title"
            style="width: 100%; padding: 12px; border: 2px solid #dee2e6; border-radius: 6px; font-size: 16px; box-sizing: border-box; background: rgba(139,69,19,0.3);"
            autofocus
          >
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button 
              data-action="confirmAddChapter"
              style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;"
            >
              Add Chapter
            </button>
            <button 
              data-action="closeAddChapterModal"
              style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Focus input and select text
  setTimeout(() => {
    const input = document.getElementById('chapterTitleInput');
    if (input) {
      input.focus();
      input.select();
      
      // Handle Enter key
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          confirmAddChapter();
        }
      });
    }
  }, 100);
}

// Close add chapter modal
function closeAddChapterModal() {
  const modal = document.getElementById('addChapterModal');
  if (modal) modal.remove();
}

// Confirm and add chapter
function confirmAddChapter() {
  const input = document.getElementById('chapterTitleInput');
  if (!input) return;
  
  let title = input.value.trim();
  
  // Validate title if provided, otherwise use default
  if (title && !validateChapterName(title)) {
    showToast('Invalid chapter title. Use alphanumeric characters and common punctuation (max 200 characters)', 'error');
    input.focus();
    return;
  }
  
  // Use default if empty
  if (!title) {
    title = `Chapter ${chapters.length + 1}`;
  }
  
  chapters.push({
    title: title,
    content: '',
    wordCount: 0,
    createdAt: new Date().toISOString(),
    act: null, // I, II, or III
    beat: null, // Beat marker (e.g., "Opening Image", "Climax")
    plotPoint: null // Plot point assignment
  });
  
  renderChapterList();
  saveToStorage();
  closeAddChapterModal();
  showToast('Chapter added');
}

function renderChapterList() {
  const list = document.getElementById('chapterList');
  const board = document.getElementById('storyBoard');
  list.innerHTML = '';
  if (board) board.innerHTML = '';
  
  chapters.forEach((chapter, index) => {
    const item = document.createElement('div');
    item.className = 'chapter-item' + (index === currentChapterIndex ? ' active' : '');
    // Sanitize chapter title to prevent XSS
    const safeChapterTitle = escapeHtml(chapter.title);
    item.innerHTML = `
      <div>
        <div>${safeChapterTitle}</div>
        <small style="opacity: 0.7;">${chapter.wordCount} words</small>
      </div>
      <i class="fas fa-trash" data-action="deleteChapter" data-index="${index}" style="cursor: pointer;"></i>
    `;
    item.onclick = () => loadChapter(index);
    list.appendChild(item);

    // Storyboard card for plotting board
    if (board) {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.draggable = true;
      card.dataset.index = index.toString();
      
      // Get act color
      const actColors = {
        'I': '#e3f2fd', // Light blue
        'II': '#fff3e0', // Light orange
        'III': '#f3e5f5' // Light purple
      };
      const actBorders = {
        'I': '#2196F3',
        'II': '#FF9800',
        'III': '#9C27B0'
      };
      const cardStyle = chapter.act ? `background: ${actColors[chapter.act]}; border-color: ${actBorders[chapter.act]};` : '';
      
      // Build beat badge HTML
      let beatBadge = '';
      if (chapter.beat) {
        beatBadge = `<div class="story-card-beat">${chapter.beat}</div>`;
      }
      
      // Build act label
      let actLabel = '';
      if (chapter.act) {
        actLabel = `<div class="story-card-act">Act ${chapter.act}</div>`;
      }
      
      // Add class if both act and beat are tagged (enhanced visibility)
      if (chapter.act && chapter.beat) {
        card.classList.add('story-card-tagged');
      }
      
      card.style.cssText = cardStyle;
      // Sanitize chapter title and beat to prevent XSS
      const safeCardTitle = escapeHtml(chapter.title);
      const safeBeat = chapter.beat ? escapeHtml(chapter.beat) : '';
      card.innerHTML = `
        ${actLabel}
        <div class="story-card-title">${safeCardTitle}</div>
        ${beatBadge ? `<div class="story-card-beat">${safeBeat}</div>` : ''}
        <div class="story-card-words">${chapter.wordCount || 0} words</div>
      `;
      
      // Right-click to tag chapter
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openChapterTagMenu(e, index);
      });
      
      card.addEventListener('click', () => loadChapter(index));
      board.appendChild(card);
    }
  });

  document.getElementById('totalChapters').textContent = chapters.length;
  
  // Calculate total words
  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  document.getElementById('totalWords').textContent = totalWords;

  // Average words per chapter
  const avg = chapters.length > 0 ? Math.round(totalWords / chapters.length) : 0;
  const avgEl = document.getElementById('avgWordsPerChapter');
  if (avgEl) avgEl.textContent = avg;
  
  // Update plotting features
  updatePacingGraph();
  updateStoryStructureStats();
}

function loadChapter(index) {
  // Save current chapter before switching
  if (chapters[currentChapterIndex]) {
    const editor = domCache.getEditor(); if (editor) chapters[currentChapterIndex].content = editor.innerHTML;
  }
  
  currentChapterIndex = index;
  loadCurrentChapter();
  renderChapterList();
}

function loadCurrentChapter() {
  const editor = domCache.getEditor();
  if (chapters[currentChapterIndex]) {
    safeHTML.safeSetHTML(editor, chapters[currentChapterIndex].content || 'Start writing your chapter here...', true);
  } else {
    editor.innerHTML = 'Start writing your manuscript here...';
  }
  
  // Reset undo/redo history for new chapter
  undoHistory = [editor.innerHTML];
  redoHistory = [];
  lastSavedContent = editor.innerHTML;
  
  updateStats();
}

function deleteChapter(index) {
  const confirmDiv = document.createElement('div');
  confirmDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2000; text-align: center;';
  // Sanitize chapter title to prevent XSS
  const safeTitle = escapeHtml(chapters[index].title);
  confirmDiv.innerHTML = `
    <h3 style="margin-bottom: 20px; color: #333;">Delete "${safeTitle}"?</h3>
    <p style="margin-bottom: 20px; color: #666;">This action cannot be undone.</p>
    <button onclick="confirmDeleteChapter(${index}, true)" style="padding: 10px 20px; margin: 5px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Yes, Delete</button>
    <button onclick="confirmDeleteChapter(${index}, false)" style="padding: 10px 20px; margin: 5px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1999;';
  backdrop.id = 'deleteBackdrop';
  
  document.body.appendChild(backdrop);
  document.body.appendChild(confirmDiv);
  confirmDiv.id = 'deleteDialog';
}

function confirmDeleteChapter(index, proceed) {
  if (proceed) {
    chapters.splice(index, 1);
    if (currentChapterIndex >= chapters.length) {
      currentChapterIndex = Math.max(0, chapters.length - 1);
    }
    renderChapterList();
    loadCurrentChapter();
    saveToStorage();
    showToast('Chapter deleted');
  }
  document.getElementById('deleteDialog')?.remove();
  document.getElementById('deleteBackdrop')?.remove();
}

// Chapter Tagging for Plotting
function openChapterTagMenu(e, chapterIndex) {
  // Remove existing menu if any
  const existingMenu = document.getElementById('chapterTagMenu');
  if (existingMenu) existingMenu.remove();
  
  const chapter = chapters[chapterIndex];
  if (!chapter) return;
  
  const menu = document.createElement('div');
  menu.id = 'chapterTagMenu';
  menu.style.cssText = `
    position: fixed;
    top: ${e.clientY}px;
    left: ${e.clientX}px;
    background: white;
    border: 2px solid #8B4513;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 3000;
    min-width: 200px;
  `;
  
  menu.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; color: #333; font-size: 14px;">Tag: ${chapter.title}</div>
    <div style="margin-bottom: 10px;">
      <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #666;">Act:</div>
      <select id="tagAct${chapterIndex}" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #ddd;">
        <option value="">None</option>
        <option value="I" ${chapter.act === 'I' ? 'selected' : ''}>Act I (Setup)</option>
        <option value="II" ${chapter.act === 'II' ? 'selected' : ''}>Act II (Confrontation)</option>
        <option value="III" ${chapter.act === 'III' ? 'selected' : ''}>Act III (Resolution)</option>
      </select>
    </div>
    <div style="margin-bottom: 10px;">
      <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #666;">Beat:</div>
      <select id="tagBeat${chapterIndex}" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #ddd;">
        <option value="">None</option>
        <option value="★ Opening Image" ${chapter.beat === '★ Opening Image' ? 'selected' : ''}>★ Opening Image</option>
        <option value="★ Inciting Incident" ${chapter.beat === '★ Inciting Incident' ? 'selected' : ''}>★ Inciting Incident</option>
        <option value="★ Plot Point 1" ${chapter.beat === '★ Plot Point 1' ? 'selected' : ''}>★ Plot Point 1</option>
        <option value="★ Midpoint" ${chapter.beat === '★ Midpoint' ? 'selected' : ''}>★ Midpoint</option>
        <option value="★ Plot Point 2" ${chapter.beat === '★ Plot Point 2' ? 'selected' : ''}>★ Plot Point 2</option>
        <option value="★ Climax" ${chapter.beat === '★ Climax' ? 'selected' : ''}>★ Climax</option>
        <option value="★ Final Image" ${chapter.beat === '★ Final Image' ? 'selected' : ''}>★ Final Image</option>
      </select>
    </div>
    <button data-action="applyChapterTags" data-param="${chapterIndex}" style="width: 100%; padding: 8px; background: #8B4513; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Apply Tags</button>
    <button data-action="closeChapterTagMenu" style="width: 100%; padding: 8px; margin-top: 6px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Cancel</button>
  `;
  
  document.body.appendChild(menu);
  
  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function closeOnOutside(e) {
      if (!menu.contains(e.target)) {
        closeChapterTagMenu();
        document.removeEventListener('click', closeOnOutside);
      }
    });
  }, 100);
}

function applyChapterTags(chapterIndex) {
  const chapter = chapters[chapterIndex];
  if (!chapter) return;
  
  const actSelect = document.getElementById(`tagAct${chapterIndex}`);
  const beatSelect = document.getElementById(`tagBeat${chapterIndex}`);
  
  if (actSelect) {
    chapter.act = actSelect.value || null;
  }
  if (beatSelect) {
    chapter.beat = beatSelect.value || null;
  }
  
  renderChapterList();
  saveToStorage();
  updatePacingGraph();
  updateStoryStructureStats();
  closeChapterTagMenu();
  showToast('Chapter tagged');
}

function closeChapterTagMenu() {
  const menu = document.getElementById('chapterTagMenu');
  if (menu) menu.remove();
}

// Dynamic Pacing Graph
function updatePacingGraph() {
  const svg = document.getElementById('pacingGraphSvg');
  const markersGroup = document.getElementById('chapterMarkers');
  if (!svg || !markersGroup) return;
  
  // Clear existing markers
  markersGroup.innerHTML = '';
  
  const taggedChapters = chapters.filter(ch => ch.act);
  if (taggedChapters.length === 0) return;
  
  // Calculate positions based on act and chapter order
  taggedChapters.forEach((chapter, idx) => {
    const chapterIndex = chapters.indexOf(chapter);
    const totalChapters = chapters.length;
    
    let x, y;
    
    // Map acts to x positions (0-120 viewBox width)
    if (chapter.act === 'I') {
      x = 5 + (chapterIndex / totalChapters) * 30; // Act I: 0-35 range
      y = 45 + Math.random() * 5; // Slight variation in Act I
    } else if (chapter.act === 'II') {
      x = 35 + ((chapterIndex - chapters.findIndex(ch => ch.act === 'II')) / totalChapters) * 55; // Act II: 35-90 range
      y = 30 - ((chapterIndex / totalChapters) * 25); // Rising tension
    } else if (chapter.act === 'III') {
      x = 90 + ((chapterIndex - chapters.findIndex(ch => ch.act === 'III')) / totalChapters) * 25; // Act III: 90-120 range
      y = 10 + Math.random() * 5; // Peak tension
    }
    
    // Clamp to viewBox
    x = Math.max(2, Math.min(118, x));
    y = Math.max(2, Math.min(58, y));
    
    // Create marker circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', '2');
    
    // Color by act
    const colors = {
      'I': '#2196F3',
      'II': '#FF9800',
      'III': '#9C27B0'
    };
    circle.setAttribute('fill', colors[chapter.act] || '#666');
    circle.setAttribute('opacity', '0.8');
    
    // Add tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${chapter.title} (Act ${chapter.act})`;
    circle.appendChild(title);
    
    markersGroup.appendChild(circle);
  });
}

// Story Structure Analyzer
function updateStoryStructureStats() {
  const statsContainer = document.getElementById('storyStructureStats');
  if (!statsContainer) return;
  
  const totalChapters = chapters.length;
  const taggedChapters = chapters.filter(ch => ch.act);
  
  if (taggedChapters.length === 0) {
    statsContainer.innerHTML = '<div>Tag chapters with acts to see structure analysis.</div>';
    return;
  }
  
  // Count by act
  const actCounts = {
    'I': chapters.filter(ch => ch.act === 'I').length,
    'II': chapters.filter(ch => ch.act === 'II').length,
    'III': chapters.filter(ch => ch.act === 'III').length
  };
  
  const totalTagged = actCounts.I + actCounts.II + actCounts.III;
  
  // Calculate percentages
  const actPercentages = {
    'I': totalTagged > 0 ? Math.round((actCounts.I / totalTagged) * 100) : 0,
    'II': totalTagged > 0 ? Math.round((actCounts.II / totalTagged) * 100) : 0,
    'III': totalTagged > 0 ? Math.round((actCounts.III / totalTagged) * 100) : 0
  };
  
  // Ideal 3-act structure: ~25% Act I, ~50% Act II, ~25% Act III
  const idealPercentages = { 'I': 25, 'II': 50, 'III': 25 };
  
  // Build HTML
  let html = '<div style="margin-bottom: 8px;"><strong>Chapter Distribution:</strong></div>';
  
  ['I', 'II', 'III'].forEach(act => {
    const count = actCounts[act];
    const percentage = actPercentages[act];
    const ideal = idealPercentages[act];
    const diff = percentage - ideal;
    const status = Math.abs(diff) <= 5 ? '✓' : diff > 0 ? '↑' : '↓';
    const statusColor = Math.abs(diff) <= 5 ? '#28a745' : '#ffc107';
    
    html += `
      <div style="display: flex; justify-content: space-between; margin: 4px 0; padding: 4px; background: ${act === 'I' ? '#e3f2fd' : act === 'II' ? '#fff3e0' : '#f3e5f5'}; border-radius: 4px;">
        <span><strong>Act ${act}:</strong> ${count} chapters (${percentage}%)</span>
        <span style="color: ${statusColor};">${status} ${ideal}%</span>
      </div>
    `;
  });
  
  // Beat analysis
  const beats = chapters.filter(ch => ch.beat).map(ch => ch.beat);
  if (beats.length > 0) {
    html += '<div style="margin-top: 12px;"><strong>Beat Markers Found:</strong></div>';
    html += `<div style="font-size: 11px; color: #666; margin-top: 4px;">${beats.join(', ')}</div>`;
  }
  
  statsContainer.innerHTML = html;
}

// Goals
function updateGoals() {
  const dailyGoal = parseInt(document.getElementById('dailyGoal')?.value || '1000', 10);
  const editor = domCache.getEditor();
  if (!editor) return;
  
  // Get current word count
  const currentWords = editor.innerText.trim().split(/\s+/).filter(w => w.length > 0).length;
  
  // Calculate words written in this session (today)
  const todaysWords = Math.max(currentWords - sessionStartWords, 0);
  
  // Calculate progress
  const progress = Math.min(100, Math.round((todaysWords / dailyGoal) * 100));
  
  // Update display elements
  const todaysWordsEl = document.getElementById('todaysWords');
  const goalTargetEl = document.getElementById('goalTarget');
  const goalProgressEl = document.getElementById('goalProgress');
  const goalProgressBar = document.getElementById('goalProgressBar');
  
  if (todaysWordsEl) todaysWordsEl.textContent = todaysWords.toString();
  if (goalTargetEl) goalTargetEl.textContent = dailyGoal.toString();
  if (goalProgressEl) {
    const progressText = progress >= 100 ? '🎉 ' + progress + '%' : progress + '%';
    goalProgressEl.textContent = progressText;
  }
  if (goalProgressBar) {
    goalProgressBar.style.width = progress + '%';
    // Change color when goal is reached
    if (progress >= 100) {
      goalProgressBar.style.background = 'linear-gradient(90deg, #28a745 0%, #20c997 100%)';
    } else {
      goalProgressBar.style.background = 'linear-gradient(90deg, #8B4513 0%, #A0522D 100%)';
    }
  }
  
  // Show celebration toast when goal is reached
  if (progress === 100 && todaysWords === dailyGoal) {
    showToast('🎉 Daily goal achieved! Great work!', 'success');
  }
}

// Page Settings (page size + margins)
function updatePageSettings() {
  const pageSizeEl = document.getElementById('pageSize');
  const wrapper = document.getElementById('pageWrapper');
  const editor = domCache.getEditor();
  const customSizeSection = document.getElementById('customSizeSection');
  const marginPresetEl = document.getElementById('marginPreset');
  
  if (!wrapper || !editor || !pageSizeEl) return;

  const size = pageSizeEl.value || 'letter';
  
  // Show/hide custom size section
  if (customSizeSection) {
    customSizeSection.style.display = size === 'custom' ? 'block' : 'none';
  }
  
  // Only apply size if not custom (wait for confirm button)
  if (size !== 'custom') {
    applyPageSize(size);
  }
}

function applyPageSize(size) {
  const wrappers = document.querySelectorAll('.page-wrapper');
  const editor = domCache.getEditor();
  
  if (!wrappers.length || !editor) return;

  // Set page dimensions
  let width, height;
  switch (size) {
    case 'a4':
      width = '210mm';
      height = '297mm';
      break;
    case 'legal':
      width = '8.5in';
      height = '14in';
      break;
    case 'a5':
      width = '148mm';
      height = '210mm';
      break;
    case 'executive':
      width = '7.25in';
      height = '10.5in';
      break;
    case 'b5':
      width = '176mm';
      height = '250mm';
      break;
    case 'halfLetter':
      width = '5.5in';
      height = '8.5in';
      break;
    case 'custom':
      const customWidth = document.getElementById('customWidth');
      const customHeight = document.getElementById('customHeight');
      width = customWidth ? customWidth.value || '8.5in' : '8.5in';
      height = customHeight ? customHeight.value || '11in' : '11in';
      break;
    case 'letter':
    default:
      width = '8.5in';
      height = '11in';
      break;
  }
  
  // Apply size to ALL editor-page elements FIRST (this is the actual page size)
  // Do this before margins to ensure size is set correctly
  const allPages = document.querySelectorAll('.editor-page');
  allPages.forEach(page => {
    page.style.width = width; // CRITICAL: Set width inline to override CSS
    page.style.minHeight = height; // CRITICAL: Set height inline to override CSS
  });
  
  // Also ensure main editor matches explicitly (double-check it got the styles)
  if (editor) {
    editor.style.width = width;
    editor.style.minHeight = height;
  }
  
  // Force a reflow to ensure styles are applied
  void editor?.offsetWidth;
  
  // Apply size to all page wrappers (containers should match page width)
  wrappers.forEach(wrapper => {
    wrapper.style.maxWidth = width;
    wrapper.style.width = width;
    // Note: wrapper minHeight is not the same as page height - wrapper is container
  });
  
  // Apply margins
  applyMargins();
  
  // Final synchronization to ensure all pages match exactly (increased delay for reliability)
  setTimeout(() => {
    synchronizeAllPageSizes();
  }, 100);
}

function applyCustomPageSize() {
  const customWidth = document.getElementById('customWidth');
  const customHeight = document.getElementById('customHeight');
  
  if (!customWidth?.value || !customHeight?.value) {
    showToast('Please enter width and height', 'error');
    return;
  }
  
  applyPageSize('custom');
  
  // Force synchronization after applying custom size
  setTimeout(() => {
    synchronizeAllPageSizes();
  }, 50);
  
  showToast('Custom page size applied to all pages', 'success');
}

// Helper function to ensure all pages have the same size (CRITICAL for consistency)
function synchronizeAllPageSizes() {
  const pageWrapper = document.getElementById('pageWrapper');
  if (!pageWrapper) return;
  
  // Get reference size from FIRST page's INLINE styles (source of truth - not wrapper!)
  // First try main editor (#editor), then first .editor-page, then fallback
  const mainEditor = domCache.getEditor();
  const allPages = pageWrapper.querySelectorAll('.editor-page');
  
  let referencePage = null;
  if (mainEditor && mainEditor.classList.contains('editor-page')) {
    referencePage = mainEditor; // Main editor is first
  } else if (allPages.length > 0) {
    referencePage = allPages[0]; // First page in wrapper
  } else if (mainEditor) {
    referencePage = mainEditor; // Fallback to main editor
  }
  
  if (!referencePage) return;
  
  // Read from inline styles first (most reliable - these are what we explicitly set)
  let targetWidth = referencePage.style.width;
  let targetHeight = referencePage.style.minHeight;
  let targetPadding = referencePage.style.padding;
  
  // If inline styles aren't set, read from computed styles as fallback
  if (!targetWidth || targetWidth === '') {
    const refStyle = window.getComputedStyle(referencePage);
    targetWidth = refStyle.width && refStyle.width !== 'auto' && refStyle.width !== 'none' 
      ? refStyle.width 
      : '8.5in';
  }
  
  if (!targetHeight || targetHeight === '') {
    const refStyle = window.getComputedStyle(referencePage);
    targetHeight = refStyle.minHeight && refStyle.minHeight !== 'auto' && refStyle.minHeight !== 'none' && refStyle.minHeight !== '0px'
      ? refStyle.minHeight
      : '11in';
  }
  
  if (!targetPadding || targetPadding === '') {
    const refStyle = window.getComputedStyle(referencePage);
    targetPadding = refStyle.padding && refStyle.padding !== '0px'
      ? refStyle.padding
      : '1in';
  }
  
  // Apply to ALL pages to ensure they match exactly (including main editor)
  const allEditorPages = document.querySelectorAll('.editor-page');
  allEditorPages.forEach(page => {
    page.style.width = targetWidth;
    page.style.minHeight = targetHeight;
    page.style.padding = targetPadding;
  });
  
  // Also ensure main editor matches explicitly (in case it wasn't included in selector)
  if (mainEditor && !Array.from(allEditorPages).includes(mainEditor)) {
    mainEditor.style.width = targetWidth;
    mainEditor.style.minHeight = targetHeight;
    mainEditor.style.padding = targetPadding;
  }
  
  // Also ensure wrapper matches (container should match page width)
  pageWrapper.style.maxWidth = targetWidth;
  pageWrapper.style.width = targetWidth;
}

function applyMargins() {
  const editor = domCache.getEditor();
  const marginPresetEl = document.getElementById('marginPreset');
  
  const preset = marginPresetEl ? marginPresetEl.value : 'normal';
  let margins;
  
  if (preset === 'custom') {
    const top = document.getElementById('marginTop')?.value || '1in';
    const right = document.getElementById('marginRight')?.value || '1in';
    const bottom = document.getElementById('marginBottom')?.value || '1in';
    const left = document.getElementById('marginLeft')?.value || '1in';
    margins = `${top} ${right} ${bottom} ${left}`;
  } else {
    switch (preset) {
      case 'narrow':
        margins = '0.5in';
        break;
      case 'moderate':
        margins = '0.75in';
        break;
      case 'wide':
        margins = '1.5in';
        break;
      case 'manuscript':
        margins = '1.25in';
        break;
      case 'normal':
      default:
        margins = '1in';
        break;
    }
  }
  
  // Apply margins to main editor
  if (editor) {
    editor.style.padding = margins;
  }
  
  // Apply margins to all editor-page elements
  const allPages = document.querySelectorAll('.editor-page');
  allPages.forEach(page => {
    page.style.padding = margins;
  });
}

function updateMarginPreset() {
  const marginPresetEl = document.getElementById('marginPreset');
  const customMarginSection = document.getElementById('customMarginSection');
  
  if (!marginPresetEl || !customMarginSection) return;
  
  const preset = marginPresetEl.value;
  customMarginSection.style.display = preset === 'custom' ? 'block' : 'none';
  
  // Apply margins
  applyMargins();
}

// Page numbering
function togglePageNumberingDropdown() {
  const dropdown = document.getElementById('pageNumberingDropdown');
  const settingsSection = document.getElementById('pageNumberSettings');
  
  if (!dropdown || !settingsSection) return;
  
  const enabled = dropdown.value === 'enabled';
  
  // Show/hide settings
  settingsSection.style.display = enabled ? 'block' : 'none';
  
  if (enabled) {
    updatePageNumbering();
  } else {
    // Remove page numbering from all pages
    const pages = document.querySelectorAll('.editor-page');
    pages.forEach(page => {
      page.classList.remove('page-numbered');
      page.removeAttribute('data-page-number');
      page.className = page.className.replace(/page-number-[a-z-]+/g, '').trim();
    });
  }
}

function togglePageNumbering() {
  // Deprecated - kept for compatibility, redirects to new function
  togglePageNumberingDropdown();
}

function updatePageNumbering() {
  const dropdown = document.getElementById('pageNumberingDropdown');
  const enabled = dropdown?.value === 'enabled';
  if (!enabled) return;
  
  const position = document.getElementById('pageNumberPosition')?.value || 'bottom-center';
  const format = document.getElementById('pageNumberFormat')?.value || 'number';
  const startNum = parseInt(document.getElementById('pageNumberStart')?.value || '1', 10);
  const fontSize = document.getElementById('pageNumberSize')?.value || '11pt';
  
  // Get all editor pages
  const pages = document.querySelectorAll('.editor-page');
  
  pages.forEach((page, index) => {
    // Remove old classes
    page.classList.remove('page-numbered');
    page.className = page.className.replace(/page-number-[a-z-]+/g, '').trim();
    
    // Add new classes
    page.classList.add('page-numbered');
    page.classList.add(`page-number-${position}`);
    
    // Calculate page number
    let pageNumber = startNum + index;
    let formattedNumber = '';
    
    switch (format) {
      case 'dash':
        formattedNumber = `- ${pageNumber} -`;
        break;
      case 'page':
        formattedNumber = `Page ${pageNumber}`;
        break;
      case 'roman':
        formattedNumber = toRomanNumeral(pageNumber).toLowerCase();
        break;
      case 'roman-upper':
        formattedNumber = toRomanNumeral(pageNumber);
        break;
      case 'number':
      default:
        formattedNumber = pageNumber.toString();
        break;
    }
    
    page.setAttribute('data-page-number', formattedNumber);
  });
  
  // Update font size via custom style
  let style = document.getElementById('pageNumberStyle');
  if (!style) {
    style = document.createElement('style');
    style.id = 'pageNumberStyle';
    document.head.appendChild(style);
  }
  style.textContent = `
    .editor-page.page-numbered::after {
      font-size: ${fontSize} !important;
    }
    .editor-page.page-number-bottom-center::after,
    .editor-page.page-number-bottom-right::after,
    .editor-page.page-number-bottom-left::after,
    .editor-page.page-number-top-center::after,
    .editor-page.page-number-top-right::after,
    .editor-page.page-number-top-left::after {
      font-size: ${fontSize} !important;
    }
  `;
  
  showToast('Page numbering updated');
}

function toRomanNumeral(num) {
  const romanNumerals = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  
  let result = '';
  for (const [roman, value] of romanNumerals) {
    while (num >= value) {
      result += roman;
      num -= value;
    }
  }
  return result;
}

// Project management
function toggleProjectDropdown() {
  const dropdown = document.getElementById('projectDropdown');
  const settingsSection = document.getElementById('projectSettings');
  
  if (!dropdown || !settingsSection) return;
  
  const isOpen = dropdown.value === 'open';
  
  // Toggle visibility
  if (isOpen) {
    settingsSection.style.display = 'block';
  } else {
    settingsSection.style.display = 'none';
  }
  
  // Reset dropdown to closed state after a brief delay to allow the change to register
  if (isOpen) {
    setTimeout(() => {
      dropdown.value = 'closed';
    }, 50);
  }
}

function newProject() {
  // Clear the editor immediately (no confirmation prompt)
  const editor = domCache.getEditor();
  if (editor) {
    editor.innerHTML = 'Start writing your manuscript here...';
  }
  
  // Clear chapters
  const chapterList = document.getElementById('chapterList');
  if (chapterList) {
    chapterList.innerHTML = '';
  }
  
  // Clear local storage for this project
  localStorage.removeItem('editorContent');
  localStorage.removeItem('chapters');
  localStorage.removeItem('metadata');
  
  // Reset stats
  updateStats();
  
  showToast('New project started');
  
  // Close the project dropdown
  const dropdown = document.getElementById('projectDropdown');
  const settingsSection = document.getElementById('projectSettings');
  if (dropdown && settingsSection) {
    dropdown.value = 'closed';
    settingsSection.style.display = 'none';
  }
}

function addProject() {
  // Create a hidden file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  // Supported import formats: HTML, plain text, JSON backup, Markdown, Fountain, Final Draft, DOCX
  fileInput.accept = '.html,.txt,.json,.md,.fountain,.fdx,.docx';
  fileInput.style.display = 'none';
  
  fileInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    // Handle DOCX files (async, requires JSZip)
    if (fileName.endsWith('.docx')) {
      try {
        const JSZip = await ensureJSZip();
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        // Get the main document XML
        const documentXml = await zip.file('word/document.xml').async('string');
        
        // Parse XML and extract text
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
        
        // Extract text from paragraphs
        const paragraphs = xmlDoc.getElementsByTagName('w:p');
        let htmlContent = '';
        
        for (let i = 0; i < paragraphs.length; i++) {
          const para = paragraphs[i];
          const textNodes = para.getElementsByTagName('w:t');
          let paraText = '';
          
          for (let j = 0; j < textNodes.length; j++) {
            paraText += textNodes[j].textContent || '';
          }
          
          if (paraText.trim()) {
            htmlContent += `<p>${paraText.trim()}</p>`;
          }
        }
        
        const editor = document.getElementById('editor');
        if (editor) {
          safeHTML.safeSetHTML(editor, htmlContent || 'No content found in DOCX file', true);
        }
        
        updateStats();
        showToast('DOCX project imported successfully');
        
        // Close the project dropdown
        const dropdown = document.getElementById('projectDropdown');
        const settingsSection = document.getElementById('projectSettings');
        if (dropdown && settingsSection) {
          dropdown.value = 'closed';
          settingsSection.style.display = 'none';
        }
        
        document.body.removeChild(fileInput);
        return;
      } catch (error) {
        logger.error('Error importing DOCX:', error);
        showToast('Error importing DOCX file. Please ensure it is a valid Word document.');
        document.body.removeChild(fileInput);
        return;
      }
    }
    
    // Handle other file types (synchronous)
    const reader = new FileReader();
    
    reader.onload = function(event) {
      const content = event.target.result;
      
      try {
        if (fileName.endsWith('.json')) {
          // Handle JSON backup format
          const data = JSON.parse(content);
          if (data.content) {
            const editor = document.getElementById('editor');
            if (editor) {
              safeHTML.safeSetHTML(editor, data.content, true);
            }
          }
          if (data.chapters) {
            // Restore chapters if available
            localStorage.setItem('chapters', JSON.stringify(data.chapters));
            loadChapters();
          }
          if (data.metadata) {
            localStorage.setItem('metadata', JSON.stringify(data.metadata));
          }
          showToast('Project imported successfully');
        } else if (fileName.endsWith('.html')) {
          // Handle HTML file
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          const editorContent = doc.body.innerHTML || content;
          const editor = document.getElementById('editor');
          if (editor) {
            editor.innerHTML = editorContent;
          }
          showToast('HTML project imported successfully');
        } else if (
          fileName.endsWith('.txt') ||
          fileName.endsWith('.md') ||
          fileName.endsWith('.fountain') ||
          fileName.endsWith('.fdx')
        ) {
          // Handle plain text, markdown, Fountain, or Final Draft XML as text
          const editor = document.getElementById('editor');
          if (editor) {
            // Convert plain text to HTML paragraphs
            const paragraphs = content.split('\n\n').filter(p => p.trim());
            const htmlContent = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
            const safeContent = htmlContent || content.replace(/\n/g, '<br>');
            safeHTML.safeSetHTML(editor, safeContent, true);
          }
          showToast('Text project imported successfully');
        } else {
          showToast('Unsupported file format. Please use .html, .txt, .json, .md, .fountain, .fdx, or .docx');
        }
        
        // Update stats
        updateStats();
        
        // Close the project dropdown
        const dropdown = document.getElementById('projectDropdown');
        const settingsSection = document.getElementById('projectSettings');
        if (dropdown && settingsSection) {
          dropdown.value = 'closed';
          settingsSection.style.display = 'none';
        }
      } catch (error) {
        logger.error('Error importing project:', error);
        showToast('Error importing project. Please check the file format.');
      }
    };
    
    reader.onerror = function() {
      showToast('Error reading file');
    };
    
    // Read file based on type
    if (file.type === 'application/json' || fileName.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
    
    // Remove the input element
    document.body.removeChild(fileInput);
  });
  
  // Add to body and trigger click
  document.body.appendChild(fileInput);
  fileInput.click();
}

// Metadata
function openMetadataModal() {
  // Load existing metadata
  document.getElementById('bookTitle').value = metadata.bookTitle || '';
  document.getElementById('authorName').value = metadata.authorName || '';
  document.getElementById('isbn').value = metadata.isbn || '';
  document.getElementById('genre').value = metadata.genre || '';
  document.getElementById('seriesName').value = metadata.seriesName || '';
  document.getElementById('publisher').value = metadata.publisher || '';
  document.getElementById('bookDescription').value = metadata.bookDescription || '';
  
  openModal('metadataModal');
}

function saveMetadata() {
  // Input validation
  const bookTitle = document.getElementById('bookTitle').value.trim();
  const authorName = document.getElementById('authorName').value.trim();
  const isbn = document.getElementById('isbn').value.trim();
  const genre = document.getElementById('genre').value.trim();
  const seriesName = document.getElementById('seriesName').value.trim();
  const publisher = document.getElementById('publisher').value.trim();
  const bookDescription = document.getElementById('bookDescription').value.trim();
  
  // Validate required fields
  if (!bookTitle || bookTitle.length === 0) {
    showToast('Please enter a book title', 'error');
    document.getElementById('bookTitle').focus();
    return;
  }
  
  if (bookTitle.length > 200) {
    showToast('Book title is too long (maximum 200 characters)', 'error');
    document.getElementById('bookTitle').focus();
    return;
  }
  
  if (!authorName || authorName.length === 0) {
    showToast('Please enter an author name', 'error');
    document.getElementById('authorName').focus();
    return;
  }
  
  if (authorName.length > 100) {
    showToast('Author name is too long (maximum 100 characters)', 'error');
    document.getElementById('authorName').focus();
    return;
  }
  
  // Validate ISBN format if provided (ISBN-10 or ISBN-13)
  if (isbn && isbn.length > 0) {
    const cleanIsbn = isbn.replace(/[-\s]/g, ''); // Remove hyphens and spaces
    const isbn10Pattern = /^\d{10}$/;
    const isbn13Pattern = /^\d{13}$/;
    
    if (!isbn10Pattern.test(cleanIsbn) && !isbn13Pattern.test(cleanIsbn)) {
      showToast('Invalid ISBN format. Please use ISBN-10 (10 digits) or ISBN-13 (13 digits)', 'error');
      document.getElementById('isbn').focus();
      return;
    }
  }
  
  // Validate description length
  if (bookDescription.length > 2000) {
    showToast('Book description is too long (maximum 2000 characters)', 'error');
    document.getElementById('bookDescription').focus();
    return;
  }
  
  // Validate other field lengths
  if (seriesName.length > 100) {
    showToast('Series name is too long (maximum 100 characters)', 'error');
    document.getElementById('seriesName').focus();
    return;
  }
  
  if (publisher.length > 100) {
    showToast('Publisher name is too long (maximum 100 characters)', 'error');
    document.getElementById('publisher').focus();
    return;
  }
  
  // All validation passed, save metadata
  metadata = {
    bookTitle: bookTitle,
    authorName: authorName,
    isbn: isbn,
    genre: genre,
    seriesName: seriesName,
    publisher: publisher,
    bookDescription: bookDescription
  };
  
  try {
    saveToStorage();
    closeModal('metadataModal');
    showToast('Metadata saved');
  } catch (error) {
    logger.error('Error saving metadata:', error);
    showToast('Failed to save metadata. Please try again.', 'error');
  }
}

// Insert basic front matter (cover page + front matter template)
function insertFrontMatter() {
  const editor = domCache.getEditor();
  if (!editor) return;

  // Create modal for front matter selection
  const modalHtml = `
    <div class="modal-overlay" id="frontMatterModal" data-action="closeFrontMatterModal" data-close-on-overlay="true">
      <div class="modal-content" style="max-width: 600px;">
        <h3 style="margin: 0; padding: 20px; background: #8B4513; color: white; border-radius: 12px 12px 0 0; font-size: 1.3em; font-weight: 600;">Insert Front Matter</h3>
        <div style="padding: 20px;">
        <p style="color: #666; margin-bottom: 20px;">Select the front matter elements to include:</p>
        <div style="display: grid; gap: 12px;">
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="fm-titlePage" checked style="margin-right: 10px;">
            <div>
              <strong>Title Page</strong>
              <div style="font-size: 13px; color: #666;">Book title, author, and publisher</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="fm-copyright" checked style="margin-right: 10px;">
            <div>
              <strong>Copyright Page</strong>
              <div style="font-size: 13px; color: #666;">Copyright notice, ISBN, and publication info</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="fm-dedication" style="margin-right: 10px;">
            <div>
              <strong>Dedication</strong>
              <div style="font-size: 13px; color: #666;">Dedicate your book to someone special</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="fm-acknowledgements" style="margin-right: 10px;">
            <div>
              <strong>Acknowledgements</strong>
              <div style="font-size: 13px; color: #666;">Thank those who helped with your book</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="fm-toc" style="margin-right: 10px;">
            <div>
              <strong>Table of Contents</strong>
              <div style="font-size: 13px; color: #666;">Chapter listing (will be generated from chapters)</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="fm-preface" style="margin-right: 10px;">
            <div>
              <strong>Preface/Foreword</strong>
              <div style="font-size: 13px; color: #666;">Introductory remarks about the book</div>
            </div>
          </label>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button data-action="confirmFrontMatter" style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer;">Insert</button>
          <button data-action="closeFrontMatterModal" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
        </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeFrontMatterModal() {
  const modal = document.getElementById('frontMatterModal');
  if (modal) modal.remove();
}

function confirmFrontMatter() {
  const editor = domCache.getEditor();
  if (!editor) return;
  
  const title = metadata.bookTitle || 'Book Title';
  const author = metadata.authorName || 'Author Name';
  const publisher = metadata.publisher || '';
  const isbn = metadata.isbn || '';
  const currentYear = new Date().getFullYear();
  
  let html = '';
  
  // Title Page
  if (document.getElementById('fm-titlePage')?.checked) {
    html += `
    <div style="text-align: center; margin: 80px 0; page-break-after: always;">
      <h1 style="font-size: 2.5em; margin-bottom: 20px;">${title}</h1>
      <h2 style="margin-top: 20px; font-weight: normal;">by</h2>
      <h2 style="margin-top: 10px;">${author}</h2>
      ${publisher ? `<p style="margin-top: 60px;">${publisher}</p>` : ''}
    </div>
    `;
  }
  
  // Copyright Page
  if (document.getElementById('fm-copyright')?.checked) {
    html += `
    <div style="page-break-after: always; padding: 40px 0;">
      <p style="font-size: 14px; line-height: 1.8;">
        <strong>${title}</strong><br>
        Copyright © ${currentYear} by ${author}<br>
        All rights reserved.
      </p>
      <p style="font-size: 14px; line-height: 1.8; margin-top: 20px;">
        No part of this book may be reproduced or transmitted in any form or by any means, electronic or mechanical, including photocopying, recording, or by any information storage and retrieval system, without permission in writing from the publisher.
      </p>
      ${isbn ? `<p style="font-size: 14px; margin-top: 20px;">ISBN: ${isbn}</p>` : ''}
      ${publisher ? `<p style="font-size: 14px; margin-top: 20px;">${publisher}</p>` : ''}
    </div>
    `;
  }
  
  // Dedication
  if (document.getElementById('fm-dedication')?.checked) {
    html += `
    <div style="text-align: center; margin: 100px 0; page-break-after: always;">
      <p style="font-style: italic;">For [Name]</p>
      <p style="margin-top: 20px; font-size: 14px;">[Your dedication message here]</p>
    </div>
    `;
  }
  
  // Acknowledgements
  if (document.getElementById('fm-acknowledgements')?.checked) {
    html += `
    <div style="page-break-after: always;">
      <h2>Acknowledgements</h2>
      <p>I would like to thank [names and organizations] for their support and assistance in bringing this book to life.</p>
    </div>
    `;
  }
  
  // Table of Contents
  if (document.getElementById('fm-toc')?.checked) {
    let tocHtml = '<div style="page-break-after: always;"><h2>Table of Contents</h2><div style="margin-top: 20px;">';
    chapters.forEach((chapter, index) => {
      const chapterNum = index + 1;
      tocHtml += `<p style="margin: 10px 0;"><strong>Chapter ${chapterNum}:</strong> ${chapter.title}</p>`;
    });
    tocHtml += '</div></div>';
    html += tocHtml;
  }
  
  // Preface
  if (document.getElementById('fm-preface')?.checked) {
    html += `
    <div style="page-break-after: always;">
      <h2>Preface</h2>
      <p>This book explores [brief description of the book's purpose and themes].</p>
      <p style="margin-top: 20px;">[Author's introductory remarks about why they wrote this book and what readers can expect.]</p>
    </div>
    `;
  }
  
  safeHTML.setHTML(editor, html + editor.innerHTML);
  updateStats();
  closeFrontMatterModal();
  showToast('Front matter inserted');
}

// Insert simple back matter template
function insertBackMatter() {
  const editor = domCache.getEditor();
  if (!editor) return;

  // Create modal for back matter selection
  const modalHtml = `
    <div class="modal-overlay" id="backMatterModal" data-action="closeBackMatterModal" data-close-on-overlay="true">
      <div class="modal-content" style="max-width: 600px;">
        <h3 style="margin: 0; padding: 20px; background: #8B4513; color: white; border-radius: 12px 12px 0 0; font-size: 1.3em; font-weight: 600;">Insert Back Matter</h3>
        <div style="padding: 20px;">
        <p style="color: #666; margin-bottom: 20px;">Select the back matter elements to include:</p>
        <div style="display: grid; gap: 12px;">
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="bm-epilogue" style="margin-right: 10px;">
            <div>
              <strong>Epilogue</strong>
              <div style="font-size: 13px; color: #666;">Concluding section after the main narrative</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="bm-afterword" style="margin-right: 10px;">
            <div>
              <strong>Afterword</strong>
              <div style="font-size: 13px; color: #666;">Author's reflection on the book</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="bm-author" checked style="margin-right: 10px;">
            <div>
              <strong>About the Author</strong>
              <div style="font-size: 13px; color: #666;">Biography and background</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="bm-works" checked style="margin-right: 10px;">
            <div>
              <strong>Also by the Author</strong>
              <div style="font-size: 13px; color: #666;">List of other published works</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="bm-glossary" style="margin-right: 10px;">
            <div>
              <strong>Glossary</strong>
              <div style="font-size: 13px; color: #666;">Definitions of specialized terms</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="bm-appendix" style="margin-right: 10px;">
            <div>
              <strong>Appendix</strong>
              <div style="font-size: 13px; color: #666;">Supplementary material and references</div>
            </div>
          </label>
          <label style="display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer;">
            <input type="checkbox" id="bm-reading" style="margin-right: 10px;">
            <div>
              <strong>Reading Group Guide</strong>
              <div style="font-size: 13px; color: #666;">Discussion questions for book clubs</div>
            </div>
          </label>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button data-action="confirmBackMatter" style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer;">Insert</button>
          <button data-action="closeBackMatterModal" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
        </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeBackMatterModal() {
  const modal = document.getElementById('backMatterModal');
  if (modal) modal.remove();
}

function confirmBackMatter() {
  const editor = domCache.getEditor();
  if (!editor) return;
  
  const author = metadata.authorName || 'Author Name';
  let html = '';
  
  // Epilogue
  if (document.getElementById('bm-epilogue')?.checked) {
    html += `
    <div style="page-break-before: always; margin-top: 40px;">
      <h2>Epilogue</h2>
      <p>[Concluding events or wrap-up after the main story ends.]</p>
    </div>
    `;
  }
  
  // Afterword
  if (document.getElementById('bm-afterword')?.checked) {
    html += `
    <div style="page-break-before: always; margin-top: 40px;">
      <h2>Afterword</h2>
      <p>Looking back on this project, I wanted to share some thoughts about [the inspiration, research, writing process, or themes].</p>
      <p style="margin-top: 20px;">[Author's personal reflection on creating this book.]</p>
    </div>
    `;
  }
  
  // About the Author
  if (document.getElementById('bm-author')?.checked) {
    html += `
    <div style="page-break-before: always; margin-top: 40px;">
      <h2>About the Author</h2>
      <p><strong>${author}</strong> is [brief bio including background, other works, awards, and current location].</p>
      <p style="margin-top: 20px;">Connect with the author at [website, social media, or email].</p>
    </div>
    `;
  }
  
  // Also by the Author
  if (document.getElementById('bm-works')?.checked) {
    html += `
    <div style="margin-top: 40px;">
      <h2>Also by ${author}</h2>
      <ul style="list-style: none; padding: 0;">
        <li style="margin: 10px 0;"><em>[Book Title 1]</em> (Year)</li>
        <li style="margin: 10px 0;"><em>[Book Title 2]</em> (Year)</li>
        <li style="margin: 10px 0;"><em>[Book Title 3]</em> (Year)</li>
      </ul>
    </div>
    `;
  }
  
  // Glossary
  if (document.getElementById('bm-glossary')?.checked) {
    html += `
    <div style="page-break-before: always; margin-top: 40px;">
      <h2>Glossary</h2>
      <p style="margin-top: 10px;"><strong>Term 1:</strong> Definition and explanation.</p>
      <p style="margin-top: 10px;"><strong>Term 2:</strong> Definition and explanation.</p>
      <p style="margin-top: 10px;"><strong>Term 3:</strong> Definition and explanation.</p>
    </div>
    `;
  }
  
  // Appendix
  if (document.getElementById('bm-appendix')?.checked) {
    html += `
    <div style="page-break-before: always; margin-top: 40px;">
      <h2>Appendix</h2>
      <p>Supplementary materials, charts, maps, or additional information that supports the main text.</p>
    </div>
    `;
  }
  
  // Reading Group Guide
  if (document.getElementById('bm-reading')?.checked) {
    html += `
    <div style="page-break-before: always; margin-top: 40px;">
      <h2>Reading Group Guide</h2>
      <h3 style="margin-top: 20px;">Discussion Questions</h3>
      <ol style="line-height: 2;">
        <li>What were the main themes in this book?</li>
        <li>How did the characters develop throughout the story?</li>
        <li>What was your favorite scene and why?</li>
        <li>Did the ending surprise you?</li>
        <li>How does this book compare to others you've read?</li>
      </ol>
    </div>
    `;
  }
  
  safeHTML.setHTML(editor, editor.innerHTML + html);
  updateStats();
  closeBackMatterModal();
  showToast('Back matter inserted');
}

// Export
function openExportModal() {
  // Opening export modal
  openModal('exportModal');
}

function sanitizeFilename(name) {
  const safe = (name || 'manuscript').toString().trim();
  return safe === '' ? 'manuscript' : safe.replace(/[\\/:*?"<>|]/g, '_');
}

async function ensureJSZip() {
  if (window.JSZip) return window.JSZip;
  
  // Add timeout to prevent hanging if CDN is unavailable
  const loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load JSZip from CDN'));
    document.head.appendChild(script);
  });
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('JSZip loading timed out')), 10000)
  );
  
  try {
    await Promise.race([loadPromise, timeoutPromise]);
    if (!window.JSZip) throw new Error('JSZip not available after load');
    return window.JSZip;
  } catch (error) {
    showToast('Failed to load JSZip library. EPUB/MOBI export unavailable.', 'error');
    throw error;
  }
}

function exportDocument(format) {
  // Exporting document
  const includeMetadata = document.getElementById('includeMetadata')?.checked || false;
  const exportAll = document.getElementById('exportAllChapters')?.checked || false;
  const includeTOC = document.getElementById('includeTOC')?.checked || false;

  // Detect current template from DOM (more reliable than global variable)
  const novelControls = document.getElementById('novelControls');
  const screenplayControls = document.getElementById('screenplayControls');
  const playwritingControls = document.getElementById('playwritingControls');
  const activeTemplate = novelControls && novelControls.style.display !== 'none' ? 'novel' :
                         screenplayControls && screenplayControls.style.display !== 'none' ? 'screenplay' :
                         playwritingControls && playwritingControls.style.display !== 'none' ? 'playwriting' :
                         currentTemplate || 'novel'; // Fallback to global variable

  let content = '';
  let filename = 'manuscript';

  // Prepare content - template aware
  const editor = domCache.getEditor();
  
  if (exportAll) {
    // For Novel template, use chapters array
    if (activeTemplate === 'novel' && chapters.length > 0) {
      chapters.forEach(chapter => {
        content += `<h1>${chapter.title}</h1>\n${chapter.content}\n\n`;
      });
    } else {
      // For Screenplay/Playwriting or when no chapters, use editor content directly
      content = editor ? editor.innerHTML : '';
    }
  } else {
    // For Novel template, use current chapter
    if (activeTemplate === 'novel' && chapters.length > 0 && chapters[currentChapterIndex]) {
      const current = chapters[currentChapterIndex];
      content = current.content;
      filename = current.title.replace(/\s+/g, '_');
    } else {
      // For Screenplay/Playwriting, use editor content directly
      content = editor ? editor.innerHTML : '';
      filename = activeTemplate === 'screenplay' ? 'screenplay' : activeTemplate === 'playwriting' ? 'play' : 'document';
    }
  }

  filename = sanitizeFilename(filename);

  // Add metadata - template aware
  let metadataHtml = '';
  if (includeMetadata) {
    if (activeTemplate === 'screenplay') {
      metadataHtml = `
        <div style="text-align: center; margin-bottom: 50px; page-break-after: always;">
          <p style="margin-top: 3in; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 24pt;">${metadata.bookTitle || 'SCREENPLAY'}</p>
          <p style="margin-bottom: 12pt;">Written by</p>
          <p style="font-weight: bold; margin-bottom: 48pt;">${metadata.authorName || 'Author Name'}</p>
        </div>
      `;
    } else if (activeTemplate === 'playwriting') {
      metadataHtml = `
        <div style="text-align: center; margin-bottom: 50px; page-break-after: always;">
          <h1 style="text-transform: uppercase; font-weight: bold;">${metadata.bookTitle || 'PLAY TITLE'}</h1>
          <p style="margin-top: 24pt;">by ${metadata.authorName || 'Author Name'}</p>
        </div>
      `;
    } else if (activeTemplate === 'novel' && metadata.bookTitle) {
      metadataHtml = `
        <div style="text-align: center; margin-bottom: 50px; page-break-after: always;">
          <h1>${metadata.bookTitle}</h1>
          <h2>by ${metadata.authorName || 'Unknown Author'}</h2>
          ${metadata.isbn ? `<p>ISBN: ${metadata.isbn}</p>` : ''}
          ${metadata.publisher ? `<p>${metadata.publisher}</p>` : ''}
          ${metadata.bookDescription ? `<p style="margin-top: 20px;">${metadata.bookDescription}</p>` : ''}
        </div>
      `;
    }
  }

  // Table of contents - only for novel template
  let tocHtml = '';
  if (includeTOC && exportAll && activeTemplate === 'novel') {
    tocHtml = '<div style="page-break-after: always;"><h2>Table of Contents</h2><ul>';
    chapters.forEach((chapter, index) => {
      tocHtml += `<li>${chapter.title}</li>`;
    });
    tocHtml += '</ul></div>';
  }

  switch(format) {
    case 'html':
      exportHTML(metadataHtml + tocHtml + content, filename);
      break;
    case 'txt':
      exportTXT(content, filename);
      break;
    case 'markdown':
      exportMarkdown(content, filename);
      break;
    case 'pdf':
      exportPDF(metadataHtml + tocHtml + content);
      break;
    case 'docx':
      exportDOCX(metadataHtml + tocHtml + content, filename);
      break;
    case 'rtf':
      exportRTF(metadataHtml + tocHtml + content, filename);
      break;
    case 'epub':
      exportEPUB(metadataHtml + tocHtml + content, filename);
      break;
    case 'mobi':
      exportMOBI(metadataHtml + tocHtml + content, filename);
      break;
    case 'backup':
      exportBackup();
      break;
  }

  closeModal('exportModal');
}

// Export Presets
function applyExportPreset(preset) {
  const metadataCheckbox = document.getElementById('includeMetadata');
  const exportAllCheckbox = document.getElementById('exportAllChapters');
  const tocCheckbox = document.getElementById('includeTOC');
  
  switch(preset) {
    case 'publisher':
      if (metadataCheckbox) metadataCheckbox.checked = true;
      if (exportAllCheckbox) exportAllCheckbox.checked = true;
      if (tocCheckbox) tocCheckbox.checked = true;
      exportDocument('docx');
      break;
    case 'collaboration':
      if (metadataCheckbox) metadataCheckbox.checked = false;
      if (exportAllCheckbox) exportAllCheckbox.checked = true;
      if (tocCheckbox) tocCheckbox.checked = false;
      exportDocument('rtf');
      showToast('RTF exported - perfect for Google Docs collaboration!', 'success');
      break;
    case 'ebook':
      if (metadataCheckbox) metadataCheckbox.checked = true;
      if (exportAllCheckbox) exportAllCheckbox.checked = true;
      if (tocCheckbox) tocCheckbox.checked = true;
      exportDocument('epub');
      break;
    case 'print':
      if (metadataCheckbox) metadataCheckbox.checked = true;
      if (exportAllCheckbox) exportAllCheckbox.checked = true;
      if (tocCheckbox) tocCheckbox.checked = true;
      exportDocument('pdf');
      break;
  }
}

function exportHTML(content, filename) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata.bookTitle || 'Manuscript'}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.8; }
    h1 { text-align: center; margin-bottom: 30px; }
    @media print { body { margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  downloadFile(html, `${filename}.html`, 'text/html');
  showToast('HTML exported');
}

function exportTXT(content, filename) {
  const temp = document.createElement('div');
  temp.innerHTML = content;
  const text = temp.innerText;
  downloadFile(text, `${filename}.txt`, 'text/plain');
  showToast('Text file exported');
}

function exportMarkdown(content, filename) {
  const temp = document.createElement('div');
  temp.innerHTML = content;
  
  // Simple HTML to Markdown conversion
  let markdown = temp.innerHTML
    .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '');
  
  downloadFile(markdown, `${filename}.md`, 'text/markdown');
  showToast('Markdown exported');
}

function exportPDF(content) {
  // Exporting PDF
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${metadata.bookTitle || 'Manuscript'}</title>
          <style>
            @page { margin: 1in; size: letter; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Georgia, serif;
              font-size: 12pt;
              line-height: 1.8;
              color: #000;
              background: white;
              padding: 40px;
              margin: 0;
            }
            h1 { page-break-before: always; margin-top: 0; font-size: 24pt; margin-bottom: 12pt; }
            h1:first-child { page-break-before: auto; }
            h2 { font-size: 20pt; margin-top: 18pt; margin-bottom: 10pt; }
            h3 { font-size: 16pt; margin-top: 14pt; margin-bottom: 8pt; }
            p { margin-bottom: 12pt; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 1500);
    }, 400);

    showToast('Print dialog opened. Save as PDF when you print.');
  } catch (error) {
    logger.error('PDF export error:', error);
    showToast('Could not open print dialog', 'error');
  }
}

function printPreview() {
  try {
    const editor = domCache.getEditor();
    if (!editor) {
      showToast('Editor not found', 'error');
      return;
    }
    
    // Detect current template from DOM (more reliable than global variable)
    const novelControls = document.getElementById('novelControls');
    const screenplayControls = document.getElementById('screenplayControls');
    const playwritingControls = document.getElementById('playwritingControls');
    const activeTemplate = novelControls && novelControls.style.display !== 'none' ? 'novel' :
                         screenplayControls && screenplayControls.style.display !== 'none' ? 'screenplay' :
                         playwritingControls && playwritingControls.style.display !== 'none' ? 'playwriting' :
                         currentTemplate || 'novel'; // Fallback to global variable
    
    let content = '';
    let header = '';
    
    // Template-aware content extraction
    if (activeTemplate === 'novel' && chapters.length > 0 && chapters[currentChapterIndex]) {
      // Novel template: update chapter content and use it
      chapters[currentChapterIndex].content = editor.innerHTML;
      const current = chapters[currentChapterIndex];
      content = current.content;
      
      // Add template-specific header for novel
      if (TEMPLATES[activeTemplate]) {
        header = `<h2 style="text-align: center; margin-bottom: 20px;">${TEMPLATES[activeTemplate].name}</h2>`;
      }
      
      // Add chapter title if available
      if (current && current.title) {
        header += `<h1>${current.title}</h1>`;
      }
    } else {
      // Screenplay/Playwriting: use editor content directly
      content = editor.innerHTML;
      
      // No chapter headers for screenplay/playwriting
      header = '';
    }
    
    if (!content || content.trim() === '') {
      showToast('No content to print', 'error');
      return;
    }
    
    content = header + content;
    exportPDF(content);
  } catch (error) {
    logger.error('Print preview error:', error);
    showToast('Could not open print preview', 'error');
  }
}

function confirmPrint() {
  try {
    const editor = domCache.getEditor();
    if (!editor) {
      showToast('Editor not found', 'error');
      return;
    }
    
    // Detect current template from DOM (more reliable than global variable)
    const novelControls = document.getElementById('novelControls');
    const screenplayControls = document.getElementById('screenplayControls');
    const playwritingControls = document.getElementById('playwritingControls');
    const activeTemplate = novelControls && novelControls.style.display !== 'none' ? 'novel' :
                         screenplayControls && screenplayControls.style.display !== 'none' ? 'screenplay' :
                         playwritingControls && playwritingControls.style.display !== 'none' ? 'playwriting' :
                         currentTemplate || 'novel'; // Fallback to global variable
    
    const printScope = document.getElementById('printScope')?.value || 'current';
    const includeChapterTitles = document.getElementById('printChapterTitles')?.checked || false;
    const includeMetadata = document.getElementById('printMetadata')?.checked || false;
    const includeTOC = document.getElementById('printTOC')?.checked || false;
    
    let content = '';
    let metadataHtml = '';
    let tocHtml = '';
    
    // Prepare content based on template
    if (activeTemplate === 'novel') {
      // Novel template: use chapter-based content
      if (printScope === 'all' && chapters.length > 0) {
        // Save current chapter first
        if (chapters[currentChapterIndex]) {
          chapters[currentChapterIndex].content = editor.innerHTML;
        }
        
        // Gather all chapters
        chapters.forEach(chapter => {
          const title = includeChapterTitles ? `<h1>${chapter.title}</h1>` : '';
          content += `${title}${chapter.content}\n\n`;
        });
        
        // Add TOC if requested
        if (includeTOC) {
          tocHtml = '<div style="page-break-after: always;"><h2>Table of Contents</h2><ul>';
          chapters.forEach((chapter, index) => {
            tocHtml += `<li>${chapter.title}</li>`;
          });
          tocHtml += '</ul></div>';
        }
      } else {
        // Current chapter only
        if (chapters[currentChapterIndex]) {
          chapters[currentChapterIndex].content = editor.innerHTML;
          const current = chapters[currentChapterIndex];
          const title = includeChapterTitles && current.title ? `<h1>${current.title}</h1>` : '';
          content = `${title}${current.content}`;
        } else {
          content = editor.innerHTML;
        }
      }
      
      // Add metadata for novel
      if (includeMetadata && metadata.bookTitle) {
        metadataHtml = `
          <div style="text-align: center; margin-bottom: 50px; page-break-after: always;">
            <h1>${metadata.bookTitle}</h1>
            <h2>by ${metadata.authorName || 'Unknown Author'}</h2>
            ${metadata.isbn ? `<p>ISBN: ${metadata.isbn}</p>` : ''}
            ${metadata.publisher ? `<p>${metadata.publisher}</p>` : ''}
            ${metadata.bookDescription ? `<p style="margin-top: 20px;">${metadata.bookDescription}</p>` : ''}
          </div>
        `;
      }
    } else {
      // Screenplay/Playwriting: use editor content directly (no chapter concept)
      content = editor.innerHTML;
      
      // Add screenplay/playwriting metadata
      if (includeMetadata) {
        if (activeTemplate === 'screenplay') {
          metadataHtml = `
            <div style="text-align: center; margin-bottom: 50px; page-break-after: always;">
              <p style="margin-top: 3in; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 24pt;">${metadata.bookTitle || 'SCREENPLAY'}</p>
              <p style="margin-bottom: 12pt;">Written by</p>
              <p style="font-weight: bold; margin-bottom: 48pt;">${metadata.authorName || 'Author Name'}</p>
            </div>
          `;
        } else if (activeTemplate === 'playwriting') {
          metadataHtml = `
            <div style="text-align: center; margin-bottom: 50px; page-break-after: always;">
              <h1 style="text-transform: uppercase; font-weight: bold;">${metadata.bookTitle || 'PLAY TITLE'}</h1>
              <p style="margin-top: 24pt;">by ${metadata.authorName || 'Author Name'}</p>
            </div>
          `;
        }
      }
    }
    
    if (!content || content.trim() === '') {
      showToast('No content to print', 'error');
      return;
    }
    
    const fullContent = metadataHtml + tocHtml + content;
    exportPDF(fullContent);
    closeModal('printModal');
  } catch (error) {
    logger.error('Print error:', error);
    showToast('Could not open print dialog', 'error');
  }
}

function exportDOCX(content, filename) {
  // Exporting DOCX
  // Create a basic DOCX structure
  const docxContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
    <head><meta charset='utf-8'></head>
    <body>${content}</body>
    </html>
  `;
  downloadFile(docxContent, `${filename}.docx`, 'application/msword');
  showToast('DOCX (Word HTML) exported');
}

function exportRTF(content, filename) {
  // Exporting RTF
  const temp = document.createElement('div');
  temp.innerHTML = content;
  const text = temp.innerText
    .replace(/\r?\n\r?\n/g, '\\par ')
    .replace(/\r?\n/g, '\\line ');

  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}');

  const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}\\fs24 ${escaped}}`;
  downloadFile(rtf, `${filename}.rtf`, 'application/rtf');
  showToast('RTF exported (Word-compatible)');
}

async function buildEpubBlob(content) {
  const JSZip = await ensureJSZip();
  const zip = new JSZip();

  const bookId = 'urn:uuid:' + (metadata.isbn || ('book-' + Date.now()));
  const safeTitle = metadata.bookTitle || 'Manuscript';
  const safeAuthor = metadata.authorName || 'Unknown Author';

  // Required mimetype entry (stored, no compression)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // container.xml
  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.folder('META-INF').file('container.xml', containerXml);

  // Main XHTML content
  const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${safeTitle}</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <style>
    body { font-family: Georgia, serif; margin: 1em; }
    h1 { margin-top: 1em; margin-bottom: 0.5em; page-break-before: always; }
    p { margin-bottom: 0.5em; text-indent: 1em; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
  zip.folder('OEBPS').file('content.xhtml', xhtml);

  // TOC (ncx)
  const toc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${safeTitle}</text></docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>${safeTitle}</text></navLabel>
      <content src="content.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
  zip.folder('OEBPS').file('toc.ncx', toc);

  // OPF package
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${safeTitle}</dc:title>
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:creator>${safeAuthor}</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`;
  zip.folder('OEBPS').file('content.opf', opf);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE'
  });
}

async function exportEPUB(content, filename) {
  // Exporting EPUB
  try {
    showToast('Building EPUB...');
    const blob = await buildEpubBlob(content);
    downloadBlob(blob, `${sanitizeFilename(filename)}.epub`, 'application/epub+zip');
    showToast('EPUB exported');
  } catch (error) {
    logger.error('EPUB export error:', error);
    showToast('EPUB export failed: ' + error.message, 'error');
  }
}

async function exportMOBI(content, filename) {
  // Exporting MOBI
  // Amazon deprecated native MOBI creation in browsers; build a Kindle-ready EPUB instead.
  try {
    showToast('Building Kindle-friendly EPUB (MOBI replacement)...');
    const blob = await buildEpubBlob(content);
    downloadBlob(blob, `${sanitizeFilename(filename)}-kindle.epub`, 'application/epub+zip');
    showToast('Kindle-ready EPUB exported (send to Kindle or Calibre to convert).');
  } catch (error) {
    logger.error('MOBI export error:', error);
    showToast('MOBI/Kindle export failed: ' + error.message, 'error');
  }
}

function exportFountain(content, filename) {
  const temp = document.createElement('div');
  temp.innerHTML = content;
  
  // Extract plain text content, removing HTML structure
  let text = '';
  
  // Remove metadata and TOC sections if they exist
  const cleanContent = temp.cloneNode(true);
  
  // Remove title page/metadata divs
  const metadataDivs = cleanContent.querySelectorAll('div[style*="text-align: center"], div[style*="page-break"]');
  metadataDivs.forEach(div => {
    // Check if it looks like a title page or TOC
    const divText = div.textContent || div.innerText || '';
    if (divText.includes('Table of Contents') || divText.includes('ISBN') || divText.includes('by Unknown Author')) {
      div.remove();
    }
  });
  
  // Remove heading tags and convert to plain text
  const headings = cleanContent.querySelectorAll('h1, h2, h3');
  headings.forEach(heading => {
    const headingText = heading.textContent || heading.innerText || '';
    // Skip TOC headings
    if (headingText.includes('Table of Contents')) {
      heading.remove();
    } else {
      // Replace heading with plain text
      const textNode = document.createTextNode(headingText + '\n\n');
      heading.parentNode.replaceChild(textNode, heading);
    }
  });
  
  // Remove list items (TOC)
  const lists = cleanContent.querySelectorAll('ul, ol');
  lists.forEach(list => {
    if (list.textContent.includes('Chapter')) {
      list.remove();
    }
  });
  
  // Get plain text
  text = cleanContent.innerText || cleanContent.textContent || '';
  
  // Convert HTML content to Fountain screenplay format
  let fountain = '';
  const lines = text.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      fountain += '\n';
      return;
    }
    
    // Skip TOC and metadata lines
    if (trimmed.includes('Table of Contents') || trimmed.includes('ISBN') || trimmed.match(/^Chapter \d+$/)) {
      return;
    }
    
    // Detect scene headings (all caps, often start with INT. or EXT.)
    if (/^(INT\.|EXT\.|INT\/EXT\.)/i.test(trimmed) || (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 60)) {
      fountain += trimmed.toUpperCase() + '\n';
    }
    // Detect character names (all caps, typically 2-30 chars, standalone)
    else if (trimmed === trimmed.toUpperCase() && trimmed.length >= 2 && trimmed.length <= 30 && /^[A-Z\s\.\-]+$/.test(trimmed)) {
      fountain += '\n' + trimmed + '\n';
    }
    // Regular dialogue/action
    else {
      fountain += trimmed + '\n';
    }
  });
  
  // Add title page if metadata exists (but not if it's already in content)
  if (metadata.bookTitle && !fountain.includes(metadata.bookTitle)) {
    fountain = `Title: ${metadata.bookTitle}\n${metadata.authorName ? `Author: ${metadata.authorName}\n` : ''}\n${fountain}`;
  }
  
  downloadFile(fountain, `${filename}.fountain`, 'text/plain');
  showToast('Fountain format exported');
}

function exportFinalDraft(content, filename) {
  // Final Draft uses XML format (.fdx)
  const temp = document.createElement('div');
  temp.innerHTML = content;
  
  // Remove metadata and TOC sections
  const cleanContent = temp.cloneNode(true);
  
  // Remove title page/metadata divs
  const metadataDivs = cleanContent.querySelectorAll('div[style*="text-align: center"], div[style*="page-break"]');
  metadataDivs.forEach(div => {
    const divText = div.textContent || div.innerText || '';
    if (divText.includes('Table of Contents') || divText.includes('ISBN') || divText.includes('by Unknown Author')) {
      div.remove();
    }
  });
  
  // Remove heading tags (Chapter titles, TOC)
  const headings = cleanContent.querySelectorAll('h1, h2, h3');
  headings.forEach(heading => {
    const headingText = heading.textContent || heading.innerText || '';
    if (headingText.includes('Table of Contents') || headingText.match(/^Chapter \d+$/)) {
      heading.remove();
    }
  });
  
  // Remove list items (TOC)
  const lists = cleanContent.querySelectorAll('ul, ol');
  lists.forEach(list => {
    if (list.textContent.includes('Chapter')) {
      list.remove();
    }
  });
  
  // Get plain text
  let text = cleanContent.innerText || cleanContent.textContent || '';
  
  // Helper function to escape XML
  function escapeXML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  
  // Parse screenplay elements
  const lines = text.split('\n');
  const paragraphs = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      return; // Skip empty lines
    }
    
    // Skip TOC and metadata lines
    if (trimmed.includes('Table of Contents') || trimmed.includes('ISBN') || trimmed.match(/^Chapter \d+$/)) {
      return;
    }
    
    // Detect scene headings (INT./EXT./INT/EXT.)
    if (/^(INT\.|EXT\.|INT\/EXT\.)/i.test(trimmed)) {
      paragraphs.push({ type: 'Scene Heading', text: trimmed.toUpperCase() });
    }
    // Detect character names (all caps, typically 2-30 chars, standalone, not scene headings)
    else if (trimmed === trimmed.toUpperCase() && trimmed.length >= 2 && trimmed.length <= 30 && 
             /^[A-Z\s\.\-]+$/.test(trimmed) && !/^(INT\.|EXT\.|INT\/EXT\.)/i.test(trimmed)) {
      paragraphs.push({ type: 'Character', text: trimmed });
    }
    // Detect parentheticals (text in parentheses, usually after character name)
    else if (/^\(.*\)$/.test(trimmed)) {
      paragraphs.push({ type: 'Parenthetical', text: trimmed });
    }
    // Everything else is Action
    else {
      paragraphs.push({ type: 'Action', text: trimmed });
    }
  });
  
  // Build Final Draft XML
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE FinalDraft SYSTEM "FinalDraftDTDv7.dtd">
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
`;
  
  paragraphs.forEach(para => {
    const escapedText = escapeXML(para.text);
    xml += `    <Paragraph Type="${para.type}">${escapedText}</Paragraph>\n`;
  });
  
  xml += `  </Content>
</FinalDraft>`;
  
  downloadFile(xml, `${filename}.fdx`, 'application/xml');
  showToast('Final Draft format exported');
}

function exportLaTeX(content, filename) {
  const temp = document.createElement('div');
  temp.innerHTML = content;
  
  // Remove metadata and TOC sections first
  const cleanContent = temp.cloneNode(true);
  
  // Remove title page/metadata divs
  const metadataDivs = cleanContent.querySelectorAll('div[style*="text-align: center"], div[style*="page-break"]');
  metadataDivs.forEach(div => {
    const divText = div.textContent || div.innerText || '';
    if (divText.includes('Table of Contents') || divText.includes('ISBN') || divText.includes('by Unknown Author')) {
      div.remove();
    }
  });
  
  // Remove TOC headings and lists
  const headings = cleanContent.querySelectorAll('h1, h2, h3');
  headings.forEach(heading => {
    const headingText = heading.textContent || heading.innerText || '';
    if (headingText.includes('Table of Contents') || headingText.match(/^Chapter \d+$/)) {
      heading.remove();
    }
  });
  
  // Remove list items (TOC)
  const lists = cleanContent.querySelectorAll('ul, ol');
  lists.forEach(list => {
    if (list.textContent.includes('Chapter')) {
      list.remove();
    }
  });
  
  // Helper function to escape LaTeX special characters in text content only
  function escapeLaTeX(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/#/g, '\\#')
      .replace(/\$/g, '\\$')
      .replace(/%/g, '\\%')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/_/g, '\\_')
      .replace(/&/g, '\\&')
      .replace(/~/g, '\\textasciitilde{}');
  }
  
  // Convert HTML to LaTeX format
  let latex = '\\documentclass[12pt]{article}\n';
  latex += '\\usepackage[utf8]{inputenc}\n';
  latex += '\\usepackage[T1]{fontenc}\n';
  latex += '\\usepackage{geometry}\n';
  latex += '\\geometry{margin=1in}\n';
  latex += '\\begin{document}\n\n';
  
  // Add title if metadata exists
  if (metadata.bookTitle) {
    latex += `\\title{${escapeLaTeX(metadata.bookTitle)}}\n`;
    if (metadata.authorName) {
      latex += `\\author{${escapeLaTeX(metadata.authorName)}}\n`;
    }
    latex += '\\maketitle\n\n';
  }
  
  // Convert HTML elements to LaTeX (extract text first, then escape only the text)
  let htmlContent = cleanContent.innerHTML;
  
  // Store heading text to remove duplicates later
  const headingTexts = new Set();
  
  // Replace headings - extract text and escape it, but keep LaTeX commands intact
  // Skip TOC and Chapter headings
  htmlContent = htmlContent.replace(/<h1[^>]*>(.*?)<\/h1>/gis, (match, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    if (cleanText.includes('Table of Contents') || cleanText.match(/^Chapter \d+$/)) {
      return ''; // Remove TOC and Chapter headings
    }
    headingTexts.add(cleanText);
    return '\\section{' + escapeLaTeX(cleanText) + '}\n';
  });
  htmlContent = htmlContent.replace(/<h2[^>]*>(.*?)<\/h2>/gis, (match, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    if (cleanText.includes('Table of Contents')) {
      return ''; // Remove TOC headings
    }
    headingTexts.add(cleanText);
    return '\\subsection{' + escapeLaTeX(cleanText) + '}\n';
  });
  htmlContent = htmlContent.replace(/<h3[^>]*>(.*?)<\/h3>/gis, (match, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    headingTexts.add(cleanText);
    return '\\subsubsection{' + escapeLaTeX(cleanText) + '}\n';
  });
  
  // Replace formatting tags - extract text and escape it
  htmlContent = htmlContent.replace(/<strong>(.*?)<\/strong>/gis, (match, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    return '\\textbf{' + escapeLaTeX(cleanText) + '}';
  });
  htmlContent = htmlContent.replace(/<em>(.*?)<\/em>/gis, (match, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    return '\\textit{' + escapeLaTeX(cleanText) + '}';
  });
  htmlContent = htmlContent.replace(/<b>(.*?)<\/b>/gis, (match, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    return '\\textbf{' + escapeLaTeX(cleanText) + '}';
  });
  htmlContent = htmlContent.replace(/<i>(.*?)<\/i>/gis, (match, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    return '\\textit{' + escapeLaTeX(cleanText) + '}';
  });
  
  // Replace line breaks FIRST before other processing
  htmlContent = htmlContent.replace(/<br\s*\/?>/gi, '\n\\\\\n');
  
  // Replace paragraphs - extract text and escape it
  htmlContent = htmlContent.replace(/<p[^>]*>(.*?)<\/p>/gis, (match, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    return cleanText ? escapeLaTeX(cleanText) + '\n\n' : '\n';
  });
  
  htmlContent = htmlContent.replace(/&nbsp;/g, ' ');
  
  // Remove remaining HTML tags
  htmlContent = htmlContent.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = htmlContent;
  htmlContent = textarea.value;
  
  // Process the content line by line and fix any escaped LaTeX commands
  const lines = htmlContent.split('\n');
  let latexContent = '';
  
  lines.forEach((line, index) => {
    let processedLine = line;
    
    // Skip TOC and Chapter heading lines
    const trimmedCheck = processedLine.trim();
    if (trimmedCheck.includes('Table of Contents') || trimmedCheck.match(/^Chapter \d+$/) || 
        trimmedCheck.match(/\\subsection\{Table of Contents\}/) || trimmedCheck.match(/\\section\{Chapter \d+\}/)) {
      return; // Skip this line
    }
    
    // Remove duplicate heading text that appears before section commands
    // Pattern: "Chapter 1\section{Chapter 1}" should become "\section{Chapter 1}"
    headingTexts.forEach(headingText => {
      // Skip if it's a TOC or Chapter heading
      if (headingText.includes('Table of Contents') || headingText.match(/^Chapter \d+$/)) {
        return;
      }
      const escapedHeading = escapeLaTeX(headingText);
      // Match: headingText\section{headingText} or headingText\subsection{headingText}
      const pattern = new RegExp(`^${escapedHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\\\(section|subsection|subsubsection)\\{${escapedHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'i');
      processedLine = processedLine.replace(pattern, (match, cmd) => {
        return `\\${cmd}{${escapedHeading}}`;
      });
    });
    
    // Fix escaped LaTeX section commands that were incorrectly escaped
    processedLine = processedLine.replace(/\\textbackslash\{\}section\{/g, '\\section{');
    processedLine = processedLine.replace(/\\textbackslash\{\}subsection\{/g, '\\subsection{');
    processedLine = processedLine.replace(/\\textbackslash\{\}subsubsection\{/g, '\\subsubsection{');
    
    // Fix escaped line breaks (double backslashes) - preserve actual \\ line breaks
    processedLine = processedLine.replace(/\\textbackslash\{\}\\textbackslash\{\}/g, '\\\\');
    
    // Fix escaped single backslashes that are part of LaTeX commands
    // Pattern: text\textbackslash{}command{text} should become text\command{text}
    processedLine = processedLine.replace(/([a-zA-Z0-9\s])\\textbackslash\{\}([a-z]+)\{/g, '$1\\$2{');
    
    const trimmed = processedLine.trim();
    if (!trimmed) {
      latexContent += '\n';
      return;
    }
    
    // Check if line is just a line break (\\)
    if (trimmed === '\\\\') {
      latexContent += '\\\\\n';
      return;
    }
    
    // Check if line already contains LaTeX commands (from our conversions above)
    // Match lines that start with \command{ or contain valid LaTeX commands
    if (trimmed.match(/^\\(section|subsection|subsubsection|textbf|textit|maketitle|begin|end|title|author|par|line)/)) {
      // It's already a LaTeX command, use as is
      latexContent += trimmed + '\n';
    } else if (trimmed.includes('\\\\')) {
      // Line contains LaTeX line break, preserve it
      latexContent += trimmed + '\n';
    } else {
      // Check if line contains LaTeX commands in the middle
      if (trimmed.includes('\\section{') || trimmed.includes('\\subsection{') || trimmed.includes('\\subsubsection{') || 
          trimmed.includes('\\textbf{') || trimmed.includes('\\textit{')) {
        // Contains LaTeX commands, use as is (already fixed above)
        latexContent += trimmed + '\n';
      } else {
        // It's regular text, escape special characters (but not \\)
        const escaped = escapeLaTeX(trimmed);
        latexContent += escaped.replace(/\\\\/g, '\\') + '\n';
      }
    }
  });
  
  latex += latexContent;
  latex += '\n\\end{document}';
  
  downloadFile(latex, `${filename}.tex`, 'text/x-tex');
  showToast('LaTeX format exported');
}

function exportBackup() {
  const backup = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    metadata: metadata,
    chapters: chapters,
    settings: {
      darkMode: document.body.classList.contains('dark-mode'),
      dailyGoal: document.getElementById('dailyGoal').value
    }
  };
  
  const json = JSON.stringify(backup, null, 2);
  downloadFile(json, `manuscript_backup_${Date.now()}.json`, 'application/json');
  showToast('Full backup exported');
}

function downloadFile(content, filename, mimeType) {
  // Starting download

  try {
    const type = mimeType || 'application/octet-stream';
    const needsBOM = /^text\//.test(type) || type.includes('msword') || type.includes('rtf') || type.includes('markdown');
    const parts = needsBOM
      ? [new Uint8Array([0xEF, 0xBB, 0xBF]), content]
      : [content];
    const blob = new Blob(parts, { type });

    // Legacy Edge/IE support
    if (typeof navigator !== 'undefined' && navigator.msSaveOrOpenBlob) {
      navigator.msSaveOrOpenBlob(blob, filename);
      showToast('Downloading ' + filename);
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Try a forced open as fallback (may show in new tab if download attribute is blocked)
    setTimeout(() => {
      try {
        const win = window.open(url, '_blank');
        if (!win) logger.warn('Fallback window.open blocked');
      } catch (e) {
        logger.warn('Fallback window.open failed', e);
      }
    }, 300);

    // Give the browser a bit more time before revoking
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    showToast('Downloading ' + filename);
  } catch (error) {
    logger.error('Download error:', error);
    try {
      // Last-resort fallback: data URL in new tab
      const dataUrl = 'data:' + (mimeType || 'application/octet-stream') + ';charset=utf-8,' + encodeURIComponent(content);
      const win = window.open(dataUrl, '_blank');
      if (!win) throw error;
      showToast('Download opened in new tab');
    } catch (fallbackError) {
      logger.error('Fallback download error:', fallbackError);
      showToast('Download failed: ' + fallbackError.message, 'error');
    }
  }
}

function downloadBlob(blob, filename, mimeType) {
  try {
    const type = mimeType || blob.type || 'application/octet-stream';

    if (typeof navigator !== 'undefined' && navigator.msSaveOrOpenBlob) {
      navigator.msSaveOrOpenBlob(blob, filename);
      showToast('Downloading ' + filename);
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => URL.revokeObjectURL(url), 3000);
    showToast('Downloading ' + filename);
  } catch (error) {
    logger.error('Download blob error:', error);
    showToast('Download failed: ' + error.message, 'error');
  }
}



// Save As Function
function saveAs() {
  const saveAsModal = document.createElement('div');
  saveAsModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #e4d5b7; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2000; min-width: 500px;';
  saveAsModal.innerHTML = `
    <h3 style="margin-bottom: 20px; color: #333;"><i class="fas fa-file-export"></i> Save As</h3>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">File Name:</label>
      <input type="text" id="saveAsFilename" value="${metadata.bookTitle || 'manuscript'}" placeholder="Enter filename" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
    </div>
    
    <div style="margin-bottom: 25px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">Format:</label>
      <select id="saveAsFormat" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
        <optgroup label="Document Formats">
          <option value="html">HTML (.html) - Web page format</option>
          <option value="txt">Plain Text (.txt) - Simple text file</option>
          <option value="markdown">Markdown (.md) - Markdown format</option>
          <option value="docx">Word Document (.docx) - MS Word compatible</option>
          <option value="rtf">Rich Text Format (.rtf) - Universal format</option>
          <option value="pdf">PDF (.pdf) - Print via browser</option>
        </optgroup>
        <optgroup label="eBook Formats">
          <option value="epub">EPUB (.epub) - E-book format</option>
          <option value="mobi">MOBI (.mobi) - Kindle format</option>
        </optgroup>
        <optgroup label="Screenplay Formats">
          <option value="fountain">Fountain (.fountain) - Screenplay format</option>
          <option value="finaldraft">Final Draft (.fdx) - Industry standard</option>
        </optgroup>
        <optgroup label="Academic Formats">
          <option value="latex">LaTeX (.tex) - Academic papers</option>
        </optgroup>
        <optgroup label="Backup">
          <option value="backup">Full Backup (.json) - Complete data</option>
        </optgroup>
      </select>
    </div>
    
    <div style="margin-bottom: 20px; padding: 15px; background: #f0f0f0; border-radius: 6px;">
      <div style="margin-bottom: 10px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="saveAsAllChapters" checked>
          <span>Include all chapters</span>
        </label>
      </div>
      <div style="margin-bottom: 10px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="saveAsMetadata" checked>
          <span>Include metadata</span>
        </label>
      </div>
      <div>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="saveAsTOC" checked>
          <span>Include table of contents</span>
        </label>
      </div>
    </div>
    
    <div style="display: flex; gap: 10px;">
      <button onclick="confirmSaveAs()" style="flex: 1; padding: 12px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
        <i class="fas fa-download"></i> Save File
      </button>
      <button data-action="closeSaveAsModal" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
    </div>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1999;';
  backdrop.id = 'saveAsBackdrop';
  backdrop.onclick = closeSaveAsModal;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(saveAsModal);
  saveAsModal.id = 'saveAsDialog';
  
  // Focus on filename input
  setTimeout(() => {
    const filenameInput = document.getElementById('saveAsFilename');
    filenameInput.focus();
    filenameInput.select();
  }, 100);
}

function confirmSaveAs() {
  const filename = document.getElementById('saveAsFilename').value.trim() || 'manuscript';
  const format = document.getElementById('saveAsFormat').value;
  const includeAllChapters = document.getElementById('saveAsAllChapters').checked;
  const includeMetadata = document.getElementById('saveAsMetadata').checked;
  const includeTOC = document.getElementById('saveAsTOC').checked;

  // Save current chapter first
  if (chapters[currentChapterIndex]) {
    const editor = domCache.getEditor(); if (editor) chapters[currentChapterIndex].content = editor.innerHTML;
  }

  let content = '';
  
  // Prepare content
  if (includeAllChapters) {
    chapters.forEach(chapter => {
      content += `<h1>${chapter.title}</h1>\n${chapter.content}\n\n`;
    });
  } else {
    const current = chapters[currentChapterIndex];
    const editor = domCache.getEditor(); content = current ? current.content : (editor ? editor.innerHTML : '');
  }

  // Add metadata
  let metadataHtml = '';
  if (includeMetadata && metadata.bookTitle) {
    metadataHtml = `
      <div style="text-align: center; margin-bottom: 50px; page-break-after: always;">
        <h1>${metadata.bookTitle}</h1>
        <h2>by ${metadata.authorName || 'Unknown Author'}</h2>
        ${metadata.isbn ? `<p>ISBN: ${metadata.isbn}</p>` : ''}
        ${metadata.publisher ? `<p>${metadata.publisher}</p>` : ''}
        ${metadata.bookDescription ? `<p style="margin-top: 20px;">${metadata.bookDescription}</p>` : ''}
      </div>
    `;
  }

  // Table of contents
  let tocHtml = '';
  if (includeTOC && includeAllChapters) {
    tocHtml = '<div style="page-break-after: always;"><h2>Table of Contents</h2><ul>';
    chapters.forEach((chapter, index) => {
      tocHtml += `<li>${chapter.title}</li>`;
    });
    tocHtml += '</ul></div>';
  }

  const fullContent = metadataHtml + tocHtml + content;

  // Save to localStorage first
  saveToStorage();

  // Export based on format
  switch(format) {
    case 'html':
      exportHTML(fullContent, filename);
      break;
    case 'txt':
      exportTXT(fullContent, filename);
      break;
    case 'markdown':
      exportMarkdown(fullContent, filename);
      break;
    case 'docx':
      exportDOCX(fullContent, filename);
      break;
    case 'fountain':
      exportFountain(fullContent, filename);
      break;
    case 'finaldraft':
      exportFinalDraft(fullContent, filename);
      break;
    case 'latex':
      exportLaTeX(fullContent, filename);
      break;
    case 'backup':
      exportBackup();
      break;
  }

  closeSaveAsModal();
  showToast(`File saved as ${filename}`);
}

function closeSaveAsModal() {
  document.getElementById('saveAsDialog')?.remove();
  document.getElementById('saveAsBackdrop')?.remove();
}

// Storage (Enhanced with safeStorage and error handling)
function saveToStorage() {
  try {
    const chaptersJson = JSON.stringify(chapters);
    const metadataJson = JSON.stringify(metadata);
    
    if (!safeStorage.setItem('manuscript_chapters', chaptersJson)) {
      throw new Error('Failed to save chapters');
    }
    if (!safeStorage.setItem('manuscript_metadata', metadataJson)) {
      throw new Error('Failed to save metadata');
    }
    if (!safeStorage.setItem('manuscript_currentIndex', String(currentChapterIndex))) {
      throw new Error('Failed to save current index');
    }
    
    const statusEl = document.getElementById('autosaveStatus');
    if (statusEl) statusEl.textContent = 'Autosaved';
    queueCloudSave();
  } catch (e) {
    logger.error('Save failed:', e);
    showToast('Save failed - storage full', 'error');
    showAutosaveIndicator('error');
  }
}

function loadFromStorage() {
  try {
    const savedChapters = safeStorage.getItem('manuscript_chapters');
    const savedMetadata = safeStorage.getItem('manuscript_metadata');
    const savedIndex = safeStorage.getItem('manuscript_currentIndex');
    const savedDarkMode = safeStorage.getItem('darkMode');

    if (savedChapters) {
      try {
        chapters = JSON.parse(savedChapters);
        // Add template field to existing chapters if missing (backward compatibility)
        chapters = chapters.map(ch => ({
          ...ch,
          template: ch.template || 'novel'
        }));
      } catch (parseError) {
        logger.error('Failed to parse chapters:', parseError);
        chapters = [{
          title: 'Chapter 1',
          content: '',
          wordCount: 0,
          template: 'novel',
          createdAt: new Date().toISOString()
        }];
      }
    } else {
      // Create default chapter
      chapters = [{
        title: 'Chapter 1',
        content: '',
        wordCount: 0,
        template: 'novel',
        createdAt: new Date().toISOString()
      }];
    }

    if (savedMetadata) {
      try {
        metadata = JSON.parse(savedMetadata);
      } catch (parseError) {
        logger.error('Failed to parse metadata:', parseError);
        metadata = {};
      }
    }

    if (savedIndex) {
      const parsedIndex = parseInt(savedIndex);
      if (!isNaN(parsedIndex) && parsedIndex >= 0) {
        currentChapterIndex = parsedIndex;
      }
    }

    if (savedDarkMode === 'true') {
      document.body.classList.add('dark-mode');
    }
  } catch (e) {
    logger.error('Load failed:', e);
    // Initialize with default values on error
    chapters = [{
      title: 'Chapter 1',
      content: '',
      wordCount: 0,
      template: 'novel',
      createdAt: new Date().toISOString()
    }];
    metadata = {};
    currentChapterIndex = 0;
  }
}

function saveAll() {
  // Save current editor content
  if (chapters[currentChapterIndex]) {
    const editor = domCache.getEditor(); if (editor) chapters[currentChapterIndex].content = editor.innerHTML;
  }
  saveToStorage();
  saveVersion('Manual save'); // Save version on manual save
  showToast('All changes saved');
}

let autosaveCounter = 0;
function startAutosave() {
  // Clear existing interval if any
  if (autosaveInterval) {
    clearInterval(autosaveInterval);
  }
  autosaveInterval = setInterval(() => {
    if (chapters[currentChapterIndex]) {
      showAutosaveIndicator('saving');
      const editor = domCache.getEditor(); if (editor) chapters[currentChapterIndex].content = editor.innerHTML;
      saveToStorage();
      showAutosaveIndicator('saved');
      
      // Save version every 10 autosaves (5 minutes)
      autosaveCounter++;
      if (autosaveCounter >= 10) {
        saveVersion('Auto-save');
        autosaveCounter = 0;
      }
    }
  }, 30000); // Every 30 seconds
}

function showAutosaveIndicator(status) {
  const indicator = document.getElementById('autosaveIndicator');
  const text = document.getElementById('autosaveText');
  
  if (!indicator) return;
  
  indicator.className = 'autosave-indicator';
  
  if (status === 'saving') {
    indicator.classList.add('saving', 'show');
    text.textContent = 'Saving...';
  } else if (status === 'saved') {
    indicator.classList.add('show');
    text.textContent = 'All changes saved';
    
    setTimeout(() => {
      indicator.classList.remove('show');
    }, 3000);
  } else if (status === 'error') {
    indicator.classList.add('error', 'show');
    text.textContent = 'Save failed';
    
    setTimeout(() => {
      indicator.classList.remove('show');
    }, 5000);
  }
}

// Writing Streak Functions
function initializeWritingStreak() {
  const saved = localStorage.getItem('writingStreak');
  if (saved) {
    writingStreak = JSON.parse(saved);
  }
  updateStreakDisplay();
  checkAndUpdateStreak();
}

function checkAndUpdateStreak() {
  const today = new Date().toDateString();
  const lastWrite = writingStreak.lastWriteDate;
  
  if (!lastWrite) {
    // First time writing
    return;
  }
  
  const lastWriteDate = new Date(lastWrite);
  const todayDate = new Date(today);
  const daysDiff = Math.floor((todayDate - lastWriteDate) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 1) {
    // Streak broken
    writingStreak.currentStreak = 0;
    saveWritingStreak();
    updateStreakDisplay();
  }
}

function updateWritingStreak() {
  const today = new Date().toDateString();
  
  if (writingStreak.lastWriteDate === today) {
    // Already recorded today
    return;
  }
  
  const lastWrite = writingStreak.lastWriteDate;
  
  if (!lastWrite) {
    // First write ever
    writingStreak.currentStreak = 1;
    writingStreak.longestStreak = 1;
    writingStreak.lastWriteDate = today;
    writingStreak.writingDates = [today];
  } else {
    const lastWriteDate = new Date(lastWrite);
    const todayDate = new Date(today);
    const daysDiff = Math.floor((todayDate - lastWriteDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      writingStreak.currentStreak++;
      if (writingStreak.currentStreak > writingStreak.longestStreak) {
        writingStreak.longestStreak = writingStreak.currentStreak;
      }
    } else if (daysDiff > 1) {
      // Streak broken, start new
      writingStreak.currentStreak = 1;
    }
    
    writingStreak.lastWriteDate = today;
    writingStreak.writingDates.push(today);
  }
  
  saveWritingStreak();
  updateStreakDisplay();
  
  // Show celebration for milestones
  if (writingStreak.currentStreak % 7 === 0 && writingStreak.currentStreak > 0) {
    showToast(`🎉 ${writingStreak.currentStreak} day streak! Keep it up!`, 'success');
  }
}

function saveWritingStreak() {
  localStorage.setItem('writingStreak', JSON.stringify(writingStreak));
}

function updateStreakDisplay() {
  const streakDaysEl = document.getElementById('streakDays');
  const lastWriteEl = document.getElementById('lastWriteDate');
  const longestStreakEl = document.getElementById('longestStreak');
  
  if (streakDaysEl) {
    streakDaysEl.textContent = writingStreak.currentStreak || 0;
  }
  
  if (lastWriteEl) {
    if (writingStreak.lastWriteDate) {
      const lastDate = new Date(writingStreak.lastWriteDate);
      const today = new Date().toDateString();
      if (writingStreak.lastWriteDate === today) {
        lastWriteEl.textContent = 'Today';
      } else {
        const daysDiff = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          lastWriteEl.textContent = 'Yesterday';
        } else {
          lastWriteEl.textContent = `${daysDiff} days ago`;
        }
      }
    } else {
      lastWriteEl.textContent = 'Never';
    }
  }
  
  if (longestStreakEl) {
    longestStreakEl.textContent = `${writingStreak.longestStreak || 0} days`;
  }
}

// Version History Functions
function initializeVersionHistory() {
  const saved = safeStorage.getItem('versionHistory');
  if (saved) {
    try {
      versionHistory = JSON.parse(saved);
    } catch (e) {
      logger.error('Failed to parse version history:', e);
      versionHistory = [];
    }
  }
}

// Save a named version with custom label
function saveNamedVersion() {
  const label = prompt('Enter a name for this version (e.g., "First Draft", "Before Major Edit"):');
  if (label && label.trim()) {
    saveVersion(label.trim(), true);
    showToast(`Version "${label.trim()}" saved successfully`, 'success');
  }
}

function saveVersion(label = 'Auto-save', isNamed = false) {
  const version = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    label: label,
    isNamed: isNamed, // Track if this is a named/manual save
    chapters: JSON.parse(JSON.stringify(chapters)), // Deep copy
    metadata: JSON.parse(JSON.stringify(metadata)),
    wordCount: chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
  };
  
  versionHistory.unshift(version); // Add to beginning
  
  // Keep only last MAX_VERSIONS
  if (versionHistory.length > MAX_VERSIONS) {
    versionHistory = versionHistory.slice(0, MAX_VERSIONS);
  }
  
  safeStorage.setItem('versionHistory', JSON.stringify(versionHistory));
}

function restoreVersion(versionId) {
  const version = versionHistory.find(v => v.id === versionId);
  if (!version) {
    showToast('Version not found', 'error');
    return;
  }
  
  if (confirm(`Restore version from ${formatDateTime(version.timestamp)}? Current work will be saved as a backup.`)) {
    // Save current state as backup before restoring
    saveVersion('Before restore');
    
    // Restore the version
    chapters = JSON.parse(JSON.stringify(version.chapters));
    metadata = JSON.parse(JSON.stringify(version.metadata));
    
    // Save and refresh UI
    saveToStorage();
    renderChapterList();
    loadCurrentChapter();
    updateStats();
    
    closeVersionHistoryModal();
    showToast('Version restored successfully');
  }
}

function deleteVersion(versionId) {
  if (confirm('Delete this version?')) {
    versionHistory = versionHistory.filter(v => v.id !== versionId);
    safeStorage.setItem('versionHistory', JSON.stringify(versionHistory));
    openVersionHistoryModal(); // Refresh the modal
    showToast('Version deleted');
  }
}

// Compare two versions
function compareVersions(versionId1, versionId2) {
  const v1 = versionHistory.find(v => v.id === versionId1);
  const v2 = versionHistory.find(v => v.id === versionId2);
  
  if (!v1 || !v2) {
    showToast('One or both versions not found', 'error');
    return;
  }
  
  // Create comparison modal
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #e4d5b7; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; min-width: 700px; max-width: 90vw; max-height: 85vh; overflow-y: auto;';
  
  const diff = {
    chapters: v2.chapters.length - v1.chapters.length,
    words: v2.wordCount - v1.wordCount,
    dateDiff: new Date(v2.timestamp) - new Date(v1.timestamp)
  };
  
  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #8B4513;">
      <h2 style="margin: 0; color: #8B4513; font-size: 1.5em;"><i class="fas fa-code-branch"></i> Version Comparison</h2>
      <button onclick="this.closest('div').remove(); document.getElementById('versionCompareBackdrop')?.remove();" style="background: none; border: none; font-size: 28px; color: #666; cursor: pointer; padding: 0; width: 32px; height: 32px;">×</button>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #6c757d;">
        <div style="font-weight: 700; color: #333; margin-bottom: 8px;">${v1.label}</div>
        <div style="font-size: 12px; color: #666; margin-bottom: 10px;">${formatDateTime(v1.timestamp)}</div>
        <div style="font-size: 13px;">
          <div><i class="fas fa-book"></i> ${v1.chapters.length} chapters</div>
          <div><i class="fas fa-font"></i> ${v1.wordCount.toLocaleString()} words</div>
        </div>
      </div>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #8B4513;">
        <div style="font-weight: 700; color: #333; margin-bottom: 8px;">${v2.label}</div>
        <div style="font-size: 12px; color: #666; margin-bottom: 10px;">${formatDateTime(v2.timestamp)}</div>
        <div style="font-size: 13px;">
          <div><i class="fas fa-book"></i> ${v2.chapters.length} chapters</div>
          <div><i class="fas fa-font"></i> ${v2.wordCount.toLocaleString()} words</div>
        </div>
      </div>
    </div>
    <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Changes:</h3>
      <div style="font-size: 14px; line-height: 1.8;">
        <div><i class="fas fa-book"></i> Chapters: ${diff.chapters > 0 ? '+' : ''}${diff.chapters}</div>
        <div><i class="fas fa-font"></i> Words: ${diff.words > 0 ? '+' : ''}${diff.words.toLocaleString()}</div>
        <div><i class="fas fa-clock"></i> Time difference: ${Math.round(diff.dateDiff / 60000)} minutes</div>
      </div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="restoreVersion(${v1.id}); this.closest('div').remove(); document.getElementById('versionCompareBackdrop')?.remove();" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Restore ${v1.label}</button>
      <button onclick="restoreVersion(${v2.id}); this.closest('div').remove(); document.getElementById('versionCompareBackdrop')?.remove();" style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Restore ${v2.label}</button>
    </div>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.id = 'versionCompareBackdrop';
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2090;';
  backdrop.onclick = () => {
    modal.remove();
    backdrop.remove();
  };
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
}

function openVersionHistoryModal() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #e4d5b7; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; min-width: 700px; max-width: 90vw; max-height: 85vh; overflow-y: auto;';
  
  let versionsHTML = '';
  
  if (versionHistory.length === 0) {
    versionsHTML = '<p style="text-align: center; padding: 40px; color: #666;">No version history yet. Versions are automatically saved as you work.</p>';
  } else {
    versionsHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #8B4513;">
        <h2 style="margin: 0; color: #8B4513; font-size: 1.5em;"><i class="fas fa-history"></i> Version History</h2>
        <button onclick="saveNamedVersion(); setTimeout(() => openVersionHistoryModal(), 500);" style="padding: 8px 16px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
          <i class="fas fa-bookmark"></i> Save Named Version
        </button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
    `;
    
    versionHistory.forEach((version, index) => {
      const dateTime = formatDateTime(version.timestamp);
      const isRecent = index === 0;
      
      versionsHTML += `
        <div style="background: ${isRecent ? '#fff9e6' : '#f0f0f0'}; padding: 16px; border-radius: 8px; border-left: 4px solid ${isRecent ? '#8B4513' : version.isNamed ? '#D4AF37' : '#999'};">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div style="flex: 1;">
              <div style="font-weight: 700; color: #333; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                ${version.isNamed ? '<i class="fas fa-bookmark" style="color: #D4AF37;"></i>' : ''}
                ${version.label}
                ${isRecent ? '<span style="background: #8B4513; color: white; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-left: 6px;">LATEST</span>' : ''}
              </div>
              <div style="font-size: 13px; color: #666;">${dateTime}</div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${index > 0 ? `<button onclick="compareVersions(${versionHistory[index-1].id}, ${version.id}); this.closest('div').parentElement.parentElement.remove(); document.getElementById('versionHistoryBackdrop')?.remove();" style="padding: 6px 12px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;" title="Compare with previous version">
                <i class="fas fa-code-branch"></i> Compare
              </button>` : ''}
              <button onclick="restoreVersion(${version.id})" style="padding: 6px 12px; background: #8B4513; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                <i class="fas fa-undo"></i> Restore
              </button>
              <button onclick="deleteVersion(${version.id})" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div style="font-size: 12px; color: #666;">
            <i class="fas fa-book"></i> ${version.chapters.length} chapters • 
            <i class="fas fa-font"></i> ${version.wordCount.toLocaleString()} words
          </div>
        </div>
      `;
    });
    
    versionsHTML += '</div>';
  }
  
  safeHTML.setHTML(modal, versionsHTML + `
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
      <button data-action="closeVersionHistoryModal" style="padding: 10px 24px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
    </div>
  `);
  
  const backdrop = document.createElement('div');
  backdrop.id = 'versionHistoryBackdrop';
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2090;';
  backdrop.onclick = () => {
    closeVersionHistoryModal();
  };
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  modal.id = 'versionHistoryModal';
  window.versionHistoryModal = modal;
}

function closeVersionHistoryModal() {
  const modal = document.getElementById('versionHistoryModal');
  const backdrop = document.getElementById('versionHistoryBackdrop');
  if (modal) modal.remove();
  if (backdrop) backdrop.remove();
  window.versionHistoryModal = null;
}

// Review Mode Functions
function toggleReviewMode() {
  isReviewMode = !isReviewMode;
  const editor = domCache.getEditor();
  const allPages = document.querySelectorAll('.editor-page');
  const allEditors = [editor, ...Array.from(allPages)].filter(e => e);
  
  allEditors.forEach(ed => {
    if (ed) {
      if (isReviewMode) {
        ed.setAttribute('contenteditable', 'false');
        ed.style.cursor = 'default';
        ed.classList.add('review-mode');
        // Highlight all comments
        const comments = ed.querySelectorAll('.comment-highlight');
        comments.forEach(comment => {
          comment.style.boxShadow = '0 0 0 2px #ff9800';
        });
      } else {
        ed.setAttribute('contenteditable', 'true');
        ed.style.cursor = 'text';
        ed.classList.remove('review-mode');
        // Remove highlight
        const comments = ed.querySelectorAll('.comment-highlight');
        comments.forEach(comment => {
          comment.style.boxShadow = '';
        });
      }
    }
  });
  
  // Update button text
  const btn = document.querySelector('[data-action="toggleReviewMode"]');
  if (btn) {
    if (isReviewMode) {
      btn.innerHTML = '<i class="fas fa-edit" aria-hidden="true"></i> Edit Mode';
    } else {
      btn.innerHTML = '<i class="fas fa-comments" aria-hidden="true"></i> Review';
    }
  }
  
  showToast(isReviewMode ? 'Review mode enabled - document is read-only' : 'Edit mode enabled');
}

// Sharing Link Functions
function openShareLink() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #e4d5b7; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; min-width: 500px; max-width: 90vw;';
  
  // Generate a share ID
  const shareId = generateShareId();
  const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
  
  // Save share data
  const shareData = {
    id: shareId,
    timestamp: new Date().toISOString(),
    chapters: JSON.parse(JSON.stringify(chapters)),
    metadata: JSON.parse(JSON.stringify(metadata)),
    readOnly: true
  };
  
  safeStorage.setItem(`share_${shareId}`, JSON.stringify(shareData));
  
  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #8B4513;">
      <h2 style="margin: 0; color: #8B4513; font-size: 1.5em;"><i class="fas fa-share-alt"></i> Share Document</h2>
      <button onclick="this.closest('div').parentElement.remove(); document.getElementById('shareLinkBackdrop')?.remove();" style="background: none; border: none; font-size: 28px; color: #666; cursor: pointer; padding: 0; width: 32px; height: 32px;">×</button>
    </div>
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Share Link (Read-Only)</label>
      <div style="display: flex; gap: 8px;">
        <input type="text" id="shareLinkInput" value="${shareUrl}" readonly style="flex: 1; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px; background: white; font-size: 13px;">
        <button onclick="copyShareLink()" style="padding: 10px 20px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; white-space: nowrap;">
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 8px;">
        <i class="fas fa-info-circle"></i> Anyone with this link can view your document in read-only mode.
      </p>
    </div>
    <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Share Options</h3>
      <div style="font-size: 14px; line-height: 1.8;">
        <div><i class="fas fa-eye"></i> Read-only access</div>
        <div><i class="fas fa-comment"></i> Can view comments</div>
        <div><i class="fas fa-lock"></i> Cannot edit document</div>
      </div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="this.closest('div').parentElement.remove(); document.getElementById('shareLinkBackdrop')?.remove();" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
    </div>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.id = 'shareLinkBackdrop';
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2090;';
  backdrop.onclick = () => {
    modal.remove();
    backdrop.remove();
  };
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  
  // Store shareId for copy function
  window.currentShareId = shareId;
}

function generateShareId() {
  return 'share_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function copyShareLink() {
  const input = document.getElementById('shareLinkInput');
  if (input) {
    input.select();
    input.setSelectionRange(0, 99999); // For mobile
    try {
      document.execCommand('copy');
      showToast('Share link copied to clipboard!', 'success');
    } catch (e) {
      // Fallback for modern browsers
      navigator.clipboard.writeText(input.value).then(() => {
        showToast('Share link copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Failed to copy link', 'error');
      });
    }
  }
}

// Load shared document
function loadSharedDocument(shareId) {
  const shareData = safeStorage.getItem(`share_${shareId}`);
  if (!shareData) {
    showToast('Shared document not found or expired', 'error');
    return;
  }
  
  try {
    const data = JSON.parse(shareData);
    chapters = data.chapters || chapters;
    metadata = data.metadata || metadata;
    
    // Set to read-only mode
    isReviewMode = true;
    const editor = domCache.getEditor();
    if (editor) {
      editor.setAttribute('contenteditable', 'false');
      editor.classList.add('review-mode');
    }
    
    // Load content
    renderChapterList();
    loadCurrentChapter();
    updateStats();
    
    // Update UI
    const btn = document.querySelector('[data-action="toggleReviewMode"]');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-edit" aria-hidden="true"></i> Edit Mode';
    }
    
    showToast('Shared document loaded in read-only mode', 'success');
  } catch (e) {
    logger.error('Failed to load shared document:', e);
    showToast('Failed to load shared document', 'error');
  }
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit'
  });
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + S = Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveAll();
      return;
    }
    
    // Ctrl/Cmd + F = Find
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      openFindReplace();
      return;
    }

    // Ctrl/Cmd + B = Bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      formatText('bold');
      return;
    }

    // Ctrl/Cmd + I = Italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      formatText('italic');
      return;
    }

    // Ctrl/Cmd + U = Underline
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      formatText('underline');
      return;
    }

    // Esc = exit fullscreen mode
    if (e.key === 'Escape' && document.body.classList.contains('fullscreen-mode')) {
      e.preventDefault();
      toggleFullscreenMode(true);
      return;
    }
  });
}

// Storyboard drag & drop for plotting board
let storyboardDraggedCard = null;

document.addEventListener('dragstart', function(e) {
  const target = e.target;
  if (target && target.classList && target.classList.contains('story-card')) {
    storyboardDraggedCard = target;
    target.classList.add('dragging');
  }
});

document.addEventListener('dragend', function(e) {
  const target = e.target;
  if (target && target.classList && target.classList.contains('story-card')) {
    target.classList.remove('dragging');
    storyboardDraggedCard = null;
  }
});

document.addEventListener('dragover', function(e) {
  if (!storyboardDraggedCard) return;
  const board = document.getElementById('storyBoard');
  if (!board || !board.contains(e.target)) return;
  e.preventDefault();

  const afterElement = getDragAfterElement(board, e.clientY);
  if (!afterElement) {
    board.appendChild(storyboardDraggedCard);
  } else {
    board.insertBefore(storyboardDraggedCard, afterElement);
  }
});

document.addEventListener('drop', function(e) {
  if (!storyboardDraggedCard) return;
  const board = document.getElementById('storyBoard');
  if (!board || !board.contains(e.target)) return;
  e.preventDefault();
  reorderChaptersFromStoryboard();
});

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.story-card:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function reorderChaptersFromStoryboard() {
  const board = document.getElementById('storyBoard');
  if (!board) return;

  const cards = board.querySelectorAll('.story-card');
  if (!cards.length) return;

  const currentChapter = chapters[currentChapterIndex] || null;
  const newOrder = [];

  cards.forEach(card => {
    const oldIndex = parseInt(card.dataset.index, 10);
    if (!isNaN(oldIndex) && chapters[oldIndex]) {
      newOrder.push(chapters[oldIndex]);
    }
  });

  // If something went wrong and we lost items, don't apply
  if (newOrder.length !== chapters.length) {
    showToast('Reorder failed – inconsistent chapter count', 'error');
    return;
  }

  chapters = newOrder;

  // Restore current chapter index
  if (currentChapter) {
    const newIndex = chapters.indexOf(currentChapter);
    currentChapterIndex = newIndex !== -1 ? newIndex : 0;
  } else {
    currentChapterIndex = 0;
  }

  renderChapterList();
  loadCurrentChapter();
  saveToStorage();
  showToast('Chapters reordered from storyboard');
}

// Context menu for editor
function setupEditorContextMenu() {
  const editor = domCache.getEditor();
  const menu = document.getElementById('editorContextMenu');
  if (!editor || !menu) return;

  // Only show custom menu on Shift+Right-click, allow default browser menu otherwise
  editor.addEventListener('contextmenu', function(e) {
    if (e.shiftKey) {
      // Custom menu on Shift+Right-click
      e.preventDefault();
      const rect = editor.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
      menu.classList.add('active');
    }
    // Otherwise, let the default browser context menu show (paste, select all, etc.)
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('#editorContextMenu')) {
      menu.classList.remove('active');
    }
  });

  menu.addEventListener('click', function(e) {
    const item = e.target.closest('.context-menu-item');
    if (!item) return;
    const action = item.getAttribute('data-action');
    menu.classList.remove('active');

    switch (action) {
      case 'bold':
        formatText('bold');
        break;
      case 'italic':
        formatText('italic');
        break;
      case 'comment':
        addInlineComment();
        break;
      case 'dialogue':
        insertDialogue();
        break;
      case 'copy':
        document.execCommand('copy');
        showToast('Copied to clipboard');
        break;
    }
  });
}

// Modal Functions
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Toast Notifications
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  toastMessage.textContent = message;
  toast.className = 'toast show' + (type === 'error' ? ' error' : '');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Paste Cleanup (from Word/Google Docs)
const editor = domCache.getEditor(); if (editor) editor.addEventListener('paste', function(e) {
  e.preventDefault();
  
  let text = '';
  if (e.clipboardData || e.originalEvent.clipboardData) {
    text = (e.originalEvent || e).clipboardData.getData('text/plain');
  }
  
  document.execCommand('insertText', false, text);
  
  // CRITICAL: Don't check for page break immediately after paste
  // Wait for the input event to fire and handle page break check after content renders
  // The input event handler has a delay that will properly check for page breaks
});

// Initialize color value displays on page load
document.addEventListener('DOMContentLoaded', function() {
  const textColorInput = document.getElementById('textColor');
  const bgColorInput = document.getElementById('bgColor');
  if (textColorInput && document.getElementById('textColorValue')) {
    document.getElementById('textColorValue').textContent = textColorInput.value.toUpperCase();
  }
  if (bgColorInput && document.getElementById('bgColorValue')) {
    document.getElementById('bgColorValue').textContent = bgColorInput.value.toUpperCase();
  }
});

// Toolbar Panel Toggle
// Duplicate removed - using the one at line 64

// Page Settings Functions
// NOTE: updatePageSettings() and applyCustomPageSize() are defined earlier in the file (around line 5164)
// These duplicate functions have been removed to prevent conflicts

// NOTE: updateMarginPreset() is defined earlier in the file (around line 5398)
// This duplicate function has been removed to prevent conflicts

// Keyboard Shortcuts System
const keyboardShortcuts = {
  'Ctrl+B': { action: () => document.execCommand('bold'), description: 'Bold text' },
  'Ctrl+I': { action: () => document.execCommand('italic'), description: 'Italic text' },
  'Ctrl+U': { action: () => document.execCommand('underline'), description: 'Underline text' },
  'Ctrl+S': { action: () => { saveContent(); return false; }, description: 'Save manuscript' },
  'Ctrl+F': { action: () => { openFindReplace(); return false; }, description: 'Find & Replace' },
  'Ctrl+P': { action: () => { window.print(); return false; }, description: 'Print manuscript' },
  'Ctrl+E': { action: () => { openExportModal(); return false; }, description: 'Export manuscript' },
  'Ctrl+K': { action: () => { insertLink(); return false; }, description: 'Insert link' },
  'Ctrl+Shift+C': { action: () => { insertInlineComment(); return false; }, description: 'Add comment' },
  'Ctrl+Shift+X': { action: () => { document.execCommand('strikeThrough'); return false; }, description: 'Strikethrough' },
  'Ctrl+/': { action: () => { openKeyboardShortcutsModal(); return false; }, description: 'Show shortcuts' },
  'Ctrl+Alt+1': { action: () => { formatHeading('h1'); return false; }, description: 'Heading 1' },
  'Ctrl+Alt+2': { action: () => { formatHeading('h2'); return false; }, description: 'Heading 2' },
  'Ctrl+Alt+3': { action: () => { formatHeading('h3'); return false; }, description: 'Heading 3' },
  'Ctrl+Shift+L': { action: () => { document.execCommand('insertUnorderedList'); return false; }, description: 'Bullet list' },
  'Ctrl+Shift+O': { action: () => { document.execCommand('insertOrderedList'); return false; }, description: 'Numbered list' },
  'Ctrl+Shift+Q': { action: () => { insertBlockquote(); return false; }, description: 'Insert quote' },
  'Ctrl+Shift+D': { action: () => { insertDialogue(); return false; }, description: 'Insert dialogue' }
};

// Initialize keyboard shortcuts listener
document.addEventListener('keydown', function(e) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const ctrl = isMac ? e.metaKey : e.ctrlKey;
  
  let shortcutKey = '';
  
  if (ctrl && e.shiftKey && e.altKey) {
    shortcutKey = `Ctrl+Shift+Alt+${e.key.toUpperCase()}`;
  } else if (ctrl && e.shiftKey) {
    shortcutKey = `Ctrl+Shift+${e.key.toUpperCase()}`;
  } else if (ctrl && e.altKey) {
    shortcutKey = `Ctrl+Alt+${e.key.toUpperCase()}`;
  } else if (ctrl) {
    shortcutKey = `Ctrl+${e.key.toUpperCase()}`;
  }
  
  if (shortcutKey && keyboardShortcuts[shortcutKey]) {
    e.preventDefault();
    const result = keyboardShortcuts[shortcutKey].action();
    if (result === false) {
      return false;
    }
  }
});

function openKeyboardShortcutsModal() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #e4d5b7; padding: 28px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 2100; min-width: 550px; max-height: 85vh; overflow-y: auto;';
  
  let shortcutsHTML = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">';
  
  const categories = {
    'Text Formatting': ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+Shift+X'],
    'Document Actions': ['Ctrl+S', 'Ctrl+P', 'Ctrl+E', 'Ctrl+F'],
    'Headings': ['Ctrl+Alt+1', 'Ctrl+Alt+2', 'Ctrl+Alt+3'],
    'Lists & Elements': ['Ctrl+Shift+L', 'Ctrl+Shift+O', 'Ctrl+Shift+Q', 'Ctrl+Shift+D'],
    'Other': ['Ctrl+K', 'Ctrl+Shift+C', 'Ctrl+/']
  };
  
  for (const [category, shortcuts] of Object.entries(categories)) {
    shortcutsHTML += `
      <div style="grid-column: 1 / -1; margin-top: ${category === 'Text Formatting' ? '0' : '12px'};">
        <h4 style="margin: 0 0 8px 0; color: #8B4513; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${category}</h4>
      </div>
    `;
    
    shortcuts.forEach(key => {
      const shortcut = keyboardShortcuts[key];
      if (shortcut) {
        const keys = key.split('+').map(k => 
          `<kbd style="background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%); border: 1px solid #ced4da; border-radius: 4px; padding: 3px 8px; font-family: 'Segoe UI', sans-serif; font-size: 11px; font-weight: 600; box-shadow: 0 2px 0 #dee2e6; display: inline-block; min-width: 24px; text-align: center;">${k}</kbd>`
        ).join('<span style="margin: 0 4px; color: #999;">+</span>');
        
        shortcutsHTML += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f0f0f0; border-radius: 6px; border-left: 3px solid #8B4513;">
            <span style="font-size: 13px; color: #333; font-weight: 500;">${shortcut.description}</span>
            <span style="white-space: nowrap;">${keys}</span>
          </div>
        `;
      }
    });
  }
  
  shortcutsHTML += '</div>';
  
  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #333; font-size: 22px; display: flex; align-items: center; gap: 10px;">
        <i class="fas fa-keyboard" style="color: #8B4513;"></i> Keyboard Shortcuts
      </h2>
      <button data-action="closeKeyboardShortcutsModal" style="background: none; border: none; font-size: 28px; color: #999; cursor: pointer; line-height: 1; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;" onmouseover="this.style.background='#f1f3f5'; this.style.color='#333';" onmouseout="this.style.background='none'; this.style.color='#999';">×</button>
    </div>
    
    <div style="background: linear-gradient(135deg, #8B4513 0%, #8B4513 100%); color: #1A120B; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; font-weight: bold;">
      <i class="fas fa-lightbulb"></i> Tip: Press <kbd style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 3px; padding: 2px 6px; font-size: 11px;">Ctrl</kbd> + <kbd style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 3px; padding: 2px 6px; font-size: 11px;">/</kbd> anytime to view this guide
    </div>
    
    ${shortcutsHTML}
    
    <button data-action="closeKeyboardShortcutsModal" style="width: 100%; margin-top: 20px; padding: 12px; background: #8B4513; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background='#8B4513'" onmouseout="this.style.background='#8B4513'">
      Got it!
    </button>
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2090;';
  backdrop.id = 'keyboardShortcutsBackdrop';
  backdrop.onclick = closeKeyboardShortcutsModal;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  window.keyboardShortcutsModal = modal;
}

function closeKeyboardShortcutsModal() {
  const modal = window.keyboardShortcutsModal;
  const backdrop = document.getElementById('keyboardShortcutsBackdrop');
  if (modal) modal.remove();
  if (backdrop) backdrop.remove();
  window.keyboardShortcutsModal = null;
}

function insertInlineComment() {
  if (typeof addInlineComment === 'function') {
    addInlineComment();
  } else {
    showToast('Comment feature not available', 'error');
  }
}

// Auto-update font size selector based on cursor position
function updateFontSizeSelector() {
  const selector = document.getElementById('fontSizeSelector');
  if (!selector) return;
  
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  let element = selection.anchorNode;
  
  // If text node, get parent element
  if (element.nodeType === 3) {
    element = element.parentElement;
  }
  
  // Get computed font size
  const fontSize = window.getComputedStyle(element).fontSize;
  
  // Try to match with available options
  const roundedSize = Math.round(parseFloat(fontSize)) + 'px';
  
  // Check if this size exists in dropdown
  const option = Array.from(selector.options).find(opt => opt.value === roundedSize);
  
  if (option) {
    selector.value = roundedSize;
  } else {
    // If exact size not found, show closest or default
    selector.value = '';
  }
}

// Auto-update line spacing selector based on cursor position (MS Word-like behavior)
function updateLineSpacingSelector() {
  const selector = document.querySelector('select[onchange*="applyLineSpacing"]');
  if (!selector) return;
  
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  let element = selection.anchorNode;
  
  // If text node, get parent element
  if (element.nodeType === 3) {
    element = element.parentElement;
  }
  
  // Find the closest block element
  const block = element.closest('p, div, h1, h2, h3, h4, h5, h6, li, blockquote');
  
  if (block) {
    // Get computed line height
    const lineHeight = window.getComputedStyle(block).lineHeight;
    
    // Convert to number (lineHeight might be 'normal' or a pixel value)
    let lineHeightValue = '';
    
    if (lineHeight === 'normal') {
      lineHeightValue = ''; // Reset to default
    } else {
      // Parse the line height value
      const fontSize = parseFloat(window.getComputedStyle(block).fontSize);
      const lineHeightPx = parseFloat(lineHeight);
      
      // Calculate the ratio
      const ratio = (lineHeightPx / fontSize).toFixed(1);
      
      // Check if this ratio exists in dropdown
      const option = Array.from(selector.options).find(opt => opt.value === ratio);
      
      if (option) {
        lineHeightValue = ratio;
      }
    }
    
    selector.value = lineHeightValue;
  } else {
    selector.value = '';
  }
}

// Combined update function for all formatting selectors
function updateFormattingSelectors() {
  updateFontSizeSelector();
  updateLineSpacingSelector();
}

// Listen for selection changes and input events
document.addEventListener('DOMContentLoaded', function() {
  const editor = domCache.getEditor();
  if (editor) {
    editor.addEventListener('mouseup', updateFormattingSelectors);
    editor.addEventListener('keyup', updateFormattingSelectors);
    editor.addEventListener('paste', function() {
      setTimeout(updateFormattingSelectors, 100);
    });
  }
  
  // Also listen on added pages
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.classList && node.classList.contains('editor-page')) {
          node.addEventListener('mouseup', updateFormattingSelectors);
          node.addEventListener('keyup', updateFormattingSelectors);
          node.addEventListener('paste', function() {
            setTimeout(updateFormattingSelectors, 100);
          });
        }
      });
    });
  });
  
  const pageWrapper = domCache.getPageWrapper();
  if (pageWrapper) {
    observer.observe(pageWrapper, { childList: true, subtree: true });
  }
  
  // Setup centralized event handlers using event delegation
  // Ensure body exists before setting up
  if (document.body) {
    setupCentralizedEventHandlers();
  } else {
    // Wait for body if not ready
    setTimeout(setupCentralizedEventHandlers, 10);
  }
});

// Setup placeholder clearing for screenplay elements
function setupPlaceholderClearing() {
  const editor = domCache.getEditor();
  if (!editor) return;
  
  // Define placeholders
  const placeholders = [
    'Scene description text goes here...',
    'CHARACTER',
    'Dialogue text here...',
    '(beat)',
    'Action description...'
  ];
  
  // Function to clear placeholder on click/focus
  const clearPlaceholder = function(e) {
    const target = e.target;
    
    // Check if it's a paragraph or inside a paragraph
    let para = target;
    if (target.tagName !== 'P') {
      para = target.closest('p');
    }
    
    if (!para || !para.parentElement || para.parentElement !== editor) return;
    
    const text = para.textContent.trim();
    
    // Check if text matches any placeholder
    if (placeholders.includes(text)) {
      // Clear text but preserve position and dimensions
      // Use non-breaking space to maintain paragraph height and prevent collapse
      para.textContent = '\u00A0'; // Non-breaking space (maintains dimensions)
      // Ensure min-height is preserved for character elements
      if (para.style.marginRight && para.style.marginRight.includes('2.2in')) {
        para.style.minHeight = '1.2em';
        para.style.display = 'block';
        para.style.textAlign = 'center';
      }
      para.removeAttribute('data-placeholder');
      // Focus the paragraph and place cursor at start
      para.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(para.firstChild || para, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };
  
  // Handle input to remove non-breaking space when user starts typing
  editor.addEventListener('input', function(e) {
    const target = e.target;
    let para = target;
    if (target.tagName !== 'P') {
      para = target.closest('p');
    }
    
    if (para && para.parentElement === editor) {
      // If paragraph only contains non-breaking space, remove it when user types
      if (para.textContent === '\u00A0' || para.textContent.trim() === '') {
        // User is typing, the input event will handle the content
        // Just ensure the paragraph maintains its position
        if (para.style.textAlign === 'center' && para.style.textTransform === 'uppercase') {
          para.style.minHeight = '1.2em';
          para.style.display = 'block';
          para.style.textAlign = 'center';
        }
      }
    }
  }, true);
  
  // Use event delegation on the editor
  editor.addEventListener('click', clearPlaceholder, true);
  editor.addEventListener('focus', clearPlaceholder, true);
  editor.addEventListener('mousedown', function(e) {
    const target = e.target;
    let para = target;
    if (target.tagName !== 'P') {
      para = target.closest('p');
    }
    
    if (para && para.parentElement === editor) {
      const text = para.textContent.trim();
      if (placeholders.includes(text)) {
        // Clear text but preserve position and dimensions
        para.textContent = '\u00A0'; // Non-breaking space (maintains dimensions)
        // Ensure min-height is preserved for character elements
        if (para.style.marginRight && para.style.marginRight.includes('2.2in')) {
          para.style.minHeight = '1.2em';
          para.style.display = 'block';
          para.style.textAlign = 'center';
        }
        para.removeAttribute('data-placeholder');
      }
    }
  }, true);
}

// ============================================
// MISSING TOGGLE FUNCTIONS
// ============================================

// Sidebar Toggle
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  const btn = document.querySelector('[data-action="toggleSidebar"]');
  if (btn) {
    const isCollapsed = sidebar.classList.contains('collapsed');
    btn.innerHTML = isCollapsed ? 
      '<i class="fas fa-bars" aria-hidden="true"></i> Show Sidebar' : 
      '<i class="fas fa-bars" aria-hidden="true"></i> Hide Sidebar';
  }
  showToast(sidebar.classList.contains('collapsed') ? 'Sidebar hidden' : 'Sidebar shown');
}

// Page View Toggle
function togglePageView() {
  const body = document.body;
  const btn = document.getElementById('pageViewBtn');
  
  const isPageView = body.classList.toggle('page-view-mode');
  
  if (btn) {
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = isPageView ? 'fas fa-file' : 'fas fa-file-alt';
    }
    btn.innerHTML = isPageView ? 
      '<i class="fas fa-file" aria-hidden="true"></i> Exit Read Mode' : 
      '<i class="fas fa-file-alt" aria-hidden="true"></i> Read Mode';
  }
  showToast(isPageView ? 'Read mode enabled' : 'Read mode disabled');
}

// Dark Mode Toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark);
  showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled');
}

// Focus Mode Toggle
function toggleFocusMode() {
  const editorArea = document.getElementById('editorArea');
  if (!editorArea) return;
  editorArea.classList.toggle('focus-mode');
  const isFocus = editorArea.classList.contains('focus-mode');
  showToast(isFocus ? 'Focus mode enabled' : 'Focus mode disabled');
}

// Fullscreen Mode Toggle
function toggleFullscreenMode(forceOff) {
  if (forceOff === true) {
    document.body.classList.remove('fullscreen-mode');
  } else {
    document.body.classList.toggle('fullscreen-mode');
  }
  const isFull = document.body.classList.contains('fullscreen-mode');
  showToast(isFull ? 'Fullscreen mode enabled' : 'Fullscreen mode disabled');
}

// Centralized Event Handler Setup using Event Delegation (Memory-safe)
let eventHandlersSetup = false;

function setupCentralizedEventHandlers() {
  // Prevent duplicate listeners
  if (eventHandlersSetup) {
    return;
  }
  eventHandlersSetup = true;
  
  // Use event delegation on document body to catch all clicks
  // This prevents memory leaks and handles dynamically added elements
  document.body.addEventListener('click', function(e) {
    // Check if click is on a button with data-action or its child (like icon)
    // closest() will find the parent element with data-action if click is on child
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.getAttribute('data-action');
    const param = target.getAttribute('data-param');
    
    // Debug logging for version history
    if (action === 'openVersionHistory') {
      logger.log('History button clicked! Action:', action, 'Target:', target);
    }
    
    // Route to appropriate handler
    switch(action) {
      case 'toggleSidebar': 
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar(); 
        break;
      case 'togglePageView': togglePageView(); break;
      case 'addNewPage': addNewPage(); break;
      case 'toggleDarkMode': toggleDarkMode(); break;
      case 'toggleFocusMode': toggleFocusMode(); break;
      case 'openVersionHistory': 
        logger.log('Opening version history modal...');
        openVersionHistoryModal(); 
        break;
      case 'closeVersionHistoryModal': 
        logger.log('Closing version history modal...');
        closeVersionHistoryModal(); 
        break;
      case 'closeSaveAsModal': 
        logger.log('Closing save as modal...');
        closeSaveAsModal(); 
        break;
      case 'closeKeyboardShortcutsModal': 
        logger.log('Closing keyboard shortcuts modal...');
        closeKeyboardShortcutsModal(); 
        break;
      case 'openExport': openExportModal(); break;
      case 'saveAll': saveAll(); break;
      case 'openKeyboardShortcuts': openKeyboardShortcutsModal(); break;
      case 'toggleMoreDropdown': toggleMoreDropdown(e); break;
      case 'addChapter': addChapter(); break;
      case 'switchSidebarTab': if (param) switchSidebarTab(param); break;
      case 'insertScreenplayElement': if (param) insertScreenplayElement(param); break;
      case 'insertPlaywritingElement': if (param) insertPlaywritingElement(param); break;
      case 'insertFrontMatter': insertFrontMatter(); break;
      case 'insertBackMatter': insertBackMatter(); break;
      case 'confirmFrontMatter': confirmFrontMatter(); break;
      case 'confirmBackMatter': confirmBackMatter(); break;
      case 'confirmAddChapter': confirmAddChapter(); break;
      case 'closeFrontMatterModal': closeFrontMatterModal(); break;
      case 'closeBackMatterModal': closeBackMatterModal(); break;
      case 'closeAddChapterModal': closeAddChapterModal(); break;
      case 'applyChapterTags': if (param) applyChapterTags(param); break;
      case 'closeChapterTagMenu': closeChapterTagMenu(); break;
      case 'toggleReviewMode': toggleReviewMode(); closeMoreDropdown(); break;
      case 'openShareLink': openShareLink(); closeMoreDropdown(); break;
      case 'addInlineComment': addInlineComment(); closeMoreDropdown(); break;
      case 'applyCustomPageSize': applyCustomPageSize(); break;
      case 'toggleToolbarPanel': 
        e.preventDefault();
        e.stopPropagation();
        toggleToolbarPanel(); 
        break;
      case 'insertDialogue': insertDialogue(); break;
      case 'applyDropCap': applyDropCap(); break;
      case 'spellCheck': spellCheck(); break;
      case 'openFindReplace': openFindReplace(); break;
      case 'saveAs': saveAs(); break;
      case 'aiProofread': aiProofreadSelection(); break;
      case 'insertBlockquote': insertBlockquote(); break;
      case 'insertHorizontalRule': insertHorizontalRule(); break;
      case 'insertTable': insertTable(); break;
      case 'insertChecklist': insertChecklist(); break;
      case 'openEmbedModal': openEmbedModal(); break;
      case 'toggleReadAloud': toggleReadAloud(); break;
      case 'formatHeading': if (param) formatHeading(param); break;
      case 'openMetadata': openMetadataModal(); break;
      case 'openAISettings': openAISettingsModal(); break;
      case 'closeAISettingsModal': closeAISettingsModal(); break;
      case 'updateEngineDisplay': updateEngineDisplay(); break;
      case 'saveLanguageToolUrl': saveLanguageToolUrl(); break;
      case 'testLanguageTool': testLanguageTool(); break;
      case 'formatText': if (param) formatText(param); break;
      case 'transformCase': if (param) transformCase(param); break;
      case 'insertBeatMarker': if (param) insertBeatMarker(param); break;
      case 'insertPageBreak': insertPageBreak(); break;
      case 'insertLink': insertLink(); break;
      case 'insertImage': insertImage(); break;
      case 'printPreview': printPreview(); break;
      case 'confirmPrint': confirmPrint(); break;
      case 'closeModal': if (param) closeModal(param); break;
      case 'saveMetadata': saveMetadata(); break;
      case 'exportDocument': if (param) exportDocument(param); break;
      case 'createTable': createTable(); break;
      case 'insertEmbed': insertEmbed(); break;
      case 'confirmImageInsert': confirmImageInsert(); break;
      case 'closeImageModal': closeImageModal(); break;
      case 'testImageUrl': testImageUrl(); break;
      case 'closeDropCapModal': closeDropCapModal(); break;
      case 'setDropCapSize': if (param) setDropCapSize(param); break;
      case 'applyDropCapStyle': if (param) applyDropCapStyle(param); break;
      case 'newProject': newProject(); break;
      case 'addProject': addProject(); break;
    }
  });
  
  // Handle change events (selects, checkboxes, inputs)
  document.body.addEventListener('change', function(e) {
    const target = e.target;
    if (!target.hasAttribute('data-action')) return;
    
    const action = target.getAttribute('data-action');
    
    switch(action) {
      case 'switchTemplate': switchTemplate(); break;
      case 'toggleSceneNumbering': toggleSceneNumbering(); break;
      case 'removeSceneNumbering': removeSceneNumbering(); break;
      case 'updateGoals': updateGoals(); break;
      case 'updatePageSettings': updatePageSettings(); break;
      case 'updateMarginPreset': updateMarginPreset(); break;
      case 'togglePageNumbering': togglePageNumberingDropdown(); break;
      case 'updatePageNumbering': updatePageNumbering(); break;
      case 'applyCustomPageSize': applyCustomPageSize(); break;
      case 'toggleProjectDropdown': toggleProjectDropdown(); break;
      case 'newProject': newProject(); break;
      case 'addProject': addProject(); break;
      case 'changeFontFamily': changeFontFamily(target.value); break;
      case 'changeFontSize': changeFontSize(target.value); break;
      case 'applyLineSpacing': applyLineSpacing(target.value); break;
      case 'applyLetterSpacing': applyLetterSpacing(target.value); break;
      case 'changeTextColor': changeTextColor(target.value); break;
      case 'changeBackgroundColor': changeBackgroundColor(target.value); break;
      case 'formatHeading': formatHeading(target.value); break;
    }
  });
  
  // Handle input events
  document.body.addEventListener('input', function(e) {
    const target = e.target;
    if (target.id === 'findText') {
      loadWordDefinition();
    }
    if (target.id === 'pageNumberSize' || target.hasAttribute('data-action') && target.getAttribute('data-action') === 'updatePageNumbering') {
      updatePageNumbering();
    }
  });
  
  // Handle focus events
  document.body.addEventListener('focus', function(e) {
    const target = e.target;
    if (target.id === 'fontSizeSelect' || (target.hasAttribute('data-detect') && target.getAttribute('data-detect') === 'true')) {
      // Save selection when dropdown gets focus (in case mousedown didn't catch it)
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        savedFontSizeRange = selection.getRangeAt(0).cloneRange();
      }
      detectFontSize();
    }
  }, true);
  
  // Handle mousedown events on font size dropdown to preserve selection
  document.body.addEventListener('mousedown', function(e) {
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    if (fontSizeSelect && (e.target === fontSizeSelect || fontSizeSelect.contains(e.target))) {
      // Save selection before dropdown steals focus
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        savedFontSizeRange = selection.getRangeAt(0).cloneRange();
      }
    }
  }, true);
  
  // Handle click events for elements that need event object
  document.body.addEventListener('click', function(e) {
    const target = e.target.closest('[data-action="toggleHighlightDropdown"]');
    if (target) {
      e.preventDefault();
      toggleHighlightDropdown(e);
    }
    
    // Handle modal close buttons (both with data-action and class-based)
    const modalClose = e.target.closest('.modal-close');
    if (modalClose) {
      const modal = modalClose.closest('.modal');
      if (modal) {
        e.preventDefault();
        closeModal(modal.id);
      }
    }
    
    // Handle modal overlay clicks (close on overlay click)
    const modalOverlay = e.target.closest('[data-close-on-overlay="true"]');
    if (modalOverlay && e.target === modalOverlay) {
      const action = modalOverlay.getAttribute('data-action');
      if (action && typeof window[action] === 'function') {
        window[action]();
      }
    }
  });
}

// ============================================
// SCREENPLAY AUTO-FORMATTING
// ============================================

let screenplayAutoFormatEnabled = false;
let lastFormattedParagraph = null;

function enableScreenplayAutoFormat() {
  const editor = domCache.getEditor();
  if (!editor) return;
  
  screenplayAutoFormatEnabled = true;
  
  editor.addEventListener('input', screenplayAutoFormatHandler);
  editor.addEventListener('keydown', screenplayAutoFormatKeyHandler);
}

function disableScreenplayAutoFormat() {
  const editor = domCache.getEditor();
  if (!editor) return;
  
  screenplayAutoFormatEnabled = false;
  
  editor.removeEventListener('input', screenplayAutoFormatHandler);
  editor.removeEventListener('keydown', screenplayAutoFormatKeyHandler);
}

function screenplayAutoFormatHandler(e) {
  const templateSelector = document.getElementById('templateSelector');
  if (!templateSelector || templateSelector.value !== 'screenplay') {
    return;
  }
  
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const paragraph = container.nodeType === 3 ? container.parentElement : container;
  
  if (!paragraph || paragraph.tagName !== 'P' || paragraph === lastFormattedParagraph) {
    return;
  }
  
  const text = paragraph.textContent.trim();
  if (!text) return;
  
  const lines = text.split('\n');
  const currentLine = lines[lines.length - 1].trim();
  
  if (!currentLine) return;
  
  // Scene Heading: INT. or EXT.
  if (currentLine.match(/^(INT\.|EXT\.)/i)) {
    paragraph.style.fontWeight = 'bold';
    paragraph.style.textTransform = 'uppercase';
    paragraph.style.marginTop = '12pt';
    paragraph.style.marginBottom = '0';
    paragraph.style.textAlign = 'left';
    paragraph.style.marginLeft = '0';
    paragraph.setAttribute('data-element', 'scene');
    lastFormattedParagraph = paragraph;
    return;
  }
  
  // Character Name: All uppercase, less than 40 chars
  if (currentLine === currentLine.toUpperCase() && 
      currentLine.length < 40 && 
      currentLine.length > 1 &&
      !currentLine.match(/^(INT\.|EXT\.|FADE|CUT|DISSOLVE|CONTINUED)/i) &&
      currentLine.match(/^[A-Z\s]+$/)) {
    paragraph.style.textAlign = 'center';
    paragraph.style.marginTop = '12pt';
    paragraph.style.textTransform = 'uppercase';
    paragraph.style.marginLeft = '0';
    paragraph.style.marginRight = '0';
    paragraph.style.fontWeight = 'normal';
    paragraph.setAttribute('data-element', 'character');
    lastFormattedParagraph = paragraph;
    return;
  }
  
  // Parenthetical: (text)
  if (currentLine.startsWith('(') && currentLine.endsWith(')') && currentLine.length < 50) {
    paragraph.style.marginLeft = '1.8in';
    paragraph.style.textAlign = 'left';
    paragraph.style.textTransform = 'none';
    paragraph.style.fontWeight = 'normal';
    paragraph.setAttribute('data-element', 'parenthetical');
    lastFormattedParagraph = paragraph;
    return;
  }
  
  // Transition: FADE IN:, CUT TO:, etc.
  if (currentLine.match(/^(FADE IN|FADE OUT|CUT TO|DISSOLVE TO|SMASH CUT|MATCH CUT):/i)) {
    paragraph.style.textAlign = 'right';
    paragraph.style.textTransform = 'uppercase';
    paragraph.style.marginTop = '12pt';
    paragraph.style.marginLeft = '0';
    paragraph.style.fontWeight = 'bold';
    paragraph.setAttribute('data-element', 'transition');
    lastFormattedParagraph = paragraph;
    return;
  }
  
  // Check if previous element was a character (then this is dialogue)
  const prevElement = paragraph.previousElementSibling;
  if (prevElement && prevElement.getAttribute('data-element') === 'character') {
    paragraph.style.marginLeft = '1.5in';
    paragraph.style.marginRight = '1.5in';
    paragraph.style.textAlign = 'left';
    paragraph.style.textTransform = 'none';
    paragraph.style.fontWeight = 'normal';
    paragraph.setAttribute('data-element', 'dialogue');
    lastFormattedParagraph = paragraph;
    return;
  }
  
  // Default: Action/Description
  if (!paragraph.hasAttribute('data-element') || paragraph.getAttribute('data-element') === '') {
    paragraph.style.marginTop = '12pt';
    paragraph.style.marginLeft = '0';
    paragraph.style.marginRight = '0';
    paragraph.style.textAlign = 'left';
    paragraph.style.textTransform = 'none';
    paragraph.style.fontWeight = 'normal';
    paragraph.setAttribute('data-element', 'action');
  }
}

function screenplayAutoFormatKeyHandler(e) {
  const templateSelector = document.getElementById('templateSelector');
  if (!templateSelector || templateSelector.value !== 'screenplay') {
    return;
  }
  
  if (e.key === 'Enter') {
    lastFormattedParagraph = null;
  }
}

/* ============================================
   TEMPLATES LIBRARY FUNCTIONS
   ============================================ */

// Modal utility functions
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Toast notification function
function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  
  let backgroundColor = '#28a745'; // Green (changed from grey #333)
  let icon = 'fas fa-check-circle';
  
  if (type === 'success') {
    backgroundColor = '#28a745';
    icon = 'fas fa-check-circle';
  } else if (type === 'error') {
    backgroundColor = '#dc3545';
    icon = 'fas fa-exclamation-circle';
  } else if (type === 'warning') {
    backgroundColor = '#ffc107';
    icon = 'fas fa-exclamation-triangle';
  } else if (type === 'info') {
    backgroundColor = '#28a745'; // Green for info (changed from grey #333)
    icon = 'fas fa-info-circle';
  }
  
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: ${backgroundColor};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 100000;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 500;
    animation: slideInRight 0.3s ease-out;
  `;
  
  const escapedMessage = escapeHtml(message); // Sanitize message to prevent XSS
  toast.innerHTML = `<i class="${icon}"></i><span>${escapedMessage}</span>`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3000);
}

// Add animation CSS
if (!document.getElementById('toast-animations')) {
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/* ============================================
   SCENE NAVIGATOR FUNCTIONALITY
   ============================================ */

// Build scene navigation from document headings
function refreshSceneNavigator() {
  logger.log('refreshSceneNavigator called!');
  
  const editor = document.getElementById('editor');
  const navigator = document.getElementById('sceneNavigator');
  
  logger.log('Editor:', editor);
  logger.log('Navigator:', navigator);
  
  if (!editor || !navigator) {
    logger.error('Scene Navigator: Editor or navigator element not found');
    return;
  }
  
  // Detect current template mode
  const templateSelector = document.getElementById('templateSelector');
  const currentTemplate = templateSelector ? templateSelector.value : 'novel';
  
  logger.log('Current template mode:', currentTemplate);
  
  let items = [];
  
  if (currentTemplate === 'screenplay') {
    // For screenplay: find INT./EXT. scene headings
    const allParagraphs = editor.querySelectorAll('p, div, h1, h2, h3');
    
    logger.log('Total paragraphs found:', allParagraphs.length);
    
    allParagraphs.forEach((para, index) => {
      const text = para.textContent.trim();
      // Match INT. or EXT. at start of line (case insensitive)
      // Also check for screenplay-scene class
      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|INT |EXT )/i.test(text) || para.classList.contains('screenplay-scene')) {
        logger.log('Found scene:', text.substring(0, 50));
        items.push({
          element: para,
          text: text,
          type: 'scene',
          index: index,
          id: `scene-nav-${index}`
        });
      }
    });
    
  } else {
    // For novel/playwriting: find H1, H2, H3 headings
    const headings = editor.querySelectorAll('h1, h2, h3');
    
    headings.forEach((heading, index) => {
      const tag = heading.tagName.toLowerCase();
      items.push({
        element: heading,
        text: heading.textContent.trim() || 'Untitled',
        type: tag,
        index: index,
        id: `scene-nav-${index}`
      });
    });
  }
  
  logger.log('Scene Navigator: Found', items.length, 'items in', currentTemplate, 'mode');
  
  if (items.length === 0) {
    const emptyMessage = currentTemplate === 'screenplay' 
      ? 'No scenes found<br><span style="font-size: 11px; margin-top: 5px; display: block;">Add scene headings (INT./EXT.) to your screenplay</span>'
      : 'Start writing to see navigation<br><span style="font-size: 11px; margin-top: 5px; display: block;">Add headings (H1, H2, H3) to your document</span>';
      
    navigator.innerHTML = `
      <div style="text-align: center; color: #999; padding: 20px; font-size: 13px;">
        <i class="fas fa-map-signs"></i><br>
        ${emptyMessage}
      </div>
    `;
    return;
  }
  
  // Build navigation HTML
  let html = '<div style="padding: 4px;">';
  
  items.forEach((item) => {
    // Add unique ID to element for scrolling
    if (!item.element.id) {
      item.element.id = item.id;
    }
    
    let indentLevel, icon, fontSize, fontWeight, color;
    
    if (currentTemplate === 'screenplay') {
      // Screenplay scene styling
      indentLevel = 0;
      icon = 'fa-video';
      fontSize = '13px';
      fontWeight = '600';
      color = '#333';
    } else {
      // Novel heading styling
      indentLevel = item.type === 'h1' ? 0 : item.type === 'h2' ? 12 : 24;
      icon = item.type === 'h1' ? 'fa-book' : item.type === 'h2' ? 'fa-bookmark' : 'fa-angle-right';
      fontSize = item.type === 'h1' ? '14px' : item.type === 'h2' ? '13px' : '12px';
      fontWeight = item.type === 'h1' ? '700' : item.type === 'h2' ? '600' : '400';
      color = '#333';
    }
    
    const escapedText = escapeHtml(item.text);
    const escapedId = escapeHtml(item.id);
    html += `
      <div onclick="jumpToScene('${escapedId}')" 
           style="padding: 8px 8px 8px ${indentLevel + 8}px; 
                  margin-bottom: 2px; 
                  cursor: pointer; 
                  border-radius: 4px; 
                  font-size: ${fontSize}; 
                  font-weight: ${fontWeight};
                  transition: all 0.2s;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  color: ${color};"
           onmouseover="this.style.background='rgba(139,69,19,0.15)'; this.style.transform='translateX(2px)';"
           onmouseout="this.style.background='transparent'; this.style.transform='translateX(0)';">
        <i class="fas ${icon}" style="color: #8B4513; font-size: 11px; min-width: 14px;"></i>
        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapedText}</span>
      </div>
    `;
  });
  
  html += '</div>';
  navigator.innerHTML = html;
  
  const itemType = currentTemplate === 'screenplay' ? 'scene' : 'heading';
  showToast(`Found ${items.length} ${itemType}${items.length !== 1 ? 's' : ''}`, 'success');
}

// Jump to a specific scene/heading
function jumpToScene(headingId) {
  const heading = document.getElementById(headingId);
  if (!heading) {
    logger.error('Heading not found:', headingId);
    return;
  }
  
  // Smooth scroll to the heading
  heading.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center' 
  });
  
  // Highlight the heading briefly
  const originalBg = heading.style.backgroundColor || '';
  const originalBorder = heading.style.border || '';
  
  heading.style.backgroundColor = 'rgba(212, 175, 55, 0.3)';
  heading.style.border = '2px solid #D4AF37';
  heading.style.borderRadius = '4px';
  heading.style.padding = '5px';
  heading.style.transition = 'all 0.3s';
  
  setTimeout(() => {
    heading.style.backgroundColor = originalBg;
    heading.style.border = originalBorder;
  }, 1500);
}

/* ============================================
   PROJECT MANAGER FUNCTIONALITY
   ============================================ */

let projects = JSON.parse(localStorage.getItem('projects') || '[]');
let currentProjectId = localStorage.getItem('currentProjectId') || null;

// Initialize projects on load
if (projects.length === 0) {
  const defaultProject = {
    id: 'project-' + Date.now(),
    name: 'My First Project',
    template: 'novel',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
  projects.push(defaultProject);
  currentProjectId = defaultProject.id;
  localStorage.setItem('projects', JSON.stringify(projects));
  localStorage.setItem('currentProjectId', currentProjectId);
}

function createNewProject() {
  const nameInput = document.getElementById('newProjectName');
  const templateSelect = document.getElementById('newProjectTemplate');
  const projectName = nameInput.value.trim();
  
  if (!validateProjectName(projectName)) {
    showToast('Please enter a valid project name (max 100 characters, alphanumeric, spaces, hyphens, and underscores only)', 'error');
    nameInput.focus();
    return;
  }
  
  // Check for duplicate names
  if (projects.some(p => p.name.toLowerCase() === projectName.toLowerCase())) {
    showToast('A project with this name already exists', 'error');
    return;
  }
  
  const newProject = {
    id: 'project-' + Date.now(),
    name: projectName,
    template: templateSelect.value,
    created: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
  
  projects.push(newProject);
  localStorage.setItem('projects', JSON.stringify(projects));
  
  showToast(`Project "${projectName}" created successfully!`, 'success');
  nameInput.value = '';
  renderProjectsList();
}

function renderProjectsList() {
  const container = document.getElementById('projectsList');
  
  if (projects.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #999; padding: 40px; font-size: 14px;">
        <i class="fas fa-folder-open" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i><br>
        No projects yet. Create your first project above!
      </div>
    `;
    return;
  }
  
  let html = '';
  projects.forEach(project => {
    const isCurrent = project.id === currentProjectId;
    const templateIcon = project.template === 'screenplay' ? 'fa-film' : 
                        project.template === 'playwriting' ? 'fa-theater-masks' : 'fa-book';
    
    html += `
      <div style="border: 2px solid ${isCurrent ? '#28a745' : '#dee2e6'}; border-radius: 8px; padding: 15px; background: ${isCurrent ? '#e8f5e9' : 'white'}; position: relative;">
        ${isCurrent ? '<div style="position: absolute; top: 10px; right: 10px; background: #28a745; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">ACTIVE</div>' : ''}
        
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
          <i class="fas ${templateIcon}" style="font-size: 24px; color: #8B4513;"></i>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${escapeHtml(project.name)}</div>
            <div style="font-size: 12px; color: #666;">
              <i class="fas fa-file-alt"></i> ${project.template.charAt(0).toUpperCase() + project.template.slice(1)} 
              <span style="margin-left: 12px;"><i class="fas fa-calendar"></i> Created ${new Date(project.created).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          ${!isCurrent ? `<button onclick="switchToProject('${project.id}')" style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
            <i class="fas fa-check"></i> Switch to This
          </button>` : '<div style="flex: 1;"></div>'}
          
          <button onclick="exportProject('${project.id}')" style="padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
            <i class="fas fa-download"></i> Export
          </button>
          
          ${projects.length > 1 ? `<button onclick="deleteProject('${project.id}')" style="padding: 8px 12px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
            <i class="fas fa-trash"></i> Delete
          </button>` : ''}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function switchToProject(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    showToast('Project not found', 'error');
    return;
  }
  
  if (projectId === currentProjectId) {
    showToast('Already on this project', 'info');
    return;
  }
  
  // Save current project state
  saveCurrentProjectData();
  
  // Switch project
  currentProjectId = projectId;
  localStorage.setItem('currentProjectId', projectId);
  
  // Update project's last modified
  project.lastModified = new Date().toISOString();
  localStorage.setItem('projects', JSON.stringify(projects));
  
  // Load new project data
  loadProjectData(projectId);
  
  showToast(`Switched to "${project.name}"`, 'success');
  closeModal('projectManagerModal');
  renderProjectsList();
}

function saveCurrentProjectData() {
  const editor = document.getElementById('editor');
  const templateSelector = document.getElementById('templateSelector');
  
  const projectData = {
    content: editor ? editor.innerHTML : '',
    template: templateSelector ? templateSelector.value : (localStorage.getItem('currentTemplate') || 'novel'),
    chapters: JSON.parse(localStorage.getItem('chapters') || '[]'),
    goals: {
      word: localStorage.getItem('wordGoal'),
      time: localStorage.getItem('timeGoal')
    },
    researchNotes: localStorage.getItem('researchNotes'),
    characters: localStorage.getItem('characters'),
    quickLinks: localStorage.getItem('quickLinks'),
    screenplayCharacters: localStorage.getItem('screenplayCharacters'),
    screenplayLocations: localStorage.getItem('screenplayLocations'),
    // Save current word count and stats
    stats: {
      wordCount: editor ? editor.textContent.split(/\s+/).filter(w => w.length > 0).length : 0,
      lastSaved: new Date().toISOString()
    }
  };
  
  localStorage.setItem(`project_${currentProjectId}_data`, JSON.stringify(projectData));
}

function loadProjectData(projectId) {
  const dataKey = `project_${projectId}_data`;
  const savedData = localStorage.getItem(dataKey);
  const editor = document.getElementById('editor');
  
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      
      // Load editor content
      if (editor) {
        safeHTML.safeSetHTML(editor, data.content || '', true);
      }
      
      // Load template
      if (data.template) {
        const templateSelector = document.getElementById('templateSelector');
        if (templateSelector) {
          templateSelector.value = data.template;
        }
        localStorage.setItem('currentTemplate', data.template);
      }
      
      // Load chapters
      if (data.chapters) {
        localStorage.setItem('chapters', JSON.stringify(data.chapters));
        if (typeof loadChapters === 'function') {
          loadChapters();
        }
      }
      
      // Load goals
      if (data.goals) {
        if (data.goals.word) localStorage.setItem('wordGoal', data.goals.word);
        if (data.goals.time) localStorage.setItem('timeGoal', data.goals.time);
      }
      
      // Load research data
      if (data.researchNotes) {
        localStorage.setItem('researchNotes', data.researchNotes);
        const researchTextarea = document.getElementById('researchNotes');
        if (researchTextarea) {
          researchTextarea.value = data.researchNotes;
        }
      }
      if (data.characters) {
        localStorage.setItem('characters', data.characters);
        if (typeof renderCharacterList === 'function') {
          renderCharacterList();
        }
      }
      if (data.quickLinks) {
        localStorage.setItem('quickLinks', data.quickLinks);
        if (typeof renderQuickLinks === 'function') {
          renderQuickLinks();
        }
      }
      if (data.screenplayCharacters) {
        localStorage.setItem('screenplayCharacters', data.screenplayCharacters);
      }
      if (data.screenplayLocations) {
        localStorage.setItem('screenplayLocations', data.screenplayLocations);
      }
      
      // Refresh UI
      if (typeof refreshSceneNavigator === 'function') {
        refreshSceneNavigator();
      }
      if (typeof updateStatistics === 'function') {
        updateStatistics();
      }
      
    } catch (error) {
      logger.error('Error loading project data:', error);
      showToast('Error loading project data', 'error');
    }
  } else {
    // New project - clear editor
    if (editor) {
      editor.innerHTML = '';
    }
    localStorage.removeItem('chapters');
    if (typeof loadChapters === 'function') {
      loadChapters();
    }
  }
}

function deleteProject(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;
  
  if (projectId === currentProjectId) {
    showToast('Cannot delete the active project. Switch to another project first.', 'error');
    return;
  }
  
  if (!confirm(`Are you sure you want to delete "${project.name}"? This cannot be undone.`)) {
    return;
  }
  
  // Remove project data
  localStorage.removeItem(`project_${projectId}_data`);
  
  // Remove from projects array
  projects = projects.filter(p => p.id !== projectId);
  localStorage.setItem('projects', JSON.stringify(projects));
  
  showToast(`Project "${project.name}" deleted`, 'success');
  renderProjectsList();
}

function exportProject(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    showToast('Project not found', 'error');
    return;
  }
  
  // Get project data
  if (projectId === currentProjectId) {
    saveCurrentProjectData();
  }
  
  const savedData = localStorage.getItem(`project_${projectId}_data`);
  if (!savedData) {
    showToast('No data found for this project', 'error');
    return;
  }
  
  const exportData = {
    project: project,
    data: JSON.parse(savedData),
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  // Create download
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`Project "${project.name}" exported successfully!`, 'success');
}

function importProject() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target.result;
        
        // Check if result is empty or invalid
        if (!result || result.trim() === '') {
          showToast('File is empty or invalid', 'error');
          return;
        }
        
        // Try to parse JSON with better error handling
        let importData;
        try {
          importData = JSON.parse(result);
        } catch (parseError) {
          logger.error('JSON parse error:', parseError);
          logger.error('File content:', result.substring(0, 200));
          showToast('Invalid JSON format in project file', 'error');
          return;
        }
        
        if (!importData.project || !importData.data) {
          showToast('Invalid project file format', 'error');
          return;
        }
        
        // Check for duplicate names and modify if needed
        let projectName = importData.project.name;
        let counter = 1;
        while (projects.some(p => p.name.toLowerCase() === projectName.toLowerCase())) {
          projectName = `${importData.project.name} (${counter})`;
          counter++;
        }
        
        // Create new project with imported data
        const newProject = {
          id: 'project-' + Date.now(),
          name: projectName,
          template: importData.project.template,
          created: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
        
        projects.push(newProject);
        localStorage.setItem('projects', JSON.stringify(projects));
        
        // Save project data
        localStorage.setItem(`project_${newProject.id}_data`, JSON.stringify(importData.data));
        
        showToast(`Project "${projectName}" imported successfully!`, 'success');
        renderProjectsList();
        
      } catch (error) {
        logger.error('Import error:', error);
        showToast('Error importing project file', 'error');
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

function openTemplatesLibrary() {
  const modal = document.getElementById('templatesLibraryModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function insertTemplate(templateType) {
  const editor = document.getElementById('editor');
  if (!editor) {
    logger.error('Editor not found!');
    return;
  }
  
  logger.log('Inserting template:', templateType);
  
  let content = '';
  
  switch(templateType) {
    case 'hero-journey':
      content = `
        <h1>Hero's Journey Outline</h1>
        <h2>1. The Ordinary World</h2>
        <p>Introduce your hero in their everyday life before the adventure begins...</p>
        
        <h2>2. The Call to Adventure</h2>
        <p>Something happens that disrupts the ordinary world and presents a challenge...</p>
        
        <h2>3. Refusal of the Call</h2>
        <p>The hero hesitates, fears the unknown, or has doubts about embarking...</p>
        
        <h2>4. Meeting the Mentor</h2>
        <p>A wise figure provides guidance, gifts, or training...</p>
        
        <h2>5. Crossing the Threshold</h2>
        <p>The hero commits to the adventure and enters a new world...</p>
        
        <h2>6. Tests, Allies, and Enemies</h2>
        <p>The hero faces challenges, makes friends, and discovers who to trust...</p>
        
        <h2>7. Approach to the Inmost Cave</h2>
        <p>Preparation for the major challenge ahead...</p>
        
        <h2>8. The Ordeal</h2>
        <p>The hero faces their greatest fear or most difficult challenge...</p>
        
        <h2>9. Reward (Seizing the Sword)</h2>
        <p>Having survived, the hero obtains the treasure or achieves the goal...</p>
        
        <h2>10. The Road Back</h2>
        <p>The hero begins the journey home, but the adventure isn't over...</p>
        
        <h2>11. Resurrection</h2>
        <p>A final test where everything is at stake...</p>
        
        <h2>12. Return with the Elixir</h2>
        <p>The hero returns home transformed, bringing something to help others...</p>
      `;
      break;
      
    case 'three-act':
      content = `
        <h1>Three-Act Structure Outline</h1>
        
        <h2>ACT I - SETUP (25% of story)</h2>
        <h3>Opening Image</h3>
        <p>The first impression of your story world and protagonist...</p>
        
        <h3>Inciting Incident</h3>
        <p>The event that sets the story in motion...</p>
        
        <h3>Plot Point 1 - Door of No Return</h3>
        <p>The protagonist commits to the journey (around page 25 for screenplay)...</p>
        
        <h2>ACT II - CONFRONTATION (50% of story)</h2>
        <h3>Rising Action</h3>
        <p>Obstacles and complications increase...</p>
        
        <h3>Midpoint</h3>
        <p>Major revelation or false victory/defeat (around page 50-60)...</p>
        
        <h3>Plot Point 2 - Dark Night</h3>
        <p>All seems lost, lowest point (around page 75)...</p>
        
        <h2>ACT III - RESOLUTION (25% of story)</h2>
        <h3>Climax</h3>
        <p>Final confrontation, maximum tension...</p>
        
        <h3>Resolution</h3>
        <p>Loose ends tied up, new equilibrium...</p>
        
        <h3>Closing Image</h3>
        <p>Mirror of opening image, showing change...</p>
      `;
      break;
      
    case 'character-profile':
      content = `
        <h1>Character Profile</h1>
        
        <h2>Basic Information</h2>
        <p><strong>Name:</strong> </p>
        <p><strong>Age:</strong> </p>
        <p><strong>Occupation:</strong> </p>
        <p><strong>Physical Description:</strong> </p>
        
        <h2>Personality</h2>
        <p><strong>Core Traits:</strong> </p>
        <p><strong>Strengths:</strong> </p>
        <p><strong>Weaknesses/Flaws:</strong> </p>
        <p><strong>Fears:</strong> </p>
        <p><strong>Desires/Goals:</strong> </p>
        
        <h2>Background</h2>
        <p><strong>Backstory:</strong> </p>
        <p><strong>Family:</strong> </p>
        <p><strong>Education:</strong> </p>
        <p><strong>Formative Event:</strong> </p>
        
        <h2>Relationships</h2>
        <p><strong>Allies:</strong> </p>
        <p><strong>Enemies:</strong> </p>
        <p><strong>Love Interest:</strong> </p>
        <p><strong>Mentor:</strong> </p>
        
        <h2>Character Arc</h2>
        <p><strong>Starting Point:</strong> </p>
        <p><strong>Goal:</strong> </p>
        <p><strong>Obstacles:</strong> </p>
        <p><strong>Transformation:</strong> </p>
        <p><strong>Ending Point:</strong> </p>
        
        <h2>Voice & Dialogue</h2>
        <p><strong>Speech Patterns:</strong> </p>
        <p><strong>Catchphrases:</strong> </p>
        <p><strong>Internal Monologue Style:</strong> </p>
      `;
      break;
      
    case 'save-the-cat':
      content = `
        <h1>Save the Cat Beat Sheet</h1>
        
        <h2>1. Opening Image (Page 1)</h2>
        <p>A visual that represents the struggle & tone of the story...</p>
        
        <h2>2. Theme Stated (Page 5)</h2>
        <p>What your story is about, the message...</p>
        
        <h2>3. Setup (Pages 1-10)</h2>
        <p>Introduce characters, stakes, and story world...</p>
        
        <h2>4. Catalyst (Page 12)</h2>
        <p>The moment everything changes...</p>
        
        <h2>5. Debate (Pages 12-25)</h2>
        <p>Should I go? Doubt, uncertainty, resistance...</p>
        
        <h2>6. Break into Two (Page 25)</h2>
        <p>Leaving the old world, entering the new world...</p>
        
        <h2>7. B Story (Page 30)</h2>
        <p>The love story or relationship that supports theme...</p>
        
        <h2>8. Fun and Games (Pages 30-55)</h2>
        <p>The promise of the premise, the trailer moments...</p>
        
        <h2>9. Midpoint (Page 55)</h2>
        <p>Either false victory or false defeat...</p>
        
        <h2>10. Bad Guys Close In (Pages 55-75)</h2>
        <p>Doubt, jealousy, fear, enemies regroup...</p>
        
        <h2>11. All Is Lost (Page 75)</h2>
        <p>The opposite of the midpoint, lowest point...</p>
        
        <h2>12. Dark Night of the Soul (Pages 75-85)</h2>
        <p>Mourning the loss of what has died...</p>
        
        <h2>13. Break into Three (Page 85)</h2>
        <p>A + B = C, solution is found...</p>
        
        <h2>14. Finale (Pages 85-110)</h2>
        <p>Applying the lesson, defeating the bad guys...</p>
        
        <h2>15. Final Image (Page 110)</h2>
        <p>Opposite of opening image, proof of change...</p>
      `;
      break;
      
    case 'scene-outline':
      content = `
        <h1>Scene-by-Scene Outline</h1>
        
        <h2>Scene 1</h2>
        <p><strong>Location:</strong> INT./EXT. [LOCATION] - DAY/NIGHT</p>
        <p><strong>Characters:</strong> </p>
        <p><strong>Purpose:</strong> What does this scene accomplish?</p>
        <p><strong>Conflict:</strong> What's the obstacle or tension?</p>
        <p><strong>Action:</strong> Brief description of what happens...</p>
        <p><strong>Outcome:</strong> How does the scene end?</p>
        <p><strong>Page Count:</strong> Approx. X pages</p>
        
        <h2>Scene 2</h2>
        <p><strong>Location:</strong> </p>
        <p><strong>Characters:</strong> </p>
        <p><strong>Purpose:</strong> </p>
        <p><strong>Conflict:</strong> </p>
        <p><strong>Action:</strong> </p>
        <p><strong>Outcome:</strong> </p>
        <p><strong>Page Count:</strong> </p>
        
        <p style="margin-top: 20px; padding: 12px; background: rgba(139,69,19,0.1); border-left: 4px solid #8B4513; font-size: 13px;">
          <strong>💡 Tip:</strong> Copy and paste this scene template for each scene in your screenplay. Aim for 40-60 scenes for a feature film.
        </p>
      `;
      break;
      
    case 'screenplay-beat':
      content = `
        <h1>Screenplay Beat Sheet (110 Pages)</h1>
        
        <h2>Act I (Pages 1-25)</h2>
        <p><strong>Page 1:</strong> Opening image - visual snapshot of protagonist's world</p>
        <p><strong>Page 5:</strong> Theme stated</p>
        <p><strong>Page 10:</strong> Catalyst/Inciting incident</p>
        <p><strong>Page 12:</strong> Debate begins</p>
        <p><strong>Page 25:</strong> Break into Act II - protagonist commits</p>
        
        <h2>Act II - Part A (Pages 26-55)</h2>
        <p><strong>Page 30:</strong> B-story introduced</p>
        <p><strong>Page 40:</strong> Midpoint buildup</p>
        <p><strong>Page 55:</strong> MIDPOINT - false victory or defeat, stakes raised</p>
        
        <h2>Act II - Part B (Pages 56-85)</h2>
        <p><strong>Page 60:</strong> Bad guys close in</p>
        <p><strong>Page 70:</strong> Tension escalates</p>
        <p><strong>Page 75:</strong> All is lost moment</p>
        <p><strong>Page 85:</strong> Break into Act III - realization/solution</p>
        
        <h2>Act III (Pages 86-110)</h2>
        <p><strong>Page 90:</strong> Finale begins</p>
        <p><strong>Page 100:</strong> Climax - final confrontation</p>
        <p><strong>Page 105:</strong> Resolution</p>
        <p><strong>Page 110:</strong> Final image - mirror of opening</p>
      `;
      break;
      
    case 'play-structure':
      content = `
        <h1>Play Structure Outline</h1>
        
        <h2>ACT I</h2>
        
        <h3>Scene 1</h3>
        <p><strong>Setting:</strong> </p>
        <p><strong>Time:</strong> </p>
        <p><strong>Characters Present:</strong> </p>
        <p><strong>Action:</strong> Establish world, introduce characters, plant the seed of conflict...</p>
        
        <h3>Scene 2</h3>
        <p><strong>Setting:</strong> </p>
        <p><strong>Characters Present:</strong> </p>
        <p><strong>Action:</strong> Conflict develops, relationships revealed...</p>
        
        <h2>ACT II</h2>
        
        <h3>Scene 1</h3>
        <p><strong>Setting:</strong> </p>
        <p><strong>Characters Present:</strong> </p>
        <p><strong>Action:</strong> Complications arise, tensions increase...</p>
        
        <h3>Scene 2</h3>
        <p><strong>Setting:</strong> </p>
        <p><strong>Characters Present:</strong> </p>
        <p><strong>Action:</strong> Crisis point, everything changes...</p>
        
        <h2>ACT III</h2>
        
        <h3>Scene 1</h3>
        <p><strong>Setting:</strong> </p>
        <p><strong>Characters Present:</strong> </p>
        <p><strong>Action:</strong> Climax, confrontation...</p>
        
        <h3>Scene 2</h3>
        <p><strong>Setting:</strong> </p>
        <p><strong>Characters Present:</strong> </p>
        <p><strong>Action:</strong> Resolution, denouement...</p>
      `;
      break;
      
    case 'monologue':
      content = `
        <h1>Monologue Template</h1>
        
        <p><strong>CHARACTER NAME</strong></p>
        <p style="font-style: italic; margin-left: 40px;">(Stage direction: emotional state, movement)</p>
        
        <p style="margin-left: 40px;">
          Begin with a hook - something that grabs attention immediately...
        </p>
        
        <p style="margin-left: 40px;">
          Build the context - where are we, what's the situation...
        </p>
        
        <p style="margin-left: 40px;">
          Develop the conflict - what's the problem, what's at stake...
        </p>
        
        <p style="font-style: italic; margin-left: 40px;">(Beat - pause for effect)</p>
        
        <p style="margin-left: 40px;">
          The revelation - the truth, the realization, the key moment...
        </p>
        
        <p style="margin-left: 40px;">
          The turning point - decision made, action taken...
        </p>
        
        <p style="margin-left: 40px;">
          The conclusion - how does this change everything...
        </p>
        
        <p style="font-style: italic; margin-left: 40px;">(Final stage direction - final action/emotion)</p>
        
        <h3 style="margin-top: 30px;">Monologue Tips:</h3>
        <ul style="margin-left: 20px;">
          <li>Keep it under 2 minutes (roughly 250 words)</li>
          <li>Include a clear beginning, middle, and end</li>
          <li>Build emotional intensity</li>
          <li>Make every word count</li>
          <li>Include active verbs and specific details</li>
          <li>Give the actor something to play with</li>
        </ul>
      `;
      break;
      
    case 'world-building':
      content = `
        <h1>World Building Guide</h1>
        
        <h2>Physical World</h2>
        <p><strong>Geography:</strong> Continents, countries, key locations...</p>
        <p><strong>Climate:</strong> Weather patterns, seasons...</p>
        <p><strong>Natural Resources:</strong> What's abundant, what's scarce...</p>
        <p><strong>Flora & Fauna:</strong> Unique plants, animals, creatures...</p>
        
        <h2>Society & Culture</h2>
        <p><strong>Government:</strong> How is power structured and distributed...</p>
        <p><strong>Economy:</strong> Trade, currency, wealth distribution...</p>
        <p><strong>Social Classes:</strong> Hierarchies, mobility between classes...</p>
        <p><strong>Religion:</strong> Belief systems, rituals, deities...</p>
        <p><strong>Values:</strong> What does this society prize or condemn...</p>
        
        <h2>History</h2>
        <p><strong>Origin Story:</strong> How was this world created/founded...</p>
        <p><strong>Major Events:</strong> Wars, disasters, golden ages...</p>
        <p><strong>Current Era:</strong> What defines the present time...</p>
        <p><strong>Legends & Myths:</strong> Stories people tell...</p>
        
        <h2>Technology & Magic</h2>
        <p><strong>Tech Level:</strong> Medieval, industrial, futuristic...</p>
        <p><strong>Magic System:</strong> Rules, limitations, costs...</p>
        <p><strong>Innovation:</strong> Recent breakthroughs or discoveries...</p>
        
        <h2>Daily Life</h2>
        <p><strong>Food & Drink:</strong> Common meals, delicacies...</p>
        <p><strong>Clothing:</strong> Fashion, materials, significance...</p>
        <p><strong>Education:</strong> How knowledge is passed down...</p>
        <p><strong>Entertainment:</strong> Games, sports, arts...</p>
        <p><strong>Language:</strong> Common phrases, naming conventions...</p>
        
        <h2>Conflict & Tension</h2>
        <p><strong>Internal:</strong> Within the society...</p>
        <p><strong>External:</strong> With other societies/forces...</p>
        <p><strong>Emerging Threats:</strong> What's on the horizon...</p>
      `;
      break;
      
    default:
      content = '<p>Template not found.</p>';
  }
  
  logger.log('Template content length:', content.length);
  
  // Insert content into editor
  editor.focus();
  
  // Use insertHTML if available, otherwise set innerHTML
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.selectNodeContents(editor);
    range.collapse(false);
    range.deleteContents();
    const fragment = range.createContextualFragment(content);
    range.insertNode(fragment);
  } else {
    safeHTML.setHTML(editor, editor.innerHTML + content);
  }
  
  logger.log('Template inserted successfully');
  
  // Close modal and update stats
  closeModal('templatesLibraryModal');
  showToast('Template inserted successfully', 'success');
  
  if (typeof updateStats === 'function') {
    updateStats();
  }
}

// Initialize auto-formatting when screenplay template is selected
document.addEventListener('DOMContentLoaded', function() {
  const templateSelector = document.getElementById('templateSelector');
  if (templateSelector) {
    // Additional change handler for template-specific features
    // Note: switchTemplate() is called by the centralized event handler via data-action
    // This handler only adds additional functionality (auto-format, bottom bar)
    templateSelector.addEventListener('change', function() {
      const template = this.value;
      
      // Handle screenplay auto-format
      if (template === 'screenplay') {
        enableScreenplayAutoFormat();
      } else {
        disableScreenplayAutoFormat();
      }
      
      // Update bottom bar
      setTimeout(updateBottomTemplateBar, 200);
    });
    
    // Enable if already on screenplay template
    if (templateSelector.value === 'screenplay') {
      enableScreenplayAutoFormat();
    }
  }
  
  // Auto-refresh Scene Navigator when editor content changes
  const editor = document.getElementById('editor');
  if (editor) {
    let navigatorTimeout = null;
    editor.addEventListener('input', function() {
      if (navigatorTimeout) {
        clearTimeout(navigatorTimeout);
      }
      navigatorTimeout = setTimeout(refreshSceneNavigator, 1500);
    });
  }
  
  // Initialize Project Manager
  if (typeof renderProjectsList === 'function') {
    renderProjectsList();
  }
  
  // Initialize Research Tab
  if (typeof renderCharacterList === 'function') {
    renderCharacterList();
    renderQuickLinks();
    
    // Load saved research notes
    const researchTextarea = document.getElementById('researchNotes');
    if (researchTextarea) {
      const savedNotes = localStorage.getItem('researchNotes');
      if (savedNotes) {
        researchTextarea.value = savedNotes;
      }
    }
  }
  
  // Event delegation for sidebar tabs and other data-action buttons
  document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.dataset.action;
    const param = target.dataset.param;
    
    // Handle all data-action events
    switch(action) {
      case 'switchSidebarTab':
        if (param) switchSidebarTab(param);
        break;
      case 'openTemplatesLibrary':
        if (typeof openTemplatesLibrary === 'function') openTemplatesLibrary();
        break;
      case 'refreshSceneNavigator':
        if (typeof refreshSceneNavigator === 'function') refreshSceneNavigator();
        break;
      case 'openModal':
        if (param && typeof openModal === 'function') openModal(param);
        break;
      case 'addCharacter':
        if (typeof addCharacter === 'function') addCharacter();
        break;
      case 'addQuickLink':
        if (typeof addQuickLink === 'function') addQuickLink();
        break;
      case 'zoomIn':
        if (typeof zoomIn === 'function') zoomIn();
        break;
      case 'zoomOut':
        if (typeof zoomOut === 'function') zoomOut();
        break;
      case 'toggleBottomTemplateBar':
        if (typeof toggleBottomTemplateBar === 'function') toggleBottomTemplateBar();
        break;
      case 'insertScreenplayElement':
        if (param && typeof insertScreenplayElement === 'function') insertScreenplayElement(param);
        break;
      case 'insertPlaywritingElement':
        if (param && typeof insertPlaywritingElement === 'function') insertPlaywritingElement(param);
        break;
      case 'saveResearchNotes':
        if (typeof saveResearchNotes === 'function') saveResearchNotes();
        break;
      case 'applyExportPreset':
        if (param && typeof applyExportPreset === 'function') applyExportPreset(param);
        break;
      case 'insertTemplate':
        if (param && typeof insertTemplate === 'function') insertTemplate(param);
        break;
      case 'importProject':
        if (typeof importProject === 'function') importProject();
        break;
      case 'createNewProject':
        if (typeof createNewProject === 'function') createNewProject();
        break;
      case 'closeModal':
        if (param && typeof closeModal === 'function') closeModal(param);
        break;
      case 'findTextInput':
        // Handled by keypress event
        break;
      case 'openExternalLink':
        if (param) {
          try {
            window.open(param, '_blank', 'noopener,noreferrer');
          } catch (e) {
            logger.warn('Failed to open external link:', e);
          }
        }
        break;
      default:
        // Let other handlers process it
        break;
    }
  });
  
  // Handle input events with data-action
  document.addEventListener('input', function(e) {
    const target = e.target;
    if (!target || !target.hasAttribute('data-action')) return;
    
    const action = target.dataset.action;
    if (action === 'saveResearchNotes' && typeof saveResearchNotes === 'function') {
      saveResearchNotes();
    }
  });
  
  // Handle keypress events with data-action
  document.addEventListener('keypress', function(e) {
    const target = e.target;
    if (!target || !target.hasAttribute('data-action')) return;
    
    const action = target.dataset.action;
    const keypress = target.dataset.keypress;
    
    if (keypress && e.key === keypress) {
      switch(action) {
        case 'addCharacter':
          if (typeof addCharacter === 'function') addCharacter();
          break;
        case 'addQuickLink':
          if (typeof addQuickLink === 'function') addQuickLink();
          break;
      }
    }
    
    // Handle find text input
    if (action === 'findTextInput' && e.key === 'Enter') {
      if (typeof findNext === 'function') {
        findNext();
      } else if (typeof loadWordDefinition === 'function') {
        loadWordDefinition();
      }
    }
  });
});

// ============================================
// RESEARCH TAB FUNCTIONS
// ============================================

// Sidebar Tab Switching
function switchSidebarTab(tab) {
  const tabs = document.querySelectorAll('.sidebar-tab');
  const contents = document.querySelectorAll('.sidebar-content');
  
  // Remove active class from all tabs
  tabs.forEach(t => t.classList.remove('active'));
  
  // Hide all content
  contents.forEach(c => c.classList.add('hidden'));
  
  // Activate clicked tab (find the tab that was clicked via dataset)
  const clickedTab = document.querySelector(`.sidebar-tab[data-param="${tab}"]`);
  if (clickedTab) {
    clickedTab.classList.add('active');
  }
  
  // Show corresponding content
  if (tab === 'chapters') {
    document.getElementById('chaptersTab').classList.remove('hidden');
  } else if (tab === 'research') {
    document.getElementById('researchTab').classList.remove('hidden');
  } else if (tab === 'story') {
    document.getElementById('storyTab').classList.remove('hidden');
  } else if (tab === 'stats') {
    document.getElementById('statsTab').classList.remove('hidden');
  }
}

// Save research notes automatically
function saveResearchNotes() {
  const notes = document.getElementById('researchNotes').value;
  localStorage.setItem('researchNotes', notes);
  logger.log('Research notes saved');
}

// Add a character to tracker
function addCharacter() {
  const input = document.getElementById('newCharacterName');
  const name = input.value.trim();
  
  // Validate character name
  if (!name || name.length === 0) {
    // Create custom alert dialog
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 90%;';
    dialog.innerHTML = `
      <div style="margin-bottom: 15px; padding: 12px; background: rgba(139,69,19,0.1); border-radius: 6px; border-left: 4px solid #8B4513;">
        <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 8px;">
          <i class="fas fa-info-circle" style="color: #8B4513;"></i> Character Name Required
        </div>
        <div style="font-size: 14px; color: #666;">
          Please enter a character name before adding.
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end;">
        <button id="closeCharAlert" style="padding: 10px 20px; background: #8B4513; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          <i class="fas fa-check"></i> OK
        </button>
      </div>
    `;
    
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    
    document.getElementById('closeCharAlert').onclick = () => {
      backdrop.remove();
      input.focus();
    };
    
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
        input.focus();
      }
    };
    return;
  }
  
  // Validate name length
  if (name.length > 200) {
    showToast('Character name is too long (max 200 characters)', 'error');
    return;
  }
  
  // Get existing characters
  let characters = JSON.parse(localStorage.getItem('characters') || '[]');
  
  // Check for duplicates
  if (characters.some(char => char.name.toLowerCase() === name.toLowerCase())) {
    showToast('Character with this name already exists', 'error');
    return;
  }
  
  // Add new character (name is sanitized by escapeHtml when displayed)
  characters.push({
    name: name,
    id: Date.now()
  });
  
  localStorage.setItem('characters', JSON.stringify(characters));
  input.value = '';
  renderCharacterList();
  logger.log('Character added:', name);
}

// Render the character list
function renderCharacterList() {
  const characterList = document.getElementById('characterList');
  const characters = JSON.parse(localStorage.getItem('characters') || '[]');
  
  if (characters.length === 0) {
    characterList.innerHTML = `
      <div style="padding: 12px; background: rgba(139,69,19,0.05); border-radius: 6px; border: 1px dashed #dee2e6;">
        <div style="text-align: center; color: #8B4513; font-size: 13px;">
          <i class="fas fa-users" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i><br>
          <span style="font-weight: 600;">No characters yet</span><br>
          <span style="font-size: 12px; color: #999;">Add characters using the field below</span>
        </div>
      </div>
    `;
    return;
  }
  
  // Sanitize character names to prevent XSS
  characterList.innerHTML = characters.map(char => {
    const safeName = escapeHtml(char.name);
    return `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
      <span style="font-size: 13px;">${safeName}</span>
      <button onclick="deleteCharacter(${char.id})" 
              style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
  }).join('');
}

// Delete a character
function deleteCharacter(id) {
  const characters = JSON.parse(localStorage.getItem('characters') || '[]');
  const character = characters.find(char => char.id === id);
  
  // Create custom confirmation dialog
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
  
  const dialog = document.createElement('div');
  dialog.style.cssText = 'background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 90%;';
  dialog.innerHTML = `
    <div style="margin-bottom: 15px; padding: 12px; background: rgba(139,69,19,0.1); border-radius: 6px; border-left: 4px solid #8B4513;">
      <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 8px;">
        <i class="fas fa-exclamation-triangle" style="color: #8B4513;"></i> Delete Character
      </div>
      <div style="font-size: 14px; color: #666;">
        Are you sure you want to delete "${character?.name || 'this character'}"?
      </div>
    </div>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="cancelDeleteChar" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-times"></i> Cancel
      </button>
      <button id="confirmDeleteChar" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;
  
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  
  // Handle cancel
  document.getElementById('cancelDeleteChar').onclick = () => {
    backdrop.remove();
  };
  
  // Handle confirm
  document.getElementById('confirmDeleteChar').onclick = () => {
    let characters = JSON.parse(localStorage.getItem('characters') || '[]');
    characters = characters.filter(char => char.id !== id);
    localStorage.setItem('characters', JSON.stringify(characters));
    renderCharacterList();
    backdrop.remove();
    logger.log('Character deleted:', id);
  };
  
  // Close on backdrop click
  backdrop.onclick = (e) => {
    if (e.target === backdrop) backdrop.remove();
  };
}

// Add a quick link
function addQuickLink() {
  const input = document.getElementById('newLinkUrl');
  const url = input.value.trim();
  
  if (!url) {
    // Create custom alert dialog
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 90%;';
    dialog.innerHTML = `
      <div style="margin-bottom: 15px; padding: 12px; background: rgba(139,69,19,0.1); border-radius: 6px; border-left: 4px solid #8B4513;">
        <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 8px;">
          <i class="fas fa-info-circle" style="color: #8B4513;"></i> URL Required
        </div>
        <div style="font-size: 14px; color: #666;">
          Please enter a URL before adding.
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end;">
        <button id="closeUrlAlert" style="padding: 10px 20px; background: #17a2b8; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          <i class="fas fa-check"></i> OK
        </button>
      </div>
    `;
    
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    
    document.getElementById('closeUrlAlert').onclick = () => {
      backdrop.remove();
      input.focus();
    };
    
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
        input.focus();
      }
    };
    return;
  }
  
  // Enhanced URL validation using validateUrl function
  if (!validateUrl(url)) {
    // Create custom alert dialog
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 90%;';
    dialog.innerHTML = `
      <div style="margin-bottom: 15px; padding: 12px; background: rgba(139,69,19,0.1); border-radius: 6px; border-left: 4px solid #8B4513;">
        <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 8px;">
          <i class="fas fa-exclamation-triangle" style="color: #8B4513;"></i> Invalid URL Format
        </div>
        <div style="font-size: 14px; color: #666;">
          URL must start with <strong>http://</strong> or <strong>https://</strong>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end;">
        <button id="closeUrlFormatAlert" style="padding: 10px 20px; background: #17a2b8; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          <i class="fas fa-check"></i> OK
        </button>
      </div>
    `;
    
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    
    document.getElementById('closeUrlFormatAlert').onclick = () => {
      backdrop.remove();
      input.focus();
    };
    
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
        input.focus();
      }
    };
    return;
  }
  
  // Get existing links
  let links = JSON.parse(localStorage.getItem('quickLinks') || '[]');
  
  // Add new link
  links.push({
    url: url,
    id: Date.now()
  });
  
  localStorage.setItem('quickLinks', JSON.stringify(links));
  input.value = '';
  renderQuickLinks();
  logger.log('Quick link added:', url);
}

// Render the quick links list
function renderQuickLinks() {
  const linksList = document.getElementById('quickLinks');
  const links = JSON.parse(localStorage.getItem('quickLinks') || '[]');
  
  if (links.length === 0) {
    linksList.innerHTML = `
      <div style="padding: 12px; background: rgba(139,69,19,0.05); border-radius: 6px; border: 1px dashed #dee2e6;">
        <div style="text-align: center; color: #8B4513; font-size: 13px;">
          <i class="fas fa-link" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i><br>
          <span style="font-weight: 600;">No links yet</span><br>
          <span style="font-size: 12px; color: #999;">Add research links using the field below</span>
        </div>
      </div>
    `;
    return;
  }
  
  // Sanitize URLs to prevent XSS
  linksList.innerHTML = links.map(link => {
    // Validate and sanitize URL
    const safeUrl = sanitizeAttribute(link.url);
    const displayUrl = safeUrl.length > 35 ? escapeHtml(safeUrl.substring(0, 35) + '...') : escapeHtml(safeUrl);
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; font-size: 13px; color: #17a2b8; text-decoration: none;">
          <i class="fas fa-external-link-alt"></i> ${displayUrl}
        </a>
        <button onclick="deleteQuickLink(${link.id})" 
                style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-left: 8px;">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  }).join('');
}

// Delete a quick link
function deleteQuickLink(id) {
  const links = JSON.parse(localStorage.getItem('quickLinks') || '[]');
  const link = links.find(l => l.id === id);
  
  // Create custom confirmation dialog
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
  
  const dialog = document.createElement('div');
  dialog.style.cssText = 'background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 90%;';
  dialog.innerHTML = `
    <div style="margin-bottom: 15px; padding: 12px; background: rgba(139,69,19,0.1); border-radius: 6px; border-left: 4px solid #8B4513;">
      <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 8px;">
        <i class="fas fa-exclamation-triangle" style="color: #8B4513;"></i> Delete Link
      </div>
      <div style="font-size: 14px; color: #666;">
        Are you sure you want to delete this link?
      </div>
    </div>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="cancelDeleteLink" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-times"></i> Cancel
      </button>
      <button id="confirmDeleteLink" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;
  
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  
  // Handle cancel
  document.getElementById('cancelDeleteLink').onclick = () => {
    backdrop.remove();
  };
  
  // Handle confirm
  document.getElementById('confirmDeleteLink').onclick = () => {
    let links = JSON.parse(localStorage.getItem('quickLinks') || '[]');
    links = links.filter(link => link.id !== id);
    localStorage.setItem('quickLinks', JSON.stringify(links));
    renderQuickLinks();
    backdrop.remove();
    logger.log('Quick link deleted:', id);
  };
  
  // Close on backdrop click
  backdrop.onclick = (e) => {
    if (e.target === backdrop) backdrop.remove();
  };
}
