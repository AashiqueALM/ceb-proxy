const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.get("/ceb", async (req, res) => {
    const account = req.query.account;

    if (!account) {
        return res.json({ error: "Account number required" });
    }

    try {
        const browser = await puppeteer.launch({
            headless: "new", // REQUIRED for Render
            executablePath: "/usr/bin/chromium",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--disable-gpu",
                "--disable-software-rasterizer",
                "--disable-features=IsolateOrigins,site-per-process",
                "--window-size=1280,800"
            ]
        });

        const page = await browser.newPage();

        // Remove webdriver fingerprint
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, "webdriver", {
                get: () => false
            });
        });

        // Fake plugins
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, "plugins", {
                get: () => [1, 2, 3]
            });
        });

        // Fake languages
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, "languages", {
                get: () => ["en-US", "en"]
            });
        });

        // Real Chrome user agent
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        );

        await page.setViewport({ width: 1280, height: 800 });

        let validateResponse = null;

        // Capture fetch() POST request
        page.on("requestfinished", async req => {
            if (req.url().includes("/instantpay/validate") && req.method() === "POST") {
                try {
                    validateResponse = await req.response().json();
                } catch (e) {}
            }
        });

        // Load page
        await page.goto("https://payment.ceb.lk/instantpay", {
            waitUntil: "networkidle2"
        });

        // Type account number
        await page.type("#account_no", account);

        // Click submit
        await page.click("#btnSubmit");

        // Wait for CEB to send fetch() request
        await page.waitForTimeout(6000);

        if (!validateResponse) {
            await browser.close();
            return res.json({ error: "CEB did not return bill data" });
        }

        const data = {
            name: validateResponse?.accountHolderName || null,
            balance: validateResponse?.billBalance || null,
            mobile: validateResponse?.registeredMobileNumber || null
        };

        await browser.close();
        res.json(data);

    } catch (err) {
        res.json({ error: err.message });
    }
});

app.listen(3000, () => console.log("CEB Proxy running on port 3000"));
