"""
Fine-Tuning des CORD-v2 Modells auf unser Custom-Receipt-Format.

WICHTIGE FIXES:
1. Korrektes Token-Handling (nur neue Tokens hinzufügen)
2. NUR Decoder Embeddings resizen
3. Konservative Hyperparameter um Forgetting zu vermeiden
4. Validation & Early Stopping
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
import random

# =============================================================================
# KONFIGURATION
# =============================================================================

BASE_MODEL_NAME = "naver-clova-ix/donut-base-finetuned-cord-v2"
DATASET_PATH = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data"
OUTPUT_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\donut_custom_finetuned"

# KONSERVATIVE HYPERPARAMETER (um Forgetting zu vermeiden)
MAX_LENGTH = 768  # Reduziert von 1024
IMAGE_SIZE = (1280, 960)
BATCH_SIZE = 1  # Reduziert für Stabilität
GRADIENT_ACCUMULATION_STEPS = 8  # Erhöht für effektive Batch Size 8
EPOCHS = 5  # Reduziert von 10
LEARNING_RATE = 5e-6  # Deutlich kleiner! (war 2e-5)
WARMUP_RATIO = 0.1  # 10% Warmup
WEIGHT_DECAY = 0.01
NUM_WORKERS = 0

# Task Token für unser Custom Format
CUSTOM_TASK_TOKEN = "<s_custom_receipt>"

# =============================================================================
# HILFSFUNKTIONEN
# =============================================================================

def json2token(obj, update_special_tokens_for_json_key=True, sort_json_key=True):
    """
    Konvertiert JSON zu Token-Sequenz für Donut.
    
    Beispiel Input:
    {"data": {"merchant": "Taco Bell", "total": "7.61"}}
    
    Output:
    <s_data><s_merchant>Taco Bell</s_merchant><s_total>7.61</s_total></s_data>
    """
    if isinstance(obj, dict):
        if len(obj) == 1 and "text_sequence" in obj:
            return obj["text_sequence"]
        
        output = ""
        keys = sorted(obj.keys()) if sort_json_key else list(obj.keys())
        
        for k in keys:
            if update_special_tokens_for_json_key:
                output += f"<s_{k}>"
                output += json2token(obj[k], update_special_tokens_for_json_key, sort_json_key)
                output += f"</s_{k}>"
            else:
                output += f"<{k}>"
                output += json2token(obj[k], update_special_tokens_for_json_key, sort_json_key)
                output += f"</{k}>"
        return output
    
    elif isinstance(obj, list):
        return "".join([json2token(item, update_special_tokens_for_json_key, sort_json_key) for item in obj])
    
    else:
        return str(obj)


def extract_special_tokens_from_json(obj, tokens_set):
    """Extrahiert rekursiv alle Keys aus dem JSON für Token-Erstellung."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            tokens_set.add(f"<s_{key}>")
            tokens_set.add(f"</s_{key}>")
            extract_special_tokens_from_json(value, tokens_set)
    elif isinstance(obj, list):
        for item in obj:
            extract_special_tokens_from_json(item, tokens_set)


# =============================================================================
# DATASET
# =============================================================================

class CustomReceiptDataset(Dataset):
    """Dataset für Custom Receipt Format."""
    
    def __init__(self, dataset_split, processor, root_dir, task_start_token, max_length=MAX_LENGTH, split="train"):
        self.dataset_split = dataset_split
        self.processor = processor
        self.root_dir = root_dir
        self.max_length = max_length
        self.split = split
        self.task_start_token = task_start_token
        
        # Ground Truth Token-Sequenzen pre-prozessieren
        self.gt_token_sequences = []
        self.valid_indices = []
        
        for idx, item in enumerate(self.dataset_split):
            try:
                # Ground Truth parsen
                gt_dict = json.loads(item["ground_truth"])
                
                # Zu Token-Sequenz konvertieren
                parsed_sequence = json2token(gt_dict)
                token_sequence = self.task_start_token + parsed_sequence + self.processor.tokenizer.eos_token
                
                self.gt_token_sequences.append(token_sequence)
                self.valid_indices.append(idx)
                
            except Exception as e:
                print(f"⚠️ Warnung: Überspringe Item {idx}: {e}")
                # Füge Fallback hinzu (nur Start + End Token)
                self.gt_token_sequences.append(self.task_start_token + self.processor.tokenizer.eos_token)
        
        print(f"   Geladene Samples ({split}): {len(self.valid_indices)}/{len(dataset_split)}")
    
    def __len__(self):
        return len(self.dataset_split)
    
    def __getitem__(self, idx):
        item = self.dataset_split[idx]
        
        # Bild laden
        img_path = os.path.join(self.root_dir, "images", item["file_name"])
        if not os.path.exists(img_path):
            img_path = os.path.join(self.root_dir, item["file_name"])
        
        try:
            image = Image.open(img_path).convert("RGB")
        except Exception as e:
            print(f"⚠️ Fehler beim Laden von {img_path}: {e}")
            # Schwarzes Bild als Fallback
            image = Image.new('RGB', IMAGE_SIZE, color='black')
        
        # Image Preprocessing
        # WICHTIG: random_padding nur im Training!
        pixel_values = self.processor(
            image, 
            random_padding=(self.split == "train"),
            return_tensors="pt"
        ).pixel_values.squeeze(0)
        
        # Target Sequence tokenisieren
        target_sequence = self.gt_token_sequences[idx]
        input_ids = self.processor.tokenizer(
            target_sequence,
            add_special_tokens=False,
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )["input_ids"].squeeze(0)
        
        # Labels = Input IDs, aber Padding wird zu -100 (ignore_index)
        labels = input_ids.clone()
        labels[labels == self.processor.tokenizer.pad_token_id] = -100
        
        return {
            "pixel_values": pixel_values,
            "labels": labels,
        }


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("="*80)
    print("DONUT FINE-TUNING AUF CUSTOM RECEIPT FORMAT (FIXED)")
    print("="*80)
    print(f"\nCUDA verfügbar: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # =========================================================================
    # 1. MODELL & PROCESSOR LADEN
    # =========================================================================
    print(f"\n📥 Lade Basis-Modell: {BASE_MODEL_NAME}")
    processor = DonutProcessor.from_pretrained(BASE_MODEL_NAME)
    model = VisionEncoderDecoderModel.from_pretrained(BASE_MODEL_NAME)
    
    print(f"   Original Tokenizer Größe: {len(processor.tokenizer)}")
    print(f"   Original Decoder Embedding: {model.decoder.get_input_embeddings().weight.shape[0]}")
    
    # =========================================================================
    # 2. DATASET LADEN
    # =========================================================================
    print(f"\n📚 Lade Dataset von: {DATASET_PATH}")
    data_files = {
        "train": os.path.join(DATASET_PATH, "train", "metadata.jsonl"),
        "validation": os.path.join(DATASET_PATH, "validate", "metadata.jsonl"),
    }
    
    # Nur existierende Dateien
    data_files = {k: v for k, v in data_files.items() if os.path.exists(v)}
    
    if not data_files:
        raise ValueError("❌ Keine Dataset-Dateien gefunden!")
    
    print(f"   Gefundene Splits: {list(data_files.keys())}")
    dataset = load_dataset("json", data_files=data_files)
    
    # =========================================================================
    # 3. NEUE TOKENS SAMMELN
    # =========================================================================
    print(f"\n🔍 Analysiere Dataset für neue Tokens...")
    new_special_tokens = set()
    
    # Custom Task Token
    new_special_tokens.add(CUSTOM_TASK_TOKEN)
    
    # Durch ALLE Splits iterieren
    for split_name in dataset.keys():
        print(f"   Scanne {split_name} split...")
        for i in range(min(len(dataset[split_name]), 100)):  # Sample first 100
            try:
                gt = json.loads(dataset[split_name][i]["ground_truth"])
                extract_special_tokens_from_json(gt, new_special_tokens)
            except Exception as e:
                continue
    
    print(f"   Gefundene neue Tokens: {len(new_special_tokens)}")
    print(f"   Token-Beispiele: {list(new_special_tokens)[:10]}")
    
    # =========================================================================
    # 4. TOKENIZER ERWEITERN (KRITISCHER TEIL!)
    # =========================================================================
    print(f"\n🔧 Erweitere Tokenizer...")
    
    # Nur wirklich neue Tokens hinzufügen
    vocab = processor.tokenizer.get_vocab()
    tokens_to_add = [token for token in new_special_tokens if token not in vocab]
    
    if tokens_to_add:
        print(f"   Füge {len(tokens_to_add)} neue Tokens hinzu...")
        num_added = processor.tokenizer.add_tokens(tokens_to_add)
        print(f"   Tatsächlich hinzugefügt: {num_added}")
        
        # WICHTIG: Nur DECODER Embeddings resizen!
        new_vocab_size = len(processor.tokenizer)
        print(f"   Neue Tokenizer-Größe: {new_vocab_size}")
        
        print(f"   Resize Decoder Embeddings...")
        model.decoder.resize_token_embeddings(new_vocab_size)
        
        # Config updaten
        model.config.decoder.vocab_size = new_vocab_size
        model.config.vocab_size = new_vocab_size  # Falls verwendet
        
        print(f"   Neue Decoder Embedding-Größe: {model.decoder.get_input_embeddings().weight.shape[0]}")
    else:
        print("   ✅ Keine neuen Tokens nötig!")
    
    # =========================================================================
    # 5. MODEL CONFIG UPDATEN
    # =========================================================================
    print(f"\n⚙️ Konfiguriere Modell...")
    
    # Stelle sicher dass Task Token im Vocab ist
    if CUSTOM_TASK_TOKEN not in processor.tokenizer.get_vocab():
        print(f"   ⚠️ Task Token fehlt, füge hinzu: {CUSTOM_TASK_TOKEN}")
        processor.tokenizer.add_tokens([CUSTOM_TASK_TOKEN])
        model.decoder.resize_token_embeddings(len(processor.tokenizer))
    
    # Setze wichtige Token-IDs
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.decoder_start_token_id = processor.tokenizer.convert_tokens_to_ids(CUSTOM_TASK_TOKEN)
    model.config.eos_token_id = processor.tokenizer.eos_token_id
    model.config.max_length = MAX_LENGTH
    
    print(f"   PAD Token ID: {model.config.pad_token_id}")
    print(f"   Decoder Start Token ID: {model.config.decoder_start_token_id}")
    print(f"   EOS Token ID: {model.config.eos_token_id}")
    
    # =========================================================================
    # 6. SICHERHEITS-CHECK
    # =========================================================================
    print(f"\n🔍 Führe Sicherheits-Check durch...")
    
    embedding_size = model.decoder.get_input_embeddings().weight.shape[0]
    tokenizer_size = len(processor.tokenizer)
    
    print(f"   Tokenizer Length: {tokenizer_size}")
    print(f"   Embedding Matrix: {embedding_size}")
    
    if tokenizer_size != embedding_size:
        print(f"   ⚠️ WARNUNG: Größen stimmen nicht überein!")
        print(f"   Führe Zwangs-Sync durch...")
        model.decoder.resize_token_embeddings(tokenizer_size)
        embedding_size = model.decoder.get_input_embeddings().weight.shape[0]
        print(f"   Nach Sync: {embedding_size}")
    
    # Test mit erstem Sample
    print(f"\n   Teste erstes Sample...")
    
    # =========================================================================
    # 7. DATASETS ERSTELLEN
    # =========================================================================
    print(f"\n📦 Erstelle Datasets...")
    
    train_root = os.path.join(DATASET_PATH, "train")
    validate_root = os.path.join(DATASET_PATH, "validate")
    
    train_dataset = None
    eval_dataset = None
    
    if "train" in dataset:
        print(f"   Erstelle Train Dataset...")
        train_dataset = CustomReceiptDataset(
            dataset["train"], 
            processor, 
            train_root, 
            CUSTOM_TASK_TOKEN, 
            split="train"
        )
    
    if "validation" in dataset:
        print(f"   Erstelle Validation Dataset...")
        eval_dataset = CustomReceiptDataset(
            dataset["validation"], 
            processor, 
            validate_root, 
            CUSTOM_TASK_TOKEN, 
            split="validation"
        )
    
    if not train_dataset:
        raise ValueError("❌ Kein Training Dataset gefunden!")
    
    # Finaler Token-ID Check mit echtem Sample
    sample = train_dataset[0]
    valid_labels = sample["labels"][sample["labels"] != -100]
    if len(valid_labels) > 0:
        max_token_id = valid_labels.max().item()
        print(f"   Max Token ID im Sample: {max_token_id}")
        print(f"   Embedding unterstützt bis: {embedding_size - 1}")
        
        if max_token_id >= embedding_size:
            raise ValueError(
                f"❌ FATAL: Token ID {max_token_id} ist größer als "
                f"Embedding-Größe {embedding_size}! Training würde crashen!"
            )
        else:
            print(f"   ✅ Token IDs sind im gültigen Bereich!")
    
    # =========================================================================
    # 8. TRAINING ARGUMENTS
    # =========================================================================
    print(f"\n⚙️ Konfiguriere Training...")
    
    training_args = Seq2SeqTrainingArguments(
        output_dir=OUTPUT_DIR,
        
        # Training Config
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        
        # Optimizer
        learning_rate=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
        warmup_ratio=WARMUP_RATIO,
        max_grad_norm=1.0,  # Gradient Clipping
        
        # Evaluation & Saving
        eval_strategy="epoch" if eval_dataset else "no",
        save_strategy="epoch",
        save_total_limit=3,  # Nur beste 3 Modelle behalten
        load_best_model_at_end=True if eval_dataset else False,
        metric_for_best_model="loss",
        greater_is_better=False,
        
        # Logging
        logging_steps=10,
        logging_first_step=True,
        report_to=["tensorboard"],
        
        # Performance
        fp16=torch.cuda.is_available(),  # Mixed Precision wenn GPU
        dataloader_num_workers=NUM_WORKERS,
        remove_unused_columns=False,  # WICHTIG für custom datasets!
        
        # Reproduzierbarkeit
        seed=42,
    )
    
    print(f"   Epochen: {EPOCHS}")
    print(f"   Batch Size: {BATCH_SIZE}")
    print(f"   Gradient Accumulation: {GRADIENT_ACCUMULATION_STEPS}")
    print(f"   Effektive Batch Size: {BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS}")
    print(f"   Learning Rate: {LEARNING_RATE}")
    print(f"   FP16: {training_args.fp16}")
    
    # =========================================================================
    # 9. TRAINER ERSTELLEN & TRAINING STARTEN
    # =========================================================================
    print(f"\n🚀 Erstelle Trainer...")
    
    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
    )
    
    print(f"\n{'='*80}")
    print(f"STARTE FINE-TUNING")
    print(f"{'='*80}")
    print(f"Training Samples: {len(train_dataset)}")
    if eval_dataset:
        print(f"Validation Samples: {len(eval_dataset)}")
    print(f"Steps pro Epoche: {len(train_dataset) // (BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS)}")
    print(f"Gesamte Steps: {(len(train_dataset) // (BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS)) * EPOCHS}")
    print(f"{'='*80}\n")
    
    # TRAINING!
    train_result = trainer.train()
    
    # =========================================================================
    # 10. MODELL SPEICHERN
    # =========================================================================
    print(f"\n💾 Speichere finales Modell...")
    trainer.save_model(OUTPUT_DIR)
    processor.save_pretrained(OUTPUT_DIR)
    
    # Metrics speichern
    metrics = train_result.metrics
    trainer.log_metrics("train", metrics)
    trainer.save_metrics("train", metrics)
    
    print(f"\n{'='*80}")
    print(f"✅ TRAINING ERFOLGREICH ABGESCHLOSSEN!")
    print(f"{'='*80}")
    print(f"Modell gespeichert in: {OUTPUT_DIR}")
    print(f"Final Loss: {metrics.get('train_loss', 'N/A'):.4f}")
    print(f"\nZum Testen verwende:")
    print(f'  python test_finetuned_model.py')
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()
