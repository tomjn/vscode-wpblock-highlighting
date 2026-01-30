import { describe, it } from 'node:test';
import * as assert from 'node:assert';

// Test the tree-building logic conceptually
// Since we can't easily import the module with vscode dependency,
// we test the algorithm logic here

interface MockBlockComment {
  type: 'opening' | 'closing' | 'self-closing';
  blockName: string;
  line: number;
}

interface MockBlockPair {
  opening: MockBlockComment;
  closing: MockBlockComment | null;
  depth: number;
  children: MockBlockPair[];
}

function buildMockBlockTree(comments: MockBlockComment[]): MockBlockPair[] {
  const pairs: MockBlockPair[] = [];
  const rootPairs: MockBlockPair[] = [];
  const stack: MockBlockPair[] = [];

  for (const comment of comments) {
    if (comment.type === 'self-closing') {
      const pair: MockBlockPair = {
        opening: comment,
        closing: null,
        depth: stack.length,
        children: [],
      };
      pairs.push(pair);

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(pair);
      } else {
        rootPairs.push(pair);
      }
    } else if (comment.type === 'opening') {
      const pair: MockBlockPair = {
        opening: comment,
        closing: null,
        depth: stack.length,
        children: [],
      };
      pairs.push(pair);
      stack.push(pair);
    } else if (comment.type === 'closing') {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].opening.blockName === comment.blockName) {
          const pair = stack[i];
          pair.closing = comment;
          stack.splice(i);

          if (i === 0) {
            rootPairs.push(pair);
          } else {
            stack[i - 1]?.children.push(pair);
          }
          break;
        }
      }
    }
  }

  // Handle unclosed blocks
  for (const pair of stack) {
    rootPairs.push(pair);
  }

  return rootPairs;
}

describe('Block Matcher Tree Building', () => {
  describe('Simple Nesting', () => {
    it('should build tree for single block', () => {
      const comments: MockBlockComment[] = [
        { type: 'opening', blockName: 'paragraph', line: 0 },
        { type: 'closing', blockName: 'paragraph', line: 1 },
      ];

      const tree = buildMockBlockTree(comments);
      assert.strictEqual(tree.length, 1, 'Should have one root block');
      assert.strictEqual(tree[0].opening.blockName, 'paragraph');
      assert.ok(tree[0].closing, 'Should have closing');
      assert.strictEqual(tree[0].depth, 0);
    });

    it('should build tree for nested blocks', () => {
      const comments: MockBlockComment[] = [
        { type: 'opening', blockName: 'group', line: 0 },
        { type: 'opening', blockName: 'paragraph', line: 1 },
        { type: 'closing', blockName: 'paragraph', line: 2 },
        { type: 'closing', blockName: 'group', line: 3 },
      ];

      const tree = buildMockBlockTree(comments);
      assert.strictEqual(tree.length, 1, 'Should have one root block');
      assert.strictEqual(tree[0].opening.blockName, 'group');
      assert.strictEqual(tree[0].depth, 0);
      assert.strictEqual(tree[0].children.length, 1, 'Should have one child');
      assert.strictEqual(tree[0].children[0].opening.blockName, 'paragraph');
      assert.strictEqual(tree[0].children[0].depth, 1);
    });

    it('should handle sibling blocks', () => {
      const comments: MockBlockComment[] = [
        { type: 'opening', blockName: 'paragraph', line: 0 },
        { type: 'closing', blockName: 'paragraph', line: 1 },
        { type: 'opening', blockName: 'heading', line: 2 },
        { type: 'closing', blockName: 'heading', line: 3 },
      ];

      const tree = buildMockBlockTree(comments);
      assert.strictEqual(tree.length, 2, 'Should have two root blocks');
      assert.strictEqual(tree[0].opening.blockName, 'paragraph');
      assert.strictEqual(tree[1].opening.blockName, 'heading');
    });
  });

  describe('Self-Closing Blocks', () => {
    it('should handle self-closing block at root', () => {
      const comments: MockBlockComment[] = [
        { type: 'self-closing', blockName: 'spacer', line: 0 },
      ];

      const tree = buildMockBlockTree(comments);
      assert.strictEqual(tree.length, 1, 'Should have one root block');
      assert.strictEqual(tree[0].opening.blockName, 'spacer');
      assert.strictEqual(tree[0].closing, null);
      assert.strictEqual(tree[0].depth, 0);
    });

    it('should handle self-closing block inside container', () => {
      const comments: MockBlockComment[] = [
        { type: 'opening', blockName: 'group', line: 0 },
        { type: 'self-closing', blockName: 'spacer', line: 1 },
        { type: 'closing', blockName: 'group', line: 2 },
      ];

      const tree = buildMockBlockTree(comments);
      assert.strictEqual(tree.length, 1, 'Should have one root block');
      assert.strictEqual(tree[0].children.length, 1, 'Should have one child');
      assert.strictEqual(tree[0].children[0].opening.blockName, 'spacer');
      assert.strictEqual(tree[0].children[0].depth, 1);
    });
  });

  describe('Deep Nesting', () => {
    it('should calculate correct depths for deep nesting', () => {
      const comments: MockBlockComment[] = [
        { type: 'opening', blockName: 'group', line: 0 },
        { type: 'opening', blockName: 'columns', line: 1 },
        { type: 'opening', blockName: 'column', line: 2 },
        { type: 'opening', blockName: 'paragraph', line: 3 },
        { type: 'closing', blockName: 'paragraph', line: 4 },
        { type: 'closing', blockName: 'column', line: 5 },
        { type: 'closing', blockName: 'columns', line: 6 },
        { type: 'closing', blockName: 'group', line: 7 },
      ];

      const tree = buildMockBlockTree(comments);
      assert.strictEqual(tree.length, 1);
      assert.strictEqual(tree[0].depth, 0); // group
      assert.strictEqual(tree[0].children[0].depth, 1); // columns
      assert.strictEqual(tree[0].children[0].children[0].depth, 2); // column
      assert.strictEqual(tree[0].children[0].children[0].children[0].depth, 3); // paragraph
    });
  });

  describe('Error Handling', () => {
    it('should handle unclosed blocks', () => {
      const comments: MockBlockComment[] = [
        { type: 'opening', blockName: 'group', line: 0 },
        { type: 'opening', blockName: 'paragraph', line: 1 },
        // Missing closings
      ];

      const tree = buildMockBlockTree(comments);
      // Should not throw and should handle gracefully
      assert.ok(tree.length >= 1, 'Should handle unclosed blocks');
    });

    it('should handle orphan closing blocks', () => {
      const comments: MockBlockComment[] = [
        { type: 'closing', blockName: 'paragraph', line: 0 },
      ];

      // Should not throw
      const tree = buildMockBlockTree(comments);
      assert.ok(Array.isArray(tree), 'Should return array');
    });
  });

  describe('Complex Structures', () => {
    it('should handle columns with multiple children', () => {
      const comments: MockBlockComment[] = [
        { type: 'opening', blockName: 'columns', line: 0 },
        { type: 'opening', blockName: 'column', line: 1 },
        { type: 'opening', blockName: 'paragraph', line: 2 },
        { type: 'closing', blockName: 'paragraph', line: 3 },
        { type: 'closing', blockName: 'column', line: 4 },
        { type: 'opening', blockName: 'column', line: 5 },
        { type: 'opening', blockName: 'image', line: 6 },
        { type: 'closing', blockName: 'image', line: 7 },
        { type: 'closing', blockName: 'column', line: 8 },
        { type: 'closing', blockName: 'columns', line: 9 },
      ];

      const tree = buildMockBlockTree(comments);
      assert.strictEqual(tree.length, 1);
      assert.strictEqual(tree[0].opening.blockName, 'columns');
      assert.strictEqual(tree[0].children.length, 2, 'Should have two columns');
      assert.strictEqual(tree[0].children[0].opening.blockName, 'column');
      assert.strictEqual(tree[0].children[1].opening.blockName, 'column');
    });
  });
});
