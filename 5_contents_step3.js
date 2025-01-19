const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config(); // .env 파일에서 환경 변수 불러오기

// 환경 변수에서 API 키를 가져옵니다.
const apiKey = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function generateContentWithRetries(prompt, retries = 10) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent([prompt], {
        response_mime_type: "text/plain", // 응답을 텍스트 형식으로 받음
      });

      const response = result.response;
      const text = await response.text();

      // 응답에서 JSON 부분만 추출
      let jsonString = text.match(/\[.*\]/s); // JSON 배열만 추출
      if (jsonString) {
        jsonString = jsonString[0]; // 매치된 JSON 배열만 사용
      } else {
        throw new Error("유효한 JSON 응답을 찾을 수 없습니다.");
      }

      const responseData = JSON.parse(jsonString);

      // 응답이 올바른 형식인지 확인
      if (
        Array.isArray(responseData) &&
        responseData.every((item) => item.sub_title && item.sub_content)
      ) {
        return responseData;
      } else {
        throw new Error("유효한 응답 형식이 아닙니다.");
      }
    } catch (error) {
      console.error(`API 요청 실패 ${attempt + 1}/${retries}:`, error);
      if (attempt < retries - 1) {
        console.log("10초 후 다시 시도합니다...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } else {
        console.log("10회 시도 후 실패. 코드를 종료합니다.");
        process.exit(1);
      }
    }
  }
}

async function processOutline(outlineData, outlineFilePath) {
  const questionTemplate = fs.readFileSync(
    path.join(__dirname, "txt", "step3_contents.txt"),
    "utf8"
  );

  for (let i = 0; i < outlineData.sections.length; i++) {
    const section = outlineData.sections[i];
    const sectionKey = `section${i + 1}`;
    const contentsKey = `contents${i + 1}`;

    if (!section[sectionKey] || !section[contentsKey]) {
      console.log(`섹션 ${i + 1}에 대한 데이터가 없습니다. 건너뜁니다.`);
      continue;
    }

    // 프롬프트 생성
    const prompt = questionTemplate
      .replace("[section_title]", section[sectionKey])
      .replace("[section_description]", section[contentsKey]);

    const responseData = await generateContentWithRetries(prompt);

    console.log(`섹션 ${i + 1} 응답 완료: 저장 중...`);

    // 기존 contents 항목 유지 및 새로운 데이터 추가
    if (!Array.isArray(section[contentsKey])) {
      section[contentsKey] = [section[contentsKey]];
    }
    section[contentsKey].push(...responseData);

    // 실시간으로 outline 파일 업데이트
    fs.writeFileSync(outlineFilePath, JSON.stringify(outlineData, null, 2));
    console.log(`섹션 ${i + 1} 저장 완료.`);
    console.log(`10초 대기 후 섹션 ${i + 2} 진행...`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  return outlineData;
}

async function run() {
  const today = fs
    .readFileSync(path.join(__dirname, "txt", "today.txt"), "utf8")
    .trim();
  const keywordData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "keyword", "keyword.json"), "utf8")
  );
  const title = keywordData.title;

  const outlineFilePath = path.join(
    __dirname,
    "results",
    today,
    `${title}_outline_${today}.json`
  );
  const outlineData = JSON.parse(fs.readFileSync(outlineFilePath, "utf8"));

  const updatedOutlineData = await processOutline(outlineData, outlineFilePath);

  const articlesDir = path.join(__dirname, "articles");

  // 폴더가 없으면 생성, 있으면 내용 삭제
  if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir);
  } else {
    fs.readdirSync(articlesDir).forEach((file) => {
      fs.unlinkSync(path.join(articlesDir, file));
    });
  }

  const articleFilePath = path.join(articlesDir, "article.json");
  fs.writeFileSync(
    articleFilePath,
    JSON.stringify(updatedOutlineData, null, 2)
  );
  console.log(`최종 데이터 저장 완료: ${articleFilePath}`);
}

run();
