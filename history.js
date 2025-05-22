// DOM Yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    renderBetHistory();
    updateHistoryStats();
    
    // Filtreleme butonları için event listener'lar
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Active class'ı güncelle
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filtrele ve yeniden render et
            renderBetHistory(btn.dataset.filter);
        });
    });
    
    // Arama için event listener
    const searchInput = document.getElementById('historySearch');
    searchInput.addEventListener('input', () => {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        renderBetHistory(activeFilter, searchInput.value);
    });
});

// LocalStorage'dan verileri yükle
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('eliteBetData');
    if (savedData) {
        const data = JSON.parse(savedData);
        user = data.user || { balance: 1000, bets: [] };
        matches = data.matches || [];
        archivedBets = data.archivedBets || [];
    }
}

// Bahis geçmişini render et
function renderBetHistory(filter = 'all', searchTerm = '') {
    const container = document.getElementById('betHistory');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Tüm bahisleri birleştir (aktif + arşivlenmiş)
    const allSettledBets = [
        ...user.bets.filter(bet => bet.settled),
        ...(archivedBets || [])
    ];
    
    if (allSettledBets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>Henüz sonuçlanmış bahis bulunmuyor</p>
            </div>
        `;
        return;
    }
    
    // Bahisleri tarihe göre sırala
    const sortedBets = allSettledBets.sort((a, b) => {
        return (b.settledAt || b.id) - (a.settledAt || a.id);
    });
    
    // Filtreleme
    let filteredBets = sortedBets;
    if (filter === 'won') {
        filteredBets = sortedBets.filter(bet => bet.won);
    } else if (filter === 'lost') {
        filteredBets = sortedBets.filter(bet => !bet.won);
    }
    
    // Arama
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredBets = filteredBets.filter(bet => {
            const match = matches.find(m => m.id === bet.matchId);
            if (!match) return false;
            
            return match.homeTeam.toLowerCase().includes(term) || 
                   match.awayTeam.toLowerCase().includes(term);
        });
    }
    
    // Sonuçları göster
    if (filteredBets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Arama kriterlerine uygun bahis bulunamadı</p>
            </div>
        `;
        return;
    }
    
    filteredBets.forEach(bet => {
        const match = matches.find(m => m.id === bet.matchId);
        if (!match) return;
        
        const result = bet.won ? 'won' : 'lost';
        const amountText = bet.won 
            ? `+${(bet.amount * bet.odds - bet.amount).toFixed(2)} ₺`
            : `-${bet.amount.toFixed(2)} ₺`;
        
        const settleDate = bet.settledAt 
            ? new Date(bet.settledAt).toLocaleDateString() 
            : 'Bilinmiyor';
        
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${result}`;
        historyItem.innerHTML = `
            <div class="history-match">${match.homeTeam} vs ${match.awayTeam}</div>
            <div class="history-bet">${getOutcomeText(bet.selectedOutcome)} (${bet.odds.toFixed(2)})</div>
            <div class="history-amount">${amountText}</div>
            <div class="history-date">${settleDate}</div>
        `;
        
        container.appendChild(historyItem);
    });
}

// İstatistikleri güncelle
function updateHistoryStats() {
    // Tüm sonuçlanan bahisler
    const allSettledBets = [
        ...user.bets.filter(bet => bet.settled),
        ...(archivedBets || [])
    ];
    
    // Toplam bahis sayısı
    document.getElementById('totalHistoryCount').textContent = allSettledBets.length;
    
    // Toplam kar/zarar
    let profitLoss = 0;
    
    allSettledBets.forEach(bet => {
        if (bet.won) {
            profitLoss += (bet.amount * bet.odds - bet.amount);
        } else {
            profitLoss -= bet.amount;
        }
    });
    
    const profitLossEl = document.getElementById('totalProfitLoss');
    profitLossEl.textContent = profitLoss.toFixed(2) + ' ₺';
    
    // Renk ayarı
    if (profitLoss > 0) {
        profitLossEl.style.color = 'var(--success)';
    } else if (profitLoss < 0) {
        profitLossEl.style.color = 'var(--danger)';
    } else {
        profitLossEl.style.color = 'var(--dark)';
    }
}

// Sonuç Metni
function getOutcomeText(outcome) {
    const texts = {
        'home': 'Ev Sahibi Kazanır',
        'draw': 'Beraberlik',
        'away': 'Deplasman Kazanır',
        'under15': '1.5 Alt',
        'over15': '1.5 Üst',
        'under25': '2.5 Alt',
        'over25': '2.5 Üst',
        'under35': '3.5 Alt',
        'over35': '3.5 Üst',
        'btts_yes': 'KG Var',
        'btts_no': 'KG Yok',
        'firstHalfUnder05': 'İY 0.5 Alt',
        'firstHalfOver05': 'İY 0.5 Üst',
        'cornersUnder95': 'Korner 9.5 Alt',
        'cornersOver95': 'Korner 9.5 Üst'
    };
    return texts[outcome] || outcome;
}
