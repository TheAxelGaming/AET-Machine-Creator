import json
import requests
import bs4

JSON_FILE = "public/items.json"

print("Fetching wiki page...")
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
r = requests.get('https://pzwiki.net/wiki/PZwiki:Item_list', headers=headers)
soup = bs4.BeautifulSoup(r.text, 'html.parser')

print("Parsing categories...")
table = soup.find('table', class_='wikitable')
rows = table.find_all('tr')

# Mapeo de Item ID -> Category
id_to_category = {}
current_category = "General"

for row in rows:
    th = row.find('th')
    # Detect category headers (they span columns or are the only element)
    if th and not row.find('td') and th.text.strip() not in ['Icon', 'Name', 'Page', 'Item ID', 'Item ID / Tag']:
        current_category = th.text.strip()
    elif row.find('td'):
        cols = row.find_all('td')
        if len(cols) >= 4:
            item_id = cols[3].text.strip()
            if item_id:
                id_to_category[item_id] = current_category

print(f"Extracted {len(id_to_category)} item categories.")

print("Updating items.json...")
with open(JSON_FILE, "r", encoding="utf-8") as f:
    items = json.load(f)

updated_count = 0
for item in items:
    if item['id'] in id_to_category:
        item['category'] = id_to_category[item['id']]
        updated_count += 1

with open(JSON_FILE, "w", encoding="utf-8") as f:
    json.dump(items, f, indent=2, ensure_ascii=False)

print(f"Updated {updated_count} items with their correct Wiki category.")
