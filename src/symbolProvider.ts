import * as vscode from 'vscode';
import { BlockPair, ParseResult } from './types';

/**
 * Provides document symbols for WordPress blocks.
 * This enables blocks to appear in VS Code's breadcrumb navigation and Outline view.
 */
export class WordPressBlockSymbolProvider implements vscode.DocumentSymbolProvider {
  private parseResultProvider: (doc: vscode.TextDocument) => ParseResult;

  constructor(parseResultProvider: (doc: vscode.TextDocument) => ParseResult) {
    this.parseResultProvider = parseResultProvider;
  }

  provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {
    const parseResult = this.parseResultProvider(document);
    return this.convertPairsToSymbols(parseResult.rootPairs, document);
  }

  private convertPairsToSymbols(
    pairs: BlockPair[],
    document: vscode.TextDocument
  ): vscode.DocumentSymbol[] {
    const symbols: vscode.DocumentSymbol[] = [];

    for (const pair of pairs) {
      const symbol = this.createSymbol(pair, document);
      if (symbol) {
        symbols.push(symbol);
      }
    }

    return symbols;
  }

  private createSymbol(
    pair: BlockPair,
    document: vscode.TextDocument
  ): vscode.DocumentSymbol | null {
    const blockName = pair.opening.blockName;

    // Get a display name (remove namespace for cleaner display)
    const displayName = blockName.includes('/')
      ? blockName.split('/')[1]
      : blockName;

    // Calculate the full range of the block
    const startPos = pair.opening.range.start;
    const endPos = pair.closing
      ? pair.closing.range.end
      : pair.opening.range.end;

    const fullRange = new vscode.Range(startPos, endPos);
    const selectionRange = pair.opening.nameRange;

    // Create the symbol with an appropriate icon
    const symbol = new vscode.DocumentSymbol(
      displayName,
      blockName !== displayName ? blockName : '', // Show full name as detail if different
      vscode.SymbolKind.Class, // Class icon for block components
      fullRange,
      selectionRange
    );

    // Recursively add children
    symbol.children = this.convertPairsToSymbols(pair.children, document);

    return symbol;
  }
}
