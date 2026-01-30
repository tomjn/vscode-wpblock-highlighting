import * as vscode from 'vscode';
import { ParseResult, BlockPair } from './types';

type ParseResultProvider = (document: vscode.TextDocument) => ParseResult;

export class WordPressBlockHoverProvider implements vscode.HoverProvider {
  constructor(private parseResultProvider: ParseResultProvider) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.Hover | null {
    const parseResult = this.parseResultProvider(document);

    // Find which block comment the cursor is on
    for (const pair of parseResult.pairs) {
      if (pair.opening.range.contains(position)) {
        return this.createHover(pair, pair.opening.range);
      }
      if (pair.closing?.range.contains(position)) {
        return this.createHover(pair, pair.closing.range);
      }
    }

    // Check for self-closing blocks in comments
    for (const comment of parseResult.comments) {
      if (comment.type === 'self-closing' && comment.range.contains(position)) {
        // Find the pair for this self-closing block
        const pair = parseResult.pairs.find(p => p.opening === comment);
        if (pair) {
          return this.createHover(pair, comment.range);
        }
      }
    }

    return null;
  }

  private createHover(pair: BlockPair, range: vscode.Range): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    // Block name
    md.appendMarkdown(`**Block:** \`${pair.opening.blockName}\`\n\n`);

    // Depth
    md.appendMarkdown(`**Depth:** ${pair.depth}\n\n`);

    // Attributes
    if (pair.opening.attributes) {
      try {
        const attrs = JSON.parse(pair.opening.attributes);
        const keys = Object.keys(attrs);

        if (keys.length > 0) {
          md.appendMarkdown(`**Attributes:** ${keys.length}\n\n`);
          md.appendMarkdown('| Key | Type |\n|-----|------|\n');
          for (const key of keys.slice(0, 10)) {
            const value = attrs[key];
            const type = Array.isArray(value) ? 'array' : typeof value;
            md.appendMarkdown(`| \`${key}\` | ${type} |\n`);
          }
          if (keys.length > 10) {
            md.appendMarkdown(`\n*...and ${keys.length - 10} more*\n`);
          }
        } else {
          md.appendMarkdown('**Attributes:** none\n');
        }
      } catch {
        md.appendMarkdown('**Attributes:** *(invalid JSON)*\n');
      }
    } else {
      md.appendMarkdown('**Attributes:** none\n');
    }

    return new vscode.Hover(md, range);
  }
}
