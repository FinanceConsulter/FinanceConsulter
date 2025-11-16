import os
from transformers import AutoProcessor, VisionEncoderDecoderModel

MODEL_NAME = "naver-clova-ix/donut-base-finetuned-cord-v2"
LOCAL_PATH = "donut_receipt_v1" 

os.makedirs(LOCAL_PATH, exist_ok=True)

print(f"Downloading {MODEL_NAME}...")

processor = AutoProcessor.from_pretrained(MODEL_NAME)
model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME)

model.save_pretrained(LOCAL_PATH)
processor.save_pretrained(LOCAL_PATH)

print(f"Model and processor saved successfully to: {LOCAL_PATH}")