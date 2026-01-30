import * as vscode from 'vscode';
import { DecorationConfig } from './types';

export class DecorationManager {
  private depthDecorations: vscode.TextEditorDecorationType[] = [];
  private matchDecoration: vscode.TextEditorDecorationType | null = null;
  private matchNameDecoration: vscode.TextEditorDecorationType | null = null;
  private blockNameDecoration: vscode.TextEditorDecorationType | null = null;

  // JSON token decorations
  private jsonKeyDecoration: vscode.TextEditorDecorationType | null = null;
  private jsonStringDecoration: vscode.TextEditorDecorationType | null = null;
  private jsonNumberDecoration: vscode.TextEditorDecorationType | null = null;
  private jsonBracketDecoration: vscode.TextEditorDecorationType | null = null;
  private jsonBooleanDecoration: vscode.TextEditorDecorationType | null = null;

  constructor(private config: DecorationConfig) {
    this.createDecorations();
  }

  private createDecorations(): void {
    this.dispose();

    // Create depth-based background decorations
    // These only affect background, preserving syntax highlighting
    this.depthDecorations = this.config.depthColors.map((color) =>
      vscode.window.createTextEditorDecorationType({
        backgroundColor: color,
        isWholeLine: false,
      })
    );

    // Create match highlight decoration (subtle background only)
    this.matchDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: this.config.matchHighlightColor,
    });

    // Create match name highlight decoration (highlights the block name text color)
    this.matchNameDecoration = vscode.window.createTextEditorDecorationType({
      color: this.config.matchNameHighlightColor,
      fontWeight: 'bold',
    });

    // Create block name decoration - bold only, preserves color from syntax highlighting
    this.blockNameDecoration = vscode.window.createTextEditorDecorationType({
      fontWeight: 'bold',
    });

    // JSON decorations - use colors that work in HTML comments where there's no syntax highlighting
    this.jsonKeyDecoration = vscode.window.createTextEditorDecorationType({
      color: this.config.jsonKeyColor,
    });

    this.jsonStringDecoration = vscode.window.createTextEditorDecorationType({
      color: this.config.jsonStringColor,
    });

    this.jsonNumberDecoration = vscode.window.createTextEditorDecorationType({
      color: this.config.jsonNumberColor,
    });

    this.jsonBracketDecoration = vscode.window.createTextEditorDecorationType({
      color: this.config.jsonBracketColor,
    });

    this.jsonBooleanDecoration = vscode.window.createTextEditorDecorationType({
      color: this.config.jsonNumberColor, // Same color as numbers for booleans
    });
  }

  public updateConfig(config: DecorationConfig): void {
    this.config = config;
    this.createDecorations();
  }

  public getDepthDecoration(depth: number): vscode.TextEditorDecorationType {
    const index = depth % this.depthDecorations.length;
    return this.depthDecorations[index];
  }

  public getMatchDecoration(): vscode.TextEditorDecorationType {
    if (!this.matchDecoration) {
      throw new Error('Match decoration not initialized');
    }
    return this.matchDecoration;
  }

  public getMatchNameDecoration(): vscode.TextEditorDecorationType {
    if (!this.matchNameDecoration) {
      throw new Error('Match name decoration not initialized');
    }
    return this.matchNameDecoration;
  }

  public getBlockNameDecoration(): vscode.TextEditorDecorationType {
    if (!this.blockNameDecoration) {
      throw new Error('Block name decoration not initialized');
    }
    return this.blockNameDecoration;
  }

  public getJsonKeyDecoration(): vscode.TextEditorDecorationType {
    if (!this.jsonKeyDecoration) {
      throw new Error('JSON key decoration not initialized');
    }
    return this.jsonKeyDecoration;
  }

  public getJsonStringDecoration(): vscode.TextEditorDecorationType {
    if (!this.jsonStringDecoration) {
      throw new Error('JSON string decoration not initialized');
    }
    return this.jsonStringDecoration;
  }

  public getJsonNumberDecoration(): vscode.TextEditorDecorationType {
    if (!this.jsonNumberDecoration) {
      throw new Error('JSON number decoration not initialized');
    }
    return this.jsonNumberDecoration;
  }

  public getJsonBracketDecoration(): vscode.TextEditorDecorationType {
    if (!this.jsonBracketDecoration) {
      throw new Error('JSON bracket decoration not initialized');
    }
    return this.jsonBracketDecoration;
  }

  public getJsonBooleanDecoration(): vscode.TextEditorDecorationType {
    if (!this.jsonBooleanDecoration) {
      throw new Error('JSON boolean decoration not initialized');
    }
    return this.jsonBooleanDecoration;
  }

  public getAllDecorationTypes(): vscode.TextEditorDecorationType[] {
    const all: vscode.TextEditorDecorationType[] = [...this.depthDecorations];
    if (this.matchDecoration) all.push(this.matchDecoration);
    if (this.matchNameDecoration) all.push(this.matchNameDecoration);
    if (this.blockNameDecoration) all.push(this.blockNameDecoration);
    if (this.jsonKeyDecoration) all.push(this.jsonKeyDecoration);
    if (this.jsonStringDecoration) all.push(this.jsonStringDecoration);
    if (this.jsonNumberDecoration) all.push(this.jsonNumberDecoration);
    if (this.jsonBracketDecoration) all.push(this.jsonBracketDecoration);
    if (this.jsonBooleanDecoration) all.push(this.jsonBooleanDecoration);
    return all;
  }

  public dispose(): void {
    this.depthDecorations.forEach((d) => d.dispose());
    this.depthDecorations = [];

    if (this.matchDecoration) {
      this.matchDecoration.dispose();
      this.matchDecoration = null;
    }

    if (this.matchNameDecoration) {
      this.matchNameDecoration.dispose();
      this.matchNameDecoration = null;
    }

    if (this.blockNameDecoration) {
      this.blockNameDecoration.dispose();
      this.blockNameDecoration = null;
    }

    if (this.jsonKeyDecoration) {
      this.jsonKeyDecoration.dispose();
      this.jsonKeyDecoration = null;
    }

    if (this.jsonStringDecoration) {
      this.jsonStringDecoration.dispose();
      this.jsonStringDecoration = null;
    }

    if (this.jsonNumberDecoration) {
      this.jsonNumberDecoration.dispose();
      this.jsonNumberDecoration = null;
    }

    if (this.jsonBracketDecoration) {
      this.jsonBracketDecoration.dispose();
      this.jsonBracketDecoration = null;
    }

    if (this.jsonBooleanDecoration) {
      this.jsonBooleanDecoration.dispose();
      this.jsonBooleanDecoration = null;
    }
  }
}
