from sqlalchemy.orm import Session
from models.merchant import Merchant
from models.user import User
from fastapi.responses import Response

import easyocr
from io import BytesIO
from PIL import Image, ImageDraw
import os

import torch
from transformers import AutoProcessor, VisionEncoderDecoderModel 

class RepositoryReceipt:
    def __init__(self, db: Session):
        self.db = db
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(os.path.dirname(current_dir))
        LOCAL_MODEL_PATH = os.path.join(backend_dir, "ai_models", "donut_receipt_v1")
        
        if not os.path.exists(LOCAL_MODEL_PATH):
            raise FileNotFoundError(f"Model path does not exist: {LOCAL_MODEL_PATH}")
        
        self.processor = AutoProcessor.from_pretrained(
            LOCAL_MODEL_PATH,
            local_files_only=True
        )
        self.model = VisionEncoderDecoderModel.from_pretrained(
            LOCAL_MODEL_PATH,
            local_files_only=True
        )
    
    async def create_receipt(self, picture):
        file_bytes = BytesIO(await picture.read())
        image = Image.open(file_bytes).convert("RGB")
        
        task_prompt = "<s_cord-v2>" 
        
        inputs = self.processor(image, task_prompt, return_tensors="pt")
        outputs = self.model.generate(
            input_ids=inputs.input_ids,
            pixel_values=inputs.pixel_values,
            max_length=512,
            pad_token_id=self.processor.tokenizer.pad_token_id,
            eos_token_id=self.processor.tokenizer.eos_token_id,
            use_cache=True,
            bad_words_ids=[[self.processor.tokenizer.unk_token_id]],
        )
        print(type(outputs))
        sequence = self.processor.batch_decode(outputs)[0]
        
        sequence = sequence.replace(self.processor.tokenizer.eos_token, "").replace(self.processor.tokenizer.pad_token, "")
        structured_data = self.processor.token2json(sequence)

        print("Structured Data:\n", structured_data)
        return {"data": structured_data}