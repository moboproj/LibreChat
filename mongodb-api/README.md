# mongodb-api (Admin REST)

## Seed local (punto 1–2)

```bash
cd mongodb-api
npm run seed:reset
```

El seeder reescribe hosts `mongodb` / `chat-mongodb` → `127.0.0.1` para correr fuera de Docker.
Override manual: `$env:SEED_MONGODB_URI='mongodb://127.0.0.1:27017/LibreChat'`

Importa `jsonCompareDB/users.json` + `mcpservers78.json`, crea roles (ADMIN/USER/STORE + 12 custom), y genera conversations / messages / transactions / agents / files etiquetados `seedSource: admin-panel`.

Login de prueba:

- email: `admin@seed.local`
- password: `AdminSeed123!`

Opciones:

- `npm run seed` — merge sin borrar seed previo
- `npm run seed:sanitize` — reset + emails anonimizados
- `npm run seed -- --no-import` — solo sintético (sin dumps)

## Tests / smoke

```bash
npm test          # unit paginación + CRUD integración
npm run test:crud # solo CRUD users/roles/mcp/auth
npm run smoke     # contra API ya levantada en :8082
```

Los tests CRUD levantan la API en un puerto efímero, usan Mongo local (`127.0.0.1`) y limpian docs `crud-test` / `@crud.test.local`.
Requisitos: Mongo accesible y roles base (los crea el helper si faltan).

OpenAPI: `http://localhost:8082/openapi.yaml`

## Stats FE

En `admin-panel/.env`:

```
VITE_STATS_USE_MOCK=false
```
