/**
 * Tests for API wrapper layer
 *
 * Tests the frontend API wrapper that calls cockpit-container-apps CLI.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ContainerAppsError,
    filterPackages,
    formatErrorMessage,
    listCategories,
    listPackagesByCategory,
    listStores,
} from '../index';

// Mock the global cockpit object
const mockSpawn = vi.fn();
(globalThis as typeof globalThis & { cockpit: typeof cockpit }).cockpit = {
    spawn: mockSpawn,
    file: vi.fn(),
    location: {} as Location,
} as typeof cockpit;

describe('API Wrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('listStores', () => {
        it('should parse valid JSON response', async () => {
            const mockStores = [
                {
                    id: 'marine',
                    name: 'Marine Apps',
                    description: 'Marine applications',
                    icon: null,
                    banner: null,
                    filters: {
                        include_origins: ['marine'],
                        include_sections: [],
                        include_tags: [],
                        include_packages: [],
                    },
                    category_metadata: null,
                },
            ];

            let streamCallback: ((data: string) => void) | null = null;
            let doneCallback: ((data: string | null) => void) | null = null;

            const mockProc = {
                stream: vi.fn((cb: (data: string) => void) => {
                    streamCallback = cb;
                    return mockProc;
                }),
                done: vi.fn((cb: (data: string | null) => void) => {
                    doneCallback = cb;
                    return mockProc;
                }),
                fail: vi.fn().mockReturnThis(),
                close: vi.fn().mockReturnThis(),
            };

            mockSpawn.mockReturnValue(mockProc);

            const promise = listStores();

            // Simulate stdout data
            if (streamCallback) streamCallback(JSON.stringify(mockStores));
            if (doneCallback) doneCallback(null);

            const result = await promise;
            expect(result).toEqual(mockStores);
            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-container-apps', 'list-stores'],
                expect.any(Object)
            );
        });

        it('should handle backend errors', async () => {
            const mockError = {
                error: 'Failed to load stores',
                code: 'CONFIG_ERROR',
            };

            const mockProc = {
                stream: vi.fn().mockReturnThis(),
                done: vi.fn().mockReturnThis(),
                fail: vi.fn((callback) => {
                    callback(JSON.stringify(mockError), null);
                    return mockProc;
                }),
                close: vi.fn().mockReturnThis(),
            };

            mockSpawn.mockReturnValue(mockProc);

            await expect(listStores()).rejects.toThrow(ContainerAppsError);
            await expect(listStores()).rejects.toThrow('Failed to load stores');
        });
    });

    describe('listCategories', () => {
        it('should call without store filter', async () => {
            const mockCategories = [
                { id: 'navigation', label: 'Navigation', icon: null, description: null, count: 5 },
                { id: 'monitoring', label: 'Monitoring', icon: null, description: null, count: 3 },
            ];

            const mockProc = {
                stream: vi.fn((callback) => {
                    callback(JSON.stringify(mockCategories));
                    return mockProc;
                }),
                done: vi.fn((callback) => {
                    callback();
                    return mockProc;
                }),
                fail: vi.fn().mockReturnThis(),
                close: vi.fn().mockReturnThis(),
            };

            mockSpawn.mockReturnValue(mockProc);

            const result = await listCategories();
            expect(result).toEqual(mockCategories);
            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-container-apps', 'list-categories'],
                expect.any(Object)
            );
        });

        it('should call with store filter', async () => {
            const mockCategories = [
                { id: 'navigation', label: 'Navigation', icon: null, description: null, count: 5 },
            ];

            const mockProc = {
                stream: vi.fn((callback) => {
                    callback(JSON.stringify(mockCategories));
                    return mockProc;
                }),
                done: vi.fn((callback) => {
                    callback();
                    return mockProc;
                }),
                fail: vi.fn().mockReturnThis(),
                close: vi.fn().mockReturnThis(),
            };

            mockSpawn.mockReturnValue(mockProc);

            const result = await listCategories('marine');
            expect(result).toEqual(mockCategories);
            // Uses --key=value format to prevent argument injection with dash-prefixed values
            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-container-apps', 'list-categories', '--store=marine'],
                expect.any(Object)
            );
        });
    });

    describe('listPackagesByCategory', () => {
        it('should call with category ID', async () => {
            const mockPackages = [
                {
                    name: 'signalk',
                    version: '1.0.0',
                    summary: 'Signal K Server',
                    section: 'marine',
                    installed: false,
                    upgradable: false,
                },
            ];

            const mockProc = {
                stream: vi.fn((callback) => {
                    callback(JSON.stringify(mockPackages));
                    return mockProc;
                }),
                done: vi.fn((callback) => {
                    callback();
                    return mockProc;
                }),
                fail: vi.fn().mockReturnThis(),
                close: vi.fn().mockReturnThis(),
            };

            mockSpawn.mockReturnValue(mockProc);

            const result = await listPackagesByCategory('navigation');
            expect(result).toEqual(mockPackages);
            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-container-apps', 'list-packages-by-category', 'navigation'],
                expect.any(Object)
            );
        });

        it('should call with category and store filter', async () => {
            const mockPackages = [
                {
                    name: 'signalk',
                    version: '1.0.0',
                    summary: 'Signal K Server',
                    section: 'marine',
                    installed: false,
                    upgradable: false,
                },
            ];

            const mockProc = {
                stream: vi.fn((callback) => {
                    callback(JSON.stringify(mockPackages));
                    return mockProc;
                }),
                done: vi.fn((callback) => {
                    callback();
                    return mockProc;
                }),
                fail: vi.fn().mockReturnThis(),
                close: vi.fn().mockReturnThis(),
            };

            mockSpawn.mockReturnValue(mockProc);

            const result = await listPackagesByCategory('navigation', 'marine');
            expect(result).toEqual(mockPackages);
            // Uses --key=value format to prevent argument injection with dash-prefixed values
            expect(mockSpawn).toHaveBeenCalledWith(
                [
                    'cockpit-container-apps',
                    'list-packages-by-category',
                    'navigation',
                    '--store=marine',
                ],
                expect.any(Object)
            );
        });
    });

    describe('filterPackages', () => {
        it('should build correct command arguments', async () => {
            const mockResponse = {
                packages: [],
                total_count: 0,
                applied_filters: [],
                limit: 1000,
                limited: false,
            };

            const mockProc = {
                stream: vi.fn((callback) => {
                    callback(JSON.stringify(mockResponse));
                    return mockProc;
                }),
                done: vi.fn((callback) => {
                    callback();
                    return mockProc;
                }),
                fail: vi.fn().mockReturnThis(),
                close: vi.fn().mockReturnThis(),
            };

            mockSpawn.mockReturnValue(mockProc);

            await filterPackages({
                store_id: 'marine',
                repository_id: 'marine:stable',
                tab: 'installed',
                search_query: 'signal',
                limit: 50,
            });

            // Uses --key=value format to prevent argument injection with dash-prefixed values
            expect(mockSpawn).toHaveBeenCalledWith(
                [
                    'cockpit-container-apps',
                    'filter-packages',
                    '--store=marine',
                    '--repo=marine:stable',
                    '--tab=installed',
                    '--search=signal',
                    '--limit=50',
                ],
                expect.any(Object)
            );
        });

        it('should work with no filters', async () => {
            const mockResponse = {
                packages: [],
                total_count: 0,
                applied_filters: [],
                limit: 1000,
                limited: false,
            };

            const mockProc = {
                stream: vi.fn((callback) => {
                    callback(JSON.stringify(mockResponse));
                    return mockProc;
                }),
                done: vi.fn((callback) => {
                    callback();
                    return mockProc;
                }),
                fail: vi.fn().mockReturnThis(),
                close: vi.fn().mockReturnThis(),
            };

            mockSpawn.mockReturnValue(mockProc);

            await filterPackages({});

            expect(mockSpawn).toHaveBeenCalledWith(
                ['cockpit-container-apps', 'filter-packages'],
                expect.any(Object)
            );
        });
    });

    describe('formatErrorMessage', () => {
        it('should format ContainerAppsError with details', () => {
            const error = new ContainerAppsError('Test error', 'TEST_CODE', 'Extra details');
            const message = formatErrorMessage(error);
            expect(message).toBe('Test error: Extra details');
        });

        it('should format ContainerAppsError without details', () => {
            const error = new ContainerAppsError('Test error', 'TEST_CODE');
            const message = formatErrorMessage(error);
            expect(message).toBe('Test error');
        });

        it('should format generic Error', () => {
            const error = new Error('Generic error');
            const message = formatErrorMessage(error);
            expect(message).toBe('Generic error');
        });

        it('should format unknown error', () => {
            const message = formatErrorMessage('String error');
            expect(message).toBe('String error');
        });
    });
});
