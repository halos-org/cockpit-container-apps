"""
Tests for vendored store configuration utilities.

Verifies that store configuration loading works correctly.
"""

import tempfile
from pathlib import Path

import pytest
import yaml

from cockpit_container_apps.vendor.cockpit_apt_utils.store_config import (
    load_stores,
    StoreConfig,
    StoreFilter,
)


class TestLoadStores:
    """Tests for the load_stores function."""

    def test_load_empty_directory(self):
        """Test loading from an empty directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            stores = load_stores(Path(tmpdir))
            assert stores == []

    def test_load_nonexistent_directory(self):
        """Test loading from a nonexistent directory."""
        stores = load_stores(Path("/nonexistent/path/to/stores"))
        assert stores == []

    def test_load_single_store(self):
        """Test loading a single store configuration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store_config = {
                "id": "test-store",
                "name": "Test Store",
                "description": "A test store",
                "filters": {
                    "include_origins": ["Test Origin"],
                },
            }

            config_path = Path(tmpdir) / "test-store.yaml"
            with open(config_path, "w") as f:
                yaml.dump(store_config, f)

            stores = load_stores(Path(tmpdir))
            assert len(stores) == 1
            assert stores[0].id == "test-store"
            assert stores[0].name == "Test Store"

    def test_load_multiple_stores(self):
        """Test loading multiple store configurations."""
        with tempfile.TemporaryDirectory() as tmpdir:
            for i in range(3):
                store_config = {
                    "id": f"store-{i}",
                    "name": f"Store {i}",
                    "description": f"Store number {i}",
                    "filters": {
                        "include_origins": [f"Origin {i}"],
                    },
                }
                config_path = Path(tmpdir) / f"store-{i}.yaml"
                with open(config_path, "w") as f:
                    yaml.dump(store_config, f)

            stores = load_stores(Path(tmpdir))
            assert len(stores) == 3


class TestStoreFilter:
    """Tests for the StoreFilter class."""

    def test_store_filter_with_origins(self):
        """Test creating a filter with origins."""
        store_filter = StoreFilter(
            include_origins=["Hat Labs"],
            include_sections=[],
            include_tags=[],
            include_packages=[],
        )
        assert "Hat Labs" in store_filter.include_origins

    def test_store_filter_with_tags(self):
        """Test creating a filter with tags."""
        store_filter = StoreFilter(
            include_origins=[],
            include_sections=[],
            include_tags=["role::container-app"],
            include_packages=[],
        )
        assert "role::container-app" in store_filter.include_tags

    def test_store_filter_requires_at_least_one_criterion(self):
        """Test that filter requires at least one filter criterion."""
        with pytest.raises(ValueError):
            StoreFilter(
                include_origins=[],
                include_sections=[],
                include_tags=[],
                include_packages=[],
            )


class TestStoreConfig:
    """Tests for the StoreConfig class."""

    def test_store_config_basic(self):
        """Test creating a basic store config."""
        filters = StoreFilter(
            include_origins=["Hat Labs"],
            include_sections=[],
            include_tags=[],
            include_packages=[],
        )
        store = StoreConfig(
            id="marine-apps",
            name="Marine Apps",
            description="Container apps for marine vessels",
            filters=filters,
        )

        assert store.id == "marine-apps"
        assert store.name == "Marine Apps"
        assert store.description == "Container apps for marine vessels"
        assert store.icon is None

    def test_store_config_with_icon(self):
        """Test creating a store config with icon."""
        filters = StoreFilter(
            include_origins=["Hat Labs"],
            include_sections=[],
            include_tags=[],
            include_packages=[],
        )
        store = StoreConfig(
            id="marine-apps",
            name="Marine Apps",
            description="Container apps for marine vessels",
            filters=filters,
            icon="/usr/share/container-stores/marine-apps/icon.svg",
        )

        assert store.icon == "/usr/share/container-stores/marine-apps/icon.svg"

    def test_store_config_invalid_id(self):
        """Test that invalid store IDs are rejected."""
        filters = StoreFilter(
            include_origins=["Hat Labs"],
            include_sections=[],
            include_tags=[],
            include_packages=[],
        )
        with pytest.raises(ValueError):
            StoreConfig(
                id="",  # Empty ID
                name="Test",
                description="Test",
                filters=filters,
            )
