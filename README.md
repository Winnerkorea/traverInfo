# traverInfo

# WordPress Posting Automation

이 프로젝트는 **Node.js**와 **WordPress REST API**를 사용하여, **JSON 파일**에 적힌 게시물 데이터를 자동으로 WordPress에 업로드하는 코드 예제입니다.  
자동 업로드 시, 여러 장의 이미지를 업로드한 뒤 본문에 삽입하고, 대표 이미지(썸네일)까지 지정할 수 있습니다.

---

## 주요 기능

1. **JSON 파일(article.json) 읽기**
   - 포스트 제목, 내용(intro, sections, conclusion, FAQ, References 등)을 가져옵니다.
2. **이미지 디렉토리**에서 5장 미만인 경우, **더미(dummy) 이미지**로 자동 보충
3. **이미지 업로드**
   - 업로드된 이미지의 `id`와 `source_url`을 가져옴
   - 본문 내에는 `source_url`을 사용하여 `<img>` 태그 삽입
   - 첫 번째 이미지 `id`를 이용해 **대표 이미지(썸네일)** 지정 가능
4. **태그 자동 생성**
   - JSON에 적힌 태그 목록이 이미 WordPress에 없으면 새로 생성
5. **기존 포스팅 검색** 또는 **최신 포스팅(relatedPosts)** 가져와 본문에 링크 삽입
6. **포스트 업로드**
   - `featured_media` 필드로 대표 이미지 등록
   - `meta` 필드로 description 메타데이터 설정
   - `comment_status`, `ping_status` 등을 통해 댓글/핑백 비활성화 등 가능

---

## 폴더 구조

```plaintext
.
├── articles
│   └── article.json
├── image
│   ├── example1.webp
│   └── example2.webp
├── dummy
│   ├── dummy1.webp
│   ├── dummy2.webp
│   └── ...
├── .env
├── README.md
└── index.js   (또는 원하는 파일명)
```

- **articles/article.json**: 업로드할 글 정보가 들어있습니다.
- **image/**: 실제 업로드할 이미지가 들어있는 폴더입니다.
- **dummy/**: 실제 이미지가 부족할 때 사용할 더미 이미지 폴더입니다.
- **.env**: WordPress 연결 정보(`WP_URL`, `WP_USER`, `WP_APP_PASSWORD` 등)와 카테고리 ID(`CATEGORY_ID`)가 들어있습니다.
- **index.js**: 이 README에서 설명하는 **Node.js 자동 업로드 코드**.

---

## 설치 및 환경 설정

1. **Node.js** 설치

   - Node.js v14 이상 권장

2. **프로젝트 클론 또는 다운로드**

   ```bash
   git clone https://github.com/your-repo/wordpress-post-automation.git
   cd wordpress-post-automation
   ```

3. **필요 패키지 설치**

   ```bash
   npm install
   ```

   - `axios`, `form-data`, `dotenv`, 등 패키지를 사용합니다.

4. **.env 파일 설정**
   ```plaintext
   WP_URL=https://example.com        # 워드프레스 주소(최상단 도메인)
   WP_USER=admin                    # 워드프레스 아이디
   WP_APP_PASSWORD=xxxxxxxxxxxxxxx  # 워드프레스 앱 비밀번호
   CATEGORY_ID=5                    # 업로드할 카테고리 ID
   ```
   - WordPress에서 **앱 비밀번호**(Application Password)를 발급받아 사용해야 합니다.
   - `CATEGORY_ID`는 워드프레스 관리자에서 확인 가능한 카테고리 ID입니다.

---

## article.json 예시

```json
{
  "title": "테스트 포스트",
  "tag": ["Node.js", "Automation"],
  "intro": "이 글은 Node.js로 작성한 테스트 포스트입니다.",
  "sections": [
    {
      "section1": "첫 번째 섹션",
      "contents1": [
        "첫 번째 섹션 내용입니다.",
        "이미지와 함께 설명을 이어갈 수 있습니다."
      ]
    },
    {
      "section2": "두 번째 섹션",
      "contents2": [
        {
          "sub_title": "세부 항목",
          "sub_content": "세부 설명 내용입니다."
        }
      ]
    }
  ],
  "conclusion": "마무리 내용입니다.",
  "FAQ": [
    {
      "question": "이 코드를 어디에 활용할 수 있나요?",
      "answer": "예: 자동 블로그 포스팅, 대량 업로드 등"
    }
  ],
  "References": [
    {
      "name": "공식 Node.js 문서",
      "link": "https://nodejs.org/en/docs/"
    }
  ],
  "description": "이 포스트는 Node.js 예시로 작성된 자동 업로드 글입니다."
}
```

---

## 실행 방법

1. **.env** 파일을 정확히 설정했는지 확인
2. **index.js**(또는 본문 코드가 있는 파일) 실행
   ```bash
   node index.js
   ```
3. 콘솔에 `Post created successfully.` 메시지가 뜨면 업로드 성공
4. 메시지에 표시된 URL(예: `https://example.com/?p=123`)을 클릭하여 게시물이 정상 등록되었는지 확인

---

## 코드 설명

### 1. `.env` 로드

```js
require("dotenv").config();
```

- `WP_URL`, `WP_USER`, `WP_APP_PASSWORD`, `CATEGORY_ID` 등을 가져옵니다.

### 2. 이미지 업로드 함수

```js
async function uploadImage(imagePath, title, count) {
  // ...
  const response = await axios.post(WP_MEDIA_URL, form, {
    headers: {
      Authorization: `Basic ${auth}`,
      ...form.getHeaders(),
    },
  });
  return response.data; // 전체 미디어 객체
}
```

- **`response.data.source_url`**: 이미지 경로
- **`response.data.id`**: 워드프레스 내 미디어 ID
- 대표 이미지로 설정하기 위해 `id`가 필요하고, 본문에 삽입하기 위해 `source_url`이 필요합니다.

### 3. 업로드된 이미지 활용

```js
const uploadedImages = await Promise.all(
  selectedImages.map((image, index) =>
    uploadImage(image, POST_TITLE, index + 1)
  )
);
```

- `uploadedImages`는 이미지 정보 객체 배열이 됩니다.
- 본문에 삽입 시: `uploadedImages[i]?.source_url`
- 대표 이미지 설정 시: `uploadedImages[0]?.id`

### 4. 대표 이미지(썸네일) 설정

```js
let featuredImageId = null;
if (uploadedImages.length > 0 && uploadedImages[0]?.id) {
  featuredImageId = uploadedImages[0].id;
}
```

- 이후, `postData`에 `featured_media: featuredImageId`를 지정합니다.

### 5. 최종 포스트 생성

```js
const postData = {
  title: POST_TITLE,
  content: POST_CONTENT,
  status: "publish",
  categories: [CATEGORY_ID],
  featured_media: featuredImageId,
  // ...
};

await axios.post(WP_URL, postData, {
  headers: {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
  },
});
```

- REST API를 통해 WordPress에 글을 업로드합니다.

---

## 주의 사항 및 팁

1. **테마가 썸네일 지원** (`post-thumbnails`)
   - 현재 사용 중인 테마에서 `functions.php` 등에 `add_theme_support('post-thumbnails');`가 선언되어 있어야 대표 이미지가 실제로 표시됩니다.
2. **앱 비밀번호**
   - WordPress 5.6+ 버전에서 **사용자 관리** 메뉴에서 앱 비밀번호 생성 가능
   - **일반 비밀번호**가 아닌 **앱 비밀번호**를 권장
3. **카테고리/태그 ID**
   - `CATEGORY_ID`가 존재하는지 워드프레스 관리자에서 확인해 주세요.
4. **이미지 포맷**
   - 예시로 `.webp`를 사용하지만, `.jpg`, `.png` 등 다른 포맷도 가능합니다(단, 코드 내 `filter((file) => file.endsWith(".webp"))` 부분 수정 필요).
5. **에러 발생 시**
   - 콘솔에 찍히는 **응답 데이터**(`Error Response Data:`)를 참고해 어떤 문제가 있는지 확인

---

## 라이선스

본 프로젝트는 별도의 라이선스가 명시되지 않았다면, [MIT License](https://opensource.org/licenses/MIT)를 따른다고 가정하거나,  
필요에 따라 자유롭게 수정・사용해 주시면 됩니다.
