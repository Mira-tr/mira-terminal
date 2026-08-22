import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const PLAYWRIGHT_MODULE = process.env.QA_PLAYWRIGHT_MODULE || "playwright";
let chromium;

try{
    ({ chromium } = require(PLAYWRIGHT_MODULE));
}catch(error){
    throw new Error(`Unable to load Playwright from "${PLAYWRIGHT_MODULE}". Set QA_PLAYWRIGHT_MODULE to the installed Playwright module path.`);
}

const BASE_URL = process.env.QA_BASE_URL || "http://127.0.0.1:8000";
const OUT_DIR = process.env.QA_OUT_DIR || "docs/vision/screenshots/chikage-master-qa";
const CHROME = process.env.QA_CHROME;

const viewports = [
    { name: "390", width: 390, height: 844 },
    { name: "430", width: 430, height: 932 },
    { name: "768", width: 768, height: 1024 },
    { name: "1440", width: 1440, height: 900 },
    { name: "1920", width: 1920, height: 1080 }
];

const pages = [
    { name: "home", path: "/creators/chikage/" },
    { name: "trpg", path: "/creators/chikage/trpg/" },
    { name: "scenarios", path: "/creators/chikage/trpg/scenarios/" },
    { name: "scheduler", path: "/creators/chikage/trpg/scheduler/" },
    { name: "picker", path: "/creators/chikage/trpg/picker/" },
    { name: "rules", path: "/creators/chikage/trpg/rules/" },
    { name: "legacy", path: "/creators/chikage/legacy/" }
];

const results = [];

await mkdir(OUT_DIR, { recursive: true });

const launchOptions = { headless: true };

if(CHROME){
    launchOptions.executablePath = CHROME;
}

const browser = await chromium.launch(launchOptions);

try{
    for(const viewport of viewports){
        const context = await browser.newContext({
            viewport: {
                width: viewport.width,
                height: viewport.height
            },
            deviceScaleFactor: 1,
            reducedMotion: "reduce"
        });

        for(const target of pages){
            const page = await context.newPage();
            const consoleMessages = [];
            const pageErrors = [];

            page.on("console", message => {
                if(["error", "warning"].includes(message.type())){
                    consoleMessages.push(`${message.type()}: ${message.text()}`);
                }
            });
            page.on("pageerror", error => pageErrors.push(error.message));

            const response = await page.goto(`${BASE_URL}${target.path}`, {
                waitUntil: "networkidle",
                timeout: 20000
            });

            await page.waitForTimeout(350);

            const metrics = await page.evaluate(() => {
                const documentElement = document.documentElement;
                const body = document.body;
                const fixedElements = [...document.querySelectorAll("*")].filter(element => {
                    const style = getComputedStyle(element);
                    return style.position === "fixed" || style.position === "sticky";
                }).map(element => {
                    const rect = element.getBoundingClientRect();
                    return {
                        tag: element.tagName.toLowerCase(),
                        className: element.className?.toString() || "",
                        top: Math.round(rect.top),
                        bottom: Math.round(rect.bottom),
                        height: Math.round(rect.height)
                    };
                });

                const clippedText = [...document.querySelectorAll("h1, h2, h3, p, a, button, summary, label, small, strong, span")]
                    .filter(element => {
                        const rect = element.getBoundingClientRect();
                        return rect.width > 0 &&
                            rect.height > 0 &&
                            (element.scrollWidth > Math.ceil(element.clientWidth) + 1 ||
                                element.scrollHeight > Math.ceil(element.clientHeight) + 1);
                    })
                    .slice(0, 8)
                    .map(element => ({
                        tag: element.tagName.toLowerCase(),
                        text: element.textContent.trim().slice(0, 80),
                        className: element.className?.toString() || ""
                    }));

                const tapIssues = [...document.querySelectorAll("a, button, summary, input, select")]
                    .filter(element => {
                        const rect = element.getBoundingClientRect();
                        if(rect.width === 0 || rect.height === 0){
                            return false;
                        }
                        return rect.width < 40 || rect.height < 40;
                    })
                    .slice(0, 8)
                    .map(element => ({
                        tag: element.tagName.toLowerCase(),
                        text: element.textContent.trim().slice(0, 80) || element.getAttribute("aria-label") || element.id || element.name || "",
                        width: Math.round(element.getBoundingClientRect().width),
                        height: Math.round(element.getBoundingClientRect().height)
                    }));

                return {
                    title: document.title,
                    width: window.innerWidth,
                    height: window.innerHeight,
                    scrollWidth: documentElement.scrollWidth,
                    clientWidth: documentElement.clientWidth,
                    bodyScrollWidth: body.scrollWidth,
                    bodyClientWidth: body.clientWidth,
                    scrollHeight: documentElement.scrollHeight,
                    horizontalOverflow: documentElement.scrollWidth > documentElement.clientWidth + 1,
                    fixedElements,
                    clippedText,
                    tapIssues
                };
            });

            const screenshot = join(OUT_DIR, `${viewport.name}-${target.name}.png`);
            await page.screenshot({
                path: screenshot,
                fullPage: true
            });

            results.push({
                viewport,
                page: target,
                status: response?.status() || 0,
                screenshot,
                metrics,
                consoleMessages,
                pageErrors
            });

            await page.close();
        }

        await context.close();
    }
}finally{
    await browser.close();
}

const summaryPath = join(OUT_DIR, "qa-summary.json");
await writeFile(summaryPath, JSON.stringify(results, null, 2));

const failures = results.filter(result =>
    result.status >= 400 ||
    result.metrics.horizontalOverflow ||
    result.pageErrors.length > 0 ||
    result.consoleMessages.some(message => !/Failed to load resource: the server responded with a status of 404/.test(message))
);

console.log(`QA screenshots: ${OUT_DIR}`);
console.log(`QA summary: ${summaryPath}`);
console.log(`Checked ${results.length} page/viewports`);

if(failures.length){
    console.log(JSON.stringify(failures.map(result => ({
        viewport: result.viewport.name,
        page: result.page.name,
        status: result.status,
        overflow: result.metrics.horizontalOverflow,
        consoleMessages: result.consoleMessages,
        pageErrors: result.pageErrors,
        clippedText: result.metrics.clippedText,
        tapIssues: result.metrics.tapIssues
    })), null, 2));
    process.exitCode = 1;
}
