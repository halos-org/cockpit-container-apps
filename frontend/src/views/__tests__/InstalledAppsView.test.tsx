/**
 * Tests for InstalledAppsView component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Package } from '../../api/types';
import { InstalledAppsView } from '../InstalledAppsView';

const mockInstalledPackages: Package[] = [
    {
        name: 'signalk-server',
        version: '2.8.0',
        summary: 'Signal K marine data server',
        section: 'navigation',
        installed: true,
        upgradable: false,
        categories: ['navigation'],
    },
    {
        name: 'grafana',
        version: '10.0.0',
        summary: 'Analytics and visualization',
        section: 'monitoring',
        installed: true,
        upgradable: true,
        categories: ['monitoring'],
    },
];

describe('InstalledAppsView', () => {
    it('renders page title', () => {
        render(
            <InstalledAppsView
                packages={mockInstalledPackages}
                isLoading={false}
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
            />
        );
        expect(screen.getByText(/installed apps/i)).toBeInTheDocument();
    });

    it('renders loading state', () => {
        render(
            <InstalledAppsView
                packages={[]}
                isLoading
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
            />
        );
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders error state', async () => {
        const handleRetry = vi.fn();
        render(
            <InstalledAppsView
                packages={[]}
                isLoading={false}
                error="Connection failed"
                onSelect={vi.fn()}
                onRetry={handleRetry}
            />
        );

        expect(screen.getByText('Connection failed')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /retry/i }));
        expect(handleRetry).toHaveBeenCalled();
    });

    it('renders empty state when no installed apps', () => {
        render(
            <InstalledAppsView
                packages={[]}
                isLoading={false}
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
            />
        );
        expect(screen.getByRole('heading', { name: /no apps installed/i })).toBeInTheDocument();
    });

    it('renders installed app cards', () => {
        render(
            <InstalledAppsView
                packages={mockInstalledPackages}
                isLoading={false}
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
            />
        );

        expect(screen.getByText('signalk-server')).toBeInTheDocument();
        expect(screen.getByText('grafana')).toBeInTheDocument();
    });

    it('shows upgradable filter tab', () => {
        render(
            <InstalledAppsView
                packages={mockInstalledPackages}
                isLoading={false}
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
            />
        );

        expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /updates/i })).toBeInTheDocument();
    });

    it('filters to show only upgradable when updates tab clicked', async () => {
        render(
            <InstalledAppsView
                packages={mockInstalledPackages}
                isLoading={false}
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
            />
        );

        await userEvent.click(screen.getByRole('tab', { name: /updates/i }));

        // Only grafana should be visible (it's upgradable)
        expect(screen.getByText('grafana')).toBeInTheDocument();
        expect(screen.queryByText('signalk-server')).not.toBeInTheDocument();
    });

    it('calls onSelect when app card clicked', async () => {
        const handleSelect = vi.fn();
        render(
            <InstalledAppsView
                packages={mockInstalledPackages}
                isLoading={false}
                error={null}
                onSelect={handleSelect}
                onRetry={vi.fn()}
            />
        );

        // Find and click the signalk-server card
        const cards = screen.getAllByRole('button');
        const signalkCard = cards.find((card) => card.textContent?.includes('signalk-server'));
        expect(signalkCard).toBeDefined();
        await userEvent.click(signalkCard!);

        expect(handleSelect).toHaveBeenCalledWith(mockInstalledPackages[0]);
    });

    it('shows count of installed apps', () => {
        render(
            <InstalledAppsView
                packages={mockInstalledPackages}
                isLoading={false}
                error={null}
                onSelect={vi.fn()}
                onRetry={vi.fn()}
            />
        );

        // Count appears in header badge and "All" tab badge
        const counts = screen.getAllByText('2');
        expect(counts.length).toBeGreaterThan(0);
    });
});
