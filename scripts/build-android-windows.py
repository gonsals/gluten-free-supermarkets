"""Build a local Android APK using a temporary short drive, without system changes."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

if sys.platform != 'win32':
    raise SystemExit('This helper is for Windows. Use Gradle directly on other systems.')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--architecture', choices=['arm64-v8a', 'x86_64', 'universal'], default='arm64-v8a')
parser.add_argument('--variant', choices=['debug', 'preview'], default='debug',
                    help='Preview embeds JavaScript and uses the development signing key; not for stores.')
arguments = parser.parse_args()
build_architectures = 'arm64-v8a,x86_64' if arguments.architecture == 'universal' else arguments.architecture
root = Path(__file__).resolve().parent.parent
android = root / 'android'
if android.is_symlink() or (android.exists() and android.resolve().parent != root):
    raise SystemExit('The generated Android directory must remain inside the workspace.')
environment = os.environ.copy()
if arguments.variant == 'preview':
    # A local preview must remain usable without deployed account-management functions.
    environment.update(NODE_ENV='production', EXPO_PUBLIC_APP_ENV='beta',
                       EXPO_PUBLIC_CLOUD_ENABLED='false', EXPO_PUBLIC_USE_EMULATORS='false')
for variable, helper in [('JAVA_HOME', 'prepare-java.py'), ('SINGLUTEN_NINJA', 'prepare-ninja.py')]:
    environment[variable] = subprocess.check_output([sys.executable, str(root / 'scripts' / helper)], text=True).strip()
environment['PATH'] = str(Path(environment['JAVA_HOME']) / 'bin') + os.pathsep + environment['PATH']
node = shutil.which('node')
if not node:
    raise SystemExit('Install the Node version from .nvmrc first.')
drive = next((letter + ':' for letter in 'RSTUVWXYZ' if not Path(letter + ':\\').exists()), None)
if not drive:
    raise SystemExit('A free drive letter between R: and Z: is required for the temporary build mapping.')
staging = Path(tempfile.gettempdir()) / 'sg-cxx'
staging.mkdir(exist_ok=True)
subprocess.run(['subst', drive, str(staging)], check=True)
try:
    environment['SINGLUTEN_CXX_ROOT'] = drive + '\\'
    subprocess.run([node, str(root / 'node_modules' / 'expo' / 'bin' / 'cli'), 'prebuild', '--platform', 'android', '--no-install'], cwd=root, env=environment, check=True)
    build_type = 'release' if arguments.variant == 'preview' else 'debug'
    subprocess.run([str(android / 'gradlew.bat'), 'assemble' + build_type.title(), '--no-daemon', '--max-workers=2', '-PreactNativeArchitectures=' + build_architectures], cwd=android, env=environment, check=True)
    source = android / 'app' / 'build' / 'outputs' / 'apk' / build_type / ('app-' + build_type + '.apk')
    artifacts = root / 'artifacts'
    artifacts.mkdir(exist_ok=True)
    destination = artifacts / ('singluten-' + arguments.variant + '-' + arguments.architecture + '.apk')
    shutil.copy2(source, destination)
    destination.with_suffix('.json').write_text(json.dumps({
        'file': destination.name,
        'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
        'architectures': build_architectures.split(','),
        'variant': arguments.variant,
        'requiresMetro': arguments.variant == 'debug',
        'signing': 'development-key-not-for-stores',
        'cloudEnabled': False if arguments.variant == 'preview' else 'environment-dependent',
    }, indent=2) + '\n', encoding='utf-8')
    print(destination)
finally:
    subprocess.run(['subst', drive, '/d'], check=True)
