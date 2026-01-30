# Changelog

All notable changes to the WordPress Block Highlighting extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.6] - 2026-01-30

### Fixed

- Fixed screenshot URLs in README for VS Code Marketplace display

## [1.0.5] - 2026-01-30

### Added

- Hover provider showing block name, nesting depth, and attribute details
- Diagnostic warnings for unclosed blocks (missing closing comment)
- Diagnostic warnings for orphan closing blocks (no matching opening)

## [1.0.4] - 2026-01-30

### Added

- Breadcrumb navigation showing block hierarchy in VS Code's breadcrumb bar
- Outline view support for WordPress blocks
- Status bar showing current block path (e.g., `group > columns > column`)
- Different icons per block type in symbol provider

### Changed

- Renamed config section to 'WP Blocks'

## [1.0.3] - 2026-01-30

### Added

- Extension icon
- Screenshot in README

### Fixed

- Deeply nested JSON parsing now uses balanced brace matching algorithm
- Supports complex WordPress theme attributes like twentytwentyfive's nested style objects

### Changed

- Renamed extension to "WP Block Highlighting"

## [1.0.2] - 2026-01-30

### Fixed

- VS Code Marketplace publisher ID
- Open VSX publishing with correct namespace

## [1.0.1] - 2026-01-30

### Added

- Publishing setup for VS Code Marketplace and Open VSX

## [1.0.0] - 2026-01-30

### Added

- Initial release
- Syntax highlighting for WordPress block comments in HTML and PHP files
- Depth-based background colors for nested blocks
- Matching block pair highlighting on cursor position
- JSON attribute syntax highlighting within block comments
- Jump to matching block command (`Ctrl+Shift+M` / `Cmd+Shift+M`)
- Code folding support for block pairs
- Configurable colors for all highlighting features
- Support for self-closing blocks
- Configurable language activation (HTML, PHP by default)
