@echo off
chcp 65001 >nul
title Cai dat Thu ky AI Zalo
cd /d "%~dp0"
echo ================================================
echo    CAI DAT THU KY AI ZALO
echo    (c) 2026 Nguyen Duc Kien - 0981689892
echo ================================================
echo.

echo [1/4] Kiem tra Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   CHUA CO NODE.JS tren may nay.
  echo   1. Vao trang: https://nodejs.org
  echo   2. Tai ban LTS va cai dat ^(bam Next lien tuc^)
  echo   3. Chay lai file CaiDat.bat nay
  echo.
  start https://nodejs.org
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo   Da co Node.js %%v

echo.
echo [2/4] Cai thu vien (1-3 phut, can mang)...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo   LOI cai thu vien. Kiem tra mang roi chay lai.
  pause
  exit /b 1
)

echo.
echo [3/4] Tao file cau hinh...
if not exist .env (
  copy /y .env.example .env >nul
  echo   Da tao file .env tu mau.
) else (
  echo   Da co file .env, giu nguyen.
)

echo.
echo [4/4] Kiem tra dang nhap Claude (bo nao AI)...
where claude >nul 2>&1
if errorlevel 1 (
  echo   Chua co Claude Code. Dang cai...
  call npm install -g @anthropic-ai/claude-code
  echo.
  echo   BUOC CUOI: mo cua so lenh moi, go:  claude
  echo   va dang nhap tai khoan Claude cua ban (1 lan duy nhat).
) else (
  echo   Da co Claude Code tren may.
)

echo.
echo ================================================
echo   CAI DAT XONG!
echo   - Mo phan mem: dup chuot file  ThuKyAI.bat
echo   - Lan dau: bam "Ket noi Zalo cua toi" va quet QR
echo ================================================
pause
