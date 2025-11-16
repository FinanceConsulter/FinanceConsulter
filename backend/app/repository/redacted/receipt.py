class RepositoryReceipt:
    def __init__(self, db: Session):
        self.db = db
    
    @staticmethod
    def convert_image_to_jpeg_bytes(generic_image: Image.Image) -> BytesIO:
        byte_arr = BytesIO()
        if generic_image.mode != 'RGB':
            image_to_save = generic_image.convert('RGB')
        else:
            image_to_save = generic_image
            
        image_to_save.save(byte_arr, format='JPEG')
        byte_arr.seek(0)
        return byte_arr
        
    async def create_receipt(self,picture):
        file_bytes = BytesIO(await picture.read())
        image = Image.open(file_bytes)
        reader = easyocr.Reader(['de'])
        
        grayscale_image = image.convert('L')
        binarized_image = grayscale_image.point(lambda x: 0 if x < 180 else 255, '1')
        
        grayscale_image = self.convert_image_to_jpeg_bytes(grayscale_image)
        grayscale_image = Image.open(grayscale_image)
        
        binarized_image = self.convert_image_to_jpeg_bytes(binarized_image)
        binarized_image = Image.open(binarized_image)
        
        
        
        print(type(image))
        print(type(grayscale_image))
        print(type(binarized_image))
        
        result = reader.readtext(grayscale_image, detail=0, paragraph=True)
        print(result)
        for text in result:
            print(text)
        result = reader.readtext(grayscale_image)
        draw = ImageDraw.Draw(grayscale_image)
        for (bbox, text, confidence) in result:
            # bbox ist Liste von 4 Punkten (x,y)
            points = [(point[0], point[1]) for point in bbox]
            draw.polygon(points, outline='red', width=2)
            draw.text(points[0], f"{text} ({confidence:.2f})", fill='red')
        
        # Zurück als PNG
        img_byte_arr = BytesIO()
        grayscale_image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        return Response(img_byte_arr.getvalue(), media_type="image/png")

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