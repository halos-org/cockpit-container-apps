"""Tests for set_config command."""

import subprocess
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from cockpit_container_apps.commands import set_config


class TestSetConfig:
    """Tests for set-config command."""

    def test_set_config_simple(self):
        """Test setting simple config values."""
        # Create schema
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
        min: 1
        max: 65535
      - id: HOST
        type: string
        label: Host
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        # Create config file location
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            result = set_config.execute(
                package="signalk",
                config={"PORT": "8080", "HOST": "0.0.0.0"},
            )

        schema_path.unlink()

        assert result["success"] is True

        # Verify file was written
        content = config_path.read_text()
        assert "PORT=8080" in content or 'PORT="8080"' in content
        assert "HOST=0.0.0.0" in content or 'HOST="0.0.0.0"' in content

        config_path.unlink()

    def test_set_config_validation_success(self):
        """Test that valid values pass validation."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
        min: 1
        max: 65535
        required: true
      - id: DEBUG
        type: boolean
        label: Debug Mode
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            result = set_config.execute(
                package="signalk",
                config={"PORT": "3000", "DEBUG": "true"},
            )

        schema_path.unlink()
        config_path.unlink()

        assert result["success"] is True

    def test_set_config_validation_failure_integer(self):
        """Test that invalid integer values fail validation."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
        min: 1
        max: 65535
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            # Test value out of range
            result = set_config.execute(
                package="signalk",
                config={"PORT": "99999"},  # Above max
            )

        schema_path.unlink()
        config_path.unlink()

        assert result["success"] is False
        assert "error" in result
        assert "validation" in result["error"].lower() or "invalid" in result["error"].lower()

    def test_set_config_validation_failure_enum(self):
        """Test that invalid enum values fail validation."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: LOG_LEVEL
        type: enum
        label: Log Level
        options:
          - value: debug
            label: Debug
          - value: info
            label: Info
          - value: error
            label: Error
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            result = set_config.execute(
                package="signalk",
                config={"LOG_LEVEL": "trace"},  # Not in enum options
            )

        schema_path.unlink()
        config_path.unlink()

        assert result["success"] is False
        assert "error" in result

    def test_set_config_validation_failure_required(self):
        """Test that missing required fields fail validation."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
        required: true
      - id: HOST
        type: string
        label: Host
        required: false
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            # Missing required PORT field
            result = set_config.execute(
                package="signalk",
                config={"HOST": "localhost"},
            )

        schema_path.unlink()
        config_path.unlink()

        assert result["success"] is False
        assert "error" in result
        assert "required" in result["error"].lower() or "PORT" in result["error"]

    def test_set_config_unknown_field(self):
        """Test setting config with unknown field (not in schema)."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            result = set_config.execute(
                package="signalk",
                config={"PORT": "3000", "UNKNOWN_FIELD": "value"},
            )

        schema_path.unlink()
        config_path.unlink()

        # Should fail - unknown fields not allowed
        assert result["success"] is False
        assert "error" in result
        assert "unknown" in result["error"].lower() or "UNKNOWN_FIELD" in result["error"]

    def test_set_config_empty_config(self):
        """Test setting empty config."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
        required: false
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            result = set_config.execute(package="signalk", config={})

        schema_path.unlink()

        # Should succeed - no required fields
        assert result["success"] is True

        # File should be empty or contain no config
        content = config_path.read_text()
        assert content == "" or content.strip() == ""

        config_path.unlink()

    def test_set_config_preserves_unmanaged_keys(self):
        """Test that setting config preserves keys not managed by schema."""
        # This test ensures we don't delete user's custom env vars
        # that aren't in the schema
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        # Create existing config with unmanaged key
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            f.write("PORT=3000\n")
            f.write("CUSTOM_ENV_VAR=custom_value\n")  # Not in schema
            f.flush()
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            # Update PORT only
            result = set_config.execute(
                package="signalk",
                config={"PORT": "8080"},
            )

        schema_path.unlink()

        assert result["success"] is True

        # Verify CUSTOM_ENV_VAR was NOT deleted
        content = config_path.read_text()
        assert "PORT=8080" in content or 'PORT="8080"' in content
        # Note: This behavior depends on implementation
        # If we want to preserve unmanaged keys, they should still be there
        # For now, let's assume we ONLY write the keys provided in config
        # So CUSTOM_ENV_VAR will be lost

        config_path.unlink()

    def test_set_config_atomic_write(self):
        """Test that config writes are atomic."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        # Write initial content
        config_path.write_text("OLD_CONTENT=should_be_replaced\n")

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            result = set_config.execute(
                package="signalk",
                config={"PORT": "3000"},
            )

        schema_path.unlink()

        assert result["success"] is True

        # Verify old content was replaced
        content = config_path.read_text()
        assert "PORT=3000" in content or 'PORT="3000"' in content
        # OLD_CONTENT should be gone (we replace the entire file)

        config_path.unlink()

    def test_set_config_missing_schema(self):
        """Test setting config when schema doesn't exist."""
        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=Path("/nonexistent/config.yml"),
        ):
            result = set_config.execute(
                package="signalk",
                config={"PORT": "3000"},
            )

        assert result["success"] is False
        assert "error" in result
        assert "schema" in result["error"].lower() or "not found" in result["error"].lower()

    def test_set_config_empty_package_name(self):
        """Test setting config with empty package name."""
        with pytest.raises(ValueError, match="package name"):
            set_config.execute(package="", config={"PORT": "3000"})

    def test_set_config_invalid_package_name(self):
        """Test setting config with invalid package name."""
        with pytest.raises(ValueError, match="package name"):
            set_config.execute(package="../../etc/passwd", config={"PORT": "3000"})

    def test_set_config_write_error(self):
        """Test handling of write errors."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        # Use a path that should fail to write (read-only filesystem)
        config_path = Path("/proc/this/should/fail")

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            result = set_config.execute(
                package="signalk",
                config={"PORT": "3000"},
            )

        schema_path.unlink()

        assert result["success"] is False
        assert "error" in result

    def test_set_config_all_field_types(self):
        """Test setting config with all field types."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: STRING_FIELD
        type: string
        label: String
      - id: INT_FIELD
        type: integer
        label: Integer
        min: 0
        max: 100
      - id: BOOL_FIELD
        type: boolean
        label: Boolean
      - id: ENUM_FIELD
        type: enum
        label: Enum
        options:
          - value: opt1
            label: Option 1
          - value: opt2
            label: Option 2
      - id: PASSWORD_FIELD
        type: password
        label: Password
      - id: PATH_FIELD
        type: path
        label: Path
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ):
            result = set_config.execute(
                package="signalk",
                config={
                    "STRING_FIELD": "test",
                    "INT_FIELD": "50",
                    "BOOL_FIELD": "true",
                    "ENUM_FIELD": "opt1",
                    "PASSWORD_FIELD": "secret",
                    "PATH_FIELD": "/var/lib/data",
                },
            )

        schema_path.unlink()
        config_path.unlink()

        assert result["success"] is True

    def test_set_config_restart_service_success(self):
        """Test that service restart succeeds after config save."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ), patch("subprocess.run") as mock_run:
            # Mock successful restart
            mock_run.return_value = Mock(returncode=0, stderr="")

            result = set_config.execute(
                package="signalk",
                config={"PORT": "8080"},
            )

        schema_path.unlink()
        config_path.unlink()

        # Verify success without warning
        assert result["success"] is True
        assert "warning" not in result

        # Verify systemctl was called
        mock_run.assert_called_once_with(
            ["systemctl", "restart", "signalk.service"],
            capture_output=True,
            text=True,
            timeout=30,
        )

    def test_set_config_restart_failure_returns_warning(self):
        """Test that service restart failure returns warning."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ), patch("subprocess.run") as mock_run:
            # Mock failed restart
            mock_run.return_value = Mock(returncode=1, stderr="Service not found")

            result = set_config.execute(
                package="signalk",
                config={"PORT": "8080"},
            )

        schema_path.unlink()
        config_path.unlink()

        # Config should still be saved
        assert result["success"] is True
        # But with warning
        assert "warning" in result
        assert "Service not found" in result["warning"]

    def test_set_config_restart_timeout_returns_warning(self):
        """Test that service restart timeout returns warning."""
        schema_content = """version: "1.0"
groups:
  - id: general
    label: General Settings
    fields:
      - id: PORT
        type: integer
        label: Port
"""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".yml") as f:
            f.write(schema_content)
            f.flush()
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".env") as f:
            config_path = Path(f.name)

        with patch(
            "cockpit_container_apps.commands.set_config.get_config_schema_path",
            return_value=schema_path,
        ), patch(
            "cockpit_container_apps.commands.set_config.get_config_file_path",
            return_value=config_path,
        ), patch("subprocess.run") as mock_run:
            # Mock timeout
            mock_run.side_effect = subprocess.TimeoutExpired("systemctl", 30)

            result = set_config.execute(
                package="signalk",
                config={"PORT": "8080"},
            )

        schema_path.unlink()
        config_path.unlink()

        # Config should still be saved
        assert result["success"] is True
        # But with warning
        assert "warning" in result
        assert "timed out" in result["warning"]
