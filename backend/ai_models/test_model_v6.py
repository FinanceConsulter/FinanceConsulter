"""
Test-Script für das V6 Fine-Tuned Model.
Verwendet den CORD-v2 Task Token und konvertiert die Ausgabe zu unserem Format.
"""
import os
import json
import torch
import re
from transformers import VisionEncoderDecoderModel, DonutProcessor
from PIL import Image
from pathlib import Path

# =============================================================================
# KONFIGURATION
# =============================================================================

MODEL_PATH = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\donut_custom_v6"
TEST_IMAGE_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data\validate\images"
OUTPUT_FILE = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\v6_test_results.json"

TASK_TOKEN = "<s_cord-v2>"

# =============================================================================
# HILFSFUNKTIONEN
# =============================================================================

def token2json(token_sequence, tokenizer):
    """
    Konvertiert Donut Token-Sequenz zurück zu JSON.
    Basiert auf der offiziellen Donut-Implementierung.
    """
    # Entferne Task Token und EOS
    sequence = token_sequence.replace(TASK_TOKEN, "").strip()
    sequence = re.sub(r"<.*?>$", "", sequence)  # Entferne trailing special tokens
    
    # Parse die Token-Sequenz
    try:
        # Rekursives Parsen
        return parse_tokens(sequence)
    except Exception as e:
        return {"error": str(e), "raw": sequence}


def parse_tokens(sequence):
    """Rekursiv Token-Sequenz zu Dict parsen."""
    result = {}
    
    # Finde alle <s_key>...</s_key> Paare
    pattern = r"<s_([^>]+)>(.*?)</s_\1>"
    
    # Iterativ durch die Sequenz
    pos = 0
    while pos < len(sequence):
        # Finde nächstes Opening Tag
        match = re.search(r"<s_([^>]+)>", sequence[pos:])
        if not match:
            break
        
        key = match.group(1)
        start = pos + match.end()
        
        # Finde das entsprechende Closing Tag (berücksichtige Verschachtelung)
        depth = 1
        end = start
        while depth > 0 and end < len(sequence):
            next_open = sequence.find(f"<s_{key}>", end)
            next_close = sequence.find(f"</s_{key}>", end)
            
            if next_close == -1:
                break
            
            if next_open != -1 and next_open < next_close:
                depth += 1
                end = next_open + len(f"<s_{key}>")
            else:
                depth -= 1
                if depth == 0:
                    content = sequence[start:next_close]
                    
                    # Prüfe ob Content weitere Tags enthält
                    if "<s_" in content:
                        # Rekursiv parsen - könnte ein Dict oder eine Liste sein
                        inner = parse_tokens(content)
                        if key in result:
                            # Wenn Key schon existiert, mache eine Liste
                            if not isinstance(result[key], list):
                                result[key] = [result[key]]
                            result[key].append(inner)
                        else:
                            result[key] = inner
                    else:
                        # Einfacher Wert
                        if key in result:
                            if not isinstance(result[key], list):
                                result[key] = [result[key]]
                            result[key].append(content.strip())
                        else:
                            result[key] = content.strip()
                    
                    end = next_close + len(f"</s_{key}>")
                else:
                    end = next_close + len(f"</s_{key}>")
        
        pos = end if end > pos + match.end() else pos + match.end()
    
    return result


def convert_cord_to_custom(cord_output):
    """
    Konvertiert CORD-v2 Ausgabe zu unserem Custom-Format.
    
    Input (CORD-v2):
    {
        "menu": [{"nm": "Coffee", "price": "3.00"}],
        "sub_total": {"subtotal_price": "56.58"},
        "total": {"total_price": "56.58"}
    }
    
    Output (Custom):
    {
        "data": {
            "merchant": "...",
            "date": "...",
            "menu": [{"Artikel": "Coffee", "Total": "3.00"}],
            "total": "56.58"
        }
    }
    """
    custom = {
        "data": {
            "merchant": "",
            "date": "",
            "menu": [],
            "total": ""
        }
    }
    
    # Menu konvertieren
    if "menu" in cord_output:
        menu = cord_output["menu"]
        if isinstance(menu, list):
            for item in menu:
                if isinstance(item, dict):
                    custom_item = {}
                    if "nm" in item:
                        custom_item["Artikel"] = item["nm"]
                    if "price" in item:
                        custom_item["Total"] = item["price"]
                    if custom_item:
                        custom["data"]["menu"].append(custom_item)
        elif isinstance(menu, dict):
            custom_item = {}
            if "nm" in menu:
                custom_item["Artikel"] = menu["nm"]
            if "price" in menu:
                custom_item["Total"] = menu["price"]
            if custom_item:
                custom["data"]["menu"].append(custom_item)
    
    # Total
    if "total" in cord_output:
        total = cord_output["total"]
        if isinstance(total, dict):
            custom["data"]["total"] = total.get("total_price", "")
        else:
            custom["data"]["total"] = str(total)
    elif "sub_total" in cord_output:
        sub = cord_output["sub_total"]
        if isinstance(sub, dict):
            custom["data"]["total"] = sub.get("subtotal_price", "")
    
    return custom


def run_inference(image_path, model, processor, device):
    """Führt Inference auf einem Bild aus."""
    
    # Bild laden
    image = Image.open(image_path).convert("RGB")
    
    # Preprocessing
    pixel_values = processor(image, return_tensors="pt").pixel_values
    pixel_values = pixel_values.to(device)
    
    # Task Token ID
    task_token_id = processor.tokenizer.convert_tokens_to_ids(TASK_TOKEN)
    
    # Inference
    with torch.no_grad():
        outputs = model.generate(
            pixel_values,
            max_length=768,
            pad_token_id=processor.tokenizer.pad_token_id,
            eos_token_id=processor.tokenizer.eos_token_id,
            decoder_start_token_id=task_token_id,
            use_cache=True,
            num_beams=1,
            bad_words_ids=[[processor.tokenizer.unk_token_id]],
            return_dict_in_generate=True,
        )
    
    # Dekodieren
    sequence = processor.batch_decode(outputs.sequences)[0]
    sequence = sequence.replace(processor.tokenizer.eos_token, "")
    sequence = sequence.replace(processor.tokenizer.pad_token, "")
    sequence = sequence.strip()
    
    return sequence


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("="*80)
    print("TEST V6 FINE-TUNED MODEL")
    print("="*80)
    
    # Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n🔧 Device: {device}")
    
    # Modell laden
    print(f"\n📥 Lade Modell von: {MODEL_PATH}")
    
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Modell nicht gefunden!")
        print(f"   Bitte zuerst trainieren: python train_model_v6_corrected.py")
        return
    
    processor = DonutProcessor.from_pretrained(MODEL_PATH)
    model = VisionEncoderDecoderModel.from_pretrained(MODEL_PATH)
    model.to(device)
    model.eval()
    
    print(f"   ✅ Modell geladen!")
    print(f"   Tokenizer Größe: {len(processor.tokenizer)}")
    
    # Test-Bilder
    print(f"\n📁 Suche Test-Bilder in: {TEST_IMAGE_DIR}")
    
    if not os.path.exists(TEST_IMAGE_DIR):
        print(f"❌ Test-Verzeichnis nicht gefunden!")
        return
    
    test_images = list(Path(TEST_IMAGE_DIR).glob("*.jpg")) + list(Path(TEST_IMAGE_DIR).glob("*.png"))
    print(f"   Gefunden: {len(test_images)} Bilder")
    
    if not test_images:
        print("❌ Keine Test-Bilder gefunden!")
        return
    
    # Inference
    print(f"\n🔍 Führe Inference aus...")
    print("-"*80)
    
    results = []
    
    for i, img_path in enumerate(test_images[:10], 1):
        print(f"\n[{i}/{min(len(test_images), 10)}] {img_path.name}")
        
        try:
            # Inference
            token_sequence = run_inference(str(img_path), model, processor, device)
            
            print(f"   Raw Output (gekürzt): {token_sequence[:150]}...")
            
            # Zu JSON parsen
            cord_json = token2json(token_sequence, processor.tokenizer)
            
            # Zu Custom-Format konvertieren
            custom_json = convert_cord_to_custom(cord_json)
            
            # Extrahiere Felder
            data = custom_json.get("data", {})
            merchant = data.get("merchant", "N/A")
            total = data.get("total", "N/A")
            menu_count = len(data.get("menu", []))
            
            print(f"   Merchant: {merchant}")
            print(f"   Total:    {total}")
            print(f"   Menu Items: {menu_count}")
            
            results.append({
                "file": img_path.name,
                "token_sequence": token_sequence,
                "cord_parsed": cord_json,
                "custom_format": custom_json,
                "merchant": merchant,
                "total": total,
                "menu_count": menu_count,
            })
            
        except Exception as e:
            print(f"   ❌ Fehler: {e}")
            import traceback
            traceback.print_exc()
            results.append({
                "file": img_path.name,
                "error": str(e)
            })
    
    # Ergebnisse speichern
    print(f"\n💾 Speichere Ergebnisse: {OUTPUT_FILE}")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    # Statistik
    successful = sum(1 for r in results if "error" not in r)
    with_total = sum(1 for r in results if "error" not in r and r.get("total", "N/A") != "N/A" and r.get("total", "") != "")
    
    print(f"\n{'='*80}")
    print(f"✅ TEST ABGESCHLOSSEN!")
    print(f"{'='*80}")
    print(f"Getestete Bilder: {len(results)}")
    print(f"Erfolgreich: {successful}")
    print(f"Mit Total erkannt: {with_total}")
    print(f"Fehlgeschlagen: {len(results) - successful}")
    print(f"\nErgebnisse: {OUTPUT_FILE}")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()
