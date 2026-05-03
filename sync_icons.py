import os
import json
from pathlib import Path

# Ir a la carpeta del script
os.chdir(os.path.dirname(os.path.abspath(__file__)))

items_path = Path("public/items.json")
icons_dir = Path("public/icons")

if not items_path.exists():
    print("No se encontró public/items.json")
    exit()

# Cargar ítems
with open(items_path, "r", encoding="utf-8") as f:
    items = json.load(f)

# Listar todos los archivos en la carpeta icons (en minúsculas para comparar fácil)
available_icons = {f.name.lower(): f.name for f in icons_dir.glob("*.png")}

print(f"Sincronizando {len(items)} ítems con {len(available_icons)} imágenes...")

fixed_count = 0
for item in items:
    # Intentar varias combinaciones de nombres
    # 1. El ID del item (ej: Axe)
    name_from_id = item['id'].split('.')[-1].lower() + ".png"
    # 2. El nombre del icono definido (si existe)
    name_from_icon = (item.get('icon', '') + ".png").lower()
    
    found_file = None
    if name_from_id in available_icons:
        found_file = available_icons[name_from_id]
    elif name_from_icon in available_icons:
        found_file = available_icons[name_from_icon]
    
    if found_file:
        item['icon_path'] = f"icons/{found_file}"
        fixed_count += 1
    else:
        item['icon_path'] = None

# Guardar cambios
with open(items_path, "w", encoding="utf-8") as f:
    json.dump(items, f, indent=2, ensure_ascii=False)

print(f"¡Hecho! Se han vinculado {fixed_count} ítems con sus imágenes.")
input("Presiona ENTER para finalizar...")
