"""Prepare a verified portable JDK 21 for emulator tests; never change system Java."""
from pathlib import Path
import hashlib
import json
import tempfile
import urllib.request
import zipfile

root = Path(tempfile.gettempdir()) / 'sin-gluten-tools'
root.mkdir(exist_ok=True)
existing = list(root.glob('jdk-*/bin/java.exe'))
if existing:
    print(existing[0].parent.parent)
else:
    endpoint = 'https://api.github.com/repos/adoptium/temurin21-binaries/releases?per_page=3'
    headers = {'User-Agent': 'SinGluten-development-tools'}
    releases = json.load(urllib.request.urlopen(urllib.request.Request(endpoint, headers=headers), timeout=30))
    release = next(r for r in releases if not r['prerelease'] and any(a['name'].startswith('OpenJDK21U-jdk_x64_windows_hotspot_') and a['name'].endswith('.zip') for a in r['assets']))
    package = next(item for item in release['assets'] if item['name'].startswith('OpenJDK21U-jdk_x64_windows_hotspot_') and item['name'].endswith('.zip'))
    checksum_asset = next(item for item in release['assets'] if item['name'] == package['name'] + '.sha256.txt')
    checksum = urllib.request.urlopen(urllib.request.Request(checksum_asset['browser_download_url'], headers=headers), timeout=30).read().decode().split()[0]
    archive = root / 'jdk21.zip'
    urllib.request.urlretrieve(package['browser_download_url'], archive)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != checksum:
        raise RuntimeError('JDK checksum mismatch')
    with zipfile.ZipFile(archive) as bundle:
        for item in bundle.infolist():
            if not (root / item.filename).resolve().is_relative_to(root.resolve()):
                raise RuntimeError('Unsafe archive entry')
        bundle.extractall(root)
    print(next(root.glob('jdk-*/bin/java.exe')).parent.parent)
