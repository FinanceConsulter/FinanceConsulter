import torch
from transformers import VisionEncoderDecoderModel, DonutProcessor, TrainingArguments, Trainer
from datasets import Dataset, Features, Value
from PIL import Image
import json
import os
import re
from pathlib import Path

# --- 1. Configuration ---
# IMPORTANT: Adjust these paths and parameters for your system and data.

# SCRIPT_DIR is the directory containing train_donut.py (e.g., .../backend/ai_models)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Data folders (train, validate, test) and the local model are DIRECTLY inside SCRIPT_DIR.
DATA_ROOT_DIR = SCRIPT_DIR 

# Path where you saved your pre-trained model
LOCAL_MODEL_PATH = os.path.join(DATA_ROOT_DIR, "donut_receipt_v1")

# Path to save the FINE-TUNED model checkpoints
OUTPUT_DIR = os.path.join(DATA_ROOT_DIR, "donut_receipt_custom_v1")

# VRAM Management for GTX 1070 (8GB)
PER_DEVICE_TRAIN_BATCH_SIZE = 2 
GRADIENT_ACCUMULATION_STEPS = 4 # Simulates a larger batch size

# --- 2. Data Loading & Preprocessing ---

def load_and_prepare_datasets(data_dir):
    """Loads images and corresponding JSON files from the train/validate/test folders."""
    
    # Define the expected features for the structured data
    features = Features({
        'image': Image,
        'label': Value(dtype='string')
    })
    
    def load_examples(split_dir):
        examples = []
        # The structure is assumed to be: DATA_ROOT_DIR/train/images and DATA_ROOT_DIR/train/json
        image_dir = os.path.join(data_dir, split_dir, 'images')
        json_dir = os.path.join(data_dir, split_dir, 'json')
        
        if not os.path.exists(image_dir) or not os.path.exists(json_dir):
            print(f"Skipping {split_dir}: Missing 'images' or 'json' folder at {os.path.join(data_dir, split_dir)}")
            return []

        for filename in os.listdir(image_dir):
            if filename.endswith(('.jpg', '.jpeg', '.png')):
                base_name = os.path.splitext(filename)[0]
                image_path = os.path.join(image_dir, filename)
                json_path = os.path.join(json_dir, base_name + '.json')
                
                if os.path.exists(json_path):
                    with open(json_path, 'r', encoding='utf-8') as f:
                        gt_json = json.load(f)
                        # Construct the target sequence: <s_cord-v2>{JSON_STRING}</s_cord-v2>
                        gt_string = f"<s_cord-v2>{json.dumps(gt_json['data'], ensure_ascii=False)}</s_cord-v2>"
                    
                    try:
                        examples.append({
                            'image': Image.open(image_path).convert("RGB"),
                            'label': gt_string
                        })
                    except Exception as e:
                        print(f"Error loading image {image_path}: {e}")
                
        return examples

    raw_datasets = {}
    for split in ['train', 'validate', 'test']:
        # Load from list of dictionaries
        raw_datasets[split] = Dataset.from_list(load_examples(split))
    
    return raw_datasets['train'], raw_datasets['validate'], raw_datasets['test']


def preprocess_data(examples, processor):
    """Tokenizes the text and processes the image for the model."""
    
    # 1. Image Processing
    pixel_values = processor(
        examples['image'], 
        # REMOVED: random_padding=True (as the processor doesn't support it)
        return_tensors="pt" 
    ).pixel_values.squeeze()
    
    # 2. Tokenization
    tokenized_labels = processor.tokenizer(
        examples['label'], 
        add_special_tokens=False, 
        padding="max_length", 
        max_length=512, 
        truncation=True
    ).input_ids
    
    # 3. Return the data, trusting that 'datasets' converts the Tensors to lists/arrays for storage
    # We will convert back in the collator.
    return {
        'pixel_values': pixel_values.tolist(), # Store as a Python list of floats
        'labels': tokenized_labels # Store as a Python list of integers
    }

# --- 3. Data Collator (for Batching) ---

class DonutDataCollator:
    """Collates data by ensuring correct padding and format for the VED model."""
    def __init__(self, processor):
        self.processor = processor
    
    def __call__(self, batch):
        
        # --- FIX: Convert list data back to Tensors before stacking ---
        
        # 1. Convert lists of pixel data to a Tensor and stack them
        pixel_values = torch.stack([torch.tensor(item["pixel_values"]) for item in batch])
        
        # 2. Convert lists of label data to a Tensor
        labels = torch.tensor([item["labels"] for item in batch])
        
        # 3. Handle padding for loss calculation
        labels[labels == self.processor.tokenizer.pad_token_id] = -100
        
        return {
            'pixel_values': pixel_values,
            'labels': labels
        }


# --- 4. Main Training Function ---

def fine_tune_donut():
    # FIX: Use Path().resolve().as_posix() to ensure the path is treated as local 
    # and bypasses the HF Repo ID validation that failed with the absolute path.
    SAFE_LOCAL_MODEL_PATH = Path(LOCAL_MODEL_PATH).resolve().as_posix()
    print(f"Loading processor and model from: {SAFE_LOCAL_MODEL_PATH}")

    # Load the Donut processor and model from your local project files
    processor = DonutProcessor.from_pretrained(SAFE_LOCAL_MODEL_PATH, local_files_only=True)
    model = VisionEncoderDecoderModel.from_pretrained(SAFE_LOCAL_MODEL_PATH, local_files_only=True)

    # Configure the model's decoder settings for generation
    model.config.decoder_start_token_id = processor.tokenizer.bos_token_id
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    
    # Load and preprocess data
    train_ds, val_ds, _ = load_and_prepare_datasets(DATA_ROOT_DIR)
    
    # Map the preprocessing function across the datasets
    train_ds_mapped = train_ds.map(lambda x: preprocess_data(x, processor), batched=False, remove_columns=['image', 'label'])
    val_ds_mapped = val_ds.map(lambda x: preprocess_data(x, processor), batched=False, remove_columns=['image', 'label'])
    
    # Define training arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=PER_DEVICE_TRAIN_BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        learning_rate=5e-5,
        num_train_epochs=20, 
        logging_steps=5,
        save_strategy="epoch",
        eval_strategy="epoch",
        fp16=True if torch.cuda.is_available() else False, # Use FP16 for speed/VRAM
        dataloader_num_workers=2,
        remove_unused_columns=False,
        report_to="none" # Disable logging to external tools for local training
    )

    # Initialize the Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds_mapped,
        eval_dataset=val_ds_mapped,
        data_collator=DonutDataCollator(processor),
    )

    # Start training!
    print("\nStarting Donut Fine-Tuning...")
    trainer.train()

    # Save the final model
    trainer.save_model(OUTPUT_DIR)
    processor.save_pretrained(OUTPUT_DIR)
    print(f"\n✅ Fine-tuning complete. Model saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    fine_tune_donut()