"""
Unit tests for filter_packages and list_packages_by_category commands.
"""

from unittest.mock import MagicMock, patch

import pytest

from cockpit_container_apps.commands import filter_packages, list_packages_by_category
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError
from tests.conftest import MockCache, MockPackage


@pytest.fixture
def sample_packages():
    """Fixture providing test packages for filtering."""
    packages = []

    # Container apps
    pkg = MockPackage(
        "signalk-container",
        summary="Marine data server",
        version="2.0.0",
        installed=True,
    )
    pkg.candidate.record["Tag"] = "role::container-app, category::communication"
    packages.append(pkg)

    pkg = MockPackage(
        "grafana-container",
        summary="Monitoring dashboard",
        version="10.0.0",
        installed=False,
    )
    pkg.candidate.record["Tag"] = "role::container-app, category::monitoring"
    packages.append(pkg)

    # Regular package without category
    pkg = MockPackage("nginx", summary="HTTP server", version="1.18.0", installed=True)
    pkg.candidate.record["Tag"] = "role::server"
    packages.append(pkg)

    return packages


class TestFilterPackages:
    """Tests for filter_packages command."""

    def test_filter_no_filters(self, sample_packages):
        """Test filtering with no filters returns all packages."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache(sample_packages))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            result = filter_packages.execute()

        assert "packages" in result
        assert "total_count" in result
        assert result["total_count"] == 3
        assert len(result["packages"]) == 3

    def test_filter_by_search(self, sample_packages):
        """Test filtering by search query."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache(sample_packages))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            result = filter_packages.execute(search_query="grafana")

        assert result["total_count"] == 1
        assert result["packages"][0]["name"] == "grafana-container"

    def test_filter_by_installed_tab(self, sample_packages):
        """Test filtering by installed tab."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache(sample_packages))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            result = filter_packages.execute(tab="installed")

        assert result["total_count"] == 2  # signalk and nginx
        names = [p["name"] for p in result["packages"]]
        assert "signalk-container" in names
        assert "nginx" in names

    def test_filter_limit(self, sample_packages):
        """Test result limiting."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache(sample_packages))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            result = filter_packages.execute(limit=1)

        assert result["total_count"] == 3
        assert len(result["packages"]) == 1
        assert result["limited"] is True


class TestListPackagesByCategory:
    """Tests for list_packages_by_category command."""

    def test_list_by_category(self, sample_packages):
        """Test listing packages by category."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache(sample_packages))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            result = list_packages_by_category.execute("monitoring")

        assert len(result) == 1
        assert result[0]["name"] == "grafana-container"

    def test_empty_category(self, sample_packages):
        """Test with category that has no packages."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache(sample_packages))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            result = list_packages_by_category.execute("nonexistent")

        assert result == []

    def test_invalid_category_id(self, sample_packages):
        """Test with empty category ID."""
        mock_apt = MagicMock()
        mock_apt.Cache = MagicMock(return_value=MockCache(sample_packages))

        with patch.dict("sys.modules", {"apt": mock_apt}):
            with pytest.raises(APTBridgeError) as exc_info:
                list_packages_by_category.execute("")

            assert exc_info.value.code == "INVALID_CATEGORY"
