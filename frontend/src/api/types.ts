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
    displayName: string;
    version: string;
    summary: string;
    section: string;
    installed: boolean;
    upgradable: boolean;
    categories: string[]; // Category tags for client-side filtering
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
 * Consolidated store data response from get-store-data command
 * Replaces separate calls to list-stores, list-categories, and filter-packages
 */
export interface GetStoreDataResponse {
    store: {
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        banner: string | null;
    };
    packages: Package[];
    categories: Category[];
    apt_lists_populated: boolean;
}

/**
 * Error response from backend
 */
export interface APIError {
    error: string;
    details?: string;
    code?: string;
}

// ==================== Configuration Types ====================

/**
 * Enum option for enum-type fields
 */
export interface EnumOption {
    value: string;
    label: string;
}

/**
 * Field types supported in configuration schema
 */
export type FieldType = 'string' | 'integer' | 'boolean' | 'enum' | 'password' | 'path';

/**
 * Configuration field definition
 */
export interface ConfigField {
    id: string;
    type: FieldType;
    label: string;
    description?: string;
    default?: string;
    required?: boolean;
    help?: string;
    // Type-specific constraints
    min?: number; // For integer type
    max?: number; // For integer type
    options?: EnumOption[]; // For enum type
}

/**
 * Configuration group definition
 */
export interface ConfigGroup {
    id: string;
    label: string;
    description?: string;
    fields: ConfigField[];
}

/**
 * Configuration schema structure
 */
export interface ConfigSchema {
    version: string;
    groups: ConfigGroup[];
}

/**
 * Configuration values (key-value pairs)
 */
export type ConfigValues = Record<string, string>;

/**
 * Get config schema response
 */
export interface GetConfigSchemaResponse {
    success: boolean;
    schema?: ConfigSchema;
    error?: string;
}

/**
 * Get config response
 */
export interface GetConfigResponse {
    success: boolean;
    config?: ConfigValues;
    error?: string;
}

/**
 * Set config response
 */
export interface SetConfigResponse {
    success: boolean;
    error?: string;
    details?: string;
    warning?: string;
}

/**
 * Store package information (for store editor)
 */
export interface StorePackage {
    package_name: string;
    store_id: string;
    description: string;
    installed: boolean;
    version: string | null;
}

/**
 * List store packages response
 */
export interface ListStorePackagesResponse {
    store_packages: StorePackage[];
}
