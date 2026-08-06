import type { GenerateConfig, GeneratedFile } from '@apiforge/shared';
import { csharpNamespace, sanitizeProjectName } from '../helpers.js';

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
      content: `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
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
      content: `FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
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
