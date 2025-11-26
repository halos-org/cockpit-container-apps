"""
Get-store-data command implementation.

Consolidates store configuration, packages, and categories into a single
response to reduce API roundtrips. This replaces separate calls to list-stores,
list-categories, and filter-packages.
"""

from typing import Any

from cockpit_container_apps.utils.store_config import load_stores
from cockpit_container_apps.utils.store_filter import get_pre_filtered_packages, matches_store_filter
from cockpit_container_apps.vendor.cockpit_apt_utils.debtag_parser import (
    derive_category_label,
    get_tags_by_facet,
)
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError, CacheError
from cockpit_container_apps.vendor.cockpit_apt_utils.formatters import format_package


def execute(store_id: str) -> dict[str, Any]:
    """
    Get consolidated store data (configuration, packages, and categories).

    This consolidates three separate API calls into one:
    - Store configuration (from list-stores)
    - Packages (from filter-packages)
    - Categories with counts (from list-categories)

    Uses origin-based pre-filtering for performance optimization.

    Args:
        store_id: Store ID to load data for

    Returns:
        Dictionary with:
        - store: Store configuration (id, name, description, filters, etc.)
        - packages: List of all packages in the store
        - categories: List of categories with counts (all, available, installed)

    Raises:
        APTBridgeError: If store_id is invalid or empty
        CacheError: If APT cache operations fail
    """
    if not store_id or not store_id.strip():
        raise APTBridgeError("Store ID cannot be empty", "INVALID_STORE_ID")

    store_id = store_id.strip()

    try:
        # Import apt here to allow testing without python-apt installed
        import apt  # type: ignore
    except ImportError:
        raise CacheError(
            "python-apt not available - must run on Debian/Ubuntu system",
            details="ImportError: No module named 'apt'",
        ) from None

    try:
        # Open APT cache
        cache = apt.Cache()
    except Exception as e:
        raise CacheError("Failed to open APT cache", details=str(e)) from e

    try:
        # Load store configuration
        stores = load_stores()
        matching_stores = [s for s in stores if s.id == store_id]

        if not matching_stores:
            raise APTBridgeError(
                f"Store '{store_id}' not found",
                "STORE_NOT_FOUND",
            )

        store_config = matching_stores[0]

        # Build metadata lookup map for categories
        category_metadata_map = {}
        if store_config.category_metadata:
            category_metadata_map = {
                meta.id: meta for meta in store_config.category_metadata
            }

        # Use origin pre-filtering for performance
        packages_to_check = get_pre_filtered_packages(cache, store_config)

        # Collect packages and category counts in single pass
        packages = []
        category_counts_all: dict[str, int] = {}
        category_counts_available: dict[str, int] = {}
        category_counts_installed: dict[str, int] = {}

        for pkg in packages_to_check:
            # Apply store filter
            if not matches_store_filter(pkg, store_config):
                continue

            # Only process packages with candidate version
            if not pkg.candidate:
                continue

            # Add to packages list
            packages.append(format_package(pkg))

            # Extract category tags for counting
            categories = get_tags_by_facet(pkg, "category")

            # Count for all packages
            for category_id in categories:
                category_counts_all[category_id] = category_counts_all.get(category_id, 0) + 1

            # Count for available (not installed) packages
            if not pkg.is_installed:
                for category_id in categories:
                    category_counts_available[category_id] = (
                        category_counts_available.get(category_id, 0) + 1
                    )

            # Count for installed packages
            if pkg.is_installed:
                for category_id in categories:
                    category_counts_installed[category_id] = (
                        category_counts_installed.get(category_id, 0) + 1
                    )

        # Build category list with metadata
        categories_list = []

        # Get all unique category IDs
        all_category_ids = (
            set(category_counts_all.keys())
            | set(category_counts_available.keys())
            | set(category_counts_installed.keys())
        )

        for category_id in all_category_ids:
            # Check if we have metadata for this category
            metadata = category_metadata_map.get(category_id)

            # Get counts for all three states
            count_all = category_counts_all.get(category_id, 0)
            count_available = category_counts_available.get(category_id, 0)
            count_installed = category_counts_installed.get(category_id, 0)

            if metadata:
                # Use metadata from store config
                categories_list.append(
                    {
                        "id": category_id,
                        "label": metadata.label,
                        "icon": metadata.icon,
                        "description": metadata.description,
                        "count": count_all,
                        "count_all": count_all,
                        "count_available": count_available,
                        "count_installed": count_installed,
                    }
                )
            else:
                # Auto-derive label from ID
                categories_list.append(
                    {
                        "id": category_id,
                        "label": derive_category_label(category_id),
                        "icon": None,
                        "description": None,
                        "count": count_all,
                        "count_all": count_all,
                        "count_available": count_available,
                        "count_installed": count_installed,
                    }
                )

        # Sort categories alphabetically by label
        categories_list.sort(key=lambda c: c["label"])

        # Build store configuration dict
        store_dict = {
            "id": store_config.id,
            "name": store_config.name,
            "description": store_config.description,
            "icon": store_config.icon,
            "banner": store_config.banner,
        }

        # Return consolidated response
        return {
            "store": store_dict,
            "packages": packages,
            "categories": categories_list,
        }

    except APTBridgeError:
        # Re-raise our own errors
        raise
    except Exception as e:
        raise CacheError(
            f"Error loading store data for '{store_id}'",
            details=str(e),
        ) from e
