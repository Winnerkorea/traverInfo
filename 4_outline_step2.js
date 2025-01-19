const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config(); // .env 파일에서 환경 변수 불러오기

// 환경 변수에서 API 키를 가져옵니다.
const apiKey = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// JSON 파일 읽기 함수
const readJSONFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading JSON file:", err);
    throw err;
  }
};

// 파일 경로 설정
const jsonFilePath = path.join(__dirname, "keyword", "keyword.json");
const todayFilePath = path.join(__dirname, "txt", "today.txt");
const outlineTemplatePath = path.join(__dirname, "txt", "step2_outline.txt");

// JSON 파일 데이터 읽기
const jsonData = readJSONFile(jsonFilePath);
const title = jsonData.title;
const titlepick = jsonData.target.titlepick;

// today.txt에서 날짜 읽기
const formattedDate = fs.readFileSync(todayFilePath, "utf8").trim();
if (!formattedDate) {
  throw new Error("today.txt 파일에서 날짜를 읽는 중 오류가 발생했습니다.");
}

// step2_outline.txt에서 질문 템플릿 읽기
const questionTemplate = fs.readFileSync(outlineTemplatePath, "utf8");

// 질문 템플릿에 keyword.json의 내용 추가
const question = `
${questionTemplate
  .replace("[${title}]", `${title} 여행`)
  .replace("${titlepick}", titlepick)}

키워드에 대한 정보:
${JSON.stringify(jsonData, null, 2)}
`;

async function generateContentWithRetries(question, retries = 10) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(question, {
        response_mime_type: "application/json",
      });

      const response = result.response;
      const text = await response.text();

      // JSON 파싱 전 응답 내용 확인
      const jsonStartIndex = text.indexOf("{");
      const jsonEndIndex = text.lastIndexOf("}") + 1;
      if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error("응답에 유효한 JSON 데이터가 없습니다.");
      }

      const jsonString = text.slice(jsonStartIndex, jsonEndIndex);
      const responseData = JSON.parse(jsonString);
      return responseData;
    } catch (error) {
      console.error(`API 요청 실패 (시도 ${attempt}/${retries}):`, error);
      if (attempt < retries) {
        console.log("10초 후 다시 시도합니다...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } else {
        console.log("10회 시도 후 실패. 코드를 종료합니다.");
        process.exit(1);
      }
    }
  }
}

async function run() {
  try {
    const responseData = await generateContentWithRetries(question);

    // 결과를 저장할 디렉토리 경로 생성
    const outputDirectory = path.join(__dirname, "results", formattedDate);
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    // 응답을 "title_outline_YYMMDD.json" 파일에 저장
    const outputFilePath = path.join(
      outputDirectory,
      `${title}_outline_${formattedDate}.json`
    );
    fs.writeFileSync(outputFilePath, JSON.stringify(responseData, null, 2));
    console.log(`응답이 ${outputFilePath}에 저장되었습니다.`);
  } catch (error) {
    console.error("API 요청 실패:", error);
  }
}

run();
