require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

const KEYWORD_FILE_PATH = path.join(__dirname, 'keyword', 'keyword.json');
const IMAGE_FOLDER_PATH = path.join(__dirname, 'image');

// 이미지 폴더 설정 및 초기화
function initializeImageFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
    console.log(`Created image folder: ${folderPath}`);
  } else {
    // 기존 파일 삭제
    fs.readdirSync(folderPath).forEach((file) => {
      fs.unlinkSync(path.join(folderPath, file));
    });
    console.log(`Cleared existing images in folder: ${folderPath}`);
  }
}

// 키워드 파일 읽기
function readKeywordFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    console.log(`Read keywords from file: ${filePath}`);
    const parsedData = JSON.parse(data);
    if (typeof parsedData.title === 'string') {
      return `${parsedData.title} 여행`;
    }
    return null;
  } catch (error) {
    console.error('Error reading keyword file:', error);
    return null;
  }
}

// 이미지 다운로드
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            console.log(`Downloaded image to: ${filepath}`);
            resolve();
          });
        });
      })
      .on('error', (err) => {
        fs.unlink(filepath, () => {
          console.error(`Error downloading image: ${err.message}`);
          reject(err);
        });
      });
  });
}

// 이미지 요청
async function getImages(query, perPage = 10) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodedQuery}&per_page=${perPage}&lang=ko&image_type=photo&safesearch=true`;

    console.log(`Sending API request for query: "${query}"`);

    const response = await axios.get(url);
    const results = response.data.hits;

    console.log(`Received ${results.length} images for query: "${query}"`);

    return results.map((photo) => photo.webformatURL);
  } catch (error) {
    console.error(`Error fetching images for query "${query}":`, error);
    return [];
  }
}

// 이미지 요청 - travel 키워드로
async function getRandomTravelImages(perPage = 20) {
  try {
    const encodedQuery = encodeURIComponent('travel');
    const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodedQuery}&per_page=${perPage}&lang=ko&image_type=photo&safesearch=true`;

    console.log(`Sending API request for random travel images`);

    const response = await axios.get(url);
    const results = response.data.hits;

    console.log(`Received ${results.length} travel images`);

    return results.map((photo) => photo.webformatURL);
  } catch (error) {
    console.error('Error fetching travel images:', error);
    return [];
  }
}

// 메인 함수
async function main() {
  console.log('Starting image download script...');

  initializeImageFolder(IMAGE_FOLDER_PATH);
  const keyword = readKeywordFile(KEYWORD_FILE_PATH);

  if (!keyword) {
    console.error('No valid keyword found in the keyword file.');
    return;
  }

  const sanitizedTag = keyword.replace(/\s+/g, ' ').trim();
  console.log(`Fetching images for keyword: "${sanitizedTag}"`);
  let imageUrls = await getImages(sanitizedTag, 10); // 10개의 이미지를 요청

  if (imageUrls.length < 5) {
    console.log(
      `Not enough images found for keyword. Fetching additional travel images...`
    );
    const travelImages = await getRandomTravelImages(20);
    const randomImages = travelImages
      .filter((url) => !imageUrls.includes(url))
      .sort(() => 0.5 - Math.random())
      .slice(0, 10 - imageUrls.length); // 필요한 만큼만 추가
    imageUrls = imageUrls.concat(randomImages);
  }

  if (imageUrls.length === 0) {
    console.error('No images found for the given keyword.');
    return;
  }

  let imageIndex = 1;
  for (const imageUrl of imageUrls) {
    const imageFilePath = path.join(
      IMAGE_FOLDER_PATH,
      `image${imageIndex}.webp`
    );
    await downloadImage(imageUrl, imageFilePath);
    imageIndex++;
  }

  console.log('All images have been downloaded.');
}

main();
