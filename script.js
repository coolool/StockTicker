// Game settings for stock events
let settings = {
    stockCrashChance: 0.05,          // 5% chance for a stock crash
    stockRocketChance: 0.15,         // 15% chance for stock rocket
    marketBoomChance: 0.5,           // 50% chance for market boom
    stockStartValue: 10,             // Starting stock value
    stockCrashDivider: 2,            // Divider for stock crash (stock loses half value)
    rocketMultiplier: 3,             // Multiplier for stock rocket
    marketBoomIncrease: 5            // Increase for market boom
};

// Stock prices data, initialized to the start value for all stocks
const stocks = {
    gold: [settings.stockStartValue],
    silver: [settings.stockStartValue],
    oil: [settings.stockStartValue],
    industrial: [settings.stockStartValue],
    bonds: [settings.stockStartValue],
    grain: [settings.stockStartValue]
};

// Historical data for the line chart
const stockHistory = {
    gold: [settings.stockStartValue],
    silver: [settings.stockStartValue],
    oil: [settings.stockStartValue],
    industrial: [settings.stockStartValue],
    bonds: [settings.stockStartValue],
    grain: [settings.stockStartValue]
};

let rollingInterval;
let isPaused = false;
let roundTime;
let initialRoundTime;
let timerInterval;
const removedStocks = new Set();

const ctxBar = document.getElementById('allStocksChart').getContext('2d');
const ctxLine = document.getElementById('lineStocksChart').getContext('2d');  // For the line chart
let yMax = 20;

// Bar chart configuration
const allStocksChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
        labels: ['Gold', 'Silver', 'Oil', 'Industrial', 'Bonds', 'Grain'],
        datasets: [{
            label: 'Stock Prices (Bar)',
            data: [stocks.gold[0], stocks.silver[0], stocks.oil[0], stocks.industrial[0], stocks.bonds[0], stocks.grain[0]],
            backgroundColor: [
                'rgba(255, 215, 0, 0.8)',  // Gold
                'rgba(192, 192, 192, 0.8)', // Silver
                'rgba(0, 0, 0, 0.8)',       // Oil
                'rgba(100, 149, 237, 0.8)', // Industrial
                'rgba(75, 192, 192, 0.8)',  // Bonds
                'rgba(139, 69, 19, 0.8)'    // Grain
            ],
            borderColor: [
                'rgba(255, 215, 0, 1)',  // Gold
                'rgba(192, 192, 192, 1)', // Silver
                'rgba(0, 0, 0, 1)',       // Oil
                'rgba(100, 149, 237, 1)', // Industrial
                'rgba(75, 192, 192, 1)',  // Bonds
                'rgba(139, 69, 19, 1)'    // Grain
            ],
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                max: yMax
            }
        },
        responsive: true,
        maintainAspectRatio: false
    }
});

// Line chart configuration
const lineStocksChart = new Chart(ctxLine, {
    type: 'line',
    data: {
        labels: Array(stockHistory.gold.length).fill(0).map((_, i) => `Roll ${i + 1}`),  // Time labels for the X-axis
        datasets: [
            {
                label: 'Gold',
                data: stockHistory.gold,
                borderColor: 'rgba(255, 215, 0, 1)',
                fill: false
            },
            {
                label: 'Silver',
                data: stockHistory.silver,
                borderColor: 'rgba(192, 192, 192, 1)',
                fill: false
            },
            {
                label: 'Oil',
                data: stockHistory.oil,
                borderColor: 'rgba(0, 0, 0, 1)',
                fill: false
            },
            {
                label: 'Industrial',
                data: stockHistory.industrial,
                borderColor: 'rgba(100, 149, 237, 1)',
                fill: false
            },
            {
                label: 'Bonds',
                data: stockHistory.bonds,
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false
            },
            {
                label: 'Grain',
                data: stockHistory.grain,
                borderColor: 'rgba(139, 69, 19, 1)',
                fill: false
            }
        ]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                max: yMax
            },
            x: {
                max: stockHistory.gold.length // Limit X axis to the furthest line
            }
        },
        responsive: true,
        maintainAspectRatio: false
    }
});

// Save the game state into localStorage
const saveGame = () => {
    const gameState = {
        stocks,
        stockHistory,
        roundTime,
        initialRoundTime,
        removedStocks: Array.from(removedStocks) // Convert Set to Array for saving
    };

    localStorage.setItem('stockTickerGameState', JSON.stringify(gameState));
    logNews('Game saved!');
};

// Load the game state from localStorage
const loadGame = () => {
    const savedState = JSON.parse(localStorage.getItem('stockTickerGameState'));
    if (savedState) {
        Object.assign(stocks, savedState.stocks);
        Object.assign(stockHistory, savedState.stockHistory);
        roundTime = savedState.roundTime;
        initialRoundTime = savedState.initialRoundTime;
        removedStocks.clear();
        savedState.removedStocks.forEach(stock => removedStocks.add(stock));

        updatePrices();
        updateChart();
        logNews('Game loaded successfully!');
    } else {
        logNews('No saved game found.');
    }
};

// Add event listeners for the Save and Load buttons
document.getElementById('saveGameButton').addEventListener('click', saveGame);
document.getElementById('loadGameButton').addEventListener('click', loadGame);

// Prediction logic: guessing stocks that are likely to spike based on recent trends
const updatePredictions = () => {
    const predictionText = [];

    for (const stock in stocks) {
        const history = stocks[stock];
        if (history.length > 2) {
            const lastChange = history[history.length - 1] - history[history.length - 2];

            // Basic prediction: if the stock has gone up in the last turn, predict a spike
            if (lastChange > 0) {
                predictionText.push(`${stock.charAt(0).toUpperCase() + stock.slice(1)} may spike.`);
            }
        }
    }

    // Display predictions
    const predictionsList = document.getElementById('predictionsList');
    predictionsList.innerHTML = ''; // Clear previous predictions
    predictionText.forEach(prediction => {
        const p = document.createElement('p');
        p.textContent = prediction;
        predictionsList.appendChild(p);
    });
};

// Log messages to the "News Log" and prepend new messages at the top
const logNews = (message) => {
    const newsLog = document.getElementById('newsLog');
    const newMessage = document.createElement('p');
    newMessage.textContent = message;
    newsLog.prepend(newMessage);  // Prepend to add at the top
};

// Ensure that stock values never drop below zero
const ensureNonNegative = (value) => {
    return Math.max(0, value);
};

// Update the predictions and price section every roll
const updatePredictionsAndPrices = () => {
    updatePrices();
    updatePredictions();
};

// Check for special events: Stock Crash, Rocket, and Market Boom
const checkSpecialEvents = () => {
    // Stock Crash if time is below half
    if (roundTime < initialRoundTime / 2) {
        if (Math.random() < settings.stockCrashChance) {
            const highestStock = Object.keys(stocks).reduce((max, stock) => 
                stocks[stock][stocks[stock].length - 1] > stocks[max][stocks[max].length - 1] ? stock : max, 'gold');
            stocks[highestStock].push(ensureNonNegative(stocks[highestStock][stocks[highestStock].length - 1] / settings.stockCrashDivider));
            stockHistory[highestStock].push(ensureNonNegative(stocks[highestStock][stocks[highestStock].length - 1]));
            logNews(`Stock Crash! ${highestStock.charAt(0).toUpperCase() + highestStock.slice(1)} lost half its value!`);
        }
    }

    // Stock Rocket in the last 10 seconds
    if (roundTime <= 10) {
        if (Math.random() < settings.stockRocketChance) {
            const eligibleStocks = Object.keys(stocks).filter(stock => stocks[stock][stocks[stock].length - 1] < 10);
            if (eligibleStocks.length > 0) {
                const randomStock = eligibleStocks[Math.floor(Math.random() * eligibleStocks.length)];
                stocks[randomStock].push(ensureNonNegative(stocks[randomStock][stocks[randomStock].length - 1] * settings.rocketMultiplier));
                stockHistory[randomStock].push(ensureNonNegative(stocks[randomStock][stocks[randomStock].length - 1]));
                logNews(`Stock Rocket! ${randomStock.charAt(0).toUpperCase() + randomStock.slice(1)} tripled in value!`);
            }
        }
    }

    // Market Boom if all stocks are below $10
    const allBelowTen = Object.keys(stocks).every(stock => stocks[stock][stocks[stock].length - 1] < 10);
    if (allBelowTen) {
        if (Math.random() < settings.marketBoomChance) {
            const selectedStocks = Object.keys(stocks).sort(() => 0.5 - Math.random()).slice(0, 3);
            selectedStocks.forEach(stock => {
                stocks[stock].push(ensureNonNegative(stocks[stock][stocks[stock].length - 1] + settings.marketBoomIncrease));
                stockHistory[stock].push(ensureNonNegative(stocks[stock][stocks[stock].length - 1]));
                logNews(`Market Boom! ${stock.charAt(0).toUpperCase() + stock.slice(1)} increased by $${settings.marketBoomIncrease}.`);
            });
        }
    }
};

// Update both the bar chart (current stock prices) and line chart (historical stock prices)
const updateChart = () => {
    const currentPrices = [
        removedStocks.has('gold') ? 0 : stocks.gold[stocks.gold.length - 1],
        removedStocks.has('silver') ? 0 : stocks.silver[stocks.silver.length - 1],
        removedStocks.has('oil') ? 0 : stocks.oil[stocks.oil.length - 1],
        removedStocks.has('industrial') ? 0 : stocks.industrial[stocks.industrial.length - 1],
        removedStocks.has('bonds') ? 0 : stocks.bonds[stocks.bonds.length - 1],
        removedStocks.has('grain') ? 0 : stocks.grain[stocks.grain.length - 1],
    ];

    // Update bar chart data
    allStocksChart.data.datasets[0].data = currentPrices;

    // Add time label to line chart for each new roll
    lineStocksChart.data.labels.push(`Roll ${stockHistory.gold.length}`);
    
    // Update historical data for the line chart
    lineStocksChart.data.datasets[0].data = stockHistory.gold;
    lineStocksChart.data.datasets[1].data = stockHistory.silver;
    lineStocksChart.data.datasets[2].data = stockHistory.oil;
    lineStocksChart.data.datasets[3].data = stockHistory.industrial;
    lineStocksChart.data.datasets[4].data = stockHistory.bonds;
    lineStocksChart.data.datasets[5].data = stockHistory.grain;

    const maxStockValue = Math.max(...currentPrices);
    if (maxStockValue >= yMax) {
        yMax = maxStockValue + 5;
        allStocksChart.options.scales.y.max = yMax;
        lineStocksChart.options.scales.y.max = yMax;
    }

    // Limit X axis to the stock with the most data points (furthest line)
    const maxHistoryLength = Math.max(stockHistory.gold.length, stockHistory.silver.length, stockHistory.oil.length, stockHistory.industrial.length, stockHistory.bonds.length, stockHistory.grain.length);
    lineStocksChart.options.scales.x.max = maxHistoryLength;

    // Update both charts
    allStocksChart.update();
    lineStocksChart.update();
};

// Update prices in the "Current Stock Prices" section
const updatePrices = () => {
    document.getElementById('goldPrice').textContent = removedStocks.has('gold') ? 'Removed' : stocks.gold[stocks.gold.length - 1].toFixed(0);
    document.getElementById('silverPrice').textContent = removedStocks.has('silver') ? 'Removed' : stocks.silver[stocks.silver.length - 1].toFixed(0);
    document.getElementById('oilPrice').textContent = removedStocks.has('oil') ? 'Removed' : stocks.oil[stocks.oil.length - 1].toFixed(0);
    document.getElementById('industrialPrice').textContent = removedStocks.has('industrial') ? 'Removed' : stocks.industrial[stocks.industrial.length - 1].toFixed(0);
    document.getElementById('bondsPrice').textContent = removedStocks.has('bonds') ? 'Removed' : stocks.bonds[stocks.bonds.length - 1].toFixed(0);
    document.getElementById('grainPrice').textContent = removedStocks.has('grain') ? 'Removed' : stocks.grain[stocks.grain.length - 1].toFixed(0);
};

// Timer and pause functionality
const startRoundTimer = () => {
    roundTime = parseInt(document.getElementById('customTimer').value); // Get custom time from input
    initialRoundTime = roundTime;
    removedStocks.clear();
    updatePrices();
    updateChart();

    timerInterval = setInterval(() => {
        if (roundTime > 0) {
            roundTime--;
            document.getElementById('customTimer').value = roundTime;  // Update timer display
            checkSpecialEvents();  // Check for crashes, rockets, and booms during the timer
        } else {
            clearInterval(timerInterval);
            clearInterval(rollingInterval);  // Auto pause the game
            document.getElementById('pauseButton').textContent = 'Resume';
            isPaused = true;
            logNews('Buy or Sell Stocks!');
        }
    }, 1000);  // Timer counts down every 1 second
};

const togglePause = () => {
    if (isPaused) {
        startAutoRolling();
        document.getElementById('pauseButton').textContent = 'Pause';
    } else {
        clearInterval(rollingInterval);
        clearInterval(timerInterval);
        document.getElementById('pauseButton').textContent = 'Resume';
    }
    isPaused = !isPaused;
};

// Roll dice and trigger stock changes
const rollDice = () => {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const dice3 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2 + dice3;

    // Stock price change by $2 increments (total * 0.20)
    let change = Math.floor(total * 0.20);  
    const upOrDown = Math.random() < 0.5 ? -1 : 1;

    const stockKeys = Object.keys(stocks);
    const randomStock = stockKeys[Math.floor(Math.random() * stockKeys.length)];

    if (removedStocks.has(randomStock)) return;

    let newValue = ensureNonNegative(stocks[randomStock][stocks[randomStock].length - 1] + (change * upOrDown));
    stocks[randomStock].push(newValue);

    // Update the historical data for the line chart
    stockHistory[randomStock].push(newValue);

    logNews(`${randomStock.charAt(0).toUpperCase() + randomStock.slice(1)} updated by $${Math.abs(change * upOrDown)} (${upOrDown === 1 ? 'up' : 'down'})`);
    
    updateChart();
    updatePredictionsAndPrices();
};

const startAutoRolling = () => {
    rollingInterval = setInterval(rollDice, 1000);  // Roll every 1 second
    startRoundTimer();  // Start timer when game starts
};

// Start game automatically
startAutoRolling();

// Add event listener for pause/resume button
document.getElementById('pauseButton').addEventListener('click', togglePause);
