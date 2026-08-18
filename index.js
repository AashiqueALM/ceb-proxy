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
            headless: true,
            executablePath: "/usr/bin/chromium",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0");
        await page.setViewport({ width: 1280, height: 800 });

        // STEP 1: Load page
        await page.goto("https://payment.ceb.lk/instantpay", {
            waitUntil: "networkidle2"
        });

        // STEP 2: Extract hidden fields
        const hidden = await page.evaluate(() => {
            return {
                token: document.querySelector("input[name='token']")?.value || null,
                uniqueOrderId: document.querySelector("input[name='uniqueOrderId']")?.value || null
            };
        });

        // STEP 3: Submit REAL POST request
        await page.setRequestInterception(true);

        page.once("request", intercepted => {
            intercepted.continue({
                method: "POST",
                postData: new URLSearchParams({
                    account_no: account,
                    token: hidden.token,
                    uniqueOrderId: hidden.uniqueOrderId
                }).toString(),
                headers: {
                    ...intercepted.headers(),
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });
        });

        await page.goto("https://payment.ceb.lk/instantpay/validate", {
            waitUntil: "networkidle2"
        });

        // STEP 5: Scrape results
        const data = await page.evaluate(() => {
            const getValue = (label) => {
                const rows = [...document.querySelectorAll(".col-md-6")];
                const row = rows.find(r => r.textContent.includes(label));
                if (!row) return null;
                const value = row.querySelector("strong, span");
                return value ? value.textContent.trim() : null;
            };

            return {
                name: getValue("Account holder's name"),
                balance: getValue("Bill Balance"),
                mobile: getValue("Registered Mobile Number")
            };
        });

        await browser.close();
        res.json(data);

    } catch (err) {
        res.json({ error: err.message });
    }
});

app.listen(3000, () => console.log("CEB Proxy running on port 3000"));
