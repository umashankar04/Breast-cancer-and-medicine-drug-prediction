@echo off
setlocal
cd /d "%~dp0"

set "PYTHON_EXE=.venv\Scripts\python.exe"
set "BACKEND_URL=http://127.0.0.1:8000/"
set "FRONTEND_URL=http://127.0.0.1:5173/"

if not exist "%PYTHON_EXE%" (
    echo [ERROR] Python virtual environment not found at .venv\Scripts\python.exe
    echo [HINT] Create the environment first, then rerun run.bat.
    exit /b 1
)

if not exist "frontend\package.json" (
    echo [ERROR] Frontend package.json not found at frontend\package.json
    exit /b 1
)

if not exist "breast_cancer_system\requirements.txt" (
    echo [ERROR] Backend requirements file not found at breast_cancer_system\requirements.txt
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm was not found in PATH. Install Node.js and reopen terminal.
    exit /b 1
)

echo [INFO] Ensuring backend Python dependencies are installed...
"%PYTHON_EXE%" -m pip install -r "breast_cancer_system\requirements.txt" >nul
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies.
    exit /b 1
)

echo [INFO] Ensuring frontend node_modules are installed...
if not exist "frontend\node_modules" (
    call npm --prefix frontend install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies.
        exit /b 1
    )
)

echo [INFO] Checking backend service...
call :check_url "%BACKEND_URL%"
if errorlevel 1 (
    echo [INFO] Starting backend on port 8000...
    start "Breast Cancer Backend" "%PYTHON_EXE%" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
    call :wait_for_url "%BACKEND_URL%" "Backend"
    if errorlevel 1 (
        echo [ERROR] Backend did not start on port 8000 in time.
        exit /b 1
    )
) else (
    echo [INFO] Backend is already running.
)

echo [INFO] Checking frontend service...
call :check_url "%FRONTEND_URL%"
if errorlevel 1 (
    echo [INFO] Starting frontend on port 5173...
    start "Breast Cancer Frontend" cmd /c "cd /d frontend && npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"
    call :wait_for_url "%FRONTEND_URL%" "Frontend"
    if errorlevel 1 (
        echo [ERROR] Frontend did not start on port 5173 in time.
        exit /b 1
    )
) else (
    echo [INFO] Frontend is already running.
)

echo [INFO] Opening browser tabs...
start "" "http://127.0.0.1:8000/docs"
start "" "http://127.0.0.1:5173"

echo.
echo [LINK] Backend API Docs: http://127.0.0.1:8000/docs
echo [LINK] Frontend App:     http://127.0.0.1:5173
echo.
echo [OK] Application is ready.
exit /b 0

:check_url
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing '%~1'; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
exit /b %errorlevel%

:wait_for_url
powershell -NoProfile -Command "for ($i = 0; $i -lt 60; $i++) { try { $r = Invoke-WebRequest -UseBasicParsing '%~1'; if ($r.StatusCode -eq 200) { exit 0 } } catch { } Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
    echo [ERROR] %~2 health check failed.
)
exit /b %errorlevel%
