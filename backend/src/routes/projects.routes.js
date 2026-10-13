import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getUserProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addDocumentToProject,
  removeDocumentFromProject,
} from '../services/projectService.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/projects - List all projects
router.get('/', async (req, res) => {
  try {
    const projects = await getUserProjects(req.user.id);
    return res.json({ success: true, projects });
  } catch (error) {
    logger.error('PROJECTS_API', 'Failed to list projects', { error: error.message });
    return res.status(500).json({ error: 'Failed to list projects' });
  }
});

// POST /api/projects - Create project
router.post('/', async (req, res) => {
  try {
    const { name, description, customInstructions, color, icon } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await createProject({
      userId: req.user.id,
      name: name.trim(),
      description,
      customInstructions,
      color,
      icon,
    });

    return res.json({ success: true, project });
  } catch (error) {
    logger.error('PROJECTS_API', 'Failed to create project', { error: error.message });
    return res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id - Get project with docs & chats
router.get('/:id', async (req, res) => {
  try {
    const project = await getProjectById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    return res.json({ success: true, project });
  } catch (error) {
    logger.error('PROJECTS_API', 'Failed to fetch project', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const { name, description, customInstructions, color, icon } = req.body;
    const project = await updateProject({
      projectId: req.params.id,
      userId: req.user.id,
      name,
      description,
      customInstructions,
      color,
      icon,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    return res.json({ success: true, project });
  } catch (error) {
    logger.error('PROJECTS_API', 'Failed to update project', { error: error.message });
    return res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    await deleteProject(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    logger.error('PROJECTS_API', 'Failed to delete project', { error: error.message });
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST /api/projects/:id/documents - Attach document to project
router.post('/:id/documents', async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    await addDocumentToProject(req.params.id, documentId);
    return res.json({ success: true });
  } catch (error) {
    logger.error('PROJECTS_API', 'Failed to add document to project', { error: error.message });
    return res.status(500).json({ error: 'Failed to add document' });
  }
});

// DELETE /api/projects/:id/documents/:docId - Remove document from project
router.delete('/:id/documents/:docId', async (req, res) => {
  try {
    await removeDocumentFromProject(req.params.id, req.params.docId);
    return res.json({ success: true });
  } catch (error) {
    logger.error('PROJECTS_API', 'Failed to remove document', { error: error.message });
    return res.status(500).json({ error: 'Failed to remove document' });
  }
});

export default router;
