import * as vscode from 'vscode';
import { BlockComment, JsonToken } from './types';

// Match JSON with up to 2 levels of nested braces (covers most WordPress blocks)
// Pattern: { ... { ... { ... } ... } ... }
const JSON_PATTERN = '\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*\\}';

// Regex patterns for WordPress block comments
// Opening: <!-- wp:namespace/block-name {"attr": "value"} -->
const OPENING_PATTERN = new RegExp(
  `<!--\\s*wp:([a-z][a-z0-9-]*(?:\\/[a-z][a-z0-9-]*)?)\\s*(${JSON_PATTERN})?\\s*-->`,
  'g'
);

// Closing: <!-- /wp:namespace/block-name -->
const CLOSING_PATTERN = /<!--\s*\/wp:([a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?)\s*-->/g;

// Self-closing: <!-- wp:namespace/block-name {"attr": "value"} /-->
const SELF_CLOSING_PATTERN = new RegExp(
  `<!--\\s*wp:([a-z][a-z0-9-]*(?:\\/[a-z][a-z0-9-]*)?)\\s*(${JSON_PATTERN})?\\s*\\/-->`,
  'g'
);

export function parseBlockComments(document: vscode.TextDocument): BlockComment[] {
  const text = document.getText();
  const comments: BlockComment[] = [];

  // Parse self-closing blocks first (to avoid matching them as opening blocks)
  const selfClosingMatches = findMatches(text, SELF_CLOSING_PATTERN, 'self-closing', document);
  comments.push(...selfClosingMatches);

  // Get positions of self-closing blocks to exclude them from opening pattern
  const selfClosingPositions = new Set(selfClosingMatches.map(m => m.range.start.line + ':' + m.range.start.character));

  // Parse opening blocks (excluding self-closing)
  const openingMatches = findMatches(text, OPENING_PATTERN, 'opening', document)
    .filter(m => !selfClosingPositions.has(m.range.start.line + ':' + m.range.start.character));
  comments.push(...openingMatches);

  // Parse closing blocks
  const closingMatches = findMatches(text, CLOSING_PATTERN, 'closing', document);
  comments.push(...closingMatches);

  // Sort by position in document
  comments.sort((a, b) => {
    const lineCompare = a.range.start.line - b.range.start.line;
    if (lineCompare !== 0) return lineCompare;
    return a.range.start.character - b.range.start.character;
  });

  return comments;
}

function findMatches(
  text: string,
  pattern: RegExp,
  type: BlockComment['type'],
  document: vscode.TextDocument
): BlockComment[] {
  const matches: BlockComment[] = [];
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  pattern.lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    const range = new vscode.Range(startPos, endPos);

    const blockName = match[1];
    const attributes = match[2];

    // Calculate name range within the comment
    const nameRange = calculateNameRange(match, document);

    // Calculate attributes range and JSON tokens if present
    let attributesRange: vscode.Range | undefined;
    let jsonTokens: JsonToken[] | undefined;
    if (attributes) {
      attributesRange = calculateAttributesRange(match, document);
      if (attributesRange) {
        jsonTokens = parseJsonTokens(attributes, match.index + match[0].indexOf(attributes), document);
      }
    }

    matches.push({
      type,
      fullMatch: match[0],
      blockName,
      attributes,
      range,
      nameRange,
      attributesRange,
      jsonTokens,
    });
  }

  return matches;
}

function calculateNameRange(
  match: RegExpExecArray,
  document: vscode.TextDocument
): vscode.Range {
  const fullMatch = match[0];
  const blockName = match[1];

  // Find the position of wp: or /wp: prefix and include it with the block name
  const wpPrefix = fullMatch.includes('/wp:') ? '/wp:' : 'wp:';
  const nameStartInMatch = fullMatch.indexOf(wpPrefix);

  const absoluteStart = match.index + nameStartInMatch;
  const absoluteEnd = absoluteStart + wpPrefix.length + blockName.length;

  return new vscode.Range(
    document.positionAt(absoluteStart),
    document.positionAt(absoluteEnd)
  );
}

function calculateAttributesRange(
  match: RegExpExecArray,
  document: vscode.TextDocument
): vscode.Range | undefined {
  const attributes = match[2];
  if (!attributes) return undefined;

  const fullMatch = match[0];
  const attrStartInMatch = fullMatch.indexOf(attributes);

  if (attrStartInMatch === -1) return undefined;

  const absoluteStart = match.index + attrStartInMatch;
  const absoluteEnd = absoluteStart + attributes.length;

  return new vscode.Range(
    document.positionAt(absoluteStart),
    document.positionAt(absoluteEnd)
  );
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
  const patterns = [OPENING_PATTERN, CLOSING_PATTERN, SELF_CLOSING_PATTERN];
  return patterns.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}
