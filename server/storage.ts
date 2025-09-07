import { Repository, FileEntity, InsertRepository, InsertFile } from "@shared/schema";

// Storage interface for abstracting data persistence
export interface IStorage {
  // Repository operations
  createRepository(data: InsertRepository): Promise<Repository>;
  getRepositories(): Promise<Repository[]>;
  getRepository(id: number): Promise<Repository | null>;
  updateRepository(id: number, data: Partial<InsertRepository>): Promise<Repository | null>;
  deleteRepository(id: number): Promise<boolean>;

  // File operations
  createFile(data: InsertFile): Promise<FileEntity>;
  getFiles(repositoryId: string): Promise<FileEntity[]>;
  getFile(id: number): Promise<FileEntity | null>;
  getFileByPath(repositoryId: string, path: string): Promise<FileEntity | null>;
  updateFile(id: number, data: Partial<InsertFile>): Promise<FileEntity | null>;
  deleteFile(id: number): Promise<boolean>;
}

// In-memory storage implementation for development
export class MemStorage implements IStorage {
  private repositories: Map<number, Repository> = new Map();
  private files: Map<number, FileEntity> = new Map();
  private repositoryIdCounter = 1;
  private fileIdCounter = 1;

  // Repository methods
  async createRepository(data: InsertRepository): Promise<Repository> {
    const repository: Repository = {
      id: this.repositoryIdCounter++,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.repositories.set(repository.id, repository);
    return repository;
  }

  async getRepositories(): Promise<Repository[]> {
    return Array.from(this.repositories.values());
  }

  async getRepository(id: number): Promise<Repository | null> {
    return this.repositories.get(id) || null;
  }

  async updateRepository(id: number, data: Partial<InsertRepository>): Promise<Repository | null> {
    const existing = this.repositories.get(id);
    if (!existing) return null;

    const updated: Repository = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.repositories.set(id, updated);
    return updated;
  }

  async deleteRepository(id: number): Promise<boolean> {
    return this.repositories.delete(id);
  }

  // File methods
  async createFile(data: InsertFile): Promise<FileEntity> {
    const file: FileEntity = {
      id: this.fileIdCounter++,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.files.set(file.id, file);
    return file;
  }

  async getFiles(repositoryId: string): Promise<FileEntity[]> {
    return Array.from(this.files.values()).filter(
      file => file.repositoryId === repositoryId
    );
  }

  async getFile(id: number): Promise<FileEntity | null> {
    return this.files.get(id) || null;
  }

  async getFileByPath(repositoryId: string, path: string): Promise<FileEntity | null> {
    return Array.from(this.files.values()).find(
      file => file.repositoryId === repositoryId && file.path === path
    ) || null;
  }

  async updateFile(id: number, data: Partial<InsertFile>): Promise<FileEntity | null> {
    const existing = this.files.get(id);
    if (!existing) return null;

    const updated: FileEntity = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.files.set(id, updated);
    return updated;
  }

  async deleteFile(id: number): Promise<boolean> {
    return this.files.delete(id);
  }
}

// Export a singleton instance for the application
export const storage = new MemStorage();