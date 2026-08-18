@echo off
chcp 65001 >nul
title Dong goi Thu Ky AI Zalo thanh file cai dat .exe
cd /d "%~dp0"
set "SRC=%~dp0.."
set "PAY=%~dp0payload"

echo ================================================
echo    DONG GOI THU KY AI ZALO -^> FILE CAI DAT .EXE
echo ================================================
echo.

echo [1/5] Kiem tra cong cu...
where node >nul 2>&1 || (echo   LOI: Chua co Node.js. Tai tai https://nodejs.org & pause & exit /b 1)
set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" (
  echo   LOI: Chua co Inno Setup 6.
  echo   Tai tai: https://jrsoftware.org/isdl.php  roi chay lai file nay.
  start https://jrsoftware.org/isdl.php
  pause & exit /b 1
)
echo   OK.

echo.
echo [2/5] Don goi cu...
if exist "%PAY%" rmdir /s /q "%PAY%"
mkdir "%PAY%\runtime" "%PAY%\app" 2>nul
if not exist "out" mkdir "out"

echo [3/5] Chep runtime Node.js vao goi...
for /f "delims=" %%i in ('where node') do set "NODEEXE=%%i"
for %%i in ("%NODEEXE%") do set "NODEDIR=%%~dpi"
xcopy "%NODEDIR%*" "%PAY%\runtime\" /E /I /Q /Y >nul

echo [4/5] Chep ung dung + cai thu vien ban phat hanh...
xcopy "%SRC%\src" "%PAY%\app\src\" /E /I /Q /Y >nul
xcopy "%SRC%\public" "%PAY%\app\public\" /E /I /Q /Y >nul
copy /y "%SRC%\package.json" "%PAY%\app\" >nul
copy /y "%SRC%\package-lock.json" "%PAY%\app\" >nul
copy /y "%SRC%\.env.example" "%PAY%\app\" >nul
copy /y "%SRC%\README.md" "%PAY%\app\" >nul
pushd "%PAY%\app"
call npm install --omit=dev --no-audit --no-fund >nul 2>&1
popd

echo [5/5] Bien dich file cai dat (mat 2-5 phut)...
"%ISCC%" installer.iss >nul
if errorlevel 1 (echo   LOI bien dich. & pause & exit /b 1)

echo.
echo ================================================
echo   XONG! File cai dat nam tai:
echo   %~dp0out\ThuKyAIZalo-Setup.exe
echo ================================================
explorer "%~dp0out"
pause
