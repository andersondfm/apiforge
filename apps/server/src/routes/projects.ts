import type { FastifyPluginAsync } from 'fastify';
import { deleteProject, getProject, listProjects } from '../db.js';

export const projectsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/projects', async () => {
    return listProjects();
  });

  app.get<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const project = getProject(request.params.id);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return project;
  });

  app.delete<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const deleted = deleteProject(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return { ok: true };
  });
};
