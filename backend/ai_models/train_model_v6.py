"""
Fine-Tuning des CORD-v2 Modells auf unser Custom-Receipt-Format.

VERSION 6 - KORRIGIERT:
- Verwendet den Original CORD-v2 Task Token für Stabilität
- Konvertiert die Trainingsdaten zum CORD-v2 Format
- Höhere Learning Rate und mehr Epochen
- Korrekte Token-Initialisierung
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
import re

# =============================================================================
# KONFIGURATION
# =============================================================================

BASE_MODEL_NAME = "naver-clova-ix/donut-base-finetuned-cord-v2"
DATASET_PATH = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data"
OUTPUT_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\donut_custom_v6"

# OPTIMIERTE HYPERPARAMETER
MAX_LENGTH = 768
IMAGE_SIZE = (1280, 960)
BATCH_SIZE = 2
GRADIENT_ACCUMULATION_STEPS = 4  # Effektive Batch Size: 8
EPOCHS = 30  # Mehr Epochen für besseres Lernen
LEARNING_RATE = 3e-5  # Höhere LR für schnelleres Lernen
WARMUP_RATIO = 0.1
WEIGHT_DECAY = 0.01
NUM_WORKERS = 0

# WICHTIG: Verwende den ORIGINAL CORD-v2 Task Token!
# Das Modell kennt diesen Token bereits und weiß, dass es Receipts parsen soll
TASK_TOKEN = "<s_cord-v2>"

# =============================================================================
# HILFSFUNKTIONEN
# =============================================================================

def convert_custom_to_cord_format(custom_data):
    """
    Konvertiert unser Custom-Format zum CORD-v2 Format.
    
    Input (Custom):
    {
        "data": {
            "merchant": "GREEN FIELD",
            "date": "2016-05-26",
            "menu": [{"Artikel": "Coffee", "Total": "3.00"}],
            "total": "56.58"
        }
    }
    
    Output (CORD-v2 ähnlich):
    {
        "menu": [
            {"nm": "Coffee", "price": "3.00"}
        ],
        "sub_total": {"subtotal_price": "56.58"},
        "total": {"total_price": "56.58"}
    }
    
    Hinweis: Wir behalten die Struktur einfach, damit das Modell es lernen kann.
    """
    if "data" not in custom_data:
        return custom_data
    
    data = custom_data["data"]
    
    # Menu-Items konvertieren
    menu_items = []
    if "menu" in data:
        for item in data["menu"]:
            menu_item = {}
            if "Artikel" in item:
                menu_item["nm"] = item["Artikel"]
            if "Total" in item:
                menu_item["price"] = item["Total"]
            if menu_item:
                menu_items.append(menu_item)
    
    # CORD-v2 Format erstellen
    cord_format = {}
    
    # Menu
    if menu_items:
        cord_format["menu"] = menu_items
    
    # Sub-Total (verwenden wir als Zwischensumme, falls vorhanden)
    if "total" in data:
        cord_format["sub_total"] = {"subtotal_price": data["total"]}
    
    # Total
    if "total" in data:
        cord_format["total"] = {"total_price": data["total"]}
    
    return cord_format


def json2token(obj, sort_json_key=True):
    """
    Konvertiert JSON zu Token-Sequenz für Donut im CORD-v2 Stil.
    
    CORD-v2 verwendet <s_KEY> und </s_KEY> Tags.
    """
    if isinstance(obj, dict):
        if len(obj) == 1 and "text_sequence" in obj:
            return obj["text_sequence"]
        
        output = ""
        keys = sorted(obj.keys()) if sort_json_key else list(obj.keys())
        
        for k in keys:
            output += f"<s_{k}>"
            output += json2token(obj[k], sort_json_key)
            output += f"</s_{k}>"
        return output
    
    elif isinstance(obj, list):
        return "".join([json2token(item, sort_json_key) for item in obj])
    
    else:
        # Werte als String, aber keine Tags
        obj_str = str(obj)
        return obj_str


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

class CordStyleReceiptDataset(Dataset):
    """Dataset das Custom-Format zu CORD-v2-Style konvertiert."""
    
    def __init__(self, dataset_split, processor, root_dir, max_length=MAX_LENGTH, split="train"):
        self.dataset_split = dataset_split
        self.processor = processor
        self.root_dir = root_dir
        self.max_length = max_length
        self.split = split
        
        # Ground Truth Token-Sequenzen pre-prozessieren
        self.gt_token_sequences = []
        self.valid_indices = []
        
        print(f"   Verarbeite {len(dataset_split)} Samples...")
        
        for idx, item in enumerate(self.dataset_split):
            try:
                # Ground Truth parsen
                gt_dict = json.loads(item["ground_truth"])
                
                # Zu CORD-v2 Format konvertieren
                cord_format = convert_custom_to_cord_format(gt_dict)
                
                # Zu Token-Sequenz konvertieren
                parsed_sequence = json2token(cord_format)
                
                # WICHTIG: CORD-v2 Task Token + Sequenz + EOS
                token_sequence = TASK_TOKEN + parsed_sequence + self.processor.tokenizer.eos_token
                
                self.gt_token_sequences.append(token_sequence)
                self.valid_indices.append(idx)
                
            except Exception as e:
                print(f"   ⚠️ Warnung: Überspringe Item {idx}: {e}")
                # Fallback: Nur Task Token + EOS
                self.gt_token_sequences.append(TASK_TOKEN + self.processor.tokenizer.eos_token)
        
        print(f"   ✓ Geladene Samples ({split}): {len(self.valid_indices)}/{len(dataset_split)}")
        
        # Debug: Zeige erste Token-Sequenz
        if self.gt_token_sequences:
            print(f"   Beispiel Token-Sequenz (gekürzt):")
            example = self.gt_token_sequences[0][:200]
            print(f"   {example}...")
    
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
            print(f"   ⚠️ Fehler beim Laden von {img_path}: {e}")
            image = Image.new('RGB', IMAGE_SIZE, color='white')
        
        # Image Preprocessing
        pixel_values = self.processor(
            image, 
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
    print("DONUT FINE-TUNING V6 - CORD-v2 KOMPATIBEL")
    print("="*80)
    print(f"\nCUDA verfügbar: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    
    # =========================================================================
    # 1. MODELL & PROCESSOR LADEN
    # =========================================================================
    print(f"\n📥 Lade Basis-Modell: {BASE_MODEL_NAME}")
    processor = DonutProcessor.from_pretrained(BASE_MODEL_NAME)
    model = VisionEncoderDecoderModel.from_pretrained(BASE_MODEL_NAME)
    
    print(f"   Original Tokenizer Größe: {len(processor.tokenizer)}")
    print(f"   Original Decoder Embedding: {model.decoder.get_input_embeddings().weight.shape[0]}")
    
    # Prüfe ob CORD-v2 Task Token existiert
    task_token_id = processor.tokenizer.convert_tokens_to_ids(TASK_TOKEN)
    print(f"   Task Token '{TASK_TOKEN}' ID: {task_token_id}")
    
    if task_token_id == processor.tokenizer.unk_token_id:
        print(f"   ⚠️ Task Token nicht gefunden! Füge hinzu...")
        processor.tokenizer.add_tokens([TASK_TOKEN])
        model.decoder.resize_token_embeddings(len(processor.tokenizer))
        task_token_id = processor.tokenizer.convert_tokens_to_ids(TASK_TOKEN)
        print(f"   Neue Task Token ID: {task_token_id}")
    
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
    # 3. PRÜFE WELCHE TOKENS WIR BRAUCHEN
    # =========================================================================
    print(f"\n🔍 Analysiere benötigte Tokens...")
    
    # Sammle alle Tokens aus den konvertierten Daten
    needed_tokens = set()
    
    for split_name in dataset.keys():
        for i in range(min(len(dataset[split_name]), 50)):
            try:
                gt = json.loads(dataset[split_name][i]["ground_truth"])
                cord_format = convert_custom_to_cord_format(gt)
                extract_special_tokens_from_json(cord_format, needed_tokens)
            except:
                continue
    
    print(f"   Benötigte Tokens: {needed_tokens}")
    
    # Prüfe welche schon existieren
    vocab = processor.tokenizer.get_vocab()
    missing_tokens = [t for t in needed_tokens if t not in vocab]
    existing_tokens = [t for t in needed_tokens if t in vocab]
    
    print(f"   Bereits vorhanden: {len(existing_tokens)}")
    print(f"   Fehlend: {len(missing_tokens)}")
    
    if missing_tokens:
        print(f"   Fehlende Tokens: {missing_tokens}")
        print(f"   Füge fehlende Tokens hinzu...")
        processor.tokenizer.add_tokens(missing_tokens)
        model.decoder.resize_token_embeddings(len(processor.tokenizer))
        print(f"   Neue Tokenizer-Größe: {len(processor.tokenizer)}")
    
    # =========================================================================
    # 4. MODEL CONFIG
    # =========================================================================
    print(f"\n⚙️ Konfiguriere Modell...")
    
    # Setze wichtige Token-IDs
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.decoder_start_token_id = task_token_id
    model.config.eos_token_id = processor.tokenizer.eos_token_id
    model.config.max_length = MAX_LENGTH
    
    print(f"   PAD Token ID: {model.config.pad_token_id}")
    print(f"   Decoder Start Token ID: {model.config.decoder_start_token_id}")
    print(f"   EOS Token ID: {model.config.eos_token_id}")
    print(f"   Max Length: {model.config.max_length}")
    
    # =========================================================================
    # 5. DATASETS ERSTELLEN
    # =========================================================================
    print(f"\n📦 Erstelle Datasets...")
    
    train_root = os.path.join(DATASET_PATH, "train")
    validate_root = os.path.join(DATASET_PATH, "validate")
    
    train_dataset = None
    eval_dataset = None
    
    if "train" in dataset:
        print(f"\n   Erstelle Train Dataset...")
        train_dataset = CordStyleReceiptDataset(
            dataset["train"], 
            processor, 
            train_root, 
            split="train"
        )
    
    if "validation" in dataset:
        print(f"\n   Erstelle Validation Dataset...")
        eval_dataset = CordStyleReceiptDataset(
            dataset["validation"], 
            processor, 
            validate_root, 
            split="validation"
        )
    
    if not train_dataset:
        raise ValueError("❌ Kein Training Dataset gefunden!")
    
    # =========================================================================
    # 6. SICHERHEITS-CHECK
    # =========================================================================
    print(f"\n🔍 Führe Sicherheits-Check durch...")
    
    embedding_size = model.decoder.get_input_embeddings().weight.shape[0]
    tokenizer_size = len(processor.tokenizer)
    
    print(f"   Tokenizer Length: {tokenizer_size}")
    print(f"   Embedding Matrix: {embedding_size}")
    
    if tokenizer_size != embedding_size:
        print(f"   ⚠️ Sync-Problem! Behebe...")
        model.decoder.resize_token_embeddings(tokenizer_size)
        model.config.decoder.vocab_size = tokenizer_size
        model.config.vocab_size = tokenizer_size
    
    # Test Sample
    sample = train_dataset[0]
    valid_labels = sample["labels"][sample["labels"] != -100]
    max_token_id = valid_labels.max().item() if len(valid_labels) > 0 else 0
    print(f"   Max Token ID im Sample: {max_token_id}")
    print(f"   Embedding unterstützt bis: {embedding_size - 1}")
    
    if max_token_id >= embedding_size:
        raise ValueError(f"❌ Token ID {max_token_id} ist zu groß!")
    
    print(f"   ✅ Alle Checks bestanden!")
    
    # =========================================================================
    # 7. TRAINING ARGUMENTS
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
        max_grad_norm=1.0,
        
        # Evaluation & Saving
        eval_strategy="epoch" if eval_dataset else "no",
        save_strategy="epoch",
        save_total_limit=3,
        load_best_model_at_end=True if eval_dataset else False,
        metric_for_best_model="loss",
        greater_is_better=False,
        
        # Logging
        logging_steps=10,
        logging_first_step=True,
        report_to=["tensorboard"],
        
        # Performance
        fp16=torch.cuda.is_available(),
        dataloader_num_workers=NUM_WORKERS,
        remove_unused_columns=False,
        
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
    # 8. TRAINER ERSTELLEN & TRAINING
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
    steps_per_epoch = max(1, len(train_dataset) // (BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS))
    print(f"Steps pro Epoche: {steps_per_epoch}")
    print(f"Gesamte Steps: {steps_per_epoch * EPOCHS}")
    print(f"{'='*80}\n")
    
    # TRAINING!
    train_result = trainer.train()
    
    # =========================================================================
    # 9. MODELL SPEICHERN
    # =========================================================================
    print(f"\n💾 Speichere finales Modell...")
    
    # Config explizit setzen
    model.config.max_length = MAX_LENGTH
    
    trainer.save_model(OUTPUT_DIR)
    processor.save_pretrained(OUTPUT_DIR)
    
    # Metrics speichern
    metrics = train_result.metrics
    trainer.log_metrics("train", metrics)
    trainer.save_metrics("train", metrics)
    
    print(f"\n{'='*80}")
    print(f"✅ TRAINING ERFOLGREICH!")
    print(f"{'='*80}")
    print(f"Modell: {OUTPUT_DIR}")
    print(f"Loss: {metrics.get('train_loss', 'N/A'):.4f}")
    print(f"\nTest mit: python test_model_v6.py")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()
