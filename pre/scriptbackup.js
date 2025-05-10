const API_KEY = 'AIzaSyD1I839Np6CFFysPqwSQlxBDYPiFzguBiM';
const SPREADSHEET_ID = '1DuDFQ9cMU7Wfqc92YOcAK_591eMbEy7COGG9PQJE2JY';
const SMARTSTORE_RANGE = 'smartstore!A2:P';
const OHOUSE_RANGE = 'ohouse!A2:AO';
const YTSHOPPING_RANGE = 'YTshopping!A2:R';
const ZERO_SALES_STATUSES = ['취소', '반품', '미결제취소'];


const firebaseConfig = {
    apiKey: "AIzaSyAyhRpZmtfCCa8IajLPUld43o3MIovI85A",
    authDomain: "hejdoohome-dashboard.firebaseapp.com",
    databaseURL: "https://hejdoohome-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hejdoohome-dashboard",
    storageBucket: "hejdoohome-dashboard.appspot.com",
    messagingSenderId: "824702367003",
    appId: "1:824702367003:web:ef829133d3e5f216354fbe",
    measurementId: "G-BD1SEL028K"
}


// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let salesChart;
let isInitialLoad = true;
let isChartInitialized = false;
let chartUpdateTimeout;
let flatpickrInstance;
let allData = [];
let filteredData = [];
let productMappings = {};
let allProductSales = [];
let displayedProductCount = 20;
let customerData = {};
let originalTableContent = '';
let currentSort = { column: 'sales', order: 'desc' };

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const logoutButton = document.getElementById('logoutButton');
    const loginContainer = document.getElementById('loginContainer');
    const contentContainer = document.getElementById('contentContainer');


    function checkAuthState() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("User is signed in:", user);
                showDashboard();
            } else {
                console.log("User is signed out");
                showLoginForm();
            }
        });
    }

    function showDashboard() {
        loginContainer.style.display = 'none';
        contentContainer.style.display = 'block';
    }

    function showLoginForm() {
        loginContainer.style.display = 'flex';
        contentContainer.style.display = 'none';
    }

    logoutButton.addEventListener('click', function() {
        auth.signOut().then(() => {
            console.log("User signed out");
            showLoginForm();
            // 로그인 폼 초기화
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
        }).catch((error) => {
            console.error("Logout error:", error);
        });
    });

    // 페이지 로드 시 로그인 상태 확인
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log("Login successful:", userCredential.user);
                loginError.style.display = 'none';
                showDashboard();
            })
            .catch((error) => {
                console.error("Login error:", error);
                loginError.textContent = "로그인 실패: " + error.message;
                loginError.style.display = 'block';
            });
    });

    // 페이지 로드 시 로그인 상태 확인
    checkAuthState();
 
});

function initializeApp() {
    console.log('Initializing app...');
    
    initInfoTable();
    initShowMoreProducts();
    initToggleButtons();
    initMandala();
    initProductSalesSort();
    initializeTabs();
    initializeMobileMenu();

    // Chart.js 스크립트 동적 로드
    if (!isChartInitialized) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
            initializeChart();
            initClient().then(() => {
                console.log('Client initialization complete');
                return loadSalesData();
            }).then(() => {
                console.log('Sales data loaded');
                // 초기 대시보드 업데이트를 수행합니다.
                const today = getKoreanDate();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                handleDateButtonClick('this-month'); // 이번 달 데이터로 초기화
            }).catch(error => {
                console.error('Error in initialization:', error);
            });
        };
        document.head.appendChild(script);
    }
}

  async function loadMappings() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/product-mappings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const mappings = await response.json();
    
    const mappingTableBody = document.querySelector('#mapping-table tbody');
    mappingTableBody.innerHTML = '';
  
    mappings.forEach((mapping, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${mapping.original_product}</td>
        <td>${mapping.original_option}</td>
        <td>${mapping.mapped_product}</td>
        <td>${mapping.mapped_option}</td>
        <td>${mapping.price}</td>
        <td>${mapping.cost}</td>
      `;
      row.addEventListener('click', () => {
        sendMappingToDetails(mapping);
      });
      mappingTableBody.appendChild(row);
    });
  }
  
    // 날짜 및 요일 표시
    function updateDateDisplay() {
        const dateDisplay = document.getElementById('date-display');
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = now.toLocaleDateString('ko-KR', options);
    }

    updateDateDisplay();

  function sendMappingToDetails(mapping) {
    const detailsTableBody = document.querySelector('#sales-table tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${mapping.original_product}</td>
      <td>${mapping.original_option}</td>
      <td>${mapping.mapped_product}</td>
      <td>${mapping.mapped_option}</td>
      <td>${mapping.price}</td>
      <td>${mapping.cost}</td>
      <td>-</td> <!-- 주문 상태를 위한 빈 열 -->
    `;
    detailsTableBody.appendChild(row);
  }

  function initializeMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const contentContainer = document.getElementById('contentContainer');
    const menuItems = document.querySelectorAll('.mobile-menu a');
    const logoutButton = document.querySelector('.mobile-menu button');

    menuToggle.addEventListener('click', () => {
        mobileMenu.style.display = mobileMenu.style.display === 'block' ? 'none' : 'block';
        contentContainer.classList.toggle('mobile-menu-open');
    });

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.getAttribute('data-tab');
            activateTab(tabName);
            mobileMenu.style.display = 'none';
            contentContainer.classList.remove('mobile-menu-open');
        });
    });

    logoutButton.addEventListener('click', () => {
        // 기존 로그아웃 로직 실행
        auth.signOut().then(() => {
            console.log("User signed out");
            showLoginForm();
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
        }).catch((error) => {
            console.error("Logout error:", error);
        });
    });
}

function activateTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    const activeTab = document.getElementById(`${tabName}Tab`);
    if (activeTab) {
        activeTab.classList.add('active');
        if (tabName === 'detailData') {
            updateDetailDataTable();
        }
    }
}

function setupRealtimeProductMappings(callback) {
    return db.collection("productMappings").onSnapshot((snapshot) => {
      const mappings = {};
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();
          mappings[`${data.originalProduct}-${data.originalOption}`] = {
            product: data.mappedProduct,
            option: data.mappedOption,
            price: data.price,
            cost: data.cost
          };
        } else if (change.type === "removed") {
          const data = change.doc.data();
          delete mappings[`${data.originalProduct}-${data.originalOption}`];
        }
      });
      callback(mappings);
    });
  }

  function initializeTabs() {
    console.log('Initializing tabs');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const tabName = button.getAttribute('data-tab');
            console.log('Tab clicked:', tabName);

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            const targetTabId = `${tabName}Tab`;
            const targetTab = document.getElementById(targetTabId);
            if (targetTab) {
                targetTab.classList.add('active');
                console.log('Activated tab:', tabName);
                if (tabName === 'detailData') {
                    updateDetailDataTable();
                }
            } else {
                console.error('Target tab not found:', targetTabId);
            }

            window.scrollTo(0, 0);
        });
    });

    // 초기 탭 설정
    const initialTab = document.querySelector('.tab-button.active');
    if (initialTab) {
        const tabName = initialTab.getAttribute('data-tab');
        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            console.log('Initial active tab:', tabName);
            if (tabName === 'detailData') {
                updateDetailDataTable();
            }
        }
    }
}

function updateDetailDataTable() {
    console.log('Updating Detail Data Table');
    const tbody = document.querySelector('#sales-table tbody');
    if (!tbody) {
        console.error('sales-table tbody not found');
        return;
    }

    tbody.innerHTML = '';  // Clear existing content

    filteredData.forEach(row => {
        const mappedProduct = productMappings[`${row.product}-${row.option}`] || { 
            product: row.product, 
            option: row.option, 
            price: row.originalSales / row.quantity 
        };
        let calculatedSales = mappedProduct.price * row.quantity;
        
        if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
            calculatedSales = 0;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.seller}</td>
            <td>${row.date}</td>
            <td>${mappedProduct.product}</td>
            <td>${mappedProduct.option}</td>
            <td>${row.quantity}</td>
            <td>${formatCurrency(calculatedSales)}</td>
            <td>${row.orderStatus}</td>
        `;
        tbody.appendChild(tr);
    });

    console.log(`Added ${filteredData.length} rows to Detail Data Table`);
}


  function loadProductMappings() {
    return gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'mapping!A2:F'
    }).then(function(response) {
        productMappings = {};
        response.result.values.forEach(row => {
            const key = `${row[0]}-${row[1]}`;
            productMappings[key] = {
                product: row[2],
                option: row[3],
                price: parseFloat(row[4]),
                cost: parseFloat(row[5])
            };
        });
        console.log("Product mappings loaded:", productMappings);
        updateDashboard();
    }).catch(function(error) {
        console.error("Error loading product mappings: ", error);
    });
}


function formatYAxis(value, isMobile) {
    if (isMobile) {
      return (value / 1000000).toFixed(2) + 'M';
    }
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
  }

  function formatTooltip(value) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
  }

  function initializeChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) {
        console.error('Canvas element not found');
        return;
    }

    const isMobile = window.innerWidth <= 768;
    const fontSize = isMobile ? 8 : 12;

    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: !isMobile
                    },
                    ticks: {
                        display: !isMobile,
                        font: {
                            size: fontSize
                        }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatYAxis(value, isMobile);
                        },
                        font: {
                            size: fontSize
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        font: {
                            size: fontSize
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: !isMobile,
                    labels: {
                        font: {
                            size: fontSize
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    titleFont: {
                        size: fontSize
                    },
                    bodyFont: {
                        size: fontSize
                    },
                    footerFont: {
                        size: fontSize
                    },
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (label.includes('구매건수')) {
                                    label += context.parsed.y;
                                } else {
                                    label += formatTooltip(context.parsed.y);
                                }
                            }
                            return label;
                        },
                        footer: function(tooltipItems) {
                            let sum = 0;
                            let orderCount = 0;
                            tooltipItems.forEach(function(tooltipItem) {
                                if (tooltipItem.dataset.label !== '구매건수') {
                                    sum += tooltipItem.parsed.y;
                                } else {
                                    orderCount = tooltipItem.parsed.y;
                                }
                            });
                            return [
                                '매출액 합계: ' + formatTooltip(sum),
                            ];
                        }
                    }
                }
            }
        }
    });

    isChartInitialized = true;
}

window.addEventListener('resize', function() {
    const isMobile = window.innerWidth <= 768;
    const fontSize = isMobile ? 8 : 12;

    if (salesChart) {
        salesChart.options.plugins.legend.display = !isMobile;
        salesChart.options.scales.x.ticks.display = !isMobile;
        salesChart.options.scales.x.grid.display = !isMobile;
        salesChart.options.scales.y.ticks.callback = function(value) {
            return formatYAxis(value, isMobile);
        };
        salesChart.options.scales.x.ticks.font.size = fontSize;
        salesChart.options.scales.y.ticks.font.size = fontSize;
        salesChart.options.scales.y1.ticks.font.size = fontSize;
        salesChart.options.plugins.legend.labels.font.size = fontSize;
        salesChart.options.plugins.tooltip.titleFont.size = fontSize;
        salesChart.options.plugins.tooltip.bodyFont.size = fontSize;
        salesChart.options.plugins.tooltip.footerFont.size = fontSize;
        salesChart.update();
    }

    if (salesByDayChart) {
        salesByDayChart.options.plugins.legend.display = !isMobile;
        salesByDayChart.options.scales.y.ticks.callback = function(value) {
            return formatYAxis(value, isMobile);
        };
        salesByDayChart.options.scales.x.ticks.font.size = fontSize;
        salesByDayChart.options.scales.y.ticks.font.size = fontSize;
        salesByDayChart.options.plugins.legend.labels.font.size = fontSize;
        salesByDayChart.options.plugins.tooltip.titleFont.size = fontSize;
        salesByDayChart.options.plugins.tooltip.bodyFont.size = fontSize;
        salesByDayChart.update();
    }
});
  
  // 요일별 매출 차트 초기화 함수 수정
  function updateSalesByDayChart(data) {
    const ctx = document.getElementById('sales-by-day-chart');
    if (!ctx) {
        console.error('sales-by-day-chart canvas not found');
        return;
    }

    const isMobile = window.innerWidth <= 768;
    const fontSize = isMobile ? 8 : 12;

    const chartData = {
        labels: Object.keys(data),
        datasets: [{
            label: '매출액',
            data: Object.values(data),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            animation: false,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return formatYAxis(value, isMobile);
                    },
                    font: {
                        size: fontSize
                    }
                }
            },
            x: {
                ticks: {
                    font: {
                        size: fontSize
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: !isMobile,
                labels: {
                    font: {
                        size: fontSize
                    }
                }
            },
            tooltip: {
                titleFont: {
                    size: fontSize
                },
                bodyFont: {
                    size: fontSize
                },
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += formatTooltip(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        }
    };

    if (salesByDayChart) {
        salesByDayChart.data = chartData;
        salesByDayChart.options = chartOptions;
        salesByDayChart.update();
    } else {
        salesByDayChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: chartOptions
        });
    }
}
  
  // 창 크기 변경 시 차트 업데이트
  window.addEventListener('resize', function() {
    const isMobile = window.innerWidth <= 768;
    if (salesChart) {
      salesChart.options.plugins.legend.display = !isMobile;
      salesChart.options.scales.x.ticks.display = !isMobile;
      salesChart.options.scales.x.grid.display = !isMobile;
      salesChart.options.scales.y.ticks.callback = function(value) {
        return formatYAxis(value, isMobile);
      };
      salesChart.update();
    }
    if (salesByDayChart) {
      salesByDayChart.options.plugins.legend.display = !isMobile;
      salesByDayChart.options.scales.y.ticks.callback = function(value) {
        return formatYAxis(value, isMobile);
      };
      salesByDayChart.update();
    }
  });


  function updateChart(data, startDate, endDate) {
    if (!salesChart || !isChartInitialized) {
        console.error('Sales chart not initialized');
        return;
    }

    if (chartUpdateTimeout) {
        clearTimeout(chartUpdateTimeout);
    }

    chartUpdateTimeout = setTimeout(() => {
        const { labels, datasets } = processDataForChart(data, startDate, endDate);

        salesChart.data.labels = labels;
        salesChart.data.datasets = Object.keys(datasets).map(key => {
            if (key === '구매건수') {
                return {
                    type: 'line',
                    label: key,
                    data: datasets[key],
                    borderColor: 'rgba(77, 77, 77, 80%)',
                    borderWidth: 3,
                    fill: false,
                    yAxisID: 'y1',
                    tension: 0.4,  // 선을 부드럽게 만듭니다
                    pointRadius: 0,  // 점을 제거합니다
                    pointHitRadius: 10,  // 마우스 호버 영역을 유지합니다
                };
            } else {
                return {
                    type: 'bar',
                    label: key,
                    data: datasets[key],
                    backgroundColor: getChannelColor(key),
                    stack: 'Stack 0'
                };
            }
        });

        const timeUnit = getChartTimeUnit(startDate, endDate);
        salesChart.options.scales.x.time = { unit: timeUnit };
        salesChart.options.scales.y1 = {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
                drawOnChartArea: false,
            },
        };
        salesChart.options.animation = false;

        salesChart.update();
        console.log('Chart updated with time unit:', timeUnit);
    }, 100);
}

function getChartTimeUnit(startDate, endDate) {
    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 31) return 'day';
    if (diffDays <= 183) return 'week';
    return 'month';
}

function processDataForChart(data, startDate, endDate) {
    const timeUnit = getChartTimeUnit(startDate, endDate);
    const channelData = {
        '스마트스토어': {},
        '오늘의집': {},
        '유튜브쇼핑': {}
    };
    const orderCounts = {};

    data.forEach(item => {
        const itemDate = new Date(item.date);
        if (itemDate >= startDate && itemDate <= endDate) {
            const key = formatDateKey(itemDate, timeUnit);
            const mappedProduct = productMappings[`${item.product}-${item.option}`] || { 
                price: item.originalSales / item.quantity 
            };
            const sales = mappedProduct.price * item.quantity;

            if (!(item.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(item.orderStatus))) {
                channelData[item.seller][key] = (channelData[item.seller][key] || 0) + sales;
                orderCounts[key] = (orderCounts[key] || 0) + 1;
            }
        }
    });

    const labels = generateDateLabels(startDate, endDate, timeUnit);
    const datasets = {};

    Object.keys(channelData).forEach(channel => {
        datasets[channel] = labels.map(label => channelData[channel][label] || 0);
    });

    // 구매건수 데이터 추가
    datasets['구매건수'] = labels.map(label => orderCounts[label] || 0);

    console.log('Processed chart data:', { labels, datasets, timeUnit });
    return { labels, datasets };
}

function formatDateKey(date, timeUnit) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    switch (timeUnit) {
        case 'day':
            return `${year}-${month}-${day}`;
        case 'week':
            const weekNumber = getWeekNumber(date);
            return `${year}-W${weekNumber}`;
        case 'month':
            return `${year}-${month}`;
        default:
            return `${year}-${month}-${day}`;
    }
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function generateDateLabels(startDate, endDate, timeUnit) {
    const labels = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        labels.push(formatDateKey(currentDate, timeUnit));
        
        switch (timeUnit) {
            case 'day':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'week':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'month':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
        }
    }
    
    return labels;
}

function formatDateString(date, timeUnit) {
    if (timeUnit === 'day') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (timeUnit === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `${date.getFullYear()}`;
}

function getIndex(date, startDate, timeUnit) {
    if (timeUnit === 'day') {
        return Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
    } else if (timeUnit === 'month') {
        return (date.getFullYear() - startDate.getFullYear()) * 12 + (date.getMonth() - startDate.getMonth());
    } else {
        return date.getFullYear() - startDate.getFullYear();
    }
}

function initInfoTable() {
    const editButton = document.getElementById('edit-info');
    const saveButton = document.getElementById('save-info');
    const addRowButton = document.getElementById('add-row');
    const cancelButton = document.getElementById('cancel-edit');
    const infoTable = document.getElementById('info-table');

    // 초기 상태에서 '+' 버튼 숨기기
    addRowButton.style.display = 'none';

    editButton.addEventListener('click', () => {
        originalTableContent = infoTable.innerHTML;
        editButton.style.display = 'none';
        saveButton.style.display = 'inline-block';
        addRowButton.style.display = 'inline-block';
        cancelButton.style.display = 'inline-block';
        makeTableEditable(true);
    });

    saveButton.addEventListener('click', saveInfoTable);
    addRowButton.addEventListener('click', addNewRow);
    cancelButton.addEventListener('click', cancelEdit);

    loadInfoTable();
}

function addTableRow(table, key, value) {
    const row = table.insertRow();
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    cell1.textContent = key;
    
    const contentSpan = document.createElement('span');
    contentSpan.textContent = value;
    cell2.appendChild(contentSpan);
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '-';
    deleteButton.className = 'delete-row';
    deleteButton.style.display = 'none';
    deleteButton.onclick = () => confirmDeleteRow(row);
    cell2.appendChild(deleteButton);
}

function makeTableEditable(editable) {
    const table = document.getElementById('info-table');
    const rows = table.getElementsByTagName('tr');
    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        cells[1].querySelector('span').contentEditable = editable;
        cells[1].querySelector('span').classList.toggle('editable', editable);
        
        const deleteButton = row.querySelector('.delete-row');
        if (deleteButton) {
            deleteButton.style.display = editable ? 'inline-block' : 'none';
            deleteButton.style.float = 'right';
        }
    }
}

function addNewRow() {
    const table = document.getElementById('info-table');
    const newRow = table.insertRow();
    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    
    cell1.contentEditable = true;
    cell1.classList.add('editable');
    
    const span = document.createElement('span');
    span.contentEditable = true;
    span.classList.add('editable');
    cell2.appendChild(span);
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '-';
    deleteButton.className = 'delete-row';
    deleteButton.style.float = 'right';
    deleteButton.onclick = () => confirmDeleteRow(newRow);
    cell2.appendChild(deleteButton);
}

function confirmDeleteRow(row) {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'confirm-delete';
    confirmDiv.innerHTML = `
        <p>정말 삭제하시겠습니까?</p>
        <button onclick="deleteRow(this.closest('tr'))">예</button>
        <button onclick="this.closest('.confirm-delete').remove()">아니오</button>
    `;
    row.appendChild(confirmDiv);
}

function deleteRow(row) {
    row.parentNode.removeChild(row);
}

function saveInfoTable() {
    const rows = document.getElementById('info-table').rows;
    const batch = db.batch();

    for (let row of rows) {
        const key = row.cells[0].textContent.trim();
        const value = row.cells[1].querySelector('span').textContent.trim();
        const docRef = db.collection("info").doc(key);
        batch.set(docRef, { value });
    }

    batch.commit().then(() => {
        makeTableEditable(false);
        document.getElementById('edit-info').style.display = 'inline-block';
        document.getElementById('save-info').style.display = 'none';
        document.getElementById('add-row').style.display = 'none';
        document.getElementById('cancel-edit').style.display = 'none';
        alert('정보가 저장되었습니다.');
    }).catch((error) => {
        console.error("Error saving info table: ", error);
        alert('정보 저장 중 오류가 발생했습니다.');
    });
}

function cancelEdit() {
    const table = document.getElementById('info-table');
    table.innerHTML = originalTableContent;
    makeTableEditable(false);
    document.getElementById('edit-info').style.display = 'inline-block';
    document.getElementById('save-info').style.display = 'none';
    document.getElementById('add-row').style.display = 'none';
    document.getElementById('cancel-edit').style.display = 'none';
}

// Info 자료 관련 함수
function loadInfoTable() {
    db.collection("info").onSnapshot((snapshot) => {
        const table = document.getElementById('info-table');
        table.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            addTableRow(table, doc.id, data.value);
        });
    });
}

function updateCustomerData(data) {
    const customers = {};
    let totalCustomers = 0;
    let repeatCustomers = 0;
    let totalSales = 0;
    let repeatCustomerSales = 0;

    data.forEach(row => {
        if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
            return;
        }

        let customerId = row.buyerId || row.buyerEmail || row.buyerContact;

        if (customerId) {
            const orderDate = new Date(row.date).toISOString().split('T')[0];
            const mappedProduct = productMappings[`${row.product}-${row.option}`] || { 
                price: row.originalSales / row.quantity
            };
            const orderAmount = mappedProduct.price * row.quantity;

            if (!customers[customerId]) {
                customers[customerId] = {
                    orders: [orderDate],
                    totalAmount: orderAmount
                };
                totalCustomers++;
                totalSales += orderAmount;
            } else {
                if (!customers[customerId].orders.includes(orderDate)) {
                    customers[customerId].orders.push(orderDate);
                    if (customers[customerId].orders.length === 2) {
                        repeatCustomers++;
                    }
                }
                customers[customerId].totalAmount += orderAmount;
                totalSales += orderAmount;
                if (customers[customerId].orders.length > 1) {
                    repeatCustomerSales += orderAmount;
                }
            }
        }
    });

    const totalCustomersAvgPrice = totalCustomers > 0 ? totalSales / totalCustomers : 0;
    const repeatCustomersAvgPrice = repeatCustomers > 0 ? repeatCustomerSales / repeatCustomers : 0;
    const repeatCustomerRatio = totalCustomers > 0 ? roundToOneDecimal((repeatCustomers / totalCustomers * 100)) : 0;

    // 구매고객 데이터 섹션 업데이트
    document.getElementById('total-customers').textContent = totalCustomers;
    document.getElementById('total-customers-avg-price').textContent = formatCurrency(totalCustomersAvgPrice);
    document.getElementById('repeat-customers').textContent = `${repeatCustomers} (${repeatCustomerRatio}%)`;
    document.getElementById('repeat-customers-avg-price').textContent = formatCurrency(repeatCustomersAvgPrice);

    return {
        totalCustomers,
        totalSales,
        orderCount: data.length - data.filter(row => row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)).length
    };
}


function getDateRange(buttonId) {
    const today = getKoreanDate();
    let start, end, compareStart, compareEnd;

    switch (buttonId) {
        case 'today':
            end = new Date(today);
            start = new Date(today);
            compareEnd = new Date(today);
            compareEnd.setDate(compareEnd.getDate() - 1);
            compareStart = new Date(compareEnd);
            break;
        case 'yesterday':
            end = new Date(today);
            end.setDate(end.getDate() - 1);
            start = new Date(end);
            compareEnd = new Date(end);
            compareEnd.setDate(compareEnd.getDate() - 1);
            compareStart = new Date(compareEnd);
            break;
        case 'this-week':
            end = new Date(today);
            start = getMonday(today);
            compareEnd = new Date(start);
            compareEnd.setDate(compareEnd.getDate() - 1);
            compareStart = getMonday(compareEnd);
            break;
        case 'last-week':
            end = getMonday(today);
            end.setDate(end.getDate() - 1);
            start = getMonday(end);
            compareEnd = new Date(start);
            compareEnd.setDate(compareEnd.getDate() - 1);
            compareStart = getMonday(compareEnd);
            break;
        case 'this-month':
            end = new Date(today);
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            compareEnd = new Date(start);
            compareEnd.setDate(compareEnd.getDate() - 1);
            compareStart = new Date(compareEnd.getFullYear(), compareEnd.getMonth(), 1);
            break;
        case 'last-month':
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            compareEnd = new Date(start);
            compareEnd.setDate(compareEnd.getDate() - 1);
            compareStart = new Date(compareEnd.getFullYear(), compareEnd.getMonth(), 1);
            break;
        case 'last-3-months':
            end = new Date(today);
            start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            compareEnd = new Date(start);
            compareEnd.setDate(compareEnd.getDate() - 1);
            compareStart = new Date(compareEnd.getFullYear(), compareEnd.getMonth() - 2, 1);
            break;
        case 'last-6-months':
            end = new Date(today);
            start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
            compareEnd = new Date(start);
            compareEnd.setDate(compareEnd.getDate() - 1);
            compareStart = new Date(compareEnd.getFullYear(), compareEnd.getMonth() - 5, 1);
            break;
        case 'all-time':
            end = new Date(today);
            start = getOldestDate(allData);
            compareStart = null;
            compareEnd = null;
            break;
    }

    return { start, end, compareStart, compareEnd };
}

function getChannelColor(channel) {
    const channelColors = {
        '스마트스토어': 'rgba(81, 194, 106, 0.8)',
        '오늘의집': 'rgba(83, 163, 194, 0.8)',
        '유튜브쇼핑': 'rgba(184, 59, 48, 0.8)'
    };
    return channelColors[channel] || 'rgba(201, 203, 207, 0.8)'; // 기본 색상
}

function compareSales(currentData, compareData) {
    const currentSales = calculateTotalSales(currentData);
    const compareSales = calculateTotalSales(compareData);
    console.log('Current sales:', currentSales);
    console.log('Compare sales:', compareSales);
    
    let percentChange;
    if (compareSales === 0 && currentSales === 0) {
        percentChange = 0;
    } else if (compareSales === 0) {
        percentChange = 100;
    } else {
        percentChange = ((currentSales - compareSales) / compareSales) * 100;
    }

    const comparisonElement = document.getElementById('sales-comparison');
    if (percentChange === 0) {
        comparisonElement.textContent = "변동 없음";
        comparisonElement.className = 'sales-comparison';
    } else {
        comparisonElement.textContent = `${percentChange >= 0 ? '▲' : '▼'} ${Math.abs(percentChange).toFixed(2)}%`;
        comparisonElement.className = `sales-comparison ${percentChange >= 0 ? 'increase' : 'decrease'}`;
    }
}

function calculateTotalSales(data) {
    if (!Array.isArray(data)) {
        console.error('Invalid data passed to calculateTotalSales:', data);
        return 0;
    }
    return data.reduce((sum, row) => {
        if (!row || typeof row !== 'object') {
            console.warn('Invalid row in calculateTotalSales:', row);
            return sum;
        }
        const mappedProduct = productMappings[`${row.product}-${row.option}`];
        const price = mappedProduct ? mappedProduct.price : (row.originalSales / row.quantity);
        
        if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
            return sum;
        }
        
        return sum + (price * row.quantity);
    }, 0);
}

function updateProductSalesTable(data, channelInfo) {
    const productSales = {};
    data.forEach((row, index) => {
        const mappedProduct = productMappings[`${row.product}-${row.option}`] || { 
            product: row.product, 
            option: row.option, 
            price: row.originalSales / row.quantity, 
            cost: 0 
        };
        const key = `${mappedProduct.product}|${mappedProduct.option}`;
        
        if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
            return;
        }
        
        const quantity = row.quantity || 0;
        const sales = mappedProduct.price * quantity;
        
        if (sales <= 0) {
            return;
        }
        
        if (!productSales[key]) {
            productSales[key] = {
                originalIndex: index,
                product: mappedProduct.product,
                option: mappedProduct.option,
                quantity: 0,
                sales: 0,
                profit: 0,
                operatingProfit: 0
            };
        }
        
        const profit = sales - (mappedProduct.cost * quantity);
        
        const channelKey = `${mappedProduct.product}-${mappedProduct.option}`;
        let commissionRate = 0;
        if (row.seller === '스마트스토어') {
            commissionRate = channelInfo[channelKey]?.smartstore?.rate || 0;
        } else if (row.seller === '오늘의집') {
            commissionRate = channelInfo[channelKey]?.ohouse?.rate || 0;
        } else if (row.seller === '유튜브쇼핑') {
            commissionRate = channelInfo[channelKey]?.YTshopping?.rate || 0;
        }
        
        const commission = sales * commissionRate;
        const operatingProfit = profit - commission;

        productSales[key].quantity += quantity;
        productSales[key].sales += sales;
        productSales[key].profit += profit;
        productSales[key].operatingProfit += operatingProfit;
    });

    allProductSales = Object.entries(productSales).map(([key, value]) => ({
        originalIndex: value.originalIndex,
        product: value.product,
        option: value.option,
        quantity: value.quantity,
        sales: value.sales,
        profit: value.profit,
        operatingProfit: value.operatingProfit
    }));

    sortProductSales();
    updateProductSalesTableDisplay();
}

function roundToOneDecimal(num) {
    return Math.round(num * 10) / 10;
}

function updateProductSalesTableDisplay() {
    const thead = document.querySelector('#product-sales-table thead');
    const tbody = document.querySelector('#product-sales-table tbody');
    const productsToShow = displayedProductCount === 20 ? allProductSales.slice(0, 20) : allProductSales;
    
    // 테이블 헤더 업데이트
    thead.innerHTML = `
        <tr>
            <th>순위</th>
            <th>상품명 <span class="sort-button" data-sort="product">◆</span></th>
            <th>옵션</th>
            <th>수량 <span class="sort-button" data-sort="quantity">◆</span></th>
            <th>매출액 <span class="sort-button" data-sort="sales">◆</span></th>
            <th>순이익 (마진율) <span class="sort-button" data-sort="profit">◆</span></th>
            <th>영업이익 (마진율) <span class="sort-button" data-sort="operatingProfit">◆</span></th>
        </tr>
    `;
    
    let totalSales = 0;
    let totalProfit = 0;
    let totalOperatingProfit = 0;

    const rows = productsToShow.map((item, index) => {
        const marginRate = roundToOneDecimal((item.profit / item.sales * 100));
        const operatingMarginRate = roundToOneDecimal((item.operatingProfit / item.sales * 100));
        totalSales += item.sales;
        totalProfit += item.profit;
        totalOperatingProfit += item.operatingProfit;
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${item.product}</td>
            <td>${item.option}</td>
            <td>${item.quantity !== undefined ? item.quantity : 'N/A'}</td>
            <td>${formatCurrency(item.sales)}</td>
            <td>${formatCurrency(item.profit)} (${marginRate}%)</td>
            <td>${formatCurrency(item.operatingProfit)} (${operatingMarginRate}%)</td>
        </tr>
    `});

    const totalMarginRate = roundToOneDecimal((totalProfit / totalSales * 100));
    const totalOperatingMarginRate = roundToOneDecimal((totalOperatingProfit / totalSales * 100));
    const totalRow = `
    <tr class="total-row">
        <td colspan="4"><strong>합계</strong></td>
        <td><strong>${formatCurrency(totalSales)}</strong></td>
        <td><strong>${formatCurrency(totalProfit)} (${totalMarginRate}%)</strong></td>
        <td><strong>${formatCurrency(totalOperatingProfit)} (${totalOperatingMarginRate}%)</strong></td>
    </tr>
    `;

    tbody.innerHTML = rows.join('') + totalRow;

    const showMoreButton = document.getElementById('show-more-products');
    if (showMoreButton) {
        if (allProductSales.length > 20) {
            showMoreButton.style.display = 'block';
            showMoreButton.textContent = displayedProductCount === 20 ? '더보기' : '접기';
        } else {
            showMoreButton.style.display = 'none';
        }
    } else {
        console.error('Show more products button not found in updateProductSalesTableDisplay');
    }

    console.log('Product sales table updated. Displayed products:', displayedProductCount);
}

function updateTopChannels(data) {
    const channelSales = {};
    let totalSales = 0;
  
    data.forEach(row => {
      if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
        return;
      }
      const mappedProduct = productMappings[`${row.product}-${row.option}`] || { 
        price: row.originalSales / row.quantity 
      };
      const sales = mappedProduct.price * row.quantity;
      channelSales[row.seller] = (channelSales[row.seller] || 0) + sales;
      totalSales += sales;
    });
  
    const sortedChannels = Object.entries(channelSales)
      .sort(([, a], [, b]) => b - a)
      .map(([channel, sales]) => ({
        channel,
        sales,
        ratio: (sales / totalSales * 100).toFixed(2)
      }));
  
      const tbody = document.querySelector('#top-channels tbody');
      tbody.innerHTML = sortedChannels.map(({ channel, sales, ratio }) => `
        <tr>
          <td>${channel}</td>
          <td>${formatCurrency(sales)}</td>
          <td>${ratio}%</td>
        </tr>
      `).join('');
    }
  
  function updateTopProductsBySales(data) {
    const productSales = {};
  
    data.forEach(row => {
      if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
        return;
      }
      const mappedProduct = productMappings[`${row.product}-${row.option}`] || { 
        product: row.product, 
        option: row.option, 
        price: row.originalSales / row.quantity 
      };
      const key = `${mappedProduct.product}-${mappedProduct.option}`;
      const sales = mappedProduct.price * row.quantity;
      productSales[key] = (productSales[key] || 0) + sales;
    });
  
    const sortedProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, sales]) => {
        const [product, option] = key.split('-');
        return { product, option, sales };
      });
  
      const tbody = document.querySelector('#top-products-by-sales tbody');
      tbody.innerHTML = sortedProducts.map(({ product, option, sales }) => `
        <tr>
          <td>${product}</td>
          <td>${option}</td>
          <td>${formatCurrency(sales)}</td>
        </tr>
      `).join('');
    }
  
  function updateTopProductsByQuantity(data) {
    const productQuantities = {};
  
    data.forEach(row => {
      if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
        return;
      }
      const mappedProduct = productMappings[`${row.product}-${row.option}`] || { 
        product: row.product, 
        option: row.option
      };
      const key = `${mappedProduct.product}-${mappedProduct.option}`;
      productQuantities[key] = (productQuantities[key] || 0) + row.quantity;
    });
  
    const sortedProducts = Object.entries(productQuantities)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, quantity]) => {
        const [product, option] = key.split('-');
        return { product, option, quantity };
      });
  
      const tbody = document.querySelector('#top-products-by-quantity tbody');
      tbody.innerHTML = sortedProducts.map(({ product, option, quantity }) => `
        <tr>
          <td>${product}</td>
          <td>${option}</td>
          <td>${quantity}</td>
        </tr>
      `).join('');
    }

  let salesByDayChart = null;

  function formatYAxis(value, isMobile) {
    if (isMobile) {
      return (value / 1000000).toFixed(2) + 'M';
    }
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
  }

  function formatTooltip(value) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
  }
  

  

function updateSubscriberCount() {
    fetch('/get-subscriber-count')
        .then(response => response.json())
        .then(data => {
            document.getElementById('subscriber-number').textContent = data.subscriberCount.toLocaleString();
            document.getElementById('update-time').textContent = new Date().toLocaleString();
        })
        .catch(error => console.error('Error:', error));
}

function startSubscriberCountUpdates() {
    updateSubscriberCount();
    setInterval(updateSubscriberCount, 600000);
}

let showMoreButtonInitialized = false;

function initShowMoreProducts() {
    console.log('Initializing show more products button');
    const showMoreButton = document.getElementById('show-more-products');
    if (showMoreButton && !showMoreButtonInitialized) {
        showMoreButton.addEventListener('click', handleShowMoreClick);
        showMoreButtonInitialized = true;
        console.log('Show more button event listener added');
    } else if (showMoreButtonInitialized) {
        console.log('Show more button already initialized');
    } else {
        console.error('Show more products button not found');
    }
}

function handleShowMoreClick() {
    console.log('Show more button clicked');
    if (displayedProductCount === 20) {
        displayedProductCount = allProductSales.length;
        this.textContent = '접기';
    } else {
        displayedProductCount = 20;
        this.textContent = '더보기';
    }
    updateProductSalesTableDisplay();
}


function initClient() {
    return gapi.client.init({
        'apiKey': API_KEY,
        'discoveryDocs': ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
        initDatePicker();
        startSubscriberCountUpdates();
    }).catch(error => {
        console.error('Error initializing Google API client:', error);
    });
}

function initToggleButtons() {
    initToggleButton('toggle-table', 'sales-table-wrapper');
    initToggleButton('toggle-mapping', 'mapping-content');
}

function initToggleButton(buttonId, contentId) {
    const toggleButton = document.getElementById(buttonId);
    const content = document.getElementById(contentId);
    
    if (toggleButton && content) {
        toggleButton.addEventListener('click', () => {
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggleButton.textContent = '접기';
            } else {
                content.style.display = 'none';
                toggleButton.textContent = '펼치기';
            }
        });
    } else {
        console.warn(`Toggle button or content not found: ${buttonId} or ${contentId}`);
    }
}

function toggleContent(content, button) {
    console.log('Toggle button clicked');
    console.log('Current display:', content.style.display);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        button.textContent = '접기';
    } else {
        content.style.display = 'none';
        button.textContent = '펼치기';
    }
    
    console.log('New display:', content.style.display);
}



async function loadSalesData() {
    console.log('Loading sales data');
    if (!gapi.client.sheets) {
        console.error('Sheets API not loaded');
        return Promise.reject(new Error('Sheets API not loaded'));
    }
    
    try {
        const responses = await Promise.all([
            gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: SMARTSTORE_RANGE
            }),
            gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: OHOUSE_RANGE
            }),
            gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'ohouse2!A2:AO'
            }),
            gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: YTSHOPPING_RANGE
            }),
            gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'mapping!A2:F'
            }),
            loadChannelCommissionInfo()
        ]);
        console.log('Data loaded successfully');
        const smartstoreData = mapSmartstoreData(responses[0].result.values || []);
        const ohouseData = mapOhouseData(responses[1].result.values || []);
        const ohouse2Data = mapOhouse2Data(responses[2].result.values || []);
        const ytshoppingData = mapYTshoppingData(responses[3].result.values || []);
        const mappingData = responses[4].result.values || [];
        const channelInfo = responses[5] || {};

        allData = smartstoreData.concat(ohouseData, ohouse2Data, ytshoppingData);
        allData.sort((a, b) => new Date(b.date) - new Date(a.date));

        loadProductMappings(mappingData);

        const oldestDate = getOldestDate(allData);
        const latestDate = getLatestDate(allData);

        console.log('Total data points:', allData.length);
        console.log('Date range:', oldestDate, 'to', latestDate);
        return channelInfo;
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

function mapSmartstoreData(data) {
    return data.map(row => ({
        seller: '스마트스토어',
        date: formatDateToCustom(row[2]),
        product: row[8],
        option: row[9],
        quantity: parseInt(row[10]) || 0,
        originalSales: parseFloat(row[4]),
        orderStatus: row[3],
        buyerName: row[11],
        buyerId: row[12]
    }));
}

function mapOhouseData(data) {
    return data.map(row => ({
        seller: '오늘의집',
        date: formatDateToCustom(row[22]),
        product: row[3],
        option: row[6],
        quantity: parseInt(row[8]) || 0,
        originalSales: parseFloat(row[21]),
        orderStatus: row[40],
        buyerEmail: row[28]
    }));
}

function mapOhouse2Data(data) {
    return data.map(row => ({
        seller: '오늘의집',
        date: formatDateToCustom(row[13]),
        product: row[5],
        option: row[8],
        quantity: parseInt(row[9]) || 0,
        originalSales: parseFloat(row[20]),
        orderStatus: row[40],
        buyerContact: row[27]
    }));
}

function mapYTshoppingData(data) {
    return data.map(row => {
      const date = formatDateToCustom(row[17]);
      if (date === 'Invalid Date') {
        console.warn('Invalid date in YT shopping data:', row[17]);
        return null;
      }
      return {
        seller: '유튜브쇼핑',
        date: date,
        product: row[6],
        option: row[7],
        quantity: parseInt(row[8]) || 0,
        originalSales: parseFloat(row[9]) || 0,
        orderStatus: '구매확정',
        buyerName: row[10],
        buyerContact: row[11]
      };
    }).filter(item => item !== null);
  }

function loadProductMappings(mappingData) {
    productMappings = {};
    mappingData.forEach(row => {
        const key = `${row[0]}-${row[1]}`;
        productMappings[key] = {
            product: row[2],
            option: row[3],
            price: parseFloat(row[4]),
            cost: parseFloat(row[5])
        };
    });
    console.log("Product mappings loaded:", productMappings);
}

function updateDashboardWithFilteredData(currentData, compareData) {
    console.log('Updating dashboard with filtered data:', currentData);
    updateTotalSales(currentData, compareData);
    updateSalesTable(currentData);
    updateProductSalesTable(currentData);
    updateSellerSalesTable(currentData);
    updateCustomerData(currentData);
    updateOrderStatusTable(currentData);
}

function formatDate(dateString) {
    return dateString.replace(/\//g, '-');
}

function initializeMappings() {
    const uniqueProducts = [...new Set(allData.map(item => `${item.product}-${item.option}`))];
    uniqueProducts.forEach(product => {
        if (!productMappings[product]) {
            const [originalProduct, originalOption] = product.split('-');
            const originalItem = allData.find(item => item.product === originalProduct && item.option === originalOption);
            const originalPrice = originalItem ? (originalItem.originalSales / originalItem.quantity) : 0;
            productMappings[product] = { 
                product: originalProduct, 
                option: originalOption, 
                price: originalPrice,
                cost: 0  // 초기 공급가를 0으로 설정
            };
        }
    });

}


function updateMapping() {
    const originalProduct = document.getElementById('original-product').value;
    const originalOption = document.getElementById('original-option').value;
    const mappedProduct = document.getElementById('mapped-product').value;
    const mappedOption = document.getElementById('mapped-option').value;
    const price = parseFloat(document.getElementById('mapped-price').value);
    const cost = parseFloat(document.getElementById('mapped-cost').value);
  
    const key = `${originalProduct}-${originalOption}`;
    const safeKey = key.replace(/[\/\\\.\#\$]/g, "_").replace(/[\[\]]/g, "");
  
    db.collection("productMappings").doc(safeKey).set({
      originalProduct,
      originalOption,
      mappedProduct,
      mappedOption,
      price,
      cost
    }).then(() => {
      console.log("Mapping updated successfully");
      // Clear input fields
      document.getElementById('original-product').value = '';
      document.getElementById('original-option').value = '';
      document.getElementById('mapped-product').value = '';
      document.getElementById('mapped-option').value = '';
      document.getElementById('mapped-price').value = '';
      document.getElementById('mapped-cost').value = '';
    }).catch((error) => {
      console.error("Error updating mapping: ", error);
    });
  }


function handleMappingChange(event) {
    if (event.target.tagName === 'INPUT') {
        const key = event.target.getAttribute('data-key');
        const type = event.target.getAttribute('data-type');
        const value = type === 'price' ? parseFloat(event.target.value) : event.target.value;
        productMappings[key][type] = value;
        updateDashboard();
    }
}

function saveMappingsToFile() {
    const data = JSON.stringify(productMappings);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_mappings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('매핑 데이터가 파일로 저장되었습니다.');
}

function uploadMappings(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const uploadedMappings = JSON.parse(e.target.result);
                productMappings = uploadedMappings;
                updateDashboard();
                alert('매핑 데이터가 성공적으로 업로드되었습니다.');
            } catch (error) {
                alert('파일을 읽는 중 오류가 발생했습니다.');
                console.error('Error parsing JSON:', error);
            }
        };
        reader.readAsText(file);
    }
}

function getKoreanDate(date = new Date()) {
    return new Date(date.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
}

// 기존 코드 상단에 추가
function formatDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function initDatePicker() {
    const today = getKoreanDate();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    flatpickrInstance = flatpickr("#date-range", {
        mode: "range",
        dateFormat: "Y-m-d",
        defaultDate: [firstDayOfMonth, today],
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                setDateRange(selectedDates[0], selectedDates[1], true);
            }
        }
    });

    // 날짜 버튼 이벤트 리스너
    const dateButtons = [
        'today', 'yesterday', 'this-week', 'last-week', 
        'this-month', 'last-month', 'last-3-months', 'last-6-months', 'all-time'
    ];
    
    dateButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                console.log(`Button clicked: ${buttonId}`); // 디버깅용 로그
                handleDateButtonClick(buttonId);
            });
        } else {
            console.warn(`Button with id '${buttonId}' not found`);
        }
    });
}

function handleDateButtonClick(buttonId) {
    console.log(`Handling click for button: ${buttonId}`);
    let { start, end, compareStart, compareEnd } = getDateRange(buttonId);
    
    // flatpickr 인스턴스 업데이트
    flatpickrInstance.setDate([start, end]);
    
    setDateRange(start, end, false, compareStart, compareEnd);
}

function setDateRange(start, end, isManualSelection = false, compareStart, compareEnd) {
    let startDate = new Date(start);
    let endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    flatpickrInstance.setDate([startDate, endDate]);
    
    const currentData = filterDataByDateRange(startDate, endDate);
    let compareData = null;
    if (compareStart && compareEnd) {
        let compareStartDate = new Date(compareStart);
        let compareEndDate = new Date(compareEnd);
        compareStartDate.setHours(0, 0, 0, 0);
        compareEndDate.setHours(23, 59, 59, 999);
        compareData = filterDataByDateRange(compareStartDate, compareEndDate);
    }
    
    console.log('Current date range:', startDate, '-', endDate);
    console.log('Comparison date range:', compareStart, '-', compareEnd);
    
    loadChannelCommissionInfo().then(channelInfo => {
        updateTotalSales(currentData, compareData);
        updateDashboard(channelInfo, currentData);
        updateChart(currentData, startDate, endDate);
    });
}

function getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function filterDataByDateRange(startDate, endDate) {
    return allData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
    });
}

function getOldestDate(data) {
    const validDates = data.map(item => new Date(item.date)).filter(date => !isNaN(date.getTime()));
    return new Date(Math.min(...validDates));
}

function getLatestDate(data) {
    const validDates = data.map(item => new Date(item.date)).filter(date => !isNaN(date.getTime()));
    return new Date(Math.max(...validDates));
}

function updateSellerSalesTable(data) {
    const sellerSales = {};
    let totalSales = 0;
    data.forEach(row => {
        if (!sellerSales[row.seller]) {
            sellerSales[row.seller] = { sales: 0, products: {} };
        }
        if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
            return;
        }
        const mappedProduct = productMappings[`${row.product}-${row.option}`] || { product: row.product, option: row.option, price: row.originalSales / row.quantity };
        const sales = mappedProduct.price * row.quantity;
        sellerSales[row.seller].sales += sales;
        totalSales += sales;

        // 각 판매처별 상품 정보 저장
        const productKey = `${mappedProduct.product}-${mappedProduct.option}`;
        if (!sellerSales[row.seller].products[productKey]) {
            sellerSales[row.seller].products[productKey] = { product: mappedProduct.product, option: mappedProduct.option, quantity: 0, sales: 0 };
        }
        sellerSales[row.seller].products[productKey].quantity += row.quantity;
        sellerSales[row.seller].products[productKey].sales += sales;
    });

    const tbody = document.querySelector('#seller-sales-table tbody');
    tbody.innerHTML = Object.entries(sellerSales).map(([seller, data]) => `
        <tr class="seller-row" data-seller="${seller}">
            <td>${seller}</td>
            <td>${formatCurrency(data.sales)}</td>
            <td>${((data.sales / totalSales) * 100).toFixed(2)}%</td>
        </tr>
    `).join('');

    // 클릭 이벤트 리스너 추가
    tbody.querySelectorAll('.seller-row').forEach(row => {
        row.addEventListener('click', () => toggleSellerProductSales(row, sellerSales[row.dataset.seller].products));
    });
}

function toggleSellerProductSales(sellerRow, products) {
    const existingProductRow = sellerRow.nextElementSibling;
    if (existingProductRow && existingProductRow.classList.contains('product-sales-row')) {
        existingProductRow.remove();
        return;
    }

    const productRow = document.createElement('tr');
    productRow.classList.add('product-sales-row');
    
    const productCell = document.createElement('td');
    productCell.colSpan = 3;
    
    const productTable = createSellerProductTable(products);
    productCell.appendChild(productTable);
    productRow.appendChild(productCell);

    sellerRow.parentNode.insertBefore(productRow, sellerRow.nextSibling);
}

function createSellerProductTable(products) {
    const table = document.createElement('table');
    table.classList.add('seller-product-table');
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>순위</th>
            <th>상품명</th>
            <th>옵션</th>
            <th>수량</th>
            <th>매출액</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const sortedProducts = Object.values(products).sort((a, b) => b.sales - a.sales);
    
    tbody.innerHTML = sortedProducts.map((product, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${product.product}</td>
            <td>${product.option}</td>
            <td>${product.quantity}</td>
            <td>${formatCurrency(product.sales)}</td>
        </tr>
    `).join('');

    table.appendChild(tbody);
    return table;
}

function showSellerProductSales(seller, products) {
    const title = document.getElementById('seller-product-sales-title');
    const tbody = document.querySelector('#seller-product-sales-table tbody');
    const container = document.getElementById('seller-product-sales');

    title.textContent = `${seller} 상품별 매출`;
    
    const sortedProducts = Object.values(products).sort((a, b) => b.sales - a.sales);
    
    tbody.innerHTML = sortedProducts.map((product, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${product.product}</td>
            <td>${product.option}</td>
            <td>${product.quantity}</td>
            <td>${formatCurrency(product.sales)}</td>
        </tr>
    `).join('');

    container.style.display = 'block';
}

function formatDateToCustom(dateString) {
    if (!dateString) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid Date';
    }
    
    // 날짜 문자열에서 슬래시(/)와 점(.)을 하이픈(-)으로 변경
    dateString = dateString.replace(/[/.]/g, '-');
    
    // 날짜와 시간이 공백으로 구분되어 있는 경우 처리
    const [datePart, timePart] = dateString.split(' ');
    const [year, month, day] = datePart.split('-');
    
    // 연도가 두 자리인 경우 네 자리로 변환 (예: 24 -> 2024)
    const fullYear = year.length === 2 ? '20' + year : year;
    
    // 날짜 객체 생성
    const date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    
    if (isNaN(date.getTime())) {
        console.warn(`Invalid date encountered: ${dateString}`);
        return 'Invalid Date';
    }
    
    // YYYY-MM-DD 형식으로 반환
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function updateTotalSales(data) {
    const totalSales = data.reduce((sum, row) => {
        const mappedProduct = productMappings[`${row.product}-${row.option}`];
        const price = mappedProduct ? mappedProduct.price : (row.originalSales / row.quantity);
        
        if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
            return sum;
        }
        
        return sum + (price * row.quantity);
    }, 0);
    document.getElementById('total-sales').textContent = formatCurrency(totalSales);
}

function updateTotalSales(currentData, compareData) {
    if (!Array.isArray(currentData)) {
        console.error('Invalid data passed to updateTotalSales');
        return;
    }

    const currentResult = calculateSalesData(currentData);
    
    document.getElementById('total-sales').textContent = formatCurrency(currentResult.totalSales);
    document.getElementById('order-count').textContent = currentResult.orderCount;
    document.getElementById('customer-count').textContent = currentResult.uniqueCustomers;

    if (compareData && compareData.length > 0) {
        const compareResult = calculateSalesData(compareData);
        
        updateComparisonData('sales-comparison', currentResult.totalSales, compareResult.totalSales);
        updateComparisonData('order-count-comparison', currentResult.orderCount, compareResult.orderCount);
        updateComparisonData('customer-count-comparison', currentResult.uniqueCustomers, compareResult.uniqueCustomers);
        
        document.getElementById('sales-comparison').style.display = 'block';
        document.getElementById('order-count-comparison').style.display = 'block';
        document.getElementById('customer-count-comparison').style.display = 'block';
    } else {
        document.getElementById('sales-comparison').style.display = 'none';
        document.getElementById('order-count-comparison').style.display = 'none';
        document.getElementById('customer-count-comparison').style.display = 'none';
    }

    console.log('Current period data:', currentResult);
    console.log('Comparison period data:', compareData ? calculateSalesData(compareData) : 'No comparison data');
}

function calculateSalesData(data) {
    let totalSales = 0;
    let orderCount = 0;
    const uniqueCustomers = new Set();

    data.forEach(row => {
        if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
            return;
        }

        const mappedProduct = productMappings[`${row.product}-${row.option}`] || { 
            price: row.originalSales / row.quantity 
        };
        const sales = mappedProduct.price * row.quantity;
        
        totalSales += sales;
        orderCount++;

        const customerId = row.buyerId || row.buyerEmail || row.buyerContact;
        if (customerId) {
            uniqueCustomers.add(customerId);
        }
    });

    return {
        totalSales,
        orderCount,
        uniqueCustomers: uniqueCustomers.size
    };
}

function updateComparisonData(elementId, currentValue, compareValue) {
    const element = document.getElementById(elementId);
    const difference = currentValue - compareValue;
    const percentChange = compareValue !== 0 ? ((difference / compareValue) * 100).toFixed(2) : 100;
    const sign = difference >= 0 ? '+' : '-';
    const className = difference >= 0 ? 'increase' : 'decrease';

    let amountText = '';
    if (elementId === 'sales-comparison') {
        amountText = formatCurrency(Math.abs(difference));
    } else {
        amountText = formatNumber(Math.abs(difference));
    }

    element.innerHTML = `
        <span class="percent ${className}">${sign}${Math.abs(percentChange)}%</span>
        <span class="amount">${sign}${amountText}</span>
    `;
    element.className = `comparison ${className}`;

    console.log(`Comparison for ${elementId}:`, { currentValue, compareValue, difference, percentChange });
}

function formatNumber(number) {
    return number.toLocaleString('ko-KR');
}

function updateSalesTable(data) {
    const tbody = document.querySelector('#sales-table tbody');
    tbody.innerHTML = data.map(row => {
        const mappedProduct = productMappings[`${row.product}-${row.option}`] || { product: row.product, option: row.option, price: row.originalSales / row.quantity };
        let calculatedSales = mappedProduct.price * row.quantity;
        
        if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
            calculatedSales = 0;
        }

        // 날짜 포맷팅
        let formattedDate;
        if (row.seller === '스마트스토어') {
            // 스마트스토어의 경우 이미 원하는 형식으로 되어 있으므로 그대로 사용
            formattedDate = row.date;
        } else {
            // 오늘의집 데이터의 경우 이전 방식대로 포맷팅
            const dateObj = new Date(row.date);
            formattedDate = dateObj.toLocaleString('ko-KR', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false 
            });
        }

        return `
        <tr>
            <td>${row.seller}</td>
            <td>${formattedDate}</td>
            <td>${mappedProduct.product}</td>
            <td>${mappedProduct.option}</td>
            <td>${row.quantity}</td>
            <td>${formatCurrency(calculatedSales)}</td>
            <td>${row.orderStatus}</td>
        </tr>
    `}).join('');
}

function updateOrderStatusTable(data) {
    const orderStatusCounts = {};
    let totalOrders = 0;

    data.forEach(row => {
        if (!orderStatusCounts[row.orderStatus]) {
            orderStatusCounts[row.orderStatus] = 0;
        }
        orderStatusCounts[row.orderStatus]++;
        if (!ZERO_SALES_STATUSES.includes(row.orderStatus)) {
            totalOrders++;
        }
    });

    const tbody = document.querySelector('#order-status-table tbody');
    tbody.innerHTML = Object.entries(orderStatusCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([status, count]) => {
            const ratio = ((count / data.length) * 100).toFixed(2);
            return `
                <tr>
                    <td>${status}</td>
                    <td>${count}</td>
                    <td>${ratio}%</td>
                </tr>
            `;
        }).join('');

    // 총 주문 건수 업데이트 (취소, 미결제 취소 제외)
    document.getElementById('order-count').textContent = totalOrders;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
}


gapi.load('client', initClient);

const clickableCells = ['cell-2-2', 'cell-2-5', 'cell-2-8', 'cell-5-2', 'cell-5-8', 'cell-8-2', 'cell-8-5', 'cell-8-8'];
let currentOpenCell = null;

// 셀 간의 연동 매핑
const cellMapping = {
    'cell-4-4': 'cell-2-2', 'cell-4-5': 'cell-2-5', 'cell-4-6': 'cell-2-8',
    'cell-5-4': 'cell-5-2', 'cell-5-6': 'cell-5-8',
    'cell-6-4': 'cell-8-2', 'cell-6-5': 'cell-8-5', 'cell-6-6': 'cell-8-8'
};

let mandalaData = {};

// 만다라트 관련 함수
function initMandala() {
    console.log('Initializing Mandala Chart');
    const mandalaChart = document.querySelector('.mandala-chart');
    if (!mandalaChart) {
        console.error('Mandala chart not found');
        return;
    }

    clickableCells.forEach(cellId => {
        const cell = document.getElementById(cellId);
        if (cell) {
            cell.classList.add('clickable-cell');
            cell.addEventListener('click', handleCellClick);
        } else {
            console.error(`Cell not found: ${cellId}`);
        }
    });

    // 모든 셀에 대해 input 이벤트 리스너 추가
    document.querySelectorAll('.mandala-cell').forEach(cell => {
        cell.addEventListener('input', updateMandalaCell);
    });

    // 저장 버튼에 이벤트 리스너 추가
    const saveButton = document.getElementById('save-mandala');
    if (saveButton) {
        saveButton.addEventListener('click', saveMandalaToDatabase);
    } else {
        console.error('Save mandala button not found');
    }

    loadMandalaData();
}


function saveMandalaToDatabase() {
    const batch = db.batch();

    Object.entries(mandalaData).forEach(([cellId, data]) => {
        const docRef = db.collection("mandala").doc(cellId);
        batch.set(docRef, data);
    });

    batch.commit()
        .then(() => {
            alert('만다라트가 성공적으로 저장되었습니다.');
            mandalaData = {}; // 저장 후 로컬 데이터 초기화
        })
        .catch((error) => {
            console.error("Error saving mandala: ", error);
            alert('만다라트 저장 중 오류가 발생했습니다.');
        });
}

function loadMandalaData() {
    db.collection("mandala").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const cell = document.getElementById(doc.id);
            if (cell) {
                cell.textContent = data.content;
                cell.classList.toggle('completed-task', data.completed);
            }
        });
    }).catch((error) => {
        console.error("Error loading mandala data: ", error);
    });
}

function updateMandalaCell(event) {
    const cellId = event.target.id;
    const content = event.target.textContent;
    const completed = event.target.classList.contains('completed-task');

    db.collection("mandala").doc(cellId).set({
        content,
        completed
    }).catch((error) => {
        console.error("Error updating mandala cell: ", error);
    });

    updateLinkedCells(event);
}

function handleCellClick(event) {
    const cellId = event.target.id;
    const dropdown = document.getElementById('mandala-dropdown');

    if (currentOpenCell === cellId) {
        dropdown.style.display = 'none';
        currentOpenCell = null;
    } else {
        const surroundingCells = getSurroundingCells(cellId);
        showDropdown(cellId, surroundingCells, event);
        currentOpenCell = cellId;
    }
}

function getSurroundingCells(cellId) {
    const [row, col] = cellId.split('-').slice(1).map(Number);
    const surroundingPositions = [
        [row-1, col-1], [row-1, col], [row-1, col+1],
        [row, col-1], [row, col+1],
        [row+1, col-1], [row+1, col], [row+1, col+1]
    ];
    return surroundingPositions.map(([r, c]) => document.getElementById(`cell-${r}-${c}`));
}

function showDropdown(cellId, surroundingCells, event) {
    const dropdown = document.getElementById('mandala-dropdown');
    const title = document.getElementById('dropdown-title');
    const list = document.getElementById('dropdown-list');

    title.textContent = document.getElementById(cellId).textContent || cellId;
    list.innerHTML = '';

    surroundingCells.forEach((cell, index) => {
        if (cell) {
            const li = document.createElement('li');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `checkbox-${cellId}-${index}`;
            checkbox.checked = cell.classList.contains('completed-task');
            checkbox.addEventListener('change', (e) => {
                cell.classList.toggle('completed-task', e.target.checked);
                updateMandalaCell({ target: cell });
            });

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = cell.textContent;

            li.appendChild(checkbox);
            li.appendChild(label);
            list.appendChild(li);
        }
    });

    dropdown.style.display = 'block';
    dropdown.style.left = `${event.pageX}px`;
    dropdown.style.top = `${event.pageY}px`;
}

function updateLinkedCell(event) {
    const cellId = event.target.id;
    const content = event.target.textContent;

    // 연동된 셀 업데이트
    if (cellId in cellMapping) {
        document.getElementById(cellMapping[cellId]).textContent = content;
    } else {
        const linkedCellId = Object.keys(cellMapping).find(key => cellMapping[key] === cellId);
        if (linkedCellId) {
            document.getElementById(linkedCellId).textContent = content;
        }
    }
}

// 채널 수수료 정보를 로드하는 함수
function loadChannelCommissionInfo() {
    return gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'channel!A2:F'  // F열까지 확장 (유튜브쇼핑 수수료 포함)
    }).then(function(response) {
        const channelInfo = {};
        response.result.values.forEach(row => {
            const key = `${row[0]}-${row[1]}`;  // 상품명-옵션
            channelInfo[key] = {
                smartstore: { rate: parseFloat(row[2]) / 100 },
                ohouse: { rate: parseFloat(row[3]) / 100 },
                ytshopping: { rate: parseFloat(row[4]) / 100 }  // 유튜브쇼핑 수수료 추가
            };
        });
        return channelInfo;
    });
}

function updateChannelCommission(data, channelInfo) {
    const channelCommissions = {};
    let totalSales = 0;
    let totalSmartstore = 0;
    let totalOhouse = 0;
    let totalYTshopping = 0;

    data.forEach(row => {
        if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
            return;
        }

        const mappedProduct = productMappings[`${row.product}-${row.option}`] || { 
            product: row.product, 
            option: row.option, 
            price: row.originalSales / row.quantity 
        };

        const key = `${mappedProduct.product}-${mappedProduct.option}`;
        if (!channelCommissions[key]) {
            channelCommissions[key] = {
                product: mappedProduct.product,
                option: mappedProduct.option,
                smartstore: { amount: 0, rate: channelInfo[key]?.smartstore?.rate || 0 },
                ohouse: { amount: 0, rate: channelInfo[key]?.ohouse?.rate || 0 },
                ytshopping: { amount: 0, rate: channelInfo[key]?.ytshopping?.rate || 0 },
                totalSales: 0,
                totalCommission: 0
            };
        }

        const sales = mappedProduct.price * row.quantity;
        channelCommissions[key].totalSales += sales;
        totalSales += sales;

        if (row.seller === '스마트스토어') {
            const amount = sales * channelCommissions[key].smartstore.rate;
            channelCommissions[key].smartstore.amount += amount;
            totalSmartstore += amount;
            channelCommissions[key].totalCommission += amount;
        } else if (row.seller === '오늘의집') {
            const amount = sales * channelCommissions[key].ohouse.rate;
            channelCommissions[key].ohouse.amount += amount;
            totalOhouse += amount;
            channelCommissions[key].totalCommission += amount;
        } else if (row.seller === '유튜브쇼핑') {
            const amount = sales * channelCommissions[key].ytshopping.rate;
            channelCommissions[key].ytshopping.amount += amount;
            totalYTshopping += amount;
            channelCommissions[key].totalCommission += amount;
        }
    });

    const sortedCommissions = Object.values(channelCommissions).sort((a, b) => b.totalCommission - a.totalCommission);

    const tbody = document.querySelector('#channel-commission-table tbody');
    let tableContent = sortedCommissions.map(item => {
        const averageRate = item.totalSales > 0 ? (item.totalCommission / item.totalSales) * 100 : 0;
        return `
            <tr>
                <td>${item.product}</td>
                <td>${item.option}</td>
                <td>${formatCurrency(item.smartstore.amount)} (${(item.smartstore.rate * 100).toFixed(2)}%)</td>
                <td>${formatCurrency(item.ohouse.amount)} (${(item.ohouse.rate * 100).toFixed(2)}%)</td>
                <td>${formatCurrency(item.ytshopping.amount)} (${(item.ytshopping.rate * 100).toFixed(2)}%)</td>
                <td>${formatCurrency(item.totalCommission)}</td>
                <td>${averageRate.toFixed(2)}%</td>
            </tr>
        `;
    }).join('');

    const totalCommission = totalSmartstore + totalOhouse + totalYTshopping;
    const averageTotalRate = totalSales > 0 ? (totalCommission / totalSales) * 100 : 0;
    const totalRow = `
        <tr class="total-row">
            <td colspan="2"><strong>합계</strong></td>
            <td><strong>${formatCurrency(totalSmartstore)}</strong></td>
            <td><strong>${formatCurrency(totalOhouse)}</strong></td>
            <td><strong>${formatCurrency(totalYTshopping)}</strong></td>
            <td><strong>${formatCurrency(totalCommission)}</strong></td>
            <td><strong>${averageTotalRate.toFixed(2)}%</strong></td>
        </tr>
    `;

    tbody.innerHTML = tableContent + totalRow;
}

function updateDashboard(channelInfo, currentData) {
    console.log('Updating dashboard');
    console.log(`Using data: ${currentData.length} items`);
    
    if (!currentData || currentData.length === 0) {
        console.error('No data available for dashboard update');
        return;
    }

    const customerData = updateCustomerData(currentData);
    
    updateProductSalesTable(currentData, channelInfo);
    updateSellerSalesTable(currentData);
    updateOrderStatusTable(currentData);
    updateChannelCommission(currentData, channelInfo);
    
    updateTopChannels(currentData);
    updateTopProductsBySales(currentData);
    updateTopProductsByQuantity(currentData);
    updateSalesByDayChart(currentData);
    updateSalesByDayChart(calculateSalesByDay(currentData));

    const dateRange = flatpickrInstance.selectedDates;
    if (dateRange.length === 2 && salesChart) {
        updateChart(currentData, dateRange[0], dateRange[1]);
    }

    const sellerProductSales = document.getElementById('seller-product-sales');
    if (sellerProductSales) {
        sellerProductSales.style.display = 'none';
    }

    const detailDataTab = document.getElementById('detailDataTab');
    if (detailDataTab && detailDataTab.classList.contains('active')) {
        updateDetailDataTable(currentData);
    }

    updateSortButtons();
    sortProductSales();
    updateProductSalesTableDisplay();
}

function initProductSalesSort() {
    console.log('Initializing product sales sort');
    const table = document.getElementById('product-sales-table');
    
    table.addEventListener('click', (event) => {
        const target = event.target.closest('.sort-button');
        if (target) {
            console.log('Sort button clicked:', target.getAttribute('data-sort'));
            const column = target.getAttribute('data-sort');
            if (currentSort.column === column) {
                currentSort.order = currentSort.order === 'desc' ? 'asc' : 
                                    currentSort.order === 'asc' ? 'default' : 'desc';
            } else {
                currentSort = { column, order: 'desc' };
            }
            updateSortButtons();
            sortProductSales();
            updateProductSalesTableDisplay();
        }
    });

    // 초기 정렬 상태 설정
    currentSort = { column: 'sales', order: 'desc' };
    updateSortButtons();
    sortProductSales();
}

function calculateSalesByDay(data) {
    const salesByDay = {
      '일': 0, '월': 0, '화': 0, '수': 0, '목': 0, '금': 0, '토': 0
    };
  
    data.forEach(row => {
      if (row.seller === '스마트스토어' && ZERO_SALES_STATUSES.includes(row.orderStatus)) {
        return;
      }
      const date = new Date(row.date);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', row.date);
        return;
      }
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      const mappedProduct = productMappings[`${row.product}-${row.option}`] || { 
        price: row.originalSales / row.quantity 
      };
      const sales = mappedProduct.price * row.quantity;
      salesByDay[dayOfWeek] += sales;
    });
  
    return salesByDay;
  }

function updateSortButtons() {
    console.log('Updating sort buttons');
    const buttons = document.querySelectorAll('#product-sales-table th .sort-button');
    buttons.forEach(button => {
        const column = button.getAttribute('data-sort');
        button.classList.remove('asc', 'desc');
        if (column === currentSort.column) {
            if (currentSort.order === 'asc') {
                button.classList.add('asc');
                button.textContent = '▲';
            } else if (currentSort.order === 'desc') {
                button.classList.add('desc');
                button.textContent = '▼';
            } else {
                button.textContent = '◆';
            }
        } else {
            button.textContent = '◆';
        }
        console.log(`Button ${column} set to ${button.textContent}`);
    });
}


function sortProductSales() {
    if (currentSort.order === 'default') {
        allProductSales.sort((a, b) => a.originalIndex - b.originalIndex);
    } else {
        allProductSales.sort((a, b) => {
            let compareA = a[currentSort.column];
            let compareB = b[currentSort.column];
            
            if (currentSort.column === 'product') {
                compareA = a.product + a.option;
                compareB = b.product + b.option;
            }
            
            if (typeof compareA === 'string') {
                compareA = compareA.toLowerCase();
                compareB = compareB.toLowerCase();
            }
            
            if (compareA < compareB) return currentSort.order === 'asc' ? -1 : 1;
            if (compareA > compareB) return currentSort.order === 'asc' ? 1 : -1;
            return 0;
        });
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const shapes = ['◆', '▲', '▼']; // 순환할 도형 모양
    const tableHeaders = document.querySelectorAll('.sort-button');

    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortAttribute = header.getAttribute('data-sort');
            const currentShape = header.textContent.trim();
            const nextShapeIndex = (shapes.indexOf(currentShape) + 1) % shapes.length;
            const nextShape = shapes[nextShapeIndex];

            let sortDirection = '';
            if (nextShape === '▲') {
                sortDirection = 'asc';
            } else if (nextShape === '▼') {
                sortDirection = 'desc';
            }

            // 업데이트된 sort buttons 상태 반영
            updateSortButtons(sortAttribute, sortDirection);

            if (sortDirection) {
                const table = header.closest('table');
                const tbody = table.querySelector('tbody');
                sortTable(tbody, sortAttribute, sortDirection);
            }
        });
    });

    function sortTable(tbody, sortAttribute, sortDirection) {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const index = Array.from(tbody.closest('table').querySelectorAll('th')).findIndex(th => th.querySelector(`[data-sort="${sortAttribute}"]`));

        rows.sort((a, b) => {
            const aText = a.cells[index].textContent.trim();
            const bText = b.cells[index].textContent.trim();

            if (sortDirection === 'asc') {
                return aText.localeCompare(bText, 'ko', { numeric: true });
            } else {
                return bText.localeCompare(aText, 'ko', { numeric: true });
            }
        });

        rows.forEach(row => tbody.appendChild(row));
    }

    function updateSortButtons(activeColumn, sortDirection) {
        const buttons = document.querySelectorAll('.sort-button');
        buttons.forEach(button => {
            const column = button.getAttribute('data-sort');
            if (column === activeColumn) {
                if (sortDirection === 'asc') {
                    button.classList.add('asc');
                    button.classList.remove('desc');
                    button.textContent = '▲';
                } else if (sortDirection === 'desc') {
                    button.classList.add('desc');
                    button.classList.remove('asc');
                    button.textContent = '▼';
                } else {
                    button.classList.remove('asc', 'desc');
                    button.textContent = '◆';
                }
            } else {
                button.classList.remove('asc', 'desc');
                button.textContent = '◆';
            }
        });
    }
});

console.log('Script loaded');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    initializeApp();
});