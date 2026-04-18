@echo off
title IRL Stream - Instalacao
color 0B
echo.
echo  =========================================
echo    IRL STREAM - Instalacao Inicial
echo  =========================================
echo.
echo  Este script vai instalar tudo que e necessario.
echo  Aguarde, pode demorar alguns minutos...
echo.

:: Verifica Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Node.js nao encontrado!
    echo.
    echo  Por favor, instale o Node.js antes de continuar:
    echo  https://nodejs.org/  (baixe a versao LTS)
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js encontrado!
echo.

:: Instala dependencias do servidor
echo  Instalando dependencias do servidor...
cd /d "%~dp0server"
call npm install --silent
if errorlevel 1 (
    echo  [ERRO] Falha ao instalar dependencias do servidor.
    pause
    exit /b 1
)
echo  [OK] Servidor pronto!
echo.

:: Instala dependencias do dashboard
echo  Instalando dependencias do painel web...
cd /d "%~dp0dashboard"
call npm install --silent
if errorlevel 1 (
    echo  [ERRO] Falha ao instalar dependencias do painel.
    pause
    exit /b 1
)
echo  [OK] Painel web pronto!
echo.

:: Cria o .env se nao existir
cd /d "%~dp0server"
if not exist ".env" (
    echo  Criando arquivo de variaveis de ambiente...
    copy ".env.example" ".env" >nul
    echo  [OK] Arquivo .env criado!
)

echo.
echo  =========================================
echo    Instalacao concluida com sucesso!
echo  =========================================
echo.
echo  Agora execute o arquivo:
echo    iniciar.bat
echo.
echo  Depois acesse no navegador:
echo    http://localhost:5173
echo.
echo  Login padrao:
echo    Usuario: admin
echo    Senha:   admin123
echo.
pause
