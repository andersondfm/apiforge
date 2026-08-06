import type {
  ConnectionConfig,
  DetectedAuthTable,
  GenerateConfig,
  GeneratePreview,
  IntrospectionResult,
  ProjectRecord,
  SavedConnection,
} from '../types';

const BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.error || body.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function testConnection(
  config: ConnectionConfig,
): Promise<{ ok: boolean; message: string }> {
  return request('/api/connections/test', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function introspect(config: ConnectionConfig): Promise<IntrospectionResult> {
  return request('/api/connections/introspect', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function detectAuth(
  config: ConnectionConfig | { tables: GenerateConfig['tables'] },
): Promise<{ detected: DetectedAuthTable[] }> {
  return request('/api/auth/detect', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function preview(config: GenerateConfig): Promise<GeneratePreview> {
  return request('/api/generate/preview', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function generate(config: GenerateConfig): Promise<Blob> {
  const res = await fetch(`${BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    let message = `Generate failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.error || body.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function listProjects(): Promise<
  Array<Pick<ProjectRecord, 'id' | 'name' | 'stack' | 'createdAt'>>
> {
  return request('/api/projects');
}

export async function getProject(id: string): Promise<ProjectRecord> {
  return request(`/api/projects/${id}`);
}

export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  return request(`/api/projects/${id}`, { method: 'DELETE' });
}

export async function listConnections(): Promise<SavedConnection[]> {
  return request('/api/connections');
}

export async function saveConnection(
  name: string,
  config: ConnectionConfig,
): Promise<SavedConnection> {
  return request('/api/connections', {
    method: 'POST',
    body: JSON.stringify({ name, config }),
  });
}

export async function deleteConnection(id: string): Promise<{ ok: boolean }> {
  return request(`/api/connections/${id}`, { method: 'DELETE' });
}
