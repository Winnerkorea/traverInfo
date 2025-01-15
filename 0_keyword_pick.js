const fs = require('fs');
const path = require('path');

// JSON 파일 경로
const locationFilePath = path.join(__dirname, 'location', 'location.json');
const outputFilePath = path.join(__dirname, 'keyword', 'keyword.json');

// JSON 파일 읽기
fs.readFile(locationFilePath, 'utf-8', (err, data) => {
  if (err) {
    console.error('Error reading location.json:', err);
    return;
  }

  try {
    const locations = JSON.parse(data);
    const items = [];

    // 각 지역별로 title, href, img 수집
    for (const region in locations) {
      if (locations.hasOwnProperty(region)) {
        const places = locations[region];
        places.forEach((place) => {
          items.push({
            title: place.title,
            href: place.href,
            img: place.img,
          });
        });
      }
    }

    // 랜덤으로 item 선택
    const randomIndex = Math.floor(Math.random() * items.length);
    const randomItem = items[randomIndex];

    // 결과를 keyword.json 파일에 저장
    if (!fs.existsSync(path.dirname(outputFilePath))) {
      fs.mkdirSync(path.dirname(outputFilePath));
    }

    fs.writeFile(
      outputFilePath,
      JSON.stringify(randomItem, null, 2),
      'utf-8',
      (err) => {
        if (err) {
          console.error('Error writing keyword.json:', err);
          return;
        }
        console.log(`랜덤 아이템이 ${outputFilePath}에 저장되었습니다.`);
      }
    );
  } catch (parseError) {
    console.error('Error parsing JSON data:', parseError);
  }
});
