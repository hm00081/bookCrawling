const puppeteer = require('puppeteer');
const fs = require('fs');

const extractSections = (text) => {
    const pattern = /【(.*?)】\s*(.*?)(?=【|$)/gs;
    const result = {};
    let match;
    while ((match = pattern.exec(text))) {
        result[match[1]] = match[2];
    }
    return result;
};

(async () => {
    // start browser
    const browser = await puppeteer.launch({ headless: false });

    for (let book = 2; book <= 58; book++) {
        for (let part = 1; part <= 2; part += 2) {
            for (let page = 10; page <= 12; page += 1) {
                const pageInstance = await browser.newPage();

                pageInstance.on('dialog', async (dialog) => {
                    await dialog.dismiss();
                });

                const bookString = book < 10 ? '00' + book : '0' + book;
                const url = `https://db.itkc.or.kr/dir/item?itemId=BT#dir/node?grpId=&itemId=BT&gubun=book&depth=5&cate1=Z&cate2=&dataGubun=%EC%B5%9C%EC%A2%85%EC%A0%95%EB%B3%B4&dataId=ITKC_BT_B001A_${bookString}0_0${part}0_0${page}0`;

                let retries = 3; // 재시도 횟수
                let accessFailed = false; // 접근 실패 여부
                while (retries > 0) {
                    try {
                        const response = await pageInstance.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

                        if (response.status() >= 400) {
                            console.log(`Skipping due to status code: ${response.status()}`);
                            accessFailed = true;
                            break;
                        }

                        retries = 0;
                    } catch (error) {
                        retries -= 1;
                        if (retries === 0) {
                            console.log(`Failed to access: ${url}`); // 모든 재시도가 실패하면 로그 출력
                            accessFailed = true;
                        }
                    }
                }

                if (accessFailed) {
                    continue; // 접근에 실패하면 다음 URL로 넘어갑니다.
                }

                try {
                    // 페이지의 HTML을 가져오기
                    const content = await pageInstance.evaluate(() => {
                        const element = document.querySelector('section.content_text_body.content_scroll.scroll_area.para_block');
                        return element ? element.textContent : null; // 해당 요소가 없는 경우 null 반환
                    });

                    if (content) {
                        // 페이지가 존재하는 경우만 내용을 저장
                        console.log(content); // HTML을 콘솔에 출력
                        fs.appendFileSync(`신증동국여지승람_${book - 1}_${part}_${page}.txt`, content + '\n\n', (err) => {
                            if (err) throw err;
                        });
                    }
                    if (content) {
                        // 페이지가 존재하는 경우만 내용을 저장
                        console.log(content); // HTML을 콘솔에 출력
                        const sections = extractSections(content);
                        fs.writeFileSync(`신증동국여지승람_${book - 1}_${part}_${page}.json`, JSON.stringify(sections, null, 2), (err) => {
                            if (err) throw err;
                        });
                    }
                    // 요청 간에 더 많은 시간을 두도록 변경
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                } catch (error) {
                    console.log(`Skipping due to error: ${error}`);
                } finally {
                    // 페이지 닫기
                    await pageInstance.close();
                }
            }
        }
    }

    // 브라우저 종료
    await browser.close();
})();
