import { createDbWorker } from "sql.js-httpvfs";

// Pre-configured worker and database URL
const workerUrl = new URL(
  "sql.js-httpvfs/dist/sqlite.worker.js",
  import.meta.url
);
const wasmUrl = new URL(
  "sql.js-httpvfs/dist/sql-wasm.wasm",
  import.meta.url
);

// Configuration for the SQLite database
const config = {
  from: "inline",
  config: {
    serverMode: "full",
    requestChunkSize: 4096,
    url: "funding-lite.sqlite"
  }
};

// Database worker initialization
let worker;
(async () => {
  const maxBytesToRead = 10 * 1024 * 1024;

  // Initialize the worker if not already done
  if (!worker) {
    worker = await createDbWorker(
      [config],
      workerUrl.toString(),
      wasmUrl.toString(),
      maxBytesToRead
    );
    console.log("Database worker is set up and ready for deployment.");
  }

  await loadDatabaseAndRender();
})();

// Items per page and pagination settings
const itemsPerPage = 15;
let currentPage = 1;
let filteredCompanies = [];

async function loadDatabaseAndRender(query = "SELECT * FROM mytable") {
  try {
    const results = await worker.db.exec(query);
    filteredCompanies = results[0]?.values.map(row => ({
      name: row[6],
      latestRound: row[11],
      date: row[7],
      totalRaised: row[8] || 0,
      valuation: row[16],
      location: row[17],
    })) || [];
    renderTable(filteredCompanies);
    renderCharts();
  } catch (error) {
    console.error("Error executing query on the database:", error);
  }
}

function renderTable(data) {
  const tableBody = document.getElementById('fundingTableBody');
  tableBody.innerHTML = '';

  data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).forEach(row => {
    const tableRow = `
      <tr>
        <td>${row.name}</td>
        <td>${row.latestRound}</td>
        <td>${row.date}</td>
        <td>${row.totalRaised ? `$${(row.totalRaised / 1_000_000).toFixed(2)}M` : 'N/A'}</td>
        <td>${row.valuation}</td>
        <td>${row.location}</td>
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

  // Build the SQL query dynamically
  let query = "SELECT * FROM mytable WHERE 1=1"; // Default query, 1=1 ensures that we can safely append additional conditions

  if (searchTerm) {
    query += ` AND LOWER(name) LIKE '%${searchTerm}%'`;  // Replace 'name' with the actual column name
  }

  if (roundFilter) {
    query += ` AND latestRound = '${roundFilter}'`;
  }

  if (!isNaN(minFunding)) {
    query += ` AND totalRaised >= ${minFunding}`;
  }

  if (!isNaN(maxFunding)) {
    query += ` AND totalRaised <= ${maxFunding}`;
  }

  currentPage = 1; // Reset to the first page when applying filters
  loadDatabaseAndRender(query);
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

// Attach functions to the window object to make them accessible globally
window.changePage = changePage;
window.applyFilters = applyFilters;

document.addEventListener('DOMContentLoaded', loadDatabaseAndRender);

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('roundFilter').addEventListener('change', applyFilters);
document.getElementById('minFunding').addEventListener('input', applyFilters);
document.getElementById('maxFunding').addEventListener('input', applyFilters);
