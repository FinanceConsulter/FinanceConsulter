import os
import shutil
from transformers import DonutProcessor, VisionEncoderDecoderModel

MODEL_NAME = "naver-clova-ix/donut-base-finetuned-cord-v2"

# 1. Wir nutzen einen relativen Pfad zum Skript-Ort, damit es flexibel bleibt
# (landet in backend/ai_models/donut_receipt_v1)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Falls das Skript im Root ausgeführt wird, stellen wir sicher, dass es in ai_models landet:
if "ai_models" not in BASE_DIR:
    LOCAL_PATH = os.path.join(BASE_DIR, "ai_models", "donut_receipt_v1")
else:
    LOCAL_PATH = os.path.join(BASE_DIR, "donut_receipt_v1")

print(f"Zielverzeichnis: {LOCAL_PATH}")

# 2. Lösche alten Ordner falls vorhanden (für sauberen Download)
if os.path.exists(LOCAL_PATH):
    print(f"Lösche existierenden Ordner...")
    shutil.rmtree(LOCAL_PATH)

os.makedirs(LOCAL_PATH, exist_ok=True)

print(f"Downloading {MODEL_NAME}...")

# Lade Prozessor und Modell
processor = DonutProcessor.from_pretrained(MODEL_NAME)
model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME)

# Speichere ALLES lokal
print("Speichere Modell und Prozessor...")
model.save_pretrained(LOCAL_PATH)
processor.save_pretrained(LOCAL_PATH)

print(f"✅ Download abgeschlossen.")

# 3. Check auf Gewichte
if os.path.exists(os.path.join(LOCAL_PATH, "pytorch_model.bin")) or os.path.exists(os.path.join(LOCAL_PATH, "model.safetensors")):
    print("-> Gewichte gefunden! Training kann starten.")
else:
    print("-> ❌ WARNUNG: Keine Gewichts-Datei gefunden!")