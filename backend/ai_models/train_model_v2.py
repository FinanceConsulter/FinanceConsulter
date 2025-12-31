import os
import json
import torch
from torch.utils.data import Dataset
from transformers import (
    VisionEncoderDecoderConfig,
    VisionEncoderDecoderModel,
    DonutProcessor,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer,
)
from datasets import load_dataset
from PIL import Image

# --- KONFIGURATION ---
# WICHTIG: Wir laden jetzt dein BEREITS TRAINIERTES Modell!
LOCAL_MODEL_PATH = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\donut_receipt_trained_v1" 
DATASET_PATH = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data"
# Wir speichern es in einem neuen Ordner (v2), damit wir v1 nicht überschreiben
OUTPUT_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\donut_receipt_trained_v2"

# --- HYPERPARAMETER ---
MAX_LENGTH = 768
IMAGE_SIZE = (1280, 960) 
BATCH_SIZE = 2 
GRADIENT_ACCUMULATION_STEPS = 4 
EPOCHS = 23 
LEARNING_RATE = 2e-5 # Etwas niedriger, da wir schon "grob" richtig liegen
NUM_WORKERS = 1 

# --- DATASET KLASSE ---
class DonutDataset(Dataset):
    def __init__(self, dataset_split, processor, root_dir, task_start_token, max_length=MAX_LENGTH, split="train"):
        self.dataset_split = dataset_split
        self.processor = processor
        self.root_dir = root_dir 
        self.max_length = max_length
        self.split = split
        self.gt_token_sequences = []

        for item in self.dataset_split:
            try:
                ground_truth = json.loads(item["ground_truth"])
                token_sequence = task_start_token
                for key, value in ground_truth.items():
                    token_sequence += f"<s_{key}>{str(value)}</s_{key}>"
                token_sequence += "</s>"
                self.gt_token_sequences.append(token_sequence)
            except Exception as e:
                print(f"Skipping broken entry: {e}")
                self.gt_token_sequences.append(task_start_token + "</s>")

    def __len__(self):
        return len(self.dataset_split)

    def __getitem__(self, idx):
        item = self.dataset_split[idx]
        img_path = os.path.join(self.root_dir, "images", item["file_name"])
        try:
            image = Image.open(img_path).convert("RGB")
        except FileNotFoundError:
            # Fallback
            img_path_alt = os.path.join(self.root_dir, item["file_name"])
            try:
                image = Image.open(img_path_alt).convert("RGB")
            except FileNotFoundError:
                image = Image.new('RGB', IMAGE_SIZE, color='black')

        pixel_values = self.processor(image, random_padding=self.split=="train", return_tensors="pt").pixel_values
        pixel_values = pixel_values.squeeze()

        target_sequence = self.gt_token_sequences[idx]
        input_ids = self.processor.tokenizer(
            target_sequence,
            add_special_tokens=False,
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )["input_ids"].squeeze(0)

        labels = input_ids.clone()
        labels[labels == self.processor.tokenizer.pad_token_id] = -100 
        return {"pixel_values": pixel_values, "labels": labels}

def main():
    print(f"CUDA verfügbar: {torch.cuda.is_available()}")
    
    # Lade das V1 Modell
    print(f"Lade vortrainiertes Modell aus {LOCAL_MODEL_PATH}...")
    processor = DonutProcessor.from_pretrained(LOCAL_MODEL_PATH)
    model = VisionEncoderDecoderModel.from_pretrained(LOCAL_MODEL_PATH)

    print("Lade Dataset...")
    data_files = {
        "train": os.path.join(DATASET_PATH, "train", "metadata.jsonl"),
        "test": os.path.join(DATASET_PATH, "test", "metadata.jsonl"),
        "validation": os.path.join(DATASET_PATH, "validate", "metadata.jsonl")
    }
    dataset = load_dataset("json", data_files=data_files)

    # Tokenizer müssen wir hier nicht mehr anpassen, da das Modell die Tokens aus V1 schon kennt!
    task_start_token = "<s_cord-v2>"

    train_root = os.path.join(DATASET_PATH, "train")
    validate_root = os.path.join(DATASET_PATH, "validate")

    train_dataset = DonutDataset(dataset["train"], processor, root_dir=train_root, task_start_token=task_start_token, split="train")
    eval_dataset = DonutDataset(dataset["validation"], processor, root_dir=validate_root, task_start_token=task_start_token, split="validation") if "validation" in dataset else None

    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.decoder_start_token_id = processor.tokenizer.convert_tokens_to_ids(task_start_token)

    # Check Eval Strategy Name
    try:
        from transformers import TrainingArguments
        # Prüfe ob eval_strategy existiert (neu)
        test_args = TrainingArguments(output_dir="test", eval_strategy="no")
        strategy_name = "eval_strategy"
    except:
        strategy_name = "evaluation_strategy"

    # Argumente dynamisch bauen
    args_dict = {
        "output_dir": OUTPUT_DIR,
        "num_train_epochs": EPOCHS,
        "learning_rate": LEARNING_RATE,
        "per_device_train_batch_size": BATCH_SIZE,
        "per_device_eval_batch_size": BATCH_SIZE,
        "gradient_accumulation_steps": GRADIENT_ACCUMULATION_STEPS,
        "weight_decay": 0.01,
        "logging_steps": 10,
        "save_strategy": "epoch",
        "save_total_limit": 2,
        "fp16": torch.cuda.is_available(),
        "dataloader_num_workers": NUM_WORKERS,
        "remove_unused_columns": False,
        "report_to": ["tensorboard"],
        "warmup_ratio": 0.1, 
        "load_best_model_at_end": True if eval_dataset else False,
    }
    # Strategie hinzufügen
    args_dict[strategy_name] = "epoch" if eval_dataset else "no"

    training_args = Seq2SeqTrainingArguments(**args_dict)

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
    )

    print(f"Starte Runde 2 Training für weitere {EPOCHS} Epochen...")
    trainer.train()
    
    print("Training beendet. Speichere Modell V2...")
    trainer.save_model(OUTPUT_DIR)
    processor.save_pretrained(OUTPUT_DIR)
    print(f"✅ Modell V2 gespeichert in {OUTPUT_DIR}")

if __name__ == "__main__":
    main()