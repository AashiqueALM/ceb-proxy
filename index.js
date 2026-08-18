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

        let validateResponse = null;

        // Capture fetch() POST request
        page.on("requestfinished", async req => {
            if (req.url().includes("/instantpay/validate") && req.method() === "POST") {
                validateResponse = await req.response().json();
            }
        });

        await page.goto("https://payment.ceb.lk/instantpay", {
            waitUntil: "networkidle2"
        });

        await page.type("#account_no", account);
        await page.click("#btnSubmit");

        await page.waitForTimeout(3000);

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
