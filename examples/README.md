# Examples

## demo-api

Sample project forged by ApiForge (`node-express` stack) against a SQLite products schema with JWT auth, rate limiting, Helmet, and Swagger.

```bash
cd demo-api
cp .env.example .env
npm install
# Create an empty SQLite file or point DATABASE_URL / DB_FILE at your DB
npm run dev
```

Swagger UI: http://localhost:3000/api-docs

This folder is a snapshot of codegen output — regenerate anytime from the ApiForge wizard.
