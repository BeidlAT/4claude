# a tall capture cut into columns side by side: cols.py in.png out.png [colheight] [scale]
import sys
from PIL import Image
im=Image.open(sys.argv[1]); w,h=im.size
ch=int(sys.argv[3]) if len(sys.argv)>3 else 1400
sc=float(sys.argv[4]) if len(sys.argv)>4 else 0.75
cols=[im.crop((0,y,w,min(h,y+ch))) for y in range(0,h,ch)]
out=Image.new('RGB',(len(cols)*(w+10),ch),(60,60,60))
for i,c in enumerate(cols): out.paste(c,(i*(w+10),0))
out=out.resize((int(out.size[0]*sc),int(ch*sc)))
out.save(sys.argv[2]); print(out.size)
