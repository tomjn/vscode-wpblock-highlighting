import * as vscode from 'vscode';
import { BlockComment, BlockPair, ParseResult } from './types';
import { parseBlockComments } from './blockParser';

export function buildBlockTree(document: vscode.TextDocument): ParseResult {
  const comments = parseBlockComments(document);
  const pairs: BlockPair[] = [];
  const rootPairs: BlockPair[] = [];
  const stack: BlockPair[] = [];

  for (const comment of comments) {
    if (comment.type === 'self-closing') {
      const pair: BlockPair = {
        opening: comment,
        closing: null,
        depth: stack.length,
        children: [],
        parent: stack.length > 0 ? stack[stack.length - 1] : undefined,
      };
      pairs.push(pair);

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(pair);
      } else {
        rootPairs.push(pair);
      }
    } else if (comment.type === 'opening') {
      const pair: BlockPair = {
        opening: comment,
        closing: null,
        depth: stack.length,
        children: [],
        parent: stack.length > 0 ? stack[stack.length - 1] : undefined,
      };
      pairs.push(pair);
      stack.push(pair);
    } else if (comment.type === 'closing') {
      // Find matching opening block
      let matchFound = false;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].opening.blockName === comment.blockName) {
          const pair = stack[i];
          pair.closing = comment;

          // Remove this and all blocks after it from stack
          // (handles mismatched blocks gracefully)
          stack.splice(i);

          if (pair.parent) {
            pair.parent.children.push(pair);
          } else {
            rootPairs.push(pair);
          }

          matchFound = true;
          break;
        }
      }

      // If no match found, this is an orphan closing tag
      if (!matchFound) {
        // Create a pair with just the closing comment for highlighting purposes
        const orphanPair: BlockPair = {
          opening: comment, // Use closing as opening for display
          closing: null,
          depth: 0,
          children: [],
        };
        pairs.push(orphanPair);
        rootPairs.push(orphanPair);
      }
    }
  }

  // Any remaining items in stack are unclosed blocks
  for (const pair of stack) {
    if (!pair.parent) {
      rootPairs.push(pair);
    } else {
      pair.parent.children.push(pair);
    }
  }

  return { comments, pairs, rootPairs };
}

export function findBlockAtPosition(
  position: vscode.Position,
  parseResult: ParseResult
): BlockPair | null {
  for (const pair of parseResult.pairs) {
    // Check if position is within opening comment
    if (pair.opening.range.contains(position)) {
      return pair;
    }

    // Check if position is within closing comment
    if (pair.closing && pair.closing.range.contains(position)) {
      return pair;
    }
  }

  return null;
}

export function findMatchingComment(
  position: vscode.Position,
  parseResult: ParseResult
): BlockComment | null {
  const pair = findBlockAtPosition(position, parseResult);
  if (!pair) return null;

  // If cursor is on opening, return closing (and vice versa)
  if (pair.opening.range.contains(position) && pair.closing) {
    return pair.closing;
  }

  if (pair.closing && pair.closing.range.contains(position)) {
    return pair.opening;
  }

  return null;
}

export function getBlockPath(
  position: vscode.Position,
  parseResult: ParseResult
): string[] {
  const path: string[] = [];

  // Find innermost block containing position
  let currentPair = findContainingBlock(position, parseResult.rootPairs);

  while (currentPair) {
    path.unshift(currentPair.opening.blockName);
    currentPair = currentPair.parent;
  }

  return path;
}

function findContainingBlock(
  position: vscode.Position,
  pairs: BlockPair[]
): BlockPair | null {
  for (const pair of pairs) {
    // Check if position is within this block's range
    const startLine = pair.opening.range.start.line;
    const endLine = pair.closing
      ? pair.closing.range.end.line
      : pair.opening.range.end.line;

    if (position.line >= startLine && position.line <= endLine) {
      // Check children first (for innermost match)
      const childMatch = findContainingBlock(position, pair.children);
      if (childMatch) return childMatch;

      // If no child contains it, this block does
      return pair;
    }
  }

  return null;
}

export function getAllBlocksAtDepth(
  depth: number,
  parseResult: ParseResult
): BlockPair[] {
  return parseResult.pairs.filter(pair => pair.depth === depth);
}
