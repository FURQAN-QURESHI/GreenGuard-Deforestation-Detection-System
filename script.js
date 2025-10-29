// Initialize Leaflet map
var map = L.map('map', { zoomControl: false }).setView([33.6844, 73.0479], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
maxZoom: 19
}).addTo(map);
setTimeout(() => map.invalidateSize(), 200);

// Analyze button
document.getElementById('analyze').addEventListener('click', function () {
placeSampleMarkers();
updatePie(10);
});

// Reset button
document.getElementById('reset').addEventListener('click', function () {
clearMarkers();
updatePie(25);
document.getElementById('renameInput').value = '';
document.getElementById('notifyCheck').checked = false;
});

// Monitor
document.getElementById('monitor').addEventListener('click', function () {
alert('Monitoring started for this area (demo).');
});

// Place demo markers
function placeSampleMarkers() {
const markersDiv = document.getElementById('markers');
markersDiv.innerHTML = '';
const positions = [
[18, 20],
[36, 36],
[52, 28],
[70, 24],
[62, 58],
[40, 62],
[22, 54],
[88, 36],
[12, 80],
[72, 80],
[50, 78]
];
positions.forEach((pos) => {
const dot = document.createElement('div');
dot.className = 'marker-dot';
dot.style.left = pos[0] + '%';
dot.style.top = pos[1] + '%';
document.getElementById('markers').appendChild(dot);
});
}

// Clear markers
function clearMarkers() {
document.getElementById('markers').innerHTML = '';
}

// Chart.js setup
const ctx = document.getElementById('pieChart').getContext('2d');
let pieChart = new Chart(ctx, {
type: 'pie',
data: {
labels: ['No Forest', 'Forest'],
datasets: [
{
data: [10, 90],
backgroundColor: ['#e11d48', '#15803d'],
borderWidth: 0
}
]
},
options: {
responsive: false,
plugins: {
legend: {
position: 'right',
labels: { boxWidth: 12, padding: 16 }
},
tooltip: {
callbacks: {
label: function (ctx) {
const v = ctx.parsed;
return ctx.label + ': ' + v + '%';
}
}
}
}
}
});

function updatePie(defPercent) {
defPercent = Math.max(0, Math.min(100, defPercent));
const forest = 100 - defPercent;
pieChart.data.datasets[0].data = [defPercent, forest];
pieChart.update();
}

// Initial load
updatePie(10);

// Demo polygon/full region
document.getElementById('drawPolygon').addEventListener('click', function () {
alert('Polygon drawing mode (demo).');
});
document.getElementById('fullRegion').addEventListener('click', function () {
alert('Selected full region (demo).');
});