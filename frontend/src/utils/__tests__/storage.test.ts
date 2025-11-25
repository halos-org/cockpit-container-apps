/**
 * Tests for localStorage utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearAllState,
    loadActiveCategory,
    loadActiveStore,
    loadActiveTab,
    loadInstallFilter,
    loadSearchQuery,
    saveActiveCategory,
    saveActiveStore,
    saveActiveTab,
    saveInstallFilter,
    saveSearchQuery,
} from '../storage';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('Storage Utilities', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    describe('activeStore', () => {
        it('should save and load active store', () => {
            saveActiveStore('marine');
            expect(loadActiveStore()).toBe('marine');
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'cockpit-container-apps:activeStore',
                'marine'
            );
        });

        it('should return null when no store saved', () => {
            expect(loadActiveStore()).toBeNull();
        });

        it('should remove store when saving null', () => {
            saveActiveStore('marine');
            saveActiveStore(null);
            expect(loadActiveStore()).toBeNull();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(
                'cockpit-container-apps:activeStore'
            );
        });
    });

    describe('activeCategory', () => {
        it('should save and load active category', () => {
            saveActiveCategory('navigation');
            expect(loadActiveCategory()).toBe('navigation');
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'cockpit-container-apps:activeCategory',
                'navigation'
            );
        });

        it('should return null when no category saved', () => {
            expect(loadActiveCategory()).toBeNull();
        });

        it('should remove category when saving null', () => {
            saveActiveCategory('navigation');
            saveActiveCategory(null);
            expect(loadActiveCategory()).toBeNull();
        });
    });

    describe('activeTab', () => {
        it('should save and load active tab', () => {
            saveActiveTab('installed');
            expect(loadActiveTab()).toBe('installed');
        });

        it('should return null for invalid tab value', () => {
            localStorageMock.setItem('cockpit-container-apps:activeTab', 'invalid');
            expect(loadActiveTab()).toBeNull();
        });

        it('should return null when no tab saved', () => {
            expect(loadActiveTab()).toBeNull();
        });
    });

    describe('installFilter', () => {
        it('should save and load install filter', () => {
            saveInstallFilter('available');
            expect(loadInstallFilter()).toBe('available');
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'cockpit-container-apps:installFilter',
                'available'
            );
        });

        it('should handle all three filter values', () => {
            saveInstallFilter('all');
            expect(loadInstallFilter()).toBe('all');

            saveInstallFilter('available');
            expect(loadInstallFilter()).toBe('available');

            saveInstallFilter('installed');
            expect(loadInstallFilter()).toBe('installed');
        });

        it('should return "all" when no filter saved', () => {
            expect(loadInstallFilter()).toBe('all');
        });

        it('should return "all" for invalid filter value', () => {
            localStorageMock.setItem('cockpit-container-apps:installFilter', 'invalid');
            expect(loadInstallFilter()).toBe('all');
        });
    });

    describe('searchQuery', () => {
        it('should save and load search query', () => {
            saveSearchQuery('signal');
            expect(loadSearchQuery()).toBe('signal');
        });

        it('should return empty string when no query saved', () => {
            expect(loadSearchQuery()).toBe('');
        });

        it('should remove query when saving empty string', () => {
            saveSearchQuery('signal');
            saveSearchQuery('');
            expect(loadSearchQuery()).toBe('');
        });
    });

    describe('clearAllState', () => {
        it('should clear all stored values', () => {
            saveActiveStore('marine');
            saveActiveCategory('navigation');
            saveActiveTab('installed');
            saveInstallFilter('installed');
            saveSearchQuery('signal');

            clearAllState();

            expect(loadActiveStore()).toBeNull();
            expect(loadActiveCategory()).toBeNull();
            expect(loadActiveTab()).toBeNull();
            expect(loadInstallFilter()).toBe('all');
            expect(loadSearchQuery()).toBe('');
        });
    });
});
