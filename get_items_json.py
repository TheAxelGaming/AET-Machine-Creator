import os
import json
import re
from pathlib import Path

# Configuración
os.chdir(os.path.dirname(os.path.abspath(__file__)))
APP_PUBLIC_PATH = Path("public")
ICONS_PATH = APP_PUBLIC_PATH / "icons"
JSON_PATH = APP_PUBLIC_PATH / "items.json"
MACHINES_PATH = APP_PUBLIC_PATH / "machines.json"

def get_property(body, prop):
    match = re.search(fr'{prop}\s*=\s*([^,;\n]+)', body)
    if match:
        return match.group(1).strip().replace('"', '')
    return None

def main():
    print("--- INICIANDO ESCANEO INTEGRADO (GAME + WIKI + MOD) ---")
    
    # 1. Cargar datos previos de la Wiki si existen
    wiki_data = {}
    if JSON_PATH.exists():
        try:
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                old_items = json.load(f)
                for item in old_items:
                    if item.get('icon_path'): # Solo guardar si tiene icono de la wiki
                        wiki_data[item['id']] = item
            print(f"[INFO] Cargados {len(wiki_data)} ítems previos con datos de la Wiki.")
        except:
            pass

    # 2. Escaneo de ítems del juego (para pillar IDs nuevos)
    # Aquí podrías poner la ruta de Project Zomboid si quieres escanear todo de nuevo
    # Por ahora, mantendremos los de la wiki y solo añadiremos si falta algo esencial
    items = list(wiki_data.values())
    print(f"[INFO] Catálogo actual: {len(items)} ítems.")

    # 3. Escaneo de MÁQUINAS en el Mod
    print("\n[DEBUG] Buscando máquinas en ATM_Server_Economy...")
    machines = []
    base_path = Path(os.getcwd()).parent
    mod_root = base_path / "ATM_Server_Economy"

    # 3.1 Leer items de las máquinas desde Lua
    lua_data = {}
    for mod_lua_path in mod_root.rglob("*.lua"):
        if any(x in mod_lua_path.name for x in ["ContextMenu", "UI", "Logic", "DataManager", "Server"]): continue
        
        print(f"[DEBUG] Analizando archivo Lua: {mod_lua_path.name}")
        try:
            with open(mod_lua_path, "r", encoding="utf-8") as f:
                content = f.read()
                
                # Caso A: Tabla AETDefaultItems = { Machine = { ... }, ... }
                if "AETDefaultItems" in content:
                    main_block = re.search(r'AETDefaultItems\s*=\s*\{([\s\S]*)\}', content)
                    if main_block:
                        inner_content = main_block.group(1)
                        # Buscar todas las máquinas: Nombre = { ... }
                        # El patrón busca un nombre seguido de { y termina en }, (con coma) o } al final del bloque
                        matches = re.finditer(r'(\w+)\s*=\s*\{([\s\S]*?)\n\s*\},?', inner_content)
                        for match in matches:
                            m_id = match.group(1)
                            m_body = match.group(2)
                            m_items = []
                            # Extraer cada item { id = "...", ... }
                            raw_items = re.findall(r'\{([\s\S]*?)\}', m_body)
                            for raw_item in raw_items:
                                id_match = re.search(r'id\s*=\s*"([^"]+)"', raw_item)
                                price_match = re.search(r'price\s*=\s*(\d+)', raw_item)
                                curr_match = re.search(r'currency\s*=\s*"([^"]+)"', raw_item)
                                if id_match and price_match:
                                    m_items.append({
                                        "id": id_match.group(1),
                                        "price": int(price_match.group(1)),
                                        "currency": curr_match.group(1) if curr_match else "silver"
                                    })
                            if m_items:
                                lua_data[m_id] = m_items
                                print(f"[DEBUG] -> Leída config para: {m_id} ({len(m_items)} ítems)")

                # Caso B: Tabla AETClothingData = { {id=...}, ... }
                if "AETClothingData" in content:
                    m_items = []
                    raw_items = re.findall(r'\{([\s\S]*?)\}', content)
                    for raw_item in raw_items:
                        id_match = re.search(r'id\s*=\s*"([^"]+)"', raw_item)
                        price_match = re.search(r'price\s*=\s*(\d+)', raw_item)
                        if id_match and price_match:
                            m_items.append({
                                "id": id_match.group(1),
                                "price": int(price_match.group(1)),
                                "currency": "silver"
                            })
                    if m_items:
                        lua_data["ClothingTrader"] = m_items
                        print(f"[DEBUG] -> Leída config para: ClothingTrader ({len(m_items)} ítems)")

        except Exception as e:
            print(f"Error parseando {mod_lua_path.name}: {e}")

    # 3.2 Buscar archivos .txt de máquinas
    for script_file in mod_root.rglob("*.txt"):
        if "models_items" in script_file.name: continue
        try:
            with open(script_file, "r", encoding="utf-8") as f:
                content = f.read()
                item_match = re.search(r'item\s+(\w+)\s*\{([\s\S]*?)\}', content)
                if item_match:
                    m_id = item_match.group(1)
                    m_body = item_match.group(2)
                    m_name = get_property(m_body, "DisplayName") or m_id
                    m_weight = get_property(m_body, "Weight") or 15.0
                    
                    # Buscar textura en models
                    m_texture = "WorldItems/MoneyDispencer"
                    for models_file in mod_root.rglob("*models_items.txt"):
                        with open(models_file, "r", encoding="utf-8") as mf:
                            mf_content = mf.read()
                            model_match = re.search(fr'model\s+{m_id}_Model\s*\{{[\s\S]*?texture\s*=\s*([^,;\n]+)', mf_content)
                            if model_match:
                                m_texture = model_match.group(1).strip()
                                break

                    machines.append({
                        "id": m_id,
                        "name": m_name,
                        "weight": float(m_weight),
                        "texture": m_texture,
                        "scale": 0.6,
                        "items": lua_data.get(m_id, [])
                    })
                    print(f"[DEBUG] Máquina registrada: {m_id} [{m_name}]")
        except:
            pass

    # 4. Guardar resultados
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    
    with open(MACHINES_PATH, "w", encoding="utf-8") as f:
        json.dump(machines, f, indent=2, ensure_ascii=False)

    print("\n¡SINCRONIZACIÓN COMPLETADA!")
    print(f"Catálogo preservado: {len(items)} ítems.")
    print(f"Máquinas detectadas: {len(machines)}.")
    input("\nPresiona ENTER para cerrar...")

if __name__ == "__main__":
    main()
