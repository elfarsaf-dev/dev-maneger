import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  onCursorPositionChange?: (line: number, column: number) => void;
}

export function MonacoEditor({ value, onChange, language, onCursorPositionChange }: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [monaco, setMonaco] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMonaco = async () => {
      try {
        setError(null);
        // Dynamically import Monaco Editor with optimized settings
        const monacoModule = await import('monaco-editor');
        
        // Configure Monaco for React
        monacoModule.editor.defineTheme('github-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'comment', foreground: '6A737D' },
            { token: 'keyword', foreground: 'F97583' },
            { token: 'operator', foreground: 'F97583' },
            { token: 'namespace', foreground: 'FFD700' },
            { token: 'type', foreground: '79B8FF' },
            { token: 'struct', foreground: '79B8FF' },
            { token: 'class', foreground: '79B8FF' },
            { token: 'interface', foreground: '79B8FF' },
            { token: 'parameter', foreground: 'FFAB70' },
            { token: 'variable', foreground: 'F8F8F2' },
            { token: 'string', foreground: '9ECBFF' },
            { token: 'number', foreground: '79B8FF' },
            { token: 'regexp', foreground: '9ECBFF' },
          ],
          colors: {
            'editor.background': '#0d1117',
            'editor.foreground': '#f0f6fc',
            'editorLineNumber.foreground': '#8b949e',
            'editorLineNumber.activeForeground': '#f0f6fc',
            'editor.selectionBackground': '#264f78',
            'editor.inactiveSelectionBackground': '#3a3a3a',
            'editorCursor.foreground': '#f0f6fc',
            'editor.selectionHighlightBackground': '#add6ff26',
            'editor.wordHighlightBackground': '#575757b8',
            'editor.wordHighlightStrongBackground': '#004972b8',
            'editorIndentGuide.background': '#404040',
            'editorIndentGuide.activeBackground': '#707070',
          }
        });

        // Disable workers to avoid import issues in development
        (self as any).MonacoEnvironment = {
          getWorker: () => {
            return new Worker('data:text/javascript;charset=utf-8,' + encodeURIComponent(`
              self.postMessage = function(data) {
                // Simple stub worker
              };
            `));
          }
        };
        
        setMonaco(monacoModule);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load Monaco Editor:', error);
        setError('Failed to load code editor');
        setIsLoading(false);
      }
    };

    loadMonaco();
  }, []);

  // Debounced resize handler to prevent ResizeObserver errors
  const handleResize = useCallback(() => {
    if (editorRef.current) {
      requestAnimationFrame(() => {
        try {
          editorRef.current?.layout();
        } catch (error) {
          // Silently ignore ResizeObserver errors
          if (!(error instanceof Error) || !error.message.includes('ResizeObserver')) {
            console.error('Editor layout error:', error);
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!monaco || !containerRef.current || isLoading) return;

    // Create the editor
    const editor = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme: 'github-dark',
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      minimap: { enabled: true },
      wordWrap: 'on',
      automaticLayout: false, // Disable automatic layout to prevent ResizeObserver errors
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: 'selection',
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 12,
        horizontalScrollbarSize: 12,
      },
    });

    editorRef.current = editor;

    // Set up manual resize handling with error catching
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    // Add window resize listener
    window.addEventListener('resize', debouncedResize);

    // Initial layout
    setTimeout(() => handleResize(), 0);

    // Listen for content changes
    const disposable = editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      onChange(newValue);
    });

    // Listen for cursor position changes
    const cursorDisposable = editor.onDidChangeCursorPosition((e: any) => {
      if (onCursorPositionChange) {
        onCursorPositionChange(e.position.lineNumber, e.position.column);
      }
    });

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
      disposable.dispose();
      cursorDisposable.dispose();
      editor.dispose();
    };
  }, [monaco, isLoading, language, handleResize]);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      // Preserve cursor position when updating value
      const position = editorRef.current.getPosition();
      const selection = editorRef.current.getSelection();
      
      editorRef.current.setValue(value);
      
      // Restore cursor position and selection if they exist
      if (position) {
        editorRef.current.setPosition(position);
      }
      if (selection) {
        editorRef.current.setSelection(selection);
      }
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current && monaco) {
      monaco.editor.setModelLanguage(editorRef.current.getModel(), language);
    }
  }, [language, monaco]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading editor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center space-y-2">
          <div className="text-red-500">{error}</div>
          <button 
            onClick={() => { setError(null); setIsLoading(true); }}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full editor-area"
      data-testid="monaco-editor"
    />
  );
}
