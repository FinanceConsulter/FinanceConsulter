import os
from gradio_client import Client, handle_file

if __name__ == "__main__":

    script_dir = os.path.dirname(os.path.abspath(__file__))
    image_path = os.path.join(script_dir, "coop.jpeg")

    client = Client("deepdoctection/deepdoctection")
    result = client.predict(
        img=handle_file(image_path),  # accepts image files, e.g. JPEG, PNG
        pdf=None,   
        max_datapoints = 2,
        api_name = "/analyze_image"
    )
    print(result)


