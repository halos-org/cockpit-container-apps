/**
 * StoreSelector Component
 *
 * Dropdown selector for filtering by container store.
 * Shows "All Stores" when no specific store is selected.
 */

import { MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import React, { useState } from 'react';
import type { Store } from '../api/types';

export interface StoreSelectorProps {
    /** Available stores to select from */
    stores: Store[];
    /** Currently selected store ID, null for "All Stores" */
    selectedStoreId: string | null;
    /** Callback when user selects a store */
    onSelect: (storeId: string | null) => void;
    /** Whether the selector is in loading state */
    isLoading?: boolean;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
    stores,
    selectedStoreId,
    onSelect,
    isLoading = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const selectedStore = stores.find((s) => s.id === selectedStoreId);
    const toggleText = selectedStore?.name ?? 'All Stores';

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleSelect = (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
        if (value === '__all__') {
            onSelect(null);
        } else if (typeof value === 'string') {
            onSelect(value);
        }
        setIsOpen(false);
    };

    const isDisabled = isLoading || stores.length === 0;

    return (
        <Select
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            onSelect={handleSelect}
            toggle={(toggleRef) => (
                <MenuToggle
                    ref={toggleRef}
                    onClick={handleToggle}
                    isExpanded={isOpen}
                    isDisabled={isDisabled}
                >
                    {toggleText}
                </MenuToggle>
            )}
            selected={selectedStoreId ?? '__all__'}
        >
            <SelectList>
                <SelectOption value="__all__">All Stores</SelectOption>
                {stores.map((store) => (
                    <SelectOption key={store.id} value={store.id}>
                        {store.name}
                    </SelectOption>
                ))}
            </SelectList>
        </Select>
    );
};
