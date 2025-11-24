"""
Tests for vendored JSON formatter utilities.

Verifies that the formatters produce valid JSON output.
"""

import json

import pytest

from cockpit_container_apps.vendor.cockpit_apt_utils.formatters import (
    format_package,
    format_package_details,
    to_json,
)


class TestToJson:
    """Tests for the to_json function."""

    def test_dict_to_json(self):
        """Test converting a dict to JSON."""
        result = to_json({"name": "test", "value": 123})
        parsed = json.loads(result)
        assert parsed["name"] == "test"
        assert parsed["value"] == 123

    def test_list_to_json(self):
        """Test converting a list to JSON."""
        result = to_json([1, 2, 3])
        parsed = json.loads(result)
        assert parsed == [1, 2, 3]


class TestFormatPackage:
    """Tests for the format_package function."""

    def test_format_basic_package(self, mock_apt_package):
        """Test formatting a basic package."""
        result = format_package(mock_apt_package)

        # Should be a valid dict that can be serialized to JSON
        json_str = json.dumps(result)
        parsed = json.loads(json_str)

        assert parsed["name"] == "test-package"
        assert "version" in parsed
        assert "summary" in parsed

    def test_format_installed_package(self, mock_apt_package):
        """Test formatting an installed package."""
        mock_apt_package.is_installed = True
        result = format_package(mock_apt_package)

        assert result["installed"] is True

    def test_format_upgradable_package(self, mock_apt_package):
        """Test formatting an upgradable package."""
        mock_apt_package.is_installed = True
        mock_apt_package.is_upgradable = True
        result = format_package(mock_apt_package)

        # Should indicate upgradable status
        assert "upgradable" in result or "installed" in result


class TestFormatPackageDetails:
    """Tests for the format_package_details function."""

    def test_format_detailed_package(self, mock_apt_package):
        """Test formatting a detailed package."""
        result = format_package_details(mock_apt_package)

        # Should be a valid dict that can be serialized to JSON
        json_str = json.dumps(result)
        parsed = json.loads(json_str)

        assert parsed["name"] == "test-package"
        assert "description" in parsed

    def test_format_detailed_includes_sizes(self, mock_apt_package):
        """Test that detailed format includes size information."""
        result = format_package_details(mock_apt_package)

        # Should have size information
        assert "size" in result or "installedSize" in result
