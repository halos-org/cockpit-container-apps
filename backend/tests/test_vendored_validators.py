"""
Tests for vendored input validation utilities.

Verifies that package name and section name validators work correctly
and properly reject invalid input.
"""

import pytest

from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError
from cockpit_container_apps.vendor.cockpit_apt_utils.validators import (
    validate_package_name,
    validate_section_name,
)


class TestValidatePackageName:
    """Tests for the validate_package_name function."""

    def test_valid_simple_name(self):
        """Test that valid simple package names pass validation."""
        # Should not raise
        validate_package_name("nginx")
        validate_package_name("python3")
        validate_package_name("libc6")

    def test_valid_name_with_special_chars(self):
        """Test valid package names with allowed special characters."""
        validate_package_name("g++")
        validate_package_name("libfoo-dev")
        validate_package_name("python3.11")
        validate_package_name("libfoo+bar")

    def test_valid_name_starting_with_digit(self):
        """Test valid package names starting with a digit."""
        validate_package_name("0ad")
        validate_package_name("3dchess")

    def test_empty_name_rejected(self):
        """Test that empty package names are rejected."""
        with pytest.raises(APTBridgeError) as exc_info:
            validate_package_name("")
        assert exc_info.value.code == "INVALID_INPUT"

    def test_uppercase_rejected(self):
        """Test that uppercase letters are rejected."""
        with pytest.raises(APTBridgeError) as exc_info:
            validate_package_name("Nginx")
        assert exc_info.value.code == "INVALID_INPUT"

    def test_path_separator_rejected(self):
        """Test that path separators are rejected."""
        with pytest.raises(APTBridgeError) as exc_info:
            validate_package_name("foo/bar")
        assert exc_info.value.code == "INVALID_INPUT"

    def test_shell_metacharacters_rejected(self):
        """Test that shell metacharacters are rejected."""
        dangerous = [";", "&", "|", "$", "`", "(", ")", "<", ">"]
        for char in dangerous:
            with pytest.raises(APTBridgeError) as exc_info:
                validate_package_name(f"pkg{char}name")
            assert exc_info.value.code == "INVALID_INPUT"

    def test_too_long_name_rejected(self):
        """Test that overly long package names are rejected."""
        long_name = "a" * 256
        with pytest.raises(APTBridgeError) as exc_info:
            validate_package_name(long_name)
        assert exc_info.value.code == "INVALID_INPUT"

    def test_max_length_accepted(self):
        """Test that maximum length package names are accepted."""
        max_name = "a" * 255
        validate_package_name(max_name)  # Should not raise


class TestValidateSectionName:
    """Tests for the validate_section_name function."""

    def test_valid_simple_section(self):
        """Test that valid simple section names pass validation."""
        validate_section_name("admin")
        validate_section_name("utils")
        validate_section_name("games")

    def test_valid_composite_section(self):
        """Test valid section names with slashes."""
        validate_section_name("contrib/games")
        validate_section_name("non-free/libs")

    def test_valid_section_with_special_chars(self):
        """Test valid section names with allowed special characters."""
        validate_section_name("x11")
        validate_section_name("gnu-r")
        validate_section_name("web_apps")

    def test_empty_section_rejected(self):
        """Test that empty section names are rejected."""
        with pytest.raises(APTBridgeError) as exc_info:
            validate_section_name("")
        assert exc_info.value.code == "INVALID_INPUT"

    def test_uppercase_rejected(self):
        """Test that uppercase letters are rejected."""
        with pytest.raises(APTBridgeError) as exc_info:
            validate_section_name("Admin")
        assert exc_info.value.code == "INVALID_INPUT"

    def test_too_long_section_rejected(self):
        """Test that overly long section names are rejected."""
        long_section = "a" * 101
        with pytest.raises(APTBridgeError) as exc_info:
            validate_section_name(long_section)
        assert exc_info.value.code == "INVALID_INPUT"
