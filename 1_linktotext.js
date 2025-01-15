const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs').promises;

// JSON 파일 경로
const jsonFilePath = './keyword/keyword.json';

// JSON 파일 읽기
const readJSONFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading JSON file:', err);
    throw err;
  }
};

// JSON 파일 쓰기
const writeJSONFile = async (filePath, data) => {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing JSON file:', err);
    throw err;
  }
};

const fetchPageText = async (url) => {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2' });

    // 페이지 텍스트 추출
    const pageText = await page.evaluate(() => {
      // 제외할 클래스 리스트
      const excludeClasses = [
        'Container-sc-opldtq-0',
        'Container-sc-13plete-0',
      ];

      // 모든 텍스트 요소를 순회하며 제외할 클래스를 가진 요소를 제거
      const elements = document.querySelectorAll('*');
      elements.forEach((el) => {
        excludeClasses.forEach((className) => {
          if (el.classList.contains(className)) {
            el.remove();
          }
        });
      });

      const element = document.querySelector('#travel_guide_root_class');
      if (element) {
        return element.innerText.replace(/\s+/g, ' ').trim();
      }
      return '';
    });

    await browser.close();
    return pageText;
  } catch (error) {
    console.error(`Error fetching URL: ${url}`, error);
    return '';
  }
};

// 메인 함수
const main = async () => {
  try {
    const jsonData = await readJSONFile(jsonFilePath);

    if (jsonData.href) {
      console.log(`Fetching text for URL: ${jsonData.href}`);
      jsonData.text = await fetchPageText(jsonData.href);
    }

    await writeJSONFile(jsonFilePath, jsonData);
    console.log('JSON file has been updated with page text.');
  } catch (error) {
    console.error('Error processing JSON file:', error);
  }
};

main();
