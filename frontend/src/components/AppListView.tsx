/**
 * AppListView Component
 *
 * Displays a grid of app cards for browsing available applications.
 * Handles loading, error, and empty states.
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
    Title,
} from '@patternfly/react-core';
import { CubeIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import type { Package } from '../api/types';
import { AppCard } from './AppCard';

export interface AppListViewProps {
    /** Packages to display */
    packages: Package[];
    /** Whether packages are loading */
    isLoading: boolean;
    /** Error message if loading failed */
    error: string | null;
    /** Callback when user selects a package */
    onSelect: (pkg: Package) => void;
    /** Callback to retry loading */
    onRetry: () => void;
    /** Optional title for the view */
    title?: string;
    /** Total count of packages (may be more than displayed) */
    totalCount?: number;
}

export const AppListView: React.FC<AppListViewProps> = ({
    packages,
    isLoading,
    error,
    onSelect,
    onRetry,
    title,
    totalCount,
}) => {
    // Loading state
    if (isLoading) {
        return (
            <PageSection>
                <EmptyState titleText="Loading apps..." headingLevel="h3">
                    <EmptyStateBody>
                        <Spinner size="xl" aria-label="Loading apps" />
                    </EmptyStateBody>
                </EmptyState>
            </PageSection>
        );
    }

    // Error state
    if (error) {
        return (
            <PageSection>
                <EmptyState
                    titleText="Failed to load apps"
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
                <EmptyState titleText="No apps available" icon={CubeIcon} headingLevel="h2">
                    <EmptyStateBody>
                        There are no apps matching your current filters.
                    </EmptyStateBody>
                </EmptyState>
            </PageSection>
        );
    }

    // Packages grid
    return (
        <PageSection>
            {(title || totalCount !== undefined) && (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    {title && <Title headingLevel="h2">{title}</Title>}
                    {totalCount !== undefined && (
                        <Badge isRead style={{ marginLeft: '0.5rem' }}>
                            {totalCount} total
                        </Badge>
                    )}
                </div>
            )}
            <Gallery hasGutter minWidths={{ default: '280px' }}>
                {packages.map((pkg) => (
                    <GalleryItem key={pkg.name}>
                        <AppCard pkg={pkg} onSelect={onSelect} />
                    </GalleryItem>
                ))}
            </Gallery>
        </PageSection>
    );
};
