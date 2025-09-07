import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FileCode, FileImage, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileTreeItem } from '@/lib/schema';
import { cn } from '@/lib/utils';

interface FileTreeProps {
  items: FileTreeItem[];
  selectedPath?: string;
  expandedPaths: Set<string>;
  onItemClick: (item: FileTreeItem) => void;
  onToggleExpanded: (path: string) => void;
  onDeleteFile?: (file: FileTreeItem) => void;
  modifiedFiles: Set<string>;
  folderContents: Map<string, FileTreeItem[]>;
  level?: number;
}

function getFileIcon(fileName: string, isDirectory: boolean) {
  if (isDirectory) {
    return { icon: Folder, color: 'text-primary' };
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'vue':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'php':
    case 'rb':
    case 'go':
    case 'rs':
      return { icon: FileCode, color: 'text-accent' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return { icon: FileImage, color: 'text-orange-400' };
    case 'md':
    case 'txt':
    case 'doc':
    case 'docx':
      return { icon: FileText, color: 'text-muted-foreground' };
    case 'json':
      return { icon: FileCode, color: 'text-blue-400' };
    case 'css':
    case 'scss':
    case 'sass':
      return { icon: FileCode, color: 'text-orange-400' };
    case 'html':
    case 'htm':
      return { icon: FileCode, color: 'text-red-400' };
    default:
      return { icon: File, color: 'text-muted-foreground' };
  }
}

export function FileTree({ 
  items, 
  selectedPath, 
  expandedPaths, 
  onItemClick, 
  onToggleExpanded,
  onDeleteFile,
  modifiedFiles,
  folderContents,
  level = 0 
}: FileTreeProps) {
  const sortedItems = [...items].sort((a, b) => {
    // Directories first, then files
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={cn("select-none", level > 0 && "ml-4")}>
      {sortedItems.map((item, index) => {
        const isExpanded = expandedPaths.has(item.path);
        const isSelected = selectedPath === item.path;
        const isModified = modifiedFiles.has(item.path);
        const { icon: Icon, color } = getFileIcon(item.name, item.type === 'dir');
        
        return (
          <div key={`file-${item.path}-${item.sha || index}`}>
            <div
              className={cn(
                "file-tree-item group p-3 lg:p-2 cursor-pointer flex items-center text-sm hover:bg-muted transition-colors touch-manipulation",
                isSelected && "selected bg-primary/20 border-l-2 border-primary"
              )}
              onClick={() => onItemClick(item)}
              data-testid={`file-tree-item-${item.path.replace(/[\/\s]/g, '-')}`}
            >
              {item.type === 'dir' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpanded(item.path);
                  }}
                  className="mr-1 p-1 lg:p-0.5 hover:bg-muted-foreground/20 rounded touch-manipulation"
                  data-testid={`toggle-folder-${item.path}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
              
              {item.type === 'dir' ? (
                isExpanded ? (
                  <FolderOpen className={cn("mr-2 h-4 w-4", color)} />
                ) : (
                  <Folder className={cn("mr-2 h-4 w-4", color)} />
                )
              ) : (
                <Icon className={cn("mr-2 h-4 w-4", color)} />
              )}
              
              <span className="flex-1 text-base lg:text-sm">{item.name}</span>
              
              {/* Delete button for files only */}
              {item.type === 'file' && onDeleteFile && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 ml-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(item);
                  }}
                  data-testid={`delete-file-${item.path.replace(/[\/\s]/g, '-')}`}
                  title="Delete file"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              
              {isModified && (
                <div className="status-indicator status-modified ml-auto" title="Modified" />
              )}
            </div>
            
            {/* Render nested folder contents */}
            {item.type === 'dir' && isExpanded && folderContents.has(item.path) && (
              <FileTree
                items={folderContents.get(item.path) || []}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onItemClick={onItemClick}
                onToggleExpanded={onToggleExpanded}
                onDeleteFile={onDeleteFile}
                modifiedFiles={modifiedFiles}
                folderContents={folderContents}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
