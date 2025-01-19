const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  try {
    // 1. JSON 파일 경로 설정 및 데이터 읽기
    const jsonPath = path.join(__dirname, "keyword", "keyword.json");
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    // 2. JSON에서 mainHref 가져오기
    const mainHref = jsonData.href;
    if (!mainHref) {
      throw new Error("keyword.json에 href가 없습니다.");
    }

    // 3. Puppeteer 브라우저 실행
    const browser = await puppeteer.launch({
      headless: false, // 디버깅용으로 headless 모드 끄기
      defaultViewport: {
        width: 1980,
        height: 1080,
      },
    });
    const page = await browser.newPage();

    // 4. User-Agent 및 네트워크 설정
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    console.log("[INFO] Navigating to:", mainHref);

    // 5. mainHref로 이동 및 네트워크 완료 대기
    await page.goto(mainHref, { waitUntil: "networkidle2" });

    // 6. 선택자 정의 (속성, 클래스, 위치 기반 선택자 조합)
    const selector =
      'a.NavItem-sc-1slirxi-3.burited_point[data-exposure-content*="districtId=535"]:nth-child(2)';

    console.log("[INFO] Waiting for selector...");
    await page.waitForSelector(selector, { visible: true, timeout: 60000 });

    // 7. 선택된 요소에서 href 추출
    console.log("[INFO] Extracting href...");
    const hotelHref = await page.$eval(selector, (el) => el.href);
    console.log("[INFO] Found hotelHref:", hotelHref);

    // 8. 필터 추가 및 JSON 데이터 업데이트
    const listFilters =
      "&listFilters=6~3*6*3*2%2C16~4*16*4*2%2C16~5*16*5*2%2C17~1*17*1*2%2C80~2~1*80*2*2";
    const hotelRateStar = hotelHref + listFilters;
    console.log("[INFO] Created hotelRateStar:", hotelRateStar);

    jsonData.hotelHref = hotelHref;
    jsonData.hotelRateStar = hotelRateStar;

    // 9. JSON 데이터 파일에 저장
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
    console.log(
      "[INFO] Updated keyword.json with hotelHref and hotelRateStar."
    );

    // 10. 브라우저 종료
    await browser.close();
    console.log("[INFO] Browser closed successfully.");
  } catch (error) {
    // 오류 처리 및 디버깅 로그 출력
    console.error("[ERROR]", error);

    // 현재 페이지 HTML 저장 (디버깅용)
    if (typeof page !== "undefined") {
      const pageContent = await page.content();
      fs.writeFileSync("debug.html", pageContent, "utf-8");
      console.log("[DEBUG] Saved page content to debug.html for analysis.");
    }
  }
})();
