"""
Unit tests for list-categories command.
"""

from unittest.mock import MagicMock, patch

import pytest

from cockpit_container_apps.commands import list_categories
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError
from tests.conftest import MockCache, MockPackage


@pytest.fixture
def marine_packages():
    """Fixture providing marine-themed test packages with category tags."""
    packages = []

    # Navigation packages
    packages.append(
        MockPackage(
            "opencpn-container",
            summary="Open source chart plotter",
            version="5.10.2-1",
            section="graphics",
        )
    )
    packages[-1].candidate.record["Tag"] = (
        "role::container-app, field::marine, field::navigation, "
        "category::navigation, category::chartplotters"
    )

    packages.append(
        MockPackage(
            "avnav-container",
            summary="Touch-optimized chart plotter",
            version="20240520-1",
            section="graphics",
        )
    )
    packages[-1].candidate.record["Tag"] = (
        "role::container-app, field::marine, field::navigation, "
        "category::navigation, category::chartplotters"
    )

    # Monitoring packages
    packages.append(
        MockPackage(
            "signalk-server-container",
            summary="Marine data server",
            version="2.0.0-1",
            section="net",
        )
    )
    packages[-1].candidate.record["Tag"] = (
        "role::container-app, field::marine, "
        "category::communication, category::monitoring"
    )

    packages.append(
        MockPackage(
            "influxdb-container",
            summary="Time series database",
            version="2.7.0-1",
            section="database",
        )
    )
    packages[-1].candidate.record["Tag"] = "role::container-app, category::monitoring"

    packages.append(
        MockPackage(
            "grafana-container",
            summary="Monitoring and visualization",
            version="10.0.0-1",
            section="net",
        )
    )
    packages[-1].candidate.record["Tag"] = (
        "role::container-app, category::visualization, category::monitoring"
    )

    # Package without category tags
    packages.append(
        MockPackage(
            "nginx",
            summary="HTTP server",
            version="1.18.0",
            section="web",
        )
    )
    packages[-1].candidate.record["Tag"] = "role::server, interface::web"

    return packages


@pytest.fixture
def mock_cache_with_categories(marine_packages):
    """Fixture providing a mock APT cache with categorized packages."""
    return MockCache(marine_packages)


def test_list_categories_success(mock_cache_with_categories):
    """Test listing all categories from packages."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    # Should return a list
    assert isinstance(result, list)
    assert len(result) > 0

    # Each category should have required fields
    for category in result:
        assert "id" in category
        assert "label" in category
        assert "icon" in category
        assert "description" in category
        assert "count" in category
        assert isinstance(category["count"], int)
        assert category["count"] > 0

    # Should be sorted alphabetically by label
    labels = [c["label"] for c in result]
    assert labels == sorted(labels)


def test_list_categories_counts_correct(mock_cache_with_categories):
    """Test that package counts per category are correct."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    # From marine_packages:
    # navigation: 2 packages (opencpn, avnav)
    # chartplotters: 2 packages (opencpn, avnav)
    # monitoring: 3 packages (signalk, influxdb, grafana)
    # communication: 1 package (signalk)
    # visualization: 1 package (grafana)

    category_dict = {c["id"]: c for c in result}

    assert category_dict["navigation"]["count"] == 2
    assert category_dict["chartplotters"]["count"] == 2
    assert category_dict["monitoring"]["count"] == 3
    assert category_dict["communication"]["count"] == 1
    assert category_dict["visualization"]["count"] == 1


def test_list_categories_auto_derived_labels(mock_cache_with_categories):
    """Test that labels are auto-derived from category IDs."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    category_dict = {c["id"]: c for c in result}

    # Labels should be title-cased versions of IDs
    assert category_dict["navigation"]["label"] == "Navigation"
    assert category_dict["chartplotters"]["label"] == "Chartplotters"
    assert category_dict["monitoring"]["label"] == "Monitoring"


def test_list_categories_empty_cache():
    """Test listing categories with empty cache."""
    empty_cache = MockCache([])

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=empty_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    assert result == []


def test_list_categories_store_not_found(mock_cache_with_categories):
    """Test error handling when store ID doesn't exist."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch(
            "cockpit_container_apps.commands.list_categories.load_stores"
        ) as mock_load:
            mock_load.return_value = []  # No stores available

            with pytest.raises(APTBridgeError) as exc_info:
                list_categories.execute(store_id="nonexistent")

            assert exc_info.value.code == "STORE_NOT_FOUND"
            assert "nonexistent" in str(exc_info.value.message)


def test_list_categories_cache_error():
    """Test handling of cache errors."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(side_effect=Exception("Cache error"))
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(APTBridgeError) as exc_info:
            list_categories.execute()

        assert exc_info.value.code == "CACHE_ERROR"
