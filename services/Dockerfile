# TrackFlow API (FastAPI) — development image with hot reload.
# Build context: /services. The repository code is bind-mounted at runtime by
# docker-compose.yml, so editing files on the host reloads Uvicorn without a rebuild.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# uv is a fast drop-in replacement for pip.
RUN pip install --no-cache-dir uv

WORKDIR /app/services/api

# Install dependencies first so this layer is cached while only code changes.
COPY api/requirements.txt ./requirements.txt
RUN uv pip install --system --no-cache -r requirements.txt

# Baked-in copy of the code; in development it is shadowed by the bind mount.
COPY . /app/services

WORKDIR /app
EXPOSE 8000

# --reload-dir limits the file watcher to source folders (not the TinyDB data file).
CMD ["uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--reload", "--reload-dir", "/app/services", "--reload-dir", "/app/scripts", "--reload-dir", "/app/packages"]
