// Simple interactive behavior for the Update page

// Predefined sample data for each area: image url and deforestation percent
const areaData = {
  1: { img: 'https://via.placeholder.com/520x300?text=Area+1+Preview', def: 10 },
  2: { img: 'https://via.placeholder.com/520x300?text=Area+2+Preview', def: 18 },
  3: { img: 'https://via.placeholder.com/520x300?text=Area+3+Preview', def: 5 },
  4: { img: 'https://via.placeholder.com/520x300?text=Area+4+Preview', def: 22 },
  5: { img: 'https://via.placeholder.com/520x300?text=Area+5+Preview', def: 12 },
  6: { img: 'https://via.placeholder.com/520x300?text=Area+6+Preview', def: 8 },
};

// references
const previewImage = document.getElementById('previewImage');
const resetBtn = document.getElementById('resetBtn');
const monitorBtn = document.getElementById('monitorBtn');
const cards = document.querySelectorAll('.area-card');

// Chart.js pie
const ctx = document.getElementById('updatePie').getContext('2d');
let pie = new Chart(ctx, {
  type: 'pie',
  data: {
    labels: ['No Forest','Forest'],
    datasets: [{
      data: [0,100], // start empty
      backgroundColor: ['#e11d48','#15803d']
    }]
  },
  options: {
    responsive: false,
    plugins: {
      legend: { position: 'right' }
    }
  }
});

// function to update pie with defPercent (0-100)
function updatePie(defPercent){
  defPercent = Math.max(0, Math.min(100, defPercent));
  pie.data.datasets[0].data = [defPercent, 100-defPercent];
  pie.update();
}

// card click handler
cards.forEach(card => {
  card.addEventListener('click', () => {
    const idx = card.getAttribute('data-index');
    const info = areaData[idx];
    if(info){
      previewImage.src = info.img;
      updatePie(info.def);
      // mark selected visually
      cards.forEach(c=> c.classList.remove('selected'));
      card.classList.add('selected');
    }
  });
});

// reset
resetBtn.addEventListener('click', () => {
  previewImage.src = 'https://via.placeholder.com/520x300?text=Select+an+Area';
  updatePie(0);
  cards.forEach(c=> c.classList.remove('selected'));
  // optionally reset dates to defaults
  document.getElementById('toDate').value = '2022-06-12';
  document.getElementById('fromDate').value = '2023-06-12';
});

// monitor demo
monitorBtn.addEventListener('click', () => {
  alert('Monitoring started for selected area (demo).');
});

// init default (show nothing)
updatePie(0);
document.getElementById('removeBtn').addEventListener('click', () => {
  alert('Area removed (demo).');
});

document.getElementById('analyzeBtn').addEventListener('click', () => {
  alert('Analyzing selected area (demo).');
});