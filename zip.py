import zipfile
import os

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        if 'scratch' in dirs:
            dirs.remove('scratch')
        for file in files:
            if file.endswith('.zip'):
                continue
            filepath = os.path.join(root, file)
            arcname = os.path.relpath(filepath, path)
            ziph.write(filepath, arcname)

with zipfile.ZipFile('D:/ujomor-platform/airroofers.eu/airroofers_lite.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('D:/ujomor-platform/airroofers.eu', zipf)

print('Zip complete')
