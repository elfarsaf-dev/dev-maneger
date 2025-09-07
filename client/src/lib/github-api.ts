import type { Repository, FileTreeItem, FileContent, CommitData, GitHubUser, ModifiedFile } from "@/lib/schema";

class GitHubAPI {
  private token: string;
  private baseURL = 'https://api.github.com';

  constructor() {
    this.token = '';
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, requireAuth: boolean = false): Promise<T> {
    if (requireAuth && !this.token) {
      throw new Error('GitHub token not set. Please authenticate first.');
    }
    
    const url = `${this.baseURL}${endpoint}`;
    console.log(`Making GitHub API request: ${options.method || 'GET'} ${url}`);
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Add authorization header only if token is available
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      
      const errorMessage = `GitHub API Error: ${response.status} ${errorData.message || response.statusText}`;
      console.error('GitHub API request failed:', {
        url,
        method: options.method || 'GET',
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getUser(): Promise<GitHubUser> {
    return this.request<GitHubUser>('/user');
  }

  async getRepositories(): Promise<Repository[]> {
    return this.request<Repository[]>('/user/repos?sort=updated&per_page=100');
  }

  async getUserRepositories(username: string): Promise<Repository[]> {
    return this.request<Repository[]>(`/users/${username}/repos?sort=updated&per_page=100`);
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    return this.request<Repository>(`/repos/${owner}/${repo}`);
  }

  async getContents(owner: string, repo: string, path: string = '', ref?: string): Promise<FileTreeItem[]> {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`;
    const response = await this.request<FileTreeItem | FileTreeItem[]>(endpoint);
    return Array.isArray(response) ? response : [response];
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<FileContent> {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`;
    const response = await this.request<FileContent>(endpoint);
    
    if (response.content) {
      // Decode base64 content
      response.content = atob(response.content.replace(/\n/g, ''));
    }
    
    return response;
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
    branch?: string
  ): Promise<any> {
    try {
      const body: any = {
        message,
        content: btoa(unescape(encodeURIComponent(content))), // Handle UTF-8 content properly
      };

      if (sha) {
        body.sha = sha;
      }

      if (branch) {
        body.branch = branch;
      }

      return this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error(`Failed to create/update file ${path}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to commit file "${path}": ${errorMessage}`);
    }
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch?: string
  ): Promise<any> {
    try {
      const body: any = {
        message,
        sha,
      };

      if (branch) {
        body.branch = branch;
      }

      return this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
        method: 'DELETE',
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error(`Failed to delete file ${path}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete file "${path}": ${errorMessage}`);
    }
  }

  async createBranch(owner: string, repo: string, branchName: string, fromBranch: string = 'main'): Promise<any> {
    // Get the SHA of the from branch
    const refResponse = await this.request<{ object: { sha: string } }>(`/repos/${owner}/${repo}/git/refs/heads/${fromBranch}`);
    
    // Create new branch
    return this.request(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: refResponse.object.sha,
      }),
    });
  }

  async commitMultipleFiles(
    owner: string,
    repo: string,
    files: ModifiedFile[],
    commitMessage: string,
    branch: string = 'main'
  ): Promise<any> {
    try {
      console.log(`Committing ${files.length} files to ${owner}/${repo} on branch ${branch}`);
      
      // For simplicity, we'll commit files one by one
      // In a production app, you might want to use the Git Data API for atomic commits
      const results = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}: ${file.path} (${file.status})`);
        
        try {
          if (file.status === 'deleted') {
            if (file.sha) {
              const result = await this.deleteFile(owner, repo, file.path, commitMessage, file.sha, branch);
              results.push(result);
            } else {
              console.warn(`Skipping deletion of ${file.path} - no SHA provided`);
            }
          } else {
            const result = await this.createOrUpdateFile(
              owner, 
              repo, 
              file.path, 
              file.content, 
              commitMessage, 
              file.sha, 
              branch
            );
            results.push(result);
          }
          console.log(`Successfully processed ${file.path}`);
        } catch (fileError) {
          const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
          console.error(`Failed to process file ${file.path}:`, fileError);
          throw new Error(`Failed to commit file "${file.path}": ${errorMessage}`);
        }
      }
      
      console.log(`Successfully committed all ${files.length} files`);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error committing files:', error);
      throw new Error(`Commit failed: ${errorMessage}`);
    }
  }

  async createRepository(data: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
  }): Promise<Repository> {
    return this.request<Repository>('/user/repos', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }

  async getRepositoryPages(owner: string, repo: string): Promise<any> {
    try {
      return await this.request(`/repos/${owner}/${repo}/pages`);
    } catch (error) {
      // GitHub returns 404 if Pages is not enabled
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async enableGitHubPages(
    owner: string,
    repo: string,
    options: {
      source: {
        branch: string;
        path?: string;
      };
    }
  ): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/pages`, {
      method: 'POST',
      body: JSON.stringify(options),
    }, true);
  }

  async updateGitHubPages(
    owner: string,
    repo: string,
    options: {
      source: {
        branch: string;
        path?: string;
      };
    }
  ): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/pages`, {
      method: 'PUT',
      body: JSON.stringify(options),
    }, true);
  }

  async disableGitHubPages(owner: string, repo: string): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/pages`, {
      method: 'DELETE',
    }, true);
  }

  async getBranches(owner: string, repo: string): Promise<Array<{ name: string; commit: { sha: string } }>> {
    return this.request<Array<{ name: string; commit: { sha: string } }>>(`/repos/${owner}/${repo}/branches`);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const githubAPI = new GitHubAPI();
