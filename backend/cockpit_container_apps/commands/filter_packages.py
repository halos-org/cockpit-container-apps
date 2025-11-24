"""
Package filter command implementation.

Filters packages with cascade filtering: store → repository → category → tab → search.
"""

from typing import Any

from cockpit_container_apps.vendor.cockpit_apt_utils.debtag_parser import get_tags_by_facet
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import CacheError
from cockpit_container_apps.vendor.cockpit_apt_utils.formatters import format_package
from cockpit_container_apps.vendor.cockpit_apt_utils.repository_parser import (
    package_matches_repository,
)
from cockpit_container_apps.vendor.cockpit_apt_utils.store_config import load_stores
from cockpit_container_apps.vendor.cockpit_apt_utils.store_filter import matches_store_filter


def execute(
    store_id: str | None = None,
    repository_id: str | None = None,
    category_id: str | None = None,
    tab: str | None = None,
    search_query: str | None = None,
    limit: int = 1000,
) -> dict[str, Any]:
    """
    Filter packages with cascade filtering.

    Filter order (cascade):
    1. Store filter (if specified)
    2. Repository filter (if specified)
    3. Category filter (if specified)
    4. Tab filter: "installed" or "upgradable" (if specified)
    5. Search query (if specified)

    Args:
        store_id: Optional store ID to filter by
        repository_id: Optional repository ID to filter by
        category_id: Optional category ID to filter by (from category:: debtags)
        tab: Optional tab filter ("installed" or "upgradable")
        search_query: Optional search query to filter by
        limit: Maximum number of packages to return (default 1000)

    Returns:
        Dictionary with packages, total_count, applied_filters, limit, limited

    Raises:
        CacheError: If APT cache operations fail
    """
    try:
        import apt  # type: ignore
    except ImportError:
        raise CacheError(
            "python-apt not available - must run on Debian/Ubuntu system",
            details="ImportError: No module named 'apt'",
        ) from None

    try:
        cache = apt.Cache()
    except Exception as e:
        raise CacheError("Failed to open APT cache", details=str(e)) from e

    # Load store config if filtering by store
    store = None
    if store_id:
        stores = load_stores()
        store = next((s for s in stores if s.id == store_id), None)
        if not store:
            raise CacheError(
                f"Store not found: {store_id}",
                f"No store configuration found with id '{store_id}'",
            )

    # Validate tab filter
    if tab and tab not in ("installed", "upgradable"):
        raise CacheError(
            f"Invalid tab filter: {tab}",
            "Tab must be 'installed' or 'upgradable'",
        )

    try:
        matching_packages = []
        applied_filters = []

        for pkg in cache:
            if not pkg.candidate:
                continue

            if store and not matches_store_filter(pkg, store):
                continue

            if repository_id and not package_matches_repository(pkg, repository_id):
                continue

            if category_id:
                categories = get_tags_by_facet(pkg, "category")
                if category_id not in categories:
                    continue

            if tab == "installed" and not pkg.is_installed:
                continue
            if tab == "upgradable" and not pkg.is_upgradable:
                continue

            if search_query:
                query_lower = search_query.lower()
                name_match = query_lower in pkg.name.lower()
                summary_match = (
                    pkg.candidate.summary and query_lower in pkg.candidate.summary.lower()
                )
                if not (name_match or summary_match):
                    continue

            matching_packages.append(pkg)

        if store_id:
            applied_filters.append(f"store={store_id}")
        if repository_id:
            applied_filters.append(f"repository={repository_id}")
        if category_id:
            applied_filters.append(f"category={category_id}")
        if tab:
            applied_filters.append(f"tab={tab}")
        if search_query:
            applied_filters.append(f"search={search_query}")

        total_count = len(matching_packages)
        limited_packages = matching_packages[:limit]
        package_summaries = [format_package(pkg) for pkg in limited_packages]

        return {
            "packages": package_summaries,
            "total_count": total_count,
            "applied_filters": applied_filters,
            "limit": limit,
            "limited": total_count > limit,
        }

    except Exception as e:
        raise CacheError("Error filtering packages", details=str(e)) from e
