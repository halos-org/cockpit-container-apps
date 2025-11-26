"""Optimized APT cache querying.

This module provides optimized functions for querying the APT cache,
particularly for filtering packages by origin to avoid full cache iteration.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import apt

logger = logging.getLogger(__name__)


def get_package_names_by_origin_fast(origin_name: str) -> set[str]:
    """Fast origin filtering using apt_pkg (low-level API).

    This is much faster than iterating through apt.Cache() because it works
    at the C++ level, avoiding Python FFI overhead.

    Args:
        origin_name: The origin name to filter by (e.g., "Hat Labs")

    Returns:
        Set of package names from the specified origin
    """
    import apt_pkg
    import os

    # Suppress APT progress output to avoid polluting JSON stdout
    # APT writes directly to file descriptors, so we need to redirect at OS level
    old_stdout_fd = os.dup(1)  # Save stdout
    old_stderr_fd = os.dup(2)  # Save stderr

    devnull_fd = os.open(os.devnull, os.O_WRONLY)

    try:
        # Redirect stdout/stderr to /dev/null during APT operations
        os.dup2(devnull_fd, 1)
        os.dup2(devnull_fd, 2)

        apt_pkg.init()
        cache = apt_pkg.Cache()
    finally:
        # Restore original stdout/stderr
        os.dup2(old_stdout_fd, 1)
        os.dup2(old_stderr_fd, 2)

        # Close file descriptors
        os.close(devnull_fd)
        os.close(old_stdout_fd)
        os.close(old_stderr_fd)

    matching_names = set()

    # Iterate at C++ level - much faster than apt.Cache
    for pkg in cache.packages:
        # Check if package has a candidate version
        if not pkg.current_ver and not pkg.has_versions:
            continue

        # Get the version to check (prefer current, fall back to any version)
        if pkg.current_ver:
            ver = pkg.current_ver
        elif pkg.version_list:
            ver = pkg.version_list[0]
        else:
            continue

        # Check origins in version files
        for ver_file, _index in ver.file_list:
            # Check origin field first, fall back to label
            pkg_origin = ver_file.origin or ver_file.label or ""

            if pkg_origin == origin_name:
                matching_names.add(pkg.name)
                break  # Found a match, no need to check other files

    logger.info(
        "Fast origin filter found %d packages from '%s'",
        len(matching_names),
        origin_name,
    )

    return matching_names


def _get_package_origin(package: apt.Package) -> str | None:
    """Extract origin from package candidate.

    Returns origin name, falling back to label if origin is empty.
    Returns None if package has no candidate or origins.

    Args:
        package: APT package object

    Returns:
        Origin name string, or None if unavailable
    """
    # Skip packages without candidate version
    if not hasattr(package, "candidate") or package.candidate is None:
        return None

    # Get package origins
    try:
        origins = package.candidate.origins
        if not origins:
            return None
    except (AttributeError, TypeError):
        logger.debug("Error getting origins for package %s", package.name)
        return None

    # Check first origin (typically the primary source)
    origin_obj = origins[0]

    try:
        # Get origin and label
        pkg_origin = getattr(origin_obj, "origin", "") or ""
        pkg_label = getattr(origin_obj, "label", "") or ""

        # Match on origin, or fall back to label if origin is empty
        return pkg_origin if pkg_origin else pkg_label

    except (AttributeError, TypeError) as e:
        logger.debug(
            "Error checking origin for package %s: %s",
            package.name,
            e,
        )
        return None


def get_packages_by_origin(cache: apt.Cache, origin_name: str) -> list[apt.Package]:
    """Get all packages from a specific origin.

    This function provides an optimized way to filter packages by origin,
    using the fast apt_pkg API to get package names, then only loading
    those specific packages from the apt.Cache.

    Args:
        cache: APT cache object
        origin_name: The origin name to filter by (e.g., "Hat Labs")

    Returns:
        List of packages from the specified origin

    Example:
        >>> cache = apt.Cache()
        >>> marine_packages = get_packages_by_origin(cache, "Hat Labs")
        >>> print(f"Found {len(marine_packages)} packages from Hat Labs")
        Found 20 packages from Hat Labs
    """
    # Use fast apt_pkg filtering to get package names
    matching_names = get_package_names_by_origin_fast(origin_name)

    # Only load the specific packages we need from apt.Cache
    matching_packages = []
    for name in matching_names:
        try:
            pkg = cache[name]
            matching_packages.append(pkg)
        except KeyError:
            logger.debug("Package %s not found in cache", name)
            continue

    logger.info(
        "Loaded %d packages from origin '%s'",
        len(matching_packages),
        origin_name,
    )

    return matching_packages


def get_packages_by_origins(cache: apt.Cache, origin_names: list[str]) -> list[apt.Package]:
    """Get all packages from multiple origins.

    Uses the fast apt_pkg API to filter packages by origin, then loads only
    the matching packages from apt.Cache.

    Args:
        cache: APT cache object
        origin_names: List of origin names to filter by (e.g., ["Hat Labs", "Debian"])

    Returns:
        List of packages from any of the specified origins

    Example:
        >>> cache = apt.Cache()
        >>> packages = get_packages_by_origins(cache, ["Hat Labs", "Custom Repo"])
        >>> print(f"Found {len(packages)} packages from specified origins")
        Found 45 packages from specified origins
    """
    if not origin_names:
        return []

    # Collect package names from all origins
    all_matching_names = set()
    for origin_name in origin_names:
        matching_names = get_package_names_by_origin_fast(origin_name)
        all_matching_names.update(matching_names)

    # Load the specific packages we need
    matching_packages = []
    for name in all_matching_names:
        try:
            pkg = cache[name]
            matching_packages.append(pkg)
        except KeyError:
            logger.debug("Package %s not found in cache", name)
            continue

    logger.info(
        "Loaded %d packages from origins %s",
        len(matching_packages),
        origin_names,
    )

    return matching_packages
