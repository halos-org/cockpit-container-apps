/**
 * Tests for routing utilities
 *
 * These tests verify URL parsing and generation for browser navigation.
 */

import { describe, expect, it } from 'vitest';
import type { Package } from '../../api/types';
import {
    buildLocationFromRouter,
    getInitialRouterState,
    parseLocationToRouter,
    type RouterLocation,
    type RouterState,
} from '../routing';

describe('Routing Utilities', () => {
    describe('parseLocationToRouter', () => {
        it('should parse root path to store route', () => {
            const location: RouterLocation = {
                path: [],
                options: {},
            };

            const result = parseLocationToRouter(location);

            expect(result).toEqual({
                route: 'store',
            });
        });

        it('should parse /category/:id to category route', () => {
            const location: RouterLocation = {
                path: ['category', 'navigation'],
                options: {},
            };

            const result = parseLocationToRouter(location);

            expect(result).toEqual({
                route: 'category',
                selectedCategory: 'navigation',
            });
        });

        it('should parse /app/:name to app route', () => {
            const location: RouterLocation = {
                path: ['app', 'signalk-server'],
                options: {},
            };

            const result = parseLocationToRouter(location);

            expect(result).toEqual({
                route: 'app',
                selectedPackage: null,  // Package loaded separately
                appName: 'signalk-server',
            });
        });

        it('should handle invalid paths by returning store route', () => {
            const location: RouterLocation = {
                path: ['invalid'],
                options: {},
            };

            const result = parseLocationToRouter(location);

            expect(result).toEqual({
                route: 'store',
            });
        });

        it('should handle incomplete category path', () => {
            const location: RouterLocation = {
                path: ['category'],
                options: {},
            };

            const result = parseLocationToRouter(location);

            expect(result).toEqual({
                route: 'store',
            });
        });

        it('should handle incomplete app path', () => {
            const location: RouterLocation = {
                path: ['app'],
                options: {},
            };

            const result = parseLocationToRouter(location);

            expect(result).toEqual({
                route: 'store',
            });
        });

        it('should ignore extra path segments', () => {
            const location: RouterLocation = {
                path: ['category', 'navigation', 'extra', 'segments'],
                options: {},
            };

            const result = parseLocationToRouter(location);

            expect(result).toEqual({
                route: 'category',
                selectedCategory: 'navigation',
            });
        });
    });

    describe('buildLocationFromRouter', () => {
        it('should build root path from store route', () => {
            const router: RouterState = {
                route: 'store',
            };

            const result = buildLocationFromRouter(router);

            expect(result).toEqual({
                path: [],
                options: {},
            });
        });

        it('should build category path from category route', () => {
            const router: RouterState = {
                route: 'category',
                selectedCategory: 'navigation',
            };

            const result = buildLocationFromRouter(router);

            expect(result).toEqual({
                path: ['category', 'navigation'],
                options: {},
            });
        });

        it('should build app path from app route', () => {
            const mockPackage: Package = {
                name: 'signalk-server',
                version: '2.8.0',
                summary: 'Signal K Server',
                section: 'navigation',
                installed: false,
                upgradable: false,
            };

            const router: RouterState = {
                route: 'app',
                selectedPackage: mockPackage,
            };

            const result = buildLocationFromRouter(router);

            expect(result).toEqual({
                path: ['app', 'signalk-server'],
                options: {},
            });
        });

        it('should handle category route without selectedCategory', () => {
            const router: RouterState = {
                route: 'category',
                // selectedCategory is undefined
            };

            const result = buildLocationFromRouter(router);

            // Should fallback to store route
            expect(result).toEqual({
                path: [],
                options: {},
            });
        });

        it('should handle app route without selectedPackage', () => {
            const router: RouterState = {
                route: 'app',
                // selectedPackage is undefined
            };

            const result = buildLocationFromRouter(router);

            // Should fallback to store route
            expect(result).toEqual({
                path: [],
                options: {},
            });
        });

        it('should include store in query params if provided', () => {
            const router: RouterState = {
                route: 'category',
                selectedCategory: 'navigation',
            };

            const result = buildLocationFromRouter(router, 'marine');

            expect(result).toEqual({
                path: ['category', 'navigation'],
                options: {
                    store: 'marine',
                },
            });
        });

        it('should include filter in query params if provided', () => {
            const router: RouterState = {
                route: 'category',
                selectedCategory: 'navigation',
            };

            const result = buildLocationFromRouter(router, undefined, 'installed');

            expect(result).toEqual({
                path: ['category', 'navigation'],
                options: {
                    filter: 'installed',
                },
            });
        });

        it('should include both store and filter in query params', () => {
            const mockPackage: Package = {
                name: 'signalk-server',
                version: '2.8.0',
                summary: 'Signal K Server',
                section: 'navigation',
                installed: true,
                upgradable: false,
            };

            const router: RouterState = {
                route: 'app',
                selectedPackage: mockPackage,
            };

            const result = buildLocationFromRouter(router, 'marine', 'installed');

            expect(result).toEqual({
                path: ['app', 'signalk-server'],
                options: {
                    store: 'marine',
                    filter: 'installed',
                },
            });
        });
    });

    describe('getInitialRouterState', () => {
        it('should return store route for root path', () => {
            const location: RouterLocation = {
                path: [],
                options: {},
            };

            const result = getInitialRouterState(location);

            expect(result).toEqual({
                route: 'store',
            });
        });

        it('should return category route with selected category', () => {
            const location: RouterLocation = {
                path: ['category', 'navigation'],
                options: {},
            };

            const result = getInitialRouterState(location);

            expect(result).toEqual({
                route: 'category',
                selectedCategory: 'navigation',
            });
        });

        it('should return app route with app name (package loaded separately)', () => {
            const location: RouterLocation = {
                path: ['app', 'signalk-server'],
                options: {},
            };

            const result = getInitialRouterState(location);

            expect(result).toEqual({
                route: 'app',
                selectedPackage: null,
                appName: 'signalk-server',
            });
        });

        it('should extract store from query params', () => {
            const location: RouterLocation = {
                path: ['category', 'navigation'],
                options: {
                    store: 'marine',
                },
            };

            const result = getInitialRouterState(location);

            expect(result).toEqual({
                route: 'category',
                selectedCategory: 'navigation',
                storeId: 'marine',
            });
        });

        it('should extract filter from query params', () => {
            const location: RouterLocation = {
                path: [],
                options: {
                    filter: 'installed',
                },
            };

            const result = getInitialRouterState(location);

            expect(result).toEqual({
                route: 'store',
                installFilter: 'installed',
            });
        });

        it('should handle array query param values by taking first element', () => {
            const location: RouterLocation = {
                path: [],
                options: {
                    store: ['marine', 'other'],
                    filter: ['installed', 'available'],
                },
            };

            const result = getInitialRouterState(location);

            expect(result).toEqual({
                route: 'store',
                storeId: 'marine',
                installFilter: 'installed',
            });
        });

        it('should validate filter values', () => {
            const location: RouterLocation = {
                path: [],
                options: {
                    filter: 'invalid',
                },
            };

            const result = getInitialRouterState(location);

            // Invalid filter should be ignored
            expect(result).toEqual({
                route: 'store',
            });
        });
    });

    describe('Round-trip conversion', () => {
        it('should preserve store route through parse and build', () => {
            const originalRouter: RouterState = {
                route: 'store',
            };

            const location = buildLocationFromRouter(originalRouter);
            const parsedRouter = parseLocationToRouter(location);

            expect(parsedRouter.route).toBe(originalRouter.route);
        });

        it('should preserve category route through parse and build', () => {
            const originalRouter: RouterState = {
                route: 'category',
                selectedCategory: 'navigation',
            };

            const location = buildLocationFromRouter(originalRouter);
            const parsedRouter = parseLocationToRouter(location);

            expect(parsedRouter).toEqual({
                route: 'category',
                selectedCategory: 'navigation',
            });
        });

        it('should preserve app name through parse and build', () => {
            const mockPackage: Package = {
                name: 'signalk-server',
                version: '2.8.0',
                summary: 'Signal K Server',
                section: 'navigation',
                installed: false,
                upgradable: false,
            };

            const originalRouter: RouterState = {
                route: 'app',
                selectedPackage: mockPackage,
            };

            const location = buildLocationFromRouter(originalRouter);
            const parsedRouter = parseLocationToRouter(location);

            expect(parsedRouter.route).toBe('app');
            expect(parsedRouter.appName).toBe('signalk-server');
        });
    });
});
