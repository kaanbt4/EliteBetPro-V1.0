// Veri Yapıları
let user = {
    balance: 1000,
    bets: []
};

let matches = [];

// DOM Yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    renderMatches();
    renderUserBets();
    
    // Buton Event Listener'ları
    document.getElementById('addBalanceBtn').addEventListener('click', addBalance);
});

// Bakiye Yükleme Fonksiyonu
function addBalance() {
    const amount = 500;
    user.balance += amount;
    
    // UI Güncelleme
    updateBalance();
    saveToLocalStorage();
    
    // Animasyon
    const balanceDisplay = document.getElementById('userBalance');
    balanceDisplay.classList.add('balance-updated');
    setTimeout(() => balanceDisplay.classList.remove('balance-updated'), 1000);
    
    // Bildirim
    showAlert('success', `${amount} ₺ bakiye yüklendi!`);
}

// Maçları Render Et
function renderMatches() {
    const container = document.getElementById('activeMatches');
    container.innerHTML = '';

    const activeMatches = matches.filter(match => !match.result);
    
    if (activeMatches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-futbol"></i>
                <p>Aktif maç bulunmamaktadır</p>
            </div>
        `;
        return;
    }

    activeMatches.forEach(match => {
        const matchEl = document.createElement('div');
        matchEl.className = 'match-card';
        matchEl.innerHTML = `
            <div class="match-teams">
                <span class="team home">${match.homeTeam}</span>
                <span class="vs">vs</span>
                <span class="team away">${match.awayTeam}</span>
            </div>
            <div class="match-odds">
                <button onclick="placeBet(${match.id}, 'home', ${match.odds.home})">
                    <span>1</span>
                    <span>${match.odds.home.toFixed(2)}</span>
                </button>
                <button onclick="placeBet(${match.id}, 'draw', ${match.odds.draw})">
                    <span>X</span>
                    <span>${match.odds.draw.toFixed(2)}</span>
                </button>
                <button onclick="placeBet(${match.id}, 'away', ${match.odds.away})">
                    <span>2</span>
                    <span>${match.odds.away.toFixed(2)}</span>
                </button>
            </div>
            <div class="match-odds">
                <button onclick="placeBet(${match.id}, 'under25', ${match.odds.under25})">
                    <span>2.5 Alt</span>
                    <span>${match.odds.under25.toFixed(2)}</span>
                </button>
                <button onclick="placeBet(${match.id}, 'over25', ${match.odds.over25})">
                    <span>2.5 Üst</span>
                    <span>${match.odds.over25.toFixed(2)}</span>
                </button>
            </div>
        `;
        container.appendChild(matchEl);
    });
}

// Bahis Yap
function placeBet(matchId, selectedOutcome, odds) {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const betAmount = prompt(`Bahis miktarı girin (Oran: ${odds.toFixed(2)}):`);
    if (!betAmount || isNaN(betAmount)) {
        showAlert('error', 'Geçersiz miktar!');
        return;
    }

    const amount = parseFloat(betAmount);
    if (amount <= 0) {
        showAlert('error', 'Miktar 0\'dan büyük olmalı!');
        return;
    }

    if (amount > user.balance) {
        showAlert('error', 'Yetersiz bakiye!');
        return;
    }

    user.balance -= amount;
    user.bets.push({
        id: Date.now(),
        matchId,
        selectedOutcome,
        odds,
        amount,
        settled: false,
        won: null
    });

    updateBalance();
    renderUserBets();
    saveToLocalStorage();
    
    showAlert('success', `Bahis oluşturuldu: ${match.homeTeam} vs ${match.awayTeam}\n${getOutcomeText(selectedOutcome)} - ${amount} ₺`);
}

// Bahisleri Render Et
function renderUserBets() {
    const container = document.getElementById('userBets');
    container.innerHTML = '';

    if (user.bets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt"></i>
                <p>Henüz bahis yapılmadı</p>
            </div>
        `;
        return;
    }

    user.bets.forEach(bet => {
        const match = matches.find(m => m.id === bet.matchId);
        if (!match) return;

        const statusClass = bet.settled ? (bet.won ? 'won' : 'lost') : 'pending';
        const statusText = bet.settled ? 
            (bet.won ? `✅ Kazandı (+${(bet.amount * bet.odds).toFixed(2)} ₺)` : '❌ Kaybetti') : 
            '⏳ Beklemede';

        const betEl = document.createElement('div');
        betEl.className = `bet-item ${statusClass}`;
        betEl.innerHTML = `
            <div class="bet-team">${match.homeTeam} vs ${match.awayTeam}</div>
            <div class="bet-details">
                <span>${getOutcomeText(bet.selectedOutcome)} (Oran: ${bet.odds.toFixed(2)})</span>
                <span>${bet.amount} ₺</span>
            </div>
            <div class="bet-status">${statusText}</div>
        `;
        container.appendChild(betEl);
    });
}

// Bakiye Güncelle
function updateBalance() {
    document.getElementById('userBalance').textContent = user.balance.toFixed(2);
}

// Sonuç Metni
function getOutcomeText(outcome) {
    const texts = {
        'home': 'Ev Sahibi Kazanır',
        'draw': 'Beraberlik',
        'away': 'Deplasman Kazanır',
        'under25': '2.5 Alt',
        'over25': '2.5 Üst'
    };
    return texts[outcome] || outcome;
}

// Uyarı Göster
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.classList.add('fade-out');
        setTimeout(() => alertDiv.remove(), 500);
    }, 3000);
}

// LocalStorage İşlemleri
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('eliteBetData');
    if (savedData) {
        const data = JSON.parse(savedData);
        user = data.user || { balance: 1000, bets: [] };
        matches = data.matches || [];
    }
}

function saveToLocalStorage() {
    const data = { user, matches };
    localStorage.setItem('eliteBetData', JSON.stringify(data));
}