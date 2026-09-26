# -*- coding: utf-8 -*-
"""
Eksport wersji projektu (headless, freecadcmd):
  freecadcmd narzedzia/eksport.py --wyjscie FOLDER [--parametry parametry.json]

Tworzy w FOLDER:
  obrecz.stl, srodek.stl, sruba.stl, nasadka.stl   (1:1)
  step/obrecz.step, step/srodek.step, ...          (do FreeCAD)
  step/wszystko.step                               (caly projekt)
  czesci.json                                      (lista czesci dla strony)
  parametry.json                                   (parametry wersji)
"""
import json
import math
import os
import sys
import zipfile

import FreeCAD as App
import Part
import Mesh
import MeshPart

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.append(_HERE)
import mechanizm as MECH

# ---------- parametry domyslne (te same co w Felga_parametryczna.py) ----------
DEF = {
    "CAL": 17.0, "SZER_J": 7.5, "PCD": 112.0, "N_SRUB": 5,
    "D_OTW_SRUB": 15.0, "CB": 57.1, "ET": 35.0, "N_RAMION": 7,
    "T_OBRECZY": 6.0, "RANT_DOD": 11.0, "RANT_H": 11.0,
    "R_PIASTY": 78.0, "T_PIASTY": 18.0,
    "RAMIE_R0": 66.0, "RAMIE_R1": 212.0, "RAMIE_W0": 38.0, "RAMIE_W1": 24.0,
    "RAMIE_H0": 18.0, "RAMIE_H1": 18.0, "R_OBLENIA": 8.0,
    "D_KIOSZENI": 26.0, "H_KIOSZENI": 10.0, "R_GNIAZDA": 14.0,
    "D_SRUBY": 14.0, "L_SRUBY": 30.0, "HEX_AF": 17.0, "H_HEX": 9.0,
    "D_NASADKI": 24.0, "L_NASADKI": 38.0, "H_NAS_HEX": 14.0, "SQ_NAPED": 12.7,
}

# ---------- parametry z pliku (nadpisuja domyslne) ----------
def wczytaj_parametry(sciezka):
    p = dict(DEF)
    if sciezka and os.path.exists(sciezka):
        with open(sciezka, encoding="utf-8") as f:
            dane = json.load(f)
        for k, v in dane.items():
            if k in p:
                try:
                    p[k] = float(v)
                except (TypeError, ValueError):
                    pass
    return p


def hex_polygon(af):
    rc = af / 2.0 / math.cos(math.pi / 6.0)
    pts = []
    for i in range(6):
        a = math.pi / 6.0 + 2.0 * math.pi * i / 6.0
        pts.append(App.Vector(rc * math.cos(a), rc * math.sin(a), 0.0))
    pts.append(pts[0])
    return Part.makePolygon(pts)


def zbuduj(P):
    """Zwraca (obrecz, srodek, sruba, nasadka, opis_parametrow)."""
    r_bead = P["CAL"] * 25.4 / 2.0
    w_bead = P["SZER_J"] * 25.4
    t = P["T_OBRECZY"]
    r_in = r_bead - t
    r_rant = r_bead + P["RANT_DOD"]
    rh = P["RANT_H"]
    z_out, z_in = w_bead / 2.0, -w_bead / 2.0
    et, r_p, t_p = P["ET"], P["R_PIASTY"], P["T_PIASTY"]
    zp = App.Vector(0, 0, 1)

    bar = Part.makeCylinder(r_bead, w_bead, App.Vector(0, 0, z_in), zp)
    bar = bar.cut(Part.makeCylinder(r_in, w_bead + 4, App.Vector(0, 0, z_in - 2), zp))

    def ring(z0, z1, ro, ri):
        o = Part.makeCylinder(ro, z1 - z0, App.Vector(0, 0, z0), zp)
        return o.cut(Part.makeCylinder(ri, z1 - z0 + 4, App.Vector(0, 0, z0 - 2), zp))

    f_out = ring(z_out - 3, z_out + rh, r_rant, r_in + 0.01)
    f_in = ring(z_in - rh, z_in + 3, r_rant, r_in + 0.01)

    r_obl = P["R_OBLENIA"]
    hub = Part.makeCylinder(r_p, t_p, App.Vector(0, 0, et), zp)
    try:
        he = [e for e in hub.Edges if e.Length > r_p]
        hub = hub.makeFillet(r_obl, he)
    except Exception:
        pass

    n = int(P["N_RAMION"])
    w0, w1 = P["RAMIE_W0"] / 2.0, P["RAMIE_W1"] / 2.0
    h0, h1 = P["RAMIE_H0"] / 2.0, P["RAMIE_H1"] / 2.0
    zc0 = et + t_p / 2.0
    zc1 = et + t_p / 2.0 - 1.0
    spokes = []
    for i in range(n):
        a = math.pi / 2.0 + 2.0 * math.pi * i / n
        ur = App.Vector(math.cos(a), math.sin(a), 0)
        uq = App.Vector(-math.sin(a), math.cos(a), 0)

        def rect(rr, hw, hh, zc):
            c = ur * rr + zp * zc
            return Part.makePolygon([
                c - uq * hw - zp * hh, c + uq * hw - zp * hh,
                c + uq * hw + zp * hh, c - uq * hw + zp * hh,
                c - uq * hw - zp * hh])

        try:
            sp = Part.makeLoft([rect(P["RAMIE_R0"], w0, h0, zc0),
                                rect(P["RAMIE_R1"], w1, h1, zc1)], True, True)
            ed = []
            for e in sp.Edges:
                vs = e.Vertexes
                if len(vs) < 2:
                    continue
                dv = vs[-1].Point - vs[0].Point
                if dv.Length < 40:
                    continue
                dv.normalize()
                if abs(dv.dot(ur)) > 0.9:
                    ed.append(e)
            if len(ed) >= 2:
                sp = sp.makeFillet(r_obl, ed)
            spokes.append(sp)
        except Exception:
            continue

    obrecza = bar.multiFuse([f_out, f_in]).removeSplitter()
    srodek = hub.multiFuse(spokes).removeSplitter()

    cutters = []
    d1, d2 = P["D_OTW_SRUB"] / 2.0, P["D_KIOSZENI"] / 2.0
    ns, rpcd = int(P["N_SRUB"]), P["PCD"] / 2.0
    r_kie, h_kie, r_gni = P["D_KIOSZENI"] / 2.0, P["H_KIOSZENI"], P["R_GNIAZDA"]
    z_floor = et + t_p - h_kie
    z_seat = z_floor + 4.0 + math.sqrt(max(r_gni * r_gni - r_kie * r_kie, 1.0))
    for i in range(ns):
        a = math.pi / 2.0 + 2.0 * math.pi * i / ns
        c = App.Vector(rpcd * math.cos(a), rpcd * math.sin(a), 0)
        cutters.append(Part.makeCylinder(d1, t_p + 20, App.Vector(c.x, c.y, et - 10), zp))
        cutters.append(Part.makeCylinder(r_kie, h_kie + 4, App.Vector(c.x, c.y, z_floor), zp))
        sph = Part.makeSphere(r_gni, App.Vector(c.x, c.y, z_seat), zp)
        kiel = Part.makeCylinder(r_kie, h_kie + 30, App.Vector(c.x, c.y, z_floor), zp)
        cutters.append(sph.common(kiel))
    cutters.append(Part.makeCylinder(P["CB"] / 2.0, t_p + 60, App.Vector(0, 0, et - 30), zp))
    tool = cutters[0].multiFuse(cutters[1:]).removeSplitter()
    srodek = srodek.cut(tool).removeSplitter()

    # sruba M14 + nasadka 17
    d, L, af, hh = P["D_SRUBY"], P["L_SRUBY"], P["HEX_AF"], P["H_HEX"]
    rb = P["R_GNIAZDA"] - 0.4
    ball = Part.makeSphere(rb, App.Vector(0, 0, hh), zp)
    ball = ball.cut(Part.makeBox(200, 200, 200, App.Vector(-100, -100, 0.0)))
    hx = Part.Face(hex_polygon(af)).extrude(App.Vector(0, 0, hh))
    shank = Part.makeCylinder(d / 2.0, L, App.Vector(0, 0, 2.0 - L), zp)
    sruba = hx.fuse(ball).fuse(shank).removeSplitter()
    sruba.Placement.Base = App.Vector(430, 0, L - 2.0)

    od, Ln, hn, sq = P["D_NASADKI"], P["L_NASADKI"], P["H_NAS_HEX"], P["SQ_NAPED"]
    body = Part.makeCylinder(od / 2.0, Ln, App.Vector(0, 0, 0), zp)
    body = body.cut(Part.Face(hex_polygon(af)).extrude(App.Vector(0, 0, hn + 1.0)))
    h2 = sq / 2.0
    sqw = Part.makePolygon([App.Vector(-h2, -h2, 0), App.Vector(h2, -h2, 0),
                            App.Vector(h2, h2, 0), App.Vector(-h2, h2, 0),
                            App.Vector(-h2, -h2, 0)])
    sqc = Part.Face(sqw).extrude(App.Vector(0, 0, Ln + 2.0))
    sqc.translate(App.Vector(0, 0, hn - 1.0))
    body = body.cut(sqc)
    body.Placement.Base = App.Vector(430, 0, L - 2.0 + hh + 10.0)
    nasadka = body

    opis = {
        "Średnica": '17" (%.1f mm)' % (2 * r_bead),
        "Szerokość": '7.5J (%.1f mm)' % w_bead,
        "PCD": '%d×%d mm' % (int(P["N_SRUB"]), int(P["PCD"])),
        "ET": '%.0f mm' % et,
        "CB": 'Ø%.1f mm' % P["CB"],
        "Ramiona": '%d (R%.0f)' % (n, r_obl),
        "Obręcz (ścianka)": '%.0f mm' % t,
        "Kieszenie śrub": 'Ø%.0f × %.0f mm' % (P["D_KIOSZENI"], h_kie),
        "Otwór śrub": 'Ø%.0f mm + gniazdo R%.0f' % (P["D_OTW_SRUB"], P["R_GNIAZDA"]),
        "Skala mechanizmu": '45%% (tarcza Ø%.0f, PCD %.1f)' % (2 * MECH.R_TAR, P["PCD"] * MECH.S),
        "Stanowisko": 'wał Ø8, łożyska 608, NEMA 17, pasek GT2',
    }
    return obrecza, srodek, sruba, nasadka, opis


def main():
    args = sys.argv[1:]
    out = os.environ.get("FELGA_OUT", "")
    par = os.environ.get("FELGA_PARAMS", "")
    if "--wyjscie" in args:
        out = args[args.index("--wyjscie") + 1]
    if "--parametry" in args:
        par = args[args.index("--parametry") + 1]
    if not out:
        out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "wersja_out")

    P = wczytaj_parametry(par)
    obrecza, srodek, sruba, nasadka, opis_params = zbuduj(P)

    os.makedirs(out, exist_ok=True)
    stepdir = os.path.join(out, "step")
    os.makedirs(stepdir, exist_ok=True)

    # felga na tarczy montazowej (skala 45% -> os X)
    import math as _m
    S = MECH.S
    rot = App.Rotation(App.Vector(0, 1, 0), 90)
    poz = App.Vector(MECH.X_TAR + MECH.T_TAR - P["ET"] * S, 0, MECH.Z_OSI)
    obrecza2 = obrecza.copy()
    obrecza2.Placement = App.Placement(poz, rot)
    srodek2 = srodek.copy()
    srodek2.Placement = App.Placement(poz, rot)

    czesci = [
        ("obrecz", "Obręcz felgi", obrecza2, "felga", "#14161a", True),
        ("srodek", "Środek felgi (piasta + ramiona)", srodek2, "felga", "#9aa1a8", True),
        ("tarcza", "Tarcza montażowa (skala 45%)", MECH.tarcza(P), "mechanizm", "#ffc400", True),
        ("wal", "Wał Ø8", MECH.walek(), "mechanizm", "#c9ced4", True),
        ("lozyska", "Łożyska 608 × 2", MECH.lozyska(), "mechanizm", "#6b7280", True),
        ("oprawy", "Oprawy łożysk", MECH.oprawy(), "mechanizm", "#6f7780", True),
        ("podstawa", "Podstawa stanowiska", MECH.podstawa(), "mechanizm", "#3b4450", True),
        ("wspornik", "Wspornik silnika (NEMA 17)", MECH.wspornik(), "napęd", "#4a545f", True),
        ("silnik", "Silnik NEMA 17", MECH.silnik(), "napęd", "#2b3239", True),
        ("kola", "Koła pasowe GT2 40T + 20T", MECH.kola_pasowe(), "napęd", "#b9bec3", True),
        ("sruba", "Śruba M14", sruba, "osprzęt", "#7d838a", True),
        ("nasadka", "Nasadka 17 mm", nasadka, "osprzęt", "#b9bec3", True),
    ]

    manifest = []
    shapes_all = []
    for cid, nazwa, shp, grupa, kolor, wid in czesci:
        stl = os.path.join(out, cid + ".stl")
        m = MeshPart.meshFromShape(Shape=shp, LinearDeflection=0.4,
                                      AngularDeflection=0.5, Relative=False)
        m.write(stl)
        step = os.path.join(stepdir, cid + ".step")
        shp.exportStep(step)
        shapes_all.append(shp)
        manifest.append({
            "id": cid, "nazwa": nazwa, "plik": cid + ".stl",
            "step": "step/" + cid + ".step", "grupa": grupa,
            "kolor": kolor, "widoczna": wid
        })

    Part.makeCompound(shapes_all).exportStep(os.path.join(stepdir, "wszystko.step"))

    with open(os.path.join(out, "czesci.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    with open(os.path.join(out, "parametry.json"), "w", encoding="utf-8") as f:
        json.dump(opis_params, f, ensure_ascii=False, indent=2)

    zp = os.path.join(out, "projekt.zip")
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(out):
            for fn in files:
                if fn == "projekt.zip":
                    continue
                full = os.path.join(root, fn)
                z.write(full, os.path.relpath(full, out))

    print("EKSPORT OK -> %s" % out)
    print("  czesci: %s" % ", ".join(m["id"] for m in manifest))
    print("  step:   %s" % ", ".join(m["id"] for m in manifest))
    print("  zip:    projekt.zip")


main()
