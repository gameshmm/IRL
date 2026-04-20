@echo off
setlocal enabledelayedexpansion
title IRL Stream - Iniciando...
color 0A

echo.
echo  =========================================
echo    IRL STREAM - Iniciando Sistema
echo  =========================================
echo.

:: Verifica se dependencias estao instaladas
if not exist "%~dp0server\node_modules" (
    echo  [AVISO] Dependencias do servidor nao encontradas!
    echo          Execute instalar.bat primeiro.
    pause
    exit /b 1
)
if not exist "%~dp0dashboard\node_modules" (
    echo  [AVISO] Dependencias do painel nao encontradas!
    echo          Execute instalar.bat primeiro.
    pause
    exit /b 1
)

:: Define caminhos
set SERVER_DIR=%~dp0server
set DASH_DIR=%~dp0dashboard

:: Detecta IP do Tailscale (range 100.x.x.x)
set LOCAL_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "100\.[0-9]"') do (
    set LINE=%%a
    set LINE=!LINE: =!
    if not defined LOCAL_IP set LOCAL_IP=!LINE!
)

:: Fallback: primeiro IPv4 que nao seja loopback
if not defined LOCAL_IP (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
        set LINE=%%a
        set LINE=!LINE: =!
        if not defined LOCAL_IP (
            echo !LINE! | findstr /v "127.0.0.1" >nul 2>&1 && set LOCAL_IP=!LINE!
        )
    )
)
if not defined LOCAL_IP set LOCAL_IP=SEU-IP

:: Inicia o servidor em janela separada
echo  Iniciando servidor de midia (RTMP + API)...
start "IRL - Servidor" cmd /k "title IRL - Servidor de Midia && cd /d "%SERVER_DIR%" && npm start"

:: Aguarda o servidor inicializar
timeout /t 3 /nobreak >nul

:: Inicia o dashboard em janela separada
echo  Iniciando painel web (Dashboard)...
start "IRL - Painel" cmd /k "title IRL - Painel Web && cd /d "%DASH_DIR%" && npm run dev"

:: Aguarda o dashboard inicializar
timeout /t 5 /nobreak >nul

echo.
echo  =========================================
echo    Sistema iniciado!
echo  =========================================
echo.
echo  [PC - localhost]
echo  Painel:    http://localhost:5173
echo  API:       http://localhost:3001
echo.
echo  [Celular / Tailscale]
echo  Painel:    http://%LOCAL_IP%:5173
echo  API:       http://%LOCAL_IP%:3001
echo  RTMP:      rtmp://%LOCAL_IP%:1935/live
echo  FLV:       http://%LOCAL_IP%:8000/live/<chave>.flv
echo.
echo  Login:
echo    Usuario: admin
echo    Senha:   admin123
echo.
echo  Abrindo navegador...
start http://localhost:5173

echo.
echo  Feche as outras janelas para parar o sistema.
pause >nul
