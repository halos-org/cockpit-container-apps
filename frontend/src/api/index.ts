/**
 * API wrapper for backend commands
 * Provides typed Promise-based interface to cockpit-container-apps CLI
 */

import type {
    APIError,
    Category,
    FilterPackagesResponse,
    FilterParams,
    Package,
    Store,
} from './types';

/**
 * Custom error class for API errors
 */
export class ContainerAppsError extends Error {
    code?: string;
    details?: string;

    constructor(message: string, code?: string, details?: string) {
        super(message);
        this.name = 'ContainerAppsError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Execute backend command and parse JSON response
 */
async function executeCommand<T>(
    command: string,
    args: string[] = [],
    timeout = 30000
): Promise<T> {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let settled = false; // Prevent race conditions

        const proc = cockpit.spawn(['cockpit-container-apps', command, ...args], {
            err: 'out',
            superuser: 'try',
        });

        // Set timeout
        if (timeout > 0) {
            timeoutId = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    proc.close(() => {
                        reject(
                            new ContainerAppsError(
                                `Command timed out after ${timeout}ms`,
                                'TIMEOUT'
                            )
                        );
                    });
                }
            }, timeout);
        }

        proc.stream((data: string) => {
            stdout += data;
        });

        proc.done(() => {
            if (settled) return;
            settled = true;
            if (timeoutId) clearTimeout(timeoutId);

            try {
                // Parse JSON response
                const parsed = JSON.parse(stdout);

                // Check for error response
                if (parsed.error) {
                    const apiError = parsed as APIError;
                    reject(new ContainerAppsError(apiError.error, apiError.code, apiError.details));
                    return;
                }

                resolve(parsed as T);
            } catch (e) {
                reject(
                    new ContainerAppsError(
                        'Failed to parse backend response',
                        'PARSE_ERROR',
                        stdout
                    )
                );
            }
        });

        proc.fail((error: unknown, data: string | null) => {
            if (settled) return;
            settled = true;
            if (timeoutId) clearTimeout(timeoutId);

            const errorStr = String(error || data || '');

            // Try to parse error as JSON
            try {
                const parsed = JSON.parse(errorStr);
                if (parsed.error) {
                    const apiError = parsed as APIError;
                    reject(new ContainerAppsError(apiError.error, apiError.code, apiError.details));
                    return;
                }
            } catch {
                // Not JSON, treat as plain error message
            }

            reject(new ContainerAppsError(errorStr || 'Backend command failed', 'COMMAND_FAILED'));
        });
    });
}

/**
 * List all configured stores
 */
export async function listStores(): Promise<Store[]> {
    return executeCommand<Store[]>('list-stores');
}

/**
 * List categories for a store (auto-discovered from package tags)
 */
export async function listCategories(storeId?: string): Promise<Category[]> {
    const args = storeId ? ['--store', storeId] : [];
    return executeCommand<Category[]>('list-categories', args);
}

/**
 * List packages in a specific category
 */
export async function listPackagesByCategory(
    categoryId: string,
    storeId?: string
): Promise<Package[]> {
    const args = [categoryId];
    if (storeId) {
        args.push('--store', storeId);
    }
    return executeCommand<Package[]>('list-packages-by-category', args);
}

/**
 * Filter packages with cascade filtering
 */
export async function filterPackages(params: FilterParams = {}): Promise<FilterPackagesResponse> {
    const args: string[] = [];

    if (params.store_id) {
        args.push('--store', params.store_id);
    }
    if (params.repository_id) {
        args.push('--repo', params.repository_id);
    }
    if (params.category_id) {
        args.push('--category', params.category_id);
    }
    if (params.tab) {
        args.push('--tab', params.tab);
    }
    if (params.search_query) {
        args.push('--search', params.search_query);
    }
    if (params.limit !== undefined) {
        args.push('--limit', params.limit.toString());
    }

    return executeCommand<FilterPackagesResponse>('filter-packages', args);
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: unknown): string {
    if (error instanceof ContainerAppsError) {
        let message = error.message;
        if (error.details) {
            message += `: ${error.details}`;
        }
        return message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

// Re-export types for convenience
export type {
    APIError,
    Category,
    CategoryMetadata,
    FilterPackagesResponse,
    FilterParams,
    Package,
    Store,
    StoreFilters,
} from './types';
