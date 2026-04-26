var aoi = ee.Geometry.Polygon([[
  [72.86167826814015, 33.606685466304114],
  [72.95918193024953, 33.51628152752861],
  [73.0347129361089, 33.47791711851641],
  [73.20912089509328, 33.463597685950994],
  [73.41829087988546, 33.604935814541214],
  [73.44438340918234, 33.65410422847946],
  [73.44712999121359, 33.70838553744313],
  [73.39906480566671, 33.75355369928074],
  [73.35340287939718, 33.79693121050943],
  [73.29141502871744, 33.83230185537631],
  [73.22103386416666, 33.864807121790186],
  [73.18017845645181, 33.87136370234601],
  [73.0637920428776, 33.825599670988446],
  [72.98482780947916, 33.801068049067545],
  [72.89865379824869, 33.78566087751542],
  [72.81968956485025, 33.75284006979551],
  [72.81556969180338, 33.7122961667443],
  [72.84921532168619, 33.67916158197035],
  [72.86167826814015, 33.606685466304114],
]]);

// ── Print AOI area ──────────────────────────────
var areakm2 = aoi.area().divide(1e6);
print('AOI area (km²):', areakm2);
Map.centerObject(aoi, 10);
Map.addLayer(aoi, { color: 'red' }, 'AOI');

// ── Cloud masking ───────────────────────────────
function maskS2clouds(image) {
  var qa = image.select('QA60');
  var scl = image.select('SCL');
  var m1 = qa.bitwiseAnd(1 << 10).eq(0).and(qa.bitwiseAnd(1 << 11).eq(0));
  var m2 = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(11));
  return image.updateMask(m1).updateMask(m2);
}
function maskS2cloudsL1C(image) {
  var qa = image.select('QA60');
  return image.updateMask(
    qa.bitwiseAnd(1 << 10).eq(0).and(qa.bitwiseAnd(1 << 11).eq(0))
  );
}

// ── Season config ───────────────────────────────
// 3 seasons per year × 8 years (2017-2024) = 24 S2 + 24 SAR = 48 exports
var SEASONS = {
  'S1': { months: [1, 4], label: 'JanApr' },
  'S2': { months: [5, 8], label: 'MayAug' },
  'S3': { months: [9, 12], label: 'SepDec' }
};

// Cloud threshold per season (monsoon months cloudier)
function getCloudThreshold(seasonKey) {
  return seasonKey === 'S2' ? 50 : 15;  // May-Aug is monsoon
}

// ── Export Sentinel-2 ───────────────────────────
function exportS2(year, seasonKey) {
  var cfg = SEASONS[seasonKey];
  var start = ee.Date.fromYMD(year, cfg.months[0], 1);
  var end = ee.Date.fromYMD(year, cfg.months[1],
    cfg.months[1] === 12 ? 31 : 30);
  var label = year + '_' + cfg.label;
  var cloudThr = getCloudThreshold(seasonKey);

  var useL2 = year >= 2018;
  var col = useL2
    ? 'COPERNICUS/S2_SR_HARMONIZED'
    : 'COPERNICUS/S2';
  var maskFn = useL2 ? maskS2clouds : maskS2cloudsL1C;

  var s2 = ee.ImageCollection(col)
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudThr))
    .map(maskFn);

  print('S2 ' + label + ' (cloud<' + cloudThr + '%) — scenes:', s2.size());

  var composite = s2.median().clip(aoi);
  Map.addLayer(composite,
    { bands: ['B4', 'B3', 'B2'], min: 0, max: 3000 }, label);

  Export.image.toDrive({
    image: composite.select(['B2', 'B3', 'B4', 'B8', 'B11']),
    description: 'S2_' + label,
    folder: 'Margalla_AOI',
    fileNamePrefix: 'S2_' + label,
    region: aoi,
    scale: 10,
    maxPixels: 1e13,
    crs: 'EPSG:4326'
  });
}

// ── Export Sentinel-1 SAR (VV + VH) ────────────
function exportSAR(year, seasonKey) {
  var cfg = SEASONS[seasonKey];
  var start = ee.Date.fromYMD(year, cfg.months[0], 1);
  var end = ee.Date.fromYMD(year, cfg.months[1],
    cfg.months[1] === 12 ? 31 : 30);
  var label = year + '_' + cfg.label;

  var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.listContains(
      'transmitterReceiverPolarisation', 'VH'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'));

  print('SAR ' + label + ' — scenes:', s1.size());

  var composite = s1.select(['VV', 'VH']).median().clip(aoi);

  Export.image.toDrive({
    image: composite,
    description: 'SAR_' + label,
    folder: 'Margalla_AOI',
    fileNamePrefix: 'SAR_' + label,
    region: aoi,
    scale: 10,
    maxPixels: 1e13,
    crs: 'EPSG:4326'
  });
}

// ── Run exports: 2017–2024, 3 seasons each ──────
var years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
var seasonKeys = ['S1', 'S2', 'S3'];

years.forEach(function (year) {
  seasonKeys.forEach(function (sk) {
    exportS2(year, sk);
    exportSAR(year, sk);
  });
});

print('✅ Total exports: ' + (years.length * seasonKeys.length * 2) +
  ' (S2 × SAR × seasons × years)');
print('📋 Season windows:');
print('   S1: Jan–Apr  | cloud < 15%');
print('   S2: May–Aug  | cloud < 50% (monsoon)');
print('   S3: Sep–Dec  | cloud < 15%');
print('   SAR: no cloud filtering needed');
print('   Bands: B2,B3,B4,B8,B11 + VV,VH');
