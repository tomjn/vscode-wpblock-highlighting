import * as vscode from 'vscode';
import { DecorationManager } from './decorationManager';
import { buildBlockTree, findBlockAtPosition } from './blockMatcher';
import { ParseResult, JsonToken } from './types';

export class HighlightProvider {
  private parseCache: Map<string, ParseResult> = new Map();
  private currentMatchRanges: vscode.Range[] = [];

  constructor(private decorationManager: DecorationManager) {}

  public updateDecorations(editor: vscode.TextEditor): void {
    const document = editor.document;
    const parseResult = this.getParseResult(document);

    // Clear all existing decorations first
    this.clearAllDecorations(editor);

    // Apply depth-based decorations
    this.applyDepthDecorations(editor, parseResult);

    // Apply block name and JSON decorations
    this.applyTextDecorations(editor, parseResult);
  }

  public updateMatchHighlight(editor: vscode.TextEditor): void {
    const document = editor.document;
    const parseResult = this.getParseResult(document);
    const position = editor.selection.active;

    // Clear previous match highlights
    editor.setDecorations(this.decorationManager.getMatchDecoration(), []);
    editor.setDecorations(this.decorationManager.getMatchNameDecoration(), []);

    // Find block at cursor position
    const pair = findBlockAtPosition(position, parseResult);
    if (!pair) {
      this.currentMatchRanges = [];
      return;
    }

    // Highlight both opening and closing comments (subtle background)
    const ranges: vscode.Range[] = [pair.opening.range];
    if (pair.closing) {
      ranges.push(pair.closing.range);
    }

    // Highlight the block names (more prominent)
    const nameRanges: vscode.Range[] = [pair.opening.nameRange];
    if (pair.closing) {
      nameRanges.push(pair.closing.nameRange);
    }

    this.currentMatchRanges = ranges;
    editor.setDecorations(this.decorationManager.getMatchDecoration(), ranges);
    editor.setDecorations(this.decorationManager.getMatchNameDecoration(), nameRanges);
  }

  public getParseResult(document: vscode.TextDocument): ParseResult {
    const key = `${document.uri.toString()}:${document.version}`;
    const cached = this.parseCache.get(key);

    if (cached) {
      return cached;
    }

    // Clear old versions of this document from cache
    const uriPrefix = document.uri.toString() + ':';
    for (const cacheKey of this.parseCache.keys()) {
      if (cacheKey.startsWith(uriPrefix)) {
        this.parseCache.delete(cacheKey);
      }
    }

    const result = buildBlockTree(document);
    this.parseCache.set(key, result);
    return result;
  }

  public invalidateCache(document: vscode.TextDocument): void {
    this.parseCache.delete(document.uri.toString());
  }

  public clearAllDecorations(editor: vscode.TextEditor): void {
    for (const decoration of this.decorationManager.getAllDecorationTypes()) {
      editor.setDecorations(decoration, []);
    }
  }

  private applyDepthDecorations(
    editor: vscode.TextEditor,
    parseResult: ParseResult
  ): void {
    // Group pairs by depth
    const depthGroups = new Map<number, vscode.Range[]>();

    for (const pair of parseResult.pairs) {
      const depth = pair.depth;
      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }

      const ranges = depthGroups.get(depth)!;
      ranges.push(pair.opening.range);

      if (pair.closing) {
        ranges.push(pair.closing.range);
      }
    }

    // Apply decorations for each depth
    for (const [depth, ranges] of depthGroups) {
      const decoration = this.decorationManager.getDepthDecoration(depth);
      editor.setDecorations(decoration, ranges);
    }
  }

  private applyTextDecorations(
    editor: vscode.TextEditor,
    parseResult: ParseResult
  ): void {
    const nameRanges: vscode.Range[] = [];
    const jsonKeyRanges: vscode.Range[] = [];
    const jsonStringRanges: vscode.Range[] = [];
    const jsonNumberRanges: vscode.Range[] = [];
    const jsonBracketRanges: vscode.Range[] = [];
    const jsonBooleanRanges: vscode.Range[] = [];

    for (const pair of parseResult.pairs) {
      // Add name ranges
      nameRanges.push(pair.opening.nameRange);
      if (pair.closing) {
        nameRanges.push(pair.closing.nameRange);
      }

      // Add JSON token ranges
      if (pair.opening.jsonTokens) {
        for (const token of pair.opening.jsonTokens) {
          switch (token.type) {
            case 'key':
              jsonKeyRanges.push(token.range);
              break;
            case 'string':
              jsonStringRanges.push(token.range);
              break;
            case 'number':
              jsonNumberRanges.push(token.range);
              break;
            case 'bracket':
              jsonBracketRanges.push(token.range);
              break;
            case 'boolean':
            case 'null':
              jsonBooleanRanges.push(token.range);
              break;
            // colon and comma don't need special coloring
          }
        }
      }
    }

    // Apply decorations
    editor.setDecorations(
      this.decorationManager.getBlockNameDecoration(),
      nameRanges
    );

    editor.setDecorations(
      this.decorationManager.getJsonKeyDecoration(),
      jsonKeyRanges
    );

    editor.setDecorations(
      this.decorationManager.getJsonStringDecoration(),
      jsonStringRanges
    );

    editor.setDecorations(
      this.decorationManager.getJsonNumberDecoration(),
      jsonNumberRanges
    );

    editor.setDecorations(
      this.decorationManager.getJsonBracketDecoration(),
      jsonBracketRanges
    );

    editor.setDecorations(
      this.decorationManager.getJsonBooleanDecoration(),
      jsonBooleanRanges
    );
  }

  public getCurrentMatchRanges(): vscode.Range[] {
    return this.currentMatchRanges;
  }

  public dispose(): void {
    this.parseCache.clear();
  }
}
