"""Build the listing PNG from the canonical PTYrig SVG.

Requires rsvg-convert (librsvg) for antialiased PNG rendering.
"""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent.parent
subprocess.run([
    'rsvg-convert', '--width', '512', '--height', '512',
    str(root / 'icons/ptyrig.svg'), '--output', str(root / 'icons/ptyrig.png')
], check=True)
