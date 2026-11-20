#!/usr/bin/env python3
"""Build the editable GKE model's GLB runtime asset and matching static overview."""
from collections import defaultdict
from math import sqrt
from pathlib import Path
import json
import struct
import zlib

OUTPUT = Path(__file__).resolve().parents[1] / 'public' / 'warehouse'
PALETTE = {
    'ground': 'c4d8e4', 'grass': 'a5c7bc', 'road': '536c80', 'asphalt': '8a9fb0',
    'floor': 'd0e1e9', 'foundation': '9aafba', 'white': 'f1f8fb', 'wall': 'e2edf4',
    'metal': '7c9eb3', 'roof': 'afcddb', 'navy': '153953', 'blue': '228acc',
    'cyan': '57cbe2', 'glazing': '72afd3', 'tire': '243644', 'rubber': '1d2d3d',
    'line': 'fbf8ec', 'amber': 'efad4d', 'pallet': 'a46b3f', 'box': 'bf8c5e',
    'label': 'fff9e9', 'green': '6da59b', 'red': 'd75f58', 'light': 'fcf3be',
}
GROUPS = {}
ORIGINS = {}


def group(name, origin=(0, 0, 0)):
    GROUPS[name] = []
    ORIGINS[name] = origin


def box(name, position, dimensions, material):
    GROUPS[name].append((position, dimensions, material))


def rack(name, x, z):
    for dx in (-1.48, 1.48):
        for dz in (-0.58, 0.58):
            box(name, (x + dx, 1.35, z + dz), (.12, 2.7, .12), 'blue')
    for level in (.18, 1.00, 1.83, 2.61):
        box(name, (x, level, z), (3.1, .12, 1.26), 'metal')
    for level in (.32, 1.13, 1.96):
        for dx in (-.97, 0, .97):
            width = .66 if dx else .83
            box(name, (x + dx, level + .22, z), (width, .43, .65), 'box')
            box(name, (x + dx, level + .22, z + .329), (.24, .10, .015), 'label')


def pallet(name, x, y, z, color='pallet'):
    for dz in (-.43, 0, .43):
        box(name, (x, y + .04, z + dz), (1.24, .08, .13), color)
    for dx in (-.47, 0, .47):
        box(name, (x + dx, y + .13, z), (.14, .08, .98), color)
    for dz in (-.42, -.21, 0, .21, .42):
        box(name, (x, y + .21, z + dz), (1.24, .08, .15), color)


def lane_sign(name, x, label, color):
    glyphs = {'U': ('101', '101', '101', '101', '111'),
              'S': ('111', '100', '111', '001', '111'),
              'K': ('101', '110', '100', '110', '101')}
    z = -2.9
    box(name, (x, 1.32, z), (.10, 1.24, .10), 'navy')
    box(name, (x, 2.02, z), (1.55, .98, .14), color)
    for letter, glyph in enumerate(label):
        for row, bits in enumerate(glyphs[glyph]):
            for column, bit in enumerate(bits):
                if bit == '1':
                    box(name, (x + (4 * letter + column - 3) * .16, 2.34 - row * .16, z + .074),
                        (.157, .157, .014), 'white')


def truck(name, origin, color):
    group(name, origin)
    # Tractors point toward positive X. The app changes their travel direction.
    box(name, (-.25, .88, 0), (6.75, .35, 2.05), 'navy')
    box(name, (-1.15, 2.18, 0), (4.64, 2.35, 2.34), 'white')
    box(name, (-1.15, 2.49, 1.18), (3.72, .25, .025), color)
    box(name, (-1.15, 2.49, -1.18), (3.72, .25, .025), color)
    box(name, (-3.49, 2.18, 0), (.06, 2.30, 2.31), 'metal')
    for z in (-.62, .62):
        box(name, (-3.53, 2.18, z), (.05, 2.06, .04), 'navy')
        box(name, (-3.51, 1.03, 1.48 * z), (.10, .17, .22), 'red')
    box(name, (2.31, 1.84, 0), (1.89, 1.84, 2.15), color)
    box(name, (3.265, 2.11, 0), (.045, .64, 1.86), 'navy')
    box(name, (3.27, 1.25, 0), (.08, .20, 1.38), 'navy')
    for z in (-1.085, 1.085):
        box(name, (2.64, 2.12, z), (.89, .61, .04), 'glazing')
        box(name, (3.29, 1.31, .77 if z > 0 else -.77), (.12, .19, .32), 'light')
        box(name, (3.0, 1.93, z * 1.2), (.10, .24, .13), 'navy')
    box(name, (3.31, 1.05, 0), (.11, .14, 2.15), 'metal')
    for x in (-2.51, -1.67, 2.45):
        for z in (-1.04, 1.04):
            box(name, (x, .52, z), (.87, .87, .43), 'tire')
            box(name, (x, .52, z * 1.206), (.46, .46, .04), 'metal')


group('warehouse_site')
site = 'warehouse_site'
box(site, (0, -.75, 0), (56, 1.38, 36), 'ground')
box(site, (0, -.04, 11.4), (56, .075, 6.0), 'road')
for x in range(-26, 27, 4):
    box(site, (x, .004, 11.4), (2.4, .014, .11), 'line')
for z in (8.58, 14.22):
    box(site, (0, .006, z), (56, .015, .10), 'line')
box(site, (0, -.07, 4.3), (40, .16, 8.1), 'asphalt')
box(site, (0, .30, -6), (32.4, .61, 16.3), 'foundation')
box(site, (0, .64, -6), (32.1, .10, 16.05), 'floor')
# Open front and a partial roof expose the sorting floor.
box(site, (0, 2.98, -13.83), (32.4, 4.68, .35), 'wall')
for side in (-1, 1):
    box(site, (side * 16, 2.97, -7.30), (.31, 4.65, 13.08), 'wall')
    box(site, (side * 16, 5.35, -6), (.40, .22, 16.18), 'navy')
    for z in (-11.9, -8, -4.1):
        box(site, (side * 16.17, 4.24, z), (.08, .62, 2.78), 'glazing')
        box(site, (side * 16.23, 4.24, z), (.055, .65, .055), 'metal')
for x in range(-15, 16, 5):
    box(site, (x, 2.99, -13.61), (.19, 4.64, .17), 'metal')
for x in (-14, -9, -4, 1, 6, 11, 15):
    box(site, (x, 5.20, -4.1), (.19, .20, 4.9), 'navy')
box(site, (0, 5.19, -2.02), (32.2, .25, .27), 'navy')
box(site, (0, 5.42, -10.45), (32.6, .23, 6.92), 'roof')
box(site, (0, 5.45, -7.02), (32.62, .18, .16), 'navy')
for x in range(-15, 16):
    box(site, (x, 5.55, -10.47), (.055, .055, 6.87), 'metal')
for x in (-9.0, 0, 9.0):
    box(site, (x, 5.60, -10.45), (4.20, .06, 1.31), 'glazing')
    box(site, (x, 5.65, -10.45), (.09, .04, 1.32), 'navy')
    box(site, (x, 5.65, -10.45), (4.21, .04, .08), 'navy')
for x in (-12.0, 10.8):
    box(site, (x, 1.50, 1.96), (4.24, 1.78, .24), 'navy')
    box(site, (x, 2.86, 1.92), (4.36, .33, .52), 'blue')
    for side in (-1, 1):
        box(site, (x + side * 2.02, 1.49, 1.95), (.26, 2.45, .47), 'blue')
        box(site, (x + side * 2.58, .40, 2.58), (.24, .80, .24), 'amber')
    for y in (.89, 1.15, 1.41, 1.67, 1.93, 2.19):
        box(site, (x, y, 2.095), (3.81, .035, .028), 'metal')
    box(site, (x, .34, 2.83), (4.15, .63, 2.0), 'foundation')
    box(site, (x, .69, 2.85), (4.12, .075, 1.91), 'metal')
    for x0 in (x - 2.21, x + 2.21):
        box(site, (x0, .026, 5.05), (.12, .027, 3.9), 'line')
    box(site, (x, .024, 6.96), (4.47, .026, .12), 'line')
for x in (-12, -7.8, 3.9, 8, 12):
    rack(site, x, -6.05)
for x in (-13.0, -9.2, 9.0, 12.5):
    pallet(site, x, .70, .30, 'blue' if x < 0 else 'pallet')
    box(site, (x, 1.12, .30), (.81, .35, .69), 'box')
    box(site, (x, 1.14, .653), (.27, .09, .02), 'label')
# Sorting, conveyor and the two outlined dispatch lanes.
for x in (-5.3, -2.7):
    box(site, (x, 1.03, -2.25), (2.34, .67, 1.44), 'navy')
    box(site, (x, 1.39, -2.25), (2.44, .12, 1.55), 'metal')
    for dx in (-.88, -.53, -.18, .18, .53, .88):
        box(site, (x + dx, 1.47, -2.25), (.14, .07, 1.34), 'white')
box(site, (-3.0, 1.55, -3.20), (.13, .96, .14), 'blue')
box(site, (-3.0, 2.08, -3.00), (.47, .15, .62), 'blue')
for x, label, color in [(7.7, 'US', 'blue'), (11.4, 'UK', 'cyan')]:
    box(site, (x, .696, -1.0), (3.08, .015, 4.0), color)
    box(site, (x, .708, -1.0), (2.74, .012, 3.69), 'floor')
    pallet(site, x, .72, -2.0, color)
    lane_sign(site, x, label, 'blue' if label == 'US' else 'navy')
for x in (-20.5, 19.9):
    box(site, (x, -.05, -5.0), (5.8, .17, 16.7), 'grass')
    for z in (-11.5, -5.7, .3):
        box(site, (x, .68, z), (.30, 1.24, .30), 'pallet')
        box(site, (x, 1.48, z), (1.57, 1.45, 1.55), 'green')
        box(site, (x + .05, 1.96, z + .02), (1.08, .47, 1.01), 'grass')
for x in (-24, 0, 24):
    box(site, (x, 1.6, 16), (.12, 3.18, .12), 'navy')
    box(site, (x, 3.23, 15.73), (.36, .14, .64), 'navy')
    box(site, (x, 3.136, 15.57), (.21, .055, .26), 'light')
box(site, (18.5, 1.3, 8.04), (.13, 2.61, .13), 'navy')
box(site, (18.5, 2.45, 8.04), (2.0, .71, .13), 'blue')
box(site, (18.4, 2.45, 8.125), (.80, .07, .045), 'white')
box(site, (18.76, 2.45, 8.125), (.21, .24, .045), 'white')
box(site, (18.89, 2.45, 8.125), (.13, .14, .045), 'white')
# Parcel and forklift each remain independent editable objects.
group('tracked_parcel', (-12.0, 1.60, 2.7))
parcel = 'tracked_parcel'
pallet(parcel, 0, -.13, 0, 'blue')
box(parcel, (0, .52, 0), (1.0, .85, .80), 'amber')
box(parcel, (0, .95, 0), (.19, .018, .803), 'navy')
box(parcel, (0, .54, .413), (.37, .22, .028), 'label')
box(parcel, (0, .54, .432), (.21, .053, .015), 'navy')
group('forklift', (-10.0, .72, -1.85))
forklift = 'forklift'
box(forklift, (-.25, .49, 0), (1.70, .70, 1.25), 'amber')
box(forklift, (-.32, 1.20, 0), (.48, .32, .58), 'tire')
for x in (-.98, .53):
    for z in (-.60, .60):
        box(forklift, (x, 1.23, z), (.09, 1.70, .09), 'navy')
        box(forklift, (x, .31, z * 1.02), (.46, .47, .32), 'tire')
box(forklift, (-.23, 2.10, 0), (1.68, .13, 1.38), 'amber')
box(forklift, (.83, .85, 0), (.21, 1.49, .92), 'navy')
for z in (-.31, .31):
    box(forklift, (1.21, .24, z), (1.01, .14, .14), 'metal')
truck('receiving_truck', (-16.0, 0, 5.0), 'blue')
truck('outbound_truck', (10.8, 0, 5.2), 'cyan')
group('hotspot_receiving', (-12.0, 3.29, 2.0))
group('hotspot_sorting', (-3.0, 2.71, -2.25))
group('hotspot_staging', (10.8, 2.72, -.25))
group('hotspot_outbound', (17.5, 2.30, 11.4))
for target in ('hotspot_receiving', 'hotspot_sorting', 'hotspot_staging', 'hotspot_outbound'):
    box(target, (0, 0, 0), (.12, .12, .12), 'blue')

FACES = [
    ((1, 0, 0), [(1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1)]),
    ((-1, 0, 0), [(-1, -1, 1), (-1, 1, 1), (-1, 1, -1), (-1, -1, -1)]),
    ((0, 1, 0), [(-1, 1, -1), (-1, 1, 1), (1, 1, 1), (1, 1, -1)]),
    ((0, -1, 0), [(-1, -1, 1), (-1, -1, -1), (1, -1, -1), (1, -1, 1)]),
    ((0, 0, 1), [(1, -1, 1), (1, 1, 1), (-1, 1, 1), (-1, -1, 1)]),
    ((0, 0, -1), [(-1, -1, -1), (-1, 1, -1), (1, 1, -1), (1, -1, -1)]),
]
TRIANGLES = (0, 1, 2, 0, 2, 3)


def linear(color):
    return (color / 12.92) if color <= .04045 else ((color + .055) / 1.055) ** 2.4


def rgb(hex_code):
    return tuple(int(hex_code[i:i + 2], 16) for i in (0, 2, 4))


def write_glb():
    gltf = {'asset': {'version': '2.0', 'generator': 'GKE Logistics Warehouse'},
            'scene': 0, 'scenes': [{'name': 'GKE Warehouse', 'nodes': []}],
            'nodes': [], 'meshes': [], 'buffers': [{}], 'bufferViews': [],
            'accessors': [], 'materials': []}
    contents = bytearray()
    indices = {}
    for color, hex_code in PALETTE.items():
        indices[color] = len(gltf['materials'])
        gltf['materials'].append({'name': color, 'pbrMetallicRoughness': {
            'baseColorFactor': [*(linear(v / 255) for v in rgb(hex_code)), 1],
            'metallicFactor': 0, 'roughnessFactor': .86,
        }})

    def accessor(values, vector_type, component_type, dtype, target=34962, bounds=False):
        offset = len(contents)
        rows = values if vector_type == 'SCALAR' else [n for values_row in values for n in values_row]
        contents.extend(struct.pack('<' + dtype * len(rows), *rows))
        item = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(contents) - offset, 'target': target}
        gltf['bufferViews'].append(item)
        while len(contents) % 4:
            contents.append(0)
        meta = {'bufferView': len(gltf['bufferViews']) - 1, 'componentType': component_type,
                'count': len(values), 'type': vector_type}
        if bounds:
            meta['min'] = [min(v) for v in zip(*values)]
            meta['max'] = [max(v) for v in zip(*values)]
        gltf['accessors'].append(meta)
        return len(gltf['accessors']) - 1

    for name, boxes in GROUPS.items():
        gltf['scenes'][0]['nodes'].append(len(gltf['nodes']))
        gltf['nodes'].append({'name': name, 'translation': ORIGINS[name], 'mesh': len(gltf['meshes'])})
        by_color = defaultdict(list)
        for position, dimensions, color in boxes:
            by_color[color].append((position, dimensions))
        primitives = []
        for color, items in by_color.items():
            positions, normals, triangles = [], [], []
            for position, dimensions in items:
                for normal, points in FACES:
                    triangles.extend(len(positions) + i for i in TRIANGLES)
                    positions.extend(tuple(p + d * v / 2 for p, d, v in zip(position, dimensions, point))
                                     for point in points)
                    normals.extend([normal] * 4)
            primitives.append({'attributes': {
                'POSITION': accessor(positions, 'VEC3', 5126, 'f', bounds=True),
                'NORMAL': accessor(normals, 'VEC3', 5126, 'f'),
            }, 'indices': accessor(triangles, 'SCALAR', 5123, 'H', 34963), 'material': indices[color]})
        gltf['meshes'].append({'name': name, 'primitives': primitives})
    gltf['buffers'][0]['byteLength'] = len(contents)
    document = json.dumps(gltf, separators=(',', ':')).encode()
    document += b' ' * ((-len(document)) % 4)
    with (OUTPUT / 'warehouse.glb').open('wb') as stream:
        stream.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(document) + 8 + len(contents)))
        stream.write(struct.pack('<I4s', len(document), b'JSON'))
        stream.write(document)
        stream.write(struct.pack('<I4s', len(contents), b'BIN\x00'))
        stream.write(contents)


def write_overview():
    width, height = 1440, 900
    forward = normalize((36, 30, 38))
    right = normalize((38, 0, -36))
    up = (forward[1] * right[2], forward[2] * right[0] - forward[0] * right[2],
          -forward[1] * right[0])
    focus = (0, 0, -1)
    scale = height / 50
    background = rgb('e6f1f7')
    rgba = bytearray(bytes(background) * (width * height))
    depth = [-1000.0] * (width * height)

    def project(point):
        delta = tuple(p - f for p, f in zip(point, focus))
        return (
            width / 2 + scale * dot(delta, right),
            height / 2 - scale * dot(delta, up),
            dot(delta, forward),
        )

    def fill(points, color):
        x0, y0, z0 = points[0]
        da = tuple(v - a for v, a in zip(points[1], points[0]))
        db = tuple(v - a for v, a in zip(points[2], points[0]))
        area = da[0] * db[1] - da[1] * db[0]
        if abs(area) < .001:
            return
        xmin = max(0, int(min(p[0] for p in points)))
        xmax = min(width, int(max(p[0] for p in points)) + 1)
        ymin = max(0, int(min(p[1] for p in points)))
        ymax = min(height, int(max(p[1] for p in points)) + 1)
        a_dx, b_dx = db[1] / area, -da[1] / area
        dz_dx = a_dx * da[2] + b_dx * db[2]
        color = bytes(color)
        for y in range(ymin, ymax):
            dy = y + .5 - y0
            dx = xmin + .5 - x0
            a = (dx * db[1] - dy * db[0]) / area
            b = (dy * da[0] - dx * da[1]) / area
            z = z0 + a * da[2] + b * db[2]
            index = y * width + xmin
            for _ in range(xmin, xmax):
                if a >= 0 and b >= 0 and a + b <= 1 and z > depth[index]:
                    depth[index] = z
                    rgba[3 * index: 3 * index + 3] = color
                index += 1
                a += a_dx
                b += b_dx
                z += dz_dx

    light = normalize((-1, 3, 2))
    for name, boxes in GROUPS.items():
        for position, dimensions, color in boxes:
            for normal, points in FACES:
                if dot(normal, forward) <= 0:
                    continue
                multiplier = .78 + .22 * max(0, dot(normal, light))
                for triangle in (TRIANGLES[:3], TRIANGLES[3:]):
                    projected = [project(tuple(origin + p + d * v / 2 for origin, p, d, v in
                                               zip(ORIGINS[name], position, dimensions, points[i])))
                                 for i in triangle]
                    fill(projected, tuple(round(value * multiplier) for value in rgb(PALETTE[color])))
    rows = [b'\0' + rgba[row * width * 3:(row + 1) * width * 3] for row in range(height)]
    def chunk(name, value):
        return (struct.pack('>I', len(value)) + name + value
                + struct.pack('>I', zlib.crc32(name + value)))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>2I5B', width, height, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b'')
    (OUTPUT / 'overview.png').write_bytes(png)


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def normalize(vector):
    length = sqrt(dot(vector, vector))
    return tuple(v / length for v in vector)


if __name__ == '__main__':
    OUTPUT.mkdir(parents=True, exist_ok=True)
    write_glb()
    write_overview()
