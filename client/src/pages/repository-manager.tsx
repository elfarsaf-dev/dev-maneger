import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Github, 
  RefreshCw, 
  Save, 
  Settings, 
  Plus, 
  FolderPlus, 
  Upload,
  Clock,
  Search,
  GitBranch,
  Replace,
  FileText,
  Monitor,
  Menu,
  X,
  ChevronLeft,
  Eye,
  Edit,
  Globe,
  Building,
  Info,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { githubAPI } from '@/lib/github-api';
import { FileTree } from '@/components/file-tree';
import { MonacoEditor } from '@/components/monaco-editor';
import { ImageViewer } from '@/components/image-viewer';
import { MarkdownViewer } from '@/components/markdown-viewer';
import { CommitDialog } from '@/components/commit-dialog';
import { UploadZone } from '@/components/upload-zone';
import type { Repository, FileTreeItem, FileContent, TabItem, ModifiedFile } from '@/lib/schema';
import { cn } from '@/lib/utils';

export default function RepositoryManager() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [modifiedFiles, setModifiedFiles] = useState<Map<string, ModifiedFile>>(new Map());
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [username, setUsername] = useState('elfarsaf-dev');
  const [usernameInput, setUsernameInput] = useState('elfarsaf-dev');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMarkdownPreview, setIsMarkdownPreview] = useState(false);
  const [showCreateRepoDialog, setShowCreateRepoDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [isRepoPrivate, setIsRepoPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileTreeItem | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for authentication on component mount
  useEffect(() => {
    console.log('Token available:', !!githubToken);
    console.log('GitHub authenticated:', githubAPI.isAuthenticated());
    
    if (githubToken && !githubAPI.isAuthenticated()) {
      console.log('Setting GitHub token...');
      githubAPI.setToken(githubToken);
    }
  }, [githubToken]);

  // Fetch repositories by username
  const { data: repositories, isLoading: reposLoading, refetch: refetchRepos, error: reposError } = useQuery({
    queryKey: ['repositories', username],
    queryFn: async () => {
      console.log(`Fetching repositories for user: ${username}`);
      try {
        const repos = await githubAPI.getUserRepositories(username);
        console.log('Repositories fetched:', repos.length);
        return repos;
      } catch (error) {
        console.error('Error fetching repositories:', error);
        toast({
          title: 'GitHub API Error',
          description: `Failed to fetch repositories for ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive',
        });
        throw error;
      }
    },
    enabled: !!username,
  });

  // Auto-select bos-villa-tw repository
  useEffect(() => {
    if (repositories && !selectedRepo) {
      const defaultRepo = repositories.find(r => r.full_name === 'safelfar717/web');
      if (defaultRepo) {
        setSelectedRepo(defaultRepo);
      }
    }
  }, [repositories, selectedRepo]);

  // Track folder contents for expanded directories
  const [folderContents, setFolderContents] = useState<Map<string, FileTreeItem[]>>(new Map());

  // Fetch file tree for selected repository
  const { data: fileTree, isLoading: treeLoading } = useQuery({
    queryKey: ['fileTree', selectedRepo?.owner.login, selectedRepo?.name, currentPath],
    queryFn: () => {
      if (!selectedRepo) return [];
      return githubAPI.getContents(selectedRepo.owner.login, selectedRepo.name, currentPath);
    },
    enabled: !!selectedRepo,
  });

  // Fetch GitHub Pages settings for selected repository
  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['pages', selectedRepo?.owner?.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo || !githubToken) return null;
      return githubAPI.getRepositoryPages(selectedRepo.owner.login, selectedRepo.name);
    },
    enabled: !!(selectedRepo && githubToken),
    staleTime: 30000,
  });

  // Fetch branches for GitHub Pages configuration
  const { data: branches } = useQuery({
    queryKey: ['branches', selectedRepo?.owner?.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      return githubAPI.getBranches(selectedRepo.owner.login, selectedRepo.name);
    },
    enabled: !!selectedRepo,
    staleTime: 60000,
  });

  // Function to load folder contents
  const loadFolderContents = async (folderPath: string) => {
    if (!selectedRepo || folderContents.has(folderPath)) return;
    
    try {
      const contents = await githubAPI.getContents(
        selectedRepo.owner.login, 
        selectedRepo.name, 
        folderPath
      );
      setFolderContents(prev => new Map(prev).set(folderPath, contents));
    } catch (error) {
      console.error('Error loading folder contents:', error);
      toast({
        title: 'Error',
        description: `Failed to load folder contents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  // Commit mutation
  const commitMutation = useMutation({
    mutationFn: async (commitMessage: string) => {
      if (!selectedRepo) throw new Error('No repository selected');
      
      const filesToCommit = Array.from(modifiedFiles.values());
      return githubAPI.commitMultipleFiles(
        selectedRepo.owner.login,
        selectedRepo.name,
        filesToCommit,
        commitMessage
      );
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Changes committed successfully!',
      });
      setModifiedFiles(new Map());
      // Update all file tree related queries
      queryClient.invalidateQueries({ queryKey: ['fileTree'] });
      queryClient.invalidateQueries({ queryKey: ['folderContents'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to commit changes: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleRepoChange = (repoFullName: string) => {
    const repo = repositories?.find(r => r.full_name === repoFullName);
    if (repo) {
      setSelectedRepo(repo);
      setCurrentPath('');
      setOpenTabs([]);
      setActiveTab('');
      setModifiedFiles(new Map());
      setExpandedPaths(new Set());
    }
  };

  const isImageFile = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(extension || '');
  };

  const isMarkdownFile = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension === 'md';
  };

  const handleFileClick = async (item: FileTreeItem) => {
    if (item.type === 'dir') {
      const isExpanded = expandedPaths.has(item.path);
      const newExpanded = new Set(expandedPaths);
      
      if (isExpanded) {
        newExpanded.delete(item.path);
      } else {
        newExpanded.add(item.path);
        // Load folder contents when expanding
        await loadFolderContents(item.path);
      }
      setExpandedPaths(newExpanded);
    } else {
      // Open file
      try {
        if (!selectedRepo) return;
        
        const existingTab = openTabs.find(tab => tab.path === item.path);
        if (!existingTab) {
          let content = '';
          let isImage = false;
          
          let sha: string | undefined;
          
          if (isImageFile(item.name)) {
            // For images, use the download URL directly
            content = item.download_url || '';
            isImage = true;
            sha = item.sha; // Use SHA from the file tree item
          } else {
            // For text files, fetch and decode content
            const fileContent = await githubAPI.getFileContent(
              selectedRepo.owner.login,
              selectedRepo.name,
              item.path
            );
            content = fileContent.content;
            sha = fileContent.sha; // Use SHA from the file content
          }
          
          const language = getLanguageFromFileName(item.name);
          const newTab: TabItem = {
            path: item.path,
            name: item.name,
            content,
            isModified: false,
            language: isImage ? 'image' : language,
            sha,
          };
          
          setOpenTabs(prev => [...prev, newTab]);
        }
        setActiveTab(item.path);
        // Reset markdown preview when switching to a new file
        setIsMarkdownPreview(false);
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleToggleExpanded = async (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      // Load folder contents when expanding
      await loadFolderContents(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleEditorChange = (value: string) => {
    const currentTab = openTabs.find(tab => tab.path === activeTab);
    if (!currentTab) return;

    // Update tab content
    setOpenTabs(prev => prev.map(tab => 
      tab.path === activeTab 
        ? { ...tab, content: value, isModified: true }
        : tab
    ));

    // Track modified file with SHA from the original tab
    const modifiedFile: ModifiedFile = {
      path: currentTab.path,
      content: value,
      sha: currentTab.sha, // Include the original SHA for existing files
      status: currentTab.sha ? 'modified' : 'new', // If no SHA, it's a new file
    };

    setModifiedFiles(prev => new Map(prev.set(currentTab.path, modifiedFile)));
  };

  const handleCloseTab = (path: string) => {
    setOpenTabs(prev => prev.filter(tab => tab.path !== path));
    if (activeTab === path) {
      const remainingTabs = openTabs.filter(tab => tab.path !== path);
      setActiveTab(remainingTabs.length > 0 ? remainingTabs[0].path : '');
      setIsMarkdownPreview(false);
    }
  };

  const toggleMarkdownPreview = () => {
    setIsMarkdownPreview(prev => !prev);
  };

  const handleSaveFile = async () => {
    const currentTab = openTabs.find(tab => tab.path === activeTab);
    if (!currentTab || !selectedRepo) return;

    try {
      await githubAPI.createOrUpdateFile(
        selectedRepo.owner.login,
        selectedRepo.name,
        currentTab.path,
        currentTab.content,
        `Update ${currentTab.name}`,
        undefined, // SHA will be fetched automatically
        selectedRepo.default_branch
      );

      // Mark as saved
      setOpenTabs(prev => prev.map(tab => 
        tab.path === activeTab 
          ? { ...tab, isModified: false }
          : tab
      ));

      // Remove from modified files
      const newModifiedFiles = new Map(modifiedFiles);
      newModifiedFiles.delete(currentTab.path);
      setModifiedFiles(newModifiedFiles);

      toast({
        title: 'Success',
        description: 'File saved successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleFilesUpload = async (files: File[]) => {
    if (!selectedRepo) return;

    try {
      for (const file of files) {
        const content = await file.text();
        const path = `${currentPath ? `${currentPath}/` : ''}${file.name}`;
        
        await githubAPI.createOrUpdateFile(
          selectedRepo.owner.login,
          selectedRepo.name,
          path,
          content,
          `Upload ${file.name}`,
          undefined,
          selectedRepo.default_branch
        );
      }

      toast({
        title: 'Success',
        description: `${files.length} file(s) uploaded successfully!`,
      });

      // Refresh all file tree related queries with comprehensive invalidation  
      queryClient.invalidateQueries({ queryKey: ['fileTree'] });
      queryClient.invalidateQueries({ queryKey: ['folderContents'] });
      // Force refetch the current path specifically
      if (selectedRepo) {
        queryClient.invalidateQueries({ 
          queryKey: ['fileTree', selectedRepo.owner.login, selectedRepo.name, currentPath] 
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleCreateFile = async () => {
    if (!selectedRepo || !newFileName.trim()) return;

    try {
      const filePath = currentPath ? `${currentPath}/${newFileName}` : newFileName;
      await githubAPI.createOrUpdateFile(
        selectedRepo.owner.login,
        selectedRepo.name,
        filePath,
        '// New file\n',
        `Create ${newFileName}`,
        undefined,
        selectedRepo.default_branch
      );

      toast({
        title: 'Success',
        description: `File ${newFileName} created successfully!`,
      });

      // Refresh all file tree related queries with comprehensive invalidation  
      queryClient.invalidateQueries({ queryKey: ['fileTree'] });
      queryClient.invalidateQueries({ queryKey: ['folderContents'] });
      // Force refetch the current path specifically
      if (selectedRepo) {
        queryClient.invalidateQueries({ 
          queryKey: ['fileTree', selectedRepo.owner.login, selectedRepo.name, currentPath] 
        });
      }
      setShowNewFileDialog(false);
      setNewFileName('');
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleCreateFolder = async () => {
    if (!selectedRepo || !newFolderName.trim()) return;

    try {
      const folderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
      // Create a placeholder README.md file inside the folder (GitHub doesn't support empty folders)
      await githubAPI.createOrUpdateFile(
        selectedRepo.owner.login,
        selectedRepo.name,
        `${folderPath}/README.md`,
        `# ${newFolderName}\n\nThis folder was created by Code Studio.`,
        `Create folder ${newFolderName}`,
        undefined,
        selectedRepo.default_branch
      );

      toast({
        title: 'Success', 
        description: `Folder ${newFolderName} created successfully!`,
      });

      // Refresh all file tree related queries with comprehensive invalidation  
      queryClient.invalidateQueries({ queryKey: ['fileTree'] });
      queryClient.invalidateQueries({ queryKey: ['folderContents'] });
      // Force refetch the current path specifically
      if (selectedRepo) {
        queryClient.invalidateQueries({ 
          queryKey: ['fileTree', selectedRepo.owner.login, selectedRepo.name, currentPath] 
        });
      }
      setShowNewFolderDialog(false);
      setNewFolderName('');
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js': return 'javascript';
      case 'jsx': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'py': return 'python';
      case 'java': return 'java';
      case 'cpp': case 'c': return 'cpp';
      case 'php': return 'php';
      case 'rb': return 'ruby';
      case 'go': return 'go';
      case 'rs': return 'rust';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'scss': return 'scss';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'xml': return 'xml';
      case 'yaml': case 'yml': return 'yaml';
      case 'sql': return 'sql';
      default: return 'plaintext';
    }
  };

  const handleTokenSubmit = () => {
    if (tokenInput.trim()) {
      setGithubToken(tokenInput.trim());
      githubAPI.setToken(tokenInput.trim());
      toast({
        title: 'Success',
        description: 'GitHub token berhasil diatur!',
      });
    }
  };

  const handleUsernameSubmit = () => {
    if (usernameInput.trim()) {
      setUsername(usernameInput.trim());
      setSelectedRepo(null); // Clear selected repo when changing username
    }
  };

  const handleCreateRepository = async () => {
    if (!newRepoName.trim() || !githubToken) return;
    
    try {
      const newRepo = await githubAPI.createRepository({
        name: newRepoName.trim(),
        description: newRepoDescription.trim() || undefined,
        private: isRepoPrivate,
        auto_init: autoInit,
      });

      toast({
        title: 'Success',
        description: `Repository ${newRepoName} created successfully!`,
      });

      // Refresh repositories and select the new one
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      setSelectedRepo(newRepo);
      
      // Close dialog and reset form
      setShowCreateRepoDialog(false);
      setNewRepoName('');
      setNewRepoDescription('');
      setIsRepoPrivate(false);
      setAutoInit(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to create repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleToggleGitHubPages = async (enabled: boolean, branch: string = 'main') => {
    if (!selectedRepo || !githubToken) return;
    
    try {
      if (enabled) {
        await githubAPI.enableGitHubPages(selectedRepo.owner.login, selectedRepo.name, {
          source: { branch }
        });
        toast({
          title: 'Success',
          description: 'GitHub Pages enabled successfully!',
        });
      } else {
        await githubAPI.disableGitHubPages(selectedRepo.owner.login, selectedRepo.name);
        toast({
          title: 'Success', 
          description: 'GitHub Pages disabled successfully!',
        });
      }
      
      // Refresh pages data
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${enabled ? 'enable' : 'disable'} GitHub Pages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteFile = (file: FileTreeItem) => {
    setFileToDelete(file);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRepo || !fileToDelete || !githubToken) return;

    try {
      await githubAPI.deleteFile(
        selectedRepo.owner.login,
        selectedRepo.name,
        fileToDelete.path,
        `Delete ${fileToDelete.name}`,
        fileToDelete.sha,
        selectedRepo.default_branch
      );

      toast({
        title: 'Success',
        description: `File ${fileToDelete.name} deleted successfully!`,
      });

      // Close any open tab for this file
      setOpenTabs(prev => prev.filter(tab => tab.path !== fileToDelete.path));
      if (activeTab === fileToDelete.path) {
        setActiveTab('');
      }
      
      // Remove from modified files if it was modified
      setModifiedFiles(prev => {
        const updated = new Map(prev);
        updated.delete(fileToDelete.path);
        return updated;
      });

      // Refresh all file tree related queries
      queryClient.invalidateQueries({ queryKey: ['fileTree'] });
      queryClient.invalidateQueries({ queryKey: ['folderContents'] });
      if (selectedRepo) {
        queryClient.invalidateQueries({ 
          queryKey: ['fileTree', selectedRepo.owner.login, selectedRepo.name, currentPath] 
        });
      }

      // Close dialog and reset
      setShowDeleteDialog(false);
      setFileToDelete(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const currentTab = openTabs.find(tab => tab.path === activeTab);
  const hasModifiedFiles = modifiedFiles.size > 0;


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 w-8 p-0"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isMobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <FileText className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
            </div>
            <h1 className="text-lg lg:text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ELFAR-CODE
            </h1>
          </div>
          
          <div className="flex items-center space-x-1 lg:space-x-2">
            {/* Username Input */}
            <div className="flex items-center space-x-1">
              <Input
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="GitHub username"
                className="w-24 sm:w-32 lg:w-40 h-8 text-xs lg:text-sm"
                data-testid="username-input"
                onKeyDown={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                onBlur={handleUsernameSubmit}
              />
            </div>
            
            <Select 
              value={selectedRepo?.full_name || ''} 
              onValueChange={handleRepoChange}
              disabled={reposLoading}
            >
              <SelectTrigger className="w-32 sm:w-48 lg:w-64 text-xs lg:text-sm" data-testid="repository-select">
                <SelectValue placeholder={
                  reposLoading ? "Loading..." : 
                  reposError ? "Error" :
                  repositories?.length === 0 ? "No repos" :
                  "Select..."
                } />
              </SelectTrigger>
              <SelectContent>
                {repositories?.map((repo) => (
                  <SelectItem key={repo.id} value={repo.full_name}>
                    {repo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => refetchRepos()}
              disabled={reposLoading}
              data-testid="refresh-repos"
              className="hidden sm:flex"
            >
              <RefreshCw className={cn("h-4 w-4 lg:mr-1", reposLoading && "animate-spin")} />
              <span className="hidden lg:inline">Refresh</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => refetchRepos()}
              disabled={reposLoading}
              data-testid="refresh-repos-mobile"
              className="sm:hidden h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", reposLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* GitHub Token Input */}
          {!githubAPI.isAuthenticated() && (
            <div className="flex items-center space-x-2">
              <Input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="GitHub Token (ghp_...)"
                className="w-40 h-8 text-xs"
                data-testid="token-input"
                onKeyDown={(e) => e.key === 'Enter' && handleTokenSubmit()}
              />
              <Button 
                size="sm"
                onClick={handleTokenSubmit}
                disabled={!tokenInput.trim()}
                data-testid="submit-token"
                className="h-8"
              >
                Login
              </Button>
            </div>
          )}
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-muted-foreground">Online</span>
          </div>
          
          <Button 
            size="sm"
            onClick={() => setIsCommitDialogOpen(true)}
            disabled={!hasModifiedFiles}
            data-testid="commit-changes"
          >
            <Save className="h-4 w-4 mr-1" />
            Commit Changes
            {hasModifiedFiles && (
              <Badge variant="secondary" className="ml-1">
                {modifiedFiles.size}
              </Badge>
            )}
          </Button>
          
          {/* New Repository Button */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowCreateRepoDialog(true)}
            disabled={!githubToken}
            title={!githubToken ? "GitHub token required" : "Create new repository"}
            data-testid="new-repository"
          >
            <Building className="h-4 w-4" />
          </Button>
          
          {/* Settings Button */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowSettingsDialog(true)}
            disabled={!selectedRepo || !githubToken}
            title={!selectedRepo || !githubToken ? "Select repository and authenticate" : "Repository settings"}
            data-testid="settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)] relative">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
            onClick={() => setIsMobileSidebarOpen(false)}
            data-testid="mobile-sidebar-overlay"
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "w-80 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out z-50",
          "lg:relative lg:translate-x-0",
          isMobileSidebarOpen 
            ? "fixed translate-x-0 h-full" 
            : "fixed -translate-x-full lg:translate-x-0 h-[calc(100vh-73px)]"
        )}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Files
              </h2>
              <div className="flex space-x-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 lg:h-7 lg:w-7 p-0 touch-manipulation" 
                  onClick={() => setShowNewFileDialog(true)}
                  data-testid="new-file"
                  title="New File"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 lg:h-7 lg:w-7 p-0 touch-manipulation" 
                  onClick={() => setShowNewFolderDialog(true)}
                  data-testid="new-folder"
                  title="New Folder"
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 lg:h-7 lg:w-7 p-0 touch-manipulation" 
                  data-testid="upload-files"
                  title="Upload Files"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center text-sm text-muted-foreground">
              <button 
                className="hover:text-foreground transition-colors"
                onClick={() => setCurrentPath('')}
                data-testid="breadcrumb-root"
              >
                root
              </button>
              {currentPath.split('/').filter(Boolean).map((segment, index, array) => (
                <span key={index} className="flex items-center">
                  <span className="breadcrumb-separator" />
                  <button 
                    className="hover:text-foreground transition-colors"
                    onClick={() => setCurrentPath(array.slice(0, index + 1).join('/'))}
                    data-testid={`breadcrumb-${segment}`}
                  >
                    {segment}
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-y-auto">
            {treeLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading files...
              </div>
            ) : fileTree ? (
              <FileTree
                items={fileTree}
                selectedPath={activeTab}
                expandedPaths={expandedPaths}
                onItemClick={handleFileClick}
                onToggleExpanded={handleToggleExpanded}
                onDeleteFile={handleDeleteFile}
                modifiedFiles={new Set(modifiedFiles.keys())}
                folderContents={folderContents}
              />
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                {selectedRepo ? 'No files found' : 'Select a repository to view files'}
              </div>
            )}
          </div>

          {/* Upload Zone */}
          <div className="p-4 border-t border-border">
            <UploadZone onFilesUpload={handleFilesUpload} />
          </div>
        </aside>

        {/* Main Editor */}
        <main className="flex-1 flex flex-col lg:ml-0">
          {/* Editor Tabs */}
          <div className="bg-card border-b border-border flex items-center">
            <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {openTabs.map((tab) => (
                <div
                  key={tab.path}
                  className={cn(
                    "flex items-center px-3 lg:px-4 py-3 lg:py-2 text-sm border-r border-border cursor-pointer group hover:bg-muted transition-colors touch-manipulation min-w-[120px] lg:min-w-auto",
                    activeTab === tab.path && "tab-active bg-background border-b-2 border-primary"
                  )}
                  onClick={() => setActiveTab(tab.path)}
                  data-testid={`tab-${tab.path}`}
                >
                  <FileText className="h-4 w-4 mr-2 text-accent flex-shrink-0" />
                  <span className="truncate max-w-[80px] lg:max-w-none">{tab.name}</span>
                  {tab.isModified && (
                    <div className="status-indicator status-modified ml-2 flex-shrink-0" />
                  )}
                  {/* Markdown Preview Toggle Button */}
                  {isMarkdownFile(tab.name) && activeTab === tab.path && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2 h-6 w-6 lg:h-5 lg:w-5 p-0 touch-manipulation flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMarkdownPreview();
                      }}
                      data-testid={`toggle-markdown-preview-${tab.path}`}
                      title={isMarkdownPreview ? "Switch to Edit Mode" : "Switch to Preview Mode"}
                    >
                      {isMarkdownPreview ? (
                        <Edit className="h-3 w-3 text-primary" />
                      ) : (
                        <Eye className="h-3 w-3 text-primary" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-2 h-6 w-6 lg:h-5 lg:w-5 p-0 opacity-0 group-hover:opacity-100 touch-manipulation flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab.path);
                    }}
                    data-testid={`close-tab-${tab.path}`}
                  >
                    <span className="text-sm lg:text-xs">×</span>
                  </Button>
                </div>
              ))}
            </div>

            {currentTab && (
              <div className="ml-auto px-4 py-2 flex items-center space-x-2 text-xs text-muted-foreground">
                <span data-testid="cursor-position">
                  Line {cursorPosition.line}, Column {cursorPosition.column}
                </span>
                <span>UTF-8</span>
                <span>{currentTab.language.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Editor Content */}
          <div className="flex-1 relative">
            {currentTab ? (
              currentTab.language === 'image' ? (
                <ImageViewer
                  src={currentTab.content}
                  alt={currentTab.name}
                  fileName={currentTab.name}
                />
              ) : isMarkdownFile(currentTab.name) && isMarkdownPreview ? (
                <MarkdownViewer
                  content={currentTab.content}
                  fileName={currentTab.name}
                />
              ) : (
                <MonacoEditor
                  value={currentTab.content}
                  onChange={handleEditorChange}
                  language={currentTab.language}
                  onCursorPositionChange={(line, column) => setCursorPosition({ line, column })}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl mx-auto flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Welcome to Code Studio</h3>
                    <p className="text-sm">Select a file to start editing or viewing</p>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Save Button - Bigger on mobile */}
            {currentTab?.isModified && (
              <Button
                className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 h-14 w-14 lg:h-12 lg:w-12 rounded-full shadow-lg touch-manipulation"
                onClick={handleSaveFile}
                data-testid="save-file"
              >
                <Save className="h-5 w-5 lg:h-4 lg:w-4" />
              </Button>
            )}
          </div>
        </main>

        {/* Right Panel */}
        <aside className="w-64 bg-card border-l border-border hidden lg:flex flex-col">
          {/* File Properties */}
          {currentTab && (
            <div className="p-4 border-b border-border">
              <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-3">
                File Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span>{(currentTab.content.length / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{currentTab.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={currentTab.isModified ? "text-accent" : "text-muted-foreground"}>
                    {currentTab.isModified ? "Modified" : "Saved"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Changes */}
          <div className="p-4 border-b border-border">
            <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Recent Changes
            </h3>
            <div className="space-y-3">
              {Array.from(modifiedFiles.values()).map((file, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className={`status-indicator ${file.status === 'new' ? 'status-new' : 'status-modified'} mt-1.5`} />
                  <div className="text-sm">
                    <div className="font-medium">{file.path.split('/').pop()}</div>
                    <div className="text-muted-foreground text-xs">
                      {file.status === 'new' ? 'New file' : 'Modified'}
                    </div>
                  </div>
                </div>
              ))}
              {modifiedFiles.size === 0 && (
                <div className="text-xs text-muted-foreground">No recent changes</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4">
            <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start text-sm" data-testid="find-files">
                <Search className="h-4 w-4 mr-2" />
                Find in files
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sm" data-testid="find-replace">
                <Replace className="h-4 w-4 mr-2" />
                Find and replace
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sm" data-testid="create-branch">
                <GitBranch className="h-4 w-4 mr-2" />
                Create branch
              </Button>
            </div>
          </div>
        </aside>
      </div>


      {/* Commit Dialog */}
      <CommitDialog
        isOpen={isCommitDialogOpen}
        onClose={() => setIsCommitDialogOpen(false)}
        onCommit={(message) => commitMutation.mutateAsync(message)}
        modifiedFiles={Array.from(modifiedFiles.values())}
        isLoading={commitMutation.isPending}
      />

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="sm:max-w-md" data-testid="new-file-dialog">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter file name (e.g., index.js, style.css)"
              data-testid="new-file-name-input"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
            />
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => { setShowNewFileDialog(false); setNewFileName(''); }}
                data-testid="cancel-new-file"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateFile}
                disabled={!newFileName.trim()}
                data-testid="create-file"
              >
                Create File
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md" data-testid="new-folder-dialog">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name"
              data-testid="new-folder-name-input"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => { setShowNewFolderDialog(false); setNewFolderName(''); }}
                data-testid="cancel-new-folder"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                data-testid="create-folder"
              >
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Repository Dialog */}
      <Dialog open={showCreateRepoDialog} onOpenChange={setShowCreateRepoDialog}>
        <DialogContent className="sm:max-w-md" data-testid="create-repo-dialog">
          <DialogHeader>
            <DialogTitle>Create New Repository</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="repo-name">Repository Name</Label>
              <Input
                id="repo-name"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="my-awesome-repo"
                data-testid="repo-name-input"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRepository()}
              />
            </div>
            <div>
              <Label htmlFor="repo-description">Description (Optional)</Label>
              <Textarea
                id="repo-description"
                value={newRepoDescription}
                onChange={(e) => setNewRepoDescription(e.target.value)}
                placeholder="A short description of your repository"
                rows={3}
                data-testid="repo-description-input"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="repo-private"
                checked={isRepoPrivate}
                onCheckedChange={setIsRepoPrivate}
                data-testid="repo-private-switch"
              />
              <Label htmlFor="repo-private" className="text-sm">Private repository</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-init"
                checked={autoInit}
                onCheckedChange={setAutoInit}
                data-testid="auto-init-switch"
              />
              <Label htmlFor="auto-init" className="text-sm">Initialize with README</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => { 
                  setShowCreateRepoDialog(false); 
                  setNewRepoName(''); 
                  setNewRepoDescription(''); 
                  setIsRepoPrivate(false);
                  setAutoInit(true);
                }}
                data-testid="cancel-create-repo"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRepository}
                disabled={!newRepoName.trim()}
                data-testid="create-repo"
              >
                <Building className="h-4 w-4 mr-2" />
                Create Repository
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Repository Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-2xl" data-testid="settings-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Repository Settings
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="pages" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="pages" className="flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                GitHub Pages
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pages" className="space-y-4">
              {selectedRepo && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">GitHub Pages</h3>
                      <p className="text-sm text-muted-foreground">
                        Build and deploy your site from a GitHub repository
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{pagesData ? 'Enabled' : 'Disabled'}</span>
                      <Switch
                        checked={!!pagesData}
                        onCheckedChange={(enabled) => handleToggleGitHubPages(enabled)}
                        disabled={pagesLoading}
                        data-testid="pages-toggle"
                      />
                    </div>
                  </div>
                  
                  {pagesData && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <Label>Site URL</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <Input 
                                value={pagesData.html_url || ''} 
                                readOnly 
                                className="bg-muted"
                              />
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(pagesData.html_url, '_blank')}
                                data-testid="visit-site"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <Label>Source Branch</Label>
                            <div className="mt-1">
                              <Select 
                                value={pagesData.source?.branch || 'main'}
                                onValueChange={(branch) => handleToggleGitHubPages(true, branch)}
                              >
                                <SelectTrigger data-testid="branch-select">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {branches?.map((branch) => (
                                    <SelectItem key={branch.name} value={branch.name}>
                                      {branch.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-900 dark:text-blue-100">
                                GitHub Pages Configuration
                              </p>
                              <p className="text-blue-700 dark:text-blue-300 mt-1">
                                Your site is published from the <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">{pagesData.source?.branch || 'main'}</code> branch.
                                Changes to this branch will automatically trigger a new deployment.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!pagesData && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center space-y-3">
                          <Globe className="h-12 w-12 text-muted-foreground mx-auto" />
                          <div>
                            <h3 className="font-medium">GitHub Pages is disabled</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Enable GitHub Pages to publish your site directly from this repository.
                            </p>
                          </div>
                          <Button 
                            onClick={() => handleToggleGitHubPages(true)}
                            disabled={pagesLoading}
                            data-testid="enable-pages"
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            Enable GitHub Pages
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete File Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md" data-testid="delete-file-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <Trash2 className="h-5 w-5 mr-2" />
              Delete File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-medium">{fileToDelete?.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => { setShowDeleteDialog(false); setFileToDelete(null); }}
                data-testid="cancel-delete"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleConfirmDelete}
                data-testid="confirm-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete File
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
