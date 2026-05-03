import os
import json
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import time
import shutil

# Configuración
os.chdir(os.path.dirname(os.path.abspath(__file__)))
WIKI_URL = "https://pzwiki.net/wiki/PZwiki:Item_list"
PUBLIC_DIR = Path("public")
ICONS_DIR = PUBLIC_DIR / "icons"
JSON_FILE = PUBLIC_DIR / "items.json"

def clean_and_import():
    print("--- INICIANDO IMPORTACIÓN LIMPIA DESDE LA WIKI ---")
    
    # 1. Limpiar carpetas para evitar conflictos
    if ICONS_DIR.exists():
        print("Limpiando iconos antiguos...")
        shutil.rmtree(ICONS_DIR)
    ICONS_DIR.mkdir(parents=True, exist_ok=True)

    # 2. Descargar página de la Wiki
    print(f"Conectando con {WIKI_URL}...")
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(WIKI_URL, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"Error crítico de conexión: {e}")
        return

    # 3. Analizar tablas
    tables = soup.find_all('table', class_='wikitable')
    new_items = []
    downloaded_ids = set()

    print(f"Analizando {len(tables)} tablas encontradas...")

    for table in tables:
        rows = table.find_all('tr')[1:] # Saltar cabecera
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 4:
                # Columnas según tu captura: Icon | Name | Page | Item ID
                icon_col = cols[0]
                name_col = cols[1]
                id_col = cols[3]

                display_name = name_col.get_text(strip=True)
                item_id = id_col.get_text(strip=True)
                
                # Obtener URL de la imagen
                img_tag = icon_col.find('img')
                if not img_tag or not item_id or '.' not in item_id:
                    continue

                img_url = "https://pzwiki.net" + img_tag['src']
                
                # Evitar duplicados
                if item_id in downloaded_ids:
                    continue

                # Descargar imagen
                # Usamos el ID como nombre de archivo para que sea único y fácil de encontrar
                safe_filename = item_id.replace('.', '_') + ".png"
                dest_path = ICONS_DIR / safe_filename

                try:
                    # Pequeño delay para ser respetuosos con la Wiki
                    time.sleep(0.05)
                    img_data = requests.get(img_url, headers=headers).content
                    with open(dest_path, 'wb') as f:
                        f.write(img_data)
                    
                    # Determinar categoría básica por el ID
                    category = "General"
                    if "Clothing" in item_id or "Hat" in item_id or "Dress" in item_id: category = "Clothing"
                    elif "Weapon" in item_id or "Axe" in item_id or "Knife" in item_id: category = "Weapons"
                    elif "Food" in item_id: category = "Food"
                    elif "Tool" in item_id: category = "Tools"

                    # Añadir al nuevo JSON
                    new_items.append({
                        "id": item_id,
                        "name": display_name,
                        "category": category,
                        "price": 10, # Precio base por defecto
                        "currency": "silver",
                        "icon_path": f"icons/{safe_filename}"
                    })
                    downloaded_ids.add(item_id)
                    
                    if len(new_items) % 50 == 0:
                        print(f"-> Procesados {len(new_items)} ítems...")

                except Exception as e:
                    print(f"Error descargando {item_id}: {e}")

    # 4. Guardar el nuevo JSON
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(new_items, f, indent=2, ensure_ascii=False)

    print(f"\n¡IMPORTACIÓN COMPLETADA!")
    print(f"Total de ítems nuevos: {len(new_items)}")
    print(f"Imágenes guardadas en: {ICONS_DIR}")
    print(f"Archivo generado: {JSON_FILE}")

if __name__ == "__main__":
    clean_and_import()
    input("\nPresiona ENTER para cerrar...")
