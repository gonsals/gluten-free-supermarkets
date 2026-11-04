"""Inspect an embedded local preview without installing it or printing credentials."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile


def inspect(apk, metadata, sdk):
    if apk.stat().st_size > 200 * 1024 * 1024:
        raise ValueError('Unexpected APK size.')
    if metadata.stat().st_size > 20000:
        raise ValueError('Unexpected metadata size.')
    meta = json.loads(metadata.read_text(encoding='utf-8'))
    digest = hashlib.sha256(apk.read_bytes()).hexdigest()
    if (meta.get('sha256') != digest or meta.get('variant') != 'preview'
            or meta.get('requiresMetro') is not False or meta.get('cloudEnabled') is not False
            or meta.get('signing') != 'development-key-not-for-stores'):
        raise ValueError('This check requires checksum-matched embedded, cloud-disabled preview metadata.')
    name = 'aapt2.exe' if os.name == 'nt' else 'aapt2'
    versions = sorted((p for p in (sdk / 'build-tools').iterdir() if re.fullmatch(r'\d+(?:\.\d+){1,2}', p.name)),
                      key=lambda p: tuple(int(n) for n in p.name.split('.')), reverse=True)
    tool = next((p / name for p in versions if (p / name).is_file()), None)
    if tool is None:
        raise ValueError('Android SDK build-tools with aapt2 are required.')
    def dump(*args):
        return subprocess.check_output([str(tool), 'dump', *args, str(apk)], text=True, encoding='utf-8', timeout=60)
    badging = dump('badging')
    manifest = dump('xmltree', '--file', 'AndroidManifest.xml')
    package = re.search(r"^package: name='([^']+)'", badging, re.MULTILINE)
    if not package or package[1] != 'com.tumarre.singluten':
        raise ValueError('Unexpected Android package.')
    permissions = sorted(set(re.findall(r"^uses-permission[^:]*: name='([^']+)'", badging, re.MULTILINE)))
    forbidden = {'android.permission.RECORD_AUDIO', 'android.permission.READ_EXTERNAL_STORAGE',
                 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.MANAGE_EXTERNAL_STORAGE',
                 'android.permission.SYSTEM_ALERT_WINDOW'}
    if 'android.permission.CAMERA' not in permissions or forbidden.intersection(permissions):
        raise ValueError('Camera/microphone/storage/overlay permission contract failed.')
    if not re.search(r'android:allowBackup\([^)]*\)=false', manifest):
        raise ValueError('Android platform backup must be disabled.')
    abis = set()
    api_keys = 0
    with zipfile.ZipFile(apk) as archive:
        entries = archive.infolist()
        if len(entries) > 20000 or sum(e.file_size for e in entries) > 500 * 1024 * 1024:
            raise ValueError('Unexpected APK expansion size.')
        for entry in entries:
            filename = entry.filename
            if Path(filename).name.startswith('.env'):
                raise ValueError('Environment file embedded in APK.')
            match = re.match(r'^lib/([^/]+)/[^/]+\.so$', filename)
            if match:
                abis.add(match[1])
            if not entry.is_dir():
                # Count only; never include a matched value in an exception or report.
                api_keys += len(re.findall(rb'AIza[0-9A-Za-z_-]{35}', archive.read(entry)))
        embedded = archive.getinfo('assets/index.android.bundle').file_size
    if embedded < 1000 or api_keys or sorted(abis) != sorted(meta.get('architectures', [])):
        raise ValueError('Embedded bundle, API-key pattern or architecture contract failed.')
    return dict(file=apk.name, bytes=apk.stat().st_size, sha256=digest, package=package[1],
                architectures=sorted(abis), embeddedBundleBytes=embedded,
                permissions=permissions, androidPlatformBackup=False,
                environmentFiles=0, googleApiKeyPatternMatches=api_keys,
                previewMetadataCloudEnabled=False, requiresMetro=False,
                signingMetadata='development-key-not-for-stores', aapt2Version=tool.parent.name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=Path)
    parser.add_argument('--metadata', type=Path)
    parser.add_argument('--sdk', type=Path)
    parser.add_argument('--report', type=Path, help='Write an ignored local report; stdout always contains the summary.')
    args = parser.parse_args()
    sdk = args.sdk or Path(os.environ.get('ANDROID_SDK_ROOT') or os.environ.get('ANDROID_HOME')
                           or str(Path(os.environ.get('LOCALAPPDATA', '')) / 'Android/Sdk'))
    result = inspect(args.apk.resolve(), (args.metadata or args.apk.with_suffix('.json')).resolve(), sdk.resolve())
    contents = json.dumps(result, ensure_ascii=True, indent=2) + '\n'
    if args.report:
        # Avoid overwriting any source file: generated evidence stays under ignored artifacts/.
        root = Path(__file__).resolve().parent.parent / 'artifacts'
        destination = args.report.resolve()
        if not destination.is_relative_to(root.resolve()) or destination.suffix != '.json':
            raise ValueError('Report must be a JSON file inside this workspace artifacts directory.')
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(contents, encoding='utf-8')
    print(contents, end='')


if __name__ == '__main__':
    main()
