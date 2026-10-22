"""Recorta una hoja RGBA por renglones y columnas vacías (orden de lectura).
Uso: python3 recortar_rejilla.py hoja_rgba.png carpeta_salida"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw

src, salida = sys.argv[1], sys.argv[2]
os.makedirs(salida, exist_ok=True)
im = np.array(Image.open(src).convert("RGBA"))
op = im[..., 3] >= 60

def tramos(perfil, minimo_hueco, minimo_tramo):
    lleno = perfil > 0
    out, ini, hueco = [], None, 0
    for i, v in enumerate(lleno):
        if v:
            if ini is None: ini = i
            hueco = 0
        elif ini is not None:
            hueco += 1
            if hueco >= minimo_hueco:
                if i - hueco - ini + 1 >= minimo_tramo: out.append((ini, i - hueco + 1))
                ini, hueco = None, 0
    if ini is not None: out.append((ini, len(lleno)))
    return out

info, k = [], 0
renglones = tramos((op.sum(1) > 2).astype(int), 3, 20)
por_renglon = []
for (y0, y1) in renglones:
    cols = tramos((op[y0:y1].sum(0) > 1).astype(int), 4, 15)
    por_renglon.append(len(cols))
    for (x0, x1) in cols:
        celda = Image.fromarray(im[y0:y1, x0:x1])
        bb = Image.fromarray((op[y0:y1, x0:x1] * 255).astype(np.uint8)).getbbox()
        celda = celda.crop(bb)
        celda.save(f"{salida}/{k:02d}.png")
        info.append({"i": k, "x": int(x0), "y": int(y0), "w": celda.width, "h": celda.height})
        k += 1
json.dump(info, open(f"{salida}/indice.json", "w"))

cols, cel = 8, 150
hoja = Image.new("RGBA", (cols * cel, ((k + cols - 1) // cols) * cel), (18, 18, 18, 255))
d = ImageDraw.Draw(hoja)
for n in range(k):
    sp = Image.open(f"{salida}/{n:02d}.png"); sp.thumbnail((cel - 20, cel - 24))
    hoja.alpha_composite(sp, ((n % cols) * cel + (cel - sp.width) // 2, (n // cols) * cel + (cel - 20 - sp.height) // 2 + 4))
    d.text(((n % cols) * cel + 4, (n // cols) * cel + cel - 16), str(n), fill=(200, 200, 200, 255))
hoja.save(f"{salida}/../hoja.png")
print(k, por_renglon)
