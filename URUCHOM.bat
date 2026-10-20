@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Automatyzator
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Brak programu Node.js.
  echo Zainstaluj go ze strony https://nodejs.org - przycisk LTS - i uruchom ten plik ponownie.
  echo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Pierwsze uruchomienie - instaluje potrzebne czesci, to potrwa okolo minuty...
  call npm install --omit=dev
  if errorlevel 1 (
    echo Instalacja sie nie udala. Zrob zrzut tego okna i pokaz go Claude.
    pause
    exit /b 1
  )
)
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3030"
node src\serwer.js
echo.
echo Program sie zatrzymal. Zrob zrzut tego okna i pokaz go Claude.
pause
