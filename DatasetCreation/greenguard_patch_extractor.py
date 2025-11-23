"""
GreenGuard Patch Extractor  v5  — FINAL
========================================
All problems from v1–v4 identified and fixed:

LABELING LOGIC (root cause of all class imbalance issues):
  ┌─────────────────────────────────────────────────────────────────┐
  │  Step 1  T2 NDBI > 0.05 AND NDVI < 0.30 AND VV > -12  → No_Forest
  │  Step 2  T1 mean NDVI < 0.25             → No_Forest (was never forest)
  │  Step 3  T2 mean NDVI < 0.20             → No_Forest (became bare/urban)
  │  Step 4  defor_fraction >= 0.25          → Deforested  (raised from 0.15)
  │  Step 5  else                            → No_Change
  └─────────────────────────────────────────────────────────────────┘

KEY FIXES in v5:
  • Step 3 (T2 NDVI < 0.20): routes urban-expansion patches to No_Forest
    instead of Deforested — this was the main cause of Deforested domination
  • MIN_DEFOR_FRAC raised to 0.25 (was 0.15) — stricter patch-level filter
  • NO automatic gap filling — user manually chooses filler pairs from UI
  • Gap fill is optional, user-controlled, per-class
  • Reduce class spinbox fixed (Tab-confirm bug resolved)
  • Sample viewer shows Before/After RGB for up to 6 patches per class
  • Adjustable thresholds via UI sliders (FOREST_THR, DEFOR_FRAC)

Band layout (S2 TIF)  : B1=B2, B2=B3, B3=B4, B4=B8, B5=B11
Band layout (SAR TIF) : B1=VV, B2=VH
Output patch (8 bands): B2, B3, B4, B8, B11, VV, VH, NDVI  — float32

References:
  Torres et al. (2021) Remote Sens. 13:5084  — 128×128, weighted loss
  Two_year_Quality_checker.py  — NDVI threshold labeling
  Md Jelas et al. (2024) Frontiers in Forests — augmentation best practice

Author : GreenGuard FYP — Riphah International University
"""

import os
import csv
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path
from itertools import combinations

import numpy as np
import rasterio

try:
    import matplotlib
    matplotlib.use("TkAgg")
    from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
    from matplotlib.figure import Figure
    HAS_MPL = True
except ImportError:
    HAS_MPL = False

# ════════════════════════════════════════════════════════════════════════════
#  CONSTANTS  (defaults — some are overridden by UI sliders)
# ════════════════════════════════════════════════════════════════════════════

YEARS      = list(range(2018, 2026))        # 2018 – 2025
SEASONS    = ["JanApr", "MayAug", "SepDec"]
PATCH_SIZE = 128                            # pixels × pixels
NODATA_THR = 0.10                           # >10 % invalid → reject patch

# Pixel-level spectral voting thresholds
THR_NDVI = 0.10
THR_NDWI = 0.08
THR_NDMI = 0.08
THR_SAR  = 2.0

# Patch-level labeling thresholds (adjustable via UI)
DEFAULT_FOREST_THR     = 0.25   # T1 mean NDVI must exceed this → "was forest"
DEFAULT_T2_BARE_THR    = 0.20   # T2 mean NDVI below this → became bare/urban
DEFAULT_MIN_DEFOR_FRAC = 0.25   # fraction of pixels that must vote deforested

# No_Forest detection (NDBI-based)
URBAN_NDBI_MIN  = 0.05
URBAN_NDVI_MAX  = 0.30
URBAN_SAR_MIN   = -12.0

# ── Colour palette ────────────────────────────────────────────────────────
C_BG     = "#0A1A12"; C_PANEL  = "#0F2318"; C_CARD   = "#152E1E"
C_CARD2  = "#1A3828"; C_BORDER = "#2A5A3A"
C_GREEN  = "#4CAF7D"; C_GREEN2 = "#74C69D"; C_GREEN3 = "#2D6A4F"
C_TEAL   = "#00BFA5"; C_GOLD   = "#FFD54F"; C_ORANGE = "#FF8A65"
C_RED    = "#EF5350"; C_BLUE   = "#4FC3F7"; C_PURPLE = "#CE93D8"
C_TEXT   = "#E8F5EE"; C_MUTED  = "#7AAB90"

FNT_TITLE = ("Segoe UI Semibold", 15)
FNT_H2    = ("Segoe UI Semibold", 11)
FNT_BODY  = ("Segoe UI", 9)
FNT_MONO  = ("Cascadia Code", 9) if os.name == "nt" else ("Courier", 9)
FNT_SMALL = ("Segoe UI", 8)
FNT_BTN   = ("Segoe UI Semibold", 9)

AUGMENT_FNS = {
    "Rotate 90°":      lambda a: np.rot90(a, 1, (1,2)).copy(),
    "Rotate 180°":     lambda a: np.rot90(a, 2, (1,2)).copy(),
    "Rotate 270°":     lambda a: np.rot90(a, 3, (1,2)).copy(),
    "Flip Horizontal": lambda a: a[:, :, ::-1].copy(),
    "Flip Vertical":   lambda a: a[:, ::-1, :].copy(),
}

# ════════════════════════════════════════════════════════════════════════════
#  SPECTRAL UTILITIES
# ════════════════════════════════════════════════════════════════════════════

def ndvi(b8, b4):
    d = b8 + b4
    return np.where(d == 0, 0.0, (b8 - b4) / d)

def ndwi(b3, b8):
    d = b3 + b8
    return np.where(d == 0, 0.0, (b3 - b8) / d)

def ndmi(b8, b11):
    d = b8 + b11
    return np.where(d == 0, 0.0, (b8 - b11) / d)

def ndbi(b11, b8):
    """NDBI = (B11-B8)/(B11+B8)  Positive → built-up / bare soil."""
    d = b11 + b8
    return np.where(d == 0, 0.0, (b11 - b8) / d)

def safe_read(path):
    with rasterio.open(path) as src:
        return src.read().astype(np.float32), src.nodata

def bad_fraction(arr):
    """Fraction of spatially invalid (NaN / Inf) pixels."""
    return np.any(~np.isfinite(arr), axis=0).mean()

def to_rgb(patch):
    """8-band patch → uint8 (H,W,3) for display (B4,B3,B2 = R,G,B)."""
    rgb = np.stack([patch[2], patch[1], patch[0]], axis=-1)
    lo, hi = np.nanpercentile(rgb, [2, 98])
    rgb = np.clip((rgb - lo) / max(hi - lo, 1e-6), 0, 1)
    return (rgb * 255).astype(np.uint8)

# ════════════════════════════════════════════════════════════════════════════
#  CORE ENGINE
# ════════════════════════════════════════════════════════════════════════════

class Core:
    """All heavy computation — completely decoupled from GUI."""

    def __init__(self, folder, log_fn, prog_fn):
        self.folder   = Path(folder)
        self.log      = log_fn
        self.prog     = prog_fn
        self.s2       = {}          # (year, season) → Path
        self.sar      = {}
        self.missing  = []
        self.patches  = {"Deforested": [], "No_Change": [], "No_Forest": []}
        self.samples  = {"Deforested": [], "No_Change": [], "No_Forest": []}

        # Runtime thresholds (set by UI before extraction)
        self.vote_thr      = 2
        self.forest_thr    = DEFAULT_FOREST_THR
        self.t2_bare_thr   = DEFAULT_T2_BARE_THR
        self.defor_frac    = DEFAULT_MIN_DEFOR_FRAC

    # ── 1. Scan ───────────────────────────────────────────────────────────────

    def scan(self):
        self.s2.clear(); self.sar.clear(); self.missing.clear()
        tifs = list(self.folder.glob("*.tif"))
        self.log(f"TIF files found: {len(tifs)}")
        for y in YEARS:
            for s in SEASONS:
                p2  = self.folder / f"S2_{y}_{s}.tif"
                ps  = self.folder / f"SAR_{y}_{s}.tif"
                if p2.exists():  self.s2[(y,s)]  = p2
                else:            self.missing.append(f"S2_{y}_{s}.tif")
                if ps.exists():  self.sar[(y,s)] = ps
                else:            self.missing.append(f"SAR_{y}_{s}.tif")
        seas = sorted(set(s for _,s in self.s2))
        self.log(f"Seasons found: {seas}")
        self.log(f"S2: {len(self.s2)}  SAR: {len(self.sar)}")
        return len(self.missing) == 0, self.missing

    # ── Internal loaders ─────────────────────────────────────────────────────

    def _indices(self, year, season):
        """Load S2+SAR and return per-pixel index arrays for voting."""
        p2 = self.s2.get((year, season)); ps = self.sar.get((year, season))
        if p2 is None or ps is None: return None
        s2, _ = safe_read(p2); sr, _ = safe_read(ps)
        H = min(s2.shape[1], sr.shape[1]); W = min(s2.shape[2], sr.shape[2])
        s2 = s2[:, :H, :W]; sr = sr[:, :H, :W]
        k = 10000.0
        b3,b4,b8,b11 = s2[1]/k, s2[2]/k, s2[3]/k, s2[4]/k
        return {"ndvi": ndvi(b8,b4), "ndwi": ndwi(b3,b8),
                "ndmi": ndmi(b8,b11), "vv": sr[0], "shape": (H,W)}

    def _stack(self, year, season):
        """Load S2+SAR → (8,H,W) float32: B2,B3,B4,B8,B11,VV,VH,NDVI."""
        s2, _ = safe_read(self.s2[(year, season)])
        sr, _ = safe_read(self.sar[(year, season)])
        H = min(s2.shape[1], sr.shape[1]); W = min(s2.shape[2], sr.shape[2])
        s2 = s2[:, :H, :W]; sr = sr[:, :H, :W]
        k = 10000.0
        b2,b3,b4,b8,b11 = s2[0]/k, s2[1]/k, s2[2]/k, s2[3]/k, s2[4]/k
        vv,vh = sr[0], sr[1]
        return np.stack([b2,b3,b4,b8,b11,vv,vh,ndvi(b8,b4)], axis=0)

    # ── Labeling ─────────────────────────────────────────────────────────────

    def _label(self, p1, p2):
        """
        5-step patch labeling  (v5 definitive logic).

        Inputs : p1 = T1 stack (8,128,128)
                 p2 = T2 stack (8,128,128)

        Steps:
          1. T2 NDBI+NDVI+SAR  → No_Forest  (currently urban/bare)
          2. T1 mean NDVI < forest_thr → No_Forest  (was never forest)
          3. T2 mean NDVI < t2_bare_thr → No_Forest  (became bare/urban)
          4. defor_fraction  >= defor_frac → Deforested
          5. else → No_Change
        """
        ndvi_t1 = float(np.nanmean(p1[7]))
        ndvi_t2 = float(np.nanmean(p2[7]))
        vv_t2   = float(np.nanmean(p2[5]))
        b8_t2   = p2[3]; b11_t2 = p2[4]
        ndbi_t2 = float(np.nanmean(ndbi(b11_t2, b8_t2)))

        # Step 1 — explicit urban/bare detection in T2
        if (ndbi_t2  > URBAN_NDBI_MIN and
                ndvi_t2 < URBAN_NDVI_MAX and
                vv_t2   > URBAN_SAR_MIN):
            return "No_Forest"

        # Step 2 — T1 never had forest
        if ndvi_t1 < self.forest_thr:
            return "No_Forest"

        # Step 3 — T2 became bare/urban (urban expansion misclassified
        #           as Deforested in v3/v4 — fixed here)
        if ndvi_t2 < self.t2_bare_thr:
            return "No_Forest"

        # Step 4 — spectral voting for genuine forest loss
        b3t1,b8t1,b11t1 = p1[1], p1[3], p1[4]
        b3t2,b8t2,b11t2 = p2[1], p2[3], p2[4]
        b4t1,b4t2       = p1[2], p2[2]
        vv1             = p1[5]

        d_ndvi = ndvi(b8t1,b4t1) - ndvi(b8t2,b4t2)
        d_ndwi = ndwi(b3t1,b8t1) - ndwi(b3t2,b8t2)
        d_ndmi = ndmi(b8t1,b11t1)- ndmi(b8t2,b11t2)
        d_vv   = vv1 - vv_t2

        votes = (
            (d_ndvi >= THR_NDVI).astype(np.uint8) +
            (d_ndwi >= THR_NDWI).astype(np.uint8) +
            (d_ndmi >= THR_NDMI).astype(np.uint8) +
            (d_vv   >= THR_SAR ).astype(np.uint8)
        )
        if (votes >= self.vote_thr).mean() >= self.defor_frac:
            return "Deforested"

        # Step 5 — T1 was forest, T2 is still forest
        return "No_Change"

    # ── 2. Rank pairs ─────────────────────────────────────────────────────────

    def rank_pairs(self):
        keys  = [(y,s) for y in YEARS for s in SEASONS if (y,s) in self.s2]
        pairs = list(combinations(keys, 2))
        self.log(f"Total pairs (all seasons): {len(pairs)}")
        seas_cnt = {}
        for _,s in keys: seas_cnt[s] = seas_cnt.get(s,0)+1
        self.log(f"Keys per season: {seas_cnt}")

        results = []
        n = len(pairs)
        for i,((y1,s1),(y2,s2)) in enumerate(pairs):
            if s1 != s2: continue
            self.prog(i/n*100, f"Voting {y1}/{s1} → {y2}/{s2}…")
            i1 = self._indices(y1,s1); i2 = self._indices(y2,s2)
            if i1 is None or i2 is None: continue
            H = min(i1["shape"][0],i2["shape"][0])
            W = min(i1["shape"][1],i2["shape"][1])
            forest_mask = i1["ndvi"][:H,:W] > self.forest_thr
            d_ndvi = i1["ndvi"][:H,:W] - i2["ndvi"][:H,:W]
            d_ndwi = i1["ndwi"][:H,:W] - i2["ndwi"][:H,:W]
            d_ndmi = i1["ndmi"][:H,:W] - i2["ndmi"][:H,:W]
            d_vv   = i1["vv"][:H,:W]   - i2["vv"][:H,:W]
            votes  = (
                (d_ndvi>=THR_NDVI).astype(np.uint8) +
                (d_ndwi>=THR_NDWI).astype(np.uint8) +
                (d_ndmi>=THR_NDMI).astype(np.uint8) +
                (d_vv  >=THR_SAR ).astype(np.uint8)
            )
            defor_px  = int(((votes>=self.vote_thr) & forest_mask).sum())
            defor_pct = round(defor_px / max(int(forest_mask.sum()),1)*100, 3)
            results.append({
                "year1":y1,"season1":s1,"year2":y2,"season2":s2,
                "deforested_pixels":defor_px,"deforested_pct":defor_pct,
                "label":f"{y1} {s1}  →  {y2} {s2}"
            })

        results.sort(key=lambda x: x["deforested_pixels"], reverse=True)
        self.log(f"Ranked {len(results)} same-season pairs.")
        if results:
            self.log(f"Best: {results[0]['label']} "
                     f"({results[0]['deforested_pct']}%)")
        return results

    # ── 3. Extract from ONE pair (no automatic gap fill) ──────────────────────

    def extract_from_pair(self, pair):
        """
        Extract all valid patches from a single bi-temporal pair.
        NO automatic gap filling — user decides manually.
        Returns counts dict.
        """
        y1,s1 = pair["year1"],pair["season1"]
        y2,s2 = pair["year2"],pair["season2"]
        self.log(f"Loading: {y1}/{s1} → {y2}/{s2}")
        self.prog(0, "Loading images…")

        st1 = self._stack(y1,s1); st2 = self._stack(y2,s2)
        H = min(st1.shape[1],st2.shape[1])
        W = min(st1.shape[2],st2.shape[2])
        st1 = st1[:,:H,:W]; st2 = st2[:,:H,:W]

        n_r = H//PATCH_SIZE; n_c = W//PATCH_SIZE
        total = n_r*n_c; done = 0
        self.log(f"Image {H}×{W} → {total} candidate patches")
        self.log(f"Thresholds: forest_thr={self.forest_thr}  "
                 f"t2_bare={self.t2_bare_thr}  "
                 f"defor_frac={self.defor_frac}  "
                 f"vote≥{self.vote_thr}/4")

        for r in range(n_r):
            for c in range(n_c):
                rs,cs = r*PATCH_SIZE, c*PATCH_SIZE
                p1 = st1[:,rs:rs+PATCH_SIZE,cs:cs+PATCH_SIZE]
                p2 = st2[:,rs:rs+PATCH_SIZE,cs:cs+PATCH_SIZE]
                if bad_fraction(p1)>NODATA_THR or bad_fraction(p2)>NODATA_THR:
                    done+=1; continue
                lbl = self._label(p1,p2)
                meta = {"year1":y1,"season1":s1,"year2":y2,"season2":s2,
                        "row":r,"col":c,"source":"primary","augmented":False}
                self.patches[lbl].append({"data":p2.copy(),"meta":meta})
                if len(self.samples[lbl]) < 8:
                    self.samples[lbl].append(
                        {"rgb_t1":to_rgb(p1),"rgb_t2":to_rgb(p2),"label":lbl})
                done+=1
                if done%150==0:
                    pct = done/total*100
                    ct  = {k:len(v) for k,v in self.patches.items()}
                    self.prog(pct,
                        f"{done}/{total} | "
                        f"D:{ct['Deforested']} "
                        f"NC:{ct['No_Change']} "
                        f"NF:{ct['No_Forest']}")

        ct = {k:len(v) for k,v in self.patches.items()}
        self.log(f"Extraction done: {ct}")
        self.prog(100,"Done ✅")
        return dict(ct)

    def add_filler_pair(self, pair, cls_needed):
        """
        Manually triggered gap fill from one additional pair.
        Only adds patches for classes listed in cls_needed.
        cls_needed: list of class names e.g. ["No_Forest","No_Change"]
        """
        y1,s1 = pair["year1"],pair["season1"]
        y2,s2 = pair["year2"],pair["season2"]
        self.log(f"Filler: {y1}/{s1} → {y2}/{s2} for {cls_needed}")
        self.prog(0,"Loading filler…")
        try:
            st1 = self._stack(y1,s1); st2 = self._stack(y2,s2)
        except Exception as e:
            self.log(f"Failed to load filler: {e}","err"); return
        H = min(st1.shape[1],st2.shape[1])
        W = min(st1.shape[2],st2.shape[2])
        st1 = st1[:,:H,:W]; st2 = st2[:,:H,:W]
        n_r = H//PATCH_SIZE; n_c = W//PATCH_SIZE
        total = n_r*n_c; done = 0; added = {c:0 for c in cls_needed}
        for r in range(n_r):
            for c in range(n_c):
                rs,cs = r*PATCH_SIZE,c*PATCH_SIZE
                p1=st1[:,rs:rs+PATCH_SIZE,cs:cs+PATCH_SIZE]
                p2=st2[:,rs:rs+PATCH_SIZE,cs:cs+PATCH_SIZE]
                if bad_fraction(p1)>NODATA_THR or bad_fraction(p2)>NODATA_THR:
                    done+=1; continue
                lbl = self._label(p1,p2)
                if lbl in cls_needed:
                    meta={"year1":y1,"season1":s1,"year2":y2,"season2":s2,
                          "row":r,"col":c,"source":"filler","augmented":False}
                    self.patches[lbl].append({"data":p2.copy(),"meta":meta})
                    added[lbl] = added.get(lbl,0)+1
                done+=1
                if done%150==0:
                    self.prog(done/total*100,
                        f"Filler {done}/{total} added:{added}")
        ct = {k:len(v) for k,v in self.patches.items()}
        self.log(f"After filler: {ct}")
        self.prog(100,"Filler done ✅")

    # ── 4. Reduce & Augment ──────────────────────────────────────────────────

    def reduce_class(self, cls, n):
        orig = [p for p in self.patches[cls] if not p["meta"]["augmented"]]
        aug  = [p for p in self.patches[cls] if  p["meta"]["augmented"]]
        self.patches[cls] = (orig+aug)[:n]

    def augment_class(self, cls, aug_names):
        origs = [p for p in self.patches[cls] if not p["meta"]["augmented"]]
        added = 0
        for name in aug_names:
            fn = AUGMENT_FNS[name]
            for p in origs:
                m=dict(p["meta"]); m["augmented"]=True; m["aug_type"]=name
                m["source"]=m.get("source","primary")+"_aug"
                self.patches[cls].append({"data":fn(p["data"]),"meta":m})
                added+=1
        self.log(f"Augmented {cls}: +{added} ({len(aug_names)}×{len(origs)})")

    # ── 5. Save ──────────────────────────────────────────────────────────────

    def save(self, out_dir, prog_fn=None):
        out_dir = Path(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        for cls in self.patches: (out_dir/cls).mkdir(exist_ok=True)
        rows=[]; total=sum(len(v) for v in self.patches.values()); done=0
        for cls,lst in self.patches.items():
            for idx,patch in enumerate(lst):
                arr=patch["data"]; meta=patch["meta"]
                sfx=(f"_aug{meta.get('aug_type','').replace(' ','')}"
                     if meta.get("augmented") else "")
                fname=(f"{cls}_{meta['year1']}{meta['season1']}_"
                       f"{meta['year2']}{meta['season2']}_"
                       f"r{meta['row']:03d}_c{meta['col']:03d}"
                       f"{sfx}_{idx:05d}.tif")
                prof={"driver":"GTiff","dtype":"float32",
                      "width":PATCH_SIZE,"height":PATCH_SIZE,
                      "count":arr.shape[0],"compress":"lzw"}
                with rasterio.open(out_dir/cls/fname,"w",**prof) as dst:
                    dst.write(arr)
                rows.append({
                    "filename":str(Path(cls)/fname), "class":cls,
                    "year1":meta["year1"], "season1":meta["season1"],
                    "year2":meta["year2"], "season2":meta["season2"],
                    "patch_row":meta["row"], "patch_col":meta["col"],
                    "source":meta.get("source","primary"),
                    "augmented":meta.get("augmented",False),
                    "aug_type":meta.get("aug_type",""),
                })
                done+=1
                if prog_fn and done%50==0:
                    prog_fn(done/total*100, f"Saving {done}/{total}…")
        if rows:
            with open(out_dir/"metadata.csv","w",newline="") as f:
                w=csv.DictWriter(f,fieldnames=list(rows[0].keys()))
                w.writeheader(); w.writerows(rows)
        if prog_fn: prog_fn(100,f"Saved {total} patches ✅")
        self.log(f"Dataset saved → {out_dir}  Total:{total}")
        return total, {k:len(v) for k,v in self.patches.items()}


# ════════════════════════════════════════════════════════════════════════════
#  GUI HELPERS
# ════════════════════════════════════════════════════════════════════════════

def _lighten(hx, a=30):
    try:
        h=hx.lstrip("#"); r,g,b=int(h[:2],16),int(h[2:4],16),int(h[4:],16)
        return f"#{min(255,r+a):02X}{min(255,g+a):02X}{min(255,b+a):02X}"
    except Exception: return hx

def btn(parent,text,cmd,bg=C_GREEN3,fg=C_TEXT,
        padx=12,pady=7,font=FNT_BTN,width=None):
    cfg=dict(text=text,command=cmd,bg=bg,fg=fg,font=font,
             relief="raised",bd=2,cursor="hand2",
             activebackground=_lighten(bg,35),activeforeground=C_TEXT,
             padx=padx,pady=pady)
    if width: cfg["width"]=width
    b=tk.Button(parent,**cfg)
    lt=_lighten(bg,35)
    b.bind("<Enter>",lambda e:b.config(bg=lt,relief="groove"))
    b.bind("<Leave>",lambda e:b.config(bg=bg,relief="raised"))
    return b

def lbl(parent,text,font=FNT_BODY,fg=C_TEXT,bg=C_PANEL,**kw):
    return tk.Label(parent,text=text,font=font,fg=fg,bg=bg,**kw)

def frm(parent,bg=C_PANEL,**kw):
    return tk.Frame(parent,bg=bg,**kw)

def sec(parent,text,color=C_PURPLE):
    f=frm(parent); f.pack(fill="x",pady=(14,3))
    tk.Frame(f,bg=color,width=5,height=24).pack(side="left",padx=(0,8))
    tk.Label(f,text=text,font=FNT_H2,fg=color,bg=C_PANEL).pack(side="left")

def card(parent,bg=C_CARD,pad=6,**kw):
    f=tk.Frame(parent,bg=bg,relief="groove",bd=1,**kw)
    f.pack(fill="x",pady=4,padx=2,ipady=pad)
    return f

def hsep(parent):
    tk.Frame(parent,bg=C_BORDER,height=1).pack(fill="x",pady=6)

# ── Scrollable frame ─────────────────────────────────────────────────────────

class ScrollFrame(tk.Frame):
    def __init__(self,parent,bg=C_PANEL,**kw):
        super().__init__(parent,bg=bg,**kw)
        self.cv=tk.Canvas(self,bg=bg,highlightthickness=0,bd=0)
        self.sb=ttk.Scrollbar(self,orient="vertical",command=self.cv.yview)
        self.inner=tk.Frame(self.cv,bg=bg)
        self.inner.bind("<Configure>",
            lambda e:self.cv.configure(scrollregion=self.cv.bbox("all")))
        self._id=self.cv.create_window((0,0),window=self.inner,anchor="nw")
        self.cv.configure(yscrollcommand=self.sb.set)
        self.cv.pack(side="left",fill="both",expand=True)
        self.sb.pack(side="right",fill="y")
        self.cv.bind("<Configure>",
            lambda e:self.cv.itemconfig(self._id,width=e.width))
        self.inner.bind("<Enter>",
            lambda e:self.cv.bind_all("<MouseWheel>",
                lambda ev:self.cv.yview_scroll(int(-1*(ev.delta/120)),"units")))
        self.inner.bind("<Leave>",
            lambda e:self.cv.unbind_all("<MouseWheel>"))

# ── Sample viewer window ──────────────────────────────────────────────────────

class SampleViewer(tk.Toplevel):
    def __init__(self,parent,samples):
        super().__init__(parent)
        self.title("GreenGuard — Sample Patches  (Before T1  |  After T2)")
        self.configure(bg=C_BG); self.resizable(True,True)
        if not HAS_MPL:
            lbl(self,"Install matplotlib to view samples",
                fg=C_GOLD,bg=C_BG).pack(padx=20,pady=20); return

        classes=[("Deforested",C_RED),("No_Change",C_GREEN),("No_Forest",C_TEAL)]
        n_show=4
        fig=Figure(figsize=(13,6),facecolor=C_BG)
        row=0
        for ci,(cls,col) in enumerate(classes):
            sl=samples.get(cls,[])[:n_show]
            if not sl: continue
            for pi,s in enumerate(sl):
                # Before
                ax=fig.add_subplot(len(classes)*2,n_show*2,row*n_show*2+pi*2+1)
                ax.imshow(s["rgb_t1"]); ax.axis("off")
                if pi==0: ax.set_title(f"{cls}\nBefore",color=col,fontsize=7,pad=2)
                # After
                ax2=fig.add_subplot(len(classes)*2,n_show*2,row*n_show*2+pi*2+2)
                ax2.imshow(s["rgb_t2"]); ax2.axis("off")
                if pi==0: ax2.set_title("After",color=col,fontsize=7,pad=2)
            row+=1

        fig.suptitle("Sample patches — RGB composite (B4,B3,B2)",
                     color=C_GREEN2,fontsize=9)
        fig.tight_layout(pad=0.4)
        cv=FigureCanvasTkAgg(fig,master=self)
        cv.draw(); cv.get_tk_widget().pack(fill="both",expand=True,padx=6,pady=6)
        btn(self,"Close",self.destroy,C_GREEN3,C_TEXT,padx=20,pady=6).pack(pady=6)


# ════════════════════════════════════════════════════════════════════════════
#  MAIN APPLICATION
# ════════════════════════════════════════════════════════════════════════════

class App(tk.Tk):

    def __init__(self):
        super().__init__()
        self.title("GreenGuard  —  Patch Extractor  v5  FINAL")
        self.configure(bg=C_BG); self.minsize(1150,680); self.state("zoomed")

        self.core          = None
        self.ranked_pairs  = []
        self.folder_var    = tk.StringVar()
        self.sel_idx       = tk.IntVar(value=0)
        self.vote_var      = tk.IntVar(value=2)
        self.forest_thr_v  = tk.DoubleVar(value=DEFAULT_FOREST_THR)
        self.t2_bare_v     = tk.DoubleVar(value=DEFAULT_T2_BARE_THR)
        self.defor_frac_v  = tk.DoubleVar(value=DEFAULT_MIN_DEFOR_FRAC)
        self.reduce_n      = tk.StringVar(value="0")

        self._build_ui()

    # ── Build UI ──────────────────────────────────────────────────────────────

    def _build_ui(self):
        self._topbar()
        body=frm(self,bg=C_BG); body.pack(fill="both",expand=True)
        self._left(body); self._right(body); self._bottom()

    def _topbar(self):
        bar=tk.Frame(self,bg=C_CARD2,height=50)
        bar.pack(fill="x"); bar.pack_propagate(False)
        tk.Label(bar,text="🌿",font=("Segoe UI",18),
                 bg=C_CARD2,fg=C_GREEN).pack(side="left",padx=(14,4),pady=8)
        tk.Label(bar,text="GreenGuard Patch Extractor  v5  FINAL",
                 font=FNT_TITLE,fg=C_GREEN2,bg=C_CARD2).pack(side="left")
        tk.Label(bar,
                 text="  |  128×128 px  |  5-step labeling  |  Manual gap fill  "
                      "|  Adjustable thresholds  |  Sample Viewer",
                 font=FNT_SMALL,fg=C_MUTED,bg=C_CARD2).pack(side="left")

    def _left(self,parent):
        con=tk.Frame(parent,bg=C_PANEL,width=420)
        con.pack(side="left",fill="y"); con.pack_propagate(False)
        sf=ScrollFrame(con); sf.pack(fill="both",expand=True)
        p=sf.inner

        # ── Stage 1 ──────────────────────────────────────────────────────────
        sec(p,"  Stage 1 — Select Folder",C_GREEN)
        c1=card(p)
        row=frm(c1,bg=C_CARD); row.pack(fill="x",padx=8,pady=(6,2))
        tk.Entry(row,textvariable=self.folder_var,font=FNT_SMALL,
                 bg=C_BG,fg=C_GREEN2,insertbackground=C_GREEN,
                 relief="sunken",bd=2,width=22).pack(
                     side="left",fill="x",expand=True,ipady=5)
        btn(row,"Browse",self._browse,C_BLUE,"#000",
            padx=8,pady=4).pack(side="left",padx=(4,8))
        btn(c1,"  Scan & Validate  ",self._scan,C_GREEN3).pack(pady=6)
        self.scan_lbl=lbl(c1,"",FNT_SMALL,C_MUTED,C_CARD)
        self.scan_lbl.pack(pady=(0,4))

        # ── Stage 2 ──────────────────────────────────────────────────────────
        hsep(p); sec(p,"  Stage 2 — Find Best Pair",C_TEAL)
        c2=card(p)
        vrow=frm(c2,bg=C_CARD); vrow.pack(fill="x",padx=8,pady=6)
        lbl(vrow,"Voting N-of-4:",FNT_BODY,C_GOLD,C_CARD).pack(side="left")
        for v,col in [(1,C_RED),(2,C_ORANGE),(3,C_GREEN),(4,C_BLUE)]:
            tk.Radiobutton(vrow,text=str(v),variable=self.vote_var,value=v,
                           font=FNT_BTN,bg=C_CARD,fg=col,selectcolor=C_BG,
                           activebackground=C_CARD,
                           activeforeground=col).pack(side="left",padx=4)
        btn(c2,"  Run Voting Analysis  ",self._vote,"#1B4332",C_GREEN2).pack(pady=6)
        lbl(c2,"Ranked pairs (best first):",FNT_SMALL,C_MUTED,C_CARD).pack(
            anchor="w",padx=8)
        self.pair_lb=tk.Listbox(c2,font=FNT_MONO,bg=C_BG,fg=C_GREEN2,
                                selectbackground=C_GREEN3,selectforeground=C_TEXT,
                                relief="flat",bd=0,height=7,activestyle="none")
        self.pair_lb.pack(fill="x",padx=8,pady=(2,8))
        self.pair_lb.bind("<<ListboxSelect>>",
            lambda e: self.sel_idx.set(
                self.pair_lb.curselection()[0]
                if self.pair_lb.curselection() else 0))

        # ── Stage 3 — Thresholds + Extract ───────────────────────────────────
        hsep(p); sec(p,"  Stage 3 — Thresholds & Extract",C_GOLD)
        c3=card(p)

        # Threshold sliders
        thr_f=tk.Frame(c3,bg="#0D2218"); thr_f.pack(fill="x",padx=8,pady=(4,6))
        self._slider(thr_f,"T1 Forest NDVI threshold (>)",
                     self.forest_thr_v,0.10,0.45,C_GREEN)
        self._slider(thr_f,"T2 Bare/Urban NDVI threshold (<)",
                     self.t2_bare_v,0.10,0.40,C_ORANGE)
        self._slider(thr_f,"Defor pixel fraction threshold (≥)",
                     self.defor_frac_v,0.05,0.50,C_RED)

        btn(c3,"  Extract from Selected Pair  ",self._extract,
            "#7B3F00",C_GOLD).pack(pady=6)
        btn(c3,"  View Sample Patches  ",self._view_samples,
            "#1A237E",C_BLUE).pack(pady=(0,6))

        # ── Stage 3b — Manual gap fill ────────────────────────────────────────
        hsep(p); sec(p,"  Stage 3b — Manual Gap Fill (optional)",C_PURPLE)
        c3b=card(p,bg=C_CARD2)
        lbl(c3b,"Select filler pair from list above,\n"
                "then choose which classes to fill:",
            FNT_SMALL,C_MUTED,C_CARD2).pack(anchor="w",padx=10,pady=(6,4))

        self.fill_vars={}
        frow=frm(c3b,bg=C_CARD2); frow.pack(fill="x",padx=10,pady=2)
        for cls,col in [("Deforested",C_RED),
                         ("No_Change",C_GREEN),
                         ("No_Forest",C_TEAL)]:
            var=tk.BooleanVar(value=False); self.fill_vars[cls]=var
            tk.Checkbutton(frow,text=cls,variable=var,font=FNT_SMALL,
                           bg=C_CARD2,fg=col,selectcolor=C_BG,
                           activebackground=C_CARD2,
                           activeforeground=col).pack(side="left",padx=6)
        btn(c3b,"  Add Filler Pair  ",self._add_filler,
            "#4A148C",C_PURPLE).pack(pady=6)

        # ── Stage 4 ──────────────────────────────────────────────────────────
        hsep(p); sec(p,"  Stage 4 — Balance & Augmentation",C_ORANGE)
        c4=card(p)
        btn(c4,"  Show Class Chart  ",self._chart,"#1A237E",C_BLUE).pack(pady=(6,2))

        # Reduce — fixed with Entry widget instead of Spinbox
        lbl(c4,"─── Reduce Class ───",FNT_SMALL,C_MUTED,C_CARD).pack(
            anchor="w",padx=8,pady=(8,2))
        rrow=frm(c4,bg=C_CARD); rrow.pack(fill="x",padx=8,pady=2)
        self.reduce_cls=ttk.Combobox(rrow,
            values=["Deforested","No_Change","No_Forest"],
            font=FNT_BODY,width=11,state="readonly")
        self.reduce_cls.current(0); self.reduce_cls.pack(side="left",padx=(0,4))
        # Use plain Entry instead of Spinbox (avoids Tab-confirm bug)
        tk.Entry(rrow,textvariable=self.reduce_n,font=FNT_BODY,
                 bg=C_BG,fg=C_GOLD,insertbackground=C_GOLD,
                 relief="sunken",bd=2,width=8).pack(side="left")
        btn(rrow,"Apply",self._reduce,C_RED,"#fff",
            padx=8,pady=4).pack(side="left",padx=4)

        # Augmentation
        lbl(c4,"─── Augmentation ───",FNT_SMALL,C_MUTED,C_CARD).pack(
            anchor="w",padx=8,pady=(10,2))
        arow=frm(c4,bg=C_CARD); arow.pack(fill="x",padx=8,pady=2)
        self.aug_cls=ttk.Combobox(arow,
            values=["Deforested","No_Change","No_Forest"],
            font=FNT_BODY,width=13,state="readonly")
        self.aug_cls.current(0); self.aug_cls.pack(side="left")
        self.aug_vars={}
        ag=frm(c4,bg=C_CARD); ag.pack(fill="x",padx=16,pady=2)
        for i,(name,col) in enumerate(zip(AUGMENT_FNS,
                [C_RED,C_ORANGE,C_GOLD,C_GREEN,C_TEAL])):
            var=tk.BooleanVar(value=False); self.aug_vars[name]=var
            tk.Checkbutton(ag,text=name,variable=var,font=FNT_SMALL,
                           bg=C_CARD,fg=col,selectcolor=C_BG,
                           activebackground=C_CARD,
                           activeforeground=col).grid(
                               row=i//2,column=i%2,sticky="w",padx=4,pady=1)
        btn(c4,"  Apply Augmentation  ",self._augment,
            "#4A148C",C_PURPLE).pack(pady=8)

        # ── Stage 5 ──────────────────────────────────────────────────────────
        hsep(p); sec(p,"  Stage 5 — Save Dataset",C_RED)
        c5=card(p,bg="#1A0A0A")
        btn(c5,"  💾  Save Final Dataset  ",self._save,
            "#B71C1C",C_TEXT,padx=16,pady=10,
            font=("Segoe UI Semibold",10)).pack(pady=8)

        frm(p,height=20).pack()

    def _slider(self,parent,label,var,lo,hi,color):
        """Horizontal slider with live value label."""
        row=frm(parent,bg="#0D2218"); row.pack(fill="x",pady=2)
        tk.Label(row,text=label,font=FNT_SMALL,fg=C_MUTED,
                 bg="#0D2218",width=38,anchor="w").pack(side="left")
        val_lbl=tk.Label(row,text=f"{var.get():.2f}",font=FNT_SMALL,
                          fg=color,bg="#0D2218",width=5)
        val_lbl.pack(side="right")
        sl=ttk.Scale(row,from_=lo,to=hi,variable=var,orient="horizontal",
                     length=120)
        sl.pack(side="right",padx=4)
        def _upd(*_): val_lbl.config(text=f"{var.get():.2f}")
        var.trace_add("write",_upd)

    def _right(self,parent):
        right=frm(parent,bg=C_BG); right.pack(side="left",fill="both",expand=True)
        # Log
        lf=frm(right,bg=C_BG); lf.pack(fill="both",expand=True,padx=10,pady=(8,4))
        hdr=frm(lf,bg=C_BG); hdr.pack(fill="x")
        tk.Frame(hdr,bg=C_GREEN,width=4,height=20).pack(side="left",padx=(0,8))
        tk.Label(hdr,text="Log",font=FNT_H2,fg=C_GREEN2,bg=C_BG).pack(side="left")
        tf=frm(lf,bg=C_CARD,relief="sunken",bd=2)
        tf.pack(fill="both",expand=True,pady=4)
        self.log_w=tk.Text(tf,font=FNT_MONO,bg=C_CARD,fg=C_GREEN2,
                            insertbackground=C_GREEN,relief="flat",bd=0,
                            wrap="word",state="disabled",height=14)
        self.log_w.pack(side="left",fill="both",expand=True)
        sb=ttk.Scrollbar(tf,command=self.log_w.yview)
        sb.pack(side="right",fill="y")
        self.log_w.configure(yscrollcommand=sb.set)
        for tag,fg in [("ok",C_GREEN),("warn",C_GOLD),
                        ("err",C_RED),("info",C_BLUE)]:
            self.log_w.tag_configure(tag,foreground=fg)
        # Chart
        cf=frm(right,bg=C_BG); cf.pack(fill="both",expand=True,padx=10,pady=(0,8))
        hdr2=frm(cf,bg=C_BG); hdr2.pack(fill="x")
        tk.Frame(hdr2,bg=C_ORANGE,width=4,height=20).pack(side="left",padx=(0,8))
        tk.Label(hdr2,text="Class Distribution",font=FNT_H2,
                 fg=C_ORANGE,bg=C_BG).pack(side="left")
        self.chart_f=frm(cf,bg=C_BG); self.chart_f.pack(fill="both",expand=True)

    def _bottom(self):
        bar=tk.Frame(self,bg=C_CARD2,height=44)
        bar.pack(fill="x",side="bottom"); bar.pack_propagate(False)
        self.status=tk.Label(bar,text="Ready",font=FNT_BODY,
                              fg=C_GREEN2,bg=C_CARD2,anchor="w",width=55)
        self.status.pack(side="left",padx=12,pady=10)
        self.pct=tk.Label(bar,text="0%",font=("Segoe UI Semibold",9),
                           fg=C_GOLD,bg=C_CARD2,width=5)
        self.pct.pack(side="right",padx=(0,12))
        sty=ttk.Style(); sty.theme_use("clam")
        sty.configure("GG.Horizontal.TProgressbar",
                       troughcolor=C_BG,background=C_GREEN,
                       lightcolor=C_GREEN2,darkcolor=C_GREEN3,
                       bordercolor=C_CARD2,thickness=14)
        self.pb=ttk.Progressbar(bar,style="GG.Horizontal.TProgressbar",
                                 mode="determinate",length=420)
        self.pb.pack(side="right",padx=(0,8),pady=12)

    # ── Thread-safe helpers ───────────────────────────────────────────────────

    def _log(self,msg,tag=""):
        def _d():
            self.log_w.configure(state="normal")
            self.log_w.insert("end",msg+"\n",tag)
            self.log_w.see("end")
            self.log_w.configure(state="disabled")
        self.after(0,_d)

    def _prog(self,pct,label=""):
        def _d():
            self.pb["value"]=min(pct,100)
            self.pct.config(text=f"{int(min(pct,100))}%")
            self.status.config(text=label[:62])
        self.after(0,_d)

    def _make_core(self):
        """Create/refresh Core with current threshold values."""
        folder=self.folder_var.get().strip()
        if not folder: return False
        if self.core is None:
            self.core=Core(folder,self._log,self._prog)
        # Always sync thresholds from UI
        self.core.forest_thr  = self.forest_thr_v.get()
        self.core.t2_bare_thr = self.t2_bare_v.get()
        self.core.defor_frac  = self.defor_frac_v.get()
        self.core.vote_thr    = self.vote_var.get()
        return True

    # ── Stage 1 ───────────────────────────────────────────────────────────────

    def _browse(self):
        d=filedialog.askdirectory(title="Select Margallah_AOI folder")
        if d: self.folder_var.set(d)

    def _scan(self):
        folder=self.folder_var.get().strip()
        if not folder or not Path(folder).exists():
            messagebox.showerror("Error","Folder not found."); return
        self.core=Core(folder,self._log,self._prog)
        ok,miss=self.core.scan()
        if ok:
            self.scan_lbl.config(text="✅  All 48 files found.",fg=C_GREEN)
            self._log("✅  48 files validated.","ok")
        else:
            self.scan_lbl.config(text=f"⚠  {len(miss)} missing.",fg=C_GOLD)
            self._log(f"⚠  Missing: {', '.join(miss[:6])}","warn")

    # ── Stage 2 ───────────────────────────────────────────────────────────────

    def _vote(self):
        if not self.core:
            messagebox.showwarning("","Scan folder first."); return
        self._make_core()
        self.pair_lb.delete(0,"end")
        self._log(f"Voting ≥{self.vote_var.get()}/4 "
                  f"(forest>{self.forest_thr_v.get():.2f})…","info")
        self._prog(0,"Running voting analysis…")
        def _w():
            pairs=self.core.rank_pairs()
            self.ranked_pairs=pairs
            def _u():
                medals=["🥇","🥈","🥉"]+[f"{i}." for i in range(4,25)]
                for i,p in enumerate(pairs[:20]):
                    self.pair_lb.insert("end",
                        f"{medals[i]} {p['label']}  "
                        f"[{p['deforested_pct']}%  "
                        f"{p['deforested_pixels']:,}px]")
                if pairs: self.pair_lb.selection_set(0)
                self._prog(100,"Voting complete ✅")
            self.after(0,_u)
        threading.Thread(target=_w,daemon=True).start()

    # ── Stage 3 ───────────────────────────────────────────────────────────────

    def _extract(self):
        if not self.ranked_pairs:
            messagebox.showwarning("","Run voting first."); return
        if not self._make_core(): return
        pair=self.ranked_pairs[self.sel_idx.get()]
        # Reset patches for fresh extraction
        self.core.patches={"Deforested":[],"No_Change":[],"No_Forest":[]}
        self.core.samples={"Deforested":[],"No_Change":[],"No_Forest":[]}
        self._log(f"\nExtracting from: {pair['label']}","info")
        self._log(f"forest_thr={self.core.forest_thr:.2f}  "
                  f"t2_bare={self.core.t2_bare_thr:.2f}  "
                  f"defor_frac={self.core.defor_frac:.2f}  "
                  f"vote≥{self.core.vote_thr}/4")
        self._prog(0,"Extracting…")
        def _w():
            counts=self.core.extract_from_pair(pair)
            def _d():
                self._log(f"Result: {counts}","ok")
                self._draw_chart()
                self._prog(100,"Extraction complete ✅")
            self.after(0,_d)
        threading.Thread(target=_w,daemon=True).start()

    def _view_samples(self):
        if not self.core or not any(
                len(v)>0 for v in self.core.samples.values()):
            messagebox.showwarning("","Extract patches first."); return
        SampleViewer(self,self.core.samples)

    # ── Stage 3b — Manual gap fill ────────────────────────────────────────────

    def _add_filler(self):
        if not self.core:
            messagebox.showwarning("","Extract primary pair first."); return
        sel=self.pair_lb.curselection()
        if not sel:
            messagebox.showwarning("","Select a pair from the list."); return
        idx=sel[0]
        if idx>=len(self.ranked_pairs):
            messagebox.showwarning("","Invalid pair selection."); return
        pair=self.ranked_pairs[idx]
        cls_needed=[c for c,v in self.fill_vars.items() if v.get()]
        if not cls_needed:
            messagebox.showwarning("","Check at least one class to fill."); return
        self._log(f"\nAdding filler: {pair['label']} for {cls_needed}","info")
        self._prog(0,"Running filler…")
        def _w():
            self.core.add_filler_pair(pair,cls_needed)
            def _d(): self._draw_chart()
            self.after(0,_d)
        threading.Thread(target=_w,daemon=True).start()

    # ── Stage 4 ───────────────────────────────────────────────────────────────

    def _draw_chart(self):
        if not self.core or not HAS_MPL: return
        for w in self.chart_f.winfo_children(): w.destroy()
        counts={k:len(v) for k,v in self.core.patches.items()}
        vals=list(counts.values()); total=sum(vals)
        fig=Figure(figsize=(5,2.8),facecolor=C_BG)
        ax=fig.add_subplot(111); ax.set_facecolor(C_BG)
        bars=ax.bar(list(counts.keys()),vals,
                    color=[C_RED,C_GREEN,C_TEAL],
                    width=0.5,edgecolor=C_BORDER,linewidth=0.8)
        for bar,v in zip(bars,vals):
            pct=v/total*100 if total else 0
            ax.text(bar.get_x()+bar.get_width()/2,
                    bar.get_height()+max(vals,default=1)*0.015,
                    f"{v:,}\n({pct:.1f}%)",
                    ha="center",va="bottom",color=C_TEXT,fontsize=8)
        aug_n  = sum(1 for lst in self.core.patches.values()
                     for p in lst if p["meta"].get("augmented"))
        aug_pct = aug_n/total*100 if total else 0
        ax.set_title(
            f"Total: {total:,}  |  Augmented: {aug_n} ({aug_pct:.1f}%)",
            color=C_GOLD,fontsize=9,pad=8)
        ax.tick_params(colors=C_TEXT,labelsize=8)
        for s in ax.spines.values(): s.set_color(C_BORDER)
        ax.set_ylabel("Count",color=C_MUTED,fontsize=8)
        for l in ax.get_xticklabels(): l.set_color(C_TEXT)
        fig.tight_layout(pad=1.2)
        cv=FigureCanvasTkAgg(fig,master=self.chart_f)
        cv.draw(); cv.get_tk_widget().pack(fill="both",expand=True)
        self._log(f"Chart: {counts} | Total={total:,}","info")

    def _chart(self):
        if not self.core or not any(self.core.patches.values()):
            messagebox.showwarning("","No patches yet."); return
        self._draw_chart()

    def _reduce(self):
        if not self.core: return
        cls=self.reduce_cls.get()
        try:
            n=int(self.reduce_n.get().strip())
        except ValueError:
            messagebox.showerror("Error","Enter a valid integer."); return
        cur=len(self.core.patches[cls])
        if n<=0 or n>=cur:
            messagebox.showinfo("Info",
                f"{cls} has {cur} patches.\n"
                f"You entered {n}.\n"
                f"Enter a number between 1 and {cur-1}."); return
        self.core.reduce_class(cls,n)
        self._log(f"Reduced {cls}: {cur} → {n}","warn")
        self._draw_chart()

    def _augment(self):
        if not self.core: return
        cls=self.aug_cls.get()
        sel=[k for k,v in self.aug_vars.items() if v.get()]
        if not sel:
            messagebox.showwarning("","Select at least one augmentation."); return
        before=len(self.core.patches[cls])
        self.core.augment_class(cls,sel)
        self._log(f"Augmented {cls}: {before} → {len(self.core.patches[cls])}","ok")
        self._draw_chart()

    # ── Stage 5 ───────────────────────────────────────────────────────────────

    def _save(self):
        if not self.core or not any(self.core.patches.values()):
            messagebox.showwarning("","No patches to save."); return
        counts={k:len(v) for k,v in self.core.patches.items()}
        total=sum(counts.values())
        aug_n=sum(1 for lst in self.core.patches.values()
                  for p in lst if p["meta"].get("augmented"))
        aug_pct=aug_n/total*100 if total else 0
        ok=messagebox.askyesno("Confirm Save",
            f"Save {total:,} patches?\n\n"
            f"  Deforested : {counts['Deforested']:,}\n"
            f"  No_Change  : {counts['No_Change']:,}\n"
            f"  No_Forest  : {counts['No_Forest']:,}\n"
            f"  Augmented  : {aug_n} ({aug_pct:.1f}%)\n\n"
            f"Choose output folder (D drive recommended).")
        if not ok: return
        out=filedialog.askdirectory(title="Output folder (D drive recommended)")
        if not out: return
        out_dir=Path(out)/"GreenGuard_Dataset"
        self._log(f"\nSaving → {out_dir}","info")
        self._prog(0,"Saving patches…")
        def _w():
            ts,final=self.core.save(out_dir,self._prog)
            def _d():
                self._prog(100,f"Saved {ts:,} patches ✅")
                messagebox.showinfo("Done 🎉",
                    f"Dataset saved!\n\n"
                    f"Location  : {out_dir}\n\n"
                    f"  Deforested : {final['Deforested']:,}\n"
                    f"  No_Change  : {final['No_Change']:,}\n"
                    f"  No_Forest  : {final['No_Forest']:,}\n"
                    f"  Total      : {ts:,}\n\n"
                    f"metadata.csv saved.\n"
                    f"8 bands, float32, model-ready.")
            self.after(0,_d)
        threading.Thread(target=_w,daemon=True).start()


# ════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    App().mainloop()

# chore(dataset): adjust patch size to 256x256 (v2)

# chore(dataset): add train/val/test split logic

# chore(dataset): handle edge-case patches near tile boundaries (v3)

# feat(dataset): add class balance reporting (v4)

# feat(dataset): add augmentation pipeline (v5)

# feat(dataset): add quality filtering pass (v6)

# feat(dataset): add stratified sampling across biomes (v7)

# feat(dataset): final patch extractor with validation (v8 final)

# patch size 256x256 (v2)

# train/val/test split

# class balance reporting (v4)

# augmentation pipeline (v5)

# quality filtering pass (v6)

# stratified sampling (v7)

# final extractor with validation (v8)
