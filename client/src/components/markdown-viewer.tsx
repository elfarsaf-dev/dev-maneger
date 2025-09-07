import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
  fileName: string;
  onDownload?: () => void;
}

export function MarkdownViewer({ content, fileName, onDownload }: MarkdownViewerProps) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const renderedMarkdown = useMemo(() => {
    return (
      <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground prose-blockquote:text-muted-foreground prose-blockquote:border-l-border prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:text-foreground prose-table:text-foreground prose-th:border-border prose-td:border-border prose-hr:border-border">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }, [content]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-medium">{fileName}</h3>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={handleDownload} data-testid="download-markdown">
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-auto">
        <div 
          className="markdown-content"
          data-testid="markdown-content"
        >
          {renderedMarkdown}
        </div>
      </div>
    </div>
  );
}