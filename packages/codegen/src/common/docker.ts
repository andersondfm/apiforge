import type { GenerateConfig, GeneratedFile } from '@apiforge/shared';
import { csharpNamespace, sanitizeProjectName } from '../helpers.js';
import {
  DOTNET_DOCKER_RUNTIME,
  DOTNET_DOCKER_SDK,
  NODE_DOCKER_IMAGE,
} from '../versions.js';

export function dockerFiles(config: GenerateConfig): GeneratedFile[] {
  if (!config.includeDocker) return [];

  const files: GeneratedFile[] = [
    {
      path: 'docker-compose.yml',
      content: `services:
  api:
    build: .
    ports:
      - "${config.port}:${config.port}"
    env_file:
      - .env
    restart: unless-stopped
`,
      language: 'json',
    },
  ];

  if (config.stack.startsWith('node')) {
    files.push({
      path: 'Dockerfile',
      content: `FROM ${NODE_DOCKER_IMAGE} AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM ${NODE_DOCKER_IMAGE}
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE ${config.port}
CMD ["node", "dist/index.js"]
`,
      language: 'markdown',
    });
  } else {
    const dll = csharpNamespace(config.projectName);
    files.push({
      path: 'Dockerfile',
      content: `FROM ${DOTNET_DOCKER_SDK} AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app

FROM ${DOTNET_DOCKER_RUNTIME}
WORKDIR /app
COPY --from=build /app .
EXPOSE ${config.port}
ENV ASPNETCORE_URLS=http://+:${config.port}
ENTRYPOINT ["dotnet", "${dll}.dll"]
`,
      language: 'markdown',
    });
  }

  return files;
}

export { sanitizeProjectName };
