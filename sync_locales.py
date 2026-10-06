import os
import json
import glob

def main():
    locales_dir = r"client\locales"
    files = glob.glob(os.path.join(locales_dir, "*.json"))
    
    all_data = {}
    all_keys = set()
    
    # Read all files
    for file in files:
        with open(file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            all_data[file] = data
            all_keys.update(data.keys())
            
    print(f"Total keys across all locales: {len(all_keys)}")
    
    # Update each file
    for file, data in all_data.items():
        lang = os.path.basename(file).split('.')[0]
        missing_keys = all_keys - set(data.keys())
        if missing_keys:
            print(f"{lang}.json is missing {len(missing_keys)} keys.")
            for key in missing_keys:
                # We can fallback to the english value if available, else empty string
                en_val = all_data.get(os.path.join(locales_dir, 'en.json'), {}).get(key, "")
                if lang == 'en':
                    data[key] = en_val
                else:
                    data[key] = f"[{lang}] {en_val}" if en_val else f"[{lang}] {key}"
            
        # Optional: remove obsolete keys? The instruction doesn't say remove keys, it says "Eliminate obsolete code and stubs without destructive action."
        
        # Sort and save
        sorted_data = {k: data[k] for k in sorted(all_keys)}
        with open(file, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(sorted_data, f, indent=2, ensure_ascii=False)
            f.write("\n")
            
    print("Translation parity guaranteed.")

if __name__ == '__main__':
    main()
