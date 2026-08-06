import type { EndpointPreview, GenerateConfig } from '@apiforge/shared';
import { routeName, selectedTables } from './helpers.js';

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
    endpoints.push(
      {
        method: 'GET',
        path: base,
        description: `List ${label} with pagination`,
        authRequired,
      },
      {
        method: 'GET',
        path: `${base}/:id`,
        description: `Get a single ${label} by primary key`,
        authRequired,
      },
      {
        method: 'POST',
        path: base,
        description: `Create a new ${label}`,
        authRequired,
      },
      {
        method: 'PUT',
        path: `${base}/:id`,
        description: `Update an existing ${label}`,
        authRequired,
      },
      {
        method: 'DELETE',
        path: `${base}/:id`,
        description: `Delete a ${label}`,
        authRequired,
      },
    );
  }

  return endpoints;
}
