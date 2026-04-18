@echo off
title IRL Stream - Iniciando...
color 0A

echo.
echo  =========================================
echo    IRL STREAM - Iniciando Sistema
echo  =========================================
echo.

:: Inicia o servidor em segundo plano
echo  Iniciando servidor de midia...
start "IRL - Servidor" cmd /k "title IRL - Servidor de Midia && cd /d "%~dp0server" && npm start"

:: Aguarda o servidor subir
timeout /t 3 /nobreak >nul

:: Inicia o dashboard em segundo plano
echo  Iniciando painel web...
start "IRL - Painel" cmd /k "title IRL - Painel Web && cd /d "%~dp0dashboard" && npm run dev"

:: Aguarda o dashboard subir
timeout /t 4 /nobreak >nul

echo.
echo  =========================================
echo    Sistema iniciado com sucesso!
echo  =========================================
echo.
echo  Abrindo painel no navegador...
echo.
echo  Se nao abrir automaticamente, acesse:
echo    http://localhost:5173
echo.
echo  Login:
echo    Usuario: admin
echo    Senha:   admin123
echo.
echo  Para o celular (PrismLive):
echo    RTMP URL:    rtmp://SEU-IP:1935/live
echo    Chave:       Gere no painel > Chaves de Stream
echo.

:: Abre o navegador
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo  Pressione qualquer tecla para fechar esta janela.
echo  (O sistema continuara rodando nas outras janelas)
pause >nul
