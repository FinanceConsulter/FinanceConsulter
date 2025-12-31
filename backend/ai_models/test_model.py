import re
import json
import torch
import os
from transformers import DonutProcessor, VisionEncoderDecoderModel
from PIL import Image
from tqdm import tqdm

# --- PFADE ANPASSEN ---
MODEL_PATH = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\donut_receipt_trained_v3"
TEST_IMAGE_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data\test\images"
TEST_JSON_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data\test\json"

# Wie viele Bilder wollen wir testen?
NUM_SAMPLES = 5

def load_model():
    print("Lade Modell...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = VisionEncoderDecoderModel.from_pretrained(MODEL_PATH).to(device)
    processor = DonutProcessor.from_pretrained(MODEL_PATH)
    return model, processor, device

def run_prediction(model, processor, device, image_path):
    image = Image.open(image_path).convert("RGB")
    
    # Bild vorbereiten
    pixel_values = processor(image, return_tensors="pt").pixel_values
    pixel_values = pixel_values.to(device)

    # Prompt erstellen (muss exakt wie im Training sein)
    task_prompt = "<s_cord-v2>"
    decoder_input_ids = processor.tokenizer(task_prompt, add_special_tokens=False, return_tensors="pt").input_ids
    decoder_input_ids = decoder_input_ids.to(device)

    # Generieren
    outputs = model.generate(
        pixel_values,
        decoder_input_ids=decoder_input_ids,
        max_length=768,
        early_stopping=True,
        pad_token_id=processor.tokenizer.pad_token_id,
        eos_token_id=processor.tokenizer.eos_token_id,
        use_cache=True,
        num_beams=1,
        bad_words_ids=[[processor.tokenizer.unk_token_id]],
        return_dict_in_generate=True,
    )

    # Text dekodieren
    sequence = processor.batch_decode(outputs.sequences)[0]
    sequence = sequence.replace(processor.tokenizer.eos_token, "").replace(processor.tokenizer.pad_token, "")
    # Entferne den Prompt aus der Antwort
    sequence = re.sub(r"<.*?>", "", sequence, count=1).strip()
    
    return processor.token2json(sequence)

def main():
    model, processor, device = load_model()
    
    print(f"\n--- Starte Testlauf auf {device} ---")
    
    files = [f for f in os.listdir(TEST_IMAGE_DIR) if f.lower().endswith(('.jpg', '.png'))]
    # Nimm die ersten N Bilder
    samples = files[:NUM_SAMPLES]

    for img_file in samples:
        print("-" * 60)
        print(f"Datei: {img_file}")
        
        # 1. Vorhersage
        img_path = os.path.join(TEST_IMAGE_DIR, img_file)
        try:
            prediction = run_prediction(model, processor, device, img_path)
        except Exception as e:
            print(f"Fehler bei Vorhersage: {e}")
            continue

        # 2. Ground Truth laden (zum Vergleich)
        # Wir nutzen deine Namens-Logik (mit oder ohne -receipt)
        base_name = os.path.splitext(img_file)[0]
        json_candidates = [
            os.path.join(TEST_JSON_DIR, base_name + ".json"),
            os.path.join(TEST_JSON_DIR, base_name.split("-")[0] + ".json"),
            os.path.join(TEST_JSON_DIR, base_name.replace("-", "_") + ".json")
        ]
        
        ground_truth = None
        for json_path in json_candidates:
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    ground_truth = json.load(f)
                break
        
        # 3. Ausgabe
        print("\n🤖 MODELL VORHERSAGE:")
        print(json.dumps(prediction, indent=2, ensure_ascii=False))
        
        if ground_truth:
            print("\n✅ ECHTE DATEN (Ground Truth):")
            # Wir geben nur die Keys aus, die auch im Prediction sind, um es übersichtlich zu halten
            print(json.dumps(ground_truth, indent=2, ensure_ascii=False))
        else:
            print("\n⚠️ Kein Original-JSON gefunden.")

if __name__ == "__main__":
    main()