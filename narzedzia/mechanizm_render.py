# -*- coding: utf-8 -*-
# Podglad mechanizmu: freecad.exe narzedzia/mechanizm_render.py
import os
import sys
import FreeCAD as App
import FreeCADGui as Gui
from PySide import QtCore
from pivy import coin

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.append(HERE)
import mechanizm as M

TEMP = r"C:\Users\klif\AppData\Local\Temp\opencode"
FCSTD = os.path.join(ROOT, "strona", "wersje", "v1", "zrodlo.FCStd")
P = {"CB": 57.1, "PCD": 112.0, "D_OTW_SRUB": 15.0, "N_SRUB": 5, "ET": 35.0}

LOG = open(os.path.join(TEMP, "mech_log.txt"), "w")
def log(m):
    LOG.write(str(m) + "\n"); LOG.flush()

doc = App.newDocument("Mechanizm")
objs = []

# --- felga z pliku v1 ---
try:
    d2 = App.openDocument(FCSTD)
    obr = d2.getObject("Obrecz_czarna").Shape
    sro = d2.getObject("Srodek_szary").Shape
    App.closeDocument(d2.Name)
    rot = App.Rotation(App.Vector(0, 1, 0), 90)
    poz = App.Vector(M.X_TAR + M.T_TAR - P["ET"] * M.S, 0, M.Z_OSI)
    for nm, shp, col in [("Obrecz", obr, (0.05, 0.05, 0.05)), ("Srodek", sro, (0.55, 0.56, 0.58))]:
        o = doc.addObject("Part::Feature", nm)
        s = shp.copy()
        s.Placement = App.Placement(poz, rot)
        o.Shape = s
        o.ViewObject.ShapeColor = col
        objs.append(o)
    log("felga OK, srodek felgi: %s" % poz)
except Exception as e:
    log("felga ERR: %s" % e)

# --- mechanizm ---
for cid, nazwa, grupa, kolor, shp in M.zbuduj(P):
    o = doc.addObject("Part::Feature", cid)
    o.Shape = shp
    c = kolor.lstrip("#")
    o.ViewObject.ShapeColor = (int(c[0:2], 16) / 255.0, int(c[2:4], 16) / 255.0, int(c[4:6], 16) / 255.0)
    objs.append(o)
    log("czesc: %s  bbox=%s" % (cid, shp.BoundBox))

doc.recompute()
log("obiektow: %d" % len(objs))


def set_view(av, view_dir, height, center):
    d = App.Vector(view_dir); d.normalize()
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
            try: av.setCameraType("Orthographic")
            except Exception: pass
            set_view(av, (0.6, 0.7, -0.42), 480, (30, 0, 70))
            QtCore.QTimer.singleShot(2000, lambda: show(1))
        elif state == 1:
            av.saveImage(TEMP + "/mech_iso.png", 1300, 950, "White")
            set_view(av, (0.1, 1.0, -0.25), 480, (30, 0, 70))
            QtCore.QTimer.singleShot(2000, lambda: show(2))
        elif state == 2:
            av.saveImage(TEMP + "/mech_side.png", 1400, 900, "White")
            set_view(av, (1.0, 0.15, -0.2), 420, (10, 0, 70))
            QtCore.QTimer.singleShot(2000, lambda: show(3))
        elif state == 3:
            av.saveImage(TEMP + "/mech_side2.png", 1400, 900, "White")
            log("render OK")
    except Exception as e:
        log("render ERR: %s" % e)


QtCore.QTimer.singleShot(2500, lambda: show(0))
log("start")
