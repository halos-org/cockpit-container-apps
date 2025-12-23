"""Tests for list_store_packages command."""

from unittest.mock import MagicMock, patch

from cockpit_container_apps.commands import list_store_packages


def create_mock_package(
    name: str,
    tags: list[str] | None = None,
    installed: bool = False,
    version: str = "1.0.0",
    summary: str = "Test package",
) -> MagicMock:
    """Create a mock apt package with optional tags."""
    pkg = MagicMock()
    pkg.name = name
    pkg.is_installed = installed

    pkg.candidate = MagicMock()
    pkg.candidate.version = version
    pkg.candidate.summary = summary

    # Set up the Tag field in the record
    if tags:
        pkg.candidate.record = {"Tag": ", ".join(tags)}
    else:
        pkg.candidate.record = {}

    if installed:
        pkg.installed = MagicMock()
        pkg.installed.version = version
        pkg.installed.summary = summary
    else:
        pkg.installed = None

    return pkg


def test_list_store_packages_empty():
    """Test listing store packages when none are available."""
    mock_cache = MagicMock()
    mock_cache.__iter__ = lambda self: iter([])

    with patch("apt.Cache", return_value=mock_cache):
        result = list_store_packages.execute()

    assert result == {"store_packages": []}


def test_list_store_packages_with_stores():
    """Test listing store packages when some are available."""
    mock_packages = [
        create_mock_package(
            "marine-container-store",
            tags=["role::container-store"],
            installed=True,
            version="0.2.0-1",
            summary="Marine container application store",
        ),
        create_mock_package(
            "casaos-container-store",
            tags=["role::container-store"],
            installed=False,
            version="1.0.0-1",
            summary="CasaOS container application store",
        ),
        # Non-store package (should be filtered out)
        create_mock_package(
            "signalk-server-container",
            tags=["role::container-app", "field::marine"],
            installed=True,
            version="2.18.0-1",
            summary="Signal K Server",
        ),
    ]

    mock_cache = MagicMock()
    mock_cache.__iter__ = lambda self: iter(mock_packages)

    with patch("apt.Cache", return_value=mock_cache):
        result = list_store_packages.execute()

    assert "store_packages" in result
    store_packages = result["store_packages"]
    assert len(store_packages) == 2

    # Check first package (casaos - alphabetical order)
    assert store_packages[0]["package_name"] == "casaos-container-store"
    assert store_packages[0]["store_id"] == "casaos"
    assert store_packages[0]["installed"] is False
    assert store_packages[0]["version"] == "1.0.0-1"
    assert store_packages[0]["description"] == "CasaOS container application store"

    # Check second package (marine)
    assert store_packages[1]["package_name"] == "marine-container-store"
    assert store_packages[1]["store_id"] == "marine"
    assert store_packages[1]["installed"] is True
    assert store_packages[1]["version"] == "0.2.0-1"


def test_list_store_packages_no_tags():
    """Test that packages without tags are excluded."""
    mock_packages = [
        create_mock_package(
            "some-package",
            tags=None,  # No tags
            installed=True,
        ),
    ]

    mock_cache = MagicMock()
    mock_cache.__iter__ = lambda self: iter(mock_packages)

    with patch("apt.Cache", return_value=mock_cache):
        result = list_store_packages.execute()

    assert result == {"store_packages": []}


def test_list_store_packages_wrong_tag():
    """Test that packages with different tags are excluded."""
    mock_packages = [
        create_mock_package(
            "test-container-app",
            tags=["role::container-app"],  # Wrong tag
            installed=True,
        ),
    ]

    mock_cache = MagicMock()
    mock_cache.__iter__ = lambda self: iter(mock_packages)

    with patch("apt.Cache", return_value=mock_cache):
        result = list_store_packages.execute()

    assert result == {"store_packages": []}


def test_derive_store_id():
    """Test store ID derivation from package name."""
    assert list_store_packages._derive_store_id("marine-container-store") == "marine"
    assert list_store_packages._derive_store_id("casaos-container-store") == "casaos"
    assert (
        list_store_packages._derive_store_id("custom-name-container-store")
        == "custom-name"
    )
    # Edge case: package without standard suffix
    assert list_store_packages._derive_store_id("other-package") == "other-package"
