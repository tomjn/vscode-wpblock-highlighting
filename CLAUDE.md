# Claude Code Instructions

## Repository
- **GitHub**: `tomjn/vscode-wpblock-highlighting` (note: no hyphen between "wp" and "block")
- **Raw content URL base**: `https://raw.githubusercontent.com/tomjn/vscode-wpblock-highlighting/main/`

## Build & Test
```bash
npm run compile    # Build with esbuild
npm test          # Run tests (node:test with tsx)
npm run watch     # Watch mode for development
```

## Testing in VS Code
Press F5 to launch Extension Development Host, open `test/fixtures/sample-blocks.html`.

## Architecture
- `src/blockParser.ts` - Parses WordPress block comments using regex for block start detection and balanced brace matching for JSON attributes.
- `src/blockMatcher.ts` - Stack-based tree builder, pairs opening/closing blocks, calculates depth.
- `src/decorationManager.ts` - Creates VS Code decoration types for depth colors, match highlighting, JSON tokens.
- `src/highlightProvider.ts` - Applies decorations to editor, manages parse cache.
- `src/foldingProvider.ts` - Provides folding ranges for block pairs.

## Key Patterns
WordPress blocks are HTML comments with specific format - NOT arbitrary HTML parsing:
- Opening: `<!-- wp:namespace/block-name {"json":"attrs"} -->`
- Closing: `<!-- /wp:namespace/block-name -->`
- Self-closing: `<!-- wp:block-name {"attrs"} /-->`

## JSON Parsing Notes
JSON attributes use a balanced brace matching algorithm (not regex) to handle arbitrarily deep nesting. This supports complex WordPress theme attributes like twentytwentyfive's deeply nested style objects.

## Adding New Features
- New decorations: Add to `DecorationManager`, expose via getter, apply in `HighlightProvider`
- New config: Add to `package.json` contributes.configuration, `types.ts`, and `extension.ts` getConfig()

## Releasing New Versions
**Always** follow these steps when tagging a new version:
1. Update version in `package.json`
2. Update `CHANGELOG.md` with the new version and changes (follow Keep a Changelog format)
3. Commit the changes
4. Create the git tag (e.g., `git tag v1.0.7`)
5. Push commit and tag (`git push && git push --tags`)

**Never** modify or move tags once pushed. If a fix is needed after tagging, create a new version instead.
