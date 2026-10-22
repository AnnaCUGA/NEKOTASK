"""Logo de NekoTask: Blanquita saludando sobre degradado violeta → rosa.
Uso: python3 logo.py cuadro_blanquita_saludo.png carpeta_iconos"""
import sys
from PIL import Image, ImageDraw, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
gata = Image.open(src).convert("RGBA")

def degradado(lado):
    im = Image.new("RGBA", (lado, lado)); d = ImageDraw.Draw(im)
    a, b = (139, 92, 246), (244, 114, 182)
    for y in range(lado):
        t = y / (lado - 1)
        d.line([(0, y), (lado, y)], fill=tuple(int(a[k] * (1 - t) + b[k] * t) for k in range(3)) + (255,))
    return im

def con_gata(lado, alto_rel, abajo_rel, sombra=True):
    im = degradado(lado)
    alto = round(lado * alto_rel)
    k = alto / gata.height
    g = gata.resize((round(gata.width * k), alto), Image.LANCZOS)
    x, y = (lado - g.width) // 2, lado - round(lado * abajo_rel) - alto
    if sombra:
        ImageDraw.Draw(im).ellipse([lado * .27, y + alto - lado * .03, lado * .73, y + alto + lado * .035], fill=(90, 30, 120, 70))
    brillo = g.split()[3].filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(max(1, lado / 170)))
    halo = Image.new("RGBA", g.size, (255, 255, 255, 0)); halo.putalpha(brillo.point(lambda v: int(v * .55)))
    im.alpha_composite(halo, (x, y)); im.alpha_composite(g, (x, y))
    return im

def redondear(im, radio):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radio, fill=255)
    o = Image.new("RGBA", im.size, (0, 0, 0, 0)); o.paste(im, (0, 0), m); return o

for lado in (192, 512):
    redondear(con_gata(lado, .70, .12), round(lado * .22)).save(f"{dst}/icono-{lado}.png")
# Android recorta el ícono adaptable con su propia forma: fondo completo y gata dentro de la zona segura
con_gata(512, .56, .17).convert("RGB").save(f"{dst}/icono-maskable-512.png")
# iPhone: cuadrado sin transparencia (iOS redondea solo)
con_gata(180, .70, .12).convert("RGB").save(f"{dst}/apple-touch-icon.png")
# atajo de Blanquita
redondear(con_gata(96, .74, .1), 22).save(f"{dst}/atajo-blanquita.png")
# insignia de notificaciones (Android la pinta de un solo color): silueta blanca
k = 80 / gata.height
sil = gata.resize((round(gata.width * k), 80), Image.LANCZOS).split()[3].point(lambda v: 255 if v > 100 else 0)
ins = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
blanco = Image.new("RGBA", sil.size, (255, 255, 255, 255)); blanco.putalpha(sil)
ins.alpha_composite(blanco, ((96 - sil.width) // 2, 8))
ins.save(f"{dst}/insignia-96.png")
print("listo")
