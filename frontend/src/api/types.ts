/**
 * TypeScript interfaces for backend API data structures
 */

// ==================== Cockpit Types ====================

/** Cockpit API declarations */
declare global {
    const cockpit: {
        spawn(args: string[], options?: SpawnOptions): Spawn;
        file(path: string): CockpitFile;
        location: CockpitLocation;
        addEventListener(event: 'locationchanged' | 'visibilitychange', callback: () => void): void;
        removeEventListener(
            event: 'locationchanged' | 'visibilitychange',
            callback: () => void
        ): void;
    };

    interface SpawnOptions {
        err?: 'message' | 'ignore' | 'out';
        superuser?: 'require' | 'try';
        environ?: string[];
    }

    interface Spawn {
        stream(callback: (data: string) => void): Spawn;
        done(callback: (data: string | null) => void): Spawn;
        fail(callback: (error: unknown, data: string | null) => void): Spawn;
        close(callback: (status: number, data: string | null) => void): Spawn;
    }

    interface CockpitFile {
        read(): Promise<string>;
        replace(content: string): Promise<void>;
        watch(callback: (content: string) => void): void;
    }

    interface CockpitLocation {
        path: string[];
        options: Record<string, string | string[]>;
        go(path: string | string[], options?: Record<string, string>): void;
    }
}

// ==================== API Types ====================

/**
 * Store filter configuration
 */
export interface StoreFilters {
    include_origins: string[];
    include_sections: string[];
    include_tags: string[];
    include_packages: string[];
}

/**
 * Category metadata from store configuration
 */
export interface CategoryMetadata {
    id: string;
    label: string;
    description: string | null;
    icon: string | null;
}

/**
 * Store configuration
 */
export interface Store {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    banner: string | null;
    filters: StoreFilters;
    category_metadata: CategoryMetadata[] | null;
}

/**
 * Category with package count
 */
export interface Category {
    id: string;
    label: string;
    icon: string | null;
    description: string | null;
    count: number;
    count_all: number;
    count_available: number;
    count_installed: number;
}

/**
 * Package summary information
 */
export interface Package {
    name: string;
    version: string;
    summary: string;
    section: string;
    installed: boolean;
    upgradable: boolean;
    repository_id?: string;
    installedVersion?: string;
    candidateVersion?: string;
}

/**
 * Filter parameters for package filtering
 */
export interface FilterParams {
    store_id?: string;
    repository_id?: string;
    category_id?: string;
    tab?: 'installed' | 'upgradable';
    search_query?: string;
    limit?: number;
}

/**
 * Package filter response from backend
 */
export interface FilterPackagesResponse {
    packages: Package[];
    total_count: number;
    applied_filters: string[];
    limit: number;
    limited: boolean;
}

/**
 * Error response from backend
 */
export interface APIError {
    error: string;
    details?: string;
    code?: string;
}
