const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// /keyword/keyword.json 파일 읽기
const readJSONFile = async (filePath) => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading JSON file:', err);
    throw err;
  }
};

// HTML 페이지 가져오기
async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
      },
    });
    return data;
  } catch (error) {
    console.error(`Error fetching HTML from ${url}:`, error);
    return null;
  }
}

function cleanLink(link) {
  const httpsIndex = link.indexOf('http');
  return httpsIndex !== -1 ? link.substring(httpsIndex) : link;
}

async function fetchRelatedKeywords(keyword) {
  const url = `https://www.google.com/complete/search?q=${encodeURIComponent(
    keyword
  )}&cp=6&client=gws-wiz&xssi=t&gs_pcrt=undefined&hl=ko&authuser=0&psi=PslXZuuKEtvC1e8P3Ibd6Q8.1717029182520&dpr=1&pq=%EA%B5%AC%EA%B8%80%20%EC%97%B0%EA%B4%80%EA%B2%80%EC%83%89%EC%96%B4%20%EC%BF%BC%EB%A6%AC`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
      },
    });
    const jsonResponse = JSON.parse(data.substring(5));
    return jsonResponse[0].map((item) => item[0].replace(/<[^>]*>?/gm, '')); // HTML 태그 제거
  } catch (error) {
    console.error(`Error fetching related keywords for ${keyword}:`, error);
    return [];
  }
}

async function scrapeTitlesDescriptionsAndUrls(keyword, originalTitle) {
  const encodedKeyword = encodeURIComponent(keyword);
  const url = `https://www.google.com/search?q=${encodedKeyword}&sca_esv=92065aeb206c8c78&sca_upv=1&sxsrf=ADLYWIJsmXM185q4oCU-eUr2UKNu6gclTg:1717026772072&source=hp&ei=1L9XZu-HAu2Vvr0Pg4G7mAI&iflsig=AL9hbdgAAAAAZlfN5BzBivaCyHznzVwaTxUDAXgc99UT&udm=&ved=0ahUKEwjvwcSWh7SGAxXtiq8BHYPADiMQ4dUDCBc&uact=5&oq=${encodedKeyword}&gs_lp=Egdnd3Mtd2l6IgbrnbzrqbQyCBAuGIAEGLEDMgsQABiABBixAxiDATILEAAYgAQYsQMYgwEyBRAAGIAEMgUQABiABDIFEAAYgAQyBRAAGIAEMgsQABiABBixAxiDATIFEAAYgAQyBRAAGIAESKGLAVDlBVi3GXAEeACQAQGYAXygAcYFqgEDMC42uAEDyAEA-AEBmAIIoAKEBKgCCsICBxAjGCcY6gLCAgoQIxiABBgnGIoFwgIMECMYgAQYExgnGIoFwgIREC4YgAQYsQMY0QMYgwEYxwHCAgsQLhiABBixAxiDAcICBBAAGAPCAgUQLhiABMICBBAjGCfCAggQABiABBixA5gDCZIHAzQuNKAHv0o&sclient=gws-wiz`;

  const html = await fetchHTML(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const searchResults = [];
  const relatedKeywords = await fetchRelatedKeywords(keyword);

  $('div.Gx5Zad.fP1Qef.xpd.EtOod.pkphOe').each((index, element) => {
    const title = $(element).find('h3').text();
    const description = $(element).find('.BNeawe.s3v9rd.AP7Wnd').text();
    let link = $(element).find('a').attr('href');
    link = cleanLink(link);

    if (title && description && link) {
      searchResults.push({ title, description, link });
    }
  });

  const resultData = {
    keyword,
    searchResults,
    relatedKeywords,
  };

  const date = new Date();
  const formattedDate = `${date.getFullYear().toString().slice(2)}${(
    date.getMonth() + 1
  )
    .toString()
    .padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  const filename = `${originalTitle}_results_${formattedDate}.json`;
  const directory = path.join(__dirname, 'results', formattedDate);
  const filePath = path.join(directory, filename);

  if (!fs.existsSync(directory)) {
    try {
      fs.mkdirSync(directory, { recursive: true }); // 폴더 생성 (하위 폴더까지 생성)
    } catch (err) {
      console.error('Error creating directory:', err);
      throw err;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(resultData, null, 2));
  console.log(`결과 수집 완료! ${filePath} 파일을 확인하세요.`);

  // 결과를 /txt/today.txt 파일에 날짜 정보만 저장 (기존 내용 삭제)
  const todayFilePath = path.join(__dirname, 'txt', 'today.txt');
  fs.writeFileSync(todayFilePath, `${formattedDate}\n`);
  console.log(`Today's date added to ${todayFilePath}`);
}

async function getKeywordFromFile() {
  const jsonFilePath = path.join(__dirname, 'keyword', 'keyword.json');
  try {
    const data = await readJSONFile(jsonFilePath);
    const keyword = `${data.title} 여행`;
    if (!keyword) {
      throw new Error('keyword.json 파일에 유효한 키워드가 없습니다.');
    }
    return { keyword, originalTitle: data.title };
  } catch (error) {
    throw new Error(
      'keyword.json 파일을 읽는 중 오류가 발생했습니다: ' + error.message
    );
  }
}

(async () => {
  try {
    const { keyword, originalTitle } = await getKeywordFromFile();
    await scrapeTitlesDescriptionsAndUrls(keyword, originalTitle);
  } catch (error) {
    console.error('Error:', error);
  }
})();
