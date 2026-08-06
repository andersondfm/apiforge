import type { GenerateConfig, GeneratePreview } from '@apiforge/shared';
import { buildEndpoints } from './endpoints.js';
import { selectedTables } from './helpers.js';
import { generateNodeExpress } from './stacks/node-express.js';
import { generateNodeFastify } from './stacks/node-fastify.js';
import { generateNetMinimal } from './stacks/net-minimal.js';
import { generateNetWebApi } from './stacks/net-webapi.js';

export function generateProject(config: GenerateConfig): GeneratePreview {
  const tables = selectedTables(config);
  if (tables.length === 0) {
    throw new Error('Select at least one table to generate an API.');
  }

  const normalized: GenerateConfig = {
    ...config,
    port: config.port || (config.stack.startsWith('net') ? 5080 : 3000),
  };

  let files;
  switch (normalized.stack) {
    case 'node-express':
      files = generateNodeExpress(normalized);
      break;
    case 'node-fastify':
      files = generateNodeFastify(normalized);
      break;
    case 'net-minimal':
      files = generateNetMinimal(normalized);
      break;
    case 'net-webapi':
      files = generateNetWebApi(normalized);
      break;
    default:
      throw new Error(`Unknown stack: ${(config as GenerateConfig).stack}`);
  }

  const endpoints = buildEndpoints(normalized);
  const tree = files.map((f) => f.path).sort();
  return { files, endpoints, tree };
}
