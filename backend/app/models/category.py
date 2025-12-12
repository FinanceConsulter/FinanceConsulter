from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from data_access.data_access import Base
from schemas.category import CategoryResponse


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_category_name'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    parent_id = Column(Integer, ForeignKey('categories.id', ondelete='CASCADE'))
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'expense', 'income'
    description = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="categories")
    parent = relationship("Category", remote_side=[id], backref="subcategories")
    transactions = relationship("Transaction", back_populates="category")

    def to_response(self):
        return CategoryResponse(
            id = self.id,
            name = self.name,
            type = self.type,
            parent_id = self.parent_id,
            description = self.description
        )