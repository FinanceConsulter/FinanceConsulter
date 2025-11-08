from sqlalchemy.orm import Session
from models.merchant import Merchant
from models.user import User
from models.category import Category
from schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

class CategoryRepository:
    def __init__(self, db:Session):
        self.db = db

    @staticmethod
    def convert_to_response(list:list[Category]):
        new_list = []
        for item in list:
            new_list.append(item.to_response())
        return new_list
    
    def get_userspecific_categories(self, current_user: User):
        categories = self.db.query(Category).filter(
            Category.user_id == current_user.id
        ).all()
        return self.convert_to_response(categories)
    
    def get_category(self, current_user:User, category_id:int):
        category = self.db.query(Category).filter(
            Category.user_id == current_user.id,
            Category.id == category_id
        ).first()
        if category == None:
            return None
        return category.to_response()
    
    def create_category(self, current_user:User, category: CategoryCreate):
        if self.check_existing_category(current_user, category.name):
            return None
        new_category = Category(
            user_id = current_user.id,
            **category.model_dump()
        )
        self.db.add(new_category)
        self.db.commit()
        self.db.refresh(new_category)
        return new_category.to_response()
    
    def update_category(self, current_user:User, updated_category: CategoryUpdate):
        if updated_category.name != "":
            if self.check_existing_category(current_user, updated_category.name):
                return None
        category = self.db.query(Category).filter(
            Category.id == updated_category.id,
            Category.user_id == current_user.id
        ).first()

        update_data = updated_category.model_dump(exclude_none=True)
        for field, value in update_data.items():
            if field != 'id':
                setattr(category, field, value)
        self.db.commit()
        self.db.refresh(category)
        return category.to_response()
    
    def delete_category(self, current_user: User, category_id: int):
        category = self.db.query(Category).filter(
            Category.id == category_id,
            Category.user_id == current_user.id
        ).first()

        if not category:
            return None
        self.db.delete(category)
        self.db.commit()
        return True

    def check_existing_category(self, current_user:User, category_name: str):
        existing_category = self.db.query(Category).filter(
            Category.name == category_name,
            Category.user_id == current_user.id
        ).first()
        if existing_category:
            return True
        return False