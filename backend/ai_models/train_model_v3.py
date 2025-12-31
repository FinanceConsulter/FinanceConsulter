"""
Korrigiertes Donut Training Script V3
Fixes:
1. Richtige Token-Sequence Generierung (verschachtelt, nicht als String)
2. Custom Tokens werden zum Tokenizer hinzugefügt
3. Startet vom original vortrainierten Model
"""
import os
import json
import torch
from torch.utils.data import Dataset
from transformers import (
    VisionEncoderDecoderModel,
    DonutProcessor,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer,
)
from datasets import load_dataset
from PIL import Image

# --- KONFIGURATION ---
# WICHTIG: Wir starten vom ORIGINAL HuggingFace Model!
PRETRAINED_MODEL = "naver-clova-ix/donut-base-finetuned-cord-v2"
DATASET_PATH = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data"
OUTPUT_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\donut_receipt_trained_v3"

# --- HYPERPARAMETER ---
MAX_LENGTH = 768
IMAGE_SIZE = (1280, 960)
BATCH_SIZE = 2
GRADIENT_ACCUMULATION_STEPS = 4
EPOCHS = 10  # Weniger Epochen zum Testen
LEARNING_RATE = 5e-5
NUM_WORKERS = 0  # Auf Windows oft besser mit 0

# Custom Tokens die wir brauchen (basierend auf deinem JSON Format)
CUSTOM_TOKENS = [
    "<s_data>", "</s_data>",
    "<s_merchant>", "</s_merchant>",
    "<s_date>", "</s_date>",
    "<s_menu>", "</s_menu>",
    "<s_item>", "</s_item>",
    "<s_Artikel>", "</s_Artikel>",
    "<s_Total>", "</s_Total>",
    "<s_Preis>", "</s_Preis>",
    "<s_total>", "</s_total>",
]


def json_to_token_sequence(data: dict, prefix: str = "") -> str:
    """
    Wandelt ein verschachteltes JSON in eine Token-Sequenz um.
    
    Input: {"merchant": "GREEN FIELD", "menu": [{"Artikel": "Coffee", "Total": "3.00"}], "total": "56.58"}
    Output: <s_merchant>GREEN FIELD</s_merchant><s_menu><s_item><s_Artikel>Coffee</s_Artikel><s_Total>3.00</s_Total></s_item></s_menu><s_total>56.58</s_total>
    """
    result = ""
    
    for key, value in data.items():
        if isinstance(value, dict):
            # Verschachteltes Objekt
            result += f"<s_{key}>"
            result += json_to_token_sequence(value)
            result += f"</s_{key}>"
        elif isinstance(value, list):
            # Liste (z.B. menu items)
            result += f"<s_{key}>"
            for item in value:
                if isinstance(item, dict):
                    result += "<s_item>"
                    result += json_to_token_sequence(item)
                    result += "</s_item>"
                else:
                    result += str(item)
            result += f"</s_{key}>"
        else:
            result += f"<s_{key}>{str(value)}</s_{key}>"
    
    return result


class DonutDataset(Dataset):
    def __init__(self, dataset_split, processor, root_dir, task_start_token, max_length=MAX_LENGTH, split="train"):
        self.processor = processor
        self.root_dir = root_dir
        self.max_length = max_length
        self.split = split
        self.samples = []
        self.gt_token_sequences = []

        skipped = 0
        for item in dataset_split:
            try:
                ground_truth = json.loads(item["ground_truth"])
                
                # Wenn "data" key existiert, nehmen wir dessen Inhalt
                if "data" in ground_truth:
                    ground_truth = ground_truth["data"]
                
                # Konvertiere JSON zu Token-Sequenz
                token_sequence = task_start_token
                token_sequence += json_to_token_sequence(ground_truth)
                token_sequence += processor.tokenizer.eos_token
                
                self.samples.append(item)
                self.gt_token_sequences.append(token_sequence)
                
            except Exception as e:
                print(f"⚠️ Überspringe Eintrag: {e}")
                skipped += 1
        
        print(f"✅ Dataset geladen: {len(self.samples)} Samples, {skipped} übersprungen")
        if self.samples:
            print(f"📝 Beispiel Token-Sequenz:\n{self.gt_token_sequences[0][:500]}...")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item = self.samples[idx]
        img_path = os.path.join(self.root_dir, "images", item["file_name"])
        
        try:
            image = Image.open(img_path).convert("RGB")
        except FileNotFoundError:
            print(f"⚠️ Bild nicht gefunden: {img_path}")
            image = Image.new('RGB', IMAGE_SIZE, color='white')

        pixel_values = self.processor(
            image, 
            random_padding=(self.split == "train"), 
            return_tensors="pt"
        ).pixel_values.squeeze()

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
    print(f"🖥️ CUDA verfügbar: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"   GPU: {torch.cuda.get_device_name(0)}")
    
    # Lade das ORIGINAL vortrainierte Modell
    print(f"\n📥 Lade vortrainiertes Modell: {PRETRAINED_MODEL}")
    processor = DonutProcessor.from_pretrained(PRETRAINED_MODEL)
    model = VisionEncoderDecoderModel.from_pretrained(PRETRAINED_MODEL)

    # WICHTIG: Custom Tokens zum Tokenizer hinzufügen!
    print(f"\n🔧 Füge {len(CUSTOM_TOKENS)} Custom Tokens hinzu...")
    newly_added = processor.tokenizer.add_tokens(CUSTOM_TOKENS)
    print(f"   {newly_added} neue Tokens hinzugefügt")
    
    # Modell Embeddings anpassen für neue Tokens
    model.decoder.resize_token_embeddings(len(processor.tokenizer))
    print(f"   Tokenizer Größe: {len(processor.tokenizer)}")

    # Dataset laden
    print("\n📂 Lade Dataset...")
    data_files = {
        "train": os.path.join(DATASET_PATH, "train", "metadata.jsonl"),
        "validation": os.path.join(DATASET_PATH, "validate", "metadata.jsonl")
    }
    
    # Prüfen welche Files existieren
    existing_files = {}
    for split, path in data_files.items():
        if os.path.exists(path):
            existing_files[split] = path
            print(f"   ✅ {split}: {path}")
        else:
            print(f"   ❌ {split}: {path} nicht gefunden")
    
    if not existing_files:
        print("❌ Keine Daten gefunden!")
        return
        
    dataset = load_dataset("json", data_files=existing_files)

    # Task Start Token
    task_start_token = "<s_cord-v2>"

    # Datasets erstellen
    train_dataset = DonutDataset(
        dataset["train"], 
        processor, 
        root_dir=os.path.join(DATASET_PATH, "train"),
        task_start_token=task_start_token, 
        split="train"
    )
    
    eval_dataset = None
    if "validation" in dataset:
        eval_dataset = DonutDataset(
            dataset["validation"], 
            processor, 
            root_dir=os.path.join(DATASET_PATH, "validate"),
            task_start_token=task_start_token, 
            split="validation"
        )

    # Modell konfigurieren
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.decoder_start_token_id = processor.tokenizer.convert_tokens_to_ids(task_start_token)

    # Training Arguments
    training_args = Seq2SeqTrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=EPOCHS,
        learning_rate=LEARNING_RATE,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        weight_decay=0.01,
        logging_steps=10,
        save_strategy="epoch",
        eval_strategy="epoch" if eval_dataset else "no",
        save_total_limit=2,
        fp16=torch.cuda.is_available(),
        dataloader_num_workers=NUM_WORKERS,
        remove_unused_columns=False,
        report_to=["tensorboard"],
        warmup_ratio=0.1,
        load_best_model_at_end=True if eval_dataset else False,
        metric_for_best_model="eval_loss" if eval_dataset else None,
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
    )

    print(f"\n🚀 Starte Training für {EPOCHS} Epochen...")
    print(f"   Batch Size: {BATCH_SIZE}")
    print(f"   Gradient Accumulation: {GRADIENT_ACCUMULATION_STEPS}")
    print(f"   Effective Batch Size: {BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS}")
    print(f"   Learning Rate: {LEARNING_RATE}")
    
    trainer.train()
    
    print("\n💾 Training beendet. Speichere Modell...")
    trainer.save_model(OUTPUT_DIR)
    processor.save_pretrained(OUTPUT_DIR)
    print(f"✅ Modell gespeichert in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
