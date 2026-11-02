"""Build the status bar glyph from icons/ptyrig.svg.

Requires fonttools and skia-pathops (build tools only).
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import pathops
from fontTools.svgLib.path import parse_path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.cu2quPen import Cu2QuPen

root = Path(__file__).resolve().parent.parent
svg = ET.parse(root / 'icons/ptyrig.svg').getroot()

def rectangle(element):
    x, y, w, h = [float(element.get(key, 0)) for key in ('x', 'y', 'width', 'height')]
    r = float(element.get('rx', 0))
    return f'M{x+r} {y} H{x+w-r} A{r} {r} 0 0 1 {x+w} {y+r} V{y+h-r} A{r} {r} 0 0 1 {x+w-r} {y+h} H{x+r} A{r} {r} 0 0 1 {x} {y+h-r} V{y+r} A{r} {r} 0 0 1 {x+r} {y} Z'

combined = pathops.Path()
for element in svg:
    tag = element.tag.split('}')[-1]
    if tag not in ('rect', 'path'):
        continue
    outline = pathops.Path()
    parse_path(rectangle(element) if tag == 'rect' else element.get('d'), outline.getPen())
    outline.stroke(float(element.get('stroke-width')), pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    outline.convertConicsToQuads()
    outline.simplify()
    combined = pathops.op(combined, outline, pathops.PathOp.UNION)

pen = TTGlyphPen(None)
combined.draw(Cu2QuPen(TransformPen(pen, (1, 0, 0, -1, 0, 256)), 0.25, reverse_direction=True))
glyph = pen.glyph()
glyph.recalcBounds(None)
font = FontBuilder(256, isTTF=True)
font.setupGlyphOrder(['.notdef', 'ptyrig'])
font.setupCharacterMap({0xE001: 'ptyrig'})
font.setupGlyf({'.notdef': TTGlyphPen(None).glyph(), 'ptyrig': glyph})
font.setupHorizontalMetrics({'.notdef': (256, 0), 'ptyrig': (256, glyph.xMin)})
font.setupHorizontalHeader(ascent=256, descent=0)
font.setupNameTable({'familyName': 'PTYrig Icons', 'styleName': 'Regular', 'uniqueFontIdentifier': 'ptyrig-icons', 'fullName': 'PTYrig Icons', 'psName': 'PTYrigIcons'})
font.setupOS2(sTypoAscender=256, sTypoDescender=0, usWinAscent=256, usWinDescent=0)
font.setupPost()
# Fixed OpenType epoch timestamps keep generated glyph assets reproducible.
font.setupHead(unitsPerEm=256, created=3876422400, modified=3876422400)
font.font.recalcTimestamp = False
font.font.flavor = 'woff'
font.save(root / 'icons/ptyrig.woff')
