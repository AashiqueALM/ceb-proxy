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
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0");

        // Load CEB page
        await page.goto("https://payment.ceb.lk/instantpay", {
            waitUntil: "networkidle2"
        });

        // Type account number
        await page.type("#account_no", account);

        // Click Proceed
        await page.click("#btnSubmit");

        // Wait for results
        await page.waitForSelector("strong", { timeout: 15000 });

        // Extract data
        const data = await page.evaluate(() => {
            const getText = (label) => {
                const el = [...document.querySelectorAll("strong")]
                    .find(e => e.parentElement.textContent.includes(label));
                return el ? el.textContent.trim() : null;
            };

            return {
                name: getText("Account holder's name"),
                balance: getText("Bill Balance"),
                mobile: getText("Registered Mobile Number")
            };
        });

        await browser.close();
        res.json(data);

    } catch (err) {
        res.json({ error: err.message });
    }
});

app.listen(3000, () => console.log("CEB Proxy running on port 3000"));
