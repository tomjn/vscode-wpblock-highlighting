import * as vscode from 'vscode';
import { ParseResult, BlockComment } from './types';

type ParseResultProvider = (document: vscode.TextDocument) => ParseResult;

export class WordPressBlockDiagnosticProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor(private parseResultProvider: ParseResultProvider) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('wpBlocks');
  }

  updateDiagnostics(document: vscode.TextDocument): void {
    const parseResult = this.parseResultProvider(document);
    const diagnostics: vscode.Diagnostic[] = [];

    // Find unclosed opening blocks
    for (const pair of parseResult.pairs) {
      if (pair.opening.type === 'opening' && !pair.closing) {
        const diagnostic = new vscode.Diagnostic(
          pair.opening.range,
          `Unclosed block: ${pair.opening.blockName}`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = 'WP Blocks';
        diagnostics.push(diagnostic);
      }
    }

    // Find orphan closing blocks (closing blocks without matching opening)
    const pairedClosingComments = new Set(
      parseResult.pairs
        .filter(p => p.closing)
        .map(p => p.closing!)
    );

    for (const comment of parseResult.comments) {
      if (comment.type === 'closing' && !pairedClosingComments.has(comment)) {
        const diagnostic = new vscode.Diagnostic(
          comment.range,
          `Orphan closing block: ${comment.blockName}`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = 'WP Blocks';
        diagnostics.push(diagnostic);
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
