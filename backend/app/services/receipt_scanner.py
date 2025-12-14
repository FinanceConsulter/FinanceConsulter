import re
import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel
from PIL import Image
import io
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ReceiptScanner:
    _instance = None
    _model = None
    _processor = None
    _device = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ReceiptScanner, cls).__new__(cls)
            cls._instance._load_model()
        return cls._instance

    def _load_model(self):
        logger.info("📥 Loading Receipt Scanner Model...")
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"   Device: {self._device}")
        
        model_name = "naver-clova-ix/donut-base-finetuned-cord-v2"
        try:
            self._processor = DonutProcessor.from_pretrained(model_name)
            self._model = VisionEncoderDecoderModel.from_pretrained(model_name).to(self._device)
            self._model.eval()
            logger.info("✅ Model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise e

    def scan_image(self, file_bytes: bytes, filename: str = ""):
        try:
            image = None
            
            # Check if PDF
            if filename.lower().endswith('.pdf') or (file_bytes.startswith(b'%PDF')):
                image = self._convert_pdf_to_image(file_bytes)
            else:
                image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            
            if image is None:
                return {"error": "Could not process file. Please upload a valid image or PDF."}

            pixel_values = self._processor(image, return_tensors="pt").pixel_values.to(self._device)

            task_prompt = "<s_cord-v2>"
            decoder_input_ids = self._processor.tokenizer(
                task_prompt, 
                add_special_tokens=False, 
                return_tensors="pt"
            ).input_ids.to(self._device)

            with torch.no_grad():
                outputs = self._model.generate(
                    pixel_values,
                    decoder_input_ids=decoder_input_ids,
                    max_length=768,
                    pad_token_id=self._processor.tokenizer.pad_token_id,
                    eos_token_id=self._processor.tokenizer.eos_token_id,
                    use_cache=True,
                    num_beams=4,
                    bad_words_ids=[[self._processor.tokenizer.unk_token_id]],
                    return_dict_in_generate=True,
                )

            sequence = self._processor.batch_decode(outputs.sequences)[0]
            sequence = sequence.replace(self._processor.tokenizer.eos_token, "").replace(self._processor.tokenizer.pad_token, "")
            sequence = re.sub(r"<.*?>", "", sequence, count=1).strip()
            
            cord_json = self._processor.token2json(sequence)
            return self._convert_to_custom_format(cord_json)
            
        except Exception as e:
            logger.error(f"Error scanning receipt: {e}")
            return {"error": str(e)}

    def _convert_pdf_to_image(self, pdf_bytes):
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(pdf_bytes)
            page = pdf[0] # Get first page
            bitmap = page.render(scale=2) # Render with higher resolution
            pil_image = bitmap.to_pil()
            return pil_image.convert("RGB")
        except ImportError:
            logger.warning("pypdfium2 not installed. Trying to use pdf2image or failing.")
            try:
                from pdf2image import convert_from_bytes
                images = convert_from_bytes(pdf_bytes)
                if images:
                    return images[0].convert("RGB")
            except ImportError:
                logger.error("No PDF conversion library found. Please install pypdfium2.")
                return None
        except Exception as e:
            logger.error(f"Error converting PDF: {e}")
            return None

    def _is_valid_price(self, price_str: str) -> bool:
        if not price_str:
            return False
        cleaned = str(price_str).replace("$", "").replace(",", ".").strip()
        try:
            val = float(cleaned)
            return val >= 0 and val < 10000
        except:
            return False

    def _clean_price(self, price_str: str) -> str:
        if not price_str:
            return "0.00"
        cleaned = str(price_str).replace("$", "").replace(",", ".").strip()
        try:
            return f"{float(cleaned):.2f}"
        except:
            return "0.00"

    def _is_header_info(self, name: str) -> bool:
        if not name:
            return False
        name_lower = name.lower()
        
        header_patterns = [
            r'^\d+\s+\w+\s+(st|street|rd|road|ave|avenue|blvd|dr|drive)',
            r'tel[:\s]', r'phone', r'^server[:\s]', r'^order\s*#', r'^order#',
            r'^guest', r'^reprint', r'^reg\s*$', r'^\d{5}$',
            r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', r'^for a chance', r'^see back',
            r'ca\.\s*\d{5}', r'^south\s+gate', r'^lewnette',
            r'^no sour cream$', r'^no cheese$', r'^khere$',
            r'^waiter\s+\d+', r'^table\s+\d+', r'^check\s*#',
            r'^qty.*name', r'^\w+,\s*(ca|ny|tx|fl)', r'^p\s*a\s*i\s*d',
            r'^hermosa\s+beach', r'^serv\.?charge',
        ]
        
        for pattern in header_patterns:
            if re.search(pattern, name_lower):
                return True
        return False

    def _is_likely_menu_item(self, name: str, price: str) -> bool:
        if not name or not self._is_valid_price(price):
            return False
        
        if isinstance(name, list):
            return False
        
        name_str = str(name)
        name_lower = name_str.lower()
        
        try:
            price_val = float(str(price).replace("$", "").replace(",", ".").strip())
            if price_val > 500:
                return False
        except:
            pass
        
        if re.match(r'^\w+\s+\d{1,2},\s*\d{4}', name_str):
            return False
        
        food_indicators = [
            r'bowl', r'plate', r'drink', r'coffee', r'tea', r'soda', r'water',
            r'burger', r'sandwich', r'salad', r'soup', r'pizza', r'pasta',
            r'chicken', r'beef', r'pork', r'fish', r'shrimp', r'lobster',
            r'fries', r'rice', r'noodle', r'roll', r'taco', r'burrito',
            r'cake', r'pie', r'ice cream', r'dessert',
            r'beer', r'wine', r'margarita', r'cocktail', r'lite', r'light',
            r'small', r'medium', r'large', r'\(s\)', r'\(m\)', r'\(l\)',
            r'add\s', r'extra', r'side', r'combo', r'meal', r'special',
            r'avocado', r'cheese', r'bacon', r'onion', r'lettuce',
            r'pho', r'sushi', r'curry', r'masala', r'biryani',
            r'buns', r'pancake', r'dumplings', r'wings',
            r'sprouts', r'tender', r'grilled', r'vanilla', r'classic',
            r'mac\s*&?\s*cheese', r'zucchini',
        ]
        
        for pattern in food_indicators:
            if re.search(pattern, name_lower):
                return True
        
        if self._is_valid_price(price) and not self._is_header_info(name_str):
            if len(name_str) >= 2 and not name_str.replace(" ", "").isdigit():
                return True
        
        return False

    def _extract_menu_item_from_sub(self, sub_dict: dict) -> list:
        items = []
        if not isinstance(sub_dict, dict):
            return items
        
        name = sub_dict.get("nm", "")
        price = sub_dict.get("price", "")
        cnt = sub_dict.get("cnt", "")
        
        if isinstance(name, str) and self._is_valid_price(str(price)):
            if not self._is_header_info(name):
                artikel_name = name.strip()
                if cnt and str(cnt).isdigit() and int(cnt) > 1:
                    artikel_name = f"{cnt} {artikel_name}"
                items.append({
                    "name": artikel_name,
                    "price": self._clean_price(str(price)),
                    "quantity": 1
                })
        
        if "sub" in sub_dict:
            items.extend(self._extract_menu_item_from_sub(sub_dict["sub"]))
        
        return items

    def _convert_to_custom_format(self, cord_output):
        """Converts CORD-v2 format to our custom format."""
        custom_data = {
            "merchant": "",
            "date": "",
            "total": "",
            "currency": "CHF",
            "items": []
        }

        if isinstance(cord_output, list):
            if not cord_output: return custom_data
            cord_output = cord_output[0]
        
        if not isinstance(cord_output, dict):
            return custom_data
        
        found_menu_items = []
        merchant_candidate = ""
        
        menu_items = cord_output.get("menu", [])
        if isinstance(menu_items, dict):
            menu_items = [menu_items]
        
        for idx, item in enumerate(menu_items):
            if not isinstance(item, dict): continue
                
            name = item.get("nm", "")
            price = item.get("price", "")
            cnt = item.get("cnt", "")
            num = item.get("num", "")
            
            if isinstance(name, (dict, list)): continue
            name = str(name).strip()
            
            if not name: continue
            
            if num:
                date_match = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', str(num))
                if date_match and not custom_data["date"]:
                    custom_data["date"] = date_match.group(1)
            
            if isinstance(price, dict): continue
            price_str = str(price) if price else ""
            
            if idx == 0 and not self._is_valid_price(price_str):
                merchant_candidate = name
                continue
            
            if self._is_header_info(name): continue
            
            if self._is_valid_price(price_str):
                artikel_name = name
                if cnt and str(cnt).isdigit() and int(cnt) > 1:
                    artikel_name = f"{cnt} {artikel_name}"
                
                found_menu_items.append({
                    "name": artikel_name,
                    "price": self._clean_price(price_str),
                    "quantity": 1
                })
            
            if "sub" in item:
                sub_items = self._extract_menu_item_from_sub(item["sub"])
                found_menu_items.extend(sub_items)
        
        total_data = cord_output.get("total", {})
        if isinstance(total_data, dict):
            total_price = total_data.get("total_price", "") or total_data.get("cashprice", "")
        elif isinstance(total_data, list) and total_data:
            total_price = total_data[0].get("total_price", "") if isinstance(total_data[0], dict) else ""
        else:
            total_price = str(total_data) if total_data else ""
        
        custom_data["total"] = self._clean_price(total_price)
        
        try:
            total_val = float(custom_data["total"]) if custom_data["total"] else 0
            if total_val > 10000: custom_data["total"] = ""
        except: pass
        
        sub_total = cord_output.get("sub_total", {})
        if isinstance(sub_total, dict):
            if not custom_data["total"] or custom_data["total"] == "0.00":
                subtotal_price = sub_total.get("subtotal_price", "")
                if self._is_valid_price(subtotal_price):
                    custom_data["total"] = self._clean_price(subtotal_price)
            
            etc_items = sub_total.get("etc", [])
            if isinstance(etc_items, list):
                for etc in etc_items:
                    if not isinstance(etc, dict): continue
                    nm = str(etc.get("nm", "")).strip()
                    price = etc.get("price", "")
                    cnt = etc.get("cnt", "")
                    
                    date_match = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', nm)
                    if date_match and not custom_data["date"]:
                        custom_data["date"] = date_match.group(1)
                        continue
                    
                    if not merchant_candidate and nm and not nm[0].isdigit():
                        if not self._is_header_info(nm) and len(nm) > 2:
                            if not self._is_valid_price(str(price)) or str(price) == nm:
                                merchant_candidate = nm
                                continue
                    
                    if self._is_valid_price(str(price)) and nm:
                        if self._is_likely_menu_item(nm, str(price)):
                            artikel_name = nm
                            if cnt and str(cnt).isdigit() and int(cnt) > 1:
                                artikel_name = f"{cnt} {artikel_name}"
                            
                            already_exists = any(m["name"].lower() == artikel_name.lower() for m in found_menu_items)
                            if not already_exists:
                                found_menu_items.append({
                                    "name": artikel_name,
                                    "price": self._clean_price(str(price)),
                                    "quantity": 1
                                })

        custom_data["merchant"] = merchant_candidate
        custom_data["items"] = found_menu_items
        
        return custom_data

scanner = ReceiptScanner()
