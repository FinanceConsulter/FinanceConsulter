"""
Receipt Scanner mit dem mychen76/invoice-and-receipts_donut_v1 Modell.
Dieses Modell ist speziell für Invoices/Receipts finetuned und produziert
strukturiertes JSON mit header, items und summary.

Output Format des Modells:
{
    'header': {
        'invoice_no': '...',
        'invoice_date': '05/29/2021',
        'seller': 'Store Name and Address',
        'client': '...',
        ...
    },
    'items': [
        {'item_desc': '...', 'item_qty': '1,00', 'item_net_price': '16,99', 'item_gross_worth': '18,69'},
        ...
    ],
    'summary': {'total_net_worth': '$581,93', 'total_gross_worth': '$ 640,12'}
}
"""
import re
import json
import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel
from PIL import Image
import os

# Invoice/Receipt Model von mychen76
MODEL_NAME = "mychen76/invoice-and-receipts_donut_v1"

# Test Pfade
TEST_IMAGE_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data\test\images"
TEST_JSON_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data\test\json"

NUM_SAMPLES = 10


def load_model():
    """Lädt das mychen76/invoice-and-receipts_donut_v1 Modell."""
    print("📥 Lade Invoice/Receipt Modell...")
    print(f"   Modell: {MODEL_NAME}")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"   Device: {device}")
    
    processor = DonutProcessor.from_pretrained(MODEL_NAME)
    
    # Modell direkt auf Device laden mit from_pretrained
    # Für Safetensors-Modelle mit Meta-Tensors brauchen wir spezielle Behandlung
    from accelerate import init_empty_weights, load_checkpoint_and_dispatch
    from huggingface_hub import hf_hub_download
    import os
    
    # Alternative: Safetensors ignorieren und Pytorch Weights nutzen
    try:
        model = VisionEncoderDecoderModel.from_pretrained(
            MODEL_NAME,
            use_safetensors=False,  # Versuche ohne safetensors
        )
        model = model.to(device)
    except:
        # Fallback: Mit device direkt in from_pretrained
        print("   Versuche alternativen Ladevorgang...")
        from transformers import AutoConfig
        
        config = AutoConfig.from_pretrained(MODEL_NAME)
        model = VisionEncoderDecoderModel.from_pretrained(
            MODEL_NAME,
            config=config,
            ignore_mismatched_sizes=True,
        )
        model = model.to(device)
    
    model.eval()
    
    print("✅ Modell erfolgreich geladen!")
    return model, processor, device


def run_prediction(model, processor, device, image_path):
    """Führt eine Vorhersage mit dem Invoice/Receipt Modell aus."""
    image = Image.open(image_path).convert("RGB")
    
    # Bild verarbeiten
    pixel_values = processor(image, return_tensors="pt").pixel_values.to(device)

    # Task Prompt für das Modell (aus der Modell-Dokumentation)
    # Das Modell erwartet einen speziellen Start-Token
    task_prompt = "<s>"
    decoder_input_ids = processor.tokenizer(
        task_prompt, 
        add_special_tokens=False, 
        return_tensors="pt"
    ).input_ids.to(device)

    with torch.no_grad():
        outputs = model.generate(
            pixel_values,
            decoder_input_ids=decoder_input_ids,
            max_length=1024,  # Mehr Platz für Items
            pad_token_id=processor.tokenizer.pad_token_id,
            eos_token_id=processor.tokenizer.eos_token_id,
            use_cache=True,
            num_beams=4,
            bad_words_ids=[[processor.tokenizer.unk_token_id]],
            return_dict_in_generate=True,
        )

    # Rohe Sequenz für Debugging
    raw_sequence = processor.batch_decode(outputs.sequences, skip_special_tokens=False)[0]
    
    # Bereinigen
    sequence = processor.batch_decode(outputs.sequences)[0]
    sequence = sequence.replace(processor.tokenizer.eos_token, "").replace(processor.tokenizer.pad_token, "")
    
    # Token zu JSON konvertieren
    try:
        result = processor.token2json(sequence)
    except Exception as e:
        print(f"   ⚠️ token2json failed: {e}")
        result = {"raw": sequence}
    
    return result, raw_sequence


def clean_price(price_str: str) -> str:
    """Bereinigt einen Preis-String und gibt ihn als '12.99' zurück."""
    if not price_str:
        return ""
    
    # Zu String konvertieren
    price_str = str(price_str).strip()
    
    # Währungssymbole und Leerzeichen entfernen
    cleaned = price_str.replace("$", "").replace("€", "").replace(" ", "")
    
    # Europäisches Format (1.234,56) zu US Format (1234.56) konvertieren
    # Wenn Komma als Dezimaltrennzeichen verwendet wird
    if "," in cleaned and "." in cleaned:
        # 1.234,56 Format
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        # 12,99 Format
        cleaned = cleaned.replace(",", ".")
    
    try:
        return f"{float(cleaned):.2f}"
    except:
        return ""


def extract_merchant_from_header(header: dict) -> str:
    """Extrahiert den Merchant-Namen aus dem Header."""
    # Priorität: seller > store_name > invoice_no (als Fallback)
    seller = header.get("seller", "")
    
    if seller:
        # Seller enthält oft "Name\nAddress"
        # Erste Zeile ist meist der Name
        lines = str(seller).split("\n")
        if lines:
            return lines[0].strip()
    
    # Fallback: Andere Felder prüfen
    for field in ["store_name", "company", "vendor"]:
        if field in header and header[field]:
            return str(header[field]).strip()
    
    return ""


def extract_date_from_header(header: dict) -> str:
    """Extrahiert das Datum aus dem Header."""
    # Verschiedene mögliche Felder
    for field in ["invoice_date", "date", "receipt_date", "transaction_date"]:
        if field in header and header[field]:
            return str(header[field]).strip()
    
    return ""


def invoice_to_custom_format(invoice_output: dict) -> dict:
    """
    Konvertiert das Invoice/Receipt Model Output in unser Custom-Format.
    
    Tatsächliches Input Format (anders als dokumentiert!):
    {
        'store_addr': 'Store Name and Address',
        'telephone': '...',
        'date': '05/29/2021',
        'total': '$640.12',
        'line_items': [
            {'item_name': 'ProductName', 'item_value': '$18.69', 'item_quantity': '1'},
            ...
        ]
    }
    
    Output Format:
    {
        'data': {
            'merchant': 'Store Name',
            'date': '05/29/2021',
            'menu': [{'Artikel': '...', 'Total': '18.69'}],
            'total': '640.12'
        }
    }
    """
    result = {
        "data": {
            "merchant": "",
            "date": "",
            "menu": [],
            "total": ""
        }
    }
    
    # Wenn Liste, nimm erstes Element
    if isinstance(invoice_output, list):
        if not invoice_output:
            return result
        invoice_output = invoice_output[0]
    
    if not isinstance(invoice_output, dict):
        return result
    
    # === MERCHANT aus store_addr extrahieren ===
    store_addr = invoice_output.get("store_addr", "") or invoice_output.get("store_name", "")
    if store_addr:
        # Erste Zeile oder erste Wörter nehmen (oft Name vor Adresse)
        store_str = str(store_addr).strip()
        # Versuche Name vor Straßennummer zu extrahieren
        # z.B. "Miami,FL33176 10325HambooksBlvd" -> schwierig
        # Besser: Ersten Teil bis zur Zahl nehmen
        match = re.match(r'^([A-Za-z\s\'\-&]+)', store_str)
        if match:
            result["data"]["merchant"] = match.group(1).strip()
        else:
            result["data"]["merchant"] = store_str[:50]  # Fallback: erste 50 Zeichen
    
    # === DATE ===
    date = invoice_output.get("date", "")
    if date:
        # Manchmal doppelt: "4/20/2017 4/20/2017"
        date_str = str(date).split()[0] if date else ""
        result["data"]["date"] = date_str
    
    # === TOTAL ===
    total = invoice_output.get("total", "") or invoice_output.get("subtotal", "")
    if total:
        # Manchmal doppelt: "77.83 77.83"
        total_str = str(total).split()[0] if total else ""
        result["data"]["total"] = clean_price(total_str)
    
    # === LINE ITEMS ===
    line_items = invoice_output.get("line_items", [])
    
    # Kann dict oder list sein
    if isinstance(line_items, dict):
        line_items = [line_items]
    
    menu_items = []
    for item in line_items:
        if not isinstance(item, dict):
            continue
        
        # Item-Name
        name = item.get("item_name", "") or item.get("item_desc", "") or item.get("name", "")
        if not name or isinstance(name, (list, dict)):
            continue
        name = str(name).strip()
        
        # Leere oder ungültige Namen überspringen
        if not name or name.upper() in ["NAME", "", "*"]:
            continue
        
        # Menge
        qty = item.get("item_quantity", "") or item.get("qty", "")
        if qty:
            qty_str = str(qty).replace(",", ".").strip()
            try:
                qty_val = float(qty_str)
                if qty_val > 1:
                    name = f"{int(qty_val)} {name}"
            except:
                pass
        
        # Preis
        price = item.get("item_value", "") or item.get("item_gross_worth", "") or item.get("price", "")
        cleaned_price = clean_price(price)
        
        # Nur Items mit gültigem Preis oder Namen ohne Preis akzeptieren
        if name:
            menu_items.append({
                "Artikel": name,
                "Total": cleaned_price if cleaned_price else "0.00"
            })
    
    result["data"]["menu"] = menu_items
    
    # Fallback: Total aus Items berechnen wenn nicht gefunden
    if not result["data"]["total"] and menu_items:
        try:
            valid_prices = [float(item["Total"]) for item in menu_items if item["Total"] and item["Total"] != "0.00"]
            if valid_prices:
                calculated_total = sum(valid_prices)
                result["data"]["total"] = f"{calculated_total:.2f}"
        except:
            pass
    
    return result


def main():
    model, processor, device = load_model()
    
    print(f"\n{'='*70}")
    print("INVOICE/RECEIPT SCANNER - mychen76/invoice-and-receipts_donut_v1")
    print(f"{'='*70}\n")
    
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
        print("-" * 70)
        print(f"📄 Datei: {img_file}")
        
        img_path = os.path.join(TEST_IMAGE_DIR, img_file)
        
        try:
            # 1. Vorhersage
            invoice_output, raw_sequence = run_prediction(model, processor, device, img_path)
            
            print("\n🔧 MODEL RAW OUTPUT:")
            print(json.dumps(invoice_output, indent=2, ensure_ascii=False)[:800])
            if len(json.dumps(invoice_output)) > 800:
                print("...")
            
            # 2. In Custom Format konvertieren
            custom_output = invoice_to_custom_format(invoice_output)
            
            print("\n🤖 KONVERTIERT ZU CUSTOM FORMAT:")
            print(json.dumps(custom_output, indent=2, ensure_ascii=False))
            
            # 3. Ground Truth laden (falls vorhanden)
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
