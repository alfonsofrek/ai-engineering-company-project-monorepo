# Entorno con Docker

Con Docker ya no hay que instalar Node ni Python en la máquina: el entorno completo está definido en el repositorio.

| Servicio | Contenedor | Puerto en el host | Qué ejecuta |
|---|---|---|---|
| `ui` | `uis/Dockerfile` (Node 22 Alpine) | 3000 (website) y 3001 (backoffice) | `start.sh` arranca las dos apps Next.js en el mismo contenedor |
| `api` | `services/Dockerfile` (Python 3.13 + uv) | 8000 | `uvicorn services.api.main:app --reload` |

Los dos servicios están en la red `trackflow-net`. La UI llama a la API por el nombre del servicio (`API_INTERNAL_URL=http://api:8000`), nunca por `localhost`.

## Desarrollo local

```bash
cp .env.example .env            # y cambia JWT_SECRET_KEY por un valor aleatorio
docker compose up --build
```

- Website: http://localhost:3000
- Backoffice: http://localhost:3001
- API (docs): http://localhost:8000/docs

**Hot reload.** Las carpetas `uis/`, `services/`, `scripts/` y `packages/` se montan en los contenedores (bind mount). Cualquier cambio en el host se ve sin reconstruir la imagen. Next.js usa polling (`WATCHPACK_POLLING`) y Uvicorn usa `--reload`.

**Dependencias.** `node_modules` vive en volúmenes con nombre, así que las dependencias del host y las del contenedor no se mezclan. Si cambias un `package.json` o `requirements.txt`, vuelve a construir con `docker compose up --build`.

**Datos.** La base TinyDB se guarda en el volumen `api_data`, en `/data/trackflow.json`. Para cargar los datos iniciales:

```bash
docker compose exec api python services/api/seed.py
docker compose exec api python scripts/seed_incidents.py
```

## Secretos

- `docker-compose.yml` y los Dockerfiles **no contienen ningún secreto**. Toda la configuración llega desde `.env` (`env_file`).
- `.env` está en `.gitignore`. Solo se versiona `.env.example`, que lleva valores de ejemplo.
- `.dockerignore` deja fuera de las imágenes los `.env*`, `node_modules`, `.next`, los logs y los tests.

## Producción en el VPS

`docker-compose.prod.yml` se aplica encima de la configuración base:

- La UI se compila (`next build`) y se sirve con `next start` (`UI_MODE=production`). No hay bind mount del código.
- La API arranca sin `--reload` y **no publica el puerto 8000**. Solo es accesible desde la UI, dentro de la red de Docker.
- Usa `restart: always`.

```bash
# En el VPS (por SSH)
git clone https://github.com/alfonsofrek/ai-engineering-company-project-monorepo.git trackflow
cd trackflow
git checkout feature/docker-monorepo        # o main, una vez fusionado
cp .env.example .env && nano .env           # secretos de producción: solo existen en el VPS
#  JWT_SECRET_KEY=<aleatorio>, BACKOFFICE_ORIGIN=http://<IP-o-dominio>:3001
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Para actualizar después de un cambio:

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Si el VPS tiene cortafuegos, abre los puertos 3000 y 3001, o ponlos detrás del proxy inverso que ya uses (Nginx o Caddy).
