import os
import re

def rebrand_files(directory):
    # Regexes and replacements
    replacements = {
        r"Apex Crypto Desk": "Cryptofinancial",
        r"ApexCryptoDesk": "Cryptofinancial",
        r"Aetheria Wallet": "Cryptofinancial",
        r"Aetheria": "Cryptofinancial",
        r"Aethena": "Cryptofinancial",
        r"aetheriawallet\.com": "apexcryptodesk.com",
        r"Crypto, finally made simple.": "Crypto, finally made simple.", # Just to be sure
    }

    # Signal language replacements
    signal_replacements = {
        r'"BUY"': '"Upward Bias"',
        r'"SELL"': '"Downward Bias"',
        r"Entry Level": "Reference Level",
        r"Stop-Loss": "Lower Level",
        r"Profit Target": "Upper Level",
        r"Entry": "Reference Level",
        r"Target": "Upper Level",
        r"SL": "Lower",
        r"TP": "Upper",
        r"signal-buy": "signal-upward",
        r"signal-sell": "signal-downward"
    }

    for root, dirs, files in os.walk(directory):
        if "node_modules" in root or ".git" in root or "android" in root or "ios" in root or "www" in root:
            continue
        for file in files:
            if not file.endswith(('.html', '.css', '.js', '.json', '.md', '.txt', '.xml')):
                continue
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content
            for old, new in replacements.items():
                new_content = re.sub(old, new, new_content, flags=re.IGNORECASE)

            # Versioning to 1.0.0
            if file in ['package.json', 'capacitor.config.json']:
                new_content = re.sub(r'"version": ".*?"', '"version": "1.0.0"', new_content)
                new_content = re.sub(r'"appName": ".*?"', '"appName": "Cryptofinancial"', new_content)
                new_content = re.sub(r'"name": ".*?"', '"name": "cryptofinancial"', new_content)

            if file == 'capacitor.config.json':
                new_content = re.sub(r'"webDir": "www"', '"webDir": "."', new_content)

            if file == 'index.html':
                 new_content = re.sub(r'<title>.*?</title>', '<title>Cryptofinancial | Crypto, finally made simple.</title>', new_content)
                 new_content = re.sub(r'Premium crypto market intelligence.*?built for clarity, not noise.', 'Live crypto market intelligence with portfolio context and guided signal analysis.', new_content)

            if file == 'app.js':
                for old, new in signal_replacements.items():
                    new_content = re.sub(old, new, new_content)
                
                # specific cleanups that python might mess up: handling renderMarketCards duplicate later.

            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

rebrand_files(".")
