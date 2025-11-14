from sqlalchemy.orm import Session
from models.merchant import Merchant
from models.user import User
from fastapi.responses import Response

import easyocr
from io import BytesIO
from PIL import Image, ImageDraw

class RepositoryReceipt:
    def __init__(self, db: Session):
        self.db = db

    async def create_receipt(self,picture):
        file_bytes = BytesIO(await picture.read())
        image = Image.open(file_bytes)
        reader = easyocr.Reader(['de'])
        result = reader.readtext(image)
        print(result)
        draw = ImageDraw.Draw(image)
        for (bbox, text, confidence) in result:
            # bbox ist Liste von 4 Punkten (x,y)
            points = [(point[0], point[1]) for point in bbox]
            draw.polygon(points, outline='red', width=2)
            draw.text(points[0], f"{text} ({confidence:.2f})", fill='red')
        
        # Zurück als PNG
        img_byte_arr = BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        return Response(img_byte_arr.getvalue(), media_type="image/png")
