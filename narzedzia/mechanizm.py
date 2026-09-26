# -*- coding: utf-8 -*-
"""
Mechanizm napędu/badań dla felgi 17x7.5J (wydruk 45%).
Wymiary realne dla zakupionych części: wał Ø8, łożyska 608 (Ø22x7),
silnik NEMA 17 (42.3, otwory M3 31 mm, wał Ø5), koła GT2.
Tarcza montażowa jest w skali 45% — dopasowana do wydrukowanej felgi
(prowadzenie ØCB*0.45, 5 otworów na PCD*0.45).

Uklad: oś wału wzdłuż X na wysokosci Z_OSI, podstawa na stole (Z=0).
"""
import math
import Part
import FreeCAD as App

S = 0.45            # skala wydrukowanej felgi
Z_OSI = 115.0       # wysokosc osi walu
D_WAL = 8.0
L_WAL = 190.0
D_LOZ_W, D_LOZ_Z = 22.0, 7.0      # lozysko 608
X_OPR_L, X_OPR_P = -60.0, -10.0      # oprawy po stronie silnika (felga po +X)
T_OPR, W_OPR = 20.0, 64.0
D_POD = 8.0
L_POD, W_POD = 280.0, 160.0
X_TAR = 75.0        # poczatek tarczy montazowej
T_TAR = 12.0
R_TAR = 35.0
X_SIL = -96.0       # czolo silnika
L_SIL = 40.0
Z_SIL = 55.0        # os silnika PONIZEJ walu (pasek pionowy)
X_KOL = -85.0       # plaszczyzna kol pasowych
ZP = App.Vector(0, 0, 1)
XP = App.Vector(1, 0, 0)


def walek():
    return Part.makeCylinder(D_WAL / 2, L_WAL,
                             App.Vector(-L_WAL / 2, 0, Z_OSI), XP)


def lozyska():
    a = Part.makeCylinder(D_LOZ_W / 2, D_LOZ_Z,
                          App.Vector(X_OPR_L - D_LOZ_Z / 2, 0, Z_OSI), XP)
    b = Part.makeCylinder(D_LOZ_W / 2, D_LOZ_Z,
                          App.Vector(X_OPR_P - D_LOZ_Z / 2, 0, Z_OSI), XP)
    return a.fuse(b)


def oprawy():
    wynik = []
    for x in (X_OPR_L, X_OPR_P):
        b = Part.makeBox(T_OPR, W_OPR, Z_OSI + 34.0 - D_POD,
                         App.Vector(x - T_OPR / 2, -W_OPR / 2, D_POD))
        b = b.cut(Part.makeCylinder(D_LOZ_W / 2, T_OPR + 4,
                                    App.Vector(x - T_OPR / 2 - 2, 0, Z_OSI), XP))
        try:
            ed = [e for e in b.Edges
                  if e.Vertexes and all(abs(v.Point.z - (Z_OSI + 34.0)) < 0.2 for v in e.Vertexes)]
            if ed:
                b = b.makeFillet(6.0, ed)
        except Exception:
            pass
        wynik.append(b)
    return wynik[0].fuse(wynik[1])


def podstawa():
    p = Part.makeBox(L_POD, W_POD, D_POD, App.Vector(-L_POD / 2, -W_POD / 2, 0))
    for x in (X_OPR_L, X_OPR_P):
        for y in (-W_OPR / 2 + 10, W_OPR / 2 - 10):
            p = p.cut(Part.makeCylinder(2.2, D_POD + 4,
                                        App.Vector(x, y, -2), ZP))
    for dx in (-15.5, 15.5):
        for dy in (-15.5, 15.5):
            p = p.cut(Part.makeCylinder(2.2, D_POD + 4,
                                        App.Vector(X_SIL - L_SIL / 2 + dx, dy, -2), ZP))
    # stopki
    for sx in (-L_POD / 2 + 15, L_POD / 2 - 15):
        for sy in (-W_POD / 2 + 15, W_POD / 2 - 15):
            p = p.fuse(Part.makeCylinder(9.0, 4.0, App.Vector(sx, sy, -4.0), ZP))
    return p


def wspornik():
    gora = Z_SIL - 42.3 / 2.0
    h = gora - D_POD
    b = Part.makeBox(L_SIL + 10, 62.0, h,
                     App.Vector(X_SIL - L_SIL - 5, -31.0, D_POD))
    for dx in (-15.5, 15.5):
        for dy in (-15.5, 15.5):
            b = b.cut(Part.makeCylinder(1.7, h + 4,
                                        App.Vector(X_SIL - L_SIL / 2 + dx, dy, D_POD - 2), ZP))
    return b


def silnik():
    b = Part.makeBox(L_SIL, 42.3, 42.3,
                     App.Vector(X_SIL - L_SIL, -42.3 / 2, Z_SIL - 42.3 / 2))
    b = b.fuse(Part.makeCylinder(11.25, 2.0, App.Vector(X_SIL, 0, Z_SIL), XP))
    b = b.fuse(Part.makeCylinder(2.5, 24.0, App.Vector(X_SIL, 0, Z_SIL), XP))
    return b


def kola_pasowe():
    # 40T na wale (Ø8)
    k1 = Part.makeCylinder(13.5, 9.0, App.Vector(X_KOL - 4.5, 0, Z_OSI), XP)
    k1 = k1.fuse(Part.makeCylinder(15.0, 1.6, App.Vector(X_KOL - 5.6, 0, Z_OSI), XP))
    k1 = k1.fuse(Part.makeCylinder(15.0, 1.6, App.Vector(X_KOL + 4.0, 0, Z_OSI), XP))
    # 20T na silniku (Ø5)
    k2 = Part.makeCylinder(7.0, 9.0, App.Vector(X_KOL - 4.5, 0, Z_SIL), XP)
    k2 = k2.fuse(Part.makeCylinder(8.5, 1.6, App.Vector(X_KOL - 5.6, 0, Z_SIL), XP))
    k2 = k2.fuse(Part.makeCylinder(8.5, 1.6, App.Vector(X_KOL + 4.0, 0, Z_SIL), XP))
    return k1.fuse(k2)


def tarcza(P):
    """Tarcza montazowa dopasowana do wydrukowanej felgi (skala 45%)."""
    r_cb = P["CB"] * S / 2.0
    r_pcd = P["PCD"] * S / 2.0
    r_otw = P["D_OTW_SRUB"] * S / 2.0 + 0.2
    d = Part.makeCylinder(R_TAR, T_TAR, App.Vector(X_TAR, 0, Z_OSI), XP)
    d = d.fuse(Part.makeCylinder(r_cb - 0.15, 3.0, App.Vector(X_TAR + T_TAR, 0, Z_OSI), XP))
    d = d.cut(Part.makeCylinder(D_WAL / 2, T_TAR + 10, App.Vector(X_TAR - 5, 0, Z_OSI), XP))
    for i in range(int(P["N_SRUB"])):
        a = math.pi / 2.0 + 2.0 * math.pi * i / int(P["N_SRUB"])
        y = r_pcd * math.cos(a)
        z = Z_OSI + r_pcd * math.sin(a)
        d = d.cut(Part.makeCylinder(r_otw, T_TAR + 10, App.Vector(X_TAR - 5, y, z), XP))
    # otwor na srubę dociskowa M4 (od dolu)
    d = d.cut(Part.makeCylinder(2.1, R_TAR + 4,
                                App.Vector(X_TAR + T_TAR / 2, 0, Z_OSI - R_TAR - 2), ZP))
    return d


def zbuduj(P):
    """Zwraca liste (id, nazwa, grupa, kolor, shape) dla calego stanowiska."""
    return [
        ("tarcza", "Tarcza montażowa (prowadzenie Ø%.1f, PCD %.1f)" % (P["CB"] * S, P["PCD"] * S),
         "mechanizm", "#ffc400", tarcza(P)),
        ("wal", "Wał Ø8 × %d" % int(L_WAL), "mechanizm", "#c9ced4", walek()),
        ("lozyska", "Łożyska 608 × 2 (Ø22×8×7)", "mechanizm", "#6b7280", lozyska()),
        ("oprawy", "Oprawy łożysk × 2 (x=%d/%d)" % (X_OPR_L, X_OPR_P), "mechanizm", "#6f7780", oprawy()),
        ("podstawa", "Podstawa %d×%d×%d" % (L_POD, W_POD, D_POD), "mechanizm", "#3b4450", podstawa()),
        ("wspornik", "Wspornik silnika (NEMA 17, M3 31 mm)", "napęd", "#4a545f", wspornik()),
        ("silnik", "Silnik NEMA 17 (42.3, wał Ø5)", "napęd", "#2b3239", silnik()),
        ("kola", "Koła pasowe GT2 40T/20T", "napęd", "#b9bec3", kola_pasowe()),
    ]
