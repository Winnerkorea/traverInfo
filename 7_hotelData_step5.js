const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  try {
    // 1) keyword.json 경로 정의 및 데이터 읽기
    const jsonPath = path.join(__dirname, "keyword", "keyword.json");
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    // 2) keyword.json에서 메인 링크(href) 가져오기
    const mainHref = jsonData.href;
    if (!mainHref) {
      throw new Error("keyword.json에 href가 없습니다.");
    }

    // 3) Puppeteer 실행 (headless: true로 창이 뜨지 않음, 화면크기 1980×1080)
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: {
        width: 1980,
        height: 1080,
      },
    });
    const page = await browser.newPage();

    // 4) 메인 링크로 이동 후 네트워크 대부분 끝날 때까지 대기
    await page.goto(mainHref, { waitUntil: "networkidle2" });

    // 5) 특정 data-exposure-content 값 가진 a 태그 대기 후, href 추출
    const selector =
      'a[data-exposure-content="districtId=234&actionCode=tgs_dstdetail_expo_dstnav_bar&actionType=view&is_jump=0&districtType=3&locale=ko-KR&tabPosition=2&typeId=hotel&tabName=호텔"]';
    await page.waitForSelector(selector, { visible: true });

    // 6) hotelHref(숙소 목록 링크) 가져오기
    const hotelHref = await page.$eval(selector, (el) => el.href);
    console.log("[INFO] Found hotelHref:", hotelHref);

    // 7) hotelHref를 keyword.json에 저장
    jsonData.hotelHref = hotelHref;

    // 8) hotelRateStar = hotelHref + listFilters
    const listFilters =
      "&listFilters=6~3*6*3*2%2C16~4*16*4*2%2C16~5*16*5*2%2C17~1*17*1*2%2C80~2~1*80*2*2";
    const hotelRateStar = hotelHref + listFilters;
    jsonData.hotelRateStar = hotelRateStar;
    console.log("[INFO] Created hotelRateStar:", hotelRateStar);

    // 9) 변경된 JSON 다시 파일에 저장
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
    console.log(
      "[INFO] keyword.json에 hotelHref, hotelRateStar가 저장되었습니다."
    );

    // 10) 브라우저 종료
    await browser.close();
  } catch (error) {
    console.error("[ERROR]", error);
  }
})();
