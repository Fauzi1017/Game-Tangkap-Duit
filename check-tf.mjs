import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--allow-file-access-from-files',
        ]
    });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log(`PAGE ERROR:`, error.message);
    });

    page.on('requestfailed', request => {
        console.log(`REQUEST FAILED:`, request.url(), request.failure().errorText);
    });

    try {
        console.log('Navigating to http://localhost:5173/game');
        await page.goto('http://localhost:5173/game', { waitUntil: 'networkidle0' });
        console.log('Page loaded. Waiting 5 seconds to capture runtime errors...');
        await new Promise(r => setTimeout(r, 5000));
    } catch (err) {
        console.error('Navigation error:', err);
    } finally {
        await browser.close();
    }
})();
