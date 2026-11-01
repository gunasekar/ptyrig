"""Verify a local VSIX against this checkout before testing or publishing it."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import xml.etree.ElementTree as ET
import zipfile


def verify(artifact, target):
    root = Path(__file__).resolve().parent.parent
    manifest = json.loads((root / 'package.json').read_text())
    with zipfile.ZipFile(artifact) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate ZIP entries')
        for name in names:
            if name.startswith('/') or '..' in Path(name).parts or '\\' in name:
                raise ValueError('Unsafe ZIP path: ' + name)
            if name.startswith('extension/'):
                relative = name.removeprefix('extension/')
                if relative.startswith(('.git/', '.github/', '.vscode-test/', 'test/', 'dist/')) or relative.endswith(('.vsix', '.sha256', '.sbom.json')):
                    raise ValueError('Development/build artifact bundled: ' + relative)
                if '/@vscode/' in name or relative.endswith('.test.js'):
                    raise ValueError('Development dependency/test bundled: ' + relative)
                if '/prebuilds/' in name and '/prebuilds/' + target + '/' not in name:
                    raise ValueError('Other platform prebuild bundled: ' + name)
        packaged = json.loads(archive.read('extension/package.json'))
        if packaged != manifest:
            raise ValueError('Packaged manifest differs from checkout')
        identity = ET.fromstring(archive.read('extension.vsixmanifest')).find('.//{*}Identity')
        if identity is None or identity.attrib.get('Version') != manifest['version'] or identity.attrib.get('TargetPlatform') != target:
            raise ValueError('Incorrect VSIX identity/version/platform')
        if manifest.get('publisher') and identity.attrib.get('Publisher') != manifest['publisher']:
            raise ValueError('Incorrect VSIX publisher')
        for folder in ['src', 'web', 'icons', 'docs']:
            for source in (root / folder).rglob('*'):
                if source.is_file():
                    relative = source.relative_to(root).as_posix()
                    if archive.read('extension/' + relative) != source.read_bytes():
                        raise ValueError('Packaged bytes differ: ' + relative)
        for source, bundled in [('README.md', 'readme.md'), ('CHANGELOG.md', 'changelog.md'), ('SECURITY.md', 'SECURITY.md'), ('LICENSE', 'LICENSE.txt')]:
            # vsce may rewrite README URLs; keep current README links absolute.
            if archive.read('extension/' + bundled) != (root / source).read_bytes():
                raise ValueError('Packaged document differs: ' + source)
        binaries = [name for name in names if name.endswith('/pty.node')]
        if not binaries:
            raise ValueError('Missing native PTY binary')
        for name in binaries:
            data = archive.read(name)
            if target.startswith('darwin-'):
                expected = {'arm64': 0x100000c, 'x64': 0x1000007}[target.split('-')[-1]]
                if struct.unpack('<II', data[:8]) != (0xfeedfacf, expected):
                    raise ValueError('Incorrect Mach-O PTY architecture')
            elif target.startswith('linux-'):
                expected = {'arm64': 183, 'x64': 62}[target.split('-')[-1]]
                if data[:4] != b'\x7fELF' or data[4:6] != b'\x02\x01' or struct.unpack('<H', data[18:20])[0] != expected:
                    raise ValueError('Incorrect ELF PTY architecture')
        if target.startswith('darwin-'):
            helper = next((entry for entry in archive.infolist() if entry.filename.endswith('/spawn-helper')), None)
            if helper is None or not (helper.external_attr >> 16) & 0o111:
                raise ValueError('Missing executable PTY spawn helper')
    checksum = Path(str(artifact) + '.sha256').read_text().split()[0]
    if hashlib.sha256(artifact.read_bytes()).hexdigest() != checksum:
        raise ValueError('Artifact checksum mismatch')
    inventory = json.loads(artifact.with_suffix('.sbom.json').read_text())
    if inventory.get('bomFormat') != 'CycloneDX':
        raise ValueError('Missing CycloneDX dependency inventory')
    components = {(component.get('group', '') + '/' if component.get('group') else '') + component['name']: component['version'] for component in inventory.get('components', [])}
    for name, version in manifest['dependencies'].items():
        if components.get(name) != version:
            raise ValueError('Inventory is missing runtime dependency: ' + name)
    print('PASS: packaged source, documents, identity, native architecture, exclusions, checksum and runtime inventory')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('artifact', type=Path)
    parser.add_argument('--target', required=True)
    args = parser.parse_args()
    verify(args.artifact, args.target)
