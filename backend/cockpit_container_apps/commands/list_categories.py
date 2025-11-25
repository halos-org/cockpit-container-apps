"""
List-categories command implementation.

Auto-discovers categories from package category:: tags within a store's
filtered packages. Optionally enhances categories with metadata from
store configuration.
"""

from typing import Any

from cockpit_container_apps.vendor.cockpit_apt_utils.debtag_parser import (
    derive_category_label,
    get_tags_by_facet,
)
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError, CacheError
from cockpit_container_apps.vendor.cockpit_apt_utils.store_config import load_stores
from cockpit_container_apps.vendor.cockpit_apt_utils.store_filter import matches_store_filter


def execute(store_id: str | None = None, tab: str | None = None) -> list[dict[str, Any]]:
    """
    List all categories auto-discovered from packages in a store.

    Categories are extracted from package category:: tags. Only packages
    matching the store filter are considered. Category metadata (label,
    icon, description) can be enhanced via store configuration.

    Args:
        store_id: Optional store ID to filter packages. If None, uses all packages.
        tab: Optional tab filter ("installed" or "upgradable") to filter package counts.

    Returns:
        List of category dictionaries with id, label, icon, description, and count,
        sorted alphabetically by label.

    Raises:
        APTBridgeError: If store_id is invalid
        CacheError: If APT cache operations fail
    """
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
        # Load store configuration if store_id provided
        store_config = None
        category_metadata_map = {}

        if store_id:
            stores = load_stores()
            matching_stores = [s for s in stores if s.id == store_id]

            if not matching_stores:
                raise APTBridgeError(
                    f"Store '{store_id}' not found",
                    "STORE_NOT_FOUND",
                )

            store_config = matching_stores[0]

            # Build metadata lookup map
            if store_config.category_metadata:
                category_metadata_map = {
                    meta.id: meta for meta in store_config.category_metadata
                }

        # Collect categories with counts for all states (all, available, installed)
        # This allows frontend to switch between states without reloading
        category_counts_all: dict[str, int] = {}
        category_counts_available: dict[str, int] = {}
        category_counts_installed: dict[str, int] = {}

        for pkg in cache:
            # Apply store filter if configured
            if store_config and not matches_store_filter(pkg, store_config):
                continue

            # Only count packages with candidate version
            if not pkg.candidate:
                continue

            # Extract category tags
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

        # Select the appropriate counts based on tab filter
        if tab == "installed":
            category_counts = category_counts_installed
        elif tab == "available":
            category_counts = category_counts_available
        else:
            category_counts = category_counts_all

        # Build category list with metadata
        categories = []

        for category_id, count in category_counts.items():
            # Check if we have metadata for this category
            metadata = category_metadata_map.get(category_id)

            if metadata:
                # Use metadata from store config
                categories.append(
                    {
                        "id": category_id,
                        "label": metadata.label,
                        "icon": metadata.icon,
                        "description": metadata.description,
                        "count": count,
                    }
                )
            else:
                # Auto-derive label from ID
                categories.append(
                    {
                        "id": category_id,
                        "label": derive_category_label(category_id),
                        "icon": None,
                        "description": None,
                        "count": count,
                    }
                )

        # Sort alphabetically by label
        categories.sort(key=lambda c: c["label"])

        return categories

    except APTBridgeError:
        # Re-raise our own errors
        raise
    except Exception as e:
        raise CacheError("Error listing categories", details=str(e)) from e
