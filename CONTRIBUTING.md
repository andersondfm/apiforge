# Contributing to ApiForge

Thanks for helping make local API generation better.

## Setup

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- Server: http://localhost:8787

## Project map

| Path | Responsibility |
|------|----------------|
| `apps/web` | React wizard + landing |
| `apps/server` | Fastify tool API, local SQLite, ZIP output |
| `packages/shared` | Shared types & defaults |
| `packages/db-introspect` | DB schema readers + auth table detection |
| `packages/codegen` | Stack generators |

## Workflow

1. Branch from `main`
2. Make focused changes
3. Run `npm run typecheck` and `npm run build`
4. Open a PR with a short summary and test notes

## Adding a generated stack

1. Add the stack id to `GeneratedStack` in `packages/shared`
2. Implement `packages/codegen/src/stacks/<name>.ts`
3. Wire it in `packages/codegen/src/generate.ts`
4. Add UI label in web `STACK_LABELS` / Stack step
5. Extend the server Zod enum for `stack`

## Adding a database engine

1. Extend `DbEngine` in shared
2. Add introspector under `packages/db-introspect/src/`
3. Wire `introspect()` switch
4. Update connection UI + codegen `db.ts` / .NET connection factory

## Code style

- TypeScript strict
- ESM with `.js` extensions in Node package imports
- Keep generated code runnable (no stub TODOs in templates)

## License

By contributing, you agree your work is licensed under MIT.
