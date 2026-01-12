// crawler.js

import puppeteer from "puppeteer-core";
import chromium from "chromium";




export async function crawlWebsite(url) {


const browser = await puppeteer.launch({
  executablePath: chromium.path,
  headless: true,
});


  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const title = await page.title();

  const description = await page.$eval(
    'meta[name="description"]',
    el => el.content
  ).catch(() => '');

  const headings = await page.$$eval('h1,h2,h3', els => els.map(el => el.innerText.trim()));
  const links = await page.$$eval('a', els => els.map(el => el.href));

  await browser.close();

  return { title, description, headings, links };
}
