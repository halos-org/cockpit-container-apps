/**
 * Integration tests for App component navigation and browser back button
 *
 * These tests verify that:
 * - URL changes when navigating between views
 * - Browser back button returns to previous view
 * - Deep linking works (direct navigation to URLs)
 * - Page state is preserved in URL
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import * as api from '../api';

// Mock Cockpit API
const mockCockpitLocation = {
    path: [] as string[],
    options: {} as Record<string, string | string[]>,
    go: vi.fn((path: string | string[], options?: Record<string, string>) => {
        // Update mock location state
        mockCockpitLocation.path = Array.isArray(path) ? path : [path];
        mockCockpitLocation.options = options || {};
    }),
};

const mockCockpitEvents: Record<string, (() => void)[]> = {};

// @ts-expect-error - Mocking global cockpit object
global.cockpit = {
    spawn: vi.fn(),
    file: vi.fn(),
    location: mockCockpitLocation,
    addEventListener: vi.fn((event: string, callback: () => void) => {
        if (!mockCockpitEvents[event]) {
            mockCockpitEvents[event] = [];
        }
        mockCockpitEvents[event].push(callback);
    }),
    removeEventListener: vi.fn((event: string, callback: () => void) => {
        if (mockCockpitEvents[event]) {
            mockCockpitEvents[event] = mockCockpitEvents[event].filter((cb) => cb !== callback);
        }
    }),
};

// Helper to trigger location change event
const triggerLocationChanged = () => {
    if (mockCockpitEvents['locationchanged']) {
        mockCockpitEvents['locationchanged'].forEach((cb) => cb());
    }
};

// Mock the API
vi.mock('../api', () => ({
    listStores: vi.fn().mockResolvedValue([
        {
            id: 'marine',
            name: 'Marine Apps',
            description: 'Marine applications',
            icon: null,
            banner: null,
            filters: { include_tags: ['role::container-app', 'field::marine'] },
            category_metadata: null,
        },
    ]),
    listCategories: vi.fn().mockResolvedValue([
        {
            id: 'navigation',
            label: 'Navigation',
            icon: null,
            description: 'Navigation apps',
            count: 2,
            count_all: 2,
            count_available: 1,
            count_installed: 1,
        },
        {
            id: 'monitoring',
            label: 'Monitoring',
            icon: null,
            description: 'Monitoring apps',
            count: 1,
            count_all: 1,
            count_available: 1,
            count_installed: 0,
        },
    ]),
    getStoreData: vi.fn().mockResolvedValue({
        store: {
            id: 'marine',
            name: 'Marine Apps',
            description: 'Marine applications',
            icon: null,
            banner: null,
        },
        packages: [
            {
                name: 'signalk-server',
                version: '2.8.0',
                summary: 'Signal K Server',
                section: 'navigation',
                installed: true,
                upgradable: false,
                categories: ["navigation"],
            },
            {
                name: 'opencpn',
                version: '5.8.0',
                summary: 'OpenCPN',
                section: 'navigation',
                installed: false,
                upgradable: false,
                categories: ["navigation"],
            },
        ],
        categories: [
            {
                id: 'navigation',
                label: 'Navigation',
                icon: null,
                description: 'Navigation apps',
                count: 2,
                count_all: 2,
                count_available: 1,
                count_installed: 1,
            },
            {
                id: 'monitoring',
                label: 'Monitoring',
                icon: null,
                description: 'Monitoring apps',
                count: 1,
                count_all: 1,
                count_available: 1,
                count_installed: 0,
            },
        ],
    }),
    filterPackages: vi.fn().mockResolvedValue({
        packages: [
            {
                name: 'signalk-server',
                version: '2.8.0',
                summary: 'Signal K Server',
                section: 'navigation',
                installed: true,
                upgradable: false,
                categories: ["navigation"],
            },
            {
                name: 'opencpn',
                version: '5.8.0',
                summary: 'OpenCPN',
                section: 'navigation',
                installed: false,
                upgradable: false,
                categories: ["navigation"],
            },
        ],
        total_count: 2,
        limited: false,
    }),
    ContainerAppsError: class extends Error {},
}));

describe('App Navigation Integration', () => {
    beforeEach(() => {
        // Reset location mock
        mockCockpitLocation.path = [];
        mockCockpitLocation.options = {};
        vi.clearAllMocks();

        // Clear event listeners
        Object.keys(mockCockpitEvents).forEach((key) => {
            mockCockpitEvents[key] = [];
        });
    });

    describe('URL synchronization', () => {
        it('should start at root URL showing categories', async () => {
            render(<App />);

            // Wait for stores to load first
            await screen.findByText('Marine Apps');

            // Should show categories view
            expect(await screen.findByText('Navigation')).toBeInTheDocument();

            // URL should be at root
            expect(mockCockpitLocation.path).toEqual([]);
        });

        it('should update URL when navigating to category', async () => {
            const user = userEvent.setup();
            render(<App />);

            // Wait for stores and categories to load
            await screen.findByText('Marine Apps');
            const navCategory = await screen.findByText('Navigation');

            // Click on Navigation category
            await user.click(navCategory);

            // URL should update to /category/navigation
            await waitFor(() => {
                expect(mockCockpitLocation.go).toHaveBeenCalledWith(
                    ['category', 'navigation'],
                    expect.any(Object)
                );
            });
        });

        it('should update URL when navigating to app details', async () => {
            const user = userEvent.setup();
            render(<App />);

            // Wait for stores and categories to load
            await screen.findByText('Marine Apps');
            const navCategory = await screen.findByText('Navigation');
            await user.click(navCategory);

            // Wait for apps to load
            const signalkApp = await screen.findByText('Signal K Server');

            // Click on an app
            await user.click(signalkApp);

            // URL should update to /app/signalk-server
            await waitFor(() => {
                expect(mockCockpitLocation.go).toHaveBeenCalledWith(
                    ['app', 'signalk-server'],
                    expect.any(Object)
                );
            });
        });

        it('should include store in URL query params', async () => {
            const user = userEvent.setup();
            render(<App />);

            // Wait for stores and categories to load
            await screen.findByText('Marine Apps');
            const navCategory = await screen.findByText('Navigation');

            // Click on Navigation category
            await user.click(navCategory);

            // URL should include store parameter
            await waitFor(() => {
                expect(mockCockpitLocation.go).toHaveBeenCalledWith(
                    ['category', 'navigation'],
                    expect.objectContaining({
                        store: 'marine',
                    })
                );
            });
        });
    });

    describe('Browser back button', () => {
        it('should navigate back from app details to category list', async () => {
            // Start with app details URL
            mockCockpitLocation.path = ['app', 'signalk-server'];
            mockCockpitLocation.options = { store: 'marine' };

            render(<App />);

            // Should show app details
            await waitFor(() => {
                expect(screen.getByText(/Signal K Server/i)).toBeInTheDocument();
            });

            // Simulate browser back button (change URL and trigger event)
            mockCockpitLocation.path = ['category', 'navigation'];
            triggerLocationChanged();

            // Should show category list
            await waitFor(() => {
                expect(screen.getByText('OpenCPN')).toBeInTheDocument();
            });
        });

        it('should navigate back from category list to store view', async () => {
            // Start with category URL
            mockCockpitLocation.path = ['category', 'navigation'];
            mockCockpitLocation.options = { store: 'marine' };

            render(<App />);

            // Should show category apps
            await waitFor(() => {
                expect(screen.getByText('Signal K Server')).toBeInTheDocument();
            });

            // Simulate browser back button
            mockCockpitLocation.path = [];
            triggerLocationChanged();

            // Should show categories view
            await waitFor(() => {
                expect(screen.getByText('Navigation')).toBeInTheDocument();
                expect(screen.getByText('Monitoring')).toBeInTheDocument();
            });
        });

        it('should handle multiple back navigations', async () => {
            const user = userEvent.setup();
            render(<App />);

            // Wait for stores and categories to load
            await screen.findByText('Marine Apps');
            const navCategory = await screen.findByText('Navigation');

            // Navigate to category
            await user.click(navCategory);
            const signalkApp = await screen.findByText('Signal K Server');

            // Navigate to app
            await user.click(signalkApp);
            await waitFor(() => {
                expect(screen.getByText(/Signal K Server/i)).toBeInTheDocument();
            });

            // Back to category
            mockCockpitLocation.path = ['category', 'navigation'];
            triggerLocationChanged();
            await waitFor(() => {
                expect(screen.getByText('OpenCPN')).toBeInTheDocument();
            });

            // Back to categories
            mockCockpitLocation.path = [];
            triggerLocationChanged();
            await waitFor(() => {
                expect(screen.getByText('Monitoring')).toBeInTheDocument();
            });
        });
    });

    describe('Deep linking', () => {
        it('should load category view from URL', async () => {
            // Start with category URL
            mockCockpitLocation.path = ['category', 'navigation'];
            mockCockpitLocation.options = { store: 'marine' };

            render(<App />);

            // Should show category apps
            await waitFor(() => {
                expect(screen.getByText('Signal K Server')).toBeInTheDocument();
                expect(screen.getByText('OpenCPN')).toBeInTheDocument();
            });
        });

        it('should load app details from URL', async () => {
            // Start with app URL
            mockCockpitLocation.path = ['app', 'signalk-server'];
            mockCockpitLocation.options = { store: 'marine' };

            render(<App />);

            // Should show app details
            await waitFor(() => {
                expect(screen.getByText(/Signal K Server/i)).toBeInTheDocument();
            });
        });

        it('should handle invalid URL by showing store view', async () => {
            // Start with invalid URL
            mockCockpitLocation.path = ['invalid', 'path'];

            render(<App />);

            // Should fallback to categories view
            await waitFor(() => {
                expect(screen.getByText('Navigation')).toBeInTheDocument();
            });
        });

        it('should apply filter from URL query params', async () => {
            // Start with filter in URL
            mockCockpitLocation.path = [];
            mockCockpitLocation.options = { filter: 'installed' };

            render(<App />);

            // Should apply the filter
            const installedButton = await screen.findByText('Installed');

            // Filter should be selected
            const button = installedButton.closest('button');
            expect(button).toHaveAttribute('aria-pressed', 'true');
        });
    });

    describe('Page refresh', () => {
        it('should preserve category view on page refresh', async () => {
            // Simulate page refresh with category URL
            mockCockpitLocation.path = ['category', 'navigation'];
            mockCockpitLocation.options = { store: 'marine', filter: 'all' };

            render(<App />);

            // Should restore category view
            await waitFor(() => {
                expect(screen.getByText('Signal K Server')).toBeInTheDocument();
            });

            // Should restore store selection (now uses getStoreData instead of listCategories)
            expect(api.getStoreData).toHaveBeenCalledWith('marine');

            // Should restore filter
            expect(screen.getByText('All Apps').closest('button')).toHaveClass('pf-m-selected');
        });

        it('should preserve app details view on page refresh', async () => {
            // Simulate page refresh with app URL
            mockCockpitLocation.path = ['app', 'signalk-server'];
            mockCockpitLocation.options = { store: 'marine' };

            render(<App />);

            // Should restore app details view
            await waitFor(() => {
                expect(screen.getByText(/Signal K Server/i)).toBeInTheDocument();
            });
        });
    });

    describe('Store tab integration', () => {
        it('should update URL when changing store tabs', async () => {
            const user = userEvent.setup();

            // Mock multiple stores
            vi.mocked(api.listStores).mockResolvedValue([
                {
                    id: 'marine',
                    name: 'Marine Apps',
                    description: null,
                    icon: null,
                    banner: null,
                    filters: {
                        include_origins: [],
                        include_sections: [],
                        include_tags: ['role::container-app'],
                        include_packages: [],
                    },
                    category_metadata: null,
                },
                {
                    id: 'home',
                    name: 'Home Apps',
                    description: null,
                    icon: null,
                    banner: null,
                    filters: {
                        include_origins: [],
                        include_sections: [],
                        include_tags: ['role::container-app'],
                        include_packages: [],
                    },
                    category_metadata: null,
                },
            ]);

            render(<App />);

            await waitFor(() => {
                expect(screen.getByText('Marine Apps')).toBeInTheDocument();
            });

            // Click on Home Apps tab
            await user.click(screen.getByText('Home Apps'));

            // URL should update with new store parameter
            await waitFor(() => {
                expect(mockCockpitLocation.go).toHaveBeenCalledWith(
                    [],
                    expect.objectContaining({
                        store: 'home',
                    })
                );
            });
        });

        it('should preserve view when changing stores', async () => {
            const user = userEvent.setup();

            // Mock multiple stores
            vi.mocked(api.listStores).mockResolvedValue([
                {
                    id: 'marine',
                    name: 'Marine Apps',
                    description: null,
                    icon: null,
                    banner: null,
                    filters: {
                        include_origins: [],
                        include_sections: [],
                        include_tags: ['role::container-app'],
                        include_packages: [],
                    },
                    category_metadata: null,
                },
                {
                    id: 'home',
                    name: 'Home Apps',
                    description: null,
                    icon: null,
                    banner: null,
                    filters: {
                        include_origins: [],
                        include_sections: [],
                        include_tags: ['role::container-app'],
                        include_packages: [],
                    },
                    category_metadata: null,
                },
            ]);

            // Start in category view
            mockCockpitLocation.path = ['category', 'navigation'];
            mockCockpitLocation.options = { store: 'marine' };

            render(<App />);

            await waitFor(() => {
                expect(screen.getByText('Signal K Server')).toBeInTheDocument();
            });

            // Switch store tab - should reset to categories view
            await user.click(screen.getByText('Home Apps'));

            await waitFor(() => {
                expect(mockCockpitLocation.go).toHaveBeenCalledWith(
                    [],
                    expect.objectContaining({
                        store: 'home',
                    })
                );
            });
        });
    });

    describe('Event listener cleanup', () => {
        it('should register locationchanged listener on mount', () => {
            render(<App />);

            expect(cockpit.addEventListener).toHaveBeenCalledWith(
                'locationchanged',
                expect.any(Function)
            );
        });

        it('should remove locationchanged listener on unmount', () => {
            const { unmount } = render(<App />);

            const addEventCalls = vi.mocked(cockpit.addEventListener).mock.calls;
            const locationChangedCall = addEventCalls.find((call) => call[0] === 'locationchanged');
            const listener = locationChangedCall?.[1];

            unmount();

            expect(cockpit.removeEventListener).toHaveBeenCalledWith('locationchanged', listener);
        });
    });
});
