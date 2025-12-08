from sqlalchemy.orm import Session
from models.user import User
from models.receipt import Receipt, ReceiptLineItem
from models.tag import ReceiptLineItemTag
from schemas.receipt import ReceiptCreate, ReceiptUpdate, ReceiptResponse
from repository.tag import TagRepository
from InternalResponse import InternalResponse
from fastapi import status
import os
from io import BytesIO
from PIL import Image
import torch
from transformers import AutoProcessor, VisionEncoderDecoderModel 

class ReceiptRepository:
    def __init__(self, db: Session):
        self.db = db
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(os.path.dirname(current_dir))
        LOCAL_MODEL_PATH = os.path.join(backend_dir, "ai_models", "donut_receipt_v1")
        
        if os.path.exists(LOCAL_MODEL_PATH):
            try:
                self.processor = AutoProcessor.from_pretrained(
                    LOCAL_MODEL_PATH,
                    local_files_only=True
                )
                self.model = VisionEncoderDecoderModel.from_pretrained(
                    LOCAL_MODEL_PATH,
                    local_files_only=True
                )
            except Exception as e:
                print(f"Warning: Could not load AI model: {e}")
                self.processor = None
                self.model = None
        else:
            print(f"Warning: Model path does not exist: {LOCAL_MODEL_PATH}")
            self.processor = None
            self.model = None

    def get_receipts(self, current_user: User):
        receipts = self.db.query(Receipt).filter(Receipt.user_id == current_user.id).all()
        return [r.to_response() for r in receipts]

    def get_receipt(self, current_user: User, receipt_id: int):
        receipt = self.db.query(Receipt).filter(
            Receipt.user_id == current_user.id,
            Receipt.id == receipt_id
        ).first()
        if not receipt:
            return None
        return receipt.to_response()

    def create_receipt(self, current_user: User, receipt_create: ReceiptCreate):
        new_receipt = Receipt(
            user_id=current_user.id,
            merchant_id=receipt_create.merchant_id,
            purchase_date=receipt_create.purchase_date,
            total_cents=receipt_create.total_cents,
            raw_file_path=receipt_create.raw_file_path,
            ocr_text=receipt_create.ocr_text
        )
        self.db.add(new_receipt)
        self.db.commit()
        self.db.refresh(new_receipt)

        if receipt_create.line_items:
            tag_repo = TagRepository(self.db)
            for item in receipt_create.line_items:
                line_item = ReceiptLineItem(
                    receipt_id=new_receipt.id,
                    product_name=item.product_name,
                    quantity=item.quantity,
                    unit_price_cents=item.unit_price_cents,
                    total_price_cents=item.total_price_cents
                )
                self.db.add(line_item)
                self.db.flush()

                if item.tags:
                    tags = tag_repo.internal_get_tags_by_id(current_user, item.tags)
                    for tag in tags:
                        assoc = ReceiptLineItemTag(line_item_id=line_item.id, tag_id=tag.id)
                        self.db.add(assoc)
            
            self.db.commit()
            self.db.refresh(new_receipt)
        
        return new_receipt.to_response()

    def update_receipt(self, current_user: User, receipt_id: int, receipt_update: ReceiptUpdate):
        receipt = self.db.query(Receipt).filter(
            Receipt.user_id == current_user.id,
            Receipt.id == receipt_id
        ).first()
        if not receipt:
            return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

        if receipt_update.merchant_id is not None:
            receipt.merchant_id = receipt_update.merchant_id
        if receipt_update.purchase_date is not None:
            receipt.purchase_date = receipt_update.purchase_date
        if receipt_update.total_cents is not None:
            receipt.total_cents = receipt_update.total_cents
        if receipt_update.raw_file_path is not None:
            receipt.raw_file_path = receipt_update.raw_file_path
        if receipt_update.ocr_text is not None:
            receipt.ocr_text = receipt_update.ocr_text
        
        self.db.commit()
        self.db.refresh(receipt)
        return receipt.to_response()

    def delete_receipt(self, current_user: User, receipt_id: int):
        receipt = self.db.query(Receipt).filter(
            Receipt.user_id == current_user.id,
            Receipt.id == receipt_id
        ).first()
        if not receipt:
            return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
        
        self.db.delete(receipt)
        self.db.commit()
        return InternalResponse(state=status.HTTP_200_OK, detail="Receipt deleted successfully")

    async def analyze_receipt(self, picture):
        if not self.processor or not self.model:
             return {"error": "AI model not loaded"}

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
        
        sequence = self.processor.batch_decode(outputs)[0]
        sequence = sequence.replace(self.processor.tokenizer.eos_token, "").replace(self.processor.tokenizer.pad_token, "")
        structured_data = self.processor.token2json(sequence)

        return {"data": structured_data}