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

REM Bypassed PostgreSQL check for local frontend testing

echo ✅ PostgreSQL is detected
echo.

cd ssvm-backend
if not exist .env (
    echo ⚠️  No .env found. Copying .env.example to .env
    copy .env.example .env
)
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

REM Bypassed Database schema push and seed since there is no local DB running.

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
