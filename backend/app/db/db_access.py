import os
import sqlite3
from typing import Optional, Tuple, List


class Base_Access_Controller:
	def __init__(self, db_path: Optional[str] = None):
		"""
		Initializes the database connection with a project-internal, relative database path.

		Default DB: <repo_root>/db/finance_consulter.db
		"""
		repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
		default_db = os.path.join(repo_root, "db", "finance_consulter.db")

		db_file = db_path or default_db
		self.connection = sqlite3.connect(db_file)
		self.connection.row_factory = sqlite3.Row
		
		self.connection.execute("PRAGMA foreign_keys = ON;")

	def execute(self, query: str, params: Optional[Tuple] = None) -> sqlite3.Cursor:
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

	def fetchall(self, query: str, params: Optional[Tuple] = None) -> List[sqlite3.Row]:
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

	def fetchone(self, query: str, params: Optional[Tuple] = None) -> Optional[sqlite3.Row]:
		"""
		Executes an SQL query and returns the first row of the result.

		Args:
			query (str): The SQL query.
			params (tuple): Parameters for the query (default: empty tuple).

		Returns:
			sqlite3.Row | None: The first row of the query result or None if no row.
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

