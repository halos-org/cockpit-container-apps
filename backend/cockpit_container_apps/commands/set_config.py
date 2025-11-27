"""
Set config command implementation.

Validates and writes user configuration for a package.
"""

import logging
import subprocess
from typing import Any

import yaml

from cockpit_container_apps.utils.config_utils import (
    _validate_package_name,
    get_config_file_path,
    get_config_schema_path,
    validate_config_value,
    write_env_file,
)

logger = logging.getLogger(__name__)


def execute(package: str, config: dict[str, str]) -> dict[str, Any]:
    """
    Set configuration for a package.

    Validates config values against schema and writes atomically to env file.

    Args:
        package: Package name
        config: Dictionary of config key-value pairs

    Returns:
        Dictionary with:
        - success: Boolean indicating success
        - error: Error message (if failed)
    """
    try:
        # Validate package name
        _validate_package_name(package)

        # Get schema path
        schema_path = get_config_schema_path(package)

        # Check if schema exists
        if not schema_path.exists():
            return {
                "success": False,
                "error": f"Config schema not found for package '{package}' at {schema_path}",
            }

        # Load schema
        try:
            with schema_path.open("r") as f:
                schema = yaml.safe_load(f)
        except yaml.YAMLError as e:
            return {
                "success": False,
                "error": f"Failed to parse YAML schema: {e}",
            }
        except (OSError, PermissionError) as e:
            return {
                "success": False,
                "error": f"Failed to read schema file: {e}",
            }

        # Build field map from schema
        field_map = {}
        for group in schema.get("groups", []):
            for field in group.get("fields", []):
                field_id = field.get("id")
                if field_id:
                    field_map[field_id] = field

        # Validate all config keys are known
        unknown_keys = set(config.keys()) - set(field_map.keys())
        if unknown_keys:
            return {
                "success": False,
                "error": f"Unknown configuration field(s): {', '.join(unknown_keys)}",
            }

        # Check all required fields are present
        required_fields = [
            field_id
            for field_id, field in field_map.items()
            if field.get("required", False)
        ]
        missing_required = set(required_fields) - set(config.keys())
        if missing_required:
            return {
                "success": False,
                "error": f"Missing required field(s): {', '.join(missing_required)}",
            }

        # Validate each config value
        validation_errors = []
        for key, value in config.items():
            field = field_map[key]
            try:
                if not validate_config_value(field, value):
                    field_label = field.get("label", key)
                    field_type = field.get("type", "unknown")

                    # Provide more specific error messages
                    if field_type == "integer":
                        min_val = field.get("min")
                        max_val = field.get("max")
                        if min_val is not None and max_val is not None:
                            validation_errors.append(
                                f"{field_label}: must be an integer between {min_val} and {max_val}"
                            )
                        else:
                            validation_errors.append(f"{field_label}: must be a valid integer")
                    elif field_type == "enum":
                        options = field.get("options", [])
                        option_values = []
                        for opt in options:
                            if isinstance(opt, dict):
                                option_values.append(opt.get("value", str(opt)))
                            else:
                                option_values.append(str(opt))
                        validation_errors.append(
                            f"{field_label}: must be one of: {', '.join(option_values)}"
                        )
                    elif field.get("required", False) and not value:
                        validation_errors.append(f"{field_label}: is required")
                    else:
                        validation_errors.append(f"{field_label}: invalid value")
            except ValueError as e:
                validation_errors.append(f"{key}: {e}")

        if validation_errors:
            return {
                "success": False,
                "error": f"Validation failed: {'; '.join(validation_errors)}",
            }

        # Write config file atomically
        config_path = get_config_file_path(package)
        try:
            write_env_file(config_path, config)
        except (OSError, PermissionError) as e:
            return {
                "success": False,
                "error": f"Failed to write config file: {e}",
            }

        # Restart the service to apply configuration changes
        try:
            service_name = f"{package}.service"
            result = subprocess.run(
                ["systemctl", "restart", service_name],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                logger.warning(
                    f"Failed to restart service {service_name}: {result.stderr}"
                )
                # Don't fail the config save if restart fails
                # The config is saved, just needs manual restart
                return {
                    "success": True,
                    "warning": f"Configuration saved but service restart failed: {result.stderr}",
                }
        except subprocess.TimeoutExpired:
            logger.warning(f"Service restart timed out for {service_name}")
            return {
                "success": True,
                "warning": "Configuration saved but service restart timed out",
            }
        except Exception as e:
            logger.warning(f"Failed to restart service: {e}")
            return {
                "success": True,
                "warning": f"Configuration saved but service restart failed: {e}",
            }

        return {
            "success": True,
        }

    except ValueError as e:
        # Package name validation error
        logger.error(f"Validation error: {e}")
        raise

    except Exception as e:
        # Unexpected error
        logger.error(f"Unexpected error setting config: {e}")
        return {
            "success": False,
            "error": f"Unexpected error: {e}",
        }
