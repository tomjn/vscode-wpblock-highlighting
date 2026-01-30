import * as vscode from 'vscode';
import { BlockComment, JsonToken } from './types';

// Closing: <!-- /wp:namespace/block-name -->
const CLOSING_PATTERN = /<!--\s*\/wp:([a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?)\s*-->/g;

// Pattern to find potential opening/self-closing blocks (without JSON matching)
// We'll extract JSON separately using balanced brace matching
const BLOCK_START_PATTERN = /<!--\s*wp:([a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?)\s*/g;

/**
 * Find the end index of balanced braces starting from a given position.
 * Returns -1 if no balanced braces found.
 */
function findBalancedBraces(text: string, startIndex: number): number {
  if (text[startIndex] !== '{') return -1;

  let depth = 0;
  let inString = false;
  let i = startIndex;

  while (i < text.length) {
    const char = text[i];

    if (inString) {
      if (char === '\\' && i + 1 < text.length) {
        i += 2; // Skip escaped character
        continue;
      }
      if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return i + 1; // Return position after closing brace
        }
      }
    }
    i++;
  }

  return -1; // Unbalanced
}

export function parseBlockComments(document: vscode.TextDocument): BlockComment[] {
  const text = document.getText();
  const comments: BlockComment[] = [];

  // Parse opening and self-closing blocks using balanced brace matching
  const openingAndSelfClosing = findOpeningBlocks(text, document);
  comments.push(...openingAndSelfClosing);

  // Parse closing blocks
  const closingMatches = findClosingMatches(text, document);
  comments.push(...closingMatches);

  // Sort by position in document
  comments.sort((a, b) => {
    const lineCompare = a.range.start.line - b.range.start.line;
    if (lineCompare !== 0) return lineCompare;
    return a.range.start.character - b.range.start.character;
  });

  return comments;
}

/**
 * Find opening and self-closing blocks using balanced brace matching for JSON.
 */
function findOpeningBlocks(text: string, document: vscode.TextDocument): BlockComment[] {
  const blocks: BlockComment[] = [];
  BLOCK_START_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = BLOCK_START_PATTERN.exec(text)) !== null) {
    const commentStart = match.index;
    const blockName = match[1];
    const afterName = match.index + match[0].length;

    // Look for optional JSON attributes
    let attributes: string | undefined;
    let jsonEnd = afterName;

    if (text[afterName] === '{') {
      const braceEnd = findBalancedBraces(text, afterName);
      if (braceEnd !== -1) {
        attributes = text.slice(afterName, braceEnd);
        jsonEnd = braceEnd;
      }
    }

    // Skip whitespace after JSON (or after block name if no JSON)
    let pos = jsonEnd;
    while (pos < text.length && /\s/.test(text[pos])) pos++;

    // Check for self-closing /-->
    let type: BlockComment['type'];
    let commentEnd: number;

    if (text.slice(pos, pos + 4) === '/-->') {
      type = 'self-closing';
      commentEnd = pos + 4;
    } else if (text.slice(pos, pos + 3) === '-->') {
      type = 'opening';
      commentEnd = pos + 3;
    } else {
      // Not a valid block comment, skip
      continue;
    }

    const fullMatch = text.slice(commentStart, commentEnd);
    const range = new vscode.Range(
      document.positionAt(commentStart),
      document.positionAt(commentEnd)
    );

    // Calculate name range
    const wpPrefix = 'wp:';
    const nameStartInMatch = match[0].indexOf(wpPrefix);
    const absoluteNameStart = commentStart + nameStartInMatch;
    const absoluteNameEnd = absoluteNameStart + wpPrefix.length + blockName.length;
    const nameRange = new vscode.Range(
      document.positionAt(absoluteNameStart),
      document.positionAt(absoluteNameEnd)
    );

    // Calculate attributes range and JSON tokens if present
    let attributesRange: vscode.Range | undefined;
    let jsonTokens: JsonToken[] | undefined;
    if (attributes) {
      attributesRange = new vscode.Range(
        document.positionAt(afterName),
        document.positionAt(afterName + attributes.length)
      );
      jsonTokens = parseJsonTokens(attributes, afterName, document);
    }

    blocks.push({
      type,
      fullMatch,
      blockName,
      attributes,
      range,
      nameRange,
      attributesRange,
      jsonTokens,
    });
  }

  return blocks;
}

/**
 * Find closing block comments.
 */
function findClosingMatches(text: string, document: vscode.TextDocument): BlockComment[] {
  const matches: BlockComment[] = [];
  CLOSING_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CLOSING_PATTERN.exec(text)) !== null) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    const range = new vscode.Range(startPos, endPos);

    const blockName = match[1];

    // Calculate name range
    const wpPrefix = '/wp:';
    const nameStartInMatch = match[0].indexOf(wpPrefix);
    const absoluteStart = match.index + nameStartInMatch;
    const absoluteEnd = absoluteStart + wpPrefix.length + blockName.length;
    const nameRange = new vscode.Range(
      document.positionAt(absoluteStart),
      document.positionAt(absoluteEnd)
    );

    matches.push({
      type: 'closing',
      fullMatch: match[0],
      blockName,
      attributes: undefined,
      range,
      nameRange,
      attributesRange: undefined,
      jsonTokens: undefined,
    });
  }

  return matches;
}

function parseJsonTokens(
  json: string,
  absoluteOffset: number,
  document: vscode.TextDocument
): JsonToken[] {
  const tokens: JsonToken[] = [];
  let i = 0;

  while (i < json.length) {
    const char = json[i];

    if (char === '{' || char === '}' || char === '[' || char === ']') {
      tokens.push({
        type: 'bracket',
        range: new vscode.Range(
          document.positionAt(absoluteOffset + i),
          document.positionAt(absoluteOffset + i + 1)
        ),
      });
      i++;
    } else if (char === ':') {
      tokens.push({
        type: 'colon',
        range: new vscode.Range(
          document.positionAt(absoluteOffset + i),
          document.positionAt(absoluteOffset + i + 1)
        ),
      });
      i++;
    } else if (char === ',') {
      tokens.push({
        type: 'comma',
        range: new vscode.Range(
          document.positionAt(absoluteOffset + i),
          document.positionAt(absoluteOffset + i + 1)
        ),
      });
      i++;
    } else if (char === '"') {
      // Parse string - could be key or value
      const stringStart = i;
      i++; // Skip opening quote
      while (i < json.length && json[i] !== '"') {
        if (json[i] === '\\' && i + 1 < json.length) {
          i += 2; // Skip escaped character
        } else {
          i++;
        }
      }
      i++; // Skip closing quote

      const stringEnd = i;

      // Determine if this is a key or value by looking ahead for colon
      let isKey = false;
      let j = i;
      while (j < json.length && /\s/.test(json[j])) j++;
      if (json[j] === ':') {
        isKey = true;
      }

      tokens.push({
        type: isKey ? 'key' : 'string',
        range: new vscode.Range(
          document.positionAt(absoluteOffset + stringStart),
          document.positionAt(absoluteOffset + stringEnd)
        ),
      });
    } else if (/[-\d]/.test(char)) {
      // Parse number
      const numStart = i;
      while (i < json.length && /[-\d.eE+]/.test(json[i])) {
        i++;
      }
      tokens.push({
        type: 'number',
        range: new vscode.Range(
          document.positionAt(absoluteOffset + numStart),
          document.positionAt(absoluteOffset + i)
        ),
      });
    } else if (json.slice(i, i + 4) === 'true') {
      tokens.push({
        type: 'boolean',
        range: new vscode.Range(
          document.positionAt(absoluteOffset + i),
          document.positionAt(absoluteOffset + i + 4)
        ),
      });
      i += 4;
    } else if (json.slice(i, i + 5) === 'false') {
      tokens.push({
        type: 'boolean',
        range: new vscode.Range(
          document.positionAt(absoluteOffset + i),
          document.positionAt(absoluteOffset + i + 5)
        ),
      });
      i += 5;
    } else if (json.slice(i, i + 4) === 'null') {
      tokens.push({
        type: 'null',
        range: new vscode.Range(
          document.positionAt(absoluteOffset + i),
          document.positionAt(absoluteOffset + i + 4)
        ),
      });
      i += 4;
    } else {
      // Skip whitespace and unknown characters
      i++;
    }
  }

  return tokens;
}

export function isWordPressBlockComment(text: string): boolean {
  // Check for closing block
  CLOSING_PATTERN.lastIndex = 0;
  if (CLOSING_PATTERN.test(text)) return true;

  // Check for opening or self-closing block
  BLOCK_START_PATTERN.lastIndex = 0;
  if (BLOCK_START_PATTERN.test(text)) {
    // Verify it ends with --> or /-->
    return /\/?-->\s*$/.test(text);
  }

  return false;
}
