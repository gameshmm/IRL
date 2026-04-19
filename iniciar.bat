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

:: Define caminhos sem espaco no final (necessario para cmd /k)
set SERVER_DIR=%~dp0server
set DASH_DIR=%~dp0dashboard

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
echo  Painel:    http://localhost:5173
echo  API:       http://localhost:3001
echo  RTMP:      rtmp://localhost:1935/live
echo  FLV:       http://localhost:8000/live/<chave>.flv
echo.
echo  Login:
echo    Usuario: admin
echo    Senha:   admin123
echo.
echo  Abrindo navegador...

:: Abre o navegador
start http://localhost:5173

echo.
echo  Feche as outras janelas para parar o sistema.
pause >nul
