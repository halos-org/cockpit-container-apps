/**
 * LocalStorage utilities for persisting application state
 */

const STORAGE_PREFIX = 'cockpit-container-apps:';

// Storage keys
const KEYS = {
    ACTIVE_STORE: `${STORAGE_PREFIX}activeStore`,
    ACTIVE_CATEGORY: `${STORAGE_PREFIX}activeCategory`,
    ACTIVE_TAB: `${STORAGE_PREFIX}activeTab`,
    INSTALL_FILTER: `${STORAGE_PREFIX}installFilter`,
    SEARCH_QUERY: `${STORAGE_PREFIX}searchQuery`,
} as const;

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
}

/**
 * Save a value to localStorage with error handling
 * @returns true if saved successfully, false otherwise
 */
function saveItem(key: string, value: string): boolean {
    if (!isStorageAvailable()) {
        console.warn('localStorage not available');
        return false;
    }

    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e instanceof Error && e.name === 'QuotaExceededError') {
            console.error(
                `localStorage quota exceeded when saving key "${key}" (value size: ${value.length} bytes)`
            );
            // Try to clear old data and retry
            try {
                Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
                localStorage.setItem(key, value);
                return true;
            } catch (retryError) {
                console.error(
                    `Failed to save key "${key}" to localStorage even after clearing (value size: ${value.length} bytes)`,
                    retryError
                );
                return false;
            }
        } else {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    }
}

/**
 * Load a value from localStorage with error handling
 */
function loadItem(key: string): string | null {
    if (!isStorageAvailable()) {
        return null;
    }

    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
        return null;
    }
}

/**
 * Remove a value from localStorage
 */
function removeItem(key: string): void {
    if (!isStorageAvailable()) {
        return;
    }

    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error('Failed to remove from localStorage:', e);
    }
}

/**
 * Save active store ID
 */
export function saveActiveStore(storeId: string | null): void {
    if (storeId === null) {
        removeItem(KEYS.ACTIVE_STORE);
    } else {
        saveItem(KEYS.ACTIVE_STORE, storeId);
    }
}

/**
 * Load active store ID
 */
export function loadActiveStore(): string | null {
    return loadItem(KEYS.ACTIVE_STORE);
}

/**
 * Save active category ID
 */
export function saveActiveCategory(categoryId: string | null): void {
    if (categoryId === null) {
        removeItem(KEYS.ACTIVE_CATEGORY);
    } else {
        saveItem(KEYS.ACTIVE_CATEGORY, categoryId);
    }
}

/**
 * Load active category ID
 */
export function loadActiveCategory(): string | null {
    return loadItem(KEYS.ACTIVE_CATEGORY);
}

/**
 * Save active tab
 */
export function saveActiveTab(tab: 'installed' | 'available'): void {
    saveItem(KEYS.ACTIVE_TAB, tab);
}

/**
 * Load active tab
 */
export function loadActiveTab(): 'installed' | 'available' | null {
    const tab = loadItem(KEYS.ACTIVE_TAB);
    if (tab === 'installed' || tab === 'available') {
        return tab;
    }
    return null;
}

/**
 * Save install filter
 */
export function saveInstallFilter(filter: 'all' | 'available' | 'installed'): void {
    saveItem(KEYS.INSTALL_FILTER, filter);
}

/**
 * Load install filter
 */
export function loadInstallFilter(): 'all' | 'available' | 'installed' {
    const filter = loadItem(KEYS.INSTALL_FILTER);
    if (filter === 'all' || filter === 'available' || filter === 'installed') {
        return filter;
    }
    return 'all'; // Default to 'all' if not set or invalid
}

/**
 * Save search query
 */
export function saveSearchQuery(query: string): void {
    if (query === '') {
        removeItem(KEYS.SEARCH_QUERY);
    } else {
        saveItem(KEYS.SEARCH_QUERY, query);
    }
}

/**
 * Load search query
 */
export function loadSearchQuery(): string {
    return loadItem(KEYS.SEARCH_QUERY) || '';
}

/**
 * Clear all stored state
 */
export function clearAllState(): void {
    Object.values(KEYS).forEach((key) => removeItem(key));
}
