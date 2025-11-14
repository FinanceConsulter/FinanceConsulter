from sqlalchemy.orm import Session
from models.merchant import Merchant
from models.user import User
from fastapi.responses import Response

import easyocr
from io import BytesIO
from PIL import Image, ImageDraw

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from transformers import AutoProcessor, AutoModelForCausalLM

class RepositoryReceipt:
    def __init__(self, db: Session):
        self.db = db
        model_id = "ucsahin/Florence-2-large-TableDetection"
        model = AutoModelForCausalLM.from_pretrained(model_id,
                                             trust_remote_code=True)
        processor = AutoProcessor.from_pretrained(model_id,
                                          trust_remote_code=True)

    async def create_receipt(self,picture):
        file_bytes = BytesIO(await picture.read())
        image = Image.open(file_bytes)
        reader = easyocr.Reader(['de'])
        result = reader.readtext(image, detail=0, paragraph=True)
        print(result)
        for text in result:
            print(text)
        result = reader.readtext(image)
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

    def run_example(self, task_prompt, image, max_new_tokens=256):
        prompt = task_prompt
        inputs = self.processor(text=prompt, images=image, return_tensors="pt")
        generated_ids = self.model.generate(
        input_ids=inputs["input_ids"].cuda(),
        pixel_values=inputs["pixel_values"].cuda(),
        max_new_tokens=max_new_tokens,
        early_stopping=False,
        do_sample=False,
        num_beams=3,
        )
        generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
        parsed_answer = self.processor.post_process_generation(
            generated_text,
            task=task_prompt,
            image_size=(image.width, image.height)
        )
        return parsed_answer

    def plot_bbox(image, data):
        # Create a figure and axes
        fig, ax = plt.subplots(figsize=(12, 10))
        # Display the image
        ax.imshow(image)
        # Plot each bounding box
        for bbox, label in zip(data['bboxes'], data['labels']):
            # Unpack the bounding box coordinates
            x1, y1, x2, y2 = bbox
            # Create a Rectangle patch
            rect = patches.Rectangle((x1, y1), x2-x1, y2-y1, linewidth=1, edgecolor='r', facecolor='none')
            # Add the rectangle to the Axes
            ax.add_patch(rect)
            # Annotate the label
            plt.text(x1, y1, label, color='white', fontsize=8, bbox=dict(facecolor='red', alpha=0.5))
        # Remove the axis ticks and labels
        ax.axis('off')
        # Show the plot
        plt.show()
    

if __name__ == "__main__":
    print("hello world")
    image = Image.open("../../../../pics/Testdaten/coop 1.jpeg")