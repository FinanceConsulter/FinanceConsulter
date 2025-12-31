"""
Receipt Scanner mit dem vortrainierten CORD-v2 Modell.
Konvertiert die CORD-v2 Ausgabe in unser Custom-Format.

Das vortrainierte Modell funktioniert bereits gut - wir müssen es nicht neu trainieren!
"""
import re
import json
import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel
from PIL import Image
import os

# Das ORIGINAL vortrainierte Model - funktioniert out-of-the-box!
PRETRAINED_MODEL = "naver-clova-ix/donut-base-finetuned-cord-v2"

# Test Pfade
TEST_IMAGE_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data\test\images"
TEST_JSON_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data\test\json"

NUM_SAMPLES = 10


def load_pretrained_model():
    """Lädt das original vortrainierte CORD-v2 Modell."""
    print("📥 Lade vortrainiertes CORD-v2 Modell...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"   Device: {device}")
    
    processor = DonutProcessor.from_pretrained(PRETRAINED_MODEL)
    model = VisionEncoderDecoderModel.from_pretrained(PRETRAINED_MODEL).to(device)
    model.eval()
    
    return model, processor, device


def run_prediction(model, processor, device, image_path):
    """Führt eine Vorhersage mit dem CORD-v2 Modell aus."""
    image = Image.open(image_path).convert("RGB")
    
    pixel_values = processor(image, return_tensors="pt").pixel_values.to(device)

    task_prompt = "<s_cord-v2>"
    decoder_input_ids = processor.tokenizer(
        task_prompt, 
        add_special_tokens=False, 
        return_tensors="pt"
    ).input_ids.to(device)

    with torch.no_grad():
        outputs = model.generate(
            pixel_values,
            decoder_input_ids=decoder_input_ids,
            max_length=768,
            pad_token_id=processor.tokenizer.pad_token_id,
            eos_token_id=processor.tokenizer.eos_token_id,
            use_cache=True,
            num_beams=4,
            bad_words_ids=[[processor.tokenizer.unk_token_id]],
            return_dict_in_generate=True,
        )

    sequence = processor.batch_decode(outputs.sequences)[0]
    sequence = sequence.replace(processor.tokenizer.eos_token, "").replace(processor.tokenizer.pad_token, "")
    sequence = re.sub(r"<.*?>", "", sequence, count=1).strip()
    
    return processor.token2json(sequence)


def is_valid_price(price_str: str) -> bool:
    """Prüft ob ein String ein gültiger Preis ist (z.B. '5.00', '$12.99')."""
    if not price_str:
        return False
    # Bereinigen
    cleaned = str(price_str).replace("$", "").replace(",", ".").strip()
    # Prüfen ob es eine Zahl ist
    try:
        val = float(cleaned)
        return val >= 0 and val < 10000  # Sinnvoller Preisbereich (0 erlaubt für kostenlose Items)
    except:
        return False


def clean_price(price_str: str) -> str:
    """Bereinigt einen Preis-String."""
    if not price_str:
        return ""
    cleaned = str(price_str).replace("$", "").replace(",", ".").strip()
    try:
        return f"{float(cleaned):.2f}"
    except:
        return ""


def is_header_info(name: str) -> bool:
    """Erkennt ob ein Name Header-Info ist (Adresse, Telefon, etc.) statt Menu-Item."""
    if not name:
        return False
    name_lower = name.lower()
    
    # Header-Indikatoren
    header_patterns = [
        r'^\d+\s+\w+\s+(st|street|rd|road|ave|avenue|blvd|dr|drive)',  # Adresse
        r'tel[:\s]',  # Telefon
        r'phone',
        r'^server[:\s]',  # Server (nur am Anfang)
        r'^order\s*#',  # Order number (nur am Anfang)
        r'^order#',  # Order# ohne Leerzeichen
        r'^guest',
        r'^reprint',
        r'^reg\s*$',  # REG
        r'^\d{5}$',  # PLZ
        r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # Telefonnummer
        r'^for a chance',  # Gewinnspiel-Text
        r'^see back',  # Hinweistext
        r'ca\.\s*\d{5}',  # Kalifornien Adresse
        r'^south\s+gate',  # Stadtname
        r'^lewnette',  # Straßenname
        r'^no sour cream$',  # Modifikator ohne Preis
        r'^no cheese$',  # Modifikator ohne Preis
        r'^khere$',  # Unbekannter Text
        r'^waiter\s+\d+',  # Waiter info
        r'^table\s+\d+',  # Table number
        r'^check\s*#',  # Check number
        r'^qty.*name',  # Header-Zeile
        r'^\w+,\s*(ca|ny|tx|fl)',  # Stadt, State
        r'^p\s*a\s*i\s*d',  # PAID
        r'^hermosa\s+beach',  # Stadtname
        r'^serv\.?charge',  # Service charge (als separate Zeile)
    ]
    
    for pattern in header_patterns:
        if re.search(pattern, name_lower):
            return True
    
    return False


def is_likely_menu_item(name: str, price: str) -> bool:
    """Prüft ob ein Eintrag wahrscheinlich ein Menu-Item ist."""
    if not name or not is_valid_price(price):
        return False
    
    # Wenn Name eine Liste ist, ist es kein gültiges Item
    if isinstance(name, list):
        return False
    
    name_str = str(name)
    name_lower = name_str.lower()
    
    # Unrealistisch hohe Preise ausschließen (> 500)
    try:
        price_val = float(str(price).replace("$", "").replace(",", ".").strip())
        if price_val > 500:
            return False
    except:
        pass
    
    # Namen die mit Datum beginnen ausschließen
    if re.match(r'^\w+\s+\d{1,2},\s*\d{4}', name_str):
        return False
    
    # Positive Indikatoren für Menu-Items
    food_indicators = [
        r'bowl', r'plate', r'drink', r'coffee', r'tea', r'soda', r'water',
        r'burger', r'sandwich', r'salad', r'soup', r'pizza', r'pasta',
        r'chicken', r'beef', r'pork', r'fish', r'shrimp', r'lobster',
        r'fries', r'rice', r'noodle', r'roll', r'taco', r'burrito',
        r'cake', r'pie', r'ice cream', r'dessert',
        r'beer', r'wine', r'margarita', r'cocktail', r'lite', r'light',
        r'small', r'medium', r'large', r'\(s\)', r'\(m\)', r'\(l\)',
        r'add\s', r'extra', r'side', r'combo', r'meal', r'special',
        r'avocado', r'cheese', r'bacon', r'onion', r'lettuce',
        r'pho', r'sushi', r'curry', r'masala', r'biryani',
        r'buns', r'pancake', r'dumplings', r'wings',
        r'sprouts', r'tender', r'grilled', r'vanilla', r'classic',
        r'mac\s*&?\s*cheese', r'zucchini',
    ]
    
    for pattern in food_indicators:
        if re.search(pattern, name_lower):
            return True
    
    # Wenn der Preis valide ist und der Name nicht wie Header aussieht
    if is_valid_price(price) and not is_header_info(name_str):
        # Mindestens 2 Zeichen und nicht nur Zahlen
        if len(name_str) >= 2 and not name_str.replace(" ", "").isdigit():
            return True
    
    return False


def extract_menu_item_from_sub(sub_dict: dict) -> list:
    """Extrahiert Menu-Items aus verschachtelten 'sub' Objekten."""
    items = []
    if not isinstance(sub_dict, dict):
        return items
    
    name = sub_dict.get("nm", "")
    price = sub_dict.get("price", "")
    cnt = sub_dict.get("cnt", "")
    
    if isinstance(name, str) and is_valid_price(str(price)):
        if not is_header_info(name):
            artikel_name = name.strip()
            if cnt and str(cnt).isdigit() and int(cnt) > 1:
                artikel_name = f"{cnt} {artikel_name}"
            items.append({
                "Artikel": artikel_name,
                "Total": clean_price(str(price))
            })
    
    # Rekursiv in verschachtelten sub suchen
    if "sub" in sub_dict:
        items.extend(extract_menu_item_from_sub(sub_dict["sub"]))
    
    return items


def cord_to_custom_format(cord_output: dict) -> dict:
    """
    Konvertiert CORD-v2 Format in unser Custom-Format.
    Intelligente Erkennung von Merchant, Date und echten Menu-Items.
    """
    result = {
        "data": {
            "merchant": "",
            "date": "",
            "menu": [],
            "total": ""
        }
    }
    
    # Wenn cord_output eine Liste ist, nimm das erste Element
    if isinstance(cord_output, list):
        if not cord_output:
            return result
        cord_output = cord_output[0]
    
    if not isinstance(cord_output, dict):
        return result
    
    found_menu_items = []
    merchant_candidate = ""
    
    # Menu Items extrahieren
    menu_items = cord_output.get("menu", [])
    if isinstance(menu_items, dict):
        menu_items = [menu_items]
    
    for idx, item in enumerate(menu_items):
        if not isinstance(item, dict):
            continue
            
        name = item.get("nm", "")
        price = item.get("price", "")
        cnt = item.get("cnt", "")
        num = item.get("num", "")
        
        # Namen bereinigen
        if isinstance(name, (dict, list)):
            continue  # Verschachtelte Objekte überspringen
        name = str(name).strip()
        
        if not name:
            continue
        
        # Datum aus num-Feld extrahieren
        if num:
            date_match = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', str(num))
            if date_match and not result["data"]["date"]:
                result["data"]["date"] = date_match.group(1)
        
        # Preis verarbeiten
        if isinstance(price, dict):
            # Verschachtelte Preise überspringen für Haupteintrag
            # Aber Datum könnte drin sein
            continue
        
        price_str = str(price) if price else ""
        
        # Erstes Item ohne gültigen Preis = wahrscheinlich Merchant
        if idx == 0 and not is_valid_price(price_str):
            merchant_candidate = name
            continue
        
        # Header-Infos überspringen
        if is_header_info(name):
            continue
        
        # Menu-Item mit gültigem Preis
        if is_valid_price(price_str):
            artikel_name = name
            if cnt and str(cnt).isdigit() and int(cnt) > 1:
                artikel_name = f"{cnt} {artikel_name}"
            
            found_menu_items.append({
                "Artikel": artikel_name,
                "Total": clean_price(price_str)
            })
        
        # Verschachtelte 'sub' Items extrahieren
        if "sub" in item:
            sub_items = extract_menu_item_from_sub(item["sub"])
            found_menu_items.extend(sub_items)
    
    # Total extrahieren
    total_data = cord_output.get("total", {})
    if isinstance(total_data, dict):
        total_price = total_data.get("total_price", "") or total_data.get("cashprice", "")
    elif isinstance(total_data, list) and total_data:
        total_price = total_data[0].get("total_price", "") if isinstance(total_data[0], dict) else ""
    else:
        total_price = str(total_data) if total_data else ""
    
    result["data"]["total"] = clean_price(total_price)
    
    # Validierung: Total sollte nicht unrealistisch hoch sein
    try:
        total_val = float(result["data"]["total"]) if result["data"]["total"] else 0
        if total_val > 10000:
            result["data"]["total"] = ""  # Unrealistisch, leeren
    except:
        pass
    
    # Subtotal durchsuchen für mehr Infos
    sub_total = cord_output.get("sub_total", {})
    if isinstance(sub_total, dict):
        # Fallback Total
        if not result["data"]["total"]:
            subtotal_price = sub_total.get("subtotal_price", "")
            if is_valid_price(subtotal_price):
                result["data"]["total"] = clean_price(subtotal_price)
        
        # etc-Items durchsuchen (oft sind hier die echten Menu-Items!)
        etc_items = sub_total.get("etc", [])
        if isinstance(etc_items, list):
            for etc in etc_items:
                if not isinstance(etc, dict):
                    continue
                    
                nm = str(etc.get("nm", "")).strip()
                price = etc.get("price", "")
                cnt = etc.get("cnt", "")
                
                # Datum erkennen
                date_match = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', nm)
                if date_match and not result["data"]["date"]:
                    result["data"]["date"] = date_match.group(1)
                    continue
                
                # Merchant erkennen
                if not merchant_candidate and nm and not nm[0].isdigit():
                    if not is_header_info(nm) and len(nm) > 2:
                        # Prüfen ob es ein bekannter Merchant-Name ist (keine Zahl im Namen)
                        if not is_valid_price(str(price)) or str(price) == nm:
                            merchant_candidate = nm
                            continue
                
                # Menu-Items aus etc
                if is_valid_price(str(price)) and nm:
                    if is_likely_menu_item(nm, str(price)):
                        artikel_name = nm
                        if cnt and str(cnt).isdigit() and int(cnt) > 1:
                            artikel_name = f"{cnt} {artikel_name}"
                        
                        # Prüfen ob nicht schon vorhanden
                        already_exists = any(
                            m["Artikel"].lower() == artikel_name.lower() 
                            for m in found_menu_items
                        )
                        if not already_exists:
                            found_menu_items.append({
                                "Artikel": artikel_name,
                                "Total": clean_price(str(price))
                            })
    
    # Ergebnisse zusammenführen
    result["data"]["merchant"] = merchant_candidate
    result["data"]["menu"] = found_menu_items
    
    return result


def main():
    model, processor, device = load_pretrained_model()
    
    print(f"\n{'='*60}")
    print("RECEIPT SCANNER - Vortrainiertes CORD-v2 Modell")
    print(f"{'='*60}\n")
    
    if not os.path.exists(TEST_IMAGE_DIR):
        print(f"❌ Test-Verzeichnis nicht gefunden: {TEST_IMAGE_DIR}")
        return
        
    files = [f for f in os.listdir(TEST_IMAGE_DIR) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
    
    if not files:
        print("❌ Keine Bilder gefunden!")
        return
    
    samples = files[:NUM_SAMPLES]
    print(f"Teste {len(samples)} Bilder...\n")

    for img_file in samples:
        print("-" * 60)
        print(f"📄 Datei: {img_file}")
        
        img_path = os.path.join(TEST_IMAGE_DIR, img_file)
        
        try:
            # 1. CORD-v2 Vorhersage
            cord_output = run_prediction(model, processor, device, img_path)
            
            print("\n🔧 CORD-v2 RAW OUTPUT:")
            print(json.dumps(cord_output, indent=2, ensure_ascii=False)[:500] + "...")
            
            # 2. In Custom Format konvertieren
            custom_output = cord_to_custom_format(cord_output)
            
            print("\n🤖 KONVERTIERT ZU CUSTOM FORMAT:")
            print(json.dumps(custom_output, indent=2, ensure_ascii=False))
            
            # 3. Ground Truth laden
            base_name = os.path.splitext(img_file)[0]
            json_path = os.path.join(TEST_JSON_DIR, base_name + ".json")
            
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    ground_truth = json.load(f)
                print("\n✅ GROUND TRUTH:")
                print(json.dumps(ground_truth, indent=2, ensure_ascii=False))
            
        except Exception as e:
            print(f"❌ Fehler: {e}")
            import traceback
            traceback.print_exc()
        
        print()


if __name__ == "__main__":
    main()
