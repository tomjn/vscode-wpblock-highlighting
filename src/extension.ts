import * as vscode from 'vscode';
import { DecorationManager } from './decorationManager';
import { HighlightProvider } from './highlightProvider';
import { WordPressBlockFoldingProvider } from './foldingProvider';
import { findMatchingComment, getBlockPath } from './blockMatcher';
import { ExtensionConfig } from './types';

let decorationManager: DecorationManager | null = null;
let highlightProvider: HighlightProvider | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;

export function activate(context: vscode.ExtensionContext): void {
  console.log('WordPress Block Highlighting is now active');

  const config = getConfig();

  if (!config.enabled) {
    return;
  }

  // Initialize decoration manager
  decorationManager = new DecorationManager(config);
  highlightProvider = new HighlightProvider(decorationManager);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(statusBarItem);

  // Register folding provider for configured languages
  for (const language of config.languages) {
    const foldingProvider = vscode.languages.registerFoldingRangeProvider(
      { language },
      new WordPressBlockFoldingProvider()
    );
    context.subscriptions.push(foldingProvider);
  }

  // Register jump to matching pair command
  const jumpCommand = vscode.commands.registerCommand(
    'wpBlockHighlighting.jumpToMatchingPair',
    jumpToMatchingPair
  );
  context.subscriptions.push(jumpCommand);

  // Apply decorations to active editor
  if (vscode.window.activeTextEditor) {
    triggerUpdateDecorations(vscode.window.activeTextEditor);
  }

  // Listen for active editor changes
  const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor && isLanguageSupported(editor.document.languageId, config)) {
        triggerUpdateDecorations(editor);
      }
    }
  );
  context.subscriptions.push(editorChangeListener);

  // Listen for document changes
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const editor = vscode.window.activeTextEditor;
      if (
        editor &&
        event.document === editor.document &&
        isLanguageSupported(editor.document.languageId, config)
      ) {
        highlightProvider?.invalidateCache(event.document);
        triggerUpdateDecorations(editor);
      }
    }
  );
  context.subscriptions.push(documentChangeListener);

  // Listen for selection changes (for match highlighting)
  const selectionChangeListener = vscode.window.onDidChangeTextEditorSelection(
    (event) => {
      if (
        event.textEditor &&
        isLanguageSupported(event.textEditor.document.languageId, config)
      ) {
        highlightProvider?.updateMatchHighlight(event.textEditor);
        updateStatusBar(event.textEditor);
      }
    }
  );
  context.subscriptions.push(selectionChangeListener);

  // Listen for configuration changes
  const configChangeListener = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (event.affectsConfiguration('wpBlockHighlighting')) {
        const newConfig = getConfig();
        decorationManager?.updateConfig(newConfig);

        if (vscode.window.activeTextEditor) {
          triggerUpdateDecorations(vscode.window.activeTextEditor);
        }
      }
    }
  );
  context.subscriptions.push(configChangeListener);
}

export function deactivate(): void {
  decorationManager?.dispose();
  highlightProvider?.dispose();
  statusBarItem?.dispose();
}

function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('wpBlockHighlighting');

  return {
    enabled: config.get('enabled', true),
    depthColors: config.get('depthColors', [
      'rgba(51, 102, 204, 0.15)',
      'rgba(51, 153, 51, 0.15)',
      'rgba(204, 102, 0, 0.15)',
      'rgba(153, 51, 204, 0.15)',
      'rgba(204, 51, 102, 0.15)',
      'rgba(51, 153, 153, 0.15)',
    ]),
    matchHighlightColor: config.get('matchHighlightColor', 'rgba(255, 204, 0, 0.2)'),
    matchNameHighlightColor: config.get('matchNameHighlightColor', '#ffcc00'),
    blockNameColor: config.get('blockNameColor', '#569cd6'),
    jsonKeyColor: config.get('jsonKeyColor', '#9cdcfe'),
    jsonStringColor: config.get('jsonStringColor', '#ce9178'),
    jsonNumberColor: config.get('jsonNumberColor', '#b5cea8'),
    jsonBracketColor: config.get('jsonBracketColor', '#ffd700'),
    languages: config.get('languages', ['html', 'php']),
  };
}

function isLanguageSupported(languageId: string, config: ExtensionConfig): boolean {
  return config.languages.includes(languageId);
}

let updateTimeout: NodeJS.Timeout | null = null;

function triggerUpdateDecorations(editor: vscode.TextEditor): void {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }

  updateTimeout = setTimeout(() => {
    highlightProvider?.updateDecorations(editor);
    highlightProvider?.updateMatchHighlight(editor);
    updateStatusBar(editor);
  }, 100);
}

function updateStatusBar(editor: vscode.TextEditor): void {
  if (!statusBarItem || !highlightProvider) return;

  const parseResult = highlightProvider.getParseResult(editor.document);
  const position = editor.selection.active;

  const path = getBlockPath(position, parseResult);

  if (path.length > 0) {
    statusBarItem.text = `$(symbol-class) ${path.join(' > ')}`;
    statusBarItem.tooltip = 'WordPress Block Path';
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

function jumpToMatchingPair(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !highlightProvider) return;

  const parseResult = highlightProvider.getParseResult(editor.document);
  const position = editor.selection.active;

  const matchingComment = findMatchingComment(position, parseResult);
  if (matchingComment) {
    const newPosition = matchingComment.range.start;
    editor.selection = new vscode.Selection(newPosition, newPosition);
    editor.revealRange(matchingComment.range, vscode.TextEditorRevealType.InCenter);
  }
}
