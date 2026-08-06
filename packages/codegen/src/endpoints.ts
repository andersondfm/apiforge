import type { EndpointPreview, GenerateConfig } from '@apiforge/shared';
import { defaultOperations, routeName, selectedTables } from './helpers.js';

export function buildEndpoints(config: GenerateConfig): EndpointPreview[] {
  const endpoints: EndpointPreview[] = [];
  const authRequired = Boolean(config.auth.enabled);

  if (config.auth.enabled) {
    endpoints.push({
      method: 'POST',
      path: '/auth/login',
      description: 'Authenticate and receive a JWT access token',
      authRequired: false,
    });
    if (config.auth.includeRegister) {
      endpoints.push({
        method: 'POST',
        path: '/auth/register',
        description: 'Register a new user account',
        authRequired: false,
      });
    }
  }

  for (const table of selectedTables(config)) {
    const base = `/${routeName(table)}`;
    const label = table.name;
    const ops = defaultOperations(table);

    if (ops.list) {
      endpoints.push({
        method: 'GET',
        path: base,
        description: `List ${label}${config.includePagination ? ' with pagination' : ''}`,
        authRequired,
      });
    }
    if (ops.get) {
      endpoints.push({
        method: 'GET',
        path: `${base}/:id`,
        description: `Get a single ${label} by primary key`,
        authRequired,
      });
    }
    if (ops.create) {
      endpoints.push({
        method: 'POST',
        path: base,
        description: `Create a new ${label}`,
        authRequired,
      });
    }
    if (ops.update) {
      endpoints.push({
        method: 'PUT',
        path: `${base}/:id`,
        description: `Update an existing ${label}`,
        authRequired,
      });
    }
    if (ops.delete) {
      endpoints.push({
        method: 'DELETE',
        path: `${base}/:id`,
        description: `Delete a ${label}`,
        authRequired,
      });
    }
  }

  return endpoints;
}
