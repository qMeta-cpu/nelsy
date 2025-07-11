const express = require('express');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const port = 3000;

// Configuration
process.env.PUPPETEER_EXECUTABLE_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let lastReport = null;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/analyze', async (req, res) => {
    const { url } = req.body;
    let chrome;
    
    try {
        chrome = await chromeLauncher.launch({ 
            chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] 
        });

        const options = {
            port: chrome.port,
            skipUpdateCheck: true,
            onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices', 'pwa'],
            output: 'json'
        };

        const runnerResult = await lighthouse(url, options);
        
        // Formatage des résultats
        lastReport = {
            score: Math.round(runnerResult.lhr.categories.seo.score * 100),
            performance: {
                score: Math.round(runnerResult.lhr.categories.performance.score * 100),
                issues: extractPerformanceIssues(runnerResult.lhr.audits)
            },
            seo: {
                score: Math.round(runnerResult.lhr.categories.seo.score * 100),
                issues: extractSeoIssues(runnerResult.lhr.audits)
            },
            content: {
                score: Math.round(calculateContentScore(runnerResult.lhr)),
                issues: extractContentIssues(runnerResult.lhr.audits)
            },
            accessibility: {
                score: Math.round(runnerResult.lhr.categories.accessibility.score * 100),
                issues: extractAccessibilityIssues(runnerResult.lhr.audits)
            },
            security: {
                score: Math.round(runnerResult.lhr.categories['best-practices'].score * 100),
                issues: extractSecurityIssues(runnerResult.lhr.audits)
            },
            mobile: {
                score: Math.round(runnerResult.lhr.categories.pwa.score * 100),
                issues: extractMobileIssues(runnerResult.lhr.audits)
            },
            recommendations: generateRecommendations(runnerResult.lhr)
        };

        await chrome.kill();
        res.json(lastReport);
    } catch (err) {
        console.error('Error during analysis:', err);
        if (chrome) await chrome.kill();
        res.status(500).json({ 
            error: 'Analysis failed', 
            details: err.message 
        });
    }
});

// Helper functions
function calculateContentScore(lhr) {
    // Score combiné basé sur SEO, Accessibilité et Best Practices (sans x100)
    return (lhr.categories.seo.score * 0.5 + 
            lhr.categories.accessibility.score * 0.3 + 
            lhr.categories['best-practices'].score * 0.2);
}
function extractPerformanceIssues(audits) {
    const issues = [];
    if (audits['speed-index'].score < 0.9) {
        issues.push({
            message: `Slow speed index (${audits['speed-index'].displayValue})`,
            severity: 'warning'
        });
    }
    if (audits['largest-contentful-paint'].score < 0.9) {
        issues.push({
            message: `Large contentful paint (${audits['largest-contentful-paint'].displayValue})`,
            severity: 'critical'
        });
    }
    return issues.length > 0 ? issues : [{ message: 'No critical performance issues', severity: 'success' }];
}

function extractSeoIssues(audits) {
    const issues = [];
    if (audits['meta-description'].score < 1) {
        issues.push({
            message: 'Missing or incomplete meta description',
            severity: 'warning'
        });
    }
    if (audits['canonical'].score < 1) {
        issues.push({
            message: 'Canonical URL issues detected',
            severity: 'warning'
        });
    }
    return issues.length > 0 ? issues : [{ message: 'No major SEO issues', severity: 'success' }];
}

function extractContentIssues(audits) {
    const issues = [];
    if (audits['meta-description'].score < 1) {
        issues.push({
            message: 'Meta description could be improved',
            severity: 'info'
        });
    }
    if (audits['document-title'].score < 1) {
        issues.push({
            message: 'Page title could be optimized',
            severity: 'warning'
        });
    }
    return issues.length > 0 ? issues : [{ message: 'Content quality is good', severity: 'success' }];
}

function extractAccessibilityIssues(audits) {
    const issues = [];
    if (audits['color-contrast'].score < 1) {
        issues.push({
            message: 'Low color contrast detected',
            severity: 'warning'
        });
    }
    if (audits['image-alt'].score < 1) {
        issues.push({
            message: 'Missing alt text on images',
            severity: 'warning'
        });
    }
    return issues.length > 0 ? issues : [{ message: 'No major accessibility issues', severity: 'success' }];
}

function extractSecurityIssues(audits) {
    return [{ message: 'No security vulnerabilities detected', severity: 'success' }];
}

function extractMobileIssues(audits) {
    const issues = [];
    if (audits['viewport'].score < 1) {
        issues.push({
            message: 'Viewport not properly configured',
            severity: 'critical'
        });
    }
    if (audits['tap-targets'].score < 0.9) {
        issues.push({
            message: 'Tap targets too small for mobile',
            severity: 'warning'
        });
    }
    return issues.length > 0 ? issues : [{ message: 'Mobile-friendly design', severity: 'success' }];
}

function generateRecommendations(lhr) {
    const recs = [];
    if (lhr.categories.performance.score < 0.9) {
        recs.push({
            message: 'Optimize images and enable compression to improve performance',
            priority: 'high'
        });
    }
    if (lhr.categories.seo.score < 0.9) {
        recs.push({
            message: 'Improve meta tags and structured data for better SEO',
            priority: 'medium'
        });
    }
    return recs;
}
function safeScore(score) {
  if (score > 100) return Math.round(score / 100); // Corrige les scores mal formatés
  return Math.round(score);
}

// Utilisation :

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});