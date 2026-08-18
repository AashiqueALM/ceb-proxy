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

        let realRequest = null;

        await page.setRequestInterception(true);

        page.on("request", req => {
            if (req.url().includes("/instantpay/validate") && req.method() === "POST") {
                realRequest = {
                    url: req.url(),
                    method: req.method(),
                    postData: req.postData(),
                    headers: req.headers()
                };
            }
            req.continue();
        });

        await page.goto("https://payment.ceb.lk/instantpay", {
            waitUntil: "networkidle2"
        });

        await page.type("#account_no", account);
        await page.click("#btnSubmit");

        await page.waitForTimeout(3000);

        if (!realRequest) {
            await browser.close();
            return res.json({ error: "CEB did not generate a validate request" });
        }

        await page.goto(realRequest.url, {
            method: "POST",
            headers: realRequest.headers,
            postData: realRequest.postData,
            waitUntil: "networkidle2"
        });

        await page.waitForSelector(".col-md-6", { timeout: 20000 });

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
