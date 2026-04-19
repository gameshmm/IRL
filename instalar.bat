@echo off
setlocal enabledelayedexpansion
title IRL Stream - Instalacao
color 0B

echo.
echo  =========================================
echo    IRL STREAM - Instalacao Inicial
echo  =========================================
echo.

:: ── Verifica Node.js ───────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Node.js nao encontrado no PATH!
    echo.
    echo  Instale o Node.js LTS em: https://nodejs.org/
    echo  Apos instalar, FECHE e reabra este script.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version 2^>^&1') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% encontrado!

:: ── Verifica npm ───────────────────────────────────────────────────────────────
where npm >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] npm nao encontrado! Reinstale o Node.js.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('npm --version 2^>^&1') do set NPM_VER=%%v
echo  [OK] npm %NPM_VER% encontrado!
echo.

:: ── Instala dependencias do servidor ───────────────────────────────────────────
echo  [1/2] Instalando dependencias do servidor...
echo        (pasta: %~dp0server)
echo.

cd /d "%~dp0server"
if not exist "package.json" (
    echo  [ERRO] package.json do servidor nao encontrado em %~dp0server
    pause
    exit /b 1
)

call npm install
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao instalar dependencias do servidor.
    echo  Veja os erros acima e tente novamente.
    pause
    exit /b 1
)
echo.
echo  [OK] Dependencias do servidor instaladas!
echo.

:: ── Instala dependencias do dashboard ─────────────────────────────────────────
echo  [2/2] Instalando dependencias do painel web...
echo        (pasta: %~dp0dashboard)
echo.

cd /d "%~dp0dashboard"
if not exist "package.json" (
    echo  [ERRO] package.json do dashboard nao encontrado em %~dp0dashboard
    pause
    exit /b 1
)

call npm install
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao instalar dependencias do painel.
    echo  Veja os erros acima e tente novamente.
    pause
    exit /b 1
)
echo.
echo  [OK] Dependencias do painel instaladas!
echo.

:: ── Cria .env se nao existir ───────────────────────────────────────────────────
cd /d "%~dp0server"
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  [OK] Arquivo .env criado a partir do .env.example
    ) else (
        echo  [AVISO] .env.example nao encontrado, .env nao foi criado.
        echo          Crie manualmente se necessario.
    )
) else (
    echo  [OK] Arquivo .env ja existe, mantendo configuracoes.
)

echo.
echo  =========================================
echo    Instalacao concluida com sucesso!
echo  =========================================
echo.
echo  Agora execute:  iniciar.bat
echo.
echo  Acesse no navegador:  http://localhost:5173
echo.
echo  Login padrao:
echo    Usuario: admin
echo    Senha:   admin123
echo.
pause
