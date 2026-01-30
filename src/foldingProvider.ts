import * as vscode from 'vscode';
import { buildBlockTree } from './blockMatcher';
import { BlockPair, ParseResult } from './types';

export type ParseResultProvider = (document: vscode.TextDocument) => ParseResult;

export class WordPressBlockFoldingProvider implements vscode.FoldingRangeProvider {
  private getParseResult: ParseResultProvider;

  constructor(parseResultProvider?: ParseResultProvider) {
    this.getParseResult = parseResultProvider ?? buildBlockTree;
  }

  provideFoldingRanges(
    document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    const parseResult = this.getParseResult(document);
    const foldingRanges: vscode.FoldingRange[] = [];

    for (const pair of parseResult.pairs) {
      const range = this.createFoldingRange(pair);
      if (range) {
        foldingRanges.push(range);
      }
    }

    return foldingRanges;
  }

  private createFoldingRange(pair: BlockPair): vscode.FoldingRange | null {
    // Only create folding range if we have both opening and closing
    if (!pair.closing) {
      return null;
    }

    const startLine = pair.opening.range.start.line;
    const endLine = pair.closing.range.end.line;

    // Don't fold if it's all on one line
    if (startLine === endLine) {
      return null;
    }

    return new vscode.FoldingRange(
      startLine,
      endLine,
      vscode.FoldingRangeKind.Region
    );
  }
}
