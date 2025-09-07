import { Maximize2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
  src: string;
  alt: string;
  fileName: string;
}

export function ImageViewer({ src, alt, fileName }: ImageViewerProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-medium">{fileName}</h3>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={handleDownload} data-testid="download-image">
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
        <img 
          src={src} 
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          data-testid="image-content"
        />
      </div>
    </div>
  );
}