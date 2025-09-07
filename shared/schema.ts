import { pgTable, serial, text, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Repository table for storing GitHub repository metadata
export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  description: text("description"),
  private: text("private").notNull(),
  htmlUrl: text("html_url").notNull(),
  defaultBranch: text("default_branch").notNull().default("main"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Files table for caching file content and metadata
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  repositoryId: text("repository_id").notNull(),
  path: text("path").notNull(),
  content: text("content"),
  sha: text("sha"),
  size: text("size"),
  type: text("type").notNull(), // 'file' or 'dir'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export insert schemas for validation
export const insertRepositorySchema = createInsertSchema(repositories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export select schemas for consistency
export const selectRepositorySchema = createSelectSchema(repositories);
export const selectFileSchema = createSelectSchema(files);

// Export types for use in frontend and backend
export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type FileEntity = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

// GitHub API response types
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface CommitFileChange {
  path: string;
  content: string;
  previousSha?: string;
}