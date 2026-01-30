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

    // Recursively get children first so we know if this block has any
    const children = this.convertPairsToSymbols(pair.children, document);

    // Choose icon based on block type
    const symbolKind = this.getSymbolKind(displayName, children.length > 0);

    // Create the symbol
    const symbol = new vscode.DocumentSymbol(
      displayName,
      blockName !== displayName ? blockName : '', // Show full name as detail if different
      symbolKind,
      fullRange,
      selectionRange
    );

    symbol.children = children;

    return symbol;
  }

  private getSymbolKind(blockName: string, hasChildren: boolean): vscode.SymbolKind {
    // Paragraph blocks - use Field (simple text-like)
    if (blockName === 'paragraph') {
      return vscode.SymbolKind.Field;
    }

    // Quote blocks - use String (text/quote-like)
    if (blockName === 'quote' || blockName === 'pullquote') {
      return vscode.SymbolKind.String;
    }

    // Navigation/menu blocks - use Enum (list-like)
    if (blockName === 'navigation' || blockName === 'navigation-link' || blockName === 'nav' || blockName === 'menu') {
      return vscode.SymbolKind.Enum;
    }

    // Blocks with children - use Namespace (container/hierarchy)
    if (hasChildren) {
      return vscode.SymbolKind.Namespace;
    }

    // Everything else - use Property
    return vscode.SymbolKind.Property;
  }
}
