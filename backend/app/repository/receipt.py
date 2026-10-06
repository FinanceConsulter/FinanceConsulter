from sqlalchemy.orm import Session
from models.user import User
from models.receipt import Receipt, ReceiptLineItem
from models.tag import ReceiptLineItemTag
from schemas.receipt import ReceiptCreate, ReceiptUpdate, ReceiptResponse
from repository.tag import TagRepository
from InternalResponse import InternalResponse
from fastapi import status
from models.merchant import Merchant
from models.transaction import Transaction
from repository.transaction import TransactionRepository
from schemas.transaction import TransactionCreate

class ReceiptRepository:
    # Das Donut-Modell wird hier nicht mehr geladen; Scans laufen über services.receipt_scanner (/receipt/scan).
    def __init__(self, db: Session):
        self.db = db

    def _owns_merchant(self, current_user: User, merchant_id: int) -> bool:
        return self.db.query(Merchant.id).filter(
            Merchant.id == merchant_id,
            Merchant.user_id == current_user.id
        ).first() is not None

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
        merchant_id = receipt_create.merchant_id
        if merchant_id and not self._owns_merchant(current_user, merchant_id):
            return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Merchant not found")
        
        # Handle merchant_name if provided and no ID
        if not merchant_id and receipt_create.merchant_name:
            merchant = self.db.query(Merchant).filter(
                Merchant.user_id == current_user.id,
                Merchant.name == receipt_create.merchant_name
            ).first()
            
            if not merchant:
                merchant = Merchant(user_id=current_user.id, name=receipt_create.merchant_name)
                self.db.add(merchant)
                self.db.flush()
            
            merchant_id = merchant.id

        # Create Transaction if requested
        transaction_id = None
        if receipt_create.create_transaction and receipt_create.account_id:
            # category_id is optional: without one, TransactionRepository.create_transaction auto-categorizes
            tx_repo = TransactionRepository(self.db)
            tx_create = TransactionCreate(
                account_id=receipt_create.account_id,
                date=receipt_create.purchase_date,
                description=f"Receipt from {receipt_create.merchant_name or 'Unknown'}",
                amount_cents=-abs(receipt_create.total_cents) if receipt_create.total_cents else 0,
                category_id=receipt_create.category_id,
                currency_code="CHF",
                tags=[]
            )
            tx_response = tx_repo.create_transaction(current_user, tx_create)
            if isinstance(tx_response, InternalResponse):
                return tx_response
            transaction_id = tx_response.id

        new_receipt = Receipt(
            user_id=current_user.id,
            merchant_id=merchant_id,
            transaction_id=transaction_id,
            purchase_date=receipt_create.purchase_date.isoformat(),
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
            if not self._owns_merchant(current_user, receipt_update.merchant_id):
                return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Merchant not found")
            receipt.merchant_id = receipt_update.merchant_id
        if receipt_update.purchase_date is not None:
            receipt.purchase_date = receipt_update.purchase_date.isoformat()
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