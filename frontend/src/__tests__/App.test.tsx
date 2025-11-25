/**
 * Tests for App component (main router)
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { App } from '../App';
import * as api from '../api';

// Mock the API
vi.mock('../api', () => ({
    listStores: vi.fn().mockResolvedValue([
        {
            id: 'halos-marine',
            name: 'HaLOS Marine',
            description: null,
            icon: null,
            banner: null,
            filters: { sections: [], priorities: [] },
            category_metadata: null,
        },
    ]),
    listCategories: vi.fn().mockResolvedValue([
        {
            id: 'navigation',
            label: 'Navigation',
            icon: null,
            description: 'Nav apps',
            count: 5,
        },
    ]),
    filterPackages: vi.fn().mockResolvedValue({
        packages: [
            {
                name: 'signalk-server',
                version: '2.8.0',
                summary: 'Signal K',
                section: 'navigation',
                installed: false,
                upgradable: false,
            },
        ],
        total_count: 1,
        limited: false,
    }),
    ContainerAppsError: class extends Error {},
}));

// Mock cockpit
const mockLocation = {
    path: '/',
    go: vi.fn(),
};

(globalThis as Record<string, unknown>).cockpit = {
    spawn: vi.fn().mockReturnValue({
        stream: vi.fn().mockReturnThis(),
        done: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
        close: vi.fn().mockReturnThis(),
    }),
    file: vi.fn(),
    location: mockLocation,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
};

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.path = '/';
    });

    it('renders without crashing', async () => {
        render(<App />);
        // Should render the main page layout
        expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('shows store view by default', async () => {
        render(<App />);

        // Store view shows categories with Browse Categories title
        expect(await screen.findByText(/browse categories/i)).toBeInTheDocument();
    });

    describe('Store Tabs', () => {
        it('renders store tabs dynamically based on loaded stores', async () => {
            render(<App />);

            // Should render a tab for HaLOS Marine store
            expect(await screen.findByText('HaLOS Marine')).toBeInTheDocument();
        });

        it('renders multiple store tabs when multiple stores exist', async () => {
            // Mock multiple stores
            vi.mocked(api.listStores).mockResolvedValueOnce([
                {
                    id: 'halos-marine',
                    name: 'HaLOS Marine',
                    description: null,
                    icon: null,
                    banner: null,
                    filters: { sections: [], priorities: [] },
                    category_metadata: null,
                },
                {
                    id: 'halos-general',
                    name: 'HaLOS General',
                    description: null,
                    icon: null,
                    banner: null,
                    filters: { sections: [], priorities: [] },
                    category_metadata: null,
                },
            ]);

            render(<App />);

            // Should render tabs for both stores
            expect(await screen.findByText('HaLOS Marine')).toBeInTheDocument();
            expect(await screen.findByText('HaLOS General')).toBeInTheDocument();
        });

        it('renders FilterToggleGroup below store tabs', async () => {
            render(<App />);

            // Should render the filter toggle options
            expect(await screen.findByText('All Apps')).toBeInTheDocument();
            expect(await screen.findByText('Available')).toBeInTheDocument();
            expect(await screen.findByText('Installed')).toBeInTheDocument();
        });

        it('has "All Apps" selected by default in FilterToggleGroup', async () => {
            render(<App />);

            const allAppsButton = (await screen.findByText('All Apps')).closest('button');
            expect(allAppsButton).toHaveAttribute('aria-pressed', 'true');
        });
    });
});
