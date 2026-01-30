import * as vscode from 'vscode';

export interface BlockComment {
  type: 'opening' | 'closing' | 'self-closing';
  fullMatch: string;
  blockName: string;
  attributes?: string;
  range: vscode.Range;
  nameRange: vscode.Range;
  attributesRange?: vscode.Range;
  // JSON token ranges for syntax highlighting
  jsonTokens?: JsonToken[];
}

export interface JsonToken {
  type: 'bracket' | 'key' | 'string' | 'number' | 'boolean' | 'null' | 'colon' | 'comma';
  range: vscode.Range;
}

export interface BlockPair {
  opening: BlockComment;
  closing: BlockComment | null;
  depth: number;
  children: BlockPair[];
  parent?: BlockPair;
}

export interface ParseResult {
  comments: BlockComment[];
  pairs: BlockPair[];
  rootPairs: BlockPair[];
}

export interface DecorationConfig {
  depthColors: string[];
  matchHighlightColor: string;
  matchNameHighlightColor: string;
  blockNameColor: string;
  jsonKeyColor: string;
  jsonStringColor: string;
  jsonNumberColor: string;
  jsonBracketColor: string;
}

export interface ExtensionConfig extends DecorationConfig {
  enabled: boolean;
  languages: string[];
}
