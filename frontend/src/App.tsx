/**
 * Main application component for Cockpit Container Apps.
 *
 * Provides routing between Store view and Installed view,
 * with state management via AppContext.
 */

import { Flex, FlexItem, Page, PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { CubesIcon, LayerGroupIcon } from '@patternfly/react-icons';
import React, { useCallback, useState } from 'react';
import type { Package } from './api/types';
import { AppDetails } from './components/AppDetails';
import { AppListView } from './components/AppListView';
import { CategoriesView } from './components/CategoriesView';
import { FilterToggleGroup } from './components/FilterToggleGroup';
import { AppProvider, useApp } from './context/AppContext';
import { InstalledAppsView } from './views/InstalledAppsView';

// Route types
type Route = 'store' | 'category' | 'app';

interface RouterState {
    route: Route;
    selectedPackage?: Package;
    selectedCategory?: string;
}

/**
 * Inner App component that uses the context
 */
function AppContent(): React.ReactElement {
    const { state, actions } = useApp();
    const [router, setRouter] = useState<RouterState>({ route: 'store' });
    const [actionInProgress, setActionInProgress] = useState(false);

    // Navigate to a category's apps
    const handleCategorySelect = useCallback(
        (categoryId: string) => {
            actions.setActiveCategory(categoryId);
            setRouter({ route: 'category', selectedCategory: categoryId });
        },
        [actions]
    );

    // Navigate to app details
    const handleAppSelect = useCallback(
        (pkg: Package) => {
            setRouter({ ...router, route: 'app', selectedPackage: pkg });
        },
        [router]
    );

    // Navigate back from app details
    const handleBack = useCallback(() => {
        if (router.selectedCategory) {
            setRouter({ route: 'category', selectedCategory: router.selectedCategory });
        } else {
            setRouter({ route: 'store' });
        }
    }, [router.selectedCategory]);

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

                // Update the selected package with fresh data from reloaded state
                setRouter((currentRouter) => {
                    if (currentRouter.route === 'app' && currentRouter.selectedPackage) {
                        // Find the updated package in state.packages
                        const updatedPkg = state.packages.find((p) => p.name === pkg.name);
                        if (updatedPkg) {
                            // Update router with fresh package data
                            return {
                                ...currentRouter,
                                selectedPackage: updatedPkg,
                            };
                        }
                    }
                    return currentRouter;
                });
            } catch (error) {
                console.error('Install failed:', error);
                throw error;
            } finally {
                setActionInProgress(false);
            }
        },
        [actions, state.packages]
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
                setRouter((currentRouter) => {
                    if (currentRouter.selectedCategory) {
                        return { route: 'category', selectedCategory: currentRouter.selectedCategory };
                    } else {
                        return { route: 'store' };
                    }
                });
            } catch (error) {
                console.error('Remove failed:', error);
                throw error;
            } finally {
                setActionInProgress(false);
            }
        },
        [actions]
    );

    // Handle store tab change
    const handleStoreTabChange = useCallback(
        (_event: React.MouseEvent<HTMLElement, MouseEvent>, tabIndex: number | string) => {
            const storeIndex = typeof tabIndex === 'number' ? tabIndex : parseInt(tabIndex, 10);
            const selectedStore = state.stores[storeIndex];
            if (selectedStore) {
                actions.setActiveStore(selectedStore.id);
                actions.setActiveCategory(null);
                setRouter({ route: 'store' });
            }
        },
        [actions, state.stores]
    );

    // Handle install filter change
    const handleFilterChange = useCallback(
        (filter: 'all' | 'available' | 'installed') => {
            actions.setInstallFilter(filter);
        },
        [actions]
    );

    // Render content based on route
    const renderContent = () => {
        // Show app details
        if (router.route === 'app' && router.selectedPackage) {
            return (
                <AppDetails
                    pkg={router.selectedPackage}
                    onInstall={handleInstall}
                    onUninstall={handleUninstall}
                    onBack={handleBack}
                    isActionInProgress={actionInProgress}
                />
            );
        }

        // Show category apps
        if (router.route === 'category') {
            return (
                <AppListView
                    packages={state.packages}
                    isLoading={state.packagesLoading}
                    error={state.packagesError}
                    onSelect={handleAppSelect}
                    onRetry={actions.loadPackages}
                    title={state.categories.find((c) => c.id === router.selectedCategory)?.label}
                    totalCount={state.packages.length}
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

                    {/* Install filter toggle */}
                    <FlexItem>
                        <FilterToggleGroup
                            selectedFilter={state.installFilter}
                            onFilterChange={handleFilterChange}
                        />
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
