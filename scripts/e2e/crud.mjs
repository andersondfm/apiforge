/**
 * HTTP CRUD assertions against a generated /products API.
 * Works with Node (camelCase) and .NET (camelCase JSON by default).
 */

function pick(row, ...keys) {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
}

async function req(baseUrl, method, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: body ? { 'content-type': 'application/json', accept: 'application/json' } : { accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }
  return { status: res.status, json, text };
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function listRows(json) {
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json)) return json;
  return [];
}

export async function waitForHealth(baseUrl, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = 'no response';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
      lastErr = `HTTP ${res.status}`;
    } catch (err) {
      lastErr = err.message;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Health check failed for ${baseUrl}: ${lastErr}`);
}

export async function runProductsCrud(baseUrl) {
  const sku = `E2E-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  // LIST seeds
  const list1 = await req(baseUrl, 'GET', '/products');
  assert(list1.status === 200, `GET /products expected 200, got ${list1.status}: ${list1.text}`);
  const rows1 = listRows(list1.json);
  const names = rows1.map((r) => pick(r, 'name', 'Name'));
  assert(names.includes('Widget'), 'Expected seed product Widget in list');
  assert(names.includes('Gadget'), 'Expected seed product Gadget in list');
  const total = pick(list1.json, 'total', 'Total') ?? rows1.length;
  assert(Number(total) >= 2, `Expected total >= 2, got ${total}`);

  // CREATE
  const createBody = {
    name: 'E2E Product',
    price: 12.34,
    sku,
    active: 1,
  };
  const created = await req(baseUrl, 'POST', '/products', createBody);
  assert(
    created.status === 201 || created.status === 200,
    `POST /products expected 201, got ${created.status}: ${created.text}`,
  );

  // Resolve id (MySQL/SQLite/.NET may not return identity; never trust id 0)
  let id = pick(created.json, 'id', 'Id');
  if (id == null || id === 0 || id === '0') {
    const list2 = await req(baseUrl, 'GET', '/products?limit=100');
    assert(list2.status === 200, `GET /products after create failed: ${list2.status}`);
    const found = listRows(list2.json).find((r) => pick(r, 'sku', 'Sku') === sku);
    assert(found, `Created product with sku ${sku} not found in list`);
    id = pick(found, 'id', 'Id');
  }
  assert(id != null && id !== 0 && id !== '0', 'Could not resolve created product id');

  // GET by id
  const one = await req(baseUrl, 'GET', `/products/${id}`);
  assert(one.status === 200, `GET /products/${id} expected 200, got ${one.status}: ${one.text}`);
  assert(pick(one.json, 'sku', 'Sku') === sku, `GET by id sku mismatch: ${one.text}`);

  // UPDATE
  const updated = await req(baseUrl, 'PUT', `/products/${id}`, {
    name: 'E2E Product Updated',
    price: 56.78,
    sku,
    active: 1,
  });
  assert(
    updated.status === 200,
    `PUT /products/${id} expected 200, got ${updated.status}: ${updated.text}`,
  );
  const after = await req(baseUrl, 'GET', `/products/${id}`);
  assert(after.status === 200, `GET after update failed: ${after.status}`);
  assert(
    pick(after.json, 'name', 'Name') === 'E2E Product Updated',
    `Expected updated name, got ${pick(after.json, 'name', 'Name')}`,
  );

  // DELETE
  const del = await req(baseUrl, 'DELETE', `/products/${id}`);
  assert(
    del.status === 204 || del.status === 200,
    `DELETE /products/${id} expected 204, got ${del.status}: ${del.text}`,
  );

  const gone = await req(baseUrl, 'GET', `/products/${id}`);
  assert(gone.status === 404, `GET deleted id expected 404, got ${gone.status}`);

  // Seeds still present
  const list3 = await req(baseUrl, 'GET', '/products');
  const names3 = listRows(list3.json).map((r) => pick(r, 'name', 'Name'));
  assert(names3.includes('Widget'), 'Seed Widget missing after CRUD');
  assert(names3.includes('Gadget'), 'Seed Gadget missing after CRUD');

  return { id, sku };
}
