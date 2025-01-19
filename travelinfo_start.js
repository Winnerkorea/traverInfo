const { spawn } = require("child_process");

// 실행할 Node.js 파일 목록 (순서대로 입력)
const nodejsFiles = [
  "0_keyword_pick.js",
  "1_linktotext.js",
  "2_google_search.js",
  "3_analyze_step1.js",
  "4_outline_step2.js",
  "5_contents_step3.js",
  "6_etc_article_step4.js",
  "7_img_pixabay.js",
  "8_posting_WP.js",
];

// 각 파일 실행 간의 딜레이 (초)
const fileDelay = 10; // 10 seconds delay between files
const errorDelay = 300; // 5 minutes delay after an error

// 작업 디렉토리 설정 (필요에 따라 변경)
const workDir = "./";

(async () => {
  let currentFileIndex = 0;

  while (currentFileIndex < nodejsFiles.length) {
    const fileName = nodejsFiles[currentFileIndex];
    const filePath = `${workDir}/${fileName}`;

    console.log(`작업 시작: ${fileName}`);

    try {
      await runNodeFile(filePath);
      console.log(`** ${fileName} 파일 실행 완료! **`);
      currentFileIndex++;
      await delay(fileDelay * 1000);
    } catch (err) {
      console.error(`** ${fileName} 파일 실행 오류 발생: ${err.message} **`);
      console.log(`${errorDelay}초 후 처음부터 다시 시작합니다...`);
      await delay(errorDelay * 1000);
      currentFileIndex = 0; // 처음부터 다시 시작
    }
  }

  console.log("모든 작업이 완료되었습니다. 스크립트를 종료합니다.");
})();

// Node.js 파일 실행 함수
function runNodeFile(filePath) {
  return new Promise((resolve, reject) => {
    const process = spawn("node", [filePath], { cwd: workDir });

    process.stdout.on("data", (data) => {
      console.log(`[STDOUT] ${data}`);
    });

    process.stderr.on("data", (data) => {
      console.error(`[STDERR] ${data}`);
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`프로세스 종료 코드: ${code}`));
      }
    });
  });
}

// 딜레이 함수
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
