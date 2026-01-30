import { describe, it } from 'node:test';
import * as assert from 'node:assert';

// Mock vscode module for testing
const mockVscode = {
  Range: class {
    constructor(
      public start: { line: number; character: number },
      public end: { line: number; character: number }
    ) {}
  },
  Position: class {
    constructor(public line: number, public character: number) {}
  },
};

// Simple mock document for testing
function createMockDocument(text: string) {
  const lines = text.split('\n');
  return {
    getText: () => text,
    positionAt: (offset: number) => {
      let remaining = offset;
      for (let line = 0; line < lines.length; line++) {
        const lineLength = lines[line].length + 1; // +1 for newline
        if (remaining < lineLength) {
          return new mockVscode.Position(line, remaining);
        }
        remaining -= lineLength;
      }
      return new mockVscode.Position(lines.length - 1, lines[lines.length - 1].length);
    },
  };
}

// Match JSON with up to 2 levels of nested braces (same as in blockParser.ts)
const JSON_PATTERN = '\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*\\}';

// Test the regex patterns directly (matching blockParser.ts implementation)
const OPENING_PATTERN = new RegExp(
  `<!--\\s*wp:([a-z][a-z0-9-]*(?:\\/[a-z][a-z0-9-]*)?)\\s*(${JSON_PATTERN})?\\s*-->`,
  'g'
);
const CLOSING_PATTERN = /<!--\s*\/wp:([a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?)\s*-->/g;
const SELF_CLOSING_PATTERN = new RegExp(
  `<!--\\s*wp:([a-z][a-z0-9-]*(?:\\/[a-z][a-z0-9-]*)?)\\s*(${JSON_PATTERN})?\\s*\\/-->`,
  'g'
);

describe('Block Parser Regex Patterns', () => {
  describe('Opening Pattern', () => {
    it('should match simple opening block', () => {
      const text = '<!-- wp:paragraph -->';
      OPENING_PATTERN.lastIndex = 0;
      const match = OPENING_PATTERN.exec(text);
      assert.ok(match, 'Should match opening block');
      assert.strictEqual(match[1], 'paragraph');
    });

    it('should match opening block with namespace', () => {
      const text = '<!-- wp:core/paragraph -->';
      OPENING_PATTERN.lastIndex = 0;
      const match = OPENING_PATTERN.exec(text);
      assert.ok(match, 'Should match namespaced block');
      assert.strictEqual(match[1], 'core/paragraph');
    });

    it('should match opening block with attributes', () => {
      const text = '<!-- wp:heading {"level":2} -->';
      OPENING_PATTERN.lastIndex = 0;
      const match = OPENING_PATTERN.exec(text);
      assert.ok(match, 'Should match block with attributes');
      assert.strictEqual(match[1], 'heading');
      assert.strictEqual(match[2], '{"level":2}');
    });

    it('should match opening block with complex attributes', () => {
      const text = '<!-- wp:group {"align":"wide","className":"hero-section"} -->';
      OPENING_PATTERN.lastIndex = 0;
      const match = OPENING_PATTERN.exec(text);
      assert.ok(match, 'Should match block with complex attributes');
      assert.strictEqual(match[1], 'group');
      assert.strictEqual(match[2], '{"align":"wide","className":"hero-section"}');
    });

    it('should match ACF block with namespace', () => {
      const text = '<!-- wp:acf/hero-block {"name":"acf/hero-block"} -->';
      OPENING_PATTERN.lastIndex = 0;
      const match = OPENING_PATTERN.exec(text);
      assert.ok(match, 'Should match ACF block');
      assert.strictEqual(match[1], 'acf/hero-block');
    });

    it('should match block with nested JSON (1 level)', () => {
      const text = '<!-- wp:acf/custom-block {"name":"acf/custom-block","data":{"field_1":"value"}} -->';
      OPENING_PATTERN.lastIndex = 0;
      const match = OPENING_PATTERN.exec(text);
      assert.ok(match, 'Should match block with nested JSON');
      assert.strictEqual(match[1], 'acf/custom-block');
      assert.strictEqual(match[2], '{"name":"acf/custom-block","data":{"field_1":"value"}}');
    });

    it('should match block with deeply nested JSON (2 levels)', () => {
      const text = '<!-- wp:block {"a":{"b":{"c":"d"}}} -->';
      OPENING_PATTERN.lastIndex = 0;
      const match = OPENING_PATTERN.exec(text);
      assert.ok(match, 'Should match block with 2-level nested JSON');
      assert.strictEqual(match[1], 'block');
      assert.strictEqual(match[2], '{"a":{"b":{"c":"d"}}}');
    });
  });

  describe('Closing Pattern', () => {
    it('should match simple closing block', () => {
      const text = '<!-- /wp:paragraph -->';
      CLOSING_PATTERN.lastIndex = 0;
      const match = CLOSING_PATTERN.exec(text);
      assert.ok(match, 'Should match closing block');
      assert.strictEqual(match[1], 'paragraph');
    });

    it('should match namespaced closing block', () => {
      const text = '<!-- /wp:core/group -->';
      CLOSING_PATTERN.lastIndex = 0;
      const match = CLOSING_PATTERN.exec(text);
      assert.ok(match, 'Should match namespaced closing block');
      assert.strictEqual(match[1], 'core/group');
    });
  });

  describe('Self-Closing Pattern', () => {
    it('should match simple self-closing block', () => {
      const text = '<!-- wp:spacer /-->';
      SELF_CLOSING_PATTERN.lastIndex = 0;
      const match = SELF_CLOSING_PATTERN.exec(text);
      assert.ok(match, 'Should match self-closing block');
      assert.strictEqual(match[1], 'spacer');
    });

    it('should match self-closing block with attributes', () => {
      const text = '<!-- wp:spacer {"height":"50px"} /-->';
      SELF_CLOSING_PATTERN.lastIndex = 0;
      const match = SELF_CLOSING_PATTERN.exec(text);
      assert.ok(match, 'Should match self-closing block with attributes');
      assert.strictEqual(match[1], 'spacer');
      assert.strictEqual(match[2], '{"height":"50px"}');
    });

    it('should match separator with class', () => {
      const text = '<!-- wp:separator {"className":"is-style-wide"} /-->';
      SELF_CLOSING_PATTERN.lastIndex = 0;
      const match = SELF_CLOSING_PATTERN.exec(text);
      assert.ok(match, 'Should match separator');
      assert.strictEqual(match[1], 'separator');
    });

    it('should NOT match across multiple blocks', () => {
      // This is the critical test - self-closing should not match from one block to another
      const text = `<!-- wp:spacer {"height":"50px"} /-->
<!-- wp:separator {"className":"is-style-wide"} /-->`;

      SELF_CLOSING_PATTERN.lastIndex = 0;
      const matches: string[] = [];
      let match;
      while ((match = SELF_CLOSING_PATTERN.exec(text)) !== null) {
        matches.push(match[0]);
      }

      assert.strictEqual(matches.length, 2, 'Should find exactly 2 self-closing blocks');
      assert.ok(matches[0].includes('spacer'), 'First match should be spacer');
      assert.ok(matches[1].includes('separator'), 'Second match should be separator');
      // Verify each match is a single line (no multi-line spanning)
      assert.ok(!matches[0].includes('\n'), 'First match should not span lines');
      assert.ok(!matches[1].includes('\n'), 'Second match should not span lines');
    });
  });

  describe('Pattern Discrimination', () => {
    it('should not match self-closing as opening', () => {
      const text = '<!-- wp:spacer /-->';
      OPENING_PATTERN.lastIndex = 0;
      const openingMatch = OPENING_PATTERN.exec(text);
      SELF_CLOSING_PATTERN.lastIndex = 0;
      const selfClosingMatch = SELF_CLOSING_PATTERN.exec(text);

      // Opening should NOT match self-closing because of /-->
      assert.ok(!openingMatch, 'Opening pattern should NOT match self-closing');
      assert.ok(selfClosingMatch, 'Self-closing pattern should match');
      assert.strictEqual(selfClosingMatch[1], 'spacer');
    });

    it('should handle multiline attributes', () => {
      const text = `<!-- wp:group {
        "align": "wide",
        "className": "test"
      } -->`;
      OPENING_PATTERN.lastIndex = 0;
      const match = OPENING_PATTERN.exec(text);
      assert.ok(match, 'Should match block with multiline attributes');
      assert.strictEqual(match[1], 'group');
      assert.ok(match[2]?.includes('"align"'), 'Should capture multiline JSON');
    });

    it('should not span from opening block to closing block', () => {
      const text = `<!-- wp:group {"align":"wide"} -->
<div>content</div>
<!-- /wp:group -->`;

      OPENING_PATTERN.lastIndex = 0;
      const openingMatch = OPENING_PATTERN.exec(text);
      assert.ok(openingMatch, 'Should find opening');
      assert.ok(!openingMatch[0].includes('/wp:'), 'Opening match should not include closing tag');
    });
  });

  describe('Multiple Blocks', () => {
    it('should find all blocks in document', () => {
      const text = `<!-- wp:group -->
        <!-- wp:paragraph -->
        <p>Test</p>
        <!-- /wp:paragraph -->
      <!-- /wp:group -->`;

      const openings: string[] = [];
      const closings: string[] = [];

      OPENING_PATTERN.lastIndex = 0;
      let match;
      while ((match = OPENING_PATTERN.exec(text)) !== null) {
        openings.push(match[1]);
      }

      CLOSING_PATTERN.lastIndex = 0;
      while ((match = CLOSING_PATTERN.exec(text)) !== null) {
        closings.push(match[1]);
      }

      assert.strictEqual(openings.length, 2, 'Should find 2 opening blocks');
      assert.strictEqual(closings.length, 2, 'Should find 2 closing blocks');
      assert.deepStrictEqual(openings, ['group', 'paragraph']);
      assert.deepStrictEqual(closings, ['paragraph', 'group']);
    });

    it('should correctly parse mixed block types', () => {
      const text = `<!-- wp:group -->
<!-- wp:spacer {"height":"50px"} /-->
<!-- wp:separator /-->
<!-- wp:paragraph -->text<!-- /wp:paragraph -->
<!-- /wp:group -->`;

      OPENING_PATTERN.lastIndex = 0;
      let openingCount = 0;
      while (OPENING_PATTERN.exec(text) !== null) openingCount++;

      CLOSING_PATTERN.lastIndex = 0;
      let closingCount = 0;
      while (CLOSING_PATTERN.exec(text) !== null) closingCount++;

      SELF_CLOSING_PATTERN.lastIndex = 0;
      let selfClosingCount = 0;
      while (SELF_CLOSING_PATTERN.exec(text) !== null) selfClosingCount++;

      assert.strictEqual(openingCount, 2, 'Should find 2 opening blocks (group, paragraph)');
      assert.strictEqual(closingCount, 2, 'Should find 2 closing blocks');
      assert.strictEqual(selfClosingCount, 2, 'Should find 2 self-closing blocks (spacer, separator)');
    });
  });
});
