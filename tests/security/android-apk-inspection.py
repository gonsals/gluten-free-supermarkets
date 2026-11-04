"""Exercise APK inspection against tiny synthetic archives; no SDK binary or device is run."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('apk_inspector', root / 'scripts/inspect-android-apk.py')
inspector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inspector)


class InspectionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='cal02-apk-')
        self.addCleanup(self.temporary.cleanup)
        folder = Path(self.temporary.name)
        self.apk = folder / 'preview.apk'
        self.meta = folder / 'preview.json'
        self.sdk = folder / 'sdk'
        tool = self.sdk / 'build-tools/37.0.0' / ('aapt2.exe' if os.name == 'nt' else 'aapt2')
        tool.parent.mkdir(parents=True)
        tool.touch()
        self.archive()
        self.badging = ("package: name='com.tumarre.singluten' versionCode='1'\n"
                        "uses-permission: name='android.permission.CAMERA'\n")
        self.manifest = 'A: android:allowBackup(0x01010280)=false\n'

    def archive(self, extra=None, bundle=True):
        with zipfile.ZipFile(self.apk, 'w') as value:
            if bundle:
                value.writestr('assets/index.android.bundle', b'synthetic fixture ' * 100)
            for abi in ['arm64-v8a', 'x86_64']:
                value.writestr(f'lib/{abi}/libfixture.so', b'synthetic fixture')
            for name, contents in (extra or {}).items():
                value.writestr(name, contents)
        self.metadata = dict(sha256=hashlib.sha256(self.apk.read_bytes()).hexdigest(), variant='preview',
                             requiresMetro=False, cloudEnabled=False, signing='development-key-not-for-stores',
                             architectures=['arm64-v8a', 'x86_64'])
        self.write_meta()

    def write_meta(self):
        self.meta.write_text(json.dumps(self.metadata), encoding='utf-8')

    def run_inspection(self):
        with patch.object(inspector.subprocess, 'check_output', side_effect=[self.badging, self.manifest]):
            return inspector.inspect(self.apk, self.meta, self.sdk)

    def test_valid_preview_has_bundle_two_abis_and_no_credentials(self):
        report = self.run_inspection()
        self.assertEqual(report['architectures'], ['arm64-v8a', 'x86_64'])
        self.assertGreater(report['embeddedBundleBytes'], 1000)
        self.assertEqual(report['googleApiKeyPatternMatches'], 0)
        self.assertFalse(report['androidPlatformBackup'])

    def test_cloud_debug_or_metro_metadata_is_rejected_before_sdk(self):
        for key, value in [('cloudEnabled', True), ('requiresMetro', True), ('variant', 'debug')]:
            with self.subTest(key=key):
                original = self.metadata.copy()
                self.metadata[key] = value
                self.write_meta()
                with patch.object(inspector.subprocess, 'check_output') as sdk_call:
                    with self.assertRaisesRegex(ValueError, 'metadata'):
                        inspector.inspect(self.apk, self.meta, self.sdk)
                    sdk_call.assert_not_called()
                self.metadata = original

    def test_changed_apk_does_not_match_saved_checksum(self):
        self.apk.write_bytes(self.apk.read_bytes() + b'modified')
        with self.assertRaisesRegex(ValueError, 'metadata'):
            self.run_inspection()

    def test_microphone_storage_and_overlay_are_each_rejected(self):
        baseline = self.badging
        for permission in ['RECORD_AUDIO', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'MANAGE_EXTERNAL_STORAGE', 'SYSTEM_ALERT_WINDOW']:
            with self.subTest(permission=permission):
                self.badging = baseline + f"uses-permission: name='android.permission.{permission}'\n"
                with self.assertRaisesRegex(ValueError, 'permission contract'):
                    self.run_inspection()

    def test_missing_camera_and_wrong_package_are_rejected(self):
        self.badging = "package: name='com.tumarre.singluten'\n"
        with self.assertRaisesRegex(ValueError, 'permission contract'):
            self.run_inspection()
        self.badging = "package: name='other.app'\n"
        with self.assertRaisesRegex(ValueError, 'package'):
            self.run_inspection()

    def test_platform_backup_cannot_be_enabled_or_unspecified(self):
        for manifest in ['A: android:allowBackup(0x01010280)=true', 'no backup attribute']:
            with self.subTest(manifest=manifest):
                self.manifest = manifest
                with self.assertRaisesRegex(ValueError, 'backup'):
                    self.run_inspection()

    def test_environment_files_are_rejected(self):
        self.archive({'assets/.env.local': b'synthetic fixture'})
        with self.assertRaisesRegex(ValueError, 'Environment file'):
            self.run_inspection()

    def test_api_key_pattern_is_rejected_without_disclosing_value(self):
        fixture_key = 'AIza' + 'a' * 35
        self.archive({'assets/fixture.txt': fixture_key.encode()})
        with self.assertRaises(ValueError) as error:
            self.run_inspection()
        self.assertNotIn(fixture_key, str(error.exception))

    def test_missing_embedded_bundle_is_rejected(self):
        self.archive(bundle=False)
        with self.assertRaises(KeyError):
            self.run_inspection()

    def test_abi_metadata_must_match_archive(self):
        self.metadata['architectures'] = ['arm64-v8a']
        self.write_meta()
        with self.assertRaisesRegex(ValueError, 'architecture'):
            self.run_inspection()


if __name__ == '__main__':
    unittest.main()
