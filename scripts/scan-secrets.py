"""Scan publishable files and Git history with a pinned, verified Gitleaks binary."""
from pathlib import Path
import hashlib
import io
import json
import os
import platform
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent.parent
VERSION = '8.30.1'
PACKAGES = {
    ('Windows', 'amd64'): ('windows_x64.zip', 'd29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e'),
    ('Linux', 'x86_64'): ('linux_x64.tar.gz', '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb'),
}


def scanner():
    target = PACKAGES.get((platform.system(), platform.machine().lower()))
    if not target:
        raise SystemExit('Use Windows x64 or Linux x64 for this verified scanner.')
    suffix, checksum = target
    cache = Path(tempfile.gettempdir()) / 'sin-gluten-tools' / ('gitleaks-' + VERSION)
    cache.mkdir(parents=True, exist_ok=True)
    name = 'gitleaks_' + VERSION + '_' + suffix
    archive = cache / name
    if not archive.exists():
        url = 'https://github.com/gitleaks/gitleaks/releases/download/v' + VERSION + '/' + name
        request = urllib.request.Request(url, headers={'User-Agent': 'SinGluten-security-check'})
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read()
        if hashlib.sha256(data).hexdigest() != checksum:
            raise SystemExit('Gitleaks download checksum mismatch.')
        archive.write_bytes(data)
    data = archive.read_bytes()
    if hashlib.sha256(data).hexdigest() != checksum:
        raise SystemExit('Cached Gitleaks archive checksum mismatch.')
    executable = cache / ('gitleaks.exe' if platform.system() == 'Windows' else 'gitleaks')
    if suffix.endswith('.zip'):
        with zipfile.ZipFile(io.BytesIO(data)) as bundle:
            payload = bundle.read('gitleaks.exe')
    else:
        with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as bundle:
            member = bundle.extractfile('gitleaks')
            if member is None:
                raise SystemExit('Gitleaks executable missing from verified archive.')
            payload = member.read()
    # Windows locks a running executable. Reuse it only if it still matches the
    # executable from the checksum-verified archive; do not overwrite it on every run.
    if not executable.exists() or hashlib.sha256(executable.read_bytes()).digest() != hashlib.sha256(payload).digest():
        executable.write_bytes(payload)
    if platform.system() != 'Windows':
        executable.chmod(0o755)
    return executable


def scan(binary, mode, target, report, extra=()):
    result = subprocess.run([
        str(binary), mode, '--redact=100', '--no-banner',
        '--ignore-gitleaks-allow', '--gitleaks-ignore-path', str(ROOT / '.gitleaksignore'),
        '--report-format', 'json', '--report-path', str(report), *extra, str(target),
    ], cwd=ROOT, check=False)
    if result.returncode not in (0, 1):
        raise SystemExit('Gitleaks could not complete the ' + mode + ' scan.')
    findings = json.loads(report.read_text(encoding='utf-8'))
    if result.returncode != 0 and not findings:
        raise SystemExit('Scanner failed without a readable findings report.')
    # Reports and console output are redacted; never print credential values.
    print(mode + ': ' + str(len(findings)) + ' unaccepted findings', flush=True)
    return bool(findings)


def main():
    binary = scanner()
    reports = ROOT / 'artifacts'
    reports.mkdir(exist_ok=True)
    files = subprocess.check_output([
        'git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z',
    ], cwd=ROOT).decode('utf-8').split('\0')
    failed = False
    with tempfile.TemporaryDirectory(prefix='singluten-source-scan-') as folder:
        stage = Path(folder).resolve()
        if stage.parent != Path(tempfile.gettempdir()).resolve():
            raise SystemExit('Unexpected temporary scan directory.')
        for name in set(filter(None, files)):
            source = ROOT / name
            if not source.is_file():
                continue
            if source.is_symlink() or not source.resolve().is_relative_to(ROOT):
                raise SystemExit('Unexpected source symlink or external path: ' + name)
            if source.name.startswith('.env') and source.name != '.env.example':
                raise SystemExit('A real environment file would be published: ' + name)
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        failed |= scan(binary, 'dir', stage, reports / 'gitleaks-current.json')
    failed |= scan(binary, 'git', ROOT, reports / 'gitleaks-history.json', ['--log-opts=--all'])
    if failed:
        raise SystemExit('Credential findings require review before publishing. See redacted reports in artifacts/.')
    print('Publishable files and history passed; only the exact revoked historical finding is accepted.')


if __name__ == '__main__':
    main()
