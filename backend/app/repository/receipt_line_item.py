from sqlalchemy.orm import Session
from models.user import User
from models.receipt import Receipt, ReceiptLineItem
from models.tag import ReceiptLineItemTag
from schemas.receipt_line_item import ReceiptLineItemCreate, ReceiptLineItemUpdate
from repository.tag import TagRepository
from InternalResponse import InternalResponse
from fastapi import status

class ReceiptLineItemRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_line_items(self, current_user: User, receipt_id: int):
        # Verify receipt belongs to user
        receipt = self.db.query(Receipt).filter(Receipt.id == receipt_id, Receipt.user_id == current_user.id).first()
        if not receipt:
             return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
        
        return [item.to_response() for item in receipt.line_items]

    def create_line_item(self, current_user: User, receipt_id: int, item_create: ReceiptLineItemCreate):
        receipt = self.db.query(Receipt).filter(Receipt.id == receipt_id, Receipt.user_id == current_user.id).first()
        if not receipt:
             return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

        line_item = ReceiptLineItem(
            receipt_id=receipt.id,
            product_name=item_create.product_name,
            quantity=item_create.quantity,
            unit_price_cents=item_create.unit_price_cents,
            total_price_cents=item_create.total_price_cents
        )
        self.db.add(line_item)
        self.db.flush()

        if item_create.tags:
            tags = TagRepository(self.db).internal_get_tags_by_id(current_user, item_create.tags)
            for tag in tags:
                assoc = ReceiptLineItemTag(line_item_id=line_item.id, tag_id=tag.id)
                self.db.add(assoc)
        
        self.db.commit()
        self.db.refresh(line_item)
        return line_item.to_response()

    def update_line_item(self, current_user: User, line_item_id: int, item_update: ReceiptLineItemUpdate):
        # Join with Receipt to check user_id
        line_item = self.db.query(ReceiptLineItem).join(Receipt).filter(
            ReceiptLineItem.id == line_item_id,
            Receipt.user_id == current_user.id
        ).first()

        if not line_item:
            return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Line item not found")

        if item_update.product_name is not None:
            line_item.product_name = item_update.product_name
        if item_update.quantity is not None:
            line_item.quantity = item_update.quantity
        if item_update.unit_price_cents is not None:
            line_item.unit_price_cents = item_update.unit_price_cents
        if item_update.total_price_cents is not None:
            line_item.total_price_cents = item_update.total_price_cents
        
        if item_update.tags is not None:
            # Remove existing tags
            self.db.query(ReceiptLineItemTag).filter(ReceiptLineItemTag.line_item_id == line_item.id).delete()
            # Add new tags
            if item_update.tags:
                tags = TagRepository(self.db).internal_get_tags_by_id(current_user, item_update.tags)
                for tag in tags:
                    assoc = ReceiptLineItemTag(line_item_id=line_item.id, tag_id=tag.id)
                    self.db.add(assoc)

        self.db.commit()
        self.db.refresh(line_item)
        return line_item.to_response()

    def delete_line_item(self, current_user: User, line_item_id: int):
        line_item = self.db.query(ReceiptLineItem).join(Receipt).filter(
            ReceiptLineItem.id == line_item_id,
            Receipt.user_id == current_user.id
        ).first()

        if not line_item:
            return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Line item not found")

        self.db.delete(line_item)
        self.db.commit()
        return InternalResponse(state=status.HTTP_200_OK, detail="Line item deleted successfully")
