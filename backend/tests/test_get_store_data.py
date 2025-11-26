"""
Unit tests for get_store_data command.

This command consolidates store configuration, packages, and categories
into a single response to reduce API roundtrips.
"""

from unittest.mock import MagicMock, patch

import pytest

from cockpit_container_apps.commands import get_store_data
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError
from tests.conftest import MockCache, MockPackage


@pytest.fixture
def marine_packages():
    """Fixture with marine store packages."""
    packages = []

    # Marine navigation packages
    pkg1 = MockPackage("signalk-container", summary="Marine data server", installed=True)
    pkg1.candidate.record["Tag"] = "role::container-app, field::marine, category::communication"
    origin1 = MagicMock()
    origin1.origin = "Hat Labs"
    origin1.label = "Hat Labs"
    origin1.suite = "stable"
    pkg1.candidate.origins = [origin1]
    packages.append(pkg1)

    pkg2 = MockPackage("opencpn-container", summary="Chart plotter", installed=False)
    pkg2.candidate.record["Tag"] = "role::container-app, field::marine, category::navigation"
    origin2 = MagicMock()
    origin2.origin = "Hat Labs"
    origin2.label = "Hat Labs"
    origin2.suite = "stable"
    pkg2.candidate.origins = [origin2]
    packages.append(pkg2)

    pkg3 = MockPackage("grafana-container", summary="Monitoring dashboard", installed=True)
    pkg3.candidate.record["Tag"] = "role::container-app, field::marine, category::monitoring"
    origin3 = MagicMock()
    origin3.origin = "Hat Labs"
    origin3.label = "Hat Labs"
    origin3.suite = "stable"
    pkg3.candidate.origins = [origin3]
    packages.append(pkg3)

    # Add some Debian packages that should NOT appear (different origin)
    for i in range(10):
        pkg = MockPackage(f"debian-pkg-{i}", summary=f"Debian package {i}")
        origin_deb = MagicMock()
        origin_deb.origin = "Debian"
        origin_deb.label = "Debian"
        origin_deb.suite = "trixie"
        pkg.candidate.origins = [origin_deb]
        pkg.candidate.record["Tag"] = "role::application"
        packages.append(pkg)

    return packages


class TestGetStoreData:
    """Tests for get_store_data command."""

    @patch("cockpit_container_apps.commands.get_store_data.load_stores")
    def test_get_store_data_success(self, mock_load_stores, marine_packages):
        """Test successful retrieval of consolidated store data."""
        # Mock the store configuration
        from cockpit_container_apps.utils.store_config import StoreConfig, StoreFilter

        marine_store = StoreConfig(
            id="marine",
            name="Marine Apps",
            description="Marine navigation and monitoring apps",
            filters=StoreFilter(
                include_origins=["Hat Labs"],
                include_sections=[],
                include_tags=["role::container-app"],
                include_packages=[],
            ),
        )
        mock_load_stores.return_value = [marine_store]

        # Mock APT cache
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache(marine_packages))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            result = get_store_data.execute("marine")

        # Verify response structure
        assert "store" in result
        assert "packages" in result
        assert "categories" in result

        # Verify store config is returned
        assert result["store"]["id"] == "marine"
        assert result["store"]["name"] == "Marine Apps"

        # Verify only Hat Labs packages are returned (3, not 13)
        assert len(result["packages"]) == 3
        package_names = [p["name"] for p in result["packages"]]
        assert "signalk-container" in package_names
        assert "opencpn-container" in package_names
        assert "grafana-container" in package_names
        assert "debian-pkg-0" not in package_names

        # Verify categories are extracted
        assert len(result["categories"]) == 3
        category_ids = [c["id"] for c in result["categories"]]
        assert "communication" in category_ids
        assert "navigation" in category_ids
        assert "monitoring" in category_ids

        # Verify category counts
        comm_category = next(c for c in result["categories"] if c["id"] == "communication")
        assert comm_category["count_all"] == 1
        assert comm_category["count_installed"] == 1
        assert comm_category["count_available"] == 0

        nav_category = next(c for c in result["categories"] if c["id"] == "navigation")
        assert nav_category["count_all"] == 1
        assert nav_category["count_installed"] == 0
        assert nav_category["count_available"] == 1

    @patch("cockpit_container_apps.commands.get_store_data.load_stores")
    def test_store_not_found(self, mock_load_stores):
        """Test error when store doesn't exist."""
        mock_load_stores.return_value = []

        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache([]))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            with pytest.raises(APTBridgeError) as exc_info:
                get_store_data.execute("nonexistent")

            assert exc_info.value.code == "STORE_NOT_FOUND"

    @patch("cockpit_container_apps.commands.get_store_data.load_stores")
    def test_empty_store_name(self, mock_load_stores):
        """Test error when store name is empty."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache([]))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            with pytest.raises(APTBridgeError) as exc_info:
                get_store_data.execute("")

            assert "cannot be empty" in str(exc_info.value.message).lower()

    @patch("cockpit_container_apps.commands.get_store_data.load_stores")
    def test_performance_with_large_cache(self, mock_load_stores, marine_packages):
        """Test that pre-filtering works with large APT cache."""
        from cockpit_container_apps.utils.store_config import StoreConfig, StoreFilter

        marine_store = StoreConfig(
            id="marine",
            name="Marine Apps",
            description="Marine apps",
            filters=StoreFilter(
                include_origins=["Hat Labs"],
                include_sections=[],
                include_tags=["role::container-app"],
                include_packages=[],
            ),
        )
        mock_load_stores.return_value = [marine_store]

        # Large cache: 3 Hat Labs + 1000 Debian packages
        large_cache = marine_packages.copy()
        for i in range(1000):
            pkg = MockPackage(f"debian-large-{i}", summary=f"Debian package {i}")
            origin = MagicMock()
            origin.origin = "Debian"
            origin.label = "Debian"
            origin.suite = "trixie"
            pkg.candidate.origins = [origin]
            large_cache.append(pkg)

        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache(large_cache))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            result = get_store_data.execute("marine")

        # Should still only return Hat Labs packages (3, not 1003)
        assert len(result["packages"]) == 3
        # Performance improvement: only processed 3 packages instead of 1003
        package_names = [p["name"] for p in result["packages"]]
        assert all("container" in name for name in package_names)

    @patch("cockpit_container_apps.commands.get_store_data.load_stores")
    def test_categories_sorted_alphabetically(self, mock_load_stores, marine_packages):
        """Test that categories are sorted by label."""
        from cockpit_container_apps.utils.store_config import StoreConfig, StoreFilter

        marine_store = StoreConfig(
            id="marine",
            name="Marine Apps",
            description="Marine apps",
            filters=StoreFilter(
                include_origins=["Hat Labs"],
                include_sections=[],
                include_tags=["role::container-app"],
                include_packages=[],
            ),
        )
        mock_load_stores.return_value = [marine_store]

        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache(marine_packages))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            result = get_store_data.execute("marine")

        # Categories should be sorted alphabetically by label
        labels = [c["label"] for c in result["categories"]]
        assert labels == sorted(labels)
