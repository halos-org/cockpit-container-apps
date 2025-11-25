/**
 * Application state management with React Context
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ContainerAppsError, filterPackages, listCategories, listStores } from '../api';
import type { Category, FilterParams, Package, Store } from '../api/types';
import {
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
} from '../utils/storage';

/**
 * Application state interface
 */
export interface AppState {
    // Data
    stores: Store[];
    categories: Category[];
    packages: Package[];

    // Filters
    activeStore: string | null;
    activeCategory: string | null;
    activeTab: 'installed' | 'available'; // Deprecated - use installFilter
    installFilter: 'all' | 'available' | 'installed';
    searchQuery: string;

    // UI state
    loading: boolean;
    error: string | null;
    packagesLoading: boolean;
    packagesError: string | null;

    // Metadata
    totalPackageCount: number;
    limitedResults: boolean;
}

/**
 * Application actions interface
 */
export interface AppActions {
    // Data loading
    loadStores: () => Promise<void>;
    loadCategories: (storeId?: string) => Promise<void>;
    loadPackages: (params?: FilterParams) => Promise<void>;

    // Filter actions
    setActiveStore: (storeId: string | null) => void;
    setActiveCategory: (categoryId: string | null) => void;
    setActiveTab: (tab: 'installed' | 'available') => void; // Deprecated - use setInstallFilter
    setInstallFilter: (filter: 'all' | 'available' | 'installed') => void;
    setSearchQuery: (query: string) => void;

    // Utility actions
    clearError: () => void;
    refresh: () => Promise<void>;
}

/**
 * Combined context type
 */
export interface AppContextType {
    state: AppState;
    actions: AppActions;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Initial state
 */
const initialState: AppState = {
    stores: [],
    categories: [],
    packages: [],
    activeStore: loadActiveStore(),
    activeCategory: loadActiveCategory(),
    activeTab: loadActiveTab() || 'available',
    installFilter: loadInstallFilter(),
    searchQuery: loadSearchQuery(),
    loading: true, // Start with loading state to show spinner on mount
    error: null,
    packagesLoading: false,
    packagesError: null,
    totalPackageCount: 0,
    limitedResults: false,
};

/**
 * AppContext Provider component
 */
export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    const [state, setState] = useState<AppState>(initialState);

    // Load stores on mount
    const loadStores = useCallback(async () => {
        // Don't touch loading flag - let categories control it since that's the primary content
        setState((prev) => ({ ...prev, error: null }));
        try {
            const stores = await listStores();
            setState((prev) => {
                // If no store is selected and we have stores, default to the first one
                const activeStore = prev.activeStore || (stores.length > 0 ? stores[0].id : null);
                if (activeStore !== prev.activeStore && activeStore) {
                    saveActiveStore(activeStore);
                }
                return { ...prev, stores, activeStore };
            });
        } catch (e) {
            const error = e instanceof ContainerAppsError ? e.message : String(e);
            setState((prev) => ({ ...prev, error }));
        }
    }, []);

    // Load categories - now loads all count states at once
    const loadCategories = useCallback(
        async (storeId?: string) => {
            setState((prev) => {
                // Load categories without tab filter - backend returns all count states
                listCategories(storeId)
                    .then((categories) => {
                        setState((current) => ({ ...current, categories, loading: false }));
                    })
                    .catch((e) => {
                        const error = e instanceof ContainerAppsError ? e.message : String(e);
                        setState((current) => ({ ...current, error, loading: false }));
                    });

                return { ...prev, loading: true, error: null };
            });
        },
        []
    );

    // Load packages - reads from current state
    const loadPackages = useCallback(async (params?: FilterParams) => {
        setState((prev) => {
            // Map installFilter to backend tab parameter
            let tabFilter: 'installed' | 'upgradable' | undefined;
            const filter = prev.installFilter;
            if (filter === 'installed') {
                tabFilter = 'installed';
            }
            // 'all' and 'available' → no tab filter (backend returns all packages)

            const filterParams: FilterParams = {
                store_id: params?.store_id ?? prev.activeStore ?? undefined,
                category_id: params?.category_id ?? prev.activeCategory ?? undefined,
                tab: params?.tab ?? tabFilter,
                search_query: params?.search_query ?? (prev.searchQuery || undefined),
                limit: params?.limit ?? 1000,
            };

            // Start loading
            filterPackages(filterParams)
                .then((response) => {
                    // Filter client-side for 'available' (non-installed packages)
                    let filteredPackages = response.packages;
                    if (filter === 'available') {
                        filteredPackages = response.packages.filter((pkg) => !pkg.installed);
                    }

                    setState((current) => ({
                        ...current,
                        packages: filteredPackages,
                        totalPackageCount: filteredPackages.length,
                        limitedResults: response.limited,
                        packagesLoading: false,
                    }));
                })
                .catch((e) => {
                    const error = e instanceof ContainerAppsError ? e.message : String(e);
                    setState((current) => ({
                        ...current,
                        packagesError: error,
                        packagesLoading: false,
                    }));
                });

            return { ...prev, packagesLoading: true, packagesError: null };
        });
    }, []);

    // Set active store
    const setActiveStore = useCallback((storeId: string | null) => {
        setState((prev) => ({ ...prev, activeStore: storeId, activeCategory: null }));
        saveActiveStore(storeId);
        saveActiveCategory(null);
    }, []);

    // Set active category
    const setActiveCategory = useCallback((categoryId: string | null) => {
        setState((prev) => ({ ...prev, activeCategory: categoryId }));
        saveActiveCategory(categoryId);
    }, []);

    // Set active tab
    const setActiveTab = useCallback((tab: 'installed' | 'available') => {
        setState((prev) => ({ ...prev, activeTab: tab }));
        saveActiveTab(tab);
    }, []);

    // Set install filter
    const setInstallFilter = useCallback((filter: 'all' | 'available' | 'installed') => {
        setState((prev) => ({ ...prev, installFilter: filter }));
        saveInstallFilter(filter);
    }, []);

    // Set search query
    const setSearchQuery = useCallback((query: string) => {
        setState((prev) => ({ ...prev, searchQuery: query }));
        saveSearchQuery(query);
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null, packagesError: null }));
    }, []);

    // Refresh all data
    const refresh = useCallback(async () => {
        await loadStores();
        setState((prev) => {
            void loadCategories(prev.activeStore ?? undefined);
            return prev;
        });
        await loadPackages();
    }, [loadStores, loadCategories, loadPackages]);

    // Load initial data on mount
    useEffect(() => {
        void loadStores();
        void loadCategories(state.activeStore ?? undefined);
    }, [loadStores, loadCategories]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reload categories ONLY when active store changes (not filter - we have all counts cached)
    useEffect(() => {
        void loadCategories(state.activeStore ?? undefined);
    }, [state.activeStore, loadCategories]);

    // Reload packages when filters change
    useEffect(() => {
        void loadPackages();
    }, [
        loadPackages,
        state.activeStore,
        state.activeCategory,
        state.activeTab,
        state.installFilter,
        state.searchQuery,
    ]);

    // Derive categories with correct counts based on current filter
    // This avoids reloading categories on filter changes
    const categoriesWithFilteredCounts = useMemo(() => {
        return state.categories.map((category) => {
            let count: number;
            if (state.installFilter === 'installed') {
                count = category.count_installed;
            } else if (state.installFilter === 'available') {
                count = category.count_available;
            } else {
                count = category.count_all;
            }
            return { ...category, count };
        });
    }, [state.categories, state.installFilter]);

    // Memoize actions to prevent unnecessary re-renders
    const actions: AppActions = useMemo(
        () => ({
            loadStores,
            loadCategories,
            loadPackages,
            setActiveStore,
            setActiveCategory,
            setActiveTab,
            setInstallFilter,
            setSearchQuery,
            clearError,
            refresh,
        }),
        [
            loadStores,
            loadCategories,
            loadPackages,
            setActiveStore,
            setActiveCategory,
            setActiveTab,
            setInstallFilter,
            setSearchQuery,
            clearError,
            refresh,
        ]
    );

    return (
        <AppContext.Provider
            value={{ state: { ...state, categories: categoriesWithFilteredCounts }, actions }}
        >
            {children}
        </AppContext.Provider>
    );
}

/**
 * Hook to use app context
 */
export function useApp(): AppContextType {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}
