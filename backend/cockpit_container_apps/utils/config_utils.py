"""Configuration management utilities.

This module provides shared utilities for configuration management:
- Path construction for config files
- Environment file parsing
- Environment file writing (atomic)
- Config value validation
"""

import logging
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Base paths for config files
CONFIG_SCHEMA_BASE = Path("/var/lib/container-apps")
CONFIG_BASE = Path("/etc/container-apps")


def get_config_schema_path(package: str) -> Path:
    """Get path to config schema file.

    Args:
        package: Package name

    Returns:
        Path to config.yml schema file

    Raises:
        ValueError: If package name is invalid
    """
    _validate_package_name(package)
    return CONFIG_SCHEMA_BASE / package / "config.yml"


def get_env_defaults_path(package: str) -> Path:
    """Get path to env defaults file.

    Args:
        package: Package name

    Returns:
        Path to env.defaults file

    Raises:
        ValueError: If package name is invalid
    """
    _validate_package_name(package)
    return CONFIG_BASE / package / "env.defaults"


def get_config_file_path(package: str) -> Path:
    """Get path to user config file.

    Args:
        package: Package name

    Returns:
        Path to env file (user config)

    Raises:
        ValueError: If package name is invalid
    """
    _validate_package_name(package)
    return CONFIG_BASE / package / "env"


def _validate_package_name(package: str) -> None:
    """Validate package name for security.

    Args:
        package: Package name to validate

    Raises:
        ValueError: If package name is invalid or contains path traversal
    """
    if not package:
        raise ValueError("package name cannot be empty")

    # Check for path traversal attempts
    if ".." in package or "/" in package:
        raise ValueError(f"Invalid package name: {package}")

    # Package names should be alphanumeric with hyphens/underscores only
    if not re.match(r"^[a-zA-Z0-9_-]+$", package):
        raise ValueError(f"Invalid package name: {package}")


def parse_env_file(path: Path) -> dict[str, str]:
    """Parse environment file into key-value dict.

    Supports:
    - Simple KEY=value format
    - Quoted values (single and double quotes)
    - Comments (lines starting with #)
    - Empty values

    Args:
        path: Path to env file

    Returns:
        Dictionary of environment variables
    """
    if not path.exists():
        return {}

    env_vars = {}

    try:
        content = path.read_text()
    except (OSError, PermissionError) as e:
        logger.error(f"Failed to read env file {path}: {e}")
        raise

    for line in content.splitlines():
        # Strip whitespace
        line = line.strip()

        # Skip empty lines and comments
        if not line or line.startswith("#"):
            continue

        # Split on first = only
        if "=" not in line:
            logger.warning(f"Malformed line in {path}: {line}")
            continue

        key, value = line.split("=", 1)
        key = key.strip()

        # Remove quotes from value
        value = value.strip()
        is_double_quoted = value.startswith('"') and value.endswith('"')
        is_single_quoted = value.startswith("'") and value.endswith("'")
        if is_double_quoted or is_single_quoted:
            value = value[1:-1]

        env_vars[key] = value

    return env_vars


def write_env_file(path: Path, config: dict[str, str]) -> None:
    """Write config to environment file atomically.

    Uses atomic write pattern (write to temp file, then rename) to prevent
    corruption if write is interrupted.

    Args:
        path: Path to env file
        config: Dictionary of environment variables to write

    Raises:
        OSError: If write fails
    """
    # Create parent directories if needed
    path.parent.mkdir(parents=True, exist_ok=True)

    # Write to temporary file first (atomic write pattern)
    temp_path = path.parent / f".{path.name}.tmp"

    try:
        with temp_path.open("w") as f:
            for key, value in sorted(config.items()):
                # Quote values if they contain spaces
                if " " in value:
                    f.write(f'{key}="{value}"\n')
                else:
                    f.write(f"{key}={value}\n")

        # Atomic rename
        temp_path.rename(path)

    except Exception:
        # Clean up temp file on error
        temp_path.unlink(missing_ok=True)
        raise


def validate_config_value(field: dict[str, Any], value: str) -> bool:
    """Validate a config value against field schema.

    Args:
        field: Field schema dict with type, constraints, etc.
        value: Value to validate (as string)

    Returns:
        True if valid, False otherwise

    Raises:
        ValueError: If field type is unknown
    """
    field_type = field["type"]

    # Check required fields first
    if field.get("required", False) and not value:
        return False

    # Type-specific validation
    if field_type == "string":
        # Empty optional strings are valid
        return True

    elif field_type == "integer":
        # Empty optional integers are invalid (can't convert "" to int)
        if not value:
            return False

        try:
            int_value = int(value)
        except ValueError:
            return False

        # Check min/max constraints
        if "min" in field and int_value < field["min"]:
            return False
        # Return True if max constraint is satisfied (or no max constraint)
        return not ("max" in field and int_value > field["max"])

    elif field_type == "boolean":
        # Empty optional booleans are invalid
        if not value:
            return False

        # Accept various boolean representations
        return value.lower() in ["true", "false", "1", "0", "yes", "no"]

    elif field_type == "enum":
        # Empty optional enums are invalid (must select an option)
        if not value:
            return False

        # Must be one of the allowed options
        options = field.get("options", [])
        if isinstance(options, list):
            # Options might be dicts with 'value' key or just strings
            option_values = []
            for opt in options:
                if isinstance(opt, dict):
                    option_values.append(opt.get("value", opt))
                else:
                    option_values.append(opt)

            return value in option_values

        return False

    elif field_type == "password":
        # Empty optional passwords are valid (password can be empty if not required)
        if not value and not field.get("required", False):
            return True
        # Non-empty passwords are always valid
        return True

    elif field_type == "path":
        # Paths must always be non-empty (even if not required)
        # Could add validation for absolute paths if needed
        return bool(value)

    else:
        raise ValueError(f"Unknown field type: {field_type}")
