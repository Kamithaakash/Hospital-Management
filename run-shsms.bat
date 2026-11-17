@echo off
echo ====================================================================
echo Hemas Hospital - Smart Housekeeping Supply Management System (SHSMS)
echo Thalawathugoda Branch - Rapid Sprint Platform
echo ====================================================================
echo.
echo Starting Backend API on http://localhost:5000 ...
start "SHSMS Backend" cmd /k "cd /d E:\shsms-hemas-hospital\backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend UI on http://localhost:5173 ...
start "SHSMS Frontend" cmd /k "cd /d E:\shsms-hemas-hospital\frontend && npm run dev"

echo.
echo System started successfully!
echo Open http://localhost:5173 in your browser to access the SHSMS Portal.
echo ====================================================================
pause
