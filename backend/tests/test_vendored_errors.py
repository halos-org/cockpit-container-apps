"""
Tests for vendored error handling utilities.

Verifies that the vendored error classes and formatting functions work correctly.
"""

import json

from cockpit_container_apps.vendor.cockpit_apt_utils.errors import (
    APTBridgeError,
    CacheError,
    PackageNotFoundError,
    format_error,
)


class TestAPTBridgeError:
    """Tests for the base APTBridgeError class."""

    def test_basic_error(self):
        """Test creating a basic error with message only."""
        error = APTBridgeError("Something went wrong")
        assert str(error) == "Something went wrong"
        assert error.message == "Something went wrong"
        assert error.code == "UNKNOWN_ERROR"
        assert error.details is None

    def test_error_with_code(self):
        """Test creating an error with custom code."""
        error = APTBridgeError("Invalid input", code="INVALID_INPUT")
        assert error.message == "Invalid input"
        assert error.code == "INVALID_INPUT"
        assert error.details is None

    def test_error_with_details(self):
        """Test creating an error with details."""
        error = APTBridgeError(
            "Package not found", code="PACKAGE_NOT_FOUND", details="Package name: nginx"
        )
        assert error.message == "Package not found"
        assert error.code == "PACKAGE_NOT_FOUND"
        assert error.details == "Package name: nginx"


class TestPackageNotFoundError:
    """Tests for the PackageNotFoundError class."""

    def test_package_not_found(self):
        """Test creating a package not found error."""
        error = PackageNotFoundError("nginx")
        assert "nginx" in error.message
        assert error.code == "PACKAGE_NOT_FOUND"
        assert error.details == "nginx"

    def test_package_not_found_special_chars(self):
        """Test package not found with special characters in name."""
        error = PackageNotFoundError("lib++-dev")
        assert "lib++-dev" in error.message
        assert error.details == "lib++-dev"


class TestCacheError:
    """Tests for the CacheError class."""

    def test_cache_error_basic(self):
        """Test creating a basic cache error."""
        error = CacheError("Failed to load cache")
        assert error.message == "Failed to load cache"
        assert error.code == "CACHE_ERROR"
        assert error.details is None

    def test_cache_error_with_details(self):
        """Test creating a cache error with details."""
        error = CacheError("Failed to update", details="Network timeout")
        assert error.message == "Failed to update"
        assert error.code == "CACHE_ERROR"
        assert error.details == "Network timeout"


class TestFormatError:
    """Tests for the format_error function."""

    def test_format_basic_error(self):
        """Test formatting a basic error as JSON."""
        error = APTBridgeError("Test error")
        result = format_error(error)

        # Should be valid JSON
        parsed = json.loads(result)
        assert parsed["error"] == "Test error"
        assert parsed["code"] == "UNKNOWN_ERROR"
        assert "details" not in parsed

    def test_format_error_with_details(self):
        """Test formatting an error with details as JSON."""
        error = APTBridgeError("Failed", code="TEST_CODE", details="Additional info")
        result = format_error(error)

        parsed = json.loads(result)
        assert parsed["error"] == "Failed"
        assert parsed["code"] == "TEST_CODE"
        assert parsed["details"] == "Additional info"

    def test_format_package_not_found(self):
        """Test formatting a PackageNotFoundError as JSON."""
        error = PackageNotFoundError("missing-pkg")
        result = format_error(error)

        parsed = json.loads(result)
        assert "missing-pkg" in parsed["error"]
        assert parsed["code"] == "PACKAGE_NOT_FOUND"
        assert parsed["details"] == "missing-pkg"
