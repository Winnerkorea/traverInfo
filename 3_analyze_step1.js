const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config(); // .env 파일에서 환경 변수 불러오기

// 환경 변수에서 API 키를 가져옵니다.
const apiKey = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// /keyword/keyword.json 파일 읽기
const jsonFilePath = path.join(__dirname, "keyword", "keyword.json");
const readJSONFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading JSON file:", err);
    throw err;
  }
};

// JSON 파일 쓰기
const writeJSONFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing JSON file:", err);
    throw err;
  }
};

// JSON 파일 데이터 읽기
const jsonData = readJSONFile(jsonFilePath);
const keyword = `${jsonData.title} 여행`;
if (!keyword) {
  throw new Error("keyword.json 파일에 유효한 키워드가 없습니다.");
}

// today.txt에서 날짜 읽기
const todayFilePath = path.join(__dirname, "txt", "today.txt");
const formattedDate = fs.readFileSync(todayFilePath, "utf8").trim();
if (!formattedDate) {
  throw new Error("today.txt 파일에서 날짜를 읽는 중 오류가 발생했습니다.");
}

// JSON 파일 경로 생성
const resultFilePath = path.join(
  __dirname,
  "results",
  formattedDate,
  `${jsonData.title}_results_${formattedDate}.json`
);

// JSON 파일 읽기
const rawData = fs.readFileSync(resultFilePath, "utf8");
const searchData = JSON.parse(rawData);

const keywordFromData = searchData.keyword;
const relatedKeywords = searchData.relatedKeywords.join(", ");

const titlesAndDescriptions = searchData.searchResults
  .map((result) => {
    return `title: ${result.title}, description: ${result.description}`;
  })
  .join("\n");

// step1_analyze.txt에서 질문 템플릿 읽기
const questionTemplate = fs.readFileSync(
  path.join(__dirname, "txt", "step1_analyze.txt"),
  "utf8"
);

// 질문 템플릿에 데이터 삽입
const question = questionTemplate
  .replace("[${keywordFromData}]", keywordFromData)
  .replace("[${titlesAndDescriptions}]", titlesAndDescriptions)
  .replace("[${relatedKeywords}]", relatedKeywords);

async function generateContentWithRetries(question, retries = 10) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(question, {
        response_mime_type: "application/json",
      });

      const response = result.response;
      const text = await response.text();

      const jsonStartIndex = text.indexOf("{");
      const jsonEndIndex = text.lastIndexOf("}") + 1;
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

    // 응답을 keyword.json 파일에 추가 (apiResponse 대신 target 사용)
    jsonData.target = responseData;
    writeJSONFile(jsonFilePath, jsonData);
    console.log(`응답이 ${jsonFilePath}에 저장되었습니다.`);
  } catch (error) {
    console.error("API 요청 실패:", error);
  }
}

run();
