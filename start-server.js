// Configuration Puppeteer pour Windows
process.env.PUPPETEER_EXECUTABLE_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const SERVER_FILE = 'server.js';
const PORT = 3000;
const MAX_RETRIES = 3;
const DELAY_BETWEEN_RETRIES = 2000;

// Vérification du fichier serveur
if (!fs.existsSync(SERVER_FILE)) {
  console.error(`❌ Erreur: ${SERVER_FILE} introuvable`);
  process.exit(1);
}

function startServer(retryCount = 0) {
  const serverProcess = exec(`node ${SERVER_FILE}`, {
    cwd: __dirname,
    windowsHide: true // Important pour Windows
  });

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(output);
    
    if (output.includes(`Serveur démarré sur http://localhost:${PORT}`)) {
      console.log('✅ Serveur prêt !');
      openBrowser();
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('Erreur:', data.toString());
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Redémarrage (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => startServer(retryCount + 1), DELAY_BETWEEN_RETRIES);
      } else {
        console.error('❌ Échec après plusieurs tentatives');
      }
    }
  });
}

function openBrowser() {
  try {
    require('opener')(`http://localhost:${PORT}`);
  } catch (err) {
    console.error('Impossible d\'ouvrir le navigateur:', err.message);
  }
}

function checkDependencies() {
  const required = ['express', 'lighthouse', 'chrome-launcher', 'puppeteer', 'opener'];
  const missing = required.filter(pkg => {
    try {
      require.resolve(pkg);
      return false;
    } catch {
      return true;
    }
  });

  if (missing.length > 0) {
    console.log(`📦 Installation des dépendances manquantes: ${missing.join(', ')}`);
    exec(`npm install ${missing.join(' ')} --no-fund --loglevel=error`, (err) => {
      if (err) {
        console.error('Échec de l\'installation:', err.message);
        process.exit(1);
      }
      startServer();
    });
  } else {
    startServer();
  }
}

// Démarrer
console.log('🚀 Lancement du serveur SEO...');
checkDependencies();

// Gestion de la fermeture
process.on('SIGINT', () => {
  console.log('\nArrêt du serveur...');
  process.exit();
});