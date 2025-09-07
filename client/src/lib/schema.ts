import { z } from "zod";

export const repositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: z.object({
    login: z.string(),
    avatar_url: z.string(),
  }),
  private: z.boolean(),
  html_url: z.string(),
  description: z.string().nullable(),
  default_branch: z.string(),
  updated_at: z.string(),
});

export const fileTreeItemSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(['file', 'dir']),
  size: z.number().optional(),
  sha: z.string(),
  url: z.string(),
  html_url: z.string(),
  download_url: z.string().nullable(),
});

export const fileContentSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  size: z.number(),
  url: z.string(),
  html_url: z.string(),
  git_url: z.string(),
  download_url: z.string().nullable(),
  type: z.string(),
  content: z.string(),
  encoding: z.string(),
});

export const commitSchema = z.object({
  message: z.string().min(1, "Commit message is required"),
  branch: z.string().default("main"),
});

export const gitHubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  avatar_url: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

export type Repository = z.infer<typeof repositorySchema>;
export type FileTreeItem = z.infer<typeof fileTreeItemSchema>;
export type FileContent = z.infer<typeof fileContentSchema>;
export type CommitData = z.infer<typeof commitSchema>;
export type GitHubUser = z.infer<typeof gitHubUserSchema>;

export interface ModifiedFile {
  path: string;
  content: string;
  sha?: string;
  status: 'modified' | 'new' | 'deleted';
}

export interface TabItem {
  path: string;
  name: string;
  content: string;
  isModified: boolean;
  language: string;
  sha?: string;
}