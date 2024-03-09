from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import re
import time
import json

def extract_sections(text):
    pattern = re.compile(r'【(.*?)】\s*(.*?)(?=【|$)', re.DOTALL)
    return dict(pattern.findall(text))

options = Options()
options.add_argument('--headless') # Remove if you want to see the browser pop-up

driver = webdriver.Chrome(service=Service('path-to-chromedriver'), options=options) # replace 'path-to-chromedriver' with your actual path to chromedriver

for book in range(2, 59):
    for part in range(1, 3, 2):
        for page in range(10, 13):
            book_string = f'{book:02d}'
            url = f'https://db.itkc.or.kr/dir/item?itemId=BT#dir/node?grpId=&itemId=BT&gubun=book&depth=5&cate1=Z&cate2=&dataGubun=%EC%B5%9C%EC%A2%85%EC%A0%95%EB%B3%B4&dataId=ITKC_BT_B001A_{book_string}0_0{part}0_0{page}0'

            try:
                driver.get(url)
                time.sleep(1) # wait for page to load

                content = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, 'section.content_text_body.content_scroll.scroll_area.para_block')))

                if content:
                    sections = extract_sections(content.text)

                    with open(f'신증동국여지승람_{book - 1}_{part}_{page}.json', 'w', encoding='utf8') as f:
                        json.dump(sections, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f'Error on page {url}: {str(e)}')

driver.quit()
