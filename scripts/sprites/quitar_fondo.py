"""Quita el fondo negro de una hoja de sprites (RGB) y la deja en RGBA con bordes suaves.
Uso: python3 quitar_fondo.py entrada.png salida.png
Solo se vuelve transparente el negro conectado al borde de la imagen: las rayas oscuras
dentro de cada gatita se conservan."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, dst = sys.argv[1], sys.argv[2]
rgb = np.array(Image.open(src).convert("RGB")).astype(np.float32)
brillo = rgb.max(axis=2)

UMBRAL = 16
candidato = brillo <= UMBRAL
lab, _ = ndimage.label(candidato)
borde = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
fondo = np.isin(lab, borde[borde > 0])
# huequitos negros aislados grandes (entre patas, bajo la cola) también son fondo
for i, sl in enumerate(ndimage.find_objects(lab)):
    if sl is None or (i + 1) in borde: continue
    region = lab[sl] == i + 1
    if region.sum() >= 60 and brillo[sl][region].mean() < 8:
        fondo[sl] |= region

# banda de borde: la imagen viene "pintada sobre negro" → alfa según el brillo y se des-multiplica el color
cerca = ndimage.binary_dilation(fondo, iterations=2) & ~fondo
alfa = np.ones(brillo.shape, np.float32)
alfa[fondo] = 0
alfa[cerca] = np.clip((brillo[cerca] - UMBRAL * 0.5) / 70.0, 0, 1)
color = rgb.copy()
m = cerca & (alfa > 0.05)
color[m] = np.clip(rgb[m] / alfa[m, None], 0, 255)
# suaviza un poquito el alfa del contorno
alfa = np.where(fondo | cerca, ndimage.uniform_filter(alfa, 2), alfa)
alfa[fondo & ~ndimage.binary_dilation(~fondo, iterations=1)] = 0

out = np.dstack([color, alfa * 255]).clip(0, 255).astype(np.uint8)
Image.fromarray(out, "RGBA").save(dst)
print(f"fondo {fondo.mean():.1%}")
