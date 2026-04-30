const STUDENT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1dTUyhGPsye7yobfpfSPV__SePpKAY3GWBizySyqmZMs/gviz/tq?tqx=out:json';

let studentData = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const studentJson = await fetchSheetData(STUDENT_SHEET_URL);
        studentData = parseSheetData(studentJson);
        renderCharts();
        applyStaggeredAnimations();
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

async function fetchSheetData(url) {
    const res = await fetch(url);
    const text = await res.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    return JSON.parse(jsonStr);
}

function parseSheetData(json) {
    const rows = json.table.rows;
    return rows.map(row => {
        return row.c.map(cell => cell ? cell.v : null);
    }).filter(row => row[0] !== 'Timestamp' && row.join('') !== '');
}

function renderCharts() {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "#64748b";

    renderDisposalChart();
    renderBinsChart();
}


function renderDisposalChart() {
    const ctx = document.getElementById('disposalChart').getContext('2d');
    const answers = {};
    
    studentData.forEach(row => {
        // Col 16 is Q7 Disposal
        const ans = row[16] ? row[16].toString().trim() : 'No Answer';
        answers[ans] = (answers[ans] || 0) + 1;
    });

    const labels = Object.keys(answers).map(l => l.length > 30 ? l.substring(0, 30) + '...' : l);
    const data = Object.values(answers);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Households',
                data: data,
                backgroundColor: '#14b8a6',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

function renderBinsChart() {
    const ctx = document.getElementById('binsChart').getContext('2d');
    const answers = {};
    
    studentData.forEach(row => {
        // Col 20 is Q11 Dustbins
        const ans = row[20] ? row[20].toString().trim() : 'No Answer';
        answers[ans] = (answers[ans] || 0) + 1;
    });

    const labels = Object.keys(answers);
    const data = Object.values(answers);
    const colors = ['#2dd4bf', '#0d9488', '#5eead4', '#ccfbf1', '#99f6e4'];

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function applyStaggeredAnimations() {
    const cards = document.querySelectorAll('.chart-card');
    cards.forEach((card, index) => {
        card.classList.add('animate-fade-in');
        card.style.animationDelay = `${index * 0.1}s`;
    });
}
