const puppeteer = require("puppeteer");
const fs = require("fs");

async function convertHtmlToPdf(htmlPath, pdfPath) {
  try {
    const browser = await puppeteer.launch({
      executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    });
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
    await page.pdf({ path: pdfPath, format: "A4" });
    await browser.close();
    fs.unlinkSync(htmlPath); // Remove the HTML file after conversion
    return true; // Indicate success
  } catch (error) {
    console.error("Error converting HTML to PDF:", error);
    return false; // Indicate failure
  }
}

module.exports = { convertHtmlToPdf };
