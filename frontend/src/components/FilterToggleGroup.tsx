/**
 * FilterToggleGroup component
 *
 * A toggle group for filtering packages by installation status
 */

import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import React from 'react';

export type InstallFilter = 'all' | 'available' | 'installed';

export interface FilterToggleGroupProps {
    selectedFilter: InstallFilter;
    onFilterChange: (filter: InstallFilter) => void;
}

/**
 * FilterToggleGroup allows users to filter packages by installation status
 */
export const FilterToggleGroup: React.FC<FilterToggleGroupProps> = ({
    selectedFilter,
    onFilterChange,
}) => {
    const handleItemClick = (filter: InstallFilter) => () => {
        // Only trigger onChange if clicking a different filter
        if (filter !== selectedFilter) {
            onFilterChange(filter);
        }
    };

    return (
        <ToggleGroup aria-label="Filter packages by installation status">
            <ToggleGroupItem
                text="All Apps"
                aria-pressed={selectedFilter === 'all'}
                isSelected={selectedFilter === 'all'}
                onClick={handleItemClick('all')}
            />
            <ToggleGroupItem
                text="Available"
                aria-pressed={selectedFilter === 'available'}
                isSelected={selectedFilter === 'available'}
                onClick={handleItemClick('available')}
            />
            <ToggleGroupItem
                text="Installed"
                aria-pressed={selectedFilter === 'installed'}
                isSelected={selectedFilter === 'installed'}
                onClick={handleItemClick('installed')}
            />
        </ToggleGroup>
    );
};
