import math
def lab(h):
    r,g,b=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    f=lambda c: c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    r,g,b=f(r),f(g),f(b)
    X=(0.4124*r+0.3576*g+0.1805*b)/0.95047; Y=(0.2126*r+0.7152*g+0.0722*b); Z=(0.0193*r+0.1192*g+0.9505*b)/1.08883
    t=lambda v: v**(1/3) if v>0.008856 else 7.787*v+16/116
    return 116*t(Y)-16, 500*(t(X)-t(Y)), 200*(t(Y)-t(Z))
def de(a,b): A,B=lab(a),lab(b); return math.dist(A,B)
pal={'Klang':'#f0e6d8','Ebene2':'#c9dc82','Spur1':'#ffb35c','Spur2':'#86f0d0','Spur3':'#c4a8ff','Spur4':'#ff8f9e','Echo':'#6cc9ef','Hall':'#d6cbff','Puls':'#f2cf86'}
for cand in ['#8fa9ff','#5b8cff','#6f8dff','#4f86f7','#7a93ff','#5a7cff','#e0a05a','#d9925c','#b8c46a','#9bd16a','#ffd36b']:
    ds=sorted((round(de(cand,v),1),k) for k,v in pal.items())
    print(cand, ds[:4])
