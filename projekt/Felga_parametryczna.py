# -*- coding: utf-8 -*-
# PARAMETRYCZNA FELGA ALUMINIOWA 17x7.5J 5x112 ET35, 7 ramion
# + wpuszczane sruby (kieszenie + gniazdo kuliste) + klucz (nasadka 17 mm)
import math
import traceback
import FreeCAD as App
import Part
import Mesh
import MeshPart
import FreeCADGui as Gui
from PySide import QtCore
from pivy import coin

TEMP = "C:/Users/klif/AppData/Local/Temp/opencode"
DESK = "C:/Users/klif/Desktop"
FILE = DESK + "/Felga_17x7.5J_5x112_ET35.FCStd"

LOG = open(TEMP + "/felga_log.txt", "w")


def log(m):
    LOG.write(str(m) + "\n")
    LOG.flush()


DEF = {
    "CAL": 17.0,
    "SZER_J": 7.5,
    "PCD": 112.0,
    "N_SRUB": 5,
    "D_OTW_SRUB": 15.0,
    "CB": 57.1,
    "ET": 35.0,
    "N_RAMION": 7,
    "T_OBRECZY": 6.0,
    "RANT_DOD": 11.0,
    "RANT_H": 11.0,
    "R_PIASTY": 78.0,
    "T_PIASTY": 18.0,
    "RAMIE_R0": 66.0,
    "RAMIE_R1": 212.0,
    "RAMIE_W0": 38.0,
    "RAMIE_W1": 24.0,
    "RAMIE_H0": 18.0,
    "RAMIE_H1": 18.0,
    "SKALA_DRUKU": 0.45,
    "R_OBLENIA": 8.0,
    "D_KIOSZENI": 26.0,
    "H_KIOSZENI": 10.0,
    "R_GNIAZDA": 14.0,
    "D_SRUBY": 14.0,
    "L_SRUBY": 30.0,
    "HEX_AF": 17.0,
    "H_HEX": 9.0,
    "D_NASADKI": 24.0,
    "L_NASADKI": 38.0,
    "H_NAS_HEX": 14.0,
    "SQ_NAPED": 12.7,
}

PARAM_KEYS = ["CAL", "SZER_J", "PCD", "N_SRUB", "D_OTW_SRUB", "CB", "ET",
              "N_RAMION", "T_OBRECZY", "RANT_DOD", "RANT_H", "R_PIASTY",
              "T_PIASTY", "RAMIE_R0", "RAMIE_R1", "RAMIE_W0", "RAMIE_W1",
              "RAMIE_H0", "RAMIE_H1", "SKALA_DRUKU", "R_OBLENIA",
              "D_KIOSZENI", "H_KIOSZENI", "R_GNIAZDA", "D_SRUBY", "L_SRUBY",
              "HEX_AF", "H_HEX", "D_NASADKI", "L_NASADKI", "H_NAS_HEX",
              "SQ_NAPED"]

P = dict(DEF)


def load_params():
    try:
        d = App.openDocument(FILE)
        sh = d.getObject("Parametry")
        if sh:
            for i, k in enumerate(PARAM_KEYS):
                try:
                    P[k] = float(sh.getContents("B%d" % (i + 2)))
                except Exception:
                    pass
        App.closeDocument(d.Name)
        log("parametry wczytane z arkusza")
    except Exception:
        log("brak starego pliku, uzywam domyslnych")


def hex_polygon(af):
    rc = af / 2.0 / math.cos(math.pi / 6.0)
    pts = []
    for i in range(6):
        a = math.pi / 6.0 + 2.0 * math.pi * i / 6.0
        pts.append(App.Vector(rc * math.cos(a), rc * math.sin(a), 0.0))
    pts.append(pts[0])
    return Part.makePolygon(pts)


def build_wheel():
    r_bead = P["CAL"] * 25.4 / 2.0
    w_bead = P["SZER_J"] * 25.4
    t = P["T_OBRECZY"]
    r_in = r_bead - t
    r_rant = r_bead + P["RANT_DOD"]
    rh = P["RANT_H"]
    z_out = w_bead / 2.0
    z_in = -w_bead / 2.0
    et = P["ET"]
    r_p = P["R_PIASTY"]
    t_p = P["T_PIASTY"]
    zp = App.Vector(0, 0, 1)

    bar = Part.makeCylinder(r_bead, w_bead, App.Vector(0, 0, z_in), zp)
    bar = bar.cut(Part.makeCylinder(r_in, w_bead + 4, App.Vector(0, 0, z_in - 2), zp))
    log("barrel ok")

    def ring(z0, z1, ro, ri):
        o = Part.makeCylinder(ro, z1 - z0, App.Vector(0, 0, z0), zp)
        return o.cut(Part.makeCylinder(ri, z1 - z0 + 4, App.Vector(0, 0, z0 - 2), zp))

    f_out = ring(z_out - 3, z_out + rh, r_rant, r_in + 0.01)
    f_in = ring(z_in - rh, z_in + 3, r_rant, r_in + 0.01)
    log("flanges ok")

    r_obl = P["R_OBLENIA"]
    hub = Part.makeCylinder(r_p, t_p, App.Vector(0, 0, et), zp)
    try:
        he = [e for e in hub.Edges if e.Length > r_p]
        hub = hub.makeFillet(r_obl, he)
        log("hub fillet ok (%d krawedzi, R=%s)" % (len(he), r_obl))
    except Exception:
        log("hub fillet ERR:\n" + traceback.format_exc())
    log("hub ok")

    n = int(P["N_RAMION"])
    w0 = P["RAMIE_W0"] / 2.0
    w1 = P["RAMIE_W1"] / 2.0
    h0 = P["RAMIE_H0"] / 2.0
    h1 = P["RAMIE_H1"] / 2.0
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
                c - uq * hw - zp * hh,
                c + uq * hw - zp * hh,
                c + uq * hw + zp * hh,
                c - uq * hw + zp * hh,
                c - uq * hw - zp * hh,
            ])

        try:
            sp = Part.makeLoft([rect(P["RAMIE_R0"], w0, h0, zc0),
                                rect(P["RAMIE_R1"], w1, h1, zc1)], True, True)
        except Exception as e:
            log("loft err: %s" % e)
            continue
        try:
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
        except Exception:
            log("spoke fillet ERR:\n" + traceback.format_exc())
        spokes.append(sp)
    log("spokes: %d" % len(spokes))

    obrecza = bar.multiFuse([f_out, f_in]).removeSplitter()
    srodek = hub.multiFuse(spokes).removeSplitter()
    log("fuse ok obrecz=%.0f srodek=%.0f" % (obrecza.Volume, srodek.Volume))

    r_otw = P["D_OTW_SRUB"] / 2.0
    r_kie = P["D_KIOSZENI"] / 2.0
    h_kie = P["H_KIOSZENI"]
    r_gni = P["R_GNIAZDA"]
    z_floor = et + t_p - h_kie
    z_seat = z_floor + 4.0 + math.sqrt(max(r_gni * r_gni - r_kie * r_kie, 1.0))

    rpcd = P["PCD"] / 2.0
    ns = int(P["N_SRUB"])
    cutters = []
    for i in range(ns):
        a = math.pi / 2.0 + 2.0 * math.pi * i / ns
        c = App.Vector(rpcd * math.cos(a), rpcd * math.sin(a), 0)
        cutters.append(Part.makeCylinder(r_otw, t_p + 20,
                                         App.Vector(c.x, c.y, et - 10), zp))
        cutters.append(Part.makeCylinder(r_kie, h_kie + 4,
                                         App.Vector(c.x, c.y, z_floor), zp))
        sph = Part.makeSphere(r_gni, App.Vector(c.x, c.y, z_seat), zp)
        kiel = Part.makeCylinder(r_kie, h_kie + 30, App.Vector(c.x, c.y, z_floor), zp)
        cutters.append(sph.common(kiel))
    cb = P["CB"] / 2.0
    cutters.append(Part.makeCylinder(cb, t_p + 60, App.Vector(0, 0, et - 30), zp))
    tool = cutters[0].multiFuse(cutters[1:]).removeSplitter()
    srodek = srodek.cut(tool).removeSplitter()
    log("kieszenie ok srodek=%.0f z_seat=%.2f" % (srodek.Volume, z_seat))
    return obrecza, srodek, z_seat


def make_bolt():
    d = P["D_SRUBY"]
    L = P["L_SRUBY"]
    af = P["HEX_AF"]
    hh = P["H_HEX"]
    rb = P["R_GNIAZDA"] - 0.4
    zp = App.Vector(0, 0, 1)

    ball = Part.makeSphere(rb, App.Vector(0, 0, hh), zp)
    ball = ball.cut(Part.makeBox(200, 200, 200, App.Vector(-100, -100, 0.0)))

    hx = Part.Face(hex_polygon(af)).extrude(App.Vector(0, 0, hh))
    shank = Part.makeCylinder(d / 2.0, L, App.Vector(0, 0, 2.0 - L), zp)
    return hx.fuse(ball).fuse(shank).removeSplitter()


def make_socket():
    od = P["D_NASADKI"]
    L = P["L_NASADKI"]
    af = P["HEX_AF"]
    hh = P["H_NAS_HEX"]
    sq = P["SQ_NAPED"]
    zp = App.Vector(0, 0, 1)

    body = Part.makeCylinder(od / 2.0, L, App.Vector(0, 0, 0), zp)
    body = body.cut(Part.Face(hex_polygon(af)).extrude(App.Vector(0, 0, hh + 1.0)))

    h = sq / 2.0
    sqw = Part.makePolygon([
        App.Vector(-h, -h, 0), App.Vector(h, -h, 0),
        App.Vector(h, h, 0), App.Vector(-h, h, 0), App.Vector(-h, -h, 0)])
    sqcut = Part.Face(sqw).extrude(App.Vector(0, 0, L + 2.0))
    sqcut.translate(App.Vector(0, 0, hh - 1.0))
    body = body.cut(sqcut)

    try:
        oe = [e for e in body.Edges
              if abs(e.Length - math.pi * od) < od and e.Curve.__class__.__name__ != "Line"]
        oe = [e for e in oe if abs(e.Vertexes[0].Point.z) < 0.1]
        body = body.makeChamfer(1.5, oe)
    except Exception:
        log("socket chamfer ERR:\n" + traceback.format_exc())
    return body


def main():
    load_params()

    old = App.ActiveDocument
    if old:
        App.closeDocument(old.Name)

    doc = App.newDocument("Felga_aluminiowa")

    sh = doc.addObject("Spreadsheet::Sheet", "Parametry")
    sh.set("A1", "Parametr")
    sh.set("B1", "Wartosc")
    sh.set("C1", "Jednostka")
    for i, k in enumerate(PARAM_KEYS):
        r = i + 2
        sh.set("A%d" % r, k)
        sh.set("B%d" % r, str(P[k]))
        sh.setAlias("B%d" % r, k)
    log("arkusz ok")

    obrecza, srodek, z_seat = build_wheel()
    bolt = make_bolt()
    socket = make_socket()
    log("sruba=%.0f nasadka=%.0f" % (bolt.Volume, socket.Volume))

    o_obr = doc.addObject("Part::Feature", "Obrecz_czarna")
    o_obr.Shape = obrecza
    o_obr.ViewObject.ShapeColor = (0.06, 0.06, 0.06)

    o_sro = doc.addObject("Part::Feature", "Srodek_szary")
    o_sro.Shape = srodek
    o_sro.ViewObject.ShapeColor = (0.50, 0.50, 0.52)

    rpcd = P["PCD"] / 2.0
    ns = int(P["N_SRUB"])
    z_bolt = z_seat - P["H_HEX"]
    for k in range(ns):
        a = math.pi / 2.0 + 2.0 * math.pi * k / ns
        o = doc.addObject("Part::Feature", "Sruba_%d" % (k + 1))
        o.Shape = bolt
        o.Placement.Base = App.Vector(rpcd * math.cos(a), rpcd * math.sin(a), z_bolt)
        o.ViewObject.ShapeColor = (0.42, 0.43, 0.45)

    o_bolt = doc.addObject("Part::Feature", "Sruba_demo")
    o_bolt.Shape = bolt
    o_bolt.Placement.Base = App.Vector(430, 0, P["L_SRUBY"] - 2.0)
    o_bolt.ViewObject.ShapeColor = (0.42, 0.43, 0.45)

    o_sock = doc.addObject("Part::Feature", "Nasadka_17")
    o_sock.Shape = socket
    o_sock.Placement.Base = App.Vector(430, 0, P["L_SRUBY"] - 2.0 + P["H_HEX"] + 10.0)
    o_sock.ViewObject.ShapeColor = (0.72, 0.74, 0.77)

    doc.recompute()
    log("doc ok")

    doc.saveAs(FILE)
    log("saved FCStd")

    sk = P["SKALA_DRUKU"]
    mm = App.Matrix(sk, 0, 0, 0, 0, sk, 0, 0, 0, 0, sk, 0, 0, 0, 0, 1)
    msh = doc.addObject("Mesh::Feature", "tmpMesh")
    for nm, shp in (("Felga_Obrecz_czarna", obrecza),
                    ("Felga_Srodek_szary", srodek),
                    ("Sruba_M14", bolt),
                    ("Nasadka_17", socket)):
        msh.Mesh = MeshPart.meshFromShape(Shape=shp, LinearDeflection=0.4,
                                          AngularDeflection=0.5, Relative=False)
        Mesh.export([msh], DESK + "/%s.stl" % nm)
        sc = shp.copy()
        sc.scale(sk)
        msh.Mesh = MeshPart.meshFromShape(Shape=sc, LinearDeflection=0.3,
                                          AngularDeflection=0.5, Relative=False)
        Mesh.export([msh], DESK + "/%s_druk%d.stl" % (nm, int(sk * 100)))
        log("STL %s ok" % nm)
    doc.removeObject(msh.Name)
    return doc


try:
    DOC = main()
except Exception:
    log("FATAL:\n" + traceback.format_exc())
    DOC = None


def set_view(av, view_dir, height, center):
    d = App.Vector(view_dir)
    d.normalize()
    cam = av.getCameraNode()
    rot = App.Rotation(App.Vector(0, 0, -1), d)
    q = rot.Q
    cam.orientation.setValue(q[0], q[1], q[2], q[3])
    dist = 3000.0
    pos = App.Vector(center) - d * dist
    cam.position.setValue(pos.x, pos.y, pos.z)
    cam.focalDistance.setValue(dist)
    cam.nearDistance.setValue(10.0)
    cam.farDistance.setValue(dist * 2.0)
    cam.height.setValue(height)


def show(state):
    try:
        av = Gui.activeDocument().ActiveView
        if state == 0:
            Gui.Selection.clearSelection()
            try:
                av.setCameraType("Orthographic")
            except Exception:
                pass
            set_view(av, (0.08, 0.32, -1.0), 560, (0, 0, 0))
            QtCore.QTimer.singleShot(2000, lambda: show(1))
        elif state == 1:
            av.saveImage(TEMP + "/felga_przod.png", 1200, 1200, "White")
            av.saveImage(DESK + "/Felga_przod.png", 1200, 1200, "White")
            log("render przod ok")
            set_view(av, (0.62, 0.62, -0.48), 660, (40, 0, 0))
            QtCore.QTimer.singleShot(2000, lambda: show(2))
        elif state == 2:
            av.saveImage(TEMP + "/felga_3d.png", 1300, 1000, "White")
            av.saveImage(DESK + "/Felga_3D.png", 1300, 1000, "White")
            log("render 3d ok")
            set_view(av, (0.25, -0.80, -0.55), 170, (0, 50, 45))
            QtCore.QTimer.singleShot(2000, lambda: show(3))
        elif state == 3:
            av.saveImage(TEMP + "/felga_piasta.png", 1200, 1000, "White")
            log("render piasta ok")
            log("done")
    except Exception as e:
        log("render ERR: %s" % e)


QtCore.QTimer.singleShot(2500, lambda: show(0))


