import * as vscode from 'vscode';
import { DecorationManager } from './decorationManager';
import { HighlightProvider } from './highlightProvider';
import { WordPressBlockFoldingProvider } from './foldingProvider';
import { WordPressBlockSymbolProvider } from './symbolProvider';
import { WordPressBlockHoverProvider } from './hoverProvider';
import { WordPressBlockDiagnosticProvider } from './diagnosticProvider';
import { findMatchingComment, getBlockPath } from './blockMatcher';
import { ExtensionConfig } from './types';

let decorationManager: DecorationManager | null = null;
let highlightProvider: HighlightProvider | null = null;
let diagnosticProvider: WordPressBlockDiagnosticProvider | null = null;
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

  // Register folding, symbol, and hover providers for configured languages
  // Share parse cache with highlight provider for better performance
  const parseResultProvider = (doc: vscode.TextDocument) => highlightProvider!.getParseResult(doc);

  // Initialize diagnostic provider
  diagnosticProvider = new WordPressBlockDiagnosticProvider(parseResultProvider);
  context.subscriptions.push({ dispose: () => diagnosticProvider?.dispose() });

  for (const language of config.languages) {
    const foldingProvider = vscode.languages.registerFoldingRangeProvider(
      { language },
      new WordPressBlockFoldingProvider(parseResultProvider)
    );
    context.subscriptions.push(foldingProvider);

    // Register symbol provider for breadcrumb navigation and Outline view
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
      { language },
      new WordPressBlockSymbolProvider(parseResultProvider)
    );
    context.subscriptions.push(symbolProvider);

    // Register hover provider for block information
    const hoverProvider = vscode.languages.registerHoverProvider(
      { language },
      new WordPressBlockHoverProvider(parseResultProvider)
    );
    context.subscriptions.push(hoverProvider);
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
      const currentConfig = getConfig();
      if (editor && isLanguageSupported(editor.document.languageId, currentConfig)) {
        triggerUpdateDecorations(editor);
      }
    }
  );
  context.subscriptions.push(editorChangeListener);

  // Listen for document changes
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const editor = vscode.window.activeTextEditor;
      const currentConfig = getConfig();
      if (
        editor &&
        event.document === editor.document &&
        isLanguageSupported(editor.document.languageId, currentConfig)
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
      const currentConfig = getConfig();
      if (
        event.textEditor &&
        isLanguageSupported(event.textEditor.document.languageId, currentConfig)
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
  diagnosticProvider?.dispose();
  statusBarItem?.dispose();
}

const DEFAULT_DEPTH_COLORS = [
  'rgba(51, 102, 204, 0.15)',
  'rgba(51, 153, 51, 0.15)',
  'rgba(204, 102, 0, 0.15)',
  'rgba(153, 51, 204, 0.15)',
  'rgba(204, 51, 102, 0.15)',
  'rgba(51, 153, 153, 0.15)',
];

const COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\))$/;

function isValidColor(color: unknown): color is string {
  return typeof color === 'string' && COLOR_PATTERN.test(color);
}

function validateColors(colors: unknown[], defaults: string[], configName: string): string[] {
  if (!Array.isArray(colors) || colors.length === 0) {
    console.warn(`wpBlockHighlighting: ${configName} is empty or invalid, using defaults`);
    return defaults;
  }

  const validColors = colors.filter((c): c is string => {
    if (!isValidColor(c)) {
      console.warn(`wpBlockHighlighting: Invalid color "${c}" in ${configName}, skipping`);
      return false;
    }
    return true;
  });

  if (validColors.length === 0) {
    console.warn(`wpBlockHighlighting: No valid colors in ${configName}, using defaults`);
    return defaults;
  }

  return validColors;
}

function validateColor(color: unknown, defaultColor: string, configName: string): string {
  if (!isValidColor(color)) {
    console.warn(`wpBlockHighlighting: Invalid ${configName} "${color}", using default`);
    return defaultColor;
  }
  return color;
}

function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('wpBlockHighlighting');

  const rawDepthColors = config.get<string[]>('depthColors', DEFAULT_DEPTH_COLORS);
  const depthColors = validateColors(rawDepthColors, DEFAULT_DEPTH_COLORS, 'depthColors');

  const rawLanguages = config.get<string[]>('languages', ['html', 'php']);
  const languages = Array.isArray(rawLanguages) && rawLanguages.length > 0
    ? rawLanguages.filter((l): l is string => typeof l === 'string' && l.length > 0)
    : ['html', 'php'];

  if (languages.length === 0) {
    console.warn('wpBlockHighlighting: No valid languages configured, using defaults');
    languages.push('html', 'php');
  }

  return {
    enabled: config.get('enabled', true),
    depthColors,
    matchHighlightColor: validateColor(
      config.get('matchHighlightColor'),
      'rgba(255, 204, 0, 0.2)',
      'matchHighlightColor'
    ),
    matchNameHighlightColor: validateColor(
      config.get('matchNameHighlightColor'),
      '#ffcc00',
      'matchNameHighlightColor'
    ),
    blockNameColor: validateColor(
      config.get('blockNameColor'),
      '#569cd6',
      'blockNameColor'
    ),
    jsonKeyColor: validateColor(
      config.get('jsonKeyColor'),
      '#9cdcfe',
      'jsonKeyColor'
    ),
    jsonStringColor: validateColor(
      config.get('jsonStringColor'),
      '#ce9178',
      'jsonStringColor'
    ),
    jsonNumberColor: validateColor(
      config.get('jsonNumberColor'),
      '#b5cea8',
      'jsonNumberColor'
    ),
    jsonBracketColor: validateColor(
      config.get('jsonBracketColor'),
      '#ffd700',
      'jsonBracketColor'
    ),
    languages,
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
    diagnosticProvider?.updateDiagnostics(editor.document);
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
    statusBarItem.tooltip = 'WP Block Path';
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
