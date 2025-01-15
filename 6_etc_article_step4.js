const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // .env 파일에서 환경 변수 불러오기

// 환경 변수에서 API 키를 가져옵니다.
const apiKey = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// API 요청과 재시도 로직
async function generateContentWithRetries(prompt, retries = 10) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent([prompt], {
        response_mime_type: 'application/json',
      });

      const response = result.response;
      const text = await response.text();

      // JSON 부분만 추출
      const jsonStartIndex = text.indexOf('{');
      const jsonEndIndex = text.lastIndexOf('}') + 1;

      if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error('유효한 JSON 응답을 찾을 수 없습니다.');
      }

      const jsonString = text.slice(jsonStartIndex, jsonEndIndex);
      const responseData = JSON.parse(jsonString);

      return responseData;
    } catch (error) {
      console.error(`API 요청 실패 (시도 ${attempt}/${retries}):`, error);
      if (attempt < retries) {
        console.log('10초 후 다시 시도합니다...');
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } else {
        console.log('10회 시도 후 실패. 코드를 종료합니다.');
        process.exit(1);
      }
    }
  }
}

async function run() {
  // step4_etc.txt에서 프롬프트 지침 읽기
  const step4EtcPath = path.join(__dirname, 'txt', 'step4_etc.txt');
  const step4Etc = fs.readFileSync(step4EtcPath, 'utf8');

  // article.json에서 컨텐츠 읽기
  const articlePath = path.join(__dirname, 'articles', 'article.json');
  const articleContent = JSON.parse(fs.readFileSync(articlePath, 'utf8'));

  // keyword.json에서 target 정보 읽기
  const keywordPath = path.join(__dirname, 'keyword', 'keyword.json');
  const keywordData = JSON.parse(fs.readFileSync(keywordPath, 'utf8'));
  const targetData = keywordData.target;

  // 프롬프트 생성
  const prompt = `${step4Etc}\n\n타겟 정보: ${JSON.stringify(
    targetData,
    null,
    2
  )}\n\n기사 내용:\n${JSON.stringify(articleContent, null, 2)}`;

  try {
    const responseData = await generateContentWithRetries(prompt);

    // 응답을 기존 article.json 파일에 업데이트
    Object.assign(articleContent, responseData);

    fs.writeFileSync(
      articlePath,
      JSON.stringify(articleContent, null, 2),
      'utf8'
    );
    console.log(`응답이 ${articlePath}에 저장되었습니다.`);
  } catch (error) {
    console.error('API 요청 실패:', error);
  }
}

run();
