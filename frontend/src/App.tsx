/**
 * Main application component for Cockpit Container Apps.
 *
 * Provides routing between Store view and Installed view,
 * with state management via AppContext.
 */

import { Page, PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { CubesIcon, LayerGroupIcon } from '@patternfly/react-icons';
import React, { useCallback, useState } from 'react';
import type { Package } from './api/types';
import { AppDetails } from './components/AppDetails';
import { AppListView } from './components/AppListView';
import { CategoriesView } from './components/CategoriesView';
import { AppProvider, useApp } from './context/AppContext';
import { InstalledAppsView } from './views/InstalledAppsView';

// Route types
type Route = 'store' | 'installed' | 'category' | 'app';

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
            setRouter({
                route:
                    router.route === 'app' && state.activeTab === 'installed'
                        ? 'installed'
                        : 'store',
            });
        }
    }, [router.selectedCategory, router.route, state.activeTab]);

    // Handle install action
    const handleInstall = useCallback(
        async (pkg: Package) => {
            setActionInProgress(true);
            try {
                // TODO: Implement actual install via cockpit.spawn
                console.log('Installing:', pkg.name);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                await actions.refresh();
            } finally {
                setActionInProgress(false);
            }
        },
        [actions]
    );

    // Handle uninstall action
    const handleUninstall = useCallback(
        async (pkg: Package) => {
            setActionInProgress(true);
            try {
                // TODO: Implement actual uninstall via cockpit.spawn
                console.log('Uninstalling:', pkg.name);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                await actions.refresh();
            } finally {
                setActionInProgress(false);
            }
        },
        [actions]
    );

    // Handle tab change
    const handleTabChange = useCallback(
        (_event: React.MouseEvent<HTMLElement, MouseEvent>, tabIndex: number | string) => {
            if (tabIndex === 0) {
                // Store tab
                actions.setActiveTab('available');
                actions.setActiveCategory(null);
                setRouter({ route: 'store' });
            } else if (tabIndex === 1) {
                // Installed tab
                actions.setActiveTab('installed');
                setRouter({ route: 'installed' });
            }
        },
        [actions]
    );

    // Packages are already filtered by backend based on activeCategory and activeTab
    const installedPackages = state.packages;
    const categoryPackages = state.packages;

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

        // Show installed apps
        if (router.route === 'installed') {
            return (
                <InstalledAppsView
                    packages={installedPackages}
                    isLoading={state.packagesLoading}
                    error={state.packagesError}
                    onSelect={handleAppSelect}
                    onRetry={actions.loadPackages}
                />
            );
        }

        // Show category apps
        if (router.route === 'category') {
            return (
                <AppListView
                    packages={categoryPackages}
                    isLoading={state.packagesLoading}
                    error={state.packagesError}
                    onSelect={handleAppSelect}
                    onRetry={actions.loadPackages}
                    title={state.categories.find((c) => c.id === router.selectedCategory)?.label}
                    totalCount={categoryPackages.length}
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

    // Determine active tab
    const getActiveTab = () => {
        if (router.route === 'installed') {
            return 1;
        }
        return 0; // store, category, app
    };

    return (
        <Page id="container-apps" className="pf-m-no-sidebar">
            <PageSection hasBodyWrapper={false}>
                <Tabs
                    activeKey={getActiveTab()}
                    onSelect={handleTabChange}
                    isBox={false}
                    aria-label="Container Apps navigation"
                >
                    <Tab
                        eventKey={0}
                        title={
                            <TabTitleText>
                                <LayerGroupIcon /> Store
                            </TabTitleText>
                        }
                    />
                    <Tab
                        eventKey={1}
                        title={
                            <TabTitleText>
                                <CubesIcon /> Installed
                            </TabTitleText>
                        }
                    />
                </Tabs>
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
