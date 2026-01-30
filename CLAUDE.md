# Claude Code Instructions

## Build & Test
```bash
npm run compile    # Build with esbuild
npm test          # Run tests (node:test with tsx)
npm run watch     # Watch mode for development
```

## Testing in VS Code
Press F5 to launch Extension Development Host, open `test/fixtures/sample-blocks.html`.

## Architecture
- `src/blockParser.ts` - Regex parsing of WordPress block comments. JSON pattern handles up to 2 levels of nested braces.
- `src/blockMatcher.ts` - Stack-based tree builder, pairs opening/closing blocks, calculates depth.
- `src/decorationManager.ts` - Creates VS Code decoration types for depth colors, match highlighting, JSON tokens.
- `src/highlightProvider.ts` - Applies decorations to editor, manages parse cache.
- `src/foldingProvider.ts` - Provides folding ranges for block pairs.

## Key Patterns
WordPress blocks are HTML comments with specific format - NOT arbitrary HTML parsing:
- Opening: `<!-- wp:namespace/block-name {"json":"attrs"} -->`
- Closing: `<!-- /wp:namespace/block-name -->`
- Self-closing: `<!-- wp:block-name {"attrs"} /-->`

## Regex Notes
The JSON_PATTERN uses balanced brace matching (not `[\s\S]*?`) to prevent cross-line matching issues:
```javascript
const JSON_PATTERN = '\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*\\}';
```

## Adding New Features
- New decorations: Add to `DecorationManager`, expose via getter, apply in `HighlightProvider`
- New config: Add to `package.json` contributes.configuration, `types.ts`, and `extension.ts` getConfig()
