import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ModifiedFile } from '@/lib/schema';

interface CommitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (message: string) => Promise<void>;
  modifiedFiles: ModifiedFile[];
  isLoading?: boolean;
}

export function CommitDialog({ 
  isOpen, 
  onClose, 
  onCommit, 
  modifiedFiles, 
  isLoading = false 
}: CommitDialogProps) {
  const [commitMessage, setCommitMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    
    try {
      await onCommit(commitMessage);
      setCommitMessage('');
      onClose();
    } catch (error) {
      console.error('Commit failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'modified':
        return 'status-modified';
      case 'new':
        return 'status-new';
      case 'deleted':
        return 'status-deleted';
      default:
        return 'status-modified';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'modified':
        return 'M';
      case 'new':
        return 'A';
      case 'deleted':
        return 'D';
      default:
        return 'M';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="commit-dialog">
        <DialogHeader>
          <DialogTitle>Commit Changes</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="commit-message">Commit Message</Label>
            <Textarea
              id="commit-message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Describe your changes..."
              className="mt-1 resize-none"
              rows={3}
              required
              data-testid="commit-message-input"
            />
          </div>

          <div>
            <Label>Changed Files ({modifiedFiles.length})</Label>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto bg-muted rounded-md p-2">
              {modifiedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center text-sm"
                  data-testid={`changed-file-${index}`}
                >
                  <div className={`status-indicator ${getStatusColor(file.status)}`} />
                  <span className="text-xs font-mono mr-2 text-muted-foreground">
                    {getStatusLabel(file.status)}
                  </span>
                  <span className="truncate">{file.path}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose}
              disabled={isLoading}
              data-testid="cancel-commit"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!commitMessage.trim() || isLoading}
              data-testid="confirm-commit"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Commit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
