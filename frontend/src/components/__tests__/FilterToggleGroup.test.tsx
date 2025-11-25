/**
 * Tests for FilterToggleGroup component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterToggleGroup } from '../FilterToggleGroup';

describe('FilterToggleGroup', () => {
    it('renders all three filter options', () => {
        render(<FilterToggleGroup selectedFilter="all" onFilterChange={vi.fn()} />);

        expect(screen.getByText('All Apps')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
        expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    it('shows "All Apps" as selected by default', () => {
        render(<FilterToggleGroup selectedFilter="all" onFilterChange={vi.fn()} />);

        const allAppsButton = screen.getByText('All Apps').closest('button');
        expect(allAppsButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows "Available" as selected when prop is "available"', () => {
        render(<FilterToggleGroup selectedFilter="available" onFilterChange={vi.fn()} />);

        const availableButton = screen.getByText('Available').closest('button');
        expect(availableButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows "Installed" as selected when prop is "installed"', () => {
        render(<FilterToggleGroup selectedFilter="installed" onFilterChange={vi.fn()} />);

        const installedButton = screen.getByText('Installed').closest('button');
        expect(installedButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onFilterChange with "all" when All Apps is clicked', async () => {
        const handleFilterChange = vi.fn();
        render(<FilterToggleGroup selectedFilter="installed" onFilterChange={handleFilterChange} />);

        const allAppsButton = screen.getByText('All Apps');
        await userEvent.click(allAppsButton);

        expect(handleFilterChange).toHaveBeenCalledWith('all');
    });

    it('calls onFilterChange with "available" when Available is clicked', async () => {
        const handleFilterChange = vi.fn();
        render(<FilterToggleGroup selectedFilter="all" onFilterChange={handleFilterChange} />);

        const availableButton = screen.getByText('Available');
        await userEvent.click(availableButton);

        expect(handleFilterChange).toHaveBeenCalledWith('available');
    });

    it('calls onFilterChange with "installed" when Installed is clicked', async () => {
        const handleFilterChange = vi.fn();
        render(<FilterToggleGroup selectedFilter="all" onFilterChange={handleFilterChange} />);

        const installedButton = screen.getByText('Installed');
        await userEvent.click(installedButton);

        expect(handleFilterChange).toHaveBeenCalledWith('installed');
    });

    it('does not call onFilterChange when clicking already selected filter', async () => {
        const handleFilterChange = vi.fn();
        render(<FilterToggleGroup selectedFilter="all" onFilterChange={handleFilterChange} />);

        const allAppsButton = screen.getByText('All Apps');
        await userEvent.click(allAppsButton);

        expect(handleFilterChange).not.toHaveBeenCalled();
    });

    it('has proper ARIA labels for accessibility', () => {
        const { container } = render(<FilterToggleGroup selectedFilter="all" onFilterChange={vi.fn()} />);

        const toggleGroup = container.querySelector('[role="group"]');
        expect(toggleGroup).toHaveAttribute('aria-label', 'Filter packages by installation status');
    });
});
