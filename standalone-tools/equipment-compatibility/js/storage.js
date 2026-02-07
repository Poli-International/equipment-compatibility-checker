// Local Storage Management for Equipment Compatibility Checker

const STORAGE_KEYS = {
    RECENT_CHECKS: 'equipChecker_recentChecks',
    SAVED_SETUPS: 'equipChecker_savedSetups',
    FAVORITES: 'equipChecker_favorites',
    SEARCH_HISTORY: 'equipChecker_searchHistory'
};

const MAX_RECENT_CHECKS = 10;
const MAX_SEARCH_HISTORY = 20;
const MAX_SAVED_SETUPS = 15;

// --- Storage Utilities ---
const Storage = {
    // Get data from localStorage
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading from localStorage (${key}):`, error);
            return defaultValue;
        }
    },

    // Set data in localStorage
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to localStorage (${key}):`, error);
            return false;
        }
    },

    // Remove data from localStorage
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing from localStorage (${key}):`, error);
            return false;
        }
    },

    // Clear all equipment checker data
    clearAll() {
        Object.values(STORAGE_KEYS).forEach(key => this.remove(key));
    }
};

// --- Recent Checks Management ---
const RecentChecks = {
    getAll() {
        return Storage.get(STORAGE_KEYS.RECENT_CHECKS, []);
    },

    add(check) {
        const checks = this.getAll();
        const newCheck = {
            ...check,
            timestamp: Date.now(),
            id: `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // Remove duplicate if exists
        const filtered = checks.filter(c =>
            !(c.comp1Type === check.comp1Type &&
              c.comp1Id === check.comp1Id &&
              c.comp2Type === check.comp2Type &&
              c.comp2Id === check.comp2Id)
        );

        // Add to beginning and limit size
        filtered.unshift(newCheck);
        const limited = filtered.slice(0, MAX_RECENT_CHECKS);

        Storage.set(STORAGE_KEYS.RECENT_CHECKS, limited);
        return newCheck;
    },

    remove(id) {
        const checks = this.getAll();
        const filtered = checks.filter(c => c.id !== id);
        Storage.set(STORAGE_KEYS.RECENT_CHECKS, filtered);
    },

    clear() {
        Storage.remove(STORAGE_KEYS.RECENT_CHECKS);
    }
};

// --- Saved Setups Management ---
const SavedSetups = {
    getAll() {
        return Storage.get(STORAGE_KEYS.SAVED_SETUPS, []);
    },

    add(setup) {
        const setups = this.getAll();
        const newSetup = {
            ...setup,
            timestamp: Date.now(),
            id: `setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // Check if we're at the limit
        if (setups.length >= MAX_SAVED_SETUPS) {
            window.showToast('Limit Reached', `Maximum ${MAX_SAVED_SETUPS} saved setups allowed`, 'info');
            return null;
        }

        setups.unshift(newSetup);
        Storage.set(STORAGE_KEYS.SAVED_SETUPS, setups);
        window.showToast('Setup Saved', 'Your equipment setup has been saved', 'success');
        return newSetup;
    },

    update(id, updates) {
        const setups = this.getAll();
        const index = setups.findIndex(s => s.id === id);
        if (index !== -1) {
            setups[index] = { ...setups[index], ...updates, updatedAt: Date.now() };
            Storage.set(STORAGE_KEYS.SAVED_SETUPS, setups);
            return setups[index];
        }
        return null;
    },

    remove(id) {
        const setups = this.getAll();
        const filtered = setups.filter(s => s.id !== id);
        Storage.set(STORAGE_KEYS.SAVED_SETUPS, filtered);
        window.showToast('Setup Deleted', 'Saved setup removed', 'info');
    },

    clear() {
        Storage.remove(STORAGE_KEYS.SAVED_SETUPS);
    },

    get(id) {
        const setups = this.getAll();
        return setups.find(s => s.id === id) || null;
    }
};

// --- Favorites Management ---
const Favorites = {
    getAll() {
        return Storage.get(STORAGE_KEYS.FAVORITES, []);
    },

    add(itemType, itemId) {
        const favorites = this.getAll();
        const key = `${itemType}_${itemId}`;

        if (!favorites.includes(key)) {
            favorites.push(key);
            Storage.set(STORAGE_KEYS.FAVORITES, favorites);
            window.showToast('Added to Favorites', 'Equipment added to your favorites', 'success');
            return true;
        }
        return false;
    },

    remove(itemType, itemId) {
        const favorites = this.getAll();
        const key = `${itemType}_${itemId}`;
        const filtered = favorites.filter(f => f !== key);
        Storage.set(STORAGE_KEYS.FAVORITES, filtered);
        window.showToast('Removed from Favorites', 'Equipment removed from favorites', 'info');
    },

    toggle(itemType, itemId) {
        if (this.isFavorite(itemType, itemId)) {
            this.remove(itemType, itemId);
            return false;
        } else {
            this.add(itemType, itemId);
            return true;
        }
    },

    isFavorite(itemType, itemId) {
        const favorites = this.getAll();
        const key = `${itemType}_${itemId}`;
        return favorites.includes(key);
    },

    clear() {
        Storage.remove(STORAGE_KEYS.FAVORITES);
    }
};

// --- Search History Management ---
const SearchHistory = {
    getAll() {
        return Storage.get(STORAGE_KEYS.SEARCH_HISTORY, []);
    },

    add(searchTerm) {
        if (!searchTerm || searchTerm.trim().length < 2) return;

        const history = this.getAll();
        const term = searchTerm.trim().toLowerCase();

        // Remove if already exists
        const filtered = history.filter(h => h !== term);

        // Add to beginning and limit size
        filtered.unshift(term);
        const limited = filtered.slice(0, MAX_SEARCH_HISTORY);

        Storage.set(STORAGE_KEYS.SEARCH_HISTORY, limited);
    },

    remove(searchTerm) {
        const history = this.getAll();
        const filtered = history.filter(h => h !== searchTerm);
        Storage.set(STORAGE_KEYS.SEARCH_HISTORY, filtered);
    },

    clear() {
        Storage.remove(STORAGE_KEYS.SEARCH_HISTORY);
    },

    getRecent(limit = 5) {
        const history = this.getAll();
        return history.slice(0, limit);
    }
};

// --- Export to global scope ---
window.EquipStorage = {
    Storage,
    RecentChecks,
    SavedSetups,
    Favorites,
    SearchHistory,
    STORAGE_KEYS
};

// Log initialization
console.log('Equipment Checker Storage initialized');
