from __future__ import annotations
from typing import Any, Dict
from datetime import datetime
from sqlalchemy.orm import as_declarative, declared_attr
from sqlalchemy import inspect

@as_declarative()
class Base:
    id: Any
    __name__: str

    @declared_attr
    def __tablename__(cls) -> str: 
        return cls.__name__.lower()

    def to_dict(self, include_relationships: bool = False) -> Dict[str, Any]:
        mapper = inspect(self.__class__)
        data = {col.key: getattr(self, col.key) for col in mapper.columns}
        if include_relationships:
            for name, rel in mapper.relationships.items():
                val = getattr(self, name)
                if val is None:
                    data[name] = None
                elif rel.uselist:
                    data[name] = [getattr(o, 'id', None) for o in val]
                else:
                    data[name] = getattr(val, 'id', None)
        return data

    def to_json(self) -> Dict[str, Any]:
        return self.to_dict()
