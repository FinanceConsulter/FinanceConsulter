from sqlalchemy.orm import Session
from models.user import User
from models.tag import Tag
from schemas.tag import TagCreate, TagResponse, TagUpdate

class TagRepository:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def convert_to_response(list:list[Tag]):
        new_list = []
        for item in list:
            new_list.append(item.to_response())
        return new_list
    
    def internal_get_tags_by_id(self, current_user:User, tags:list[int]):
        tags = self.db.query(Tag).filter(
            Tag.id.in_(tags),
            Tag.user_id == current_user.id
            ).all()
        return tags

    def get_userspecific_tags(self, current_user:User):
        tags = self.db.query(Tag).filter(
            Tag.user_id == current_user.id
        ).all()
        return self.convert_to_response(tags)
    
    def get_tag(self, current_user: User, tag_id: int):
        tag = self.db.query(Tag).filter(
            Tag.user_id == current_user.id,
            Tag.id == tag_id
        ).first()
        if tag == None:
            return None
        return tag.to_response()

    def create_tag(self, current_user: User, new_tag: TagCreate):
        if self.check_existing_tag(current_user, new_tag.name):
            return None
        tag = Tag(
            user_id = current_user.id,
            **new_tag.model_dump()
        )
        self.db.add(tag)
        self.db.commit()
        self.db.refresh(tag)
        return tag.to_response()
    
    def update_tag(self, current_user: User, update_tag: TagUpdate):
        if update_tag.name != "":
            if self.check_existing_tag(current_user, update_tag.name):
                return None
        tag = self.db.query(Tag).filter(
            Tag.id == update_tag.id,
            Tag.user_id == current_user.id
        ).first()

        update_data = update_tag.model_dump(exclude_none=True)
        for field, value in update_data.items():
            if field != 'id':
                setattr(tag, field, value)
        self.db.commit()
        self.db.refresh(tag)
        return tag.to_response()

    def delete_tag(self, current_user: User, tag_id: int):
        tag = self.db.query(Tag).filter(
            Tag.id == tag_id,
            Tag.user_id == current_user.id
        ).first()

        if not tag:
            return None
        self.db.delete(tag)
        self.db.commit()
        return True

    def check_existing_tag(self, current_user: User, tag_name: str):
        tag = self.db.query(Tag).filter(
            Tag.name == tag_name,
            Tag.user_id == current_user.id
        ).first()
        if tag:
            return True
        return False