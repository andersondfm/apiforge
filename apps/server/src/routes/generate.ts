import type { FastifyPluginAsync } from 'fastify';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PassThrough } from 'node:stream';
import archiver from 'archiver';
import { generateProject } from '@apiforge/codegen';
import type { GenerateConfig, GeneratePreview, GeneratedFile } from '@apiforge/shared';
import { z } from 'zod';
import { saveProject } from '../db.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
export const OUTPUT_DIR = join(ROOT, 'output');

const connectionConfigSchema = z.object({
  engine: z.enum(['postgresql', 'mysql', 'sqlserver', 'sqlite']),
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  filePath: z.string().optional(),
  ssl: z.boolean().optional(),
  connectionString: z.string().optional(),
});

const generateConfigSchema = z.object({
  projectName: z.string().min(1),
  stack: z.enum(['net-minimal', 'net-webapi', 'node-express', 'node-fastify']),
  connection: connectionConfigSchema,
  tables: z.array(z.any()),
  auth: z.any(),
  security: z.any(),
  includeSwagger: z.boolean(),
  includeDocker: z.boolean(),
  includePagination: z.boolean(),
  port: z.number(),
});

async function writeGeneratedFiles(projectDir: string, files: GeneratedFile[]): Promise<void> {
  await mkdir(projectDir, { recursive: true });
  for (const file of files) {
    const fullPath = join(projectDir, file.path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, 'utf8');
  }
}

function zipFiles(files: GeneratedFile[]): Promise<Buffer> {
  return new Promise((resolvePromise, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolvePromise(Buffer.concat(chunks)));
    stream.on('error', reject);
    archive.on('error', reject);

    archive.pipe(stream);

    for (const file of files) {
      archive.append(file.content, { name: file.path });
    }

    void archive.finalize();
  });
}

/** Normalize codegen output — supports GeneratePreview or GeneratedFile[]. */
function asPreview(result: GeneratePreview | GeneratedFile[]): GeneratePreview {
  if (Array.isArray(result)) {
    return {
      files: result,
      endpoints: [],
      tree: result.map((f) => f.path).sort(),
    };
  }
  return result;
}

export const generateRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: GenerateConfig }>('/generate/preview', async (request) => {
    const config = generateConfigSchema.parse(request.body) as GenerateConfig;
    return asPreview(generateProject(config) as GeneratePreview | GeneratedFile[]);
  });

  app.post<{ Body: GenerateConfig }>('/generate', async (request, reply) => {
    const config = generateConfigSchema.parse(request.body) as GenerateConfig;
    const preview = asPreview(generateProject(config) as GeneratePreview | GeneratedFile[]);

    const safeName = config.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectDir = join(OUTPUT_DIR, safeName);
    await writeGeneratedFiles(projectDir, preview.files);

    saveProject(config);

    const buffer = await zipFiles(preview.files);
    const filename = `${safeName}.zip`;

    return reply
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .type('application/zip')
      .send(buffer);
  });
};
