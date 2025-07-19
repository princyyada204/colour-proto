// bookmarks.js - Detailed bookmarks page functionality

class BookmarksManager {
  constructor() {
    this.bookmarks = [];
    this.filteredBookmarks = [];
    this.currentFilter = 'all';
    this.currentSort = 'timeSpent';
    this.searchQuery = '';
    this.editingBookmark = null;
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadBookmarks();
  }

  initializeElements() {
    this.elements = {
      searchInput: document.getElementById('searchInput'),
      sortSelect: document.getElementById('sortSelect'),
      bookmarksContainer: document.getElementById('bookmarksContainer'),
      addBookmarkBtn: document.getElementById('addBookmarkBtn'),
      bookmarkTitle: document.getElementById('bookmarkTitle'),
      bookmarkUrl: document.getElementById('bookmarkUrl'),
      bookmarkCategory: document.getElementById('bookmarkCategory'),
      refreshBtn: document.getElementById('refreshBookmarksBtn'),
      exportBtn: document.getElementById('exportBookmarksBtn'),
      importBtn: document.getElementById('importBookmarksBtn'),
      importFileInput: document.getElementById('importFileInput'),
      editModal: document.getElementById('editModal'),
      editTitle: document.getElementById('editTitle'),
      editUrl: document.getElementById('editUrl'),
      editCategory: document.getElementById('editCategory'),
      saveEditBtn: document.getElementById('saveEditBtn'),
      
      // Stats
      totalBookmarks: document.getElementById('totalBookmarks'),
      autoBookmarks: document.getElementById('autoBookmarks'),
      customBookmarks: document.getElementById('customBookmarks'),
      totalTime: document.getElementById('totalTime')
    };
  }

  setupEventListeners() {
    // Search functionality
    this.elements.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterAndRenderBookmarks();
    });

    // Sort functionality
    this.elements.sortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.filterAndRenderBookmarks();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.getAttribute('data-category');
        this.filterAndRenderBookmarks();
      });
    });

    // Add bookmark
    this.elements.addBookmarkBtn.addEventListener('click', () => {
      this.addCustomBookmark();
    });

    // Bulk actions
    this.elements.refreshBtn.addEventListener('click', () => {
      this.refreshAutoBookmarks();
    });

    this.elements.exportBtn.addEventListener('click', () => {
      this.exportBookmarks();
    });

    this.elements.importBtn.addEventListener('click', () => {
      this.elements.importFileInput.click();
    });

    this.elements.importFileInput.addEventListener('change', (e) => {
      this.importBookmarks(e.target.files[0]);
    });

    // Edit modal
    this.elements.saveEditBtn.addEventListener('click', () => {
      this.saveEditedBookmark();
    });

    // Enter key for add bookmark
    [this.elements.bookmarkTitle, this.elements.bookmarkUrl].forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addCustomBookmark();
        }
      });
    });
  }

  async loadBookmarks() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' });
      this.bookmarks = response.bookmarks || [];
      this.updateStats();
      this.filterAndRenderBookmarks();
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      this.showError('Failed to load bookmarks');
    }
  }

  updateStats() {
    const autoBookmarks = this.bookmarks.filter(b => b.isAutoBookmarked).length;
    const customBookmarks = this.bookmarks.filter(b => b.isCustom).length;
    const totalTime = this.bookmarks.reduce((sum, b) => sum + (b.timeSpent || 0), 0);

    this.elements.totalBookmarks.textContent = this.bookmarks.length;
    this.elements.autoBookmarks.textContent = autoBookmarks;
    this.elements.customBookmarks.textContent = customBookmarks;
    this.elements.totalTime.textContent = this.formatTime(totalTime);
  }

  filterAndRenderBookmarks() {
    // Filter by category
    let filtered = this.currentFilter === 'all' 
      ? [...this.bookmarks]
      : this.bookmarks.filter(b => b.category === this.currentFilter);

    // Filter by search query
    if (this.searchQuery) {
      filtered = filtered.filter(b => 
        b.title.toLowerCase().includes(this.searchQuery) ||
        b.domain.toLowerCase().includes(this.searchQuery) ||
        b.category.toLowerCase().includes(this.searchQuery)
      );
    }

    // Sort bookmarks
    filtered.sort((a, b) => {
      switch (this.currentSort) {
        case 'timeSpent':
          return (b.timeSpent || 0) - (a.timeSpent || 0);
        case 'addedAt':
          return new Date(b.addedAt) - new Date(a.addedAt);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'visitCount':
          return (b.visitCount || 0) - (a.visitCount || 0);
        default:
          return 0;
      }
    });

    this.filteredBookmarks = filtered;
    this.renderBookmarks();
  }

  renderBookmarks() {
    if (this.filteredBookmarks.length === 0) {
      this.elements.bookmarksContainer.innerHTML = `
        <div class="no-bookmarks">
          <h3>No bookmarks found</h3>
          <p>
            ${this.searchQuery ? 'Try adjusting your search terms or filters.' : 
              this.currentFilter === 'all' ? 
                'Start browsing productive sites for 30+ minutes to automatically bookmark them, or add custom bookmarks above.' :
                'No bookmarks in this category yet.'}
          </p>
        </div>
      `;
      return;
    }

    const bookmarksHTML = this.filteredBookmarks.map(bookmark => this.createBookmarkCard(bookmark)).join('');
    
    this.elements.bookmarksContainer.innerHTML = `
      <div class="bookmarks-grid">
        ${bookmarksHTML}
      </div>
    `;
  }

  createBookmarkCard(bookmark) {
    const timeSpent = this.formatTime(bookmark.timeSpent || 0);
    const visitCount = bookmark.visitCount || 0;
    const addedDate = new Date(bookmark.addedAt).toLocaleDateString();
    const lastVisited = bookmark.lastVisited ? new Date(bookmark.lastVisited).toLocaleDateString() : 'Never';

    return `
      <div class="bookmark-card" data-id="${bookmark.id}">
        <div class="bookmark-header">
          <div class="bookmark-favicon">
            <img src="${bookmark.favicon}" alt="" onerror="this.style.display='none'; this.parentNode.innerHTML='🔖';">
          </div>
          <div class="bookmark-info">
            <div class="bookmark-title">${this.escapeHtml(bookmark.title)}</div>
            <div class="bookmark-domain">${this.escapeHtml(bookmark.domain)}</div>
          </div>
        </div>
        
        <div class="bookmark-badges">
          <span class="badge ${bookmark.isAutoBookmarked ? 'auto' : 'custom'}">
            <i class="fas fa-${bookmark.isAutoBookmarked ? 'robot' : 'user'}"></i>
            ${bookmark.isAutoBookmarked ? 'Auto' : 'Custom'}
          </span>
          <span class="badge ${bookmark.category}">${this.capitalizeFirst(bookmark.category)}</span>
        </div>
        
        <div class="bookmark-stats">
          <div class="stat-item">
            <i class="fas fa-clock"></i>
            <span>${timeSpent}</span>
          </div>
          <div class="stat-item">
            <i class="fas fa-eye"></i>
            <span>${visitCount} visits</span>
          </div>
          <div class="stat-item">
            <i class="fas fa-plus"></i>
            <span>${addedDate}</span>
          </div>
          <div class="stat-item">
            <i class="fas fa-clock"></i>
            <span>Last: ${lastVisited}</span>
          </div>
        </div>
        
        <div class="bookmark-actions">
          <button class="btn btn-small btn-primary" onclick="bookmarksManager.visitBookmark('${bookmark.url}')">
            <i class="fas fa-external-link-alt"></i>
            Visit
          </button>
          <button class="btn btn-small" onclick="bookmarksManager.editBookmark('${bookmark.id}')">
            <i class="fas fa-edit"></i>
            Edit
          </button>
          <button class="btn btn-small btn-danger" onclick="bookmarksManager.deleteBookmark('${bookmark.id}')">
            <i class="fas fa-trash"></i>
            Delete
          </button>
        </div>
      </div>
    `;
  }

  async addCustomBookmark() {
    const title = this.elements.bookmarkTitle.value.trim();
    const url = this.elements.bookmarkUrl.value.trim();
    const category = this.elements.bookmarkCategory.value;

    if (!title || !url) {
      this.showError('Please enter both title and URL');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.showError('Please enter a valid URL');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_CUSTOM_BOOKMARK',
        title: title,
        url: url,
        category: category
      });

      if (response.status === 'bookmark added') {
        this.bookmarks.push(response.bookmark);
        this.updateStats();
        this.filterAndRenderBookmarks();
        
        // Clear form
        this.elements.bookmarkTitle.value = '';
        this.elements.bookmarkUrl.value = '';
        this.elements.bookmarkCategory.value = 'learning';
        
        this.showSuccess('Bookmark added successfully!');
      }
    } catch (error) {
      console.error('Error adding bookmark:', error);
      this.showError('Failed to add bookmark');
    }
  }

  visitBookmark(url) {
    // Update last visited time
    const bookmark = this.bookmarks.find(b => b.url === url);
    if (bookmark) {
      bookmark.lastVisited = new Date().toISOString();
      bookmark.visitCount = (bookmark.visitCount || 0) + 1;
      
      chrome.runtime.sendMessage({
        type: 'UPDATE_BOOKMARK',
        bookmarkId: bookmark.id,
        updates: {
          lastVisited: bookmark.lastVisited,
          visitCount: bookmark.visitCount
        }
      });
    }
    
    // Open in new tab
    chrome.tabs.create({ url: url });
  }

  editBookmark(bookmarkId) {
    const bookmark = this.bookmarks.find(b => b.id == bookmarkId);
    if (!bookmark) return;

    this.editingBookmark = bookmark;
    this.elements.editTitle.value = bookmark.title;
    this.elements.editUrl.value = bookmark.url;
    this.elements.editCategory.value = bookmark.category;
    
    this.elements.editModal.classList.add('show');
  }

  async saveEditedBookmark() {
    if (!this.editingBookmark) return;

    const title = this.elements.editTitle.value.trim();
    const url = this.elements.editUrl.value.trim();
    const category = this.elements.editCategory.value;

    if (!title || !url) {
      this.showError('Please enter both title and URL');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.showError('Please enter a valid URL');
      return;
    }

    try {
      const updates = {
        title: title,
        url: url,
        category: category,
        domain: new URL(url).hostname.replace(/^www\./, ''),
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
      };

      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_BOOKMARK',
        bookmarkId: this.editingBookmark.id,
        updates: updates
      });

      if (response.status === 'bookmark updated') {
        // Update local bookmark
        Object.assign(this.editingBookmark, updates);
        this.filterAndRenderBookmarks();
        this.closeEditModal();
        this.showSuccess('Bookmark updated successfully!');
      }
    } catch (error) {
      console.error('Error updating bookmark:', error);
      this.showError('Failed to update bookmark');
    }
  }

  async deleteBookmark(bookmarkId) {
    if (!confirm('Are you sure you want to delete this bookmark?')) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REMOVE_BOOKMARK',
        bookmarkId: bookmarkId
      });

      if (response.status === 'bookmark removed') {
        this.bookmarks = this.bookmarks.filter(b => b.id != bookmarkId);
        this.updateStats();
        this.filterAndRenderBookmarks();
        this.showSuccess('Bookmark deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      this.showError('Failed to delete bookmark');
    }
  }

  async refreshAutoBookmarks() {
    try {
      this.elements.refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
      this.elements.refreshBtn.disabled = true;

      await chrome.runtime.sendMessage({ type: 'UPDATE_BOOKMARKS' });
      
      // Reload bookmarks after a short delay
      setTimeout(() => {
        this.loadBookmarks();
        this.elements.refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Auto-Bookmarks';
        this.elements.refreshBtn.disabled = false;
        this.showSuccess('Auto-bookmarks refreshed!');
      }, 1000);
    } catch (error) {
      console.error('Error refreshing bookmarks:', error);
      this.showError('Failed to refresh bookmarks');
      this.elements.refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Auto-Bookmarks';
      this.elements.refreshBtn.disabled = false;
    }
  }

  exportBookmarks() {
    const exportData = {
      bookmarks: this.bookmarks,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyflow-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showSuccess('Bookmarks exported successfully!');
  }

  async importBookmarks(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
        throw new Error('Invalid bookmark file format');
      }

      let importedCount = 0;
      const existingDomains = new Set(this.bookmarks.map(b => b.domain));

      for (const bookmark of data.bookmarks) {
        if (!existingDomains.has(bookmark.domain)) {
          const newBookmark = {
            ...bookmark,
            id: Date.now() + Math.random(),
            addedAt: new Date().toISOString(),
            isCustom: true,
            isAutoBookmarked: false
          };

          const response = await chrome.runtime.sendMessage({
            type: 'ADD_CUSTOM_BOOKMARK',
            title: newBookmark.title,
            url: newBookmark.url,
            category: newBookmark.category
          });

          if (response.status === 'bookmark added') {
            this.bookmarks.push(response.bookmark);
            importedCount++;
          }
        }
      }

      this.updateStats();
      this.filterAndRenderBookmarks();
      this.showSuccess(`Imported ${importedCount} new bookmarks!`);
      
    } catch (error) {
      console.error('Error importing bookmarks:', error);
      this.showError('Failed to import bookmarks. Please check the file format.');
    }

    // Reset file input
    this.elements.importFileInput.value = '';
  }

  closeEditModal() {
    this.elements.editModal.classList.remove('show');
    this.editingBookmark = null;
  }

  // Utility functions
  formatTime(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'linear-gradient(135deg, #4ade80, #22d3ee)' : 
                   type === 'error' ? 'linear-gradient(135deg, #f87171, #ef4444)' : 
                   'linear-gradient(135deg, #667eea, #764ba2)'};
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      z-index: 10000;
      font-weight: 600;
      transform: translateX(400px);
      transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Global functions for onclick handlers
function closeEditModal() {
  bookmarksManager.closeEditModal();
}

// Initialize the bookmarks manager
const bookmarksManager = new BookmarksManager();

// Handle modal clicks
document.getElementById('editModal').addEventListener('click', (e) => {
  if (e.target.id === 'editModal') {
    closeEditModal();
  }
});

// Handle escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeEditModal();
  }
});