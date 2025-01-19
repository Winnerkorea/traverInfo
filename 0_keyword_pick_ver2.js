const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const axios = require("axios");
const sharp = require("sharp");

// JSON 파일 경로
const locationFilePath = path.join(__dirname, "location", "location.json");
const outputFilePath = path.join(__dirname, "keyword", "keyword.json");
const imageFolderPath = path.join(__dirname, "image");

async function scrapeImages(browser, href) {
  const page = await browser.newPage();

  // HTTP 헤더 설정
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  };
  await page.setExtraHTTPHeaders(headers);

  await page.goto(href, { waitUntil: "networkidle2" });

  try {
    // 사진 버튼 클릭
    await page.click(".ViewPhoto-sc-1cf7l4d-12");

    // 새 창 추적
    const target = await browser.waitForTarget((target) =>
      target.url().includes("some-expected-url-part")
    );
    const newPage = await target.page();
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 새 창 로드 대기

    // 작은 이미지 요소 가져오기
    const imgElements = await newPage.$$(".gl-index_popular-item-pic");

    // 이미지 폴더 생성 및 기존 이미지 삭제
    if (!fs.existsSync(imageFolderPath)) {
      fs.mkdirSync(imageFolderPath);
    } else {
      fs.readdirSync(imageFolderPath).forEach((file) => {
        fs.unlinkSync(path.join(imageFolderPath, file));
      });
    }

    // 큰 이미지 다운로드 및 저장 함수
    const downloadAndSaveImage = async (imgElement, index) => {
      const alt = await newPage.evaluate((el) => el.alt, imgElement);
      await imgElement.click();
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 클릭 후 대기

      const largeImageUrl = await newPage.evaluate(() => {
        const img = document.querySelector(
          ".image-gallery-slide.center .image-gallery-image img"
        );
        return img?.src || null;
      });

      if (largeImageUrl) {
        const response = await axios.get(largeImageUrl, {
          responseType: "arraybuffer",
        });
        const cleanAlt = alt
          .replace(/\s+/g, "_")
          .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ_-]/g, "");
        const outputPath = path.join(
          imageFolderPath,
          `${cleanAlt}_${index + 1}.webp`
        );
        await sharp(response.data).webp().toFile(outputPath);
        console.log(`이미지 ${outputPath}가 저장되었습니다.`);
      }

      // 팝업 닫기
      const closeButton = await newPage.$(".gl-cpt_imagallery-header-close");
      if (closeButton) {
        await closeButton.click();
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 닫기 후 대기
      }
    };

    // 이미지 저장 작업 수행
    for (let i = 0; i < imgElements.length; i++) {
      await downloadAndSaveImage(imgElements[i], i);
    }

    return true;
  } catch (err) {
    console.log("이미지 수집 중 오류:", err);
    return false;
  } finally {
    await page.close(); // 페이지를 닫아 리소스를 정리
  }
}

// 비동기 함수 실행
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    ignoreHTTPSErrors: true,
    args: [
      "--disable-http2",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--disable-blink-features=AutomationControlled",
      "--ignore-certificate-errors",
    ],
  });

  try {
    const data = await fs.promises.readFile(locationFilePath, "utf-8");
    const locations = JSON.parse(data);

    while (true) {
      const items = [];

      // 각 지역별로 title, href, img 수집
      for (const region in locations) {
        if (locations.hasOwnProperty(region)) {
          const places = locations[region];
          places.forEach((place) => {
            items.push({
              title: place.title,
              href: place.href,
              img: place.img,
            });
          });
        }
      }

      // 랜덤으로 item 선택
      const randomIndex = Math.floor(Math.random() * items.length);
      const randomItem = items[randomIndex];
      const href = randomItem.href; // href 변수 정의

      // 결과를 keyword.json 파일에 저장
      if (!fs.existsSync(path.dirname(outputFilePath))) {
        fs.mkdirSync(path.dirname(outputFilePath));
      }

      await fs.promises.writeFile(
        outputFilePath,
        JSON.stringify(randomItem, null, 2),
        "utf-8"
      );
      console.log(`랜덤 아이템이 ${outputFilePath}에 저장되었습니다.`);

      const success = await scrapeImages(browser, href);
      if (success) break; // 이미지 수집에 성공하면 루프를 종료
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close(); // 항상 브라우저를 닫아 리소스를 정리
  }
})();
