from sqlalchemy.orm import Session
from models.user import User
from schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from models.transaction import Transaction

class TransactionRepository:
    def __init__(self, db: Session):
        self.db = db
    
    @staticmethod
    def convert_to_response(list:list[Transaction]):
        new_list = []
        for item in list:
            new_list.append(item.to_response())
        return new_list

    def get_userspecific_transaction(self, current_user: User):
        transactions = self.db.query(Transaction).filter(
            Transaction.user_id == current_user.id
        ).all()
        return self.convert_to_response(transactions)
    
    def get_transaction(self, current_user: User, transaction_id: int):
        transaction = self.db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.id == transaction_id
        ).first()
        if transaction == None:
            return None
        return transaction.to_response()
    
    def create_transaction(self, current_user: User, new_transaction:TransactionCreate):
        # ToDo: check account
        # ToDo: Add category_id
        transaction = Transaction(
            user_id = current_user.id,
            account_id = new_transaction.account_id,
            date = new_transaction.date,
            description = new_transaction.description,
            amount_cents = new_transaction.amount_cents,
            category_id = new_transaction.category_id,
            currency_code = new_transaction.currency_code
        )
        # ToDo: Add tags
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction.to_response()
    """
    from sqlalchemy.exc import SQLAlchemyError
    def create_transaction(self, current_user: User, new_transaction:TransactionCreate):
        print(new_transaction.amount_cents)
        # Sicherstellen, dass die Kategorie-ID korrekt zugewiesen wird
        category_id_value = new_transaction.category_id 
        
        transaction = Transaction(
            user_id = current_user.id,
            account_id = new_transaction.account_id,
            category_id = category_id_value, 
            date = new_transaction.date, # Ist nun ein date-Objekt
            description = new_transaction.description,
            amount_cents = new_transaction.amount_cents,
            currency_code = new_transaction.currency_code
        )
        
        # 🌟 ToDo: Tags müssen hier behandelt werden, ansonsten sind sie die wahrscheinlichste Fehlerquelle!
        # Wenn new_transaction.tags = [], fahren Sie fort.
        # Wenn new_transaction.tags = [gültige ID], fügen Sie die Logik hinzu.
        # Wenn new_transaction.tags = [0], sollten Sie dies im Pydantic Validator gefiltert haben.
        
        self.db.add(transaction)
        
        try:
            self.db.commit() # Hier tritt wahrscheinlich der Fehler auf
            self.db.refresh(transaction)
            return transaction.to_response()

        except SQLAlchemyError as e:
            self.db.rollback() 
            # 🚨 DIESE AUSGABE IST KRITISCH, SIE ZEIGT DEN WAHREN DB-FEHLER
            print("\n" * 5)
            print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            print(f"SQLAlchemy Database Error (Rollback occurred): {e}") 
            print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            print("\n" * 5)
            
            # Geben Sie None zurück, damit wir sehen, ob der Router den Fehler fängt
            # Wir lassen den Fehler nicht weiterlaufen, um zu sehen, was der Router tut.
            return None 
        
        except Exception as e:
            self.db.rollback() 
            print(f"General Error: {e}") 
            return None"""