import os
import shutil
import random
import math

# Define paths
base_dir = r'd:\Repos\FinanceConsulter\backend\ai_models'
train_dir = os.path.join(base_dir, 'train')
validate_dir = os.path.join(base_dir, 'validate')
test_dir = os.path.join(base_dir, 'test')

# Ensure destination directories exist
for d in [validate_dir, test_dir]:
    os.makedirs(os.path.join(d, 'images'), exist_ok=True)
    os.makedirs(os.path.join(d, 'json'), exist_ok=True)

# Get list of images
images_dir = os.path.join(train_dir, 'images')
json_dir = os.path.join(train_dir, 'json')

all_images = os.listdir(images_dir)
pairs = []

print("Scanning for image-json pairs...")
for img in all_images:
    base_name = os.path.splitext(img)[0]
    # Try to find corresponding json
    # Heuristic 1: exact match with .json
    json_name = base_name + '.json'
    
    json_path = os.path.join(json_dir, json_name)
    
    if not os.path.exists(json_path):
        # Heuristic 2: replace - with _ (e.g. 1000-receipt.jpg -> 1000_receipt.json)
        json_name_alt = base_name.replace('-', '_') + '.json'
        json_path_alt = os.path.join(json_dir, json_name_alt)
        if os.path.exists(json_path_alt):
            json_name = json_name_alt
            json_path = json_path_alt
        else:
            print(f"Warning: No JSON found for {img}, skipping.")
            continue
    
    pairs.append((img, json_name))

# Shuffle pairs
random.seed(42) # For reproducibility
random.shuffle(pairs)

total_count = len(pairs)
validate_count = math.ceil(total_count * 0.10)
test_count = math.ceil(total_count * 0.20)

validate_pairs = pairs[:validate_count]
test_pairs = pairs[validate_count:validate_count + test_count]
# train_pairs remain in place

print(f"Total valid pairs found: {total_count}")
print(f"Moving {len(validate_pairs)} pairs to validate (10%)")
print(f"Moving {len(test_pairs)} pairs to test (20%)")
print(f"Remaining {total_count - len(validate_pairs) - len(test_pairs)} pairs in train")

def move_files(file_pairs, source_base, dest_base):
    for img, js in file_pairs:
        # Move image
        src_img = os.path.join(source_base, 'images', img)
        dst_img = os.path.join(dest_base, 'images', img)
        shutil.move(src_img, dst_img)
        
        # Move json
        src_json = os.path.join(source_base, 'json', js)
        dst_json = os.path.join(dest_base, 'json', js)
        shutil.move(src_json, dst_json)

print("Moving files to validate...")
move_files(validate_pairs, train_dir, validate_dir)
print("Moving files to test...")
move_files(test_pairs, train_dir, test_dir)

print("Done.")
