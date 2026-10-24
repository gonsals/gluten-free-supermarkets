"""Download a pinned, verified Ninja without modifying the Android SDK."""
from pathlib import Path
import hashlib
import tempfile
import urllib.request
import zipfile

root = Path(tempfile.gettempdir()) / 'sin-gluten-tools' / 'ninja-1.13.2'
root.mkdir(parents=True, exist_ok=True)
binary = root / 'ninja.exe'
if not binary.exists():
    archive = root / 'ninja-win.zip'
    urllib.request.urlretrieve('https://github.com/ninja-build/ninja/releases/download/v1.13.2/ninja-win.zip', archive)
    expected = '07fc8261b42b20e71d1720b39068c2e14ffcee6396b76fb7a795fb460b78dc65'
    if hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
        raise RuntimeError('Ninja checksum mismatch')
    with zipfile.ZipFile(archive) as bundle:
        binary.write_bytes(bundle.read('ninja.exe'))
print(binary)
