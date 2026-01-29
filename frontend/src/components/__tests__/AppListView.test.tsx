/**
 * Tests for AppListView component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Package } from '../../api/types';
import { AppListView } from '../AppListView';

const mockPackages: Package[] = [
    {
        name: 'signalk-server',
        displayName: '',
        version: '2.8.0',
        summary: 'Signal K marine data server',
        section: 'navigation',
        installed: false,
        upgradable: false,
        categories: ['navigation'],
    },
    {
        name: 'influxdb',
        displayName: '',
        version: '2.7.1',
        summary: 'Time series database',
        section: 'database',
        installed: true,
        upgradable: false,
        categories: ['database'],
    },
    {
        name: 'grafana',
        displayName: '',
        version: '10.0.0',
        summary: 'Analytics and visualization',
        section: 'monitoring',
        installed: true,
        upgradable: true,
        categories: ['monitoring'],
    },
];

describe('AppListView', () => {
    it('renders loading state', () => {
        render(
            <AppListView
                packages={[]}
                isLoading
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
            />
        );
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders error state with retry button', async () => {
        const handleRetry = vi.fn();
        render(
            <AppListView
                packages={[]}
                isLoading={false}
                error="Network error"
                onSelect={vi.fn()}
                onRetry={handleRetry}
            />
        );

        expect(screen.getByRole('heading', { name: /failed to load/i })).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /retry/i }));
        expect(handleRetry).toHaveBeenCalled();
    });

    it('renders empty state when no packages', () => {
        render(
            <AppListView
                packages={[]}
                isLoading={false}
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
            />
        );
        expect(screen.getByRole('heading', { name: /no apps/i })).toBeInTheDocument();
    });

    it('renders app cards in a grid', () => {
        render(
            <AppListView
                packages={mockPackages}
                isLoading={false}
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
            />
        );

        expect(screen.getByText('signalk-server')).toBeInTheDocument();
        expect(screen.getByText('influxdb')).toBeInTheDocument();
        expect(screen.getByText('grafana')).toBeInTheDocument();
    });

    it('calls onSelect with package when card clicked', async () => {
        const handleSelect = vi.fn();
        render(
            <AppListView
                packages={mockPackages}
                isLoading={false}
                error={null}
                onSelect={handleSelect}
                onRetry={vi.fn()}
            />
        );

        // Find the signalk-server card and click it
        const cards = screen.getAllByRole('button');
        const signalkCard = cards.find((card) => card.textContent?.includes('signalk-server'));
        expect(signalkCard).toBeDefined();
        await userEvent.click(signalkCard!);

        expect(handleSelect).toHaveBeenCalledWith(mockPackages[0]);
    });

    it('renders title when provided', () => {
        render(
            <AppListView
                packages={mockPackages}
                isLoading={false}
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
                title="Available Apps"
            />
        );

        expect(screen.getByText('Available Apps')).toBeInTheDocument();
    });

    it('shows total count when provided', () => {
        render(
            <AppListView
                packages={mockPackages}
                isLoading={false}
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
                totalCount={100}
            />
        );

        expect(screen.getByText(/100/)).toBeInTheDocument();
    });
});
