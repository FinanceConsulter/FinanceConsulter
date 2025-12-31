"""
Ensemble Receipt Scanner - Kombiniert zwei Modelle für bessere Ergebnisse:
1. naver-clova-ix/donut-base-finetuned-cord-v2 (gut für Merchant, Menu-Struktur)
2. mychen76/invoice-and-receipts_donut_v1 (gut für Date, Total, Item-Preise)

Die Ergebnisse werden intelligent zusammengeführt.
"""
import re
import json
import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel
from PIL import Image
import os
from typing import Dict, List, Optional, Tuple

# Modelle
CORD_MODEL = "naver-clova-ix/donut-base-finetuned-cord-v2"
INVOICE_MODEL = "mychen76/invoice-and-receipts_donut_v1"

# Test Pfade
TEST_IMAGE_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data\test\images"
TEST_JSON_DIR = r"C:\Users\basti\Documents\GitHub\FinanceConsulter\backend\ai_models\data\test\json"

NUM_SAMPLES = 40


class EnsembleReceiptScanner:
    """Kombiniert CORD-v2 und Invoice-Receipt Modelle für optimale Ergebnisse."""
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"📱 Device: {self.device}")
        
        # Modelle laden
        print("\n📥 Lade CORD-v2 Modell...")
        self.cord_processor = DonutProcessor.from_pretrained(CORD_MODEL)
        self.cord_model = VisionEncoderDecoderModel.from_pretrained(CORD_MODEL).to(self.device)
        self.cord_model.eval()
        print("   ✅ CORD-v2 geladen")
        
        print("\n📥 Lade Invoice/Receipt Modell...")
        self.invoice_processor = DonutProcessor.from_pretrained(INVOICE_MODEL)
        self.invoice_model = VisionEncoderDecoderModel.from_pretrained(
            INVOICE_MODEL, 
            use_safetensors=False
        ).to(self.device)
        self.invoice_model.eval()
        print("   ✅ Invoice/Receipt geladen")
    
    def predict_cord(self, image_path: str) -> dict:
        """Vorhersage mit CORD-v2 Modell."""
        image = Image.open(image_path).convert("RGB")
        pixel_values = self.cord_processor(image, return_tensors="pt").pixel_values.to(self.device)
        
        task_prompt = "<s_cord-v2>"
        decoder_input_ids = self.cord_processor.tokenizer(
            task_prompt, add_special_tokens=False, return_tensors="pt"
        ).input_ids.to(self.device)
        
        with torch.no_grad():
            outputs = self.cord_model.generate(
                pixel_values,
                decoder_input_ids=decoder_input_ids,
                max_length=768,
                pad_token_id=self.cord_processor.tokenizer.pad_token_id,
                eos_token_id=self.cord_processor.tokenizer.eos_token_id,
                use_cache=True,
                num_beams=4,
                bad_words_ids=[[self.cord_processor.tokenizer.unk_token_id]],
            )
        
        sequence = self.cord_processor.batch_decode(outputs)[0]
        sequence = sequence.replace(self.cord_processor.tokenizer.eos_token, "")
        sequence = sequence.replace(self.cord_processor.tokenizer.pad_token, "")
        sequence = re.sub(r"<.*?>", "", sequence, count=1).strip()
        
        return self.cord_processor.token2json(sequence)
    
    def predict_invoice(self, image_path: str) -> dict:
        """Vorhersage mit Invoice/Receipt Modell."""
        image = Image.open(image_path).convert("RGB")
        pixel_values = self.invoice_processor(image, return_tensors="pt").pixel_values.to(self.device)
        
        task_prompt = "<s>"
        decoder_input_ids = self.invoice_processor.tokenizer(
            task_prompt, add_special_tokens=False, return_tensors="pt"
        ).input_ids.to(self.device)
        
        with torch.no_grad():
            outputs = self.invoice_model.generate(
                pixel_values,
                decoder_input_ids=decoder_input_ids,
                max_length=1024,
                pad_token_id=self.invoice_processor.tokenizer.pad_token_id,
                eos_token_id=self.invoice_processor.tokenizer.eos_token_id,
                use_cache=True,
                num_beams=4,
                bad_words_ids=[[self.invoice_processor.tokenizer.unk_token_id]],
            )
        
        sequence = self.invoice_processor.batch_decode(outputs)[0]
        sequence = sequence.replace(self.invoice_processor.tokenizer.eos_token, "")
        sequence = sequence.replace(self.invoice_processor.tokenizer.pad_token, "")
        
        try:
            return self.invoice_processor.token2json(sequence)
        except:
            return {"raw": sequence}
    
    # ==================== HELPER FUNCTIONS ====================
    
    @staticmethod
    def clean_price(price_str: str) -> str:
        """Bereinigt einen Preis-String."""
        if not price_str:
            return ""
        cleaned = str(price_str).replace("$", "").replace("€", "").replace(" ", "")
        # Europäisches Format konvertieren
        if "," in cleaned and "." in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif "," in cleaned:
            cleaned = cleaned.replace(",", ".")
        try:
            val = float(cleaned)
            if val >= 0 and val < 10000:
                return f"{val:.2f}"
        except:
            pass
        return ""
    
    @staticmethod
    def is_valid_price(price_str: str) -> bool:
        """Prüft ob ein String ein gültiger Preis ist."""
        cleaned = EnsembleReceiptScanner.clean_price(price_str)
        if not cleaned:
            return False
        try:
            val = float(cleaned)
            return 0 <= val < 500  # Sinnvoller Bereich
        except:
            return False
    
    @staticmethod
    def is_header_info(name: str) -> bool:
        """Erkennt Header-Infos (Adresse, Telefon, etc.)."""
        if not name:
            return True
        name_lower = name.lower()
        
        patterns = [
            r'^\d+\s+\w+\s+(st|street|rd|road|ave|avenue|blvd|dr|drive)',
            r'tel[:\s]', r'phone', r'^server[:\s]', r'^order\s*#',
            r'^guest', r'^reprint', r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',
            r'^for a chance', r'^see back', r'ca\.\s*\d{5}',
            r'^waiter\s+\d+', r'^table\s+\d+', r'^check\s*#',
            r'^\w+,\s*(ca|ny|tx|fl)', r'^p\s*a\s*i\s*d',
        ]
        
        for pattern in patterns:
            if re.search(pattern, name_lower):
                return True
        return False
    
    @staticmethod
    def extract_merchant_from_cord(cord_output: dict) -> str:
        """Extrahiert Merchant aus CORD-v2 Output."""
        # Handle Liste
        if isinstance(cord_output, list):
            if not cord_output:
                return ""
            cord_output = cord_output[0]
        
        if not isinstance(cord_output, dict):
            return ""
        
        menu_items = cord_output.get("menu", [])
        if isinstance(menu_items, dict):
            menu_items = [menu_items]
        if isinstance(menu_items, dict):
            menu_items = [menu_items]
        
        for item in menu_items[:3]:  # Nur erste 3 Items prüfen
            if not isinstance(item, dict):
                continue
            name = item.get("nm", "")
            price = item.get("price", "")
            
            if isinstance(name, str) and name.strip():
                # Erstes Item ohne gültigen Preis = wahrscheinlich Merchant
                if not EnsembleReceiptScanner.is_valid_price(str(price)):
                    # Aber nicht wenn es eine Adresse oder Zahl ist
                    if not EnsembleReceiptScanner.is_header_info(name):
                        if not name[0].isdigit() and len(name) > 2:
                            return name.strip()
        return ""
    
    @staticmethod
    def extract_merchant_from_invoice(invoice_output: dict) -> str:
        """Extrahiert Merchant aus Invoice Output."""
        if isinstance(invoice_output, list) and invoice_output:
            invoice_output = invoice_output[0]
        
        store_addr = invoice_output.get("store_addr", "") or invoice_output.get("store_name", "")
        if store_addr:
            store_str = str(store_addr).strip()
            # Bekannte Restaurant-Namen extrahieren
            known_patterns = [
                r"(taco\s*bell)", r"(mcdonald)", r"(burger\s*king)", 
                r"(wendy)", r"(kfc)", r"(subway)", r"(starbucks)",
                r"(chipotle)", r"(chili'?s)", r"(applebee)",
                r"(olive\s*garden)", r"(outback)", r"(panda\s*express)",
            ]
            for pattern in known_patterns:
                match = re.search(pattern, store_str.lower())
                if match:
                    return match.group(1).title()
            
            # Ersten Teil vor Zahl extrahieren
            match = re.match(r'^([A-Za-z\s\'\-&]+)', store_str)
            if match and len(match.group(1).strip()) > 2:
                return match.group(1).strip()
        
        return ""
    
    @staticmethod
    def extract_date_from_invoice(invoice_output: dict) -> str:
        """Extrahiert Datum aus Invoice Output (zuverlässiger)."""
        if isinstance(invoice_output, list) and invoice_output:
            invoice_output = invoice_output[0]
        
        date = invoice_output.get("date", "")
        if date:
            # Manchmal doppelt: "4/20/2017 4/20/2017"
            return str(date).split()[0]
        return ""
    
    @staticmethod
    def extract_date_from_cord(cord_output: dict) -> str:
        """Extrahiert Datum aus CORD-v2 Output."""
        # Handle Liste
        if isinstance(cord_output, list):
            if not cord_output:
                return ""
            cord_output = cord_output[0]
        if not isinstance(cord_output, dict):
            return ""
        
        # Datum kann in verschiedenen Feldern sein
        menu_items = cord_output.get("menu", [])
        if isinstance(menu_items, dict):
            menu_items = [menu_items]
        
        for item in menu_items:
            if not isinstance(item, dict):
                continue
            num = item.get("num", "")
            if num:
                date_match = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', str(num))
                if date_match:
                    return date_match.group(1)
        return ""
    
    @staticmethod
    def extract_total_from_invoice(invoice_output: dict) -> str:
        """Extrahiert Total aus Invoice Output (zuverlässiger)."""
        if isinstance(invoice_output, list) and invoice_output:
            invoice_output = invoice_output[0]
        
        total = invoice_output.get("total", "") or invoice_output.get("subtotal", "")
        if total:
            # Manchmal doppelt: "77.83 77.83"
            total_str = str(total).split()[0]
            return EnsembleReceiptScanner.clean_price(total_str)
        return ""
    
    @staticmethod
    def extract_total_from_cord(cord_output: dict) -> str:
        """Extrahiert Total aus CORD-v2 Output."""
        # Handle Liste
        if isinstance(cord_output, list):
            if not cord_output:
                return ""
            cord_output = cord_output[0]
        if not isinstance(cord_output, dict):
            return ""
        
        total_data = cord_output.get("total", {})
        if isinstance(total_data, dict):
            total_price = total_data.get("total_price", "") or total_data.get("cashprice", "")
            return EnsembleReceiptScanner.clean_price(total_price)
        elif isinstance(total_data, list) and total_data:
            if isinstance(total_data[0], dict):
                return EnsembleReceiptScanner.clean_price(total_data[0].get("total_price", ""))
        return ""
    
    def extract_menu_items_from_cord(self, cord_output: dict) -> List[dict]:
        """Extrahiert Menu-Items aus CORD-v2 Output."""
        # Handle Liste
        if isinstance(cord_output, list):
            if not cord_output:
                return []
            cord_output = cord_output[0]
        if not isinstance(cord_output, dict):
            return []
        
        items = []
        menu_items = cord_output.get("menu", [])
        if isinstance(menu_items, dict):
            menu_items = [menu_items]
        
        for idx, item in enumerate(menu_items):
            if not isinstance(item, dict):
                continue
            
            name = item.get("nm", "")
            price = item.get("price", "")
            cnt = item.get("cnt", "")
            
            if isinstance(name, (dict, list)) or not name:
                continue
            name = str(name).strip()
            
            # Erstes Item ohne Preis überspringen (oft Merchant)
            if idx == 0 and not self.is_valid_price(str(price)):
                continue
            
            if self.is_header_info(name):
                continue
            
            if self.is_valid_price(str(price)):
                artikel_name = name
                if cnt and str(cnt).isdigit() and int(cnt) > 1:
                    artikel_name = f"{cnt} {artikel_name}"
                
                items.append({
                    "Artikel": artikel_name,
                    "Total": self.clean_price(str(price))
                })
        
        return items
    
    def extract_menu_items_from_invoice(self, invoice_output: dict) -> List[dict]:
        """Extrahiert Menu-Items aus Invoice Output."""
        if isinstance(invoice_output, list) and invoice_output:
            invoice_output = invoice_output[0]
        
        items = []
        line_items = invoice_output.get("line_items", [])
        if isinstance(line_items, dict):
            line_items = [line_items]
        
        for item in line_items:
            if not isinstance(item, dict):
                continue
            
            name = item.get("item_name", "") or item.get("item_desc", "")
            if not name or isinstance(name, (list, dict)):
                continue
            name = str(name).strip()
            
            if not name or name.upper() in ["NAME", "", "*"]:
                continue
            
            qty = item.get("item_quantity", "")
            if qty:
                try:
                    qty_val = float(str(qty).replace(",", "."))
                    if qty_val > 1:
                        name = f"{int(qty_val)} {name}"
                except:
                    pass
            
            price = item.get("item_value", "") or item.get("price", "")
            cleaned_price = self.clean_price(price)
            
            if name:
                items.append({
                    "Artikel": name,
                    "Total": cleaned_price if cleaned_price else "0.00"
                })
        
        return items
    
    def merge_menu_items(self, cord_items: List[dict], invoice_items: List[dict]) -> List[dict]:
        """Kombiniert Menu-Items aus beiden Modellen intelligent."""
        # Strategie: Verwende das Modell mit mehr validen Preisen
        
        cord_valid = sum(1 for i in cord_items if i["Total"] and i["Total"] != "0.00")
        invoice_valid = sum(1 for i in invoice_items if i["Total"] and i["Total"] != "0.00")
        
        # Wenn ein Modell deutlich mehr valide Preise hat, nutze es
        if cord_valid > invoice_valid * 1.5:
            return cord_items
        elif invoice_valid > cord_valid * 1.5:
            return invoice_items
        
        # Sonst: Kombiniere - bevorzuge Items mit Preisen
        merged = []
        seen_names = set()
        
        # Erst Items mit Preisen hinzufügen
        for item in cord_items + invoice_items:
            name_lower = item["Artikel"].lower()
            if name_lower in seen_names:
                continue
            if item["Total"] and item["Total"] != "0.00":
                merged.append(item)
                seen_names.add(name_lower)
        
        # Dann Items ohne Preise (wenn noch nicht vorhanden)
        for item in cord_items + invoice_items:
            name_lower = item["Artikel"].lower()
            if name_lower not in seen_names:
                merged.append(item)
                seen_names.add(name_lower)
        
        return merged
    
    def scan_receipt(self, image_path: str) -> Tuple[dict, dict, dict]:
        """
        Scannt einen Receipt mit beiden Modellen und kombiniert die Ergebnisse.
        
        Returns:
            (ensemble_result, cord_raw, invoice_raw)
        """
        # Beide Modelle ausführen
        cord_output = self.predict_cord(image_path)
        invoice_output = self.predict_invoice(image_path)
        
        # === MERCHANT ===
        # Priorität: CORD-v2 (besser bei Restaurant-Namen)
        merchant = self.extract_merchant_from_cord(cord_output)
        if not merchant:
            merchant = self.extract_merchant_from_invoice(invoice_output)
        
        # === DATE ===
        # Priorität: Invoice (zuverlässiger)
        date = self.extract_date_from_invoice(invoice_output)
        if not date:
            date = self.extract_date_from_cord(cord_output)
        
        # === TOTAL ===
        # Priorität: Invoice (zuverlässiger)
        total = self.extract_total_from_invoice(invoice_output)
        if not total:
            total = self.extract_total_from_cord(cord_output)
        
        # === MENU ITEMS ===
        cord_items = self.extract_menu_items_from_cord(cord_output)
        invoice_items = self.extract_menu_items_from_invoice(invoice_output)
        menu_items = self.merge_menu_items(cord_items, invoice_items)
        
        # Fallback Total: Aus Items berechnen
        if not total and menu_items:
            try:
                valid_prices = [float(i["Total"]) for i in menu_items if i["Total"] and i["Total"] != "0.00"]
                if valid_prices:
                    total = f"{sum(valid_prices):.2f}"
            except:
                pass
        
        result = {
            "data": {
                "merchant": merchant,
                "date": date,
                "menu": menu_items,
                "total": total
            }
        }
        
        return result, cord_output, invoice_output


def main():
    print("=" * 80)
    print("ENSEMBLE RECEIPT SCANNER")
    print("Kombiniert CORD-v2 + Invoice/Receipt Modelle")
    print("=" * 80)
    
    scanner = EnsembleReceiptScanner()
    
    if not os.path.exists(TEST_IMAGE_DIR):
        print(f"\n❌ Test-Verzeichnis nicht gefunden: {TEST_IMAGE_DIR}")
        return
    
    files = [f for f in os.listdir(TEST_IMAGE_DIR) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
    if not files:
        print("\n❌ Keine Bilder gefunden!")
        return
    
    samples = files[:NUM_SAMPLES]
    print(f"\n🔍 Teste {len(samples)} Bilder...\n")
    
    # Statistiken
    stats = {
        "merchant_found": 0,
        "date_found": 0,
        "total_found": 0,
        "total_correct": 0,
        "menu_items_found": 0,
        "menu_items_expected": 0,
        "menu_items_with_price": 0,
        "menu_prices_correct": 0,
        "receipts_with_gt": 0,
    }
    
    for img_file in samples:
        print("-" * 80)
        print(f"📄 {img_file}")
        
        img_path = os.path.join(TEST_IMAGE_DIR, img_file)
        
        try:
            result, cord_raw, invoice_raw = scanner.scan_receipt(img_path)
            
            # Kurze Raw-Outputs
            print(f"\n   🔵 CORD-v2:   merchant={scanner.extract_merchant_from_cord(cord_raw)[:20] or '-':<20} "
                  f"total={scanner.extract_total_from_cord(cord_raw) or '-':<8} "
                  f"items={len(scanner.extract_menu_items_from_cord(cord_raw))}")
            print(f"   🟢 Invoice:   date={scanner.extract_date_from_invoice(invoice_raw) or '-':<12} "
                  f"total={scanner.extract_total_from_invoice(invoice_raw) or '-':<8} "
                  f"items={len(scanner.extract_menu_items_from_invoice(invoice_raw))}")
            
            print(f"\n   🎯 ENSEMBLE RESULT:")
            print(f"      Merchant: {result['data']['merchant'] or '❌ nicht erkannt'}")
            print(f"      Date:     {result['data']['date'] or '❌ nicht erkannt'}")
            print(f"      Total:    ${result['data']['total'] or '❌ nicht erkannt'}")
            print(f"      Items:    {len(result['data']['menu'])} Artikel")
            
            # Ground Truth laden (vor der Artikel-Ausgabe für Vergleich)
            base_name = os.path.splitext(img_file)[0]
            # Bild-Namen: "1002-receipt.jpg" -> JSON: "1002_receipt.json"
            json_name = base_name.replace("-", "_")
            json_path = os.path.join(TEST_JSON_DIR, json_name + ".json")
            gt_items = []
            gt_total = ""
            has_gt = False
            
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    gt = json.load(f)
                gt_items = gt.get('data', {}).get('menu', [])
                gt_total = gt.get('data', {}).get('total', '')
                has_gt = True
                stats['receipts_with_gt'] += 1
                stats['menu_items_expected'] += len(gt_items)
            
            # Alle Artikel mit Vergleich ausgeben
            if result['data']['menu']:
                print(f"\n      📋 ERKANNTE ARTIKEL:")
                for item in result['data']['menu']:
                    artikel_name = item['Artikel'][:40]
                    artikel_preis = item['Total']
                    
                    # Status ermitteln
                    status = ""
                    if has_gt and gt_items:
                        detected_name = item['Artikel'].lower().replace(' ', '')
                        match_found = False
                        
                        for gt_item in gt_items:
                            gt_name = gt_item.get('Artikel', '').lower().replace(' ', '')
                            gt_price = str(gt_item.get('Total', '')).replace(',', '.')
                            
                            # Name-Match prüfen
                            if detected_name and gt_name:
                                if detected_name in gt_name or gt_name in detected_name:
                                    match_found = True
                                    # Preis vergleichen
                                    try:
                                        if artikel_preis and artikel_preis != '0.00':
                                            price_diff = abs(float(artikel_preis) - float(gt_price))
                                            if price_diff < 0.02:
                                                status = "✅ OK"
                                            else:
                                                status = f"⚠️ Preis falsch (erwartet: ${gt_price})"
                                        else:
                                            status = f"⚠️ Kein Preis (erwartet: ${gt_price})"
                                    except:
                                        status = "⚠️ Preis-Fehler"
                                    break
                        
                        if not match_found:
                            if artikel_preis and artikel_preis != '0.00':
                                status = "❓ Nicht in Ground Truth"
                            else:
                                status = "❓ Nicht in GT, kein Preis"
                    else:
                        # Keine Ground Truth vorhanden
                        if artikel_preis and artikel_preis != '0.00':
                            status = "📝 (keine GT)"
                        else:
                            status = "📝 kein Preis (keine GT)"
                    
                    print(f"         - {artikel_name:<40} ${artikel_preis:<8} {status}")
            
            # Ground Truth Ausgabe
            if has_gt:
                print(f"\n   ✅ GROUND TRUTH:")
                print(f"      Merchant: {gt.get('data', {}).get('merchant', '-')}")
                
                # Total-Vergleich
                total_status = ""
                if result['data']['total'] and gt_total:
                    try:
                        detected_total = float(result['data']['total'])
                        expected_total = float(str(gt_total).replace(',', '.'))
                        if abs(detected_total - expected_total) < 0.02:
                            stats['total_correct'] += 1
                            total_status = " ✅"
                        else:
                            total_status = f" ❌ (erkannt: ${result['data']['total']})"
                    except:
                        total_status = " ⚠️"
                
                print(f"      Total:    ${gt_total}{total_status}")
                print(f"      Items:    {len(gt_items)} Artikel")
                
                # Ground Truth Artikel anzeigen
                if gt_items:
                    print(f"\n      📋 ERWARTETE ARTIKEL (Ground Truth):")
                    for gt_item in gt_items:
                        gt_artikel = gt_item.get('Artikel', '-')[:40]
                        gt_preis = str(gt_item.get('Total', '-'))
                        print(f"         - {gt_artikel:<40} ${gt_preis}")
            
            # Statistik
            if result['data']['merchant']:
                stats['merchant_found'] += 1
            if result['data']['date']:
                stats['date_found'] += 1
            if result['data']['total']:
                stats['total_found'] += 1
            
            # Menu-Items Statistik
            for item in result['data']['menu']:
                stats['menu_items_found'] += 1
                if item.get('Total') and item['Total'] != '0.00':
                    stats['menu_items_with_price'] += 1
                    
                    # Preis-Vergleich mit Ground Truth
                    detected_name = item['Artikel'].lower().replace(' ', '')
                    detected_price = item['Total']
                    
                    for gt_item in gt_items:
                        gt_name = gt_item.get('Artikel', '').lower().replace(' ', '')
                        gt_price = str(gt_item.get('Total', '')).replace(',', '.')
                        
                        # Fuzzy Name Match
                        if detected_name and gt_name:
                            if detected_name in gt_name or gt_name in detected_name:
                                try:
                                    if abs(float(detected_price) - float(gt_price)) < 0.02:
                                        stats['menu_prices_correct'] += 1
                                        break
                                except:
                                    pass
            
        except Exception as e:
            print(f"   ❌ Fehler: {e}")
            import traceback
            traceback.print_exc()
        
        print()
    
    # Gesamtstatistik
    print("=" * 80)
    print("📊 GESAMTSTATISTIK")
    print("=" * 80)
    print(f"\n   📋 GRUNDDATEN:")
    print(f"   Merchant erkannt:  {stats['merchant_found']}/{len(samples)} ({100*stats['merchant_found']/len(samples):.0f}%)")
    print(f"   Datum erkannt:     {stats['date_found']}/{len(samples)} ({100*stats['date_found']/len(samples):.0f}%)")
    print(f"   Total erkannt:     {stats['total_found']}/{len(samples)} ({100*stats['total_found']/len(samples):.0f}%)")
    
    if stats['receipts_with_gt'] > 0:
        print(f"   Total korrekt:     {stats['total_correct']}/{stats['receipts_with_gt']} ({100*stats['total_correct']/stats['receipts_with_gt']:.0f}%)")
    
    print(f"\n   🍽️  MENU-ITEMS:")
    print(f"   Erkannte Artikel:  {stats['menu_items_found']} (Ø {stats['menu_items_found']/len(samples):.1f} pro Receipt)")
    if stats['menu_items_expected'] > 0:
        print(f"   Erwartete Artikel: {stats['menu_items_expected']} (aus Ground Truth)")
        coverage = min(100, 100 * stats['menu_items_found'] / stats['menu_items_expected'])
        print(f"   Artikel-Abdeckung: {coverage:.0f}%")
    
    print(f"\n   💰 PREISE:")
    print(f"   Artikel mit Preis: {stats['menu_items_with_price']}/{stats['menu_items_found']} ({100*stats['menu_items_with_price']/max(1,stats['menu_items_found']):.0f}%)")
    if stats['menu_items_with_price'] > 0:
        print(f"   Preise korrekt:    {stats['menu_prices_correct']}/{stats['menu_items_with_price']} ({100*stats['menu_prices_correct']/stats['menu_items_with_price']:.0f}%)")


if __name__ == "__main__":
    main()
