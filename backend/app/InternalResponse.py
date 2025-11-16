from fastapi import status
class InternalResponse:
    def __init__(self, state: status,detail: str):
        self.state = state
        self.detail = detail