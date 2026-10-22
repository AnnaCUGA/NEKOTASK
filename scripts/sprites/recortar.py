import sys, json
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage
src, salida = sys.argv[1], sys.argv[2]
im=np.array(Image.open(src).convert('RGBA')).astype(np.float32)
a=im[...,3]
# 1) quita el ruido casi invisible del fondo (alpha 1-30)
duro=a>=40
duro=ndimage.binary_opening(duro,iterations=1)
lab,n=ndimage.label(ndimage.binary_dilation(duro,iterations=3))
objs=ndimage.find_objects(lab)
cajas=[]
for i,s in enumerate(objs):
    if (lab[s]==i+1).sum()<2500: continue
    cajas.append((i+1,s))
cajas.sort(key=lambda c:(c[1][0].start//60,c[1][1].start))
info=[]
import os; os.makedirs(salida,exist_ok=True)
for k,(idx,s) in enumerate(cajas):
    m=(lab[s]==idx)
    rgba=im[s].copy()
    alpha=rgba[...,3]
    alpha=np.where(alpha<30,0,alpha)          # borde limpio
    alpha=np.where(m,alpha,0)                 # solo este sprite
    # 2) quita halo de color en el borde: aclara píxeles semitransparentes hacia el color vecino opaco
    rgba[...,3]=alpha
    out=Image.fromarray(rgba.clip(0,255).astype(np.uint8),'RGBA')
    bb=out.getbbox(); out=out.crop(bb)
    out.save(f'{salida}/{k:02d}.png')
    info.append({'i':k,'x':int(s[1].start),'y':int(s[0].start),'w':out.width,'h':out.height})
json.dump(info,open(f'{salida}/indice.json','w'))
# hoja de contacto sobre fondo oscuro
cols=8; cel=150
H=((len(info)+cols-1)//cols)*cel
hoja=Image.new('RGBA',(cols*cel,H),(18,18,18,255))
d=ImageDraw.Draw(hoja)
for k,inf in enumerate(info):
    sp=Image.open(f'{salida}/{k:02d}.png')
    sp.thumbnail((cel-20,cel-24))
    x=(k%cols)*cel+(cel-sp.width)//2; y=(k//cols)*cel+(cel-20-sp.height)//2+4
    hoja.alpha_composite(sp,(x,y))
    d.text(((k%cols)*cel+4,(k//cols)*cel+cel-16),str(k),fill=(200,200,200,255))
hoja.save(f'{salida}/../hoja.png')
print(len(info))
