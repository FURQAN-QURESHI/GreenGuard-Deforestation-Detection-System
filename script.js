// Initialize Leaflet map (kept for interactive map)
var map = L.map('map', { zoomControl: false }).setView([33.6844, 73.0479], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19
}).addTo(map);

// Make sure map redraws when container sizes are set
setTimeout(()=> map.invalidateSize(), 200);

// Sample: when "Analyze" clicked, show red markers on satellite thumb and update pie chart
document.getElementById('analyze').addEventListener('click', function(){
  placeSampleMarkers();
  updatePie(10); // 10% deforested as screenshot shows
});

// Reset clears markers and resets pie to 25/75 (original)
document.getElementById('reset').addEventListener('click', function(){
  clearMarkers();
  updatePie(25);
  document.getElementById('renameInput').value = '';
  document.getElementById('notifyCheck').checked = false;
});

// Monitor button demo
document.getElementById('monitor').addEventListener('click', function(){
  alert('Monitoring started for this area (demo).');
});

// Sample markers: random-ish positions to simulate screenshot red squares
function placeSampleMarkers(){
  const markersDiv = document.getElementById('markers');
  markersDiv.innerHTML = ''; // clear first
  // an example set of relative positions (percent)
  const positions = [
    [18,20],[36,36],[52,28],[70,24],[62,58],[40,62],[22,54],[88,36],[12,80],[72,80],[50,78]
  ];
  positions.forEach(pos => {
    const dot = document.createElement('div');
    dot.className = 'marker-dot';
    dot.style.left = pos[0] + '%';
    dot.style.top  = pos[1] + '%';
    markersDiv.appendChild(dot);
  });
}

// clear
function clearMarkers(){ document.getElementById('markers').innerHTML = ''; }

// Chart.js pie chart setup
const ctx = document.getElementById('pieChart').getContext('2d');
let pieChart = new Chart(ctx, {
  type: 'pie',
  data: {
    labels: ['No Forest','Forest'],
    datasets: [{
      data: [10,90],
      backgroundColor: ['#e11d48','#15803d'],
      borderWidth: 0
    }]
  },
  options: {
    responsive: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { boxWidth:12, padding:16 }
      },
      tooltip: {
        callbacks: {
          label: function(ctx){
            const v = ctx.parsed;
            return ctx.label + ': ' + v + '%';
          }
        }
      }
    }
  }
});

// function to update pie values (deforestedPercent)
function updatePie(defPercent){
  defPercent = Math.max(0, Math.min(100, defPercent));
  const forest = 100 - defPercent;
  pieChart.data.datasets[0].data = [defPercent, forest];
  pieChart.update();
}

// Initialize with 10% to match screenshot look
updatePie(10);

// Small extras: make Draw Polygon and Full Region buttons interactive demo
document.getElementById('drawPolygon').addEventListener('click', function(){
  alert('Polygon drawing mode (demo).');
});
document.getElementById('fullRegion').addEventListener('click', function(){
  alert('Selected full region (demo).');
});