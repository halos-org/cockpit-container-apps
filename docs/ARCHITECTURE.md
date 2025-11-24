# Cockpit Container Apps - Architecture

**Version:** 1.0
**Last Updated:** 2025-11-24

## Overview

Cockpit Container Apps follows the same three-tier architecture as cockpit-apt, ensuring consistency across HaLOS Cockpit modules and enabling code reuse.

### Related Documentation

- **Store design**: `cockpit-apt/docs/CONTAINER_STORE_DESIGN.md` - Store filtering and UI architecture
- **Container packaging**: `container-packaging-tools/docs/DESIGN.md` - Package structure and configuration

```
┌─────────────────────────────────────────────────────────────┐
│                      Cockpit Browser                        │
├─────────────────────────────────────────────────────────────┤
│                    Frontend (React/PatternFly)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Store View  │  │ App Details │  │ Configuration View  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (TypeScript)                   │
│           cockpit.spawn() ←→ JSON protocol                  │
├─────────────────────────────────────────────────────────────┤
│                    Backend (Python CLI)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Commands   │  │   Utils     │  │   Config Parser     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│              System (APT, Docker, Filesystem)               │
└─────────────────────────────────────────────────────────────┘
```

## System Components

### Backend (Python)

The backend is a stateless CLI application invoked via `cockpit.spawn()`. Each command executes independently and returns JSON to stdout.

**Location:** `backend/cockpit_container_apps/`

**Entry Point:** `cockpit-container-apps` CLI

**Components:**

| Component | Purpose |
|-----------|---------|
| `cli.py` | Command dispatcher, argument parsing, JSON output |
| `commands/` | Individual command implementations |
| `config/` | Configuration file parsing and validation |
| `vendor/` | Vendored utilities from cockpit-apt |

### API Layer (TypeScript)

Thin wrapper around backend CLI calls providing type-safe interfaces for the frontend.

**Location:** `frontend/src/lib/`

**Responsibilities:**
- Execute backend commands via `cockpit.spawn()`
- Parse JSON responses into typed objects
- Handle errors and translate to user-friendly messages
- Provide caching where appropriate

### Frontend (React)

User interface built with React and PatternFly components.

**Location:** `frontend/src/`

**Key Views:**
- Store browser with category filtering
- App details with install/remove actions
- Configuration editor with dynamic form generation

## Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Backend | Python 3.11+ | Matches cockpit-apt, access to python-apt |
| Backend Utils | Vendored from cockpit-apt | Code reuse without package dependency |
| API Layer | TypeScript | Type safety, IDE support |
| Frontend | React 18 | Component model, ecosystem |
| UI Components | PatternFly 6 | Cockpit design consistency |
| Build | esbuild | Fast builds, simple config |
| Testing | pytest (backend), vitest (frontend) | Standard tooling |

## Vendored Utilities

Shared utilities are vendored from cockpit-apt at build time rather than requiring a separate Debian package dependency.

### Source

Utilities are copied from `cockpit-apt/backend/cockpit_apt/utils/` during the build process.

### Vendored Modules

| Module | Purpose |
|--------|---------|
| `errors.py` | Exception classes, error formatting |
| `formatters.py` | JSON serialization utilities |
| `validators.py` | Input validation (package names, etc.) |
| `store_config.py` | Store YAML configuration loading |
| `store_filter.py` | Package filtering by store criteria |
| `debtag_parser.py` | Debian tag extraction and parsing |
| `repository_parser.py` | APT repository metadata |

### Build-Time Vendoring

```bash
# In debian/rules or build script:
COCKPIT_APT_VERSION="v1.0.0"  # Pin to specific version
git archive --remote=https://github.com/hatlabs/cockpit-apt.git \
    "$COCKPIT_APT_VERSION" backend/cockpit_apt/utils/ | \
    tar -x --strip-components=3 -C backend/cockpit_container_apps/vendor/
```

### Import Convention

```python
# In cockpit_container_apps code:
from cockpit_container_apps.vendor.cockpit_apt_utils.errors import APTBridgeError
from cockpit_container_apps.vendor.cockpit_apt_utils.store_config import load_stores
```

### Version Pinning

The vendored version is pinned in `vendor/VERSION` file:
```
cockpit-apt: v1.0.0
```

If the utils interface changes incompatibly, the vendored copy can be forked and maintained independently.

## Backend Commands

### Store and Browsing Commands

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `list-stores` | - | `Store[]` | List available container app stores |
| `list-categories` | `store_id` | `Category[]` | List categories in a store |
| `list-apps` | `store_id`, `category?` | `App[]` | List apps, optionally filtered |
| `search` | `store_id`, `query` | `App[]` | Search apps by name/description |
| `app-details` | `app_name` | `AppDetails` | Full app information |

### Installation Commands

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `install` | `package_name` | Progress stream | Install app package via APT |
| `remove` | `package_name` | Progress stream | Remove app package via APT |

### Configuration Commands

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `get-config-schema` | `app_name` | `ConfigSchema` | Read app's config.yml |
| `get-config` | `app_name` | `ConfigValues` | Read current configuration |
| `set-config` | `app_name`, `values` | `Result` | Save configuration values |

## Data Models

### Store

```typescript
interface Store {
  id: string;
  name: string;
  description: string;
  icon?: string;
  appCount: number;
}
```

### Category

```typescript
interface Category {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  appCount: number;
}
```

### App

```typescript
interface App {
  name: string;
  summary: string;
  version: string;
  installed: boolean;
  installedVersion?: string;
  category?: string;
  icon?: string;
}
```

### ConfigSchema (from config.yml)

```typescript
interface ConfigSchema {
  version: string;
  groups: ConfigGroup[];
}

interface ConfigGroup {
  id: string;
  label: string;
  description?: string;
  fields: ConfigField[];
}

interface ConfigField {
  id: string;           // Environment variable name
  label: string;
  type: 'string' | 'integer' | 'boolean' | 'enum' | 'password' | 'path';
  default: string | number | boolean;
  required: boolean;
  description?: string;
  min?: number;         // For integer/string
  max?: number;         // For integer/string
  options?: string[];   // For enum type
}
```

### ConfigValues

```typescript
interface ConfigValues {
  [fieldId: string]: string | number | boolean;
}
```

## Configuration Storage

### Config File Location

Container app configurations are stored in `/etc/container-apps/<package-name>/`:

```
/etc/container-apps/<package-name>/
├── env.defaults    # Package-provided defaults (managed by package)
└── env             # User overrides (editable)
```

### Format

Simple environment variable format compatible with Docker Compose:
```bash
# /etc/container-apps/avnav-container/env
AVNAV_HTTP_PORT=8082
```

### Docker Compose Integration

The app's `docker-compose.yml` references these via `env_file`:
```yaml
services:
  app:
    env_file:
      - /etc/container-apps/avnav-container/env.defaults
      - /etc/container-apps/avnav-container/env
```

The user's `env` file overrides values from `env.defaults`.

### Reference

For detailed container app packaging design, see:
- `container-packaging-tools/docs/DESIGN.md`
- `container-packaging-tools/docs/SPEC.md`

## Frontend Components

### Page Structure

```
ContainerAppsPage
├── StoreSelector          # Dropdown to select active store
├── CategoryNav            # Sidebar category navigation
├── AppList                # Grid/list of apps
│   └── AppCard            # Individual app card
├── AppDetailsPanel        # Slide-out or modal for app details
│   ├── AppHeader          # Name, icon, install button
│   ├── AppDescription     # Full description
│   └── ConfigurationTab   # Configuration editor
│       └── ConfigForm     # Dynamic form from schema
│           ├── StringField
│           ├── IntegerField
│           ├── BooleanField
│           ├── EnumField
│           ├── PasswordField
│           └── PathField
└── InstallProgress        # Modal for install/remove progress
```

### Dynamic Form Generation

The ConfigForm component reads the ConfigSchema and generates appropriate form fields:

1. Parse config.yml schema from backend
2. Group fields by ConfigGroup
3. Render each field based on its type
4. Validate input according to field constraints
5. Collect values and submit to backend

## Integration Points

### Cockpit Integration

- **Authentication**: Uses Cockpit's session authentication
- **Privilege Escalation**: `cockpit.spawn()` with `superuser: "try"`
- **Navigation**: Registered in Cockpit's side menu via `manifest.json`
- **Styling**: PatternFly ensures visual consistency

### APT Integration

- Package queries via python-apt library
- Install/remove via apt-get subprocess
- Progress reporting via APT progress callbacks

### Docker Integration

- No direct Docker API calls in MVP
- Container management via systemd services (post-install scripts)
- Configuration via environment files read by Docker Compose

## File Structure

```
cockpit-container-apps/
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   └── IMPLEMENTATION_CHECKLIST.md
├── backend/
│   ├── cockpit_container_apps/
│   │   ├── __init__.py
│   │   ├── cli.py
│   │   ├── commands/
│   │   │   ├── __init__.py
│   │   │   ├── list_stores.py
│   │   │   ├── list_categories.py
│   │   │   ├── list_apps.py
│   │   │   ├── search.py
│   │   │   ├── app_details.py
│   │   │   ├── install.py
│   │   │   ├── remove.py
│   │   │   ├── get_config_schema.py
│   │   │   ├── get_config.py
│   │   │   └── set_config.py
│   │   ├── config/
│   │   │   ├── __init__.py
│   │   │   ├── schema_parser.py
│   │   │   └── config_store.py
│   │   └── vendor/
│   │       ├── VERSION
│   │       └── cockpit_apt_utils/
│   │           ├── __init__.py
│   │           ├── errors.py
│   │           ├── formatters.py
│   │           ├── validators.py
│   │           ├── store_config.py
│   │           ├── store_filter.py
│   │           ├── debtag_parser.py
│   │           └── repository_parser.py
│   ├── tests/
│   │   └── ...
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── container-apps.tsx      # Entry point
│   │   ├── lib/
│   │   │   ├── api.ts              # Backend API wrapper
│   │   │   └── types.ts            # TypeScript interfaces
│   │   ├── components/
│   │   │   ├── StoreSelector.tsx
│   │   │   ├── CategoryNav.tsx
│   │   │   ├── AppList.tsx
│   │   │   ├── AppCard.tsx
│   │   │   ├── AppDetailsPanel.tsx
│   │   │   ├── ConfigForm.tsx
│   │   │   └── fields/
│   │   │       ├── StringField.tsx
│   │   │       ├── IntegerField.tsx
│   │   │       ├── BooleanField.tsx
│   │   │       ├── EnumField.tsx
│   │   │       ├── PasswordField.tsx
│   │   │       └── PathField.tsx
│   │   └── views/
│   │       ├── StoreView.tsx
│   │       └── AppDetailsView.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── esbuild.config.js
├── debian/
│   ├── control
│   ├── rules
│   ├── changelog
│   └── ...
├── manifest.json                    # Cockpit module manifest
├── README.md
├── CLAUDE.md
├── AGENTS.md
└── run                              # Development task runner
```

## Security Considerations

### Input Validation

- All user inputs validated before processing
- Package names validated against Debian naming rules
- Configuration values validated against schema constraints
- Path fields checked for traversal attempts

### Privilege Model

- Read operations: Normal user privileges
- Package install/remove: Requires Cockpit admin privileges
- Configuration save: Requires write access to `/var/lib/container-apps/`

### Secret Handling

- Password field values not logged
- Passwords not echoed in UI
- Configuration files have restricted permissions (600)

## Deployment

### Debian Package

The module is distributed as a Debian package: `cockpit-container-apps`

**Package Contents:**
- Python backend in `/usr/lib/python3/dist-packages/`
- CLI script in `/usr/bin/`
- Frontend assets in `/usr/share/cockpit/container-apps/`
- Cockpit manifest for module registration

### Dependencies

```
Depends: cockpit (>= 276), python3-apt, python3-yaml
```

Note: No dependency on cockpit-apt package (utils are vendored).
