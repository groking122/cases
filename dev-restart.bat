@echo off
echo 🔄 Cleaning Next.js cache and restarting development server...

REM Kill any existing Node processes
taskkill /F /IM node.exe 2>nul

REM Clean build cache
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start development server
echo ✅ Starting fresh development server...
npm run dev
