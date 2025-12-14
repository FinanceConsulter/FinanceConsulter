import os
import json
from pathlib import Path

# --- KONFIGURATION ---
BASE_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data" 
SPLITS = ["train", "test", "validate"]

def create_metadata(split_name):
    # Pfade definieren
    split_dir = os.path.join(BASE_DIR, split_name)
    images_dir = os.path.join(split_dir, "images")
    json_dir = os.path.join(split_dir, "json")
    output_file = os.path.join(split_dir, "metadata.jsonl")

    if not os.path.exists(images_dir):
        print(f"Skipping {split_name}: folder not found.")
        return

    print(f"Processing {split_name}...")
    
    entries = []
    
    # Durchlaufe alle Bilder
    for img_name in os.listdir(images_dir):
        if not img_name.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')):
            continue
            
        base_name = os.path.splitext(img_name)[0]
        
        # Strategie 1: Exakter Name (1000-receipt.jpg -> 1000-receipt.json)
        json_path = os.path.join(json_dir, base_name + ".json")
        
        # Strategie 2: Ohne Suffix (1000-receipt.jpg -> 1000.json)
        if not os.path.exists(json_path) and "-" in base_name:
            simple_name = base_name.split("-")[0]
            json_path_alt = os.path.join(json_dir, simple_name + ".json")
            if os.path.exists(json_path_alt):
                json_path = json_path_alt
        
        # Strategie 3: Ersetze Bindestrich durch Unterstrich (1000-receipt.jpg -> 1000_receipt.json)
        if not os.path.exists(json_path) and "-" in base_name:
            underscore_name = base_name.replace("-", "_")
            json_path_alt = os.path.join(json_dir, underscore_name + ".json")
            if os.path.exists(json_path_alt):
                json_path = json_path_alt

        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    # Donut erwartet den String im Feld "ground_truth"
                    entry = {
                        "file_name": img_name, # Nur der Dateiname, HuggingFace imagefolder macht den Rest
                        "ground_truth": json.dumps(data) 
                    }
                    entries.append(entry)
                except json.JSONDecodeError:
                    print(f"Error decoding JSON for {img_name}")
        else:
            print(f"Warning: No JSON found for {img_name} (Checked: {json_path})")

    # Schreibe metadata.jsonl
    if entries:
        with open(output_file, 'w', encoding='utf-8') as f:
            for entry in entries:
                f.write(json.dumps(entry) + '\n')
        print(f"-> Created metadata.jsonl for {split_name} with {len(entries)} entries.")
    else:
        print(f"-> No entries found for {split_name}. Please check filenames.")

if __name__ == "__main__":
    for split in SPLITS:
        create_metadata(split)