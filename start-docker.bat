@echo off
echo ==========================================
echo Starting SSVM Docker Containers in Phases
echo ==========================================
echo.

echo 1. Creating shared network...
docker network create ssvm-network 2>nul
echo.

echo 2. Starting Infrastructure (Database, Redis, Monitoring)...
docker compose -f docker-compose.infra.yml up -d
echo Waiting 15 seconds for database to initialize...
timeout /t 15 /nobreak
echo.

echo 3. Starting Backend API...
docker compose -f docker-compose.api.yml up -d --build
echo Waiting 15 seconds for backend to start...
timeout /t 15 /nobreak
echo.

echo 4. Starting Portals (Frontends)...
docker compose -f docker-compose.portals.yml up -d --build
echo.

echo ==========================================
echo All 3 container groups have been started!
echo ==========================================

