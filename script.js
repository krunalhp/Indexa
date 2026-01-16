/**
 * Bookmark Manager Application
 * A modern bookmark manager with Chrome import, tag management, and local storage
 */

// ===== DATA MODEL =====
class BookmarkManager {
  constructor() {
    this.bookmarks = [];
    this.tags = [];
    this.selectedBookmarks = new Set();
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.sortOrder = 'dateDesc';
    this.bulkMode = false;

    this.init();
  }

  init() {
    this.loadFromStorage();
    this.bindEvents();
    this.render();
  }

  // ===== LOCAL STORAGE =====
  loadFromStorage() {
    try {
      const data = localStorage.getItem('bookmarkManagerData');
      if (data) {
        const parsed = JSON.parse(data);
        this.bookmarks = parsed.bookmarks || [];
        this.tags = parsed.tags || [];
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
      this.showToast('Failed to load saved data', 'error');
    }
  }

  saveToStorage() {
    try {
      const data = JSON.stringify({
        bookmarks: this.bookmarks,
        tags: this.tags,
        lastUpdated: new Date().toISOString()
      });
      localStorage.setItem('bookmarkManagerData', data);
    } catch (e) {
      console.error('Failed to save to storage:', e);
      this.showToast('Failed to save data', 'error');
    }
  }

  // ===== BOOKMARK CRUD =====
  addBookmark(bookmark) {
    const newBookmark = {
      id: this.generateId(),
      title: bookmark.title,
      url: bookmark.url,
      tags: bookmark.tags || [],
      notes: bookmark.notes || '',
      favicon: this.getFaviconUrl(bookmark.url),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.bookmarks.push(newBookmark);
    this.saveToStorage();
    this.render();
    return newBookmark;
  }

  updateBookmark(id, updates) {
    const index = this.bookmarks.findIndex(b => b.id === id);
    if (index !== -1) {
      this.bookmarks[index] = {
        ...this.bookmarks[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      if (updates.url && updates.url !== this.bookmarks[index].url) {
        this.bookmarks[index].favicon = this.getFaviconUrl(updates.url);
      }
      this.saveToStorage();
      this.render();
      return this.bookmarks[index];
    }
    return null;
  }

  deleteBookmark(id) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    this.selectedBookmarks.delete(id);
    this.saveToStorage();
    this.render();
  }

  deleteMultipleBookmarks(ids) {
    this.bookmarks = this.bookmarks.filter(b => !ids.includes(b.id));
    ids.forEach(id => this.selectedBookmarks.delete(id));
    this.saveToStorage();
    this.render();
  }

  getBookmark(id) {
    return this.bookmarks.find(b => b.id === id);
  }

  // ===== TAG CRUD =====
  addTag(tag) {
    const newTag = {
      id: this.generateId(),
      name: tag.name,
      color: tag.color || '#6b7280',
      createdAt: new Date().toISOString()
    };
    this.tags.push(newTag);
    this.saveToStorage();
    this.renderSidebar();
    return newTag;
  }

  updateTag(id, updates) {
    const index = this.tags.findIndex(t => t.id === id);
    if (index !== -1) {
      this.tags[index] = { ...this.tags[index], ...updates };
      this.saveToStorage();
      this.render();
      return this.tags[index];
    }
    return null;
  }

  deleteTag(id) {
    // Remove tag from all bookmarks
    this.bookmarks.forEach(bookmark => {
      bookmark.tags = bookmark.tags.filter(tagId => tagId !== id);
    });
    this.tags = this.tags.filter(t => t.id !== id);
    this.saveToStorage();
    this.render();
  }

  getTag(id) {
    return this.tags.find(t => t.id === id);
  }

  // ===== BULK OPERATIONS =====
  assignTagsToBookmarks(bookmarkIds, tagIds) {
    bookmarkIds.forEach(bookmarkId => {
      const bookmark = this.getBookmark(bookmarkId);
      if (bookmark) {
        const existingTags = new Set(bookmark.tags);
        tagIds.forEach(tagId => existingTags.add(tagId));
        bookmark.tags = Array.from(existingTags);
        bookmark.updatedAt = new Date().toISOString();
      }
    });
    this.saveToStorage();
    this.render();
  }

  // ===== AUTO-CATEGORIZATION =====

  // Domain to category mapping
  getCategoryRules() {
    return {
      // Development & Tech
      'Development': {
        domains: ['github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'stackexchange.com',
          'developer.mozilla.org', 'npmjs.com', 'pypi.org', 'rubygems.org', 'docker.com',
          'codepen.io', 'jsfiddle.net', 'codesandbox.io', 'replit.com', 'vercel.com',
          'netlify.com', 'heroku.com', 'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com',
          'digitalocean.com', 'dev.to', 'hashnode.com', 'medium.com/tag/programming'],
        keywords: ['github', 'code', 'programming', 'developer', 'api', 'sdk', 'documentation', 'docs',
          'tutorial', 'javascript', 'python', 'react', 'vue', 'angular', 'node', 'typescript'],
        color: '#22c55e'
      },
      // Social Media
      'Social': {
        domains: ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com',
          'reddit.com', 'pinterest.com', 'tumblr.com', 'tiktok.com', 'snapchat.com',
          'discord.com', 'slack.com', 'telegram.org', 'whatsapp.com', 'threads.net'],
        keywords: ['social', 'profile', 'feed', 'post', 'share', 'friend', 'follow'],
        color: '#3b82f6'
      },
      // Entertainment
      'Entertainment': {
        domains: ['youtube.com', 'youtu.be', 'netflix.com', 'hulu.com', 'disneyplus.com',
          'primevideo.com', 'hbomax.com', 'twitch.tv', 'spotify.com', 'soundcloud.com',
          'vimeo.com', 'dailymotion.com', 'crunchyroll.com', 'funimation.com'],
        keywords: ['video', 'movie', 'film', 'music', 'song', 'stream', 'watch', 'listen', 'entertainment'],
        color: '#ec4899'
      },
      // News & Media
      'News': {
        domains: ['news.google.com', 'cnn.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com',
          'theguardian.com', 'reuters.com', 'apnews.com', 'bloomberg.com', 'wsj.com',
          'techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com', 'engadget.com',
          'mashable.com', 'gizmodo.com', 'cnet.com', 'zdnet.com'],
        keywords: ['news', 'breaking', 'headline', 'report', 'article', 'journal'],
        color: '#f97316'
      },
      // Shopping
      'Shopping': {
        domains: ['amazon.com', 'amazon.in', 'ebay.com', 'walmart.com', 'target.com',
          'etsy.com', 'aliexpress.com', 'shopify.com', 'flipkart.com', 'myntra.com',
          'bestbuy.com', 'newegg.com', 'ikea.com', 'wayfair.com', 'zappos.com'],
        keywords: ['shop', 'buy', 'cart', 'price', 'deal', 'discount', 'sale', 'product', 'order'],
        color: '#eab308'
      },
      // Education & Learning
      'Learning': {
        domains: ['coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'skillshare.com',
          'linkedin.com/learning', 'pluralsight.com', 'codecademy.com', 'freecodecamp.org',
          'udacity.com', 'duolingo.com', 'brilliant.org', 'masterclass.com', 'ted.com',
          'wikipedia.org', 'wikihow.com', 'quora.com'],
        keywords: ['learn', 'course', 'tutorial', 'lesson', 'education', 'study', 'training', 'class'],
        color: '#8b5cf6'
      },
      // Finance
      'Finance': {
        domains: ['paypal.com', 'stripe.com', 'venmo.com', 'mint.com', 'robinhood.com',
          'coinbase.com', 'binance.com', 'chase.com', 'bankofamerica.com', 'wellsfargo.com',
          'fidelity.com', 'vanguard.com', 'schwab.com', 'etrade.com', 'tradingview.com',
          'yahoo.com/finance', 'finance.google.com', 'investopedia.com'],
        keywords: ['bank', 'finance', 'money', 'invest', 'stock', 'crypto', 'payment', 'trade', 'portfolio'],
        color: '#14b8a6'
      },
      // Productivity & Tools
      'Tools': {
        domains: ['notion.so', 'trello.com', 'asana.com', 'monday.com', 'todoist.com',
          'evernote.com', 'airtable.com', 'miro.com', 'figma.com', 'canva.com',
          'drive.google.com', 'docs.google.com', 'dropbox.com', 'box.com', 'onedrive.com',
          'zoom.us', 'meet.google.com', 'teams.microsoft.com', 'calendly.com'],
        keywords: ['tool', 'app', 'productivity', 'organize', 'manage', 'workspace', 'collaborate'],
        color: '#6b7280'
      },
      // Gaming
      'Gaming': {
        domains: ['steampowered.com', 'store.steampowered.com', 'epicgames.com', 'gog.com',
          'playstation.com', 'xbox.com', 'nintendo.com', 'itch.io', 'humble bundle.com',
          'ign.com', 'gamespot.com', 'kotaku.com', 'polygon.com', 'pcgamer.com'],
        keywords: ['game', 'gaming', 'play', 'steam', 'ps5', 'xbox', 'nintendo', 'esports'],
        color: '#ef4444'
      },
      // Travel
      'Travel': {
        domains: ['booking.com', 'airbnb.com', 'expedia.com', 'tripadvisor.com', 'kayak.com',
          'hotels.com', 'skyscanner.com', 'google.com/travel', 'maps.google.com',
          'uber.com', 'lyft.com', 'ola.com', 'makemytrip.com', 'goibibo.com'],
        keywords: ['travel', 'flight', 'hotel', 'vacation', 'trip', 'booking', 'destination', 'tour'],
        color: '#06b6d4'
      }
    };
  }

  categorizeBookmark(bookmark) {
    const rules = this.getCategoryRules();
    let bestMatch = null;
    let bestScore = 0;

    try {
      const url = new URL(bookmark.url);
      const domain = url.hostname.replace('www.', '');
      const titleLower = bookmark.title.toLowerCase();
      const urlLower = bookmark.url.toLowerCase();

      for (const [category, rule] of Object.entries(rules)) {
        let score = 0;

        // Check domain match (highest priority)
        if (rule.domains.some(d => domain.includes(d) || d.includes(domain))) {
          score += 10;
        }

        // Check subdomain/path matches
        if (rule.domains.some(d => urlLower.includes(d))) {
          score += 5;
        }

        // Check keyword matches in title
        rule.keywords.forEach(keyword => {
          if (titleLower.includes(keyword.toLowerCase())) {
            score += 2;
          }
        });

        // Check keyword matches in URL
        rule.keywords.forEach(keyword => {
          if (urlLower.includes(keyword.toLowerCase())) {
            score += 1;
          }
        });

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { category, color: rule.color };
        }
      }
    } catch (e) {
      console.error('Error categorizing bookmark:', e);
    }

    return bestScore >= 2 ? bestMatch : null;
  }

  autoCategorizeBookmarks() {
    const uncategorized = this.bookmarks.filter(b => b.tags.length === 0);

    if (uncategorized.length === 0) {
      this.showToast('All bookmarks already have tags!', 'info');
      return { categorized: 0, newTags: 0 };
    }

    const categoryAssignments = new Map(); // category -> bookmark ids
    const existingTagsByName = new Map(); // lowercase name -> tag

    // Build map of existing tags
    this.tags.forEach(tag => {
      existingTagsByName.set(tag.name.toLowerCase(), tag);
    });

    // Analyze each uncategorized bookmark
    uncategorized.forEach(bookmark => {
      const match = this.categorizeBookmark(bookmark);
      if (match) {
        if (!categoryAssignments.has(match.category)) {
          categoryAssignments.set(match.category, { bookmarkIds: [], color: match.color });
        }
        categoryAssignments.get(match.category).bookmarkIds.push(bookmark.id);
      }
    });

    let categorizedCount = 0;
    let newTagsCount = 0;

    // Create tags and assign bookmarks
    categoryAssignments.forEach((data, categoryName) => {
      let tag = existingTagsByName.get(categoryName.toLowerCase());

      // Create new tag if doesn't exist
      if (!tag) {
        tag = this.addTag({ name: categoryName, color: data.color });
        newTagsCount++;
        existingTagsByName.set(categoryName.toLowerCase(), tag);
      }

      // Assign tag to bookmarks
      data.bookmarkIds.forEach(bookmarkId => {
        const bookmark = this.getBookmark(bookmarkId);
        if (bookmark && !bookmark.tags.includes(tag.id)) {
          bookmark.tags.push(tag.id);
          bookmark.updatedAt = new Date().toISOString();
          categorizedCount++;
        }
      });
    });

    this.saveToStorage();
    this.render();

    const remaining = uncategorized.length - categorizedCount;
    this.showToast(
      `Auto-categorized ${categorizedCount} bookmarks into ${categoryAssignments.size} categories. ` +
      `${newTagsCount} new tags created.` +
      (remaining > 0 ? ` ${remaining} bookmarks could not be categorized.` : ''),
      'success'
    );

    return { categorized: categorizedCount, newTags: newTagsCount, remaining };
  }

  toggleBookmarkSelection(id) {
    if (this.selectedBookmarks.has(id)) {
      this.selectedBookmarks.delete(id);
    } else {
      this.selectedBookmarks.add(id);
    }
    this.updateBulkUI();
    this.renderBookmarks();
  }

  selectAllVisible() {
    const filtered = this.getFilteredBookmarks();
    filtered.forEach(b => this.selectedBookmarks.add(b.id));
    this.updateBulkUI();
    this.renderBookmarks();
  }

  deselectAll() {
    this.selectedBookmarks.clear();
    this.updateBulkUI();
    this.renderBookmarks();
  }

  // ===== CHROME IMPORT =====
  parseChromeBookmarks(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const bookmarks = [];
    const folderStack = [];

    const processNode = (node) => {
      if (node.nodeName === 'DT') {
        const child = node.firstElementChild;
        if (child) {
          if (child.nodeName === 'H3') {
            // This is a folder
            folderStack.push(child.textContent.trim());
          } else if (child.nodeName === 'A') {
            // This is a bookmark
            const title = child.textContent.trim();
            const url = child.getAttribute('href');
            const addDate = child.getAttribute('add_date');

            if (url && url.startsWith('http')) {
              bookmarks.push({
                title: title || url,
                url: url,
                folder: folderStack.length > 0 ? folderStack[folderStack.length - 1] : null,
                folderPath: [...folderStack],
                addedDate: addDate ? new Date(parseInt(addDate) * 1000).toISOString() : null
              });
            }
          }
        }
      } else if (node.nodeName === 'DL') {
        Array.from(node.children).forEach(processNode);
        // Pop folder when exiting DL (if we entered a folder)
      }

      // Process siblings
      if (node.nextElementSibling) {
        processNode(node.nextElementSibling);
      }
    };

    // Find the main DL element
    const mainDL = doc.querySelector('DL');
    if (mainDL) {
      Array.from(mainDL.children).forEach(child => {
        folderStack.length = 0; // Reset folder stack for each top-level item
        this.processBookmarkNode(child, bookmarks, folderStack);
      });
    }

    return bookmarks;
  }

  processBookmarkNode(node, bookmarks, folderStack) {
    if (node.nodeName === 'DT') {
      const h3 = node.querySelector(':scope > H3');
      const a = node.querySelector(':scope > A');
      const dl = node.querySelector(':scope > DL');

      if (h3) {
        // This is a folder
        const folderName = h3.textContent.trim();
        folderStack.push(folderName);

        if (dl) {
          Array.from(dl.children).forEach(child => {
            this.processBookmarkNode(child, bookmarks, folderStack);
          });
        }

        folderStack.pop();
      } else if (a) {
        // This is a bookmark
        const title = a.textContent.trim();
        const url = a.getAttribute('href');
        const addDate = a.getAttribute('add_date');

        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          bookmarks.push({
            title: title || url,
            url: url,
            folder: folderStack.length > 0 ? folderStack[folderStack.length - 1] : null,
            folderPath: [...folderStack],
            addedDate: addDate ? new Date(parseInt(addDate) * 1000).toISOString() : null
          });
        }
      }
    }
  }

  importChromeBookmarks(htmlContent) {
    const parsed = this.parseChromeBookmarks(htmlContent);

    // Create tags from unique folders
    const uniqueFolders = new Set();
    parsed.forEach(b => {
      if (b.folder) {
        uniqueFolders.add(b.folder);
      }
    });

    const folderToTagMap = {};
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
    let colorIndex = 0;

    uniqueFolders.forEach(folder => {
      // Check if tag already exists
      let existingTag = this.tags.find(t => t.name.toLowerCase() === folder.toLowerCase());
      if (!existingTag) {
        existingTag = this.addTag({
          name: folder,
          color: colors[colorIndex % colors.length]
        });
        colorIndex++;
      }
      folderToTagMap[folder] = existingTag.id;
    });

    // Import bookmarks
    let imported = 0;
    let skipped = 0;

    parsed.forEach(b => {
      // Check for duplicates by URL
      const exists = this.bookmarks.some(existing => existing.url === b.url);
      if (!exists) {
        const tags = b.folder ? [folderToTagMap[b.folder]] : [];
        this.bookmarks.push({
          id: this.generateId(),
          title: b.title,
          url: b.url,
          tags: tags,
          notes: '',
          favicon: this.getFaviconUrl(b.url),
          createdAt: b.addedDate || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        imported++;
      } else {
        skipped++;
      }
    });

    this.saveToStorage();
    this.render();

    return { imported, skipped, totalFolders: uniqueFolders.size };
  }

  // ===== EXPORT/IMPORT DATA =====
  exportData() {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      bookmarks: this.bookmarks,
      tags: this.tags
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast('Data exported successfully!', 'success');
  }

  importData(jsonContent) {
    try {
      const data = JSON.parse(jsonContent);

      if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
        throw new Error('Invalid data format: missing bookmarks array');
      }

      // Merge or replace decision - we'll merge
      let importedBookmarks = 0;
      let importedTags = 0;

      // Import tags first
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach(tag => {
          const exists = this.tags.some(t => t.id === tag.id || t.name.toLowerCase() === tag.name.toLowerCase());
          if (!exists) {
            this.tags.push(tag);
            importedTags++;
          }
        });
      }

      // Import bookmarks
      data.bookmarks.forEach(bookmark => {
        const exists = this.bookmarks.some(b => b.url === bookmark.url);
        if (!exists) {
          this.bookmarks.push(bookmark);
          importedBookmarks++;
        }
      });

      this.saveToStorage();
      this.render();

      this.showToast(`Imported ${importedBookmarks} bookmarks and ${importedTags} tags!`, 'success');
      return { importedBookmarks, importedTags };
    } catch (e) {
      console.error('Import failed:', e);
      this.showToast('Failed to import data: ' + e.message, 'error');
      return null;
    }
  }

  // ===== FILTERING & SORTING =====
  getFilteredBookmarks() {
    let filtered = [...this.bookmarks];

    // Apply tag filter
    if (this.currentFilter === 'uncategorized') {
      filtered = filtered.filter(b => b.tags.length === 0);
    } else if (this.currentFilter !== 'all') {
      filtered = filtered.filter(b => b.tags.includes(this.currentFilter));
    }

    // Apply search
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query) ||
        b.notes.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (this.sortOrder) {
        case 'dateDesc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'dateAsc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'nameAsc':
          return a.title.localeCompare(b.title);
        case 'nameDesc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return filtered;
  }

  // ===== UTILITIES =====
  generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close">✕</button>
    `;

    container.appendChild(toast);

    const close = toast.querySelector('.toast-close');
    close.addEventListener('click', () => toast.remove());

    // Auto remove after 4 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  // ===== EVENT BINDING =====
  bindEvents() {
    // Header actions
    document.getElementById('importChromeBtn').addEventListener('click', () => {
      document.getElementById('chromeImportInput').click();
    });

    document.getElementById('chromeImportInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = this.importChromeBookmarks(event.target.result);
          this.showToast(`Imported ${result.imported} bookmarks (${result.skipped} duplicates skipped, ${result.totalFolders} folders converted to tags)`, 'success');
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
      }
    });

    document.getElementById('exportDataBtn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('importDataBtn').addEventListener('click', () => {
      document.getElementById('dataImportInput').click();
    });

    document.getElementById('dataImportInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.importData(event.target.result);
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
      }
    });

    document.getElementById('addBookmarkBtn').addEventListener('click', () => {
      this.openBookmarkModal();
    });

    document.getElementById('emptyImportBtn').addEventListener('click', () => {
      document.getElementById('chromeImportInput').click();
    });

    document.getElementById('autoCategorizeBtn').addEventListener('click', () => {
      this.autoCategorizeBookmarks();
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderBookmarks();
    });

    document.getElementById('clearSearch').addEventListener('click', () => {
      searchInput.value = '';
      this.searchQuery = '';
      this.renderBookmarks();
    });

    // Sort
    document.getElementById('sortSelect').addEventListener('change', (e) => {
      this.sortOrder = e.target.value;
      this.renderBookmarks();
    });

    // Bulk mode toggle
    document.getElementById('bulkModeToggle').addEventListener('change', (e) => {
      this.bulkMode = e.target.checked;
      this.selectedBookmarks.clear();
      document.getElementById('bulkActions').style.display = this.bulkMode ? 'flex' : 'none';
      this.renderBookmarks();
    });

    // Bulk actions
    document.getElementById('bulkTagBtn').addEventListener('click', () => {
      if (this.selectedBookmarks.size > 0) {
        this.openBulkTagModal();
      } else {
        this.showToast('Please select at least one bookmark', 'warning');
      }
    });

    document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
      if (this.selectedBookmarks.size > 0) {
        if (confirm(`Are you sure you want to delete ${this.selectedBookmarks.size} bookmark(s)?`)) {
          this.deleteMultipleBookmarks(Array.from(this.selectedBookmarks));
          this.showToast(`Deleted ${this.selectedBookmarks.size} bookmark(s)`, 'success');
        }
      } else {
        this.showToast('Please select at least one bookmark', 'warning');
      }
    });

    document.getElementById('selectAllBtn').addEventListener('click', () => {
      this.selectAllVisible();
    });

    document.getElementById('deselectAllBtn').addEventListener('click', () => {
      this.deselectAll();
    });

    // Tag management
    document.getElementById('addTagBtn').addEventListener('click', () => {
      this.openTagModal();
    });

    // Bookmark modal
    document.getElementById('closeBookmarkModal').addEventListener('click', () => this.closeBookmarkModal());
    document.getElementById('cancelBookmark').addEventListener('click', () => this.closeBookmarkModal());
    document.getElementById('bookmarkForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveBookmark();
    });

    // Tag modal
    document.getElementById('closeTagModal').addEventListener('click', () => this.closeTagModal());
    document.getElementById('cancelTag').addEventListener('click', () => this.closeTagModal());
    document.getElementById('tagForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTag();
    });
    document.getElementById('deleteTag').addEventListener('click', () => {
      const tagId = document.getElementById('tagId').value;
      if (tagId && confirm('Are you sure you want to delete this tag? It will be removed from all bookmarks.')) {
        this.deleteTag(tagId);
        this.closeTagModal();
        this.showToast('Tag deleted', 'success');
      }
    });

    // Color picker
    document.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        document.getElementById('tagColor').value = e.target.dataset.color;
      });
    });

    // Bulk tag modal
    document.getElementById('closeBulkTagModal').addEventListener('click', () => this.closeBulkTagModal());
    document.getElementById('cancelBulkTag').addEventListener('click', () => this.closeBulkTagModal());
    document.getElementById('applyBulkTags').addEventListener('click', () => {
      this.applyBulkTags();
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('show');
        }
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
      }

      // Ctrl/Cmd + K for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
    });

    // Tags section toggle
    document.getElementById('tagsToggle').addEventListener('click', () => {
      const section = document.getElementById('tagsSection');
      section.classList.toggle('collapsed');
      // Save preference
      localStorage.setItem('tagsCollapsed', section.classList.contains('collapsed'));
    });

    // Restore collapsed state
    if (localStorage.getItem('tagsCollapsed') === 'true') {
      document.getElementById('tagsSection').classList.add('collapsed');
    }
  }

  // ===== MODALS =====
  openBookmarkModal(bookmarkId = null) {
    const modal = document.getElementById('bookmarkModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('bookmarkForm');

    form.reset();
    document.getElementById('bookmarkId').value = '';

    if (bookmarkId) {
      const bookmark = this.getBookmark(bookmarkId);
      if (bookmark) {
        title.textContent = 'Edit Bookmark';
        document.getElementById('bookmarkId').value = bookmark.id;
        document.getElementById('bookmarkTitle').value = bookmark.title;
        document.getElementById('bookmarkUrl').value = bookmark.url;
        document.getElementById('bookmarkNotes').value = bookmark.notes || '';

        // Set selected tags
        this.renderTagSelector('tagSelector', bookmark.tags);
      }
    } else {
      title.textContent = 'Add Bookmark';
      this.renderTagSelector('tagSelector', []);
    }

    modal.classList.add('show');
    document.getElementById('bookmarkTitle').focus();
  }

  closeBookmarkModal() {
    document.getElementById('bookmarkModal').classList.remove('show');
  }

  saveBookmark() {
    const id = document.getElementById('bookmarkId').value;
    const title = document.getElementById('bookmarkTitle').value.trim();
    const url = document.getElementById('bookmarkUrl').value.trim();
    const notes = document.getElementById('bookmarkNotes').value.trim();

    // Get selected tags
    const selectedTags = [];
    document.querySelectorAll('#tagSelector .tag-checkbox.selected').forEach(el => {
      selectedTags.push(el.dataset.tagId);
    });

    if (!title || !url) {
      this.showToast('Title and URL are required', 'warning');
      return;
    }

    if (id) {
      this.updateBookmark(id, { title, url, notes, tags: selectedTags });
      this.showToast('Bookmark updated!', 'success');
    } else {
      this.addBookmark({ title, url, notes, tags: selectedTags });
      this.showToast('Bookmark added!', 'success');
    }

    this.closeBookmarkModal();
  }

  openTagModal(tagId = null) {
    const modal = document.getElementById('tagModal');
    const title = document.getElementById('tagModalTitle');
    const deleteBtn = document.getElementById('deleteTag');

    document.getElementById('tagForm').reset();
    document.getElementById('tagId').value = '';

    // Reset color picker
    document.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
    document.querySelector('.color-option[data-color="#6b7280"]').classList.add('selected');
    document.getElementById('tagColor').value = '#6b7280';

    if (tagId) {
      const tag = this.getTag(tagId);
      if (tag) {
        title.textContent = 'Edit Tag';
        document.getElementById('tagId').value = tag.id;
        document.getElementById('tagName').value = tag.name;
        document.getElementById('tagColor').value = tag.color;

        document.querySelectorAll('.color-option').forEach(b => {
          b.classList.toggle('selected', b.dataset.color === tag.color);
        });

        deleteBtn.style.display = 'block';
      }
    } else {
      title.textContent = 'Add Tag';
      deleteBtn.style.display = 'none';
    }

    modal.classList.add('show');
    document.getElementById('tagName').focus();
  }

  closeTagModal() {
    document.getElementById('tagModal').classList.remove('show');
  }

  saveTag() {
    const id = document.getElementById('tagId').value;
    const name = document.getElementById('tagName').value.trim();
    const color = document.getElementById('tagColor').value;

    if (!name) {
      this.showToast('Tag name is required', 'warning');
      return;
    }

    // Check for duplicate name
    const duplicate = this.tags.find(t =>
      t.name.toLowerCase() === name.toLowerCase() && t.id !== id
    );
    if (duplicate) {
      this.showToast('A tag with this name already exists', 'warning');
      return;
    }

    if (id) {
      this.updateTag(id, { name, color });
      this.showToast('Tag updated!', 'success');
    } else {
      this.addTag({ name, color });
      this.showToast('Tag created!', 'success');
    }

    this.closeTagModal();
  }

  openBulkTagModal() {
    const modal = document.getElementById('bulkTagModal');
    document.getElementById('bulkSelectedInfo').textContent =
      `${this.selectedBookmarks.size} bookmark(s) selected`;

    this.renderTagSelector('bulkTagSelector', [], true);
    modal.classList.add('show');
  }

  closeBulkTagModal() {
    document.getElementById('bulkTagModal').classList.remove('show');
  }

  applyBulkTags() {
    const selectedTags = [];
    document.querySelectorAll('#bulkTagSelector .tag-checkbox.selected').forEach(el => {
      selectedTags.push(el.dataset.tagId);
    });

    if (selectedTags.length === 0) {
      this.showToast('Please select at least one tag', 'warning');
      return;
    }

    this.assignTagsToBookmarks(Array.from(this.selectedBookmarks), selectedTags);
    this.showToast(`Tags assigned to ${this.selectedBookmarks.size} bookmark(s)`, 'success');
    this.closeBulkTagModal();
  }

  renderTagSelector(containerId, selectedTagIds, showAll = false) {
    const container = document.getElementById(containerId);

    if (this.tags.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">No tags yet. Create tags to organize your bookmarks.</p>';
      return;
    }

    container.innerHTML = this.tags.map(tag => `
      <label class="tag-checkbox ${selectedTagIds.includes(tag.id) ? 'selected' : ''}" data-tag-id="${tag.id}">
        <input type="checkbox" ${selectedTagIds.includes(tag.id) ? 'checked' : ''}>
        <span class="tag-checkbox-color" style="background: ${tag.color}"></span>
        <span class="tag-checkbox-name">${this.escapeHtml(tag.name)}</span>
      </label>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.tag-checkbox').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
          const checkbox = el.querySelector('input');
          checkbox.checked = !checkbox.checked;
        }
        el.classList.toggle('selected', el.querySelector('input').checked);
      });
    });
  }

  // ===== RENDERING =====
  render() {
    this.renderSidebar();
    this.renderBookmarks();
  }

  renderSidebar() {
    // Update counts
    document.getElementById('allCount').textContent = this.bookmarks.length;
    document.getElementById('uncategorizedCount').textContent =
      this.bookmarks.filter(b => b.tags.length === 0).length;
    document.getElementById('totalTagsCount').textContent = this.tags.length;

    // Render custom tags
    const container = document.getElementById('customTagList');
    container.innerHTML = this.tags.map(tag => {
      const count = this.bookmarks.filter(b => b.tags.includes(tag.id)).length;
      return `
        <li class="tag-item ${this.currentFilter === tag.id ? 'active' : ''}" data-tag="${tag.id}">
          <span class="tag-color" style="background: ${tag.color}"></span>
          <span class="tag-name">${this.escapeHtml(tag.name)}</span>
          <span class="tag-count">${count}</span>
        </li>
      `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.tag-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Check if it's the edit action (double click or right click)
        if (e.detail === 2 && item.dataset.tag !== 'all' && item.dataset.tag !== 'uncategorized') {
          this.openTagModal(item.dataset.tag);
          return;
        }

        document.querySelectorAll('.tag-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.currentFilter = item.dataset.tag;

        // Update header
        const tagName = item.querySelector('.tag-name').textContent;
        document.getElementById('currentCategory').textContent = tagName;

        // Update glow color based on selected tag
        this.updateGlowColor();

        this.renderBookmarks();
      });
    });
  }

  updateGlowColor() {
    let glowColor = '255, 255, 255'; // Default white

    if (this.currentFilter !== 'all' && this.currentFilter !== 'uncategorized') {
      const tag = this.getTag(this.currentFilter);
      if (tag && tag.color) {
        // Convert hex to RGB
        const hex = tag.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        glowColor = `${r}, ${g}, ${b}`;
      }
    }

    document.documentElement.style.setProperty('--glow-color', glowColor);
  }

  renderBookmarks() {
    const container = document.getElementById('bookmarksGrid');
    const emptyState = document.getElementById('emptyState');
    const filtered = this.getFilteredBookmarks();

    if (this.bookmarks.length === 0) {
      container.innerHTML = '';
      emptyState.classList.add('show');
      return;
    }

    emptyState.classList.remove('show');

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state show" style="grid-column: 1 / -1;">
          <div class="empty-icon">🔍</div>
          <h3>No bookmarks found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(bookmark => {
      const tags = bookmark.tags.map(tagId => {
        const tag = this.getTag(tagId);
        return tag ? `<span class="tile-tag" style="background: ${tag.color}20; color: ${tag.color}; border-color: ${tag.color}40;">${this.escapeHtml(tag.name)}</span>` : '';
      }).join('');

      const isSelected = this.selectedBookmarks.has(bookmark.id);

      return `
        <div class="bookmark-tile ${this.bulkMode ? 'bulk-mode' : ''} ${isSelected ? 'selected' : ''}" 
             data-id="${bookmark.id}">
          <div class="tile-checkbox">${isSelected ? '✓' : ''}</div>
          <div class="tile-header">
            <div class="tile-favicon">
              ${bookmark.favicon ?
          `<img src="${bookmark.favicon}" alt="" onerror="this.parentElement.innerHTML='🔗'">` :
          '🔗'}
            </div>
            <div class="tile-info">
              <div class="tile-title">${this.escapeHtml(bookmark.title)}</div>
              <div class="tile-url">${this.escapeHtml(this.truncateUrl(bookmark.url))}</div>
            </div>
          </div>
          ${tags ? `<div class="tile-tags">${tags}</div>` : ''}
          <div class="tile-actions">
            <button class="tile-action-btn open-btn" data-url="${bookmark.url}">🔗 Open</button>
            <button class="tile-action-btn edit-btn" data-id="${bookmark.id}">✏️ Edit</button>
            <button class="tile-action-btn delete delete-btn" data-id="${bookmark.id}">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners
    container.querySelectorAll('.bookmark-tile').forEach(tile => {
      const id = tile.dataset.id;

      // Tile click behavior
      tile.addEventListener('click', (e) => {
        // Don't trigger on button clicks
        if (e.target.closest('.tile-action-btn')) return;

        if (this.bulkMode) {
          this.toggleBookmarkSelection(id);
        } else {
          // Open the bookmark
          const bookmark = this.getBookmark(id);
          if (bookmark) {
            window.open(bookmark.url, '_blank');
          }
        }
      });
    });

    // Button handlers
    container.querySelectorAll('.open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(btn.dataset.url, '_blank');
      });
    });

    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openBookmarkModal(btn.dataset.id);
      });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this bookmark?')) {
          this.deleteBookmark(btn.dataset.id);
          this.showToast('Bookmark deleted', 'success');
        }
      });
    });
  }

  updateBulkUI() {
    document.getElementById('selectedCount').textContent = this.selectedBookmarks.size;
  }

  truncateUrl(url) {
    try {
      const parsed = new URL(url);
      let display = parsed.hostname + parsed.pathname;
      if (display.length > 50) {
        display = display.substring(0, 47) + '...';
      }
      return display;
    } catch {
      return url.substring(0, 50);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  window.bookmarkManager = new BookmarkManager();
});
