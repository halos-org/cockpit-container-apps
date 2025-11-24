/**
 * CategoryCard Component
 *
 * Displays a single category as a clickable card with label, count, and optional icon/description.
 * Used in the category browsing view.
 */

import { Badge, Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import React from 'react';
import type { Category } from '../api/types';

export interface CategoryCardProps {
    /** Category data to display */
    category: Category;
    /** Callback when user clicks on the card */
    onNavigate: (categoryId: string) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onNavigate }) => {
    const handleClick = () => {
        onNavigate(category.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <Card
            isClickable
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            style={{ height: '100%' }}
            tabIndex={0}
            role="button"
            aria-label={`View ${category.count} app${category.count !== 1 ? 's' : ''} in ${category.label}`}
        >
            <CardHeader>
                <CubesIcon
                    style={{
                        fontSize: '2rem',
                        color: 'var(--pf-v6-global--primary-color--100)',
                    }}
                />
            </CardHeader>

            <CardTitle>{category.label}</CardTitle>

            <CardBody>
                <div>
                    <Badge isRead>
                        {category.count} app{category.count !== 1 ? 's' : ''}
                    </Badge>
                </div>
                {category.description && (
                    <div
                        style={{
                            marginTop: '0.5rem',
                            fontSize: '0.875rem',
                            color: 'var(--pf-v6-global--Color--200)',
                        }}
                    >
                        {category.description}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};
