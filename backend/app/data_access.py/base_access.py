import os
import sqlite3
from pathlib import Path

class Base_Access:
    def __init__(self):
        """

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        print(base_dir)
        db_file = os.path.join(base_dir, "db", "finance_consulter.db")  
        self.connection = sqlite3.connect(db_file)
        self.connection.row_factory = sqlite3.Row
        """
        project_root = Path(__file__).parent.parent.parent.parent
        db_file = project_root / "db" / "finance_consulter.db"
        
        
        self.connection = sqlite3.connect(str(db_file))
        self.connection.row_factory = sqlite3.Row
        

    def execute(self, query: str, params: tuple = None) -> sqlite3.Cursor: #leeres tuple als default value?
        """
        Executes a generic SQL command (INSERT, UPDATE, DELETE).

        Args:
            query (str): The SQL command to be executed.
            params (tuple): Parameters for the SQL command (default: empty tuple).

        Returns:
            sqlite3.Cursor: Cursor object after executing the command.
        """
        if params is None:
            params = ()

        cursor = self.connection.cursor()
        cursor.execute(query, params)
        self.connection.commit()
        return cursor

    def fetchall(self, query: str, params: tuple = None) -> list:
        """
        Executes an SQL query and returns all rows of the result.

        Args:
            query (str): The SQL query.
            params (tuple): Parameters for the query (default: empty tuple).

        Returns:
            list: A list of rows corresponding to the query result.
        """

        if params is None:
            params = ()

        cursor = self.connection.cursor()
        cursor.execute(query, params)
        return cursor.fetchall()

    def fetchone(self, query: str, params: tuple = None) -> sqlite3.Row:
        """
        Executes an SQL query and returns the first row of the result.

        Args:
            query (str): The SQL query.
            params (tuple): Parameters for the query (default: empty tuple).

        Returns:
            sqlite3.Row: The first row of the query result.
        """

        if params is None:
            params = ()
            
        cursor = self.connection.cursor()
        cursor.execute(query, params)
        return cursor.fetchone()

    def close(self) -> None:
        """
        Closes the database connection.
        """
        self.connection.close()

if __name__ == '__main__':
    bs = Base_Access()
    
    # Test the users table
    users = bs.fetchall("SELECT * FROM users")
    for user in users:
        print(user['id'])