"""Empaca los 65 cuadros de cada gatita en un atlas WebP + índice de rectángulos.
Uso: python3 atlas.py carpeta_cuadros nombre carpeta_public carpeta_datos"""
import json, sys
from PIL import Image

carpeta, nombre, publico, datos = sys.argv[1:5]
cuadros = [Image.open(f"{carpeta}/{i:02d}.png").convert("RGBA") for i in range(65)]
ANCHO, PAD = 1024, 2
x = y = fila = 0
rects = []
for c in cuadros:
    if x + c.width + PAD > ANCHO:
        x, y, fila = 0, y + fila + PAD, 0
    rects.append([x, y, c.width, c.height])
    x += c.width + PAD
    fila = max(fila, c.height)
alto = y + fila
atlas = Image.new("RGBA", (ANCHO, alto), (0, 0, 0, 0))
for c, (cx, cy, _, _) in zip(cuadros, rects):
    atlas.paste(c, (cx, cy))
atlas.save(f"{publico}/{nombre}.webp", "WEBP", quality=84, method=6)
json.dump({"ancho": ANCHO, "alto": alto, "cuadros": rects}, open(f"{datos}/{nombre}.json", "w"), separators=(",", ":"))
print(nombre, ANCHO, alto)
