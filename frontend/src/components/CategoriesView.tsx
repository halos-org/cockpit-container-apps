/**
 * CategoriesView Component
 *
 * Displays a grid of category cards for browsing available categories.
 * Handles loading, error, and empty states.
 */

import {
    Button,
    EmptyState,
    EmptyStateActions,
    EmptyStateBody,
    EmptyStateFooter,
    Flex,
    FlexItem,
    Gallery,
    GalleryItem,
    PageSection,
    Spinner,
    Title,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import type { Category } from '../api/types';
import { BreadcrumbNav } from './BreadcrumbNav';
import { CategoryCard } from './CategoryCard';

export interface CategoriesViewProps {
    /** Categories to display */
    categories: Category[];
    /** Whether categories are loading */
    isLoading: boolean;
    /** Error message if loading failed */
    error: string | null;
    /** Callback when user navigates to a category */
    onNavigate: (categoryId: string) => void;
    /** Callback to retry loading */
    onRetry: () => void;
    /** Optional title for the view */
    title?: string;
    /** Whether package lists are being updated */
    updatingPackageLists?: boolean;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
    categories,
    isLoading,
    error,
    onNavigate,
    onRetry,
    title,
    updatingPackageLists,
}) => {
    // Loading state
    if (isLoading) {
        return (
            <PageSection>
                <EmptyState titleText="Loading categories..." headingLevel="h3">
                    <EmptyStateBody>
                        <Spinner size="xl" aria-label="Loading categories" />
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
                    titleText="Failed to load categories"
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

    // Empty state - show updating message if apt update is in progress
    if (categories.length === 0) {
        if (updatingPackageLists) {
            return (
                <PageSection>
                    <EmptyState titleText="Updating package lists..." headingLevel="h3">
                        <EmptyStateBody>
                            <Spinner size="xl" aria-label="Updating package lists" />
                        </EmptyStateBody>
                    </EmptyState>
                </PageSection>
            );
        }

        return (
            <PageSection>
                <EmptyState titleText="No categories available" icon={CubesIcon} headingLevel="h2">
                    <EmptyStateBody>
                        There are no categories available in this store.
                    </EmptyStateBody>
                </EmptyState>
            </PageSection>
        );
    }

    // Categories grid
    return (
        <PageSection>
            <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
                <FlexItem>
                    <BreadcrumbNav level="categories" />
                </FlexItem>
                {title && (
                    <FlexItem>
                        <Title headingLevel="h1">{title}</Title>
                    </FlexItem>
                )}
                <FlexItem>
                    <Gallery hasGutter minWidths={{ default: '280px' }}>
                        {categories.map((category) => (
                            <GalleryItem key={category.id}>
                                <CategoryCard category={category} onNavigate={onNavigate} />
                            </GalleryItem>
                        ))}
                    </Gallery>
                </FlexItem>
            </Flex>
        </PageSection>
    );
};
