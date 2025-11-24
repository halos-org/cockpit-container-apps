/**
 * Main application component for Cockpit Container Apps.
 *
 * Provides routing between Store view and Installed view,
 * with state management via AppContext.
 */

import {
    Brand,
    Masthead,
    MastheadBrand,
    MastheadContent,
    MastheadMain,
    Nav,
    NavItem,
    NavList,
    Page,
    PageSidebar,
    PageSidebarBody,
    Spinner,
} from '@patternfly/react-core';
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
    const handleCategorySelect = useCallback((categoryId: string) => {
        actions.setActiveCategory(categoryId);
        setRouter({ route: 'category', selectedCategory: categoryId });
    }, [actions]);

    // Navigate to app details
    const handleAppSelect = useCallback((pkg: Package) => {
        setRouter({ ...router, route: 'app', selectedPackage: pkg });
    }, [router]);

    // Navigate back from app details
    const handleBack = useCallback(() => {
        if (router.selectedCategory) {
            setRouter({ route: 'category', selectedCategory: router.selectedCategory });
        } else {
            setRouter({ route: router.route === 'app' && state.activeTab === 'installed' ? 'installed' : 'store' });
        }
    }, [router.selectedCategory, state.activeTab]);

    // Handle install action
    const handleInstall = useCallback(async (pkg: Package) => {
        setActionInProgress(true);
        try {
            // TODO: Implement actual install via cockpit.spawn
            console.log('Installing:', pkg.name);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await actions.refresh();
        } finally {
            setActionInProgress(false);
        }
    }, [actions]);

    // Handle uninstall action
    const handleUninstall = useCallback(async (pkg: Package) => {
        setActionInProgress(true);
        try {
            // TODO: Implement actual uninstall via cockpit.spawn
            console.log('Uninstalling:', pkg.name);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await actions.refresh();
        } finally {
            setActionInProgress(false);
        }
    }, [actions]);

    // Navigate via sidebar
    const handleNavSelect = useCallback(
        (_event: React.FormEvent<HTMLInputElement>, selectedItem: { itemId: number | string }) => {
            const route = selectedItem.itemId as Route;
            if (route === 'installed') {
                actions.setActiveTab('installed');
            } else {
                actions.setActiveTab('available');
                actions.setActiveCategory(null);
            }
            setRouter({ route });
        },
        [actions]
    );

    // Filter packages for display
    const installedPackages = state.packages.filter((pkg) => pkg.installed);
    const categoryPackages = router.selectedCategory
        ? state.packages.filter((pkg) => pkg.section === router.selectedCategory)
        : state.packages;

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

    // Masthead with brand
    const masthead = (
        <Masthead>
            <MastheadMain>
                <MastheadBrand>
                    <Brand
                        src="/images/logo.svg"
                        alt="Container Apps"
                        heights={{ default: '36px' }}
                    >
                        <span style={{ marginLeft: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
                            Container Apps
                        </span>
                    </Brand>
                </MastheadBrand>
            </MastheadMain>
            <MastheadContent>
                {(state.loading || state.packagesLoading) && <Spinner size="md" />}
            </MastheadContent>
        </Masthead>
    );

    // Sidebar navigation
    const sidebar = (
        <PageSidebar>
            <PageSidebarBody>
                <Nav onSelect={handleNavSelect}>
                    <NavList>
                        <NavItem
                            itemId="store"
                            isActive={router.route === 'store' || router.route === 'category'}
                        >
                            Store
                        </NavItem>
                        <NavItem itemId="installed" isActive={router.route === 'installed'}>
                            Installed
                        </NavItem>
                    </NavList>
                </Nav>
            </PageSidebarBody>
        </PageSidebar>
    );

    return (
        <Page masthead={masthead} sidebar={sidebar}>
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
