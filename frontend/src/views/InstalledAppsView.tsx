/**
 * InstalledAppsView Component
 *
 * Page view showing all installed container apps with optional filtering for updates.
 */

import {
    Badge,
    Button,
    EmptyState,
    EmptyStateActions,
    EmptyStateBody,
    EmptyStateFooter,
    Gallery,
    GalleryItem,
    PageSection,
    Spinner,
    Tab,
    TabTitleText,
    Tabs,
    Title,
} from '@patternfly/react-core';
import { CubeIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import React, { useState } from 'react';
import type { Package } from '../api/types';
import { AppCard } from '../components/AppCard';

export interface InstalledAppsViewProps {
    /** All installed packages */
    packages: Package[];
    /** Whether packages are loading */
    isLoading: boolean;
    /** Error message if loading failed */
    error: string | null;
    /** Callback when user selects a package */
    onSelect: (pkg: Package) => void;
    /** Callback to retry loading */
    onRetry: () => void;
}

type FilterTab = 'all' | 'updates';

export const InstalledAppsView: React.FC<InstalledAppsViewProps> = ({
    packages,
    isLoading,
    error,
    onSelect,
    onRetry,
}) => {
    const [activeTab, setActiveTab] = useState<FilterTab>('all');

    const filteredPackages =
        activeTab === 'updates' ? packages.filter((pkg) => pkg.upgradable) : packages;

    const upgradableCount = packages.filter((pkg) => pkg.upgradable).length;

    // Loading state
    if (isLoading) {
        return (
            <PageSection>
                <Title headingLevel="h1" style={{ marginBottom: '1rem' }}>
                    Installed Apps
                </Title>
                <Spinner aria-label="Loading installed apps" />
            </PageSection>
        );
    }

    // Error state
    if (error) {
        return (
            <PageSection>
                <Title headingLevel="h1" style={{ marginBottom: '1rem' }}>
                    Installed Apps
                </Title>
                <EmptyState
                    titleText="Failed to load installed apps"
                    icon={ExclamationCircleIcon}
                    headingLevel="h2"
                    status="danger"
                >
                    <EmptyStateBody>{error}</EmptyStateBody>
                    <EmptyStateFooter>
                        <EmptyStateActions>
                            <Button variant="primary" onClick={onRetry}>
                                Retry
                            </Button>
                        </EmptyStateActions>
                    </EmptyStateFooter>
                </EmptyState>
            </PageSection>
        );
    }

    // Empty state
    if (packages.length === 0) {
        return (
            <PageSection>
                <Title headingLevel="h1" style={{ marginBottom: '1rem' }}>
                    Installed Apps
                </Title>
                <EmptyState titleText="No apps installed" icon={CubeIcon} headingLevel="h2">
                    <EmptyStateBody>
                        You haven&apos;t installed any apps yet. Browse the store to find apps.
                    </EmptyStateBody>
                </EmptyState>
            </PageSection>
        );
    }

    return (
        <PageSection>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <Title headingLevel="h1">Installed Apps</Title>
                <Badge isRead style={{ marginLeft: '0.5rem' }}>
                    {packages.length}
                </Badge>
            </div>

            {/* Filter tabs */}
            <Tabs
                activeKey={activeTab}
                onSelect={(_event, tabKey) => setActiveTab(tabKey as FilterTab)}
                style={{ marginBottom: '1rem' }}
            >
                <Tab
                    eventKey="all"
                    title={
                        <TabTitleText>
                            All <Badge isRead>{packages.length}</Badge>
                        </TabTitleText>
                    }
                />
                <Tab
                    eventKey="updates"
                    title={
                        <TabTitleText>
                            Updates{' '}
                            <Badge
                                isRead={upgradableCount === 0}
                                style={{
                                    backgroundColor:
                                        upgradableCount > 0
                                            ? 'var(--pf-v6-global--info-color--100)'
                                            : undefined,
                                }}
                            >
                                {upgradableCount}
                            </Badge>
                        </TabTitleText>
                    }
                />
            </Tabs>

            {/* Empty state for filtered view */}
            {filteredPackages.length === 0 ? (
                <EmptyState titleText="No updates available" icon={CubeIcon} headingLevel="h3">
                    <EmptyStateBody>All your installed apps are up to date.</EmptyStateBody>
                </EmptyState>
            ) : (
                <Gallery hasGutter minWidths={{ default: '280px' }}>
                    {filteredPackages.map((pkg) => (
                        <GalleryItem key={pkg.name}>
                            <AppCard pkg={pkg} onSelect={onSelect} />
                        </GalleryItem>
                    ))}
                </Gallery>
            )}
        </PageSection>
    );
};
