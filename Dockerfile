# Crop Watch: one image with the website and the web service.
#   docker build -t cropwatch .
#   docker run -p 8100:8100 -v cropwatch-data:/data -e CW_SECRET=... -e CW_ADMIN_EMAIL=... -e CW_ADMIN_PASSWORD=... cropwatch
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements-server.txt backend/requirements-server.txt
RUN pip install --no-cache-dir -r backend/requirements-server.txt
COPY backend/ backend/
COPY data/results data/results
COPY data/rain data/rain
COPY validation/ validation/
COPY --from=web /web/dist frontend/dist
RUN useradd --create-home app && mkdir -p /data && chown -R app /data
USER app
# Production mode: no demo accounts, a real secret is required, the admin comes from the environment.
ENV CW_ENV=production CW_DATA=/data
EXPOSE 8100
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8100/api/health', timeout=4)"
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8100", "--app-dir", "backend"]
