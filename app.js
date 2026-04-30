const STUDENT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1dTUyhGPsye7yobfpfSPV__SePpKAY3GWBizySyqmZMs/gviz/tq?tqx=out:json';
const TEACHER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1W3JnbkFb3lu92m7fEn38JY3r56b7_V26WIFl5CnJWnE/gviz/tq?tqx=out:json';

// Global Data
let studentData = [];
let teacherData = [];
let schoolStats = {};

// Optional: Add mappings here if students spell the same school differently
const SCHOOL_ALIASES = {
    "skv malviya": "SKV Malviya",
    "skv": "SKV Malviya", // Mapped to SKV Malviya as requested
    "kv tughlaka bad": "KV Tughlakabad",
    "kv tughlakabad": "KV Tughlakabad",
    "kendriya vidyalaya tughlakabad": "KV Tughlakabad",
    "kendriya vidyalaya tuglakapad": "KV Tughlakabad", // Handling spelling variation
    "kendriya vidyalaya tuglakabad": "KV Tughlakabad",
    "kv tuglakabad": "KV Tughlakabad",
    "unknown school": "Not Specified",
    "school name": "Not Specified",
    "school name*": "Not Specified"
};

const CITY_ALIASES = {
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "10": "Not Specified",
    "unknown": "Not Specified"
};

function normalizeCityName(rawCity) {
    if (!rawCity) return 'Not Specified';
    let city = rawCity.toString().trim();
    for (let key in CITY_ALIASES) {
        if (city.toLowerCase() === key) {
            return CITY_ALIASES[key];
        }
    }
    // Capitalize first letter if not an alias
    return city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
}

// Hardcoded coordinates for the map
const SCHOOL_COORDINATES = {
    "SKV Malviya": [28.5355, 77.2154], // Approximate coordinates
    "KV Tughlakabad": [28.5134, 77.2612],
    "SKV": [28.5800, 77.2000], // Generic center
    "Cm Shri School": [28.7200, 77.1000] // Rohini area approx
};

// Chart and Map instances
let timelineChartInst = null;
let cityChartInst = null;
let awarenessChartInst = null;
let mapInst = null;

// Initialization
document.addEventListener('DOMContentLoaded', init);

async function init() {
    updateTimestamp();

    try {
        const [studentJson, teacherJson] = await Promise.all([
            fetchSheetData(STUDENT_SHEET_URL),
            fetchSheetData(TEACHER_SHEET_URL)
        ]);

        studentData = parseSheetData(studentJson);
        teacherData = parseSheetData(teacherJson);

        processData();
        renderMetrics();
        renderCharts();
        renderMap();
        renderLeaderboard();

        // Setup Search
        document.getElementById('schoolSearch').addEventListener('input', (e) => {
            renderLeaderboard(e.target.value);
        });

        applyStaggeredAnimations();

    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById('update-time').innerText = "Error loading data. Check console.";
    }
}

function updateTimestamp() {
    const now = new Date();
    document.getElementById('update-time').innerText = `Live Data • Updated: ${now.toLocaleTimeString()}`;
}

async function fetchSheetData(url) {
    const res = await fetch(url);
    const text = await res.text();
    // Extract JSON from Google Viz wrapper: /*O_o*/ google.visualization.Query.setResponse({ ... })
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    return JSON.parse(jsonStr);
}

function parseSheetData(json) {
    const rows = json.table.rows;
    // We skip the header parsing to be safe and just rely on indices based on the column order.
    // Ensure we handle empty values safely.
    return rows.map(row => {
        return row.c.map(cell => cell ? cell.v : null);
    }).filter(row => {
        // Filter out header row (Timestamp) and completely empty rows
        return row[0] !== 'Timestamp' && row.join('') !== '';
    });
}

function normalizeSchoolName(rawName) {
    if (!rawName) return "Not Specified";

    let n = rawName.toString().toLowerCase().trim();

    // Check aliases
    for (let key in SCHOOL_ALIASES) {
        if (n.includes(key)) {
            return SCHOOL_ALIASES[key];
        }
    }

    // Title Case default
    return n.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function processData() {
    schoolStats = {};

    // Process Students (Assumed columns: 0: Timestamp, 2: School Name, 3: City, 13: Q4 Awareness)
    studentData.forEach(row => {
        const schoolName = normalizeSchoolName(row[2]);
        const city = normalizeCityName(row[3]);

        if (!schoolStats[schoolName]) {
            schoolStats[schoolName] = { name: schoolName, students: 0, teachers: 0, city: city };
        }
        schoolStats[schoolName].students += 1;
    });

    // Process Teachers (Assumed columns: 0: Timestamp, 2: School Name)
    teacherData.forEach(row => {
        const schoolName = normalizeSchoolName(row[2]);
        if (!schoolStats[schoolName]) {
            schoolStats[schoolName] = { name: schoolName, students: 0, teachers: 0, city: 'Unknown' };
        }
        schoolStats[schoolName].teachers += 1;
    });
}

function renderMetrics() {
    const totalStudents = studentData.length;
    const totalTeachers = teacherData.length;
    const totalSurveys = totalStudents + totalTeachers;
    const totalSchools = Object.keys(schoolStats).length;

    animateValue("val-total-surveys", 0, totalSurveys, 1000);
    animateValue("val-total-schools", 0, totalSchools, 1000);
    animateValue("val-student-surveys", 0, totalStudents, 1000);
    animateValue("val-teacher-surveys", 0, totalTeachers, 1000);
}

function renderLeaderboard(filterText = '') {
    const tbody = document.getElementById('schoolsTableBody');
    tbody.innerHTML = '';

    const sortedSchools = Object.values(schoolStats).sort((a, b) => (b.students + b.teachers) - (a.students + a.teachers));

    sortedSchools.forEach(school => {
        if (filterText && !school.name.toLowerCase().includes(filterText.toLowerCase()) && !school.city.toLowerCase().includes(filterText.toLowerCase())) {
            return;
        }

        const tr = document.createElement('tr');
        const total = school.students + school.teachers;

        tr.innerHTML = `
            <td><strong>${school.name}</strong></td>
            <td>${school.city}</td>
            <td>${school.students}</td>
            <td>${school.teachers}</td>
            <td><span style="color: var(--primary-color); font-weight: 600;">${total}</span></td>
        `;
        tbody.appendChild(tr);
    });

    if (tbody.innerHTML === '') {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No schools found.</td></tr>`;
    }
}

function renderCharts() {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "#64748b";

    renderTimelineChart();
    renderCityChart();
    renderAwarenessChart();
}

function renderMap() {
    if (mapInst) mapInst.remove();

    // Center of Delhi
    mapInst = L.map('map').setView([28.6139, 77.2090], 11);

    // Using a light, clean basemap that fits the theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(mapInst);

    // Add markers
    Object.values(schoolStats).forEach(school => {
        if (school.name === "Not Specified") return;

        // Add slight random offset for schools without exact coordinates to prevent exact overlap
        let coords = SCHOOL_COORDINATES[school.name];
        if (!coords) {
            coords = [28.6139 + (Math.random() - 0.5) * 0.1, 77.2090 + (Math.random() - 0.5) * 0.1];
        }

        const total = school.students + school.teachers;
        L.circleMarker(coords, {
            radius: 8 + (total * 0.5), // Scale radius slightly by count
            fillColor: "#0d9488",
            color: "#0f766e",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(mapInst)
            .bindPopup(`<strong>${school.name}</strong><br>${school.city}<br>Total Surveys: ${total}`);
    });

    // Add Recenter Button
    const RecenterControl = L.Control.extend({
        onAdd: function (map) {
            const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
            btn.innerHTML = '&#8634;'; // Circular arrow symbol
            btn.style.backgroundColor = 'white';
            btn.style.width = '34px';
            btn.style.height = '34px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '18px';
            btn.style.fontWeight = 'bold';
            btn.style.lineHeight = '34px';
            btn.style.border = 'none';
            btn.style.borderBottom = '1px solid #ccc';
            btn.title = 'Recenter Map';
            btn.onclick = function (e) {
                e.stopPropagation();
                map.setView([28.6139, 77.2090], 11);
            }
            return btn;
        }
    });
    new RecenterControl({ position: 'topleft' }).addTo(mapInst);
}

function renderTimelineChart() {
    const ctx = document.getElementById('timelineChart').getContext('2d');

    // Group by Date (YYYY-MM-DD format extracted from timestamp)
    const dates = {};
    studentData.forEach(row => {
        let ts = row[0];
        if (!ts) return;
        // Google Viz sometimes returns Date(YYYY, M, D...) strings
        let dateStr = "Unknown";
        if (typeof ts === 'string' && ts.startsWith('Date(')) {
            // "Date(2026,3,17,10,20,56)"
            const parts = ts.replace('Date(', '').replace(')', '').split(',');
            if (parts.length >= 3) {
                dateStr = `${parts[0]}-${String(parseInt(parts[1]) + 1).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
            }
        } else {
            // Fallback for normal string
            try {
                dateStr = new Date(ts).toISOString().split('T')[0];
            } catch (e) {
                dateStr = String(ts).split(' ')[0];
            }
        }

        dates[dateStr] = (dates[dateStr] || 0) + 1;
    });

    const sortedDates = Object.keys(dates).sort();

    // Cumulative sum
    let cumulative = 0;
    const dataPoints = sortedDates.map(d => {
        cumulative += dates[d];
        return cumulative;
    });

    if (timelineChartInst) timelineChartInst.destroy();
    timelineChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates.length > 0 ? sortedDates : ['No Data'],
            datasets: [{
                label: 'Total Student Surveys',
                data: dataPoints.length > 0 ? dataPoints : [0],
                borderColor: '#0d9488',
                backgroundColor: 'rgba(13, 148, 136, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0f766e',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderCityChart() {
    const ctx = document.getElementById('cityChart').getContext('2d');

    const cities = {};
    studentData.forEach(row => {
        const city = normalizeCityName(row[3]);
        cities[city] = (cities[city] || 0) + 1;
    });

    const labels = Object.keys(cities);
    const data = Object.values(cities);

    // Green/Teal Palette
    const colors = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'];

    if (cityChartInst) cityChartInst.destroy();
    cityChartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [{
                data: data.length > 0 ? data : [1],
                backgroundColor: colors.slice(0, labels.length || 1),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderAwarenessChart() {
    const ctx = document.getElementById('awarenessChart').getContext('2d');

    const answers = {};
    studentData.forEach(row => {
        // Col 13 is Q4
        const ans = row[13] ? row[13].toString().trim() : 'No Answer';
        answers[ans] = (answers[ans] || 0) + 1;
    });

    // Truncate long labels for chart
    const labels = Object.keys(answers).map(l => l.length > 25 ? l.substring(0, 25) + '...' : l);
    const data = Object.values(answers);

    if (awarenessChartInst) awarenessChartInst.destroy();
    awarenessChartInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [{
                label: 'Number of Students',
                data: data.length > 0 ? data : [0],
                backgroundColor: '#10b981',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true },
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        }
    });
}

// Utility: Number animation
function animateValue(id, start, end, duration) {
    if (start === end) {
        document.getElementById(id).innerText = end;
        return;
    }
    let range = end - start;
    let current = start;
    let increment = end > start ? 1 : -1;
    let stepTime = Math.abs(Math.floor(duration / range));
    let obj = document.getElementById(id);
    let timer = setInterval(function () {
        current += increment;
        obj.innerText = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

function applyStaggeredAnimations() {
    const cards = document.querySelectorAll('.metric-card, .bento-map-card, .chart-card, .table-card');
    cards.forEach((card, index) => {
        card.classList.add('animate-fade-in');
        card.style.animationDelay = `${index * 0.05}s`;
    });
}
