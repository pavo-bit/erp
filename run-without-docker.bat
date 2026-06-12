@echo off
REM ═══════════════════════════════════════════════════════════════
REM SSVM College Square — Run Without Docker (Windows)
REM Runs backend and frontend directly on your machine
REM ═══════════════════════════════════════════════════════════════

echo ════════════════════════════════════════════════════════════
echo   🚀 SSVM College Square — Local Development Mode
echo   (Running without Docker)
echo ════════════════════════════════════════════════════════════
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Recommended version: 20.x LTS
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version
echo.

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  PostgreSQL is not installed!
    echo.
    echo You have two options:
    echo   1. Install PostgreSQL from: https://www.postgresql.org/download/
    echo   2. Use SQLite instead (simpler, no installation needed)
    echo 📝 Automatically falling back to SQLite since PostgreSQL is not installed...
    goto USE_SQLITE
)

:NEED_POSTGRES
echo.
echo Please install PostgreSQL and create a database:
echo   1. Download from: https://www.postgresql.org/download/windows/
echo   2. Install PostgreSQL
echo   3. Create database: ssvm_platform
echo   4. Update ssvm-backend/.env with your database credentials
echo.
pause
exit /b 1

:USE_SQLITE
echo.
echo 📝 Switching to SQLite (no PostgreSQL needed)...
echo.

REM Update backend .env to use SQLite
cd ssvm-backend
if exist .env.backup del .env.backup
if exist .env copy .env .env.backup
(
echo # ═══════════════════════════════════════════
echo # SSVM Backend — Environment Variables (SQLite)
echo # ═══════════════════════════════════════════
echo.
echo PORT=5000
echo.
echo # SQLite Database (no PostgreSQL needed)
echo DATABASE_URL="file:./dev.db"
echo.
echo # JWT
echo JWT_SECRET="ssvm-college-square-jwt-secret-2025-change-in-production"
echo JWT_EXPIRES_IN="7d"
echo.
echo # Frontend URL (for CORS)
echo FRONTEND_URL="http://localhost:3000"
echo.
echo # Upload folder
echo UPLOAD_DIR="./uploads"
) > .env

REM Update Prisma schema to use SQLite
if exist prisma\schema.prisma.backup del prisma\schema.prisma.backup
copy prisma\schema.prisma prisma\schema.prisma.backup

powershell -Command "(Get-Content prisma\schema.prisma) -replace 'provider = \"postgresql\"', 'provider = \"sqlite\"' | Set-Content prisma\schema.prisma"

echo ✅ Configured to use SQLite
cd ..

:SETUP_BACKEND
echo.
echo ════════════════════════════════════════════════════════════
echo   📦 Setting up Backend...
echo ════════════════════════════════════════════════════════════
echo.

cd ssvm-backend

REM Install dependencies if needed
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
)

REM Generate Prisma client
echo Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)

REM Push database schema
echo Pushing database schema...
call npx prisma db push
if errorlevel 1 (
    echo ❌ Failed to push database schema
    pause
    exit /b 1
)

REM Seed database
echo Seeding database...
call npx tsx prisma/seed.ts
if errorlevel 1 (
    echo ⚠️  Database seeding failed (may already be seeded)
)

echo ✅ Backend setup complete
cd ..



:SETUP_ERP
echo.
echo ════════════════════════════════════════════════════════════
echo   📦 Setting up ERP Admin...
echo ════════════════════════════════════════════════════════════
echo.

cd erp-admin

REM Install dependencies if needed
if not exist node_modules (
    echo Installing ERP Admin dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install ERP Admin dependencies
        pause
        exit /b 1
    )
)

echo ✅ ERP Admin setup complete
cd ..



:START_SERVICES
echo.
echo ════════════════════════════════════════════════════════════
echo   🚀 Starting Services...
echo ════════════════════════════════════════════════════════════
echo.

REM Start backend in new window
echo Starting backend on http://localhost:5000...
start "SSVM Backend" cmd /k "cd ssvm-backend && npm run dev"

REM Wait a bit for backend to start
timeout /t 5 /nobreak >nul



REM Start erp admin in new window
echo Starting ERP admin on http://localhost:3005...
start "SSVM ERP Admin" cmd /k "cd erp-admin && npm run dev"

echo.
echo ════════════════════════════════════════════════════════════
echo   ✅ SSVM College Square is now running!
echo ════════════════════════════════════════════════════════════
echo.
echo 📱 Access the application:
echo    ERP Admin: http://localhost:3005
echo    Backend:   http://localhost:5000/api
echo    Health:    http://localhost:5000/api/health
echo.
echo 🔑 Login credentials:
echo    ERP Admin: erpadmin@ssvm-cuttack.org / erpadmin123
echo    Teacher:   teacher@ssvm-cuttack.org  / teacher123
echo    Alumni:    alumni@ssvm-cuttack.org  / alumni123
echo.
echo 🛑 To stop services:
echo    Close all terminal windows (Backend, ERP)
echo.
echo 📝 Two new terminal windows have opened:
echo    - SSVM Backend (port 5000)
echo    - SSVM ERP Admin (port 3005)
echo.
echo ════════════════════════════════════════════════════════════
echo.
pause
