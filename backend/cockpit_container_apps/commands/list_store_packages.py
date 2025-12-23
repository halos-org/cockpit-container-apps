"""
List store packages command implementation.

Lists all available container store packages (installed and not installed)
by querying APT for packages with the role::container-store tag.
"""

from __future__ import annotations

import logging
from typing import Any

import apt

from cockpit_container_apps.vendor.cockpit_apt_utils.debtag_parser import has_tag

logger = logging.getLogger(__name__)

STORE_PACKAGE_TAG = "role::container-store"


def execute() -> dict[str, Any]:
    """
    List all available container store packages.

    Returns:
        Dictionary with 'store_packages' key containing a list of store package info:
        - package_name: Debian package name
        - store_id: Store identifier (derived from package name)
        - description: Package description
        - installed: Whether the package is currently installed
        - version: Available version (candidate) or installed version

    Note:
        Requires store packages to have the 'role::container-store' tag
        in their debian/control file.
    """
    cache = apt.Cache()

    store_packages: list[dict[str, Any]] = []

    for package in cache:
        if has_tag(package, STORE_PACKAGE_TAG):
            store_packages.append(_package_to_dict(package))

    # Sort by package name for consistent ordering
    store_packages.sort(key=lambda p: p["package_name"])

    logger.info("Found %d store package(s)", len(store_packages))

    return {"store_packages": store_packages}


def _package_to_dict(package: apt.Package) -> dict[str, Any]:
    """Convert an APT package to a dictionary for JSON serialization.

    Args:
        package: APT package object

    Returns:
        Dictionary with package metadata
    """
    # Get version: prefer candidate, fall back to installed
    version = None
    description = ""

    if package.candidate:
        version = package.candidate.version
        description = package.candidate.summary or ""
    elif package.installed:
        version = package.installed.version
        description = package.installed.summary or ""

    # Derive store_id from package name
    # Convention: {store_id}-container-store
    store_id = _derive_store_id(package.name)

    return {
        "package_name": package.name,
        "store_id": store_id,
        "description": description,
        "installed": package.is_installed,
        "version": version,
    }


def _derive_store_id(package_name: str) -> str:
    """Derive the store ID from the package name.

    Convention: package name is '{store_id}-container-store'

    Args:
        package_name: Full package name

    Returns:
        Store ID extracted from package name
    """
    suffix = "-container-store"
    if package_name.endswith(suffix):
        return package_name[: -len(suffix)]
    return package_name
