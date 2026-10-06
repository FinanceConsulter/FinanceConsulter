from sqlalchemy.orm import Session
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
        
        # Parent must belong to the current user
        if category.parent_id and not self._get_own_category(current_user, category.parent_id):
            raise ValueError("Parent category not found")

        # Check depth limit
        if category.parent_id and self.check_depth_limit(category.parent_id, current_user.id):
            raise ValueError("Maximum category depth of 10 levels reached")
        
        new_category = Category(
            user_id = current_user.id,
            **category.model_dump()
        )
        self.db.add(new_category)
        self.db.commit()
        self.db.refresh(new_category)
        return new_category.to_response()
    
    def update_category(self, current_user:User, updated_category: CategoryUpdate):
        category = self._get_own_category(current_user, updated_category.id)
        if category is None:
            return None

        # Only check for an existing name if the name is being changed
        if updated_category.name and updated_category.name != category.name:
            if self.check_existing_category(current_user, updated_category.name):
                raise ValueError(f"Category '{updated_category.name}' already exists")

        # parent_id: explicitly sent null/0 moves the category to the top level
        parent_id_set = 'parent_id' in updated_category.model_fields_set
        new_parent_id = updated_category.parent_id
        if parent_id_set and new_parent_id is not None and new_parent_id != category.parent_id:
            if new_parent_id == category.id:
                raise ValueError("A category cannot be its own parent")
            if not self._get_own_category(current_user, new_parent_id):
                raise ValueError("Parent category not found")
            if self._is_descendant_or_self(current_user, new_parent_id, category.id):
                raise ValueError("A category cannot be moved below one of its own subcategories")
            # Check depth limit if parent_id is being updated
            if self.check_depth_limit(new_parent_id, current_user.id):
                raise ValueError("Maximum category depth of 10 levels reached")

        update_data = updated_category.model_dump(exclude_none=True)
        for field, value in update_data.items():
            if field not in ('id', 'parent_id'):
                setattr(category, field, value)
        if parent_id_set:
            category.parent_id = new_parent_id
        self.db.commit()
        self.db.refresh(category)
        return category.to_response()
    
    def delete_category(self, current_user: User, category_id: int):
        """
        Delete a category and all its subcategories recursively.
        """
        category = self.db.query(Category).filter(
            Category.id == category_id,
            Category.user_id == current_user.id
        ).first()

        if not category:
            return None
        
        # First, recursively delete all subcategories
        self._delete_subcategories_recursive(current_user, category_id, visited={category_id})
        
        self.db.delete(category)
        self.db.commit()
        return True
    
    def _delete_subcategories_recursive(self, current_user: User, parent_id: int, visited: set[int] | None = None):
        """
        Helper method to recursively delete all subcategories of a given parent.
        `visited` guards against parent cycles in existing data.
        """
        if visited is None:
            visited = {parent_id}

        # Find all direct children
        subcategories = self.db.query(Category).filter(
            Category.parent_id == parent_id,
            Category.user_id == current_user.id
        ).all()
        
        for subcategory in subcategories:
            if subcategory.id in visited:
                continue
            visited.add(subcategory.id)
            self._delete_subcategories_recursive(current_user, subcategory.id, visited)
            self.db.delete(subcategory)
        
        self.db.commit()

    def _get_own_category(self, current_user: User, category_id: int):
        return self.db.query(Category).filter(
            Category.id == category_id,
            Category.user_id == current_user.id
        ).first()

    def _is_descendant_or_self(self, current_user: User, category_id: int, ancestor_id: int) -> bool:
        """
        Walk up from category_id and return True if ancestor_id is reached (cycle-safe).
        """
        seen = set()
        current_id = category_id
        while current_id is not None and current_id not in seen:
            if current_id == ancestor_id:
                return True
            seen.add(current_id)
            row = self.db.query(Category.parent_id).filter(
                Category.id == current_id,
                Category.user_id == current_user.id
            ).first()
            current_id = row[0] if row else None
        return False

    def check_existing_category(self, current_user:User, category_name: str):
        existing_category = self.db.query(Category).filter(
            Category.name == category_name,
            Category.user_id == current_user.id
        ).first()
        if existing_category:
            return True
        return False
    
    def get_category_depth(self, category_id: int, max_iterations: int = 15, user_id: int | None = None) -> int:
        """
        Calculate the depth of a category in the hierarchy.
        Returns 0 for main categories, 1 for first level subcategories, etc.
        Max depth is limited to 10 levels (0-9).
        """
        depth = 0
        current_id = category_id
        iterations = 0
        
        while current_id and iterations < max_iterations:
            query = self.db.query(Category).filter(Category.id == current_id)
            if user_id is not None:
                query = query.filter(Category.user_id == user_id)
            category = query.first()
            if not category or not category.parent_id:
                break
            depth += 1
            current_id = category.parent_id
            iterations += 1
            
            if depth >= 10:
                break
        
        return depth
    
    def check_depth_limit(self, parent_id: int, user_id: int | None = None) -> bool:
        """
        Check if adding a category under the given parent would exceed the depth limit.
        Returns True if depth limit would be exceeded, False otherwise.
        """
        MAX_DEPTH = 9 
        
        if not parent_id:
            return False
        
        parent_depth = self.get_category_depth(parent_id, user_id=user_id)
        return parent_depth >= MAX_DEPTH