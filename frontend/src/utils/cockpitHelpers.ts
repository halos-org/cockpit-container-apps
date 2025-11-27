/**
 * Cockpit helper utilities
 *
 * Provides safe wrappers around Cockpit API calls that may not be available
 * (e.g., in test environments or when Cockpit is not loaded)
 */

import type { RouterLocation } from './routing';

/**
 * Check if Cockpit is available
 * @returns true if cockpit global object exists
 */
export function isCockpitAvailable(): boolean {
    return typeof cockpit !== 'undefined';
}

/**
 * Safely navigate to a new location using Cockpit's location API
 * @param path - Path segments (e.g., ['app', 'signalk-server'])
 * @param options - Query parameters (e.g., { store: 'marine', filter: 'installed' })
 */
export function navigateTo(path: string[], options?: Record<string, string | string[]>): void {
    if (isCockpitAvailable() && cockpit.location) {
        // Cast to the narrower type expected by cockpit.location.go
        // This is safe because Cockpit actually supports string arrays
        cockpit.location.go(path, options as Record<string, string> | undefined);
    }
}

/**
 * Get current Cockpit location
 * @returns Current location or null if Cockpit is not available
 */
export function getCurrentLocation(): RouterLocation | null {
    if (isCockpitAvailable() && cockpit.location) {
        return {
            path: cockpit.location.path,
            options: cockpit.location.options,
        };
    }
    return null;
}

/**
 * Add event listener for Cockpit location changes
 * @param handler - Function to call when location changes
 * @returns Cleanup function to remove the listener
 */
export function onLocationChanged(handler: () => void): () => void {
    if (isCockpitAvailable() && cockpit.addEventListener) {
        cockpit.addEventListener('locationchanged', handler);
        return () => {
            if (isCockpitAvailable() && cockpit.removeEventListener) {
                cockpit.removeEventListener('locationchanged', handler);
            }
        };
    }
    // Return no-op cleanup if Cockpit is not available
    return () => {};
}
