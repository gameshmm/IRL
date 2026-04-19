@echo off
setlocal enabledelayedexpansion
title IRL Stream - Atualizacao
color 0E

echo.
echo  =========================================
echo    IRL STREAM - Atualizacao do Sistema
echo  =========================================
echo.
echo  Repositorio: https://github.com/gameshmm/IRL
echo.

:: ── Verifica Git ───────────────────────────────────────────────────────────────
where git >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Git nao encontrado!
    echo.
    echo  Instale o Git em: https://git-scm.com/download/win
    echo  Apos instalar, feche e reabra este script.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('git --version 2^>^&1') do set GIT_VER=%%v
echo  [OK] %GIT_VER% encontrado!

:: ── Verifica Node.js ───────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Node.js nao encontrado!
    echo  Instale em: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>^&1') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% encontrado!
echo.

:: ── Vai para a raiz do projeto ────────────────────────────────────────────────
cd /d "%~dp0"

:: ── Checa se e um repositorio git valido ─────────────────────────────────────
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Esta pasta nao e um repositorio Git!
    echo.
    echo  Para usar o update automatico, clone o repositorio:
    echo    git clone https://github.com/gameshmm/IRL.git
    echo.
    pause
    exit /b 1
)

:: ── Mostra versao atual ────────────────────────────────────────────────────────
for /f "tokens=*" %%h in ('git rev-parse --short HEAD 2^>^&1') do set CURRENT_HASH=%%h
for /f "tokens=*" %%m in ('git log -1 --format^=%%s 2^>^&1') do set CURRENT_MSG=%%m
echo  Versao atual: %CURRENT_HASH% - %CURRENT_MSG%
echo.

:: ── Busca atualizacoes do GitHub ──────────────────────────────────────────────
echo  Buscando atualizacoes em GitHub...
git fetch origin master >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Nao foi possivel conectar ao GitHub.
    echo  Verifique sua conexao com a internet.
    echo.
    pause
    exit /b 1
)

:: ── Verifica se ha atualizacoes ───────────────────────────────────────────────
for /f "tokens=*" %%h in ('git rev-parse --short origin/master 2^>^&1') do set REMOTE_HASH=%%h

if "%CURRENT_HASH%"=="%REMOTE_HASH%" (
    echo  [OK] Sistema ja esta atualizado! ^(%CURRENT_HASH%^)
    echo.
    pause
    exit /b 0
)

for /f "tokens=*" %%m in ('git log -1 --format^=%%s origin/master 2^>^&1') do set REMOTE_MSG=%%m
echo  Nova versao disponivel: %REMOTE_HASH% - %REMOTE_MSG%
echo.
echo  Deseja atualizar agora? [S/N]
set /p CONFIRM=  Resposta: 

if /i not "%CONFIRM%"=="S" (
    echo.
    echo  Atualizacao cancelada.
    pause
    exit /b 0
)

:: ── Salva dados locais antes de atualizar ─────────────────────────────────────
echo.
echo  Preservando dados locais (banco de dados e configuracoes)...

:: Faz backup do banco e do .env antes do pull
if exist "server\irl.db"       copy "server\irl.db"       "server\irl.db.bak"       >nul
if exist "server\irl-db.json"  copy "server\irl-db.json"  "server\irl-db.json.bak"  >nul
if exist "server\.env"         copy "server\.env"          "server\.env.bak"          >nul
if exist "server\config.json"  copy "server\config.json"   "server\config.json.bak"   >nul
echo  [OK] Backup dos dados criado!

:: ── Aplica atualizacao ────────────────────────────────────────────────────────
echo.
echo  Aplicando atualizacao...

:: Descarta mudancas nos arquivos rastreados (mantendo dados locais que estao no .gitignore)
git checkout -- . >nul 2>&1

:: Puxa a atualizacao
git pull origin master
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao aplicar atualizacao!
    echo  Restaurando backup dos dados...
    if exist "server\irl.db.bak"      copy "server\irl.db.bak"      "server\irl.db"      >nul
    if exist "server\irl-db.json.bak" copy "server\irl-db.json.bak" "server\irl-db.json" >nul
    if exist "server\.env.bak"        copy "server\.env.bak"        "server\.env"        >nul
    if exist "server\config.json.bak" copy "server\config.json.bak" "server\config.json" >nul
    echo  [OK] Dados restaurados.
    pause
    exit /b 1
)

:: ── Restaura dados que o git pode ter sobrescrito ────────────────────────────
:: (apenas se o git pull sobrescreveu; os arquivos de dados estao no .gitignore
:: entao normalmente nao precisam ser restaurados, mas garantimos aqui)
if exist "server\irl.db.bak"      if not exist "server\irl.db"      copy "server\irl.db.bak"      "server\irl.db"      >nul
if exist "server\irl-db.json.bak" if not exist "server\irl-db.json" copy "server\irl-db.json.bak" "server\irl-db.json" >nul
if exist "server\.env.bak"        if not exist "server\.env"        copy "server\.env.bak"        "server\.env"        >nul
if exist "server\config.json.bak" if not exist "server\config.json" copy "server\config.json.bak" "server\config.json" >nul

:: Remove backups temporarios
del /q "server\irl.db.bak"       2>nul
del /q "server\irl-db.json.bak"  2>nul
del /q "server\.env.bak"         2>nul
del /q "server\config.json.bak"  2>nul

echo.
for /f "tokens=*" %%h in ('git rev-parse --short HEAD 2^>^&1') do set NEW_HASH=%%h
echo  [OK] Atualizado para versao: %NEW_HASH%

:: ── Reinstala dependencias ────────────────────────────────────────────────────
echo.
echo  Atualizando dependencias do servidor...
cd /d "%~dp0server"
if exist "node_modules" rmdir /s /q "node_modules" >nul 2>&1
call npm install
if errorlevel 1 (
    echo  [AVISO] Erro ao instalar dependencias do servidor.
)
echo.

echo  Atualizando dependencias do painel...
cd /d "%~dp0dashboard"
if exist "node_modules" rmdir /s /q "node_modules" >nul 2>&1
call npm install
if errorlevel 1 (
    echo  [AVISO] Erro ao instalar dependencias do painel.
)

:: ── Concluido ─────────────────────────────────────────────────────────────────
echo.
echo  =========================================
echo    Atualizacao concluida com sucesso!
echo  =========================================
echo.
echo  Execute iniciar.bat para reiniciar o sistema.
echo.
pause
