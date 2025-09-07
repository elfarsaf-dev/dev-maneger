import { Router } from "express";
import { storage } from "./storage";
import { insertRepositorySchema, insertFileSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Repository routes
router.get("/repositories", async (req, res) => {
  try {
    const repositories = await storage.getRepositories();
    res.json(repositories);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

router.post("/repositories", async (req, res) => {
  try {
    const validationResult = insertRepositorySchema.safeParse(req.body);
    if (!validationResult.success) {
      const error = fromZodError(validationResult.error);
      return res.status(400).json({ error: error.message });
    }

    const repository = await storage.createRepository(validationResult.data);
    res.status(201).json(repository);
  } catch (error) {
    console.error("Error creating repository:", error);
    res.status(500).json({ error: "Failed to create repository" });
  }
});

router.get("/repositories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }

    const repository = await storage.getRepository(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    res.json(repository);
  } catch (error) {
    console.error("Error fetching repository:", error);
    res.status(500).json({ error: "Failed to fetch repository" });
  }
});

// File routes
router.get("/repositories/:repoId/files", async (req, res) => {
  try {
    const repositoryId = req.params.repoId;
    const files = await storage.getFiles(repositoryId);
    res.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

router.post("/repositories/:repoId/files", async (req, res) => {
  try {
    const repositoryId = req.params.repoId;
    const fileData = { ...req.body, repositoryId };
    
    const validationResult = insertFileSchema.safeParse(fileData);
    if (!validationResult.success) {
      const error = fromZodError(validationResult.error);
      return res.status(400).json({ error: error.message });
    }

    const file = await storage.createFile(validationResult.data);
    res.status(201).json(file);
  } catch (error) {
    console.error("Error creating file:", error);
    res.status(500).json({ error: "Failed to create file" });
  }
});

router.get("/files/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid file ID" });
    }

    const file = await storage.getFile(id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json(file);
  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

export function registerRoutes(app: any) {
  app.use("/api", router);
}