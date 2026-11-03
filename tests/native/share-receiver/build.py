"""Build a disposable local share receiver; never install or publish it."""
from pathlib import Path
import os
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[3]
out = root / 'artifacts/native-share-receiver'
out.mkdir(parents=True, exist_ok=True)
sdk = Path(os.environ.get('ANDROID_SDK_ROOT') or os.environ.get('ANDROID_HOME')
           or str(Path(os.environ.get('LOCALAPPDATA', '')) / 'Android/Sdk'))
java = Path(subprocess.check_output([sys.executable, str(root / 'scripts/prepare-java.py')], text=True).strip())
env = {**os.environ, 'JAVA_HOME': str(java), 'PATH': str(java / 'bin') + os.pathsep + os.environ['PATH']}
tools = sdk / 'build-tools/37.0.0'
android = sdk / 'platforms/android-35/android.jar'
if not android.is_file():
    raise SystemExit('Android API 35 platform and build-tools 37.0.0 are required.')
def run(*args):
    subprocess.run([str(arg) for arg in args], check=True, env=env, timeout=120)
exe = '.exe' if os.name == 'nt' else ''
bat = '.bat' if os.name == 'nt' else ''
classes, dex = out / 'classes', out / 'dex'
classes.mkdir(exist_ok=True)
dex.mkdir(exist_ok=True)
source = Path(__file__).resolve().parent
run(java / ('bin/javac' + exe), '-encoding', 'UTF-8', '--release', '17', '-classpath', android,
    '-d', classes, source / 'BackupReceiver.java')
run(tools / ('d8' + bat), '--lib', android, '--min-api', '35', '--output', dex,
    classes / 'com/tumarre/singluten/testreceiver/BackupReceiver.class')
unsigned, aligned = out / 'unsigned.apk', out / 'aligned.apk'
run(tools / ('aapt2' + exe), 'link', '-I', android, '--manifest', source / 'AndroidManifest.xml',
    '--min-sdk-version', '35', '--target-sdk-version', '35', '-o', unsigned)
with zipfile.ZipFile(unsigned, 'a') as apk:
    apk.write(dex / 'classes.dex', 'classes.dex')
run(tools / ('zipalign' + exe), '-f', '4', unsigned, aligned)
# Public development template key, never release credentials. Generated Android folder is ignored.
key = root / 'android/app/debug.keystore'
if not key.is_file():
    raise SystemExit('Generate Android with Expo first; development template key is required.')
destination = out / 'local-backup-probe.apk'
run(tools / ('apksigner' + bat), 'sign', '--ks', key, '--ks-key-alias', 'androiddebugkey',
    '--ks-pass', 'pass:android', '--key-pass', 'pass:android', '--out', destination, aligned)
print(destination)
