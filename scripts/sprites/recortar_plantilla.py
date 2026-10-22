"""Recorta una hoja RGBA usando las cajas de otra gatita como plantilla (mismo acomodo de 65 cuadros).
Cada píxel se asigna a la caja más cercana, así los cuadros que se tocan no se mezclan.
Uso: python3 recortar_plantilla.py hoja_rgba.png indice_plantilla.json ancho_plantilla carpeta_salida"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

src, plantilla, ancho_plantilla, salida = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
os.makedirs(salida, exist_ok=True)
im = np.array(Image.open(src).convert("RGBA"))
H, W = im.shape[:2]
k = W / ancho_plantilla
cajas = [(b["x"] * k, b["y"] * k, (b["x"] + b["w"]) * k, (b["y"] + b["h"]) * k) for b in json.load(open(plantilla))]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
dist = np.stack([np.hypot(np.maximum(0, np.maximum(x0 - xx, xx - x1)), np.maximum(0, np.maximum(y0 - yy, yy - y1))) for x0, y0, x1, y1 in cajas])
dueno = dist.argmin(0)
cerca = dist.min(0) <= 8
escala = 1 / k  # mismo tamaño que los cuadros de la plantilla
info = []
for n, (x0, y0, x1, y1) in enumerate(cajas):
    mia = (dueno == n) & cerca
    rgba = im.copy()
    rgba[..., 3] = np.where(mia, rgba[..., 3], 0)
    # solo las piezas grandes: fuera rayitas de los cuadros vecinos
    lab, nlab = ndimage.label(ndimage.binary_dilation(rgba[..., 3] >= 40, iterations=1))
    if nlab > 1:
        tam = ndimage.sum(np.ones_like(lab), lab, range(1, nlab + 1))
        quedan = [i + 1 for i, t in enumerate(tam) if t >= 0.15 * tam.max()]
        rgba[..., 3] = np.where(np.isin(lab, quedan), rgba[..., 3], 0)
    sp = Image.fromarray(rgba)
    bb = Image.fromarray(((rgba[..., 3] >= 40) * 255).astype(np.uint8)).getbbox()
    sp = sp.crop(bb)
    sp = sp.resize((round(sp.width * escala), round(sp.height * escala)), Image.LANCZOS)
    sp.save(f"{salida}/{n:02d}.png")
    info.append({"i": n, "x": int(bb[0] * escala), "y": int(bb[1] * escala), "w": sp.width, "h": sp.height})
json.dump(info, open(f"{salida}/indice.json", "w"))

cols, cel = 8, 150
hoja = Image.new("RGBA", (cols * cel, ((len(cajas) + cols - 1) // cols) * cel), (18, 18, 18, 255))
d = ImageDraw.Draw(hoja)
for n in range(len(cajas)):
    sp = Image.open(f"{salida}/{n:02d}.png"); sp.thumbnail((cel - 20, cel - 24))
    hoja.alpha_composite(sp, ((n % cols) * cel + (cel - sp.width) // 2, (n // cols) * cel + (cel - 20 - sp.height) // 2 + 4))
    d.text(((n % cols) * cel + 4, (n // cols) * cel + cel - 16), str(n), fill=(200, 200, 200, 255))
hoja.save(f"{salida}/../hoja.png")
print(len(cajas))
