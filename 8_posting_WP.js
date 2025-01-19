const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config(); // dotenv 패키지 로드
const FormData = require("form-data"); // form-data 패키지 로드

// 워드프레스 설정 (환경 변수에서 로드)
const WP_BASE_URL = process.env.WP_URL;
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;
const CATEGORY_ID = parseInt(process.env.CATEGORY_ID, 10); // 환경변수에서 카테고리 ID 로드

// Base64 인코딩된 인증 정보
const auth = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");

// 전체 URL 구성
const WP_URL = `${WP_BASE_URL}/wp-json/wp/v2/posts`;
const WP_TAGS_URL = `${WP_BASE_URL}/wp-json/wp/v2/tags`;
const WP_MEDIA_URL = `${WP_BASE_URL}/wp-json/wp/v2/media`;

// JSON 파일 경로
const JSON_FILE_PATH = "./articles/article.json";
const IMAGE_DIR = "./image"; // 이미지 디렉토리 경로
const DUMMY_IMAGE_DIR = "./dummy"; // 더미 이미지 디렉토리 경로

// 태그 이름을 태그 ID로 변환하는 함수
async function getOrCreateTagIds(tagNames) {
  const tagIds = [];

  for (const tagName of tagNames) {
    let tagId = await getTagIdByName(tagName);

    if (!tagId) {
      tagId = await createTag(tagName);
    }

    if (tagId) {
      tagIds.push(tagId);
    }
  }

  return tagIds;
}

// 이름으로 태그 ID를 가져오는 함수
async function getTagIdByName(tagName) {
  try {
    const response = await axios.get(WP_TAGS_URL, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      params: {
        search: tagName,
      },
    });

    const tag = response.data.find((t) => t.name === tagName);
    return tag ? tag.id : null;
  } catch (error) {
    console.error(`Error getting tag by name: ${error.message}`);
    return null;
  }
}

// 새로운 태그를 생성하는 함수
async function createTag(tagName) {
  try {
    const response = await axios.post(
      WP_TAGS_URL,
      { name: tagName },
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.id;
  } catch (error) {
    console.error(`Error creating tag: ${error.message}`);
    return null;
  }
}

// 기존 포스팅 검색 함수
async function searchPostsByTitle(keyword) {
  try {
    const response = await axios.get(`${WP_URL}?search=${keyword}&per_page=3`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error(`Error searching posts by title: ${error.message}`);
    return [];
  }
}

// 최신 포스팅 가져오기 함수
async function getLatestPosts() {
  try {
    const response = await axios.get(
      `${WP_URL}?per_page=3&orderby=date&order=desc`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error getting latest posts: ${error.message}`);
    return [];
  }
}

// 이미지를 워드프레스에 업로드하는 함수
async function uploadImage(imagePath, title, count) {
  try {
    const imageFile = fs.createReadStream(imagePath);
    const fileName = `${title.replace(/\s+/g, "_")}_${count}.webp`;

    const form = new FormData();
    form.append("file", imageFile, fileName);

    const response = await axios.post(WP_MEDIA_URL, form, {
      headers: {
        Authorization: `Basic ${auth}`,
        ...form.getHeaders(),
      },
    });

    // [수정 1] 이미지 URL만 반환하던 부분을 미디어 객체 전체를 반환하도록 변경
    // 기존: return response.data.source_url;
    return response.data;
  } catch (error) {
    console.error(`Error uploading image: ${error.message}`);
    return null;
  }
}

// 태그 링크를 생성하는 함수
function createTagLink(tagName) {
  const tagUrl = `${WP_BASE_URL}/tag/${tagName.replace(/\s+/g, "-")}`;
  return `<a href="${tagUrl}" style="font-weight:bold;text-decoration:none;">${tagName}</a>`;
}

// 본문에서 태그를 링크로 변환하는 함수
function linkifyTags(content, tags) {
  tags.forEach((tag) => {
    const tagRegex = new RegExp(`(${tag})`, "i");
    content = content.replace(tagRegex, createTagLink(tag));
  });
  return content;
}

// JSON 파일 읽기 및 포스트 생성
fs.readFile(JSON_FILE_PATH, "utf8", async (err, data) => {
  if (err) {
    console.error(`Error reading JSON file: ${err.message}`);
    return;
  }

  const jsonData = JSON.parse(data);

  // 태그 이름을 태그 ID로 변환
  const tagNames = jsonData.tag;
  const tagIds = await getOrCreateTagIds(tagNames);

  // 포스트 데이터 변수 설정
  const POST_TITLE = jsonData.title;
  const POST_SLUG = jsonData.title;

  // 검색을 위한 첫 번째 단어 추출
  const firstWord = POST_TITLE.split(" ")[0];

  // 기존 포스팅 검색
  let relatedPosts = await searchPostsByTitle(firstWord);

  // 검색 결과가 없으면 최신 포스팅 가져오기
  if (relatedPosts.length === 0) {
    relatedPosts = await getLatestPosts();
  }

  // 관련 포스팅 링크 생성
  let relatedPostsContent = "<div><h3><b>관련 포스트</b></h3><ul>";
  relatedPosts.forEach((post) => {
    relatedPostsContent += `<li><a href="${WP_BASE_URL}/?p=${post.id}">${post.title.rendered}</a></li>`;
  });
  relatedPostsContent += "</ul></div>";

  // 이미지 파일 선택 및 업로드
  const imageFiles = fs
    .readdirSync(IMAGE_DIR)
    .filter((file) => file.endsWith(".webp"));
  const dummyImageFiles = [
    "dummy1.webp",
    "dummy2.webp",
    "dummy3.webp",
    "dummy4.webp",
    "dummy5.webp",
  ];
  const selectedImages = [];

  if (imageFiles.length === 0) {
    // 이미지 파일이 전혀 없으면 dummy 이미지 5개 모두 사용
    dummyImageFiles.forEach((file) =>
      selectedImages.push(path.join(DUMMY_IMAGE_DIR, file))
    );
  } else {
    // 이미지 파일이 5개 미만이면 부족한 수만큼 dummy 이미지에서 랜덤 선택
    imageFiles.forEach((file) =>
      selectedImages.push(path.join(IMAGE_DIR, file))
    );
    while (selectedImages.length < 5) {
      const randomDummyImage =
        dummyImageFiles[Math.floor(Math.random() * dummyImageFiles.length)];
      if (
        !selectedImages.includes(path.join(DUMMY_IMAGE_DIR, randomDummyImage))
      ) {
        selectedImages.push(path.join(DUMMY_IMAGE_DIR, randomDummyImage));
      }
    }
  }

  // 이미지 업로드
  const uploadedImages = await Promise.all(
    selectedImages.map((image, index) =>
      uploadImage(image, POST_TITLE, index + 1)
    )
  );

  // 대표 이미지(썸네일)로 사용할 ID
  let featuredImageId = null;
  if (uploadedImages.length > 0 && uploadedImages[0]?.id) {
    featuredImageId = uploadedImages[0].id;
  }

  // [수정 2] 본문에 이미지 삽입 시 uploadedImages[i].source_url 사용
  let POST_CONTENT = `<div><p>${jsonData.intro}</p></div>`;

  // 첫 번째 이미지
  if (uploadedImages[0] && uploadedImages[0].source_url) {
    POST_CONTENT += `<div style="text-align:center;">
      <img src="${uploadedImages[0].source_url}" alt="${POST_TITLE}" style="width:750px;"></div>`;
  }

  POST_CONTENT += `<div>`;
  jsonData.sections.forEach((section, index) => {
    const sectionTitle = section[`section${index + 1}`];

    // 두 번째 이미지
    if (index === 1 && uploadedImages[1]?.source_url) {
      POST_CONTENT += `<div style="text-align:center;">
        <img src="${uploadedImages[1].source_url}" alt="${POST_TITLE}" style="width:750px;"></div>`;
    }

    // 세 번째 이미지
    if (index === 2 && uploadedImages[2]?.source_url) {
      POST_CONTENT += `<div style="text-align:center;">
        <img src="${uploadedImages[2].source_url}" alt="${POST_TITLE}" style="width:750px;"></div>`;
    }

    // 네 번째 이미지
    if (index === 3 && uploadedImages[3]?.source_url) {
      POST_CONTENT += `<div style="text-align:center;">
        <img src="${uploadedImages[3].source_url}" alt="${POST_TITLE}" style="width:750px;"></div>`;
    }

    POST_CONTENT += `<div><h2><b>${sectionTitle}</b></h2>`;
    section[`contents${index + 1}`].forEach((content) => {
      if (typeof content === "string") {
        POST_CONTENT += `<p>${content}</p>`;
      } else if (typeof content === "object") {
        POST_CONTENT += `<h3><b>${content.sub_title}</b></h3><p>${content.sub_content}</p>`;
      }
    });
    POST_CONTENT += `</div>`;
  });

  // 다섯 번째 이미지
  if (uploadedImages[4] && uploadedImages[4].source_url) {
    POST_CONTENT += `<div style="text-align:center;">
      <img src="${uploadedImages[4].source_url}" alt="${POST_TITLE}" style="width:750px;"></div>`;
  }

  POST_CONTENT += `</div><h2><b>마무리</b></h2>
    <div><p>${jsonData.conclusion}</p></div>`;

  POST_CONTENT += `<div><h3><b>FAQ</b></h3>`;
  jsonData.FAQ.forEach((faq) => {
    POST_CONTENT += `<div><h4><b>${faq.question}</b></h4><p>${faq.answer}</p></div>`;
  });
  POST_CONTENT += `</div>`;

  POST_CONTENT += `<div><h3><b>관련 정보 더 보기</b></h3><ul>`;
  jsonData.References.forEach((reference) => {
    POST_CONTENT += `<li><b>${reference.name} - <a href="${reference.link}">${reference.link}</a></b></li>`;
  });
  POST_CONTENT += `</ul></div>`;

  POST_CONTENT += `
  <div class="eg-affiliate-banners" data-program="kr-expedia" data-network="pz" data-layout="leaderboard" data-image="sailing" data-message="bye-bye-bucket-list-hello-adventure" data-link="stays" data-camref="1011l3xtXH" data-pubref=""></div>
  <script class="eg-affiliate-banners-script" src="https://affiliates.expediagroup.com/products/banners/assets/eg-affiliate-banners.js"></script>
`;

  POST_CONTENT += `
  <div class="eg-widget" data-widget="search" data-program="kr-hcom" data-lobs="" data-network="pz" data-camref="1101l3xrSx"></div>
  <script class="eg-widgets-script" src="https://affiliates.expediagroup.com/products/widgets/assets/eg-widgets.js"></script>
`;

  // 관련 포스팅 링크 추가
  POST_CONTENT += relatedPostsContent;

  // 태그를 링크로 변환
  tagNames.forEach((tag) => {
    POST_CONTENT = linkifyTags(POST_CONTENT, [tag]);
  });

  // 나머지 포스트 데이터 변수 설정
  const POST_STATUS = "publish";
  const POST_AUTHOR = 1;
  const POST_FORMAT = "standard";
  const POST_EXCERPT = jsonData.description;
  const POST_COMMENT_STATUS = "closed";
  const POST_PING_STATUS = "closed";
  const POST_DATE = new Date().toISOString();
  const POST_DESCRIPTION = jsonData.description;

  // 대표 이미지 ID를 포함하여 postData 구성
  const postData = {
    title: POST_TITLE,
    content: POST_CONTENT,
    status: POST_STATUS,
    categories: [CATEGORY_ID],
    tags: tagIds,
    author: POST_AUTHOR,
    format: POST_FORMAT,
    excerpt: POST_EXCERPT,
    comment_status: POST_COMMENT_STATUS,
    ping_status: POST_PING_STATUS,
    date: POST_DATE,
    slug: POST_SLUG,
    featured_media: featuredImageId, // 대표 이미지 지정
    meta: {
      description: POST_DESCRIPTION,
    },
  };

  // 포스트 생성 함수
  async function createPost() {
    try {
      const response = await axios.post(WP_URL, postData, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 201) {
        console.log("Post created successfully.");
        console.log(`Post URL: ${WP_BASE_URL}/?p=${response.data.id}`);
      } else {
        console.log(`Failed to create post: ${response.statusText}`);
      }
    } catch (error) {
      if (error.response) {
        console.error("Error Response Data:", error.response.data);
      }
      console.error(`Error: ${error.message}`);
    }
  }

  // 포스트 생성 실행
  createPost();
});
