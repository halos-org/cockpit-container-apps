# Cockpit Container Apps - Architecture

**Version:** 1.0
**Last Updated:** 2025-11-24

## Overview

Cockpit Container Apps follows the same three-tier architecture as cockpit-apt, ensuring consistency across HaLOS Cockpit modules and enabling code reuse. The module provides a dedicated interface for browsing, installing, and configuring container applications, separate from general-purpose APT package management.

### Related Documentation

For container app packaging structure and configuration schema, see the container-packaging-tools repository documentation.

### Architectural Principles

The architecture follows these key principles:

**Progressive Enhancement**: Features appear only when relevant store packages are installed. Without stores, the module shows no content.

**Separation of Concerns**: The backend handles APT and filesystem operations while the frontend handles presentation. No business logic in the UI layer.

**Stateless Backend**: No persistent daemon process. Each command invocation is independent, spawned on-demand via Cockpit's spawn API.

**Type Safety**: Strict TypeScript on the frontend and type hints on the backend ensure reliable data handling.

**Testability**: Clear boundaries between components enable isolated unit testing with mocks.

## High-Level Architecture

The system consists of three main tiers connected by well-defined interfaces:

```
┌─────────────────────────────────────────────────────────────┐
│                    Cockpit Web Interface                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │             cockpit-container-apps Frontend             │ │
│  │            (React + TypeScript + PatternFly)            │ │
│  │                                                          │ │
│  │  ┌──────────────────┐  ┌───────────────────────────┐   │ │
│  │  │    UI Layer      │  │    State Management       │   │ │
│  │  │   Components     │  │  (React Context + hooks)  │   │ │
│  │  └──────────────────┘  └───────────────────────────┘   │ │
│  │           │                       │                     │ │
│  │           └───────────────────────┘                     │ │
│  │                       │                                 │ │
│  │              ┌────────▼────────┐                        │ │
│  │              │   API Wrapper   │                        │ │
│  │              │  (TypeScript)   │                        │ │
│  │              └────────┬────────┘                        │ │
│  └───────────────────────┼──────────────────────────────────┘ │
│                          │                                    │
│                          │ cockpit.spawn()                    │
│                          │ (JSON stdin/stdout)                │
└──────────────────────────┼────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           cockpit-container-apps Backend (Python)            │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    CLI Interface                        │ │
│  │          (Command parser + JSON formatter)              │ │
│  └─────────────────┬──────────────────────────────────────┘ │
│                    │                                         │
│  ┌─────────────────▼───────────────┐  ┌──────────────────┐  │
│  │      Command Handlers           │  │  Store Config    │  │
│  │  • list-stores, list-categories │  │    Loader        │  │
│  │  • list-apps, search, details   │  └──────────────────┘  │
│  │  • install, remove              │                        │
│  │  • get-config, set-config       │  ┌──────────────────┐  │
│  └─────────────────┬───────────────┘  │  Config Schema   │  │
│                    │                  │    Parser        │  │
│  ┌─────────────────▼───────────────┐  └──────────────────┘  │
│  │       Vendored Utilities        │                        │
│  │    (from cockpit-apt/utils)     │  ┌──────────────────┐  │
│  └─────────────────────────────────┘  │   Debtag &       │  │
│                                       │   Repository     │  │
│                                       │   Parsers        │  │
│                                       └──────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      System Layer                            │
│                                                               │
│  • APT Cache (/var/cache/apt/)                              │
│  • Package Lists (/var/lib/apt/lists/)                      │
│  • Store Configs (/etc/container-apps/stores/)              │
│  • App Configs (/etc/container-apps/<package>/)             │
│  • Docker Compose services                                   │
└─────────────────────────────────────────────────────────────┘
```

## System Components

### Backend Layer

The backend is a stateless command-line interface that executes commands and returns JSON output. Each invocation is independent with no persistent state.

**CLI Interface**: The main entry point parses command-line arguments, routes commands to appropriate handlers, catches and formats exceptions as JSON error responses, and ensures consistent JSON output format for all commands.

**Command Handlers**: Individual modules implement specific operations. Store commands load and return store configurations. App commands query the APT cache with store filters applied. Installation commands invoke APT operations with progress streaming. Configuration commands read and write app environment files.

**Vendored Utilities**: Shared code from cockpit-apt is vendored at build time to avoid a package dependency. This includes error handling, JSON formatting, input validation, store configuration loading, store filter matching, debtag parsing, and repository metadata parsing.

**Config Schema Parser**: Reads and validates config.yml files from installed container apps, providing the schema for dynamic form generation in the frontend.

### API Layer

The API layer provides a thin TypeScript wrapper around backend CLI calls.

**Responsibilities**: Execute backend commands via Cockpit's spawn API. Parse JSON responses into typed objects. Handle errors and translate to user-friendly messages. Provide caching where appropriate to improve responsiveness.

**Communication Protocol**: All communication uses JSON format. Commands receive arguments as command-line parameters. Results return as JSON to stdout. Errors return as JSON with error codes and messages.

### Frontend Layer

The frontend is a React application using PatternFly components for Cockpit design consistency.

**UI Components**: Store selector for choosing the active container app store. Category navigation for browsing apps by category. App list displaying filtered apps with cards showing name, description, and installation status. App details panel with full information and install/remove actions. Configuration form with dynamic field generation based on the app's config.yml schema.

**State Management**: Global application state managed via React Context. Filter state tracks active store, category, and search query. Persistent state storage uses browser localStorage for session persistence. Memoized selectors compute derived state efficiently.

**Dynamic Form Generation**: The configuration form component reads the config schema and generates appropriate form fields. Fields are grouped by the schema's group definitions. Each field renders based on its type with appropriate validation.

## Technology Stack

**Backend Technologies**: Python 3.11 or later provides the runtime with access to python-apt for APT cache operations. PyYAML handles store and config file parsing. The backend uses no external frameworks, just standard library plus these two dependencies.

**Frontend Technologies**: React 18 provides the component model. TypeScript 5 ensures type safety. PatternFly 6 provides UI components consistent with Cockpit's design. esbuild handles fast JavaScript bundling.

**Development Tools**: pytest for backend testing with mock support. vitest for frontend testing with React Testing Library. ruff for Python linting and formatting. pyright for Python type checking.

**Integration Technologies**: Cockpit's spawn API enables process execution with stdin/stdout communication. JSON serves as the structured data interchange format. Browser localStorage provides client-side persistent storage.

## Vendored Utilities

Shared utilities are vendored from cockpit-apt at build time rather than requiring a separate Debian package dependency. This approach keeps cockpit-apt clean for potential upstream contribution while allowing cockpit-container-apps to reuse proven code.

**Source**: Utilities are copied from cockpit-apt's utils directory during the Debian package build process. The build script fetches a specific tagged version of cockpit-apt and extracts only the utils module.

**Vendored Modules**: Error handling provides exception classes and JSON error formatting. Formatters handle JSON serialization for packages and other objects. Validators ensure package names and other inputs meet Debian standards. Store config loader reads YAML store definitions from the filesystem. Store filter implements the package matching logic. Debtag parser extracts and parses Debian faceted tags. Repository parser extracts origin and label information from APT.

**Version Pinning**: A VERSION file in the vendor directory records which cockpit-apt version was vendored. If the utils interface changes incompatibly, cockpit-container-apps can fork the vendored copy and maintain it independently.

## Store Definition System

Container app stores are curated collections of packages defined by filter criteria. Store definitions are installed as part of store definition packages.

### Store Configuration

Store configurations are YAML files located in the stores directory under the container-apps configuration path. Each store defines identity and metadata including a unique identifier, display name, description, and optional icon path.

**Filter Specification**: Stores define which packages belong to them through filters. Include origins lists repository Origin values to include. Include tags lists debtags that qualify packages. Include packages explicitly names packages to include. All filters are optional but at least one must be specified.

**Filter Logic**: Within each filter category, OR logic applies so a package matching any value qualifies. Between categories, AND logic applies so all specified filter types must match. This allows precise control over which packages appear in a store.

**Category Metadata**: Stores define categories for organizing apps within the store. Each category has an identifier, display label, description, and icon. Categories are defined in the store configuration and used for browsing, not derived from Debian sections.

### Store Filter Matching

The filter matching process evaluates each package against the store's filter criteria.

**Evaluation Order**: First check if the package's origin matches any include_origins value. Then check if any of the package's debtags match any include_tags value. Finally check if the package name is in the include_packages list.

**Result Determination**: For each specified filter category, the package must have at least one match. If a category is not specified in the store config, it does not constrain matching. A package belongs to the store only if it satisfies all specified categories.

### Debtag-Based Filtering

Debian's faceted tag system provides rich package categorization.

**Tag Format**: Tags use the facet::value syntax. Common facets include role for package role, field for application domain, interface for UI type, use for primary purpose, and network for network role.

**Container App Tags**: Container applications use the role::container-app tag. Domain-specific tags like field::marine identify the application's purpose. These tags enable precise store filtering.

**Parsing**: The debtag parser extracts the Tag field from package metadata, splits the comma-separated list, and provides tag matching functions for the filter system.

### Origin-Based Filtering

Packages can be filtered by their APT repository origin.

**Repository Metadata**: The Origin field from APT Release files identifies the organization maintaining a repository. The Label field provides a human-readable name. These fields enable filtering packages by source.

**Use Case**: A store might include only packages from a specific origin like "Hat Labs" to ensure users see only vetted container apps.

## Data Models

### Store Model

A store represents a curated collection of container apps. It has an identifier used in URLs and storage, a display name shown in the UI, a description explaining the store's purpose, an optional icon path for branding, and a count of apps matching the store's filters.

### Category Model

Categories organize apps within a store. Each has an identifier, a display label, an optional icon, an optional description, and a count of apps in that category. Categories are defined in the store configuration and apps are assigned to categories via their debtags.

### App Model

An app represents a container application package. Core attributes include name, summary description, version, and installation status. The optional `status` field (from `status::*` debtags) indicates maturity level (e.g., experimental, beta, deprecated) and drives UI badges and install confirmation dialogs. Filter-related attributes include the package's origin and debtags. Display attributes include the full description and optional icon.

### Config Schema Model

The configuration schema defines what settings an app exposes. It has a version identifier and a list of groups. Each group has an identifier, label, optional description, and list of fields. Each field has an identifier that maps to an environment variable name, a display label, a type, a default value, a required flag, an optional description, and type-specific constraints like min/max for integers or options for enums.

### Config Values Model

Configuration values are a simple mapping from field identifiers to their current values. Values are strings, integers, or booleans depending on the field type.

## Configuration Storage

Container app configurations are stored in the container-apps directory under /etc, with each app having its own subdirectory.

**File Structure**: Each app has an env.defaults file containing package-provided default values, managed by the package maintainer. The env file contains user overrides and is editable. Both files use simple environment variable format.

**Override Mechanism**: Docker Compose loads both files with env.defaults first and env second. Values in the user's env file override defaults, allowing customization while preserving the ability to reset to defaults.

**Permissions**: Configuration files should have restricted permissions to protect sensitive values like passwords.

## Frontend Components

### Page Structure

The module provides multiple views for browsing and managing container apps. Cockpit already provides a sidebar, so the module uses cards and separate pages rather than its own sidebar navigation.

**Store Selector**: Allows choosing the active container app store. Hidden if no stores are installed. Appears at the top of the main views.

**Category View**: The landing page for a store displays categories as cards in a grid. Each card shows the category name, description, icon, and app count. Clicking a category card navigates to the app list for that category.

**App List View**: Shows apps within a selected category as a grid of cards. Each app card displays name, summary, icon, installation status, and optional status badge. Clicking an app card navigates to the app details view.

**Installed Apps View**: A separate view listing all installed container apps regardless of category. Provides quick access to configuration and removal for apps the user has already installed.

**App Details View**: Full page view for a selected app. Shows complete description, version information, installation status, optional status badge and warning alert, and install/remove button. Apps with a status warning require install confirmation via a modal dialog. For installed apps, includes the configuration section.

**Configuration Form**: Dynamic form generated from the app's config.yml schema. Groups fields visually by the schema's group definitions. Each field renders with appropriate input control based on type. Appears within the app details view for installed apps.

**Install Progress**: Modal dialog showing installation or removal progress with streaming output from APT.

### Field Components

The configuration form includes specialized components for each field type.

**String Field**: Text input with optional length validation based on min/max constraints.

**Integer Field**: Numeric input with optional range validation.

**Boolean Field**: Toggle switch for true/false values.

**Enum Field**: Dropdown selector populated from the field's options list.

**Password Field**: Masked text input that hides the value. Values are not logged.

**Path Field**: Text input for file or directory paths with validation against traversal attempts.

## Integration Points

### Cockpit Integration

**Module Registration**: The manifest.json file registers the module with Cockpit, defining its menu entry and required privileges.

**Authentication**: The module uses Cockpit's session authentication. No separate login is required.

**Privilege Escalation**: Backend commands that modify system state run with Cockpit's privilege escalation. Read operations run without elevated privileges.

**Styling**: PatternFly components ensure visual consistency with other Cockpit modules.

### APT Integration

**Package Queries**: The python-apt library provides read-only access to the APT cache for package information, installation status, and metadata.

**Package Operations**: Install and remove operations invoke apt-get as a subprocess with progress callbacks for streaming output to the frontend.

**Repository Metadata**: Origin and label information comes from APT Release files accessed via python-apt.

### Docker Integration

**No Direct API Calls**: The MVP does not call Docker APIs directly. Container management happens through systemd services set up by package post-install scripts.

**Configuration**: Docker Compose reads environment files from the container-apps configuration directory. Changes to configuration require container restart, handled outside this module in the MVP.

## File System Layout

### Project Structure

The project follows a standard layout with docs, backend, frontend, and debian directories at the top level.

**Documentation**: The docs directory contains SPEC.md, ARCHITECTURE.md, and implementation checklist.

**Backend**: The backend directory contains the Python package with CLI, commands, config parsing, vendored utilities, and tests.

**Frontend**: The frontend directory contains the React application source, components, views, and build configuration.

**Debian Packaging**: The debian directory contains control file, rules, changelog, and other packaging files.

**Root Files**: The root contains manifest.json for Cockpit registration, README, and the development task runner script.

### System Paths

**Store Configurations**: YAML files defining stores are installed to the stores subdirectory under container-apps configuration.

**App Configurations**: Each installed app has a subdirectory containing env.defaults and env files.

**Store Branding**: Optional icons and banners for stores are installed under the container-stores share directory.

**Cockpit Module**: Frontend assets are installed to the cockpit share directory.

## Security Considerations

### Input Validation

All user inputs are validated before processing. Package names must match Debian naming rules. Configuration values are validated against schema constraints including type, required status, and min/max bounds. Path fields are checked for directory traversal attempts.

### Privilege Model

Read operations including store listing, app browsing, and configuration reading run with normal user privileges. Package installation and removal require Cockpit admin privileges via privilege escalation. Configuration writes require write access to the container-apps configuration directory.

### Secret Handling

Password field values are not included in logs or error messages. The UI masks password input. Configuration files containing passwords should have restricted file permissions.

### Store Configuration Trust

Store configurations are installed via APT packages from signed repositories. The standard Debian/Ubuntu trust chain applies. Store filters can only select existing packages and cannot execute code or access network resources.

## Deployment Architecture

### Debian Package

The module is distributed as a single Debian package named cockpit-container-apps.

**Package Contents**: The Python backend installs to the Python packages directory. The CLI script installs to the bin directory. Frontend assets install to the Cockpit share directory. The manifest enables Cockpit module registration.

**Dependencies**: The package depends on Cockpit 276 or later, python3-apt for APT cache access, and python3-yaml for configuration parsing. It does not depend on cockpit-apt since utilities are vendored.

### Installation Flow

Users install cockpit-container-apps via APT. The module appears in Cockpit's navigation menu. Without any store packages installed, the module shows no content. Installing a store definition package populates the store selector and enables browsing. Installing container app packages makes them available for configuration.

### Build Process

The Debian package build process first vendors utilities from cockpit-apt by fetching a specific tagged version. Then it builds the frontend using npm and esbuild. Finally it packages the backend, frontend, and manifest into the deb file.

## Performance Considerations

### Frontend Performance

Memoization prevents expensive recomputation of filtered app lists. Virtual scrolling handles large app lists efficiently. Debounced search queries avoid excessive backend calls. Lazy loading defers non-critical assets.

### Backend Performance

The APT cache loads once per command invocation via python-apt's built-in caching. Store configurations cache in memory after first load. Result size limits prevent memory exhaustion with large filter results.

### Performance Targets

Store listing should complete in under 50 milliseconds. App filtering should complete in under 100 milliseconds for typical store sizes. UI interactions should feel instant with response times under 16 milliseconds.
