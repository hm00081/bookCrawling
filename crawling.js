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
    const browser = await puppeteer.launch({ headless: false });

    for (let book = 2; book <= 58; book++) {
        for (let part = 1; part <= 2; part += 2) {
            for (let page = 10; page <= 12; page += 1) {
                const pageInstance = await browser.newPage();

                pageInstance.on('dialog', async (dialog) => {
                    await dialog.dismiss();
                });

                const bookString = book < 10 ? `00${book}` : `0${book}`;
                const url = `https://db.itkc.or.kr/dir/item?itemId=BT#dir/node?grpId=&itemId=BT&gubun=book&depth=5&cate1=Z&cate2=&dataGubun=%EC%B5%9C%EC%A2%85%EC%A0%95%EB%B3%B4&dataId=ITKC_BT_B001A_${bookString}0_0${part}0_0${page}0`;

                let retries = 3;
                let accessFailed = true; // 초기 값은 true로 설정, 성공적인 접근시 false로 변경
                while (retries > 0 && accessFailed) {
                    try {
                        const response = await pageInstance.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

                        if (response.status() >= 400) {
                            console.log(`Skipping due to status code: ${response.status()}`);
                            break;
                        }
                        accessFailed = false; // 성공적으로 페이지에 접근하면 false로 설정
                    } catch (error) {
                        console.log(`Attempt to access ${url} failed with error: ${error}, retries left: ${retries - 1}`);
                        retries -= 1;
                        if (retries === 0) {
                            console.log(`Failed to access: ${url} after all retries`);
                        }
                    }
                }

                if (accessFailed) continue;

                try {
                    const content = await pageInstance.evaluate(() => {
                        const element = document.querySelector('section.content_text_body.content_scroll.scroll_area.para_block');
                        return element ? element.textContent : null;
                    });

                    if (content) {
                        try {
                            const filename = `신증동국여지승람_${book - 1}_${part}_${page}`;
                            console.log(content);
                            fs.writeFileSync(`${filename}.txt`, content + '\n\n');
                            const sections = extractSections(content);
                            fs.writeFileSync(`${filename}.json`, JSON.stringify(sections, null, 2));
                        } catch (err) {
                            console.error(`Error writing file: ${err}`);
                        }
                    }

                    await new Promise((resolve) => setTimeout(resolve, 1000));
                } catch (error) {
                    console.log(`Skipping due to error: ${error}`);
                } finally {
                    await pageInstance.close();
                }
            }
        }
    }

    await browser.close();
})();
