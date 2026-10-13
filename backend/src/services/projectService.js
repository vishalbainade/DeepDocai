import { query } from '../db/index.js';
import logger from '../utils/logger.js';

export const getUserProjects = async (userId) => {
  const result = await query(
    `SELECT 
       p.id,
       p.name,
       p.description,
       p.custom_instructions,
       p.color,
       p.icon,
       p.created_at,
       p.updated_at,
       COUNT(DISTINCT pd.document_id)::integer as document_count,
       COUNT(DISTINCT c.id)::integer as chat_count
     FROM projects p
     LEFT JOIN project_documents pd ON pd.project_id = p.id
     LEFT JOIN chats c ON c.project_id = p.id
     WHERE p.user_id = $1
     GROUP BY p.id
     ORDER BY p.updated_at DESC`,
    [userId]
  );
  return result.rows;
};

export const getProjectById = async (projectId, userId) => {
  const projResult = await query(
    `SELECT * FROM projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  if (!projResult.rows.length) return null;
  const project = projResult.rows[0];

  // Fetch associated documents
  const docsResult = await query(
    `SELECT d.id, d.file_name, d.status, d.page_count, d.embedding_tokens, d.created_at
     FROM documents d
     JOIN project_documents pd ON pd.document_id = d.id
     WHERE pd.project_id = $1
     ORDER BY pd.created_at DESC`,
    [projectId]
  );

  // Fetch associated chats
  const chatsResult = await query(
    `SELECT c.id, c.title, c.document_id, c.updated_at, c.created_at
     FROM chats c
     WHERE c.project_id = $1 AND c.user_id = $2
     ORDER BY c.updated_at DESC`,
    [projectId, userId]
  );

  return {
    ...project,
    documents: docsResult.rows,
    chats: chatsResult.rows,
  };
};

export const createProject = async ({ userId, name, description, customInstructions, color, icon }) => {
  const result = await query(
    `INSERT INTO projects (user_id, name, description, custom_instructions, color, icon)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      name,
      description || null,
      customInstructions || null,
      color || '#da7756',
      icon || 'folder',
    ]
  );
  return result.rows[0];
};

export const updateProject = async ({ projectId, userId, name, description, customInstructions, color, icon }) => {
  const sets = [];
  const params = [];
  let idx = 1;

  if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name); }
  if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description); }
  if (customInstructions !== undefined) { sets.push(`custom_instructions = $${idx++}`); params.push(customInstructions); }
  if (color !== undefined) { sets.push(`color = $${idx++}`); params.push(color); }
  if (icon !== undefined) { sets.push(`icon = $${idx++}`); params.push(icon); }

  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(projectId, userId);

  const result = await query(
    `UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
    params
  );
  return result.rows[0];
};

export const deleteProject = async (projectId, userId) => {
  await query(`DELETE FROM projects WHERE id = $1 AND user_id = $2`, [projectId, userId]);
  return true;
};

export const addDocumentToProject = async (projectId, documentId) => {
  await query(
    `INSERT INTO project_documents (project_id, document_id)
     VALUES ($1, $2)
     ON CONFLICT (project_id, document_id) DO NOTHING`,
    [projectId, documentId]
  );
  // Also link on documents table
  await query(`UPDATE documents SET project_id = $1 WHERE id = $2`, [projectId, documentId]);
  await query(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [projectId]);
  return true;
};

export const removeDocumentFromProject = async (projectId, documentId) => {
  await query(
    `DELETE FROM project_documents WHERE project_id = $1 AND document_id = $2`,
    [projectId, documentId]
  );
  await query(`UPDATE documents SET project_id = NULL WHERE id = $1 AND project_id = $2`, [documentId, projectId]);
  return true;
};
