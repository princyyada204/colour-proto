// popup.js - Main popup functionality

// ========== GLOBAL VARIABLES ==========
let currentPage = 'dashboard';
let focusTimer = null;
let focusStartTime = null;
let focusDuration = 25; // minutes
let breakDuration = 5; // minutes
let longBreakDuration = 15; // minutes

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  initializePopup();
  loadUserStats();
  loadDashboardData();
  setupEventListeners();
  setupNavigation();
  renderAlerts();
});

function initializePopup() {
  // Load saved timer settings
  chrome.storage.local.get(['pomodoroSettings'], (result) => {
    if (result.pomodoroSettings) {
      focusDuration = result.pomodoroSettings.pomodoro || 25;
      breakDuration = result.pomodoroSettings.break || 5;
      longBreakDuration = result.pomodoroSettings.longBreak || 15;
      
      document.getElementById('focusDuration').value = focusDuration;
      document.getElementById('breakDuration').value = breakDuration;
      document.getElementById('longBreakDuration').value = longBreakDuration;
    }
  });
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  // Analytics page buttons
  const viewFullAnalyticsBtn = document.getElementById('viewFullAnalyticsBtn');
  if (viewFullAnalyticsBtn) {
    viewFullAnalyticsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    });
  }

  const viewBookmarksBtn = document.getElementById('viewBookmarksBtn');
  if (viewBookmarksBtn) {
    viewBookmarksBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('bookmarks.html') });
    });
  }

  const refreshDataBtn = document.getElementById('refreshDataBtn');
  if (refreshDataBtn) {
    refreshDataBtn.addEventListener('click', refreshAnalyticsData);
  }

  const resetDailyDataBtn = document.getElementById('resetDailyDataBtn');
  if (resetDailyDataBtn) {
    resetDailyDataBtn.addEventListener('click', resetDailyData);
  }

  // Focus session buttons
  const startFocusBtn = document.getElementById('startFocusBtn');
  if (startFocusBtn) {
    startFocusBtn.addEventListener('click', startFocusSession);
  }

  const stopFocusBtn = document.getElementById('stopFocusBtn');
  if (stopFocusBtn) {
    stopFocusBtn.addEventListener('click', endFocusSession);
  }

  const openPomodoroBtn = document.getElementById('openPomodoroBtn');
  if (openPomodoroBtn) {
    openPomodoroBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('pomodoro.html') });
    });
  }

  // Site blocker functionality
  const addSiteBtn = document.getElementById('addSiteBtn');
  if (addSiteBtn) {
    addSiteBtn.addEventListener('click', addBlockedSite);
  }

  const siteInput = document.getElementById('siteInput');
  if (siteInput) {
    siteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addBlockedSite();
    });
  }

  // Goals functionality
  const addGoalBtn = document.getElementById('addGoalBtn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', addGoal);
  }

  // Notes functionality
  const saveNoteBtn = document.getElementById('saveNoteBtn');
  if (saveNoteBtn) {
    saveNoteBtn.addEventListener('click', saveNote);
  }

  // Calendar functionality
  const addReminderBtn = document.getElementById('addReminderBtn');
  if (addReminderBtn) {
    addReminderBtn.addEventListener('click', addReminder);
  }

  // Bookmarks functionality
  const addCustomBookmarkBtn = document.getElementById('addCustomBookmarkBtn');
  if (addCustomBookmarkBtn) {
    addCustomBookmarkBtn.addEventListener('click', addCustomBookmark);
  }

  const viewDetailedBookmarksBtn = document.getElementById('viewDetailedBookmarksBtn');
  if (viewDetailedBookmarksBtn) {
    viewDetailedBookmarksBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('bookmarks.html') });
    });
  }

  const refreshBookmarksBtn = document.getElementById('refreshBookmarksBtn');
  if (refreshBookmarksBtn) {
    refreshBookmarksBtn.addEventListener('click', refreshBookmarks);
  }

  const exportBookmarksBtn = document.getElementById('exportBookmarksBtn');
  if (exportBookmarksBtn) {
    exportBookmarksBtn.addEventListener('click', exportBookmarks);
  }

  const importBookmarksBtn = document.getElementById('importBookmarksBtn');
  if (importBookmarksBtn) {
    importBookmarksBtn.addEventListener('click', () => {
      document.getElementById('importFileInput').click();
    });
  }

  const importFileInput = document.getElementById('importFileInput');
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        importBookmarks(e.target.files[0]);
      }
    });
  }
}

// ========== NAVIGATION ==========
function setupNavigation() {
  // Menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const menuContent = document.getElementById('menuContent');
  
  if (menuToggle && menuContent) {
    menuToggle.addEventListener('click', () => {
      menuContent.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });
  }

  // Navigation buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = e.target.getAttribute('data-page');
      if (page) {
        switchPage(page);
      }
    });
  });
}

function switchPage(page) {
  // Update navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.querySelector(`[data-page="${page}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // Hide all pages
  document.querySelectorAll('[id$="Page"]').forEach(pageEl => {
    pageEl.style.display = 'none';
  });

  // Show selected page
  const pageElement = document.getElementById(page + 'Page');
  if (pageElement) {
    pageElement.style.display = 'block';
    currentPage = page;
    
    // Load page-specific data
    switch (page) {
      case 'dashboard':
        loadDashboardData();
        break;
      case 'analytics':
        loadAnalyticsData();
        break;
      case 'blocker':
        loadBlockedSites();
        break;
      case 'goals':
        loadGoals();
        break;
      case 'notes':
        loadNotes();
        break;
      case 'calendar':
        loadReminders();
        break;
      case 'bookmarks':
        loadBookmarks();
        break;
    }
  }
}

// ========== USER STATS ==========
function loadUserStats() {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
    if (response) {
      const level = Math.floor(response.xp / 100) + 1;
      document.getElementById('level').textContent = level;
      document.getElementById('xp').textContent = response.xp || 0;
      document.getElementById('streak').textContent = response.streak || 0;
    }
  });
}

// ========== DASHBOARD ==========
function loadDashboardData() {
  // Load current day stats
  chrome.runtime.sendMessage({ type: 'getCurrentStats' }, (response) => {
    if (response && response.success) {
      const stats = response.data;
      updateDashboardStats(stats);
    }
  });

  // Load weekly data for charts
  chrome.runtime.sendMessage({ type: 'getDailyStats', days: 7 }, (response) => {
    if (response && response.success) {
      renderFocusChart(response.data);
      renderProductivityChart(response.data);
    }
  });

  // Load goals preview
  loadGoalsPreview();
}

function updateDashboardStats(stats) {
  const focusScore = stats.focusScore || 0;
  const totalTime = stats.totalTime || 0;
  const productiveTime = stats.productiveTime || 0;
  
  document.getElementById('focusScoreValue').textContent = focusScore + '%';
  document.getElementById('totalTimeValue').textContent = formatTime(totalTime);
  document.getElementById('productiveTimeValue').textContent = formatTime(productiveTime);
  
  // Update progress bar
  const progressBar = document.getElementById('focusProgressBar');
  if (progressBar) {
    progressBar.style.width = focusScore + '%';
  }

  // Update focus score color
  const focusScoreElement = document.getElementById('focusScoreValue');
  if (focusScoreElement) {
    focusScoreElement.className = 'stat-value focus-score ' + getScoreClass(focusScore);
  }
}

function renderFocusChart(dailyStats) {
  const chartContainer = document.getElementById('focusChart');
  const labelsContainer = document.getElementById('focusChartLabels');
  
  if (!chartContainer || !labelsContainer) return;

  const maxScore = Math.max(...dailyStats.map(d => d.focusScore), 1);
  
  chartContainer.innerHTML = dailyStats.map(day => {
    const height = Math.max(10, (day.focusScore / 100) * 100);
    const scoreClass = getScoreClass(day.focusScore);
    
    return `<div class="graph-bar ${scoreClass}" style="height: ${height}%" title="${day.focusScore}% focus score"></div>`;
  }).join('');

  labelsContainer.innerHTML = dailyStats.map(day => {
    const date = new Date(day.date);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }).join('');
}

function renderProductivityChart(dailyStats) {
  const chartContainer = document.getElementById('productivityChart');
  const labelsContainer = document.getElementById('productivityChartLabels');
  
  if (!chartContainer || !labelsContainer) return;

  const maxTime = Math.max(...dailyStats.map(d => d.totalTime), 1);
  
  chartContainer.innerHTML = dailyStats.map(day => {
    const totalHeight = Math.max(10, (day.totalTime / maxTime) * 100);
    const productiveHeight = day.totalTime > 0 ? (day.productiveTime / day.totalTime) * totalHeight : 0;
    const distractingHeight = day.totalTime > 0 ? (day.distractingTime / day.totalTime) * totalHeight : 0;
    const neutralHeight = totalHeight - productiveHeight - distractingHeight;
    
    return `
      <div class="productivity-bar" style="height: ${totalHeight}%">
        <div class="productivity-segment productive" style="height: ${productiveHeight}%"></div>
        <div class="productivity-segment distracting" style="height: ${distractingHeight}%"></div>
        <div class="productivity-segment neutral" style="height: ${neutralHeight}%"></div>
      </div>
    `;
  }).join('');

  labelsContainer.innerHTML = dailyStats.map(day => {
    const date = new Date(day.date);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }).join('');
}

function loadGoalsPreview() {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    const activeGoals = goals.filter(g => !g.completed).slice(0, 3);
    
    const container = document.getElementById('dashboardGoals');
    if (!container) return;

    if (activeGoals.length === 0) {
      container.innerHTML = '<div class="no-data">No active goals. Create some goals to track your progress!</div>';
      return;
    }

    container.innerHTML = activeGoals.map(goal => {
      const progress = Math.min(100, (goal.progress / goal.target) * 100);
      return `
        <div style="background: rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 15px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 600;">${goal.title}</span>
            <span style="font-size: 0.9em; opacity: 0.8;">${goal.progress}/${goal.target}</span>
          </div>
          <div style="background: rgba(255, 255, 255, 0.2); border-radius: 10px; height: 6px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #4ade80, #22d3ee); height: 100%; width: ${progress}%; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;
    }).join('');
  });
}

// ========== ANALYTICS ==========
function loadAnalyticsData() {
  chrome.runtime.sendMessage({ type: 'getTabData' }, (response) => {
    if (response && response.success) {
      renderVisitedSites(response.data);
      updateSitesVisitedCount(response.data.length);
    }
  });

  // Get current tab info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      renderCurrentTab(tabs[0]);
    }
  });
}

function renderVisitedSites(sites) {
  const container = document.getElementById('visitedSitesList');
  if (!container) return;

  if (sites.length === 0) {
    container.innerHTML = '<div class="no-data">No sites tracked yet today. Start browsing to see analytics!</div>';
    return;
  }

  const sortedSites = sites.sort((a, b) => b.timeSpent - a.timeSpent).slice(0, 10);
  
  container.innerHTML = sortedSites.map(site => `
    <div class="site-item">
      <div class="site-info">
        <div class="site-dot ${site.category}"></div>
        <div class="site-name">${site.domain}</div>
      </div>
      <div class="site-time">${formatTime(site.timeSpent)}</div>
    </div>
  `).join('');
}

function renderCurrentTab(tab) {
  const container = document.getElementById('currentTabSection');
  if (!container) return;

  const domain = extractDomain(tab.url);
  const category = classifySite(domain);
  
  container.innerHTML = `
    <div class="current-tab">
      <h3>Current Tab</h3>
      <div class="tab-info">
        <div class="tab-icon ${category}"></div>
        <div class="tab-details">
          <div class="tab-title">${tab.title}</div>
          <div class="tab-domain">${domain} • ${category}</div>
        </div>
      </div>
    </div>
  `;
}

function updateSitesVisitedCount(count) {
  const element = document.getElementById('sitesVisitedValue');
  if (element) {
    element.textContent = count;
  }
}

function refreshAnalyticsData() {
  const btn = document.getElementById('refreshDataBtn');
  if (btn) {
    btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
    btn.disabled = true;
  }

  chrome.runtime.sendMessage({ type: 'saveData' }, () => {
    setTimeout(() => {
      loadAnalyticsData();
      if (btn) {
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        btn.disabled = false;
      }
    }, 1000);
  });
}

function resetDailyData() {
  if (confirm('Are you sure you want to reset today\'s data? This action cannot be undone.')) {
    chrome.runtime.sendMessage({ type: 'forceReset' }, () => {
      setTimeout(() => {
        loadDashboardData();
        loadAnalyticsData();
      }, 500);
    });
  }
}

// ========== FOCUS SESSION ==========
function startFocusSession() {
  const additionalSites = [
    'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'reddit.com',
    'tiktok.com', 'snapchat.com', 'discord.com', 'twitch.tv', 'netflix.com'
  ];

  chrome.runtime.sendMessage({
    type: 'START_FOCUS_SESSION',
    additionalSites: additionalSites
  }, (response) => {
    if (response && response.status === 'focus session started') {
      document.getElementById('startFocusBtn').style.display = 'none';
      document.getElementById('stopFocusBtn').style.display = 'inline-block';
      
      focusStartTime = Date.now();
      startFocusTimer();
    }
  });
}

function endFocusSession() {
  chrome.runtime.sendMessage({ type: 'END_FOCUS_SESSION' }, (response) => {
    if (response) {
      document.getElementById('startFocusBtn').style.display = 'inline-block';
      document.getElementById('stopFocusBtn').style.display = 'none';
      
      stopFocusTimer();
      
      if (response.xpEarned) {
        showNotification(`Focus session completed! Earned ${response.xpEarned} XP!`, 'success');
        loadUserStats(); // Refresh XP display
      }
    }
  });
}

function startFocusTimer() {
  updateTimerDisplay();
  focusTimer = setInterval(updateTimerDisplay, 1000);
}

function stopFocusTimer() {
  if (focusTimer) {
    clearInterval(focusTimer);
    focusTimer = null;
  }
  document.getElementById('timerDisplay').textContent = focusDuration + ':00';
}

function updateTimerDisplay() {
  if (!focusStartTime) return;
  
  const elapsed = Math.floor((Date.now() - focusStartTime) / 1000);
  const totalSeconds = focusDuration * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);
  
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  
  document.getElementById('timerDisplay').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  if (remaining === 0) {
    endFocusSession();
  }
}

// ========== SITE BLOCKER ==========
function loadBlockedSites() {
  chrome.storage.local.get(['blockedSites'], (result) => {
    const sites = result.blockedSites || [];
    renderBlockedSites(sites);
  });
  
  renderCommonSites();
}

function renderBlockedSites(sites) {
  const container = document.getElementById('blockedSitesList');
  if (!container) return;

  if (sites.length === 0) {
    container.innerHTML = '<div class="no-data">No sites blocked yet. Add some distracting sites to block!</div>';
    return;
  }

  container.innerHTML = sites.map(site => `
    <div class="site-item-blocker">
      <span>${site}</span>
      <button class="remove-btn" onclick="removeBlockedSite('${site}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function renderCommonSites() {
  const commonSites = [
    'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'reddit.com',
    'tiktok.com', 'snapchat.com', 'discord.com', 'twitch.tv', 'netflix.com',
    'amazon.com', 'ebay.com', 'pinterest.com', 'buzzfeed.com', '9gag.com'
  ];

  const container = document.getElementById('commonSitesList');
  if (!container) return;

  container.innerHTML = commonSites.map(site => `
    <div class="common-site-item">
      <span>${site}</span>
      <button class="add-common-btn" onclick="addCommonSite('${site}')">
        <i class="fas fa-plus"></i>
      </button>
    </div>
  `).join('');
}

function addBlockedSite() {
  const input = document.getElementById('siteInput');
  const site = input.value.trim();
  
  if (!site) return;
  
  chrome.storage.local.get(['blockedSites'], (result) => {
    const sites = result.blockedSites || [];
    if (!sites.includes(site)) {
      sites.push(site);
      chrome.storage.local.set({ blockedSites: sites });
      chrome.runtime.sendMessage({ type: 'UPDATE_BLOCKED_SITES', sites: sites });
      renderBlockedSites(sites);
      input.value = '';
    }
  });
}

function removeBlockedSite(site) {
  chrome.storage.local.get(['blockedSites'], (result) => {
    const sites = result.blockedSites || [];
    const updatedSites = sites.filter(s => s !== site);
    chrome.storage.local.set({ blockedSites: updatedSites });
    chrome.runtime.sendMessage({ type: 'UPDATE_BLOCKED_SITES', sites: updatedSites });
    renderBlockedSites(updatedSites);
  });
}

function addCommonSite(site) {
  chrome.storage.local.get(['blockedSites'], (result) => {
    const sites = result.blockedSites || [];
    if (!sites.includes(site)) {
      sites.push(site);
      chrome.storage.local.set({ blockedSites: sites });
      chrome.runtime.sendMessage({ type: 'UPDATE_BLOCKED_SITES', sites: sites });
      renderBlockedSites(sites);
    }
  });
}

// ========== GOALS ==========
function loadGoals() {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    renderGoals(goals);
  });
}

function renderGoals(goals) {
  const container = document.getElementById('goalsList');
  if (!container) return;

  if (goals.length === 0) {
    container.innerHTML = '<div class="no-data">No goals set yet. Create your first goal above!</div>';
    return;
  }

  container.innerHTML = goals.map(goal => {
    const progress = Math.min(100, (goal.progress / goal.target) * 100);
    return `
      <div class="goal-item">
        <div class="goal-header">
          <div class="goal-title">${goal.title}</div>
          <div class="goal-category">${goal.category}</div>
        </div>
        <div class="goal-progress">
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="goal-progress-text">${goal.progress}/${goal.target} ${goal.description || ''}</div>
        </div>
        <div class="goal-actions">
          <button class="btn goal-btn" onclick="updateGoalProgress('${goal.id}', 1)">
            <i class="fas fa-plus"></i> +1
          </button>
          <button class="btn goal-btn complete" onclick="completeGoal('${goal.id}')">
            <i class="fas fa-check"></i> Complete
          </button>
          <button class="btn goal-btn delete" onclick="deleteGoal('${goal.id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function addGoal() {
  const title = document.getElementById('goalTitle').value.trim();
  const description = document.getElementById('goalDescription').value.trim();
  const category = document.getElementById('goalCategory').value;
  const target = parseInt(document.getElementById('goalTarget').value);

  if (!title || !target || target <= 0) {
    showNotification('Please enter a valid title and target', 'error');
    return;
  }

  const goal = {
    id: Date.now().toString(),
    title: title,
    description: description,
    category: category,
    target: target,
    progress: 0,
    completed: false,
    createdAt: new Date().toISOString()
  };

  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    goals.push(goal);
    chrome.storage.local.set({ goals: goals });
    renderGoals(goals);
    
    // Clear form
    document.getElementById('goalTitle').value = '';
    document.getElementById('goalDescription').value = '';
    document.getElementById('goalTarget').value = '';
    
    showNotification('Goal added successfully!', 'success');
  });
}

function updateGoalProgress(goalId, increment) {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    const goalIndex = goals.findIndex(g => g.id === goalId);
    
    if (goalIndex !== -1) {
      goals[goalIndex].progress += increment;
      goals[goalIndex].progress = Math.max(0, goals[goalIndex].progress);
      
      if (goals[goalIndex].progress >= goals[goalIndex].target) {
        goals[goalIndex].completed = true;
        goals[goalIndex].completedAt = new Date().toISOString();
        
        // Award XP
        chrome.runtime.sendMessage({ type: 'UPDATE_XP', amount: 25 });
        showNotification('Goal completed! Earned 25 XP!', 'success');
        loadUserStats();
      }
      
      chrome.storage.local.set({ goals: goals });
      renderGoals(goals);
    }
  });
}

function completeGoal(goalId) {
  chrome.storage.local.get(['goals'], (result) => {
    const goals = result.goals || [];
    const goalIndex = goals.findIndex(g => g.id === goalId);
    
    if (goalIndex !== -1) {
      goals[goalIndex].completed = true;
      goals[goalIndex].completedAt = new Date().toISOString();
      goals[goalIndex].progress = goals[goalIndex].target;
      
      chrome.storage.local.set({ goals: goals });
      renderGoals(goals);
      
      // Award XP
      chrome.runtime.sendMessage({ type: 'UPDATE_XP', amount: 25 });
      showNotification('Goal completed! Earned 25 XP!', 'success');
      loadUserStats();
    }
  });
}

function deleteGoal(goalId) {
  if (confirm('Are you sure you want to delete this goal?')) {
    chrome.storage.local.get(['goals'], (result) => {
      const goals = result.goals || [];
      const updatedGoals = goals.filter(g => g.id !== goalId);
      chrome.storage.local.set({ goals: updatedGoals });
      renderGoals(updatedGoals);
      showNotification('Goal deleted', 'success');
    });
  }
}

// ========== NOTES ==========
function loadNotes() {
  chrome.storage.local.get(['notes'], (result) => {
    const notes = result.notes || [];
    renderNotes(notes);
  });
}

function renderNotes(notes) {
  const container = document.getElementById('notesList');
  if (!container) return;

  if (notes.length === 0) {
    container.innerHTML = '<div class="no-data">No notes yet. Write your first note above!</div>';
    return;
  }

  const sortedNotes = notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  container.innerHTML = sortedNotes.map(note => `
    <div class="note-item">
      <div class="note-header">
        <span class="note-date">${new Date(note.createdAt).toLocaleDateString()}</span>
        <button class="btn btn-small btn-danger" onclick="deleteNote('${note.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="note-content">${note.content}</div>
    </div>
  `).join('');
}

function saveNote() {
  const content = document.getElementById('noteTextarea').value.trim();
  
  if (!content) {
    showNotification('Please enter some content', 'error');
    return;
  }

  const note = {
    id: Date.now().toString(),
    content: content,
    createdAt: new Date().toISOString()
  };

  chrome.storage.local.get(['notes'], (result) => {
    const notes = result.notes || [];
    notes.push(note);
    chrome.storage.local.set({ notes: notes });
    renderNotes(notes);
    
    document.getElementById('noteTextarea').value = '';
    showNotification('Note saved!', 'success');
  });
}

function deleteNote(noteId) {
  if (confirm('Are you sure you want to delete this note?')) {
    chrome.storage.local.get(['notes'], (result) => {
      const notes = result.notes || [];
      const updatedNotes = notes.filter(n => n.id !== noteId);
      chrome.storage.local.set({ notes: updatedNotes });
      renderNotes(updatedNotes);
      showNotification('Note deleted', 'success');
    });
  }
}

// ========== CALENDAR/REMINDERS ==========
function loadReminders() {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    renderReminders(reminders);
  });
}

function renderReminders(reminders) {
  const container = document.getElementById('remindersList');
  if (!container) return;

  if (reminders.length === 0) {
    container.innerHTML = '<div class="no-data">No reminders set. Create your first reminder above!</div>';
    return;
  }

  const sortedReminders = reminders.sort((a, b) => new Date(a.reminderDateTime) - new Date(b.reminderDateTime));
  
  container.innerHTML = sortedReminders.map(reminder => {
    const reminderTime = new Date(reminder.reminderDateTime);
    const now = new Date();
    const isOverdue = reminderTime < now && !reminder.completed;
    const isUpcoming = reminderTime > now && reminderTime < new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return `
      <div class="reminder-item ${isOverdue ? 'overdue' : isUpcoming ? 'upcoming' : ''}">
        <div class="reminder-header">
          <div class="reminder-title">${reminder.title}</div>
          <div class="reminder-category">${reminder.category}</div>
        </div>
        <div class="reminder-datetime">
          ${reminderTime.toLocaleDateString()} at ${reminderTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
        ${reminder.description ? `<div class="reminder-description">${reminder.description}</div>` : ''}
        <div class="reminder-actions">
          <button class="btn reminder-btn complete" onclick="completeReminder('${reminder.id}')">
            <i class="fas fa-check"></i> Complete
          </button>
          <button class="btn reminder-btn delete" onclick="deleteReminder('${reminder.id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function addReminder() {
  const title = document.getElementById('reminderTitle').value.trim();
  const description = document.getElementById('reminderDescription').value.trim();
  const date = document.getElementById('reminderDate').value;
  const time = document.getElementById('reminderTime').value;
  const category = document.getElementById('reminderCategory').value;

  if (!title || !date || !time) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }

  const reminderDateTime = new Date(`${date}T${time}`);
  
  if (reminderDateTime <= new Date()) {
    showNotification('Please select a future date and time', 'error');
    return;
  }

  const reminder = {
    id: Date.now().toString(),
    title: title,
    description: description,
    reminderDateTime: reminderDateTime.toISOString(),
    category: category,
    completed: false,
    notified: false,
    createdAt: new Date().toISOString()
  };

  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    reminders.push(reminder);
    chrome.storage.local.set({ reminders: reminders });
    renderReminders(reminders);
    
    // Set alarm for reminder
    chrome.runtime.sendMessage({ type: 'SET_REMINDER_ALARM', reminder: reminder });
    
    // Clear form
    document.getElementById('reminderTitle').value = '';
    document.getElementById('reminderDescription').value = '';
    document.getElementById('reminderDate').value = '';
    document.getElementById('reminderTime').value = '';
    
    showNotification('Reminder added successfully!', 'success');
  });
}

function completeReminder(reminderId) {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    const reminderIndex = reminders.findIndex(r => r.id === reminderId);
    
    if (reminderIndex !== -1) {
      reminders[reminderIndex].completed = true;
      reminders[reminderIndex].completedAt = new Date().toISOString();
      
      chrome.storage.local.set({ reminders: reminders });
      renderReminders(reminders);
      
      // Award XP
      chrome.runtime.sendMessage({ type: 'UPDATE_XP', amount: 10 });
      showNotification('Reminder completed! Earned 10 XP!', 'success');
      loadUserStats();
    }
  });
}

function deleteReminder(reminderId) {
  if (confirm('Are you sure you want to delete this reminder?')) {
    chrome.storage.local.get(['reminders'], (result) => {
      const reminders = result.reminders || [];
      const updatedReminders = reminders.filter(r => r.id !== reminderId);
      chrome.storage.local.set({ reminders: updatedReminders });
      renderReminders(updatedReminders);
      showNotification('Reminder deleted', 'success');
    });
  }
}

// ========== BOOKMARKS ==========
function loadBookmarks() {
  chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' }, (response) => {
    if (response && response.bookmarks) {
      renderBookmarks(response.bookmarks);
      updateBookmarkStats(response.bookmarks);
    }
  });
}

function renderBookmarks(bookmarks) {
  const container = document.getElementById('bookmarksList');
  if (!container) return;

  if (bookmarks.length === 0) {
    container.innerHTML = '<div class="no-data">No bookmarks yet. Browse productive sites for 30+ minutes to auto-bookmark them!</div>';
    return;
  }

  // Sort by time spent and show top 5
  const topBookmarks = bookmarks
    .sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0))
    .slice(0, 5);

  container.innerHTML = topBookmarks.map(bookmark => `
    <div class="bookmark-item">
      <div class="bookmark-info">
        <div class="bookmark-favicon">
          <img src="${bookmark.favicon}" alt="" onerror="this.style.display='none'; this.parentNode.innerHTML='🔖';">
        </div>
        <div class="bookmark-details">
          <div class="bookmark-title">${bookmark.title}</div>
          <div class="bookmark-url">${bookmark.domain}</div>
        </div>
      </div>
      <div class="bookmark-meta">
        <div class="bookmark-time">${formatTime(bookmark.timeSpent || 0)}</div>
        <div class="bookmark-category">${bookmark.category}</div>
      </div>
    </div>
  `).join('');
}

function updateBookmarkStats(bookmarks) {
  const totalBookmarks = document.getElementById('totalBookmarks');
  const newBookmarks = document.getElementById('newBookmarks');
  
  if (totalBookmarks) {
    totalBookmarks.textContent = bookmarks.length;
  }
  
  if (newBookmarks) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentBookmarks = bookmarks.filter(b => new Date(b.addedAt) > weekAgo);
    newBookmarks.textContent = recentBookmarks.length;
  }
}

function addCustomBookmark() {
  const title = document.getElementById('customBookmarkTitle').value.trim();
  const url = document.getElementById('customBookmarkUrl').value.trim();
  const category = document.getElementById('customBookmarkCategory').value;

  if (!title || !url) {
    showNotification('Please enter both title and URL', 'error');
    return;
  }

  if (!isValidUrl(url)) {
    showNotification('Please enter a valid URL', 'error');
    return;
  }

  chrome.runtime.sendMessage({
    type: 'ADD_CUSTOM_BOOKMARK',
    title: title,
    url: url,
    category: category
  }, (response) => {
    if (response && response.status === 'bookmark added') {
      loadBookmarks();
      
      // Clear form
      document.getElementById('customBookmarkTitle').value = '';
      document.getElementById('customBookmarkUrl').value = '';
      document.getElementById('customBookmarkCategory').value = 'learning';
      
      showNotification('Bookmark added successfully!', 'success');
    } else {
      showNotification('Failed to add bookmark', 'error');
    }
  });
}

function refreshBookmarks() {
  const btn = document.getElementById('refreshBookmarksBtn');
  if (btn) {
    btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
    btn.disabled = true;
  }

  chrome.runtime.sendMessage({ type: 'UPDATE_BOOKMARKS' }, () => {
    setTimeout(() => {
      loadBookmarks();
      if (btn) {
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Bookmarks';
        btn.disabled = false;
      }
      showNotification('Bookmarks refreshed!', 'success');
    }, 1000);
  });
}

function exportBookmarks() {
  chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' }, (response) => {
    if (response && response.bookmarks) {
      const exportData = {
        bookmarks: response.bookmarks,
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
      
      showNotification('Bookmarks exported successfully!', 'success');
    }
  });
}

function importBookmarks(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
        throw new Error('Invalid bookmark file format');
      }

      // Import bookmarks one by one
      let importedCount = 0;
      const importPromises = data.bookmarks.map(bookmark => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'ADD_CUSTOM_BOOKMARK',
            title: bookmark.title,
            url: bookmark.url,
            category: bookmark.category || 'learning'
          }, (response) => {
            if (response && response.status === 'bookmark added') {
              importedCount++;
            }
            resolve();
          });
        });
      });

      Promise.all(importPromises).then(() => {
        loadBookmarks();
        showNotification(`Imported ${importedCount} bookmarks!`, 'success');
      });
      
    } catch (error) {
      console.error('Error importing bookmarks:', error);
      showNotification('Failed to import bookmarks. Please check the file format.', 'error');
    }
  };
  
  reader.readAsText(file);
  
  // Reset file input
  document.getElementById('importFileInput').value = '';
}

// ========== ALERTS ==========
function renderAlerts() {
  const alertList = document.getElementById('alertList');
  if (!alertList) return;

  // Get current tab to check if it's distracting
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      const domain = extractDomain(tabs[0].url);
      const category = classifySite(domain);
      
      const alerts = [];
      
      if (category === 'distracting') {
        alerts.push({
          type: 'warning',
          message: `You're on a distracting site: ${domain}`,
          action: 'Start Focus Session',
          actionFn: () => {
            switchPage('focus');
            startFocusSession();
          }
        });
      }
      
      // Check for due reminders
      chrome.storage.local.get(['reminders'], (result) => {
        const reminders = result.reminders || [];
        const now = new Date();
        const dueReminders = reminders.filter(r => 
          !r.completed && 
          new Date(r.reminderDateTime) <= now &&
          new Date(r.reminderDateTime) > new Date(now.getTime() - 60 * 60 * 1000) // Within last hour
        );
        
        dueReminders.forEach(reminder => {
          alerts.push({
            type: 'info',
            message: `Reminder: ${reminder.title}`,
            action: 'View Calendar',
            actionFn: () => switchPage('calendar')
          });
        });
        
        renderAlertsList(alerts);
      });
    } else {
      renderAlertsList([]);
    }
  });
}

function renderAlertsList(alerts) {
  const alertList = document.getElementById('alertList');
  if (!alertList) return;

  if (alerts.length === 0) {
    alertList.innerHTML = '<div class="no-data">No alerts at the moment. Keep up the good work! 🎉</div>';
    return;
  }

  alertList.innerHTML = alerts.map((alert, index) => `
    <button class="alert-btn" onclick="handleAlertAction(${index})">
      ${alert.message} - ${alert.action}
    </button>
  `).join('');
  
  // Store alerts for action handling
  window.currentAlerts = alerts;
}

function handleAlertAction(index) {
  if (window.currentAlerts && window.currentAlerts[index]) {
    window.currentAlerts[index].actionFn();
  }
}

// ========== UTILITY FUNCTIONS ==========
function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function getScoreClass(score) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return 'unknown';
  }
}

function classifySite(domain) {
  const productiveSites = [
    'khanacademy.org', 'coursera.org', 'edx.org', 'udemy.com', 'github.com',
    'stackoverflow.com', 'mdn.mozilla.org', 'w3schools.com', 'scholar.google.com',
    'wikipedia.org', 'britannica.com', 'ted.com', 'brilliant.org'
  ];

  const distractingSites = [
    'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'reddit.com',
    'tiktok.com', 'snapchat.com', 'discord.com', 'twitch.tv', 'netflix.com'
  ];

  const cleanDomain = domain.toLowerCase();
  
  if (productiveSites.some(site => cleanDomain.includes(site) || site.includes(cleanDomain))) {
    return 'productive';
  } else if (distractingSites.some(site => cleanDomain.includes(site) || site.includes(cleanDomain))) {
    return 'distracting';
  } else {
    return 'neutral';
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function showNotification(message, type = 'info') {
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

// ========== GLOBAL FUNCTIONS FOR ONCLICK HANDLERS ==========
window.removeBlockedSite = removeBlockedSite;
window.addCommonSite = addCommonSite;
window.updateGoalProgress = updateGoalProgress;
window.completeGoal = completeGoal;
window.deleteGoal = deleteGoal;
window.deleteNote = deleteNote;
window.completeReminder = completeReminder;
window.deleteReminder = deleteReminder;
window.handleAlertAction = handleAlertAction;