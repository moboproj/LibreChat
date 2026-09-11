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
Los tests de CRUD de usuarios fuerzan `ADMIN_USERS_WRITE_ENABLED=true`. En runtime el default es `false` (ciclo de vida vía SSO).

### Login SSO (admin panel)

Flujo Authorization Code + PKCE:

1. `GET /api/auth/openid` → redirect Keycloak
2. `GET /api/auth/openid/callback` → valida ADMIN local, emite JWT admin + guarda access token OIDC
3. Redirect SPA `/auth/openid/callback?code=…`
4. `POST /api/auth/openid/exchange` → `{ accessToken, refreshToken, user, ssoAccessToken }`

El panel envía `X-Sso-Access-Token` en las rutas `/api/users/sso/*`.

Variables en `.env.admin` (mínimo):

```
OPENID_CALLBACK_URL=http://localhost:8082/api/auth/openid/callback
OPENID_POST_LOGOUT_REDIRECT_URI=http://localhost:8082/api/auth/openid
ADMIN_PANEL_URL=http://localhost:5173
```

### Keycloak (`omnichat-admin-panel`)

| Campo | Valor |
|---|---|
| Valid redirect URIs | `http://localhost:8082/api/auth/openid/callback` |
| Valid post logout redirect URIs | `http://localhost:8082/api/auth/openid` |
| Web origins | `http://localhost:5173` |

**Login:** Keycloak → callback → panel (sin pantalla intermedia).  
**Logout:** Keycloak end_session → otra vez login Keycloak (credenciales).


### Vincular usuarios SSO

En Usuarios del admin: **Vincular SSO** (nº empleado), mismo patrón que promociones:

1. `GET /api/users/sso/roles`
2. `GET /api/users/sso/employees/:numero`
3. `POST /api/users/sso/link` `{ user, role_codigos }` → API delegada Keycloak + upsert local Mongo

OpenAPI: `http://localhost:8082/openapi.yaml`

## Stats FE

En `admin-panel/.env`:

```
VITE_STATS_USE_MOCK=false
```
