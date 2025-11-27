/**
 * Main application component for Cockpit Container Apps.
 *
 * Provides routing between Store view and Installed view,
 * with state management via AppContext.
 */

import {
    Button,
    Flex,
    FlexItem,
    Page,
    PageSection,
    Tab,
    Tabs,
    TabTitleText,
    Tooltip,
} from '@patternfly/react-core';
import { SyncIcon } from '@patternfly/react-icons';
import React, { useCallback, useEffect, useState } from 'react';
import type { Package } from './api/types';
import { AppDetails } from './components/AppDetails';
import { AppListView } from './components/AppListView';
import { CategoriesView } from './components/CategoriesView';
import { FilterToggleGroup } from './components/FilterToggleGroup';
import { AppProvider, useApp } from './context/AppContext';
import { useUrlBasedNavigation } from './hooks/useUrlBasedNavigation';
import { getCurrentLocation, navigateTo } from './utils/cockpitHelpers';
import { buildLocationFromRouter, getInitialRouterState, type RouterState } from './utils/routing';

/**
 * Inner App component that uses the context
 */
function AppContent(): React.ReactElement {
    const { state, actions } = useApp();
    const [router, setRouter] = useState<RouterState>(() => {
        // Initialize from URL on mount
        const location = getCurrentLocation();
        if (location) {
            return getInitialRouterState(location).router;
        }
        return { route: 'store' };
    });
    const [actionInProgress, setActionInProgress] = useState(false);

    // Centralized URL-based navigation management
    useUrlBasedNavigation({ state, actions, setRouter });

    // Sync selected package with state updates (for install/uninstall refresh)
    useEffect(() => {
        if (router.route === 'app' && router.selectedPackage) {
            // Search in allPackages (unfiltered) to find the updated package
            // Don't use state.packages as it may be filtered out after install/uninstall
            const updatedPkg = state.allPackages.find((p) => p.name === router.selectedPackage?.name);
            if (updatedPkg && updatedPkg.installed !== router.selectedPackage.installed) {
                // Package install state changed - update router
                setRouter((current) =>
                    current.route === 'app'
                        ? { ...current, selectedPackage: updatedPkg }
                        : current
                );
            }
        }
    }, [state.allPackages, router]);

    // Navigate to a category's apps
    const handleCategorySelect = useCallback(
        (categoryId: string) => {
            actions.setActiveCategory(categoryId);
            const newRouter: RouterState = { route: 'category', selectedCategory: categoryId };
            setRouter(newRouter);

            // Update URL
            const location = buildLocationFromRouter(
                newRouter,
                state.activeStore ?? undefined,
                state.installFilter
            );
            navigateTo(location.path, location.options);
        },
        [actions, state.activeStore, state.installFilter]
    );

    // Navigate to app details
    const handleAppSelect = useCallback(
        (pkg: Package) => {
            const newRouter: RouterState = {
                route: 'app',
                selectedPackage: pkg,
                appName: pkg.name,
            };
            setRouter(newRouter);

            // Update URL
            const location = buildLocationFromRouter(
                newRouter,
                state.activeStore ?? undefined,
                state.installFilter
            );
            navigateTo(location.path, location.options);
        },
        [state.activeStore, state.installFilter]
    );

    // Navigate back from app details
    const handleBack = useCallback(() => {
        let newRouter: RouterState;
        // Go back to category view if we came from one, otherwise to store view
        if (state.activeCategory) {
            newRouter = { route: 'category', selectedCategory: state.activeCategory };
        } else {
            newRouter = { route: 'store' };
        }
        setRouter(newRouter);

        // Update URL
        const location = buildLocationFromRouter(
            newRouter,
            state.activeStore ?? undefined,
            state.installFilter
        );
        navigateTo(location.path, location.options);
    }, [state.activeCategory, state.activeStore, state.installFilter]);

    // Navigate to categories view (from breadcrumb)
    const handleNavigateToCategories = useCallback(() => {
        const newRouter: RouterState = { route: 'store' };
        setRouter(newRouter);

        // Update URL
        const location = buildLocationFromRouter(
            newRouter,
            state.activeStore ?? undefined,
            state.installFilter
        );
        navigateTo(location.path, location.options);
    }, [state.activeStore, state.installFilter]);

    // Handle install action
    const handleInstall = useCallback(
        async (pkg: Package) => {
            setActionInProgress(true);
            try {
                const { installPackage } = await import('./api');
                await installPackage(pkg.name, (percentage, message) => {
                    console.log(`Install progress: ${percentage}% - ${message}`);
                });

                // Refresh data to get updated package states
                await actions.refresh();

                // Update router with the new package state immediately
                // Wait a tick for state to update, then find the updated package
                setTimeout(() => {
                    setRouter((current) => {
                        if (current.route === 'app' && current.selectedPackage) {
                            const updatedPkg = state.allPackages.find(
                                (p) => p.name === current.selectedPackage?.name
                            );
                            if (updatedPkg) {
                                return { ...current, selectedPackage: updatedPkg };
                            }
                        }
                        return current;
                    });
                    setActionInProgress(false);
                }, 0);
            } catch (error) {
                console.error('Install failed:', error);
                setActionInProgress(false);
                throw error;
            }
        },
        [actions, state.allPackages]
    );

    // Handle uninstall action
    const handleUninstall = useCallback(
        async (pkg: Package) => {
            setActionInProgress(true);
            try {
                const { removePackage } = await import('./api');
                await removePackage(pkg.name, (percentage, message) => {
                    console.log(`Remove progress: ${percentage}% - ${message}`);
                });

                // Refresh data to get updated package states
                await actions.refresh();

                // Navigate back to the list view to show updated state
                // This matches cockpit-apt behavior after remove
                const newRouter: RouterState = state.activeCategory
                    ? { route: 'category', selectedCategory: state.activeCategory }
                    : { route: 'store' };

                setRouter(newRouter);

                // Update URL
                const location = buildLocationFromRouter(
                    newRouter,
                    state.activeStore ?? undefined,
                    state.installFilter
                );
                navigateTo(location.path, location.options);
                setActionInProgress(false);
            } catch (error) {
                console.error('Remove failed:', error);
                setActionInProgress(false);
                throw error;
            }
        },
        [actions, state.activeCategory, state.activeStore, state.installFilter]
    );

    // Handle store tab change
    const handleStoreTabChange = useCallback(
        (_event: React.MouseEvent<HTMLElement, MouseEvent>, tabIndex: number | string) => {
            const storeIndex = typeof tabIndex === 'number' ? tabIndex : parseInt(tabIndex, 10);
            const selectedStore = state.stores[storeIndex];
            if (selectedStore) {
                // Don't reload if clicking on already-active store
                if (selectedStore.id === state.activeStore) {
                    return;
                }

                actions.setActiveStore(selectedStore.id);
                actions.setActiveCategory(null);
                const newRouter: RouterState = { route: 'store' };
                setRouter(newRouter);

                // Update URL with new store
                const location = buildLocationFromRouter(
                    newRouter,
                    selectedStore.id,
                    state.installFilter
                );
                navigateTo(location.path, location.options);
            }
        },
        [actions, state.stores, state.installFilter, state.activeStore]
    );

    // Handle install filter change
    const handleFilterChange = useCallback(
        (filter: 'all' | 'available' | 'installed') => {
            actions.setInstallFilter(filter);

            // Update URL with new filter
            const location = buildLocationFromRouter(
                router,
                state.activeStore ?? undefined,
                filter
            );
            navigateTo(location.path, location.options);
        },
        [actions, router, state.activeStore]
    );

    // Handle manual refresh
    const [isRefreshing, setIsRefreshing] = useState(false);
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await actions.refreshPackages();
        } finally {
            setIsRefreshing(false);
        }
    }, [actions]);

    // Render content based on route
    const renderContent = () => {
        // Show app details
        if (router.route === 'app' && router.selectedPackage) {
            const category = state.categories.find((c) => c.id === state.activeCategory);
            return (
                <AppDetails
                    pkg={router.selectedPackage}
                    onInstall={handleInstall}
                    onUninstall={handleUninstall}
                    onBack={handleBack}
                    isActionInProgress={actionInProgress}
                    categoryId={state.activeCategory ?? undefined}
                    categoryLabel={category?.label}
                    onNavigateToCategories={handleNavigateToCategories}
                    onNavigateToCategory={handleCategorySelect}
                />
            );
        }

        // Show category apps
        if (router.route === 'category') {
            const category = state.categories.find((c) => c.id === router.selectedCategory);
            return (
                <AppListView
                    packages={state.packages}
                    isLoading={state.packagesLoading}
                    error={state.packagesError}
                    onSelect={handleAppSelect}
                    onRetry={actions.loadPackages}
                    title={category?.label}
                    totalCount={state.packages.length}
                    categoryId={router.selectedCategory}
                    categoryLabel={category?.label}
                    onNavigateToCategories={handleNavigateToCategories}
                    onNavigateToCategory={handleCategorySelect}
                />
            );
        }

        // Default: show categories (store view)
        return (
            <CategoriesView
                categories={state.categories}
                isLoading={state.loading}
                error={state.error}
                onNavigate={handleCategorySelect}
                onRetry={() => actions.loadCategories()}
                title="Browse Categories"
            />
        );
    };

    // Determine active store tab index
    const getActiveStoreTab = () => {
        const activeIndex = state.stores.findIndex((store) => store.id === state.activeStore);
        return activeIndex >= 0 ? activeIndex : 0;
    };

    return (
        <Page id="container-apps" className="pf-m-no-sidebar">
            <PageSection hasBodyWrapper={false}>
                <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
                    {/* Store tabs */}
                    {state.stores.length > 0 && (
                        <FlexItem>
                            <Tabs
                                activeKey={getActiveStoreTab()}
                                onSelect={handleStoreTabChange}
                                isBox={false}
                                aria-label="Container store selection"
                            >
                                {state.stores.map((store, index) => (
                                    <Tab
                                        key={store.id}
                                        eventKey={index}
                                        title={<TabTitleText>{store.name}</TabTitleText>}
                                    />
                                ))}
                            </Tabs>
                        </FlexItem>
                    )}

                    {/* Install filter toggle and refresh button */}
                    <FlexItem>
                        <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
                            <FlexItem>
                                <FilterToggleGroup
                                    selectedFilter={state.installFilter}
                                    onFilterChange={handleFilterChange}
                                />
                            </FlexItem>
                            <FlexItem>
                                <Tooltip content="Refresh package data">
                                    <Button
                                        variant="plain"
                                        icon={<SyncIcon />}
                                        onClick={handleRefresh}
                                        isLoading={isRefreshing}
                                        isDisabled={isRefreshing}
                                        aria-label="Refresh package data"
                                    />
                                </Tooltip>
                            </FlexItem>
                        </Flex>
                    </FlexItem>
                </Flex>
            </PageSection>
            {renderContent()}
        </Page>
    );
}

/**
 * Main App component wrapped with context provider
 */
export function App(): React.ReactElement {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}
