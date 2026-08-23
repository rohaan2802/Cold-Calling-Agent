@echo off
REM Always put Node on PATH for this session (fixes Cursor/VS Code "node not found")
set "PATH=C:\Program Files\nodejs;%PATH%"

cd /d "%~dp0.."

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found at "C:\Program Files\nodejs"
  echo Install Node LTS from https://nodejs.org and restart Cursor.
  pause
  exit /b 1
)

echo Using Node:
node -v
echo.

if not exist "web\node_modules\" (
  echo Installing web dependencies...
  pushd web
  call npm install
  popd
)

call node scripts\sync-web-env.js
if errorlevel 1 (
  echo Warning: sync-web-env failed — check root .env keys.
)

cd web
call node scripts\dev.js
