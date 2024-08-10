import { createDbWorker } from "sql.js-httpvfs";

// This is how we bundle the worker and wasm files using Webpack 5
const workerUrl = new URL(
  "sql.js-httpvfs/dist/sqlite.worker.js",
  import.meta.url
);
const wasmUrl = new URL(
  "sql.js-httpvfs/dist/sql-wasm.wasm",
  import.meta.url
);

// Configuration object for our SQLite database
const config = {
  from: "inline",  // We are using an inline config for a simple setup
  config: {
    serverMode: "full",  // Indicating that the file is a full SQLite database
    requestChunkSize: 4096,  // Page size of the SQLite database (default is 4096)
    url: "funding-lite.sqlite"  // URL to the database, relative to the deployment root
  }
};

// Creating the database worker
(async () => {
  const maxBytesToRead = 10 * 1024 * 1024; // Optional limit for bytes read, defaults to Infinity

  // Initialize the database worker with the config
  const worker = await createDbWorker(
    [config],
    workerUrl.toString(),
    wasmUrl.toString(),
    maxBytesToRead
  );

  console.log("Database worker is set up and ready for deployment.");
})();

const itemsPerPage = 5;
let currentPage = 1;
let filteredCompanies = [];

async function loadDatabase() {
    const response = await fetch('https://ankitdalalx.github.io/Funding-data/dist/funding-lite.sqlite');
    const arrayBuffer = await response.arrayBuffer();
    const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/sql-wasm.wasm` });
    const db = new SQL.Database(new Uint8Array(arrayBuffer));

    const query = "SELECT * FROM mytable";
    const results = db.exec(query);
    return results;
}

function renderTable(data) {
    const tableBody = document.getElementById('fundingTableBody');
    tableBody.innerHTML = '';

    data[0].values.forEach(row => {
        const tableRow = `
            <tr>
                <td>${row[6]}</td>
                <td>${row[11]}</td>
                <td>${row[7]}</td>
                <td>${row[8] ? `$${(row[8] / 1_000_000).toFixed(2)}M` : 'N/A'}</td>
                <td>${row[16]}</td>
                <td>${row[17]}</td>
            </tr>
        `;
        tableBody.innerHTML += tableRow;
    });

    updatePagination();
}

function updatePagination() {
    const pageInfo = document.getElementById('pageInfo');
    const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function changePage(direction) {
    currentPage += direction;
    renderTable(filteredCompanies);
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const roundFilter = document.getElementById('roundFilter').value;
    const minFunding = parseFloat(document.getElementById('minFunding').value) * 1000000 || 0;
    const maxFunding = parseFloat(document.getElementById('maxFunding').value) * 1000000 || Infinity;

    filteredCompanies = companies.filter(company => 
        company.name.toLowerCase().includes(searchTerm) &&
        (roundFilter === '' || company.latestRound === roundFilter) &&
        company.totalRaised >= minFunding &&
        company.totalRaised <= maxFunding
    );

    currentPage = 1;
    renderTable(filteredCompanies);
    renderCharts();
}

function renderCharts() {
    renderFundingOverviewChart();
    renderFundingTypeChart();
}

function renderFundingOverviewChart() {
    const sortedCompanies = [...filteredCompanies].sort((a, b) => b.totalRaised - a.totalRaised).slice(0, 5);
    
    const options = {
        series: [{
            name: 'Total Raised',
            data: sortedCompanies.map(company => company.totalRaised)
        }],
        chart: {
            type: 'bar',
            height: 350,
            toolbar: {
                show: false
            },
            background: 'transparent'
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true,
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: sortedCompanies.map(company => company.name),
            labels: {
                formatter: function (value) {
                    return `$${(value / 1_000_000).toFixed(2)}M`;
                },
                style: {
                    colors: '#e0e0e0'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#e0e0e0'
                }
            }
        },
        title: {
            text: 'Top 5 Companies by Total Funding',
            align: 'center',
            style: {
                color: '#e0e0e0'
            }
        },
        theme: {
            mode: 'dark',
            palette: 'palette1'
        },
        tooltip: {
            y: {
                formatter: function (value) {
                    return `$${(value / 1_000_000).toFixed(2)}M`;
                }
            }
        }
    };

    const chart = new ApexCharts(document.querySelector("#fundingOverviewChart"), options);
    chart.render();
}

function renderFundingTypeChart() {
    const roundCounts = filteredCompanies.reduce((acc, company) => {
        acc[company.latestRound] = (acc[company.latestRound] || 0) + 1;
        return acc;
    }, {});

    const options = {
        series: Object.values(roundCounts),
        chart: {
            type: 'pie',
            height: 350,
            background: 'transparent'
        },
        labels: Object.keys(roundCounts),
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: 'bottom'
                }
            }
        }],
        theme: {
            mode: 'dark',
            palette: 'palette2'
        },
        title: {
            text: 'Distribution of Funding Rounds',
            align: 'center',
            style: {
                color: '#e0e0e0'
            }
        },
        legend: {
            labels: {
                colors: '#e0e0e0'
            }
        },
        tooltip: {
            y: {
                formatter: function (value) {
                    return `${value} companies`;
                }
            }
        }
    };

    const chart = new ApexCharts(document.querySelector("#fundingTypeChart"), options);
    chart.render();
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const dbData = await loadDatabase();
        companies = dbData[0].values.map(row => ({
            name: row[6],
            latestRound: row[11],
            date: row[7],
            totalRaised: row[8] || 0,
            valuation: row[16],
            location: row[17],
        }));
        filteredCompanies = [...companies];
        renderTable(filteredCompanies);
        renderCharts();
    } catch (error) {
        console.error("Error loading database:", error);
    }
});

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('roundFilter').addEventListener('change', applyFilters);
document.getElementById('minFunding').addEventListener('input', applyFilters);
document.getElementById('maxFunding').addEventListener('input', applyFilters);
