"""Generate PTYrig's stacked-terminal SVGs and PNG using the standard library."""
import math
from pathlib import Path
import struct
import zlib

root = Path(__file__).resolve().parent.parent
size, scale = 256, 3
black, clear = (0, 0, 0, 255), (0, 0, 0, 0)
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><mask id="rear"><rect width="256" height="256" fill="#fff"/><rect x="30" y="69" width="181" height="152" rx="25" fill="#000"/></mask></defs><rect x="67" y="34" width="159" height="139" rx="20" fill="none" stroke="#000" stroke-width="13" mask="url(#rear)"/><rect x="37" y="76" width="167" height="138" rx="18" fill="none" stroke="#000" stroke-width="14"/><path d="m65 115 26 25-26 25m48 0h43" fill="none" stroke="#000" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg>\n'
(root / 'icons/ptyrig.svg').write_text(svg)
small = svg.replace('viewBox=', 'width="16" height="16" viewBox=')
(root / 'icons/ptyrig-light.svg').write_text(small)
(root / 'icons/ptyrig-dark.svg').write_text(small.replace('stroke="#000"', 'stroke="#fff"'))


def rounded(x, y, left, top, right, bottom, radius):
    cx = max(left + radius, min(x, right - radius))
    cy = max(top + radius, min(y, bottom - radius))
    return math.hypot(x - cx, y - cy) <= radius


def frame(x, y, left, top, right, bottom, radius, width):
    half = width / 2
    return rounded(x, y, left-half, top-half, right+half, bottom+half, radius+half) and not rounded(x, y, left+half, top+half, right-half, bottom-half, radius-half)


def stroke(x, y, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = max(0, min(1, ((x-a[0])*dx + (y-a[1])*dy) / (dx*dx + dy*dy)))
    return math.hypot(x-a[0]-t*dx, y-a[1]-t*dy) <= 6.5


def pixel(x, y):
    if rounded(x, y, 30, 69, 211, 221, 25):
        prompt = any(stroke(x, y, a, b) for a, b in [((65,115),(91,140)), ((91,140),(65,165)), ((113,165),(156,165))])
        return black if frame(x, y, 37, 76, 204, 214, 18, 14) or prompt else clear
    return black if frame(x, y, 67, 34, 226, 173, 20, 13) else clear


raw = bytearray()
for y in range(size):
    raw.append(0)
    for x in range(size):
        samples = [pixel(x+(sx+.5)/scale, y+(sy+.5)/scale) for sy in range(scale) for sx in range(scale)]
        alpha = sum(c[3] for c in samples)
        raw.extend([round(sum(c[k]*c[3] for c in samples)/alpha) if alpha else 0 for k in range(3)] + [round(alpha/(scale*scale))])


def chunk(name, data):
    return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name + data))


output = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
(root / 'icons/ptyrig.png').write_bytes(output)
