"""
Test-Script für das fine-getunete Custom-Receipt-Modell.
"""
import os
import json
import torch
from transformers import VisionEncoderDecoderModel, DonutProcessor
from PIL import Image
from pathlib import Path

# =============================================================================
# KONFIGURATION
# =============================================================================

MODEL_PATH = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\donut_custom_finetuned"
TEST_IMAGE_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data\validate\images"
OUTPUT_FILE = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\finetuned_test_results.json"

CUSTOM_TASK_TOKEN = "<s_custom_receipt>"

# =============================================================================
# INFERENCE FUNKTION
# =============================================================================

def run_inference(image_path, model, processor, device):
    """Führt Inference auf einem Bild aus."""
    
    # Bild laden
    image = Image.open(image_path).convert("RGB")
    
    # Preprocessing
    pixel_values = processor(image, return_tensors="pt").pixel_values
    pixel_values = pixel_values.to(device)
    
    # Inference
    max_length = model.config.max_length if model.config.max_length is not None else 768
    
    with torch.no_grad():
        outputs = model.generate(
            pixel_values,
            max_length=max_length,
            pad_token_id=processor.tokenizer.pad_token_id,
            eos_token_id=processor.tokenizer.eos_token_id,
            use_cache=True,
            num_beams=1,
            bad_words_ids=[[processor.tokenizer.unk_token_id]],
            return_dict_in_generate=True,
        )
    
    # Dekodieren
    sequence = processor.batch_decode(outputs.sequences)[0]
    sequence = sequence.replace(processor.tokenizer.eos_token, "").replace(processor.tokenizer.pad_token, "")
    sequence = sequence.strip()
    
    # Task Token entfernen
    if sequence.startswith(CUSTOM_TASK_TOKEN):
        sequence = sequence[len(CUSTOM_TASK_TOKEN):].strip()
    
    return sequence


def token2json(token_sequence):
    """
    Konvertiert Donut Token-Sequenz zurück zu JSON.
    
    Beispiel Input:
    <s_data><s_merchant>Taco Bell</s_merchant><s_total>7.61</s_total></s_data>
    
    Output:
    {"data": {"merchant": "Taco Bell", "total": "7.61"}}
    """
    import re
    
    # Stack für verschachtelte Strukturen
    stack = [{}]
    current_key = None
    
    # Regex für Tags und Content
    tag_pattern = r'<(/?)s_([^>]+)>|([^<]+)'
    
    for match in re.finditer(tag_pattern, token_sequence):
        closing, tag_name, content = match.groups()
        
        if tag_name:  # Es ist ein Tag
            if closing:  # Closing Tag
                if len(stack) > 1:
                    completed = stack.pop()
                    parent = stack[-1]
                    if current_key:
                        parent[current_key] = completed
                        current_key = None
            else:  # Opening Tag
                current_key = tag_name
                stack.append({})
        
        elif content:  # Es ist Content
            content = content.strip()
            if content and current_key:
                parent = stack[-2] if len(stack) > 1 else stack[-1]
                parent[current_key] = content
                current_key = None
    
    return stack[0] if stack else {}


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("="*80)
    print("TEST FINE-TUNED CUSTOM RECEIPT MODEL")
    print("="*80)
    
    # Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n🔧 Device: {device}")
    
    # Modell laden
    print(f"\n📥 Lade Fine-Tuned Modell von: {MODEL_PATH}")
    
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Modell nicht gefunden! Bitte zuerst trainieren:")
        print(f"   python train_model_v5_fixed.py")
        return
    
    processor = DonutProcessor.from_pretrained(MODEL_PATH)
    model = VisionEncoderDecoderModel.from_pretrained(MODEL_PATH)
    model.to(device)
    model.eval()
    
    print(f"   ✅ Modell geladen!")
    print(f"   Tokenizer Größe: {len(processor.tokenizer)}")
    
    # Test-Bilder sammeln
    print(f"\n📁 Suche Test-Bilder in: {TEST_IMAGE_DIR}")
    
    if not os.path.exists(TEST_IMAGE_DIR):
        print(f"❌ Test-Verzeichnis nicht gefunden!")
        return
    
    test_images = list(Path(TEST_IMAGE_DIR).glob("*.jpg")) + list(Path(TEST_IMAGE_DIR).glob("*.png"))
    print(f"   Gefunden: {len(test_images)} Bilder")
    
    if not test_images:
        print("❌ Keine Test-Bilder gefunden!")
        return
    
    # Inference auf allen Bildern
    print(f"\n🔍 Führe Inference aus...")
    print("-"*80)
    
    results = []
    
    for i, img_path in enumerate(test_images[:10], 1):  # Erste 10 Bilder
        print(f"\n[{i}/{min(len(test_images), 10)}] {img_path.name}")
        
        try:
            # Inference
            token_sequence = run_inference(str(img_path), model, processor, device)
            
            # Zu JSON konvertieren
            try:
                parsed_json = token2json(token_sequence)
            except Exception as e:
                print(f"   ⚠️ JSON Parse Error: {e}")
                parsed_json = {}
            
            # Extrahiere wichtige Felder
            merchant = parsed_json.get("data", {}).get("merchant", "N/A")
            total = parsed_json.get("data", {}).get("total", "N/A")
            date = parsed_json.get("data", {}).get("date", "N/A")
            
            print(f"   Merchant: {merchant}")
            print(f"   Total:    {total}")
            print(f"   Date:     {date}")
            
            # Speichere Ergebnis
            results.append({
                "file": img_path.name,
                "token_sequence": token_sequence,
                "parsed": parsed_json,
                "merchant": merchant,
                "total": total,
                "date": date,
            })
            
        except Exception as e:
            print(f"   ❌ Fehler: {e}")
            results.append({
                "file": img_path.name,
                "error": str(e)
            })
    
    # Ergebnisse speichern
    print(f"\n💾 Speichere Ergebnisse: {OUTPUT_FILE}")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*80}")
    print(f"✅ TEST ABGESCHLOSSEN!")
    print(f"{'='*80}")
    print(f"Getestete Bilder: {len(results)}")
    print(f"Erfolgreiche: {sum(1 for r in results if 'error' not in r)}")
    print(f"Fehlgeschlagen: {sum(1 for r in results if 'error' in r)}")
    print(f"\nErgebnisse gespeichert in: {OUTPUT_FILE}")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()
