/**
 * Tests for App component (main router)
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { App } from '../App';

// Mock the API
vi.mock('../api', () => ({
    listStores: vi.fn().mockResolvedValue([
        { id: 'halos-marine', name: 'HaLOS Marine', description: null, icon: null, banner: null, filters: { sections: [], priorities: [] }, category_metadata: null },
    ]),
    listCategories: vi.fn().mockResolvedValue([
        { id: 'navigation', label: 'Navigation', icon: null, description: 'Nav apps', count: 5 },
    ]),
    filterPackages: vi.fn().mockResolvedValue({
        packages: [
            { name: 'signalk-server', version: '2.8.0', summary: 'Signal K', section: 'navigation', installed: false, upgradable: false },
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

    it('renders sidebar navigation', async () => {
        render(<App />);

        // Should have navigation items in sidebar (nav items render as buttons in PF6)
        expect(await screen.findByText('Store')).toBeInTheDocument();
        expect(await screen.findByText('Installed')).toBeInTheDocument();
    });

    it('shows store view by default', async () => {
        render(<App />);

        // Store view shows categories with Browse Categories title
        expect(await screen.findByText(/browse categories/i)).toBeInTheDocument();
    });

    it('renders application title', async () => {
        render(<App />);

        expect(screen.getByText(/container apps/i)).toBeInTheDocument();
    });
});
