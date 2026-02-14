#!/bin/bash
# Vendor utilities from cockpit-apt
# This must be run before tests or builds

set -e

COCKPIT_APT_VERSION="${COCKPIT_APT_VERSION:-v0.2.0+8}"
COCKPIT_APT_REPO="https://github.com/halos-org/cockpit-apt.git"
VENDOR_DIR="backend/cockpit_container_apps/vendor/cockpit_apt_utils"

echo "Vendoring utilities from cockpit-apt ${COCKPIT_APT_VERSION}..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Clone cockpit-apt at specified version
git clone --depth 1 --branch "${COCKPIT_APT_VERSION}" "${COCKPIT_APT_REPO}" "${TEMP_DIR}"

# Source directory
SOURCE_DIR="${TEMP_DIR}/backend/cockpit_apt_bridge/utils"

if [ ! -d "${SOURCE_DIR}" ]; then
  echo "Error: Utils directory not found in cockpit-apt"
  exit 1
fi

# Remove old vendored files (except __init__.py)
find "${VENDOR_DIR}" -name "*.py" ! -name "__init__.py" -delete 2>/dev/null || true

# Files to skip (now native to cockpit-container-apps)
SKIP_FILES=("store_config.py" "store_filter.py")

# Copy Python files with import path rewriting
for file in "${SOURCE_DIR}"/*.py; do
  if [ -f "$file" ]; then
    basename=$(basename "$file")

    # Skip __init__.py and store modules (now native)
    if [ "$basename" == "__init__.py" ]; then
      continue
    fi

    # Skip store modules - they're now in cockpit_container_apps/utils/
    if [[ " ${SKIP_FILES[@]} " =~ " ${basename} " ]]; then
      echo "  Skipped: ${basename} (native to cockpit-container-apps)"
      continue
    fi

    # Update imports in the file
    sed 's/from cockpit_apt_bridge\.utils\./from cockpit_container_apps.vendor.cockpit_apt_utils./g' \
        "$file" > "${VENDOR_DIR}/${basename}"
    echo "  Copied: ${basename}"
  fi
done

# Write VERSION file
echo "${COCKPIT_APT_VERSION}" > "backend/cockpit_container_apps/vendor/VERSION"

echo "✅ Vendored cockpit-apt ${COCKPIT_APT_VERSION} utilities"
