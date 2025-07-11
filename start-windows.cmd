@echo off
title Lancement Serveur SEO
color 0A

:: Vérifie Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

:: Installe les dépendances
echo Installation des dépendances...
call npm install

:: Lance le serveur
echo Lancement du serveur...
start "" "node" "start-server.js"

:: Ouvre le navigateur
timeout /t 5 >nul
start "" "http://localhost:3000"

echo Serveur démarré sur http://localhost:3000
pause