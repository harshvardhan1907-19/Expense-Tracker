// ============ STATE ============
let transactions = [];
let currentFilter = 'all';
let chartInstance = null;

// ============ UTILITIES ============
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function filterByDateRange(transactionsList, range) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (range === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return transactionsList.filter(t => new Date(t.date) >= weekAgo);
        
        // Long version (same as arrow function):
        // function(t) {
        //     return new Date(t.date) >= weekAgo;
        // }

        // Arrow function (shorter):
        // t => new Date(t.date) >= weekAgo
    }

    if (range === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return transactionsList.filter(t => new Date(t.date) >= monthAgo);
    }

    return transactionsList;
}

function getCategorySpending(transactionsList) {
    const expenses = transactionsList.filter(t => t.amount < 0);
    const categoryMap = {};

    expenses.forEach(expense => {
        const cat = expense.category;
        categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(expense.amount);
    });

    return categoryMap;
}

// ============ DATA OPERATIONS ============
function loadTransactions() {
    const saved = localStorage.getItem('expense-tracker-data');
    if (saved) {
        transactions = JSON.parse(saved);
    }
}

function saveTransactions() {
    localStorage.setItem('expense-tracker-data', JSON.stringify(transactions));
}

function addTransaction(description, amount, date, category) {
    const transaction = {
        id: Date.now(),
        description,
        amount: Number(amount),
        date,
        category
    };
    transactions.push(transaction);
    saveTransactions();
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
}

function calculateTotals(transactionsList) {
    const income = transactionsList
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactionsList
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const balance = income - expense;
    return { income, expense, balance };
}

// ============ UI RENDERING ============
function renderTransactions(transactionsList) {
    const listElement = document.getElementById('transaction-list');

    if (transactionsList.length === 0) {
        listElement.innerHTML = '<li style="text-align:center">No transactions yet</li>';
        return;
    }

    listElement.innerHTML = transactionsList.map(t => `
                <li class="${t.amount > 0 ? 'income-item' : 'expense-item'}">
                    <div>
                        <strong>${escapeHtml(t.description)}</strong><br>
                        <small>${t.date} | ${t.category}</small>
                    </div>
                    <div>
                        <span style="font-weight:bold">${formatCurrency(t.amount)}</span>
                        <button class="delete-btn" data-id="${t.id}">Delete</button>
                    </div>
                </li>
            `).join('');
}

function updateSummary(transactionsList) {
    const { income, expense, balance } = calculateTotals(transactionsList);

    document.getElementById('balance').textContent = formatCurrency(balance);
    document.getElementById('income').textContent = formatCurrency(income);
    document.getElementById('expense').textContent = formatCurrency(expense);
}

function updateChart(transactionsList) {
    const categorySpending = getCategorySpending(transactionsList);
    const categories = Object.keys(categorySpending);
    const amounts = Object.values(categorySpending);

    const ctx = document.getElementById('category-chart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    if (categories.length === 0) {
        // No data, show empty chart
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['No data'],
                datasets: [{
                    label: 'Spending ($)',
                    data: [0],
                    backgroundColor: 'rgba(220, 53, 69, 0.6)'
                }]
            }
        });
        return;
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Spending ($)',
                data: amounts,
                backgroundColor: 'rgba(220, 53, 69, 0.6)',
                borderColor: 'rgb(0, 0, 0)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount ($)'
                    }
                }
            }
        }
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ============ REFRESH ============
function refresh() {
    const filtered = filterByDateRange(transactions, currentFilter);
    renderTransactions(filtered);
    updateSummary(filtered);
    updateChart(filtered);
}

// ============ EVENT HANDLERS ============
function handleAddTransaction(e) {
    e.preventDefault();

    const description = document.getElementById('description').value;
    const amount = document.getElementById('amount').value;
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;

    if (!description || !amount || !date || !category) {
        alert('Please fill all fields');
        return;
    }

    addTransaction(description, amount, date, category);
    refresh();
    e.target.reset();
}

function handleDeleteClick(e) {
    if (e.target.classList.contains('delete-btn')) {
        const id = parseInt(e.target.dataset.id);
        deleteTransaction(id);
        refresh();
    }
}

function handleFilterClick(e) {
    if (e.target.dataset.filter) {
        currentFilter = e.target.dataset.filter;

        document.querySelectorAll('.filters button').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        refresh();
    }
}

// ============ INIT ============
function init() {
    loadTransactions();
    refresh();

    document.getElementById('transaction-form').addEventListener('submit', handleAddTransaction);
    document.getElementById('transaction-list').addEventListener('click', handleDeleteClick);
    document.querySelectorAll('.filters button').forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });
}

init();