# Despliegue en Dokploy (proyecto Saas-Hoteleria / production)

La DB `hoteleria` ya existe. Solo falta subir API + Admin en modo SOLO-ADMIN.
Archivo compose para Dokploy: `docker-compose.dokploy.yml` (api + admin, sin DB).

## 0. Subir el repo a GitHub (una vez)

```bash
cd "sistema hotel"
git init
git add .
git commit -m "Sistema hotel: api + admin listos para Dokploy"
git branch -M main
git remote add origin <tu-repo>
git push -u origin main
```

`.env` y `*.log` ya están en `.gitignore`: no se suben secretos.

## 1. Datos que necesitas de Dokploy

Del servicio `hoteleria` (Postgres): host interno, usuario, password y base.
Arma el `DATABASE_URL`:

```
postgresql://postgres:<PASS>@<host-interno>:5432/<db>
```

Genera el JWT (en tu PC):

```bash
openssl rand -hex 32
```

## 2. Crear el servicio Compose en Dokploy

1. En `production` > **Create Service** > **Compose**.
2. Conecta el repo GitHub, rama `main`, Compose file: `docker-compose.dokploy.yml`.
3. En **Environment** del compose define:
   - `DATABASE_URL` (la del paso 1)
   - `JWT_SECRET` (nuevo, del paso 1)
   - `CORS_ORIGIN=https://<dominio-admin>` (lo defines en el paso 3)
   - `VITE_API_URL=https://<dominio-api>` (lo defines en el paso 3)
4. Despliega. El contenedor `api` corre `prisma migrate deploy` solo al arrancar,
   así que tus migraciones (enums, Decimal, RefreshToken…) se aplican solas.

## 3. Dominios (en cada servicio del compose)

Dokploy asigna un dominio por servicio. Configura:

| Servicio | Puerto interno | Dominio sugerido |
|----------|---------------|------------------|
| `api` | 3001 | `https://api.tudominio.com` |
| `admin` | 3000 | `https://admin.tudominio.com` |

⚠️ Orden correcto:
1. Primero asigna el dominio del **api** y redespliega solo si cambió algo.
2. Copia ese dominio a `VITE_API_URL` y a `CORS_ORIGIN` (el del admin).
3. **Rebuildea el admin** (Vite incrusta `VITE_API_URL` en el build; cambiar la
   variable sin rebuild no hace nada).

Healthcheck del api: `GET /api/health` (200 con `{status:"ok"}`).

## 4. Seed inicial (una vez, contra la DB de Dokploy)

Desde tu PC apuntando a la DB remota (o con `dokploy` CLI / terminal del contenedor):

```bash
# Solo para el seed: usa la DATABASE_URL remota temporalmente
pnpm --filter @hotel/api exec tsx prisma/seed.ts
```

Crea `hotel-demo`, `superadmin@hotel.test` y `admin@hotel.test`.
**Cambia esos passwords después del primer login** (vía `register` o directo en DB).

## 5. Checklist post-deploy

- [ ] `https://<api>/api/health` → `{"status":"ok","db":"up"}`
- [ ] Login en el admin con el seed y 200 en `/api/auth/login`
- [ ] `JWT_SECRET` de prod ≠ el de tu `.env` local
- [ ] CORS_ORIGIN = dominio exacto del admin (sin `/` final)
