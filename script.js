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
    updateBalance(); // Bakiye gösterimini hemen güncelle
    
    // Buton Event Listener'ları
    const addBalanceBtn = document.getElementById('addBalanceBtn');
    if (addBalanceBtn) {
        addBalanceBtn.addEventListener('click', addBalance);
    }
    
    // Bet modal event listener'ları
    setupBetModal();
});

// Bet Modal Kurulumu
function setupBetModal() {
    // Modal HTML'ini body'ye ekle
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay" id="betModal">
            <div class="bet-modal">
                <div class="bet-modal-header">
                    <div class="bet-modal-title">Bahis Yap</div>
                    <button class="bet-modal-close" id="betModalClose">&times;</button>
                </div>
                <div class="bet-modal-body">
                    <div class="bet-details">
                        <div class="bet-teams" id="betModalTeams">Fenerbahçe vs Galatasaray</div>
                        <div class="bet-selection">
                            <div class="bet-selection-name" id="betModalSelection">Ev Sahibi Kazanır</div>
                            <div class="bet-selection-odds" id="betModalOdds">1.85</div>
                        </div>
                    </div>
                    <div class="bet-amount-container">
                        <label for="betAmount">Bahis Miktarı</label>
                        <input type="number" id="betAmount" class="bet-amount-input" placeholder="Miktar girin" min="1">
                        <div class="bet-amount-buttons">
                            <button class="amount-btn" data-amount="10">+10</button>
                            <button class="amount-btn" data-amount="50">+50</button>
                            <button class="amount-btn" data-amount="100">+100</button>
                            <button class="amount-btn" data-amount="max">Tümü</button>
                        </div>
                        <div class="bet-error" id="betError">Yetersiz bakiye!</div>
                    </div>
                    <div class="potential-win">
                        <div class="potential-win-label">Olası Kazanç:</div>
                        <div class="potential-win-amount" id="potentialWin">0.00 ₺</div>
                    </div>
                </div>
                <div class="bet-modal-footer">
                    <button class="bet-cancel-btn" id="betCancelBtn">İptal</button>
                    <button class="bet-confirm-btn" id="betConfirmBtn">
                        <i class="fas fa-check"></i> Bahis Yap
                    </button>
                </div>
            </div>
        </div>
    `);

    // DOM elementlerini seç
    const modal = document.getElementById('betModal');
    const closeBtn = document.getElementById('betModalClose');
    const cancelBtn = document.getElementById('betCancelBtn');
    const confirmBtn = document.getElementById('betConfirmBtn');
    const betAmount = document.getElementById('betAmount');
    const amountBtns = document.querySelectorAll('.amount-btn');
    const potentialWin = document.getElementById('potentialWin');
    const betError = document.getElementById('betError');
    
    // Geçici değişkenler
    let currentBet = {
        matchId: null,
        outcome: null,
        odds: null
    };
    
    // Modal'ı kapat
    function closeBetModal() {
        modal.classList.remove('active');
        betAmount.value = '';
        potentialWin.textContent = '0.00 ₺';
        betError.classList.remove('active');
    }
    
    // Event listener'lar
    closeBtn.addEventListener('click', closeBetModal);
    cancelBtn.addEventListener('click', closeBetModal);
    
    // Miktar butonları
    amountBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.dataset.amount;
            
            if (amount === 'max') {
                betAmount.value = Math.floor(user.balance);
            } else {
                const currentAmount = Number(betAmount.value || 0);
                betAmount.value = currentAmount + Number(amount);
            }
            
            // Olası kazanç hesapla
            updatePotentialWin();
        });
    });
    
    // Bahis miktarı değiştiğinde olası kazancı güncelle
    betAmount.addEventListener('input', updatePotentialWin);
    
    function updatePotentialWin() {
        const amount = Number(betAmount.value || 0);
        const odds = currentBet.odds;
        
        if (amount > 0 && odds) {
            potentialWin.textContent = (amount * odds).toFixed(2) + ' ₺';
        } else {
            potentialWin.textContent = '0.00 ₺';
        }
        
        // Bakiye kontrolü
        if (amount > user.balance) {
            betError.classList.add('active');
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
        } else {
            betError.classList.remove('active');
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
        }
    }
    
    // Bahis onaylama
    confirmBtn.addEventListener('click', () => {
        const amount = Number(betAmount.value || 0);
        
        if (!amount || amount <= 0) {
            betError.textContent = 'Geçerli bir miktar girin!';
            betError.classList.add('active');
            return;
        }
        
        if (amount > user.balance) {
            betError.textContent = 'Yetersiz bakiye!';
            betError.classList.add('active');
            return;
        }
        
        // Bahisi kaydet
        const { matchId, outcome, odds } = currentBet;
        finalizeBet(matchId, outcome, odds, amount);
        
        // Modal'ı kapat
        closeBetModal();
    });
    
    // Global namespace'e openBetModal fonksiyonunu ekle (açık erişim için window'a ata)
    window.openBetModal = function(matchId, outcome, odds) {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;
        
        // Modal bilgilerini ayarla
        document.getElementById('betModalTeams').textContent = `${match.homeTeam} vs ${match.awayTeam}`;
        document.getElementById('betModalSelection').textContent = getOutcomeText(outcome);
        document.getElementById('betModalOdds').textContent = odds.toFixed(2);
        
        // Geçici bet bilgilerini sakla
        currentBet = {
            matchId,
            outcome,
            odds
        };
        
        // Modal'ı göster
        modal.classList.add('active');
        betAmount.focus();
    };
}

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
    if (!container) return; // Container bulunamazsa işlemi durdur
    
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
        
        // Ana kısmı oluştur
        matchEl.innerHTML = `
            <div class="match-teams">
                <span class="team home">${match.homeTeam}</span>
                <span class="vs">vs</span>
                <span class="team away">${match.awayTeam}</span>
            </div>
            <div class="bet-categories">
                <div class="bet-category active" data-category="main">1X2</div>
                <div class="bet-category" data-category="underover">Alt/Üst</div>
                <div class="bet-category" data-category="extra">Ek Bahisler</div>
            </div>
            <div class="bet-options">
                <div class="bet-option-group active" data-group="main">
                    <div class="match-odds">
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="home" data-odds="${match.odds.home}">
                            <span>1</span>
                            <span>${match.odds.home.toFixed(2)}</span>
                        </button>
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="draw" data-odds="${match.odds.draw}">
                            <span>X</span>
                            <span>${match.odds.draw.toFixed(2)}</span>
                        </button>
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="away" data-odds="${match.odds.away}">
                            <span>2</span>
                            <span>${match.odds.away.toFixed(2)}</span>
                        </button>
                    </div>
                </div>
                <div class="bet-option-group" data-group="underover">
                    <div class="match-odds">
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="under15" data-odds="${match.odds.under15}">
                            <span>1.5 Alt</span>
                            <span>${match.odds.under15.toFixed(2)}</span>
                        </button>
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="over15" data-odds="${match.odds.over15}">
                            <span>1.5 Üst</span>
                            <span>${match.odds.over15.toFixed(2)}</span>
                        </button>
                    </div>
                    <div class="match-odds">
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="under25" data-odds="${match.odds.under25}">
                            <span>2.5 Alt</span>
                            <span>${match.odds.under25.toFixed(2)}</span>
                        </button>
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="over25" data-odds="${match.odds.over25}">
                            <span>2.5 Üst</span>
                            <span>${match.odds.over25.toFixed(2)}</span>
                        </button>
                    </div>
                    <div class="match-odds">
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="under35" data-odds="${match.odds.under35}">
                            <span>3.5 Alt</span>
                            <span>${match.odds.under35.toFixed(2)}</span>
                        </button>
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="over35" data-odds="${match.odds.over35}">
                            <span>3.5 Üst</span>
                            <span>${match.odds.over35.toFixed(2)}</span>
                        </button>
                    </div>
                </div>
                <div class="bet-option-group" data-group="extra">
                    <div class="match-odds">
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="btts_yes" data-odds="${match.odds.btts_yes}">
                            <span>KG Var</span>
                            <span>${match.odds.btts_yes.toFixed(2)}</span>
                        </button>
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="btts_no" data-odds="${match.odds.btts_no}">
                            <span>KG Yok</span>
                            <span>${match.odds.btts_no.toFixed(2)}</span>
                        </button>
                    </div>
                    <div class="match-odds">
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="firstHalfUnder05" data-odds="${match.odds.firstHalfUnder05}">
                            <span>İY 0.5 Alt</span>
                            <span>${match.odds.firstHalfUnder05.toFixed(2)}</span>
                        </button>
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="firstHalfOver05" data-odds="${match.odds.firstHalfOver05}">
                            <span>İY 0.5 Üst</span>
                            <span>${match.odds.firstHalfOver05.toFixed(2)}</span>
                        </button>
                    </div>
                    <div class="match-odds">
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="cornersUnder95" data-odds="${match.odds.cornersUnder95}">
                            <span>Korner 9.5 Alt</span>
                            <span>${match.odds.cornersUnder95.toFixed(2)}</span>
                        </button>
                        <button class="bet-button" data-match-id="${match.id}" data-outcome="cornersOver95" data-odds="${match.odds.cornersOver95}">
                            <span>Korner 9.5 Üst</span>
                            <span>${match.odds.cornersOver95.toFixed(2)}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(matchEl);
        
        // Kategori tab'ları için event listener'ları ekle
        const categories = matchEl.querySelectorAll('.bet-category');
        categories.forEach(category => {
            category.addEventListener('click', () => {
                // Active class'ı kaldır
                categories.forEach(cat => cat.classList.remove('active'));
                // Tıklanan elemente active class ekle
                category.classList.add('active');
                
                // İlgili bahis grubunu göster
                const categoryName = category.dataset.category;
                const optionGroups = matchEl.querySelectorAll('.bet-option-group');
                optionGroups.forEach(group => {
                    if (group.dataset.group === categoryName) {
                        group.classList.add('active');
                    } else {
                        group.classList.remove('active');
                    }
                });
            });
        });
    });
    
    // Bahis butonlarına event listener ekle
    const betButtons = document.querySelectorAll('.bet-button');
    betButtons.forEach(button => {
        button.addEventListener('click', function() {
            const matchId = parseInt(this.dataset.matchId);
            const outcome = this.dataset.outcome;
            const odds = parseFloat(this.dataset.odds);
            
            openBetModal(matchId, outcome, odds);
        });
    });
}

// Bahis Yap - Eski placeBet fonksiyonunu finalizeBet olarak değiştiriyoruz
function finalizeBet(matchId, selectedOutcome, odds, amount) {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    // Bahisi kaydet
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

    updateBalance(); // Bahis yapıldığında bakiyeyi hemen güncelle
    renderUserBets();
    saveToLocalStorage();
    
    showAlert('success', `Bahis oluşturuldu: ${match.homeTeam} vs ${match.awayTeam}\n${getOutcomeText(selectedOutcome)} - ${amount} ₺`);
}

// Bahisleri Render Et
function renderUserBets() {
    const container = document.getElementById('userBets');
    if (!container) return; // Container bulunamazsa işlemi durdur
    
    container.innerHTML = '';

    // Bahis verisi kontrolü
    const allBets = user.bets;
    const settledBets = allBets.filter(bet => bet.settled);
    const pendingBets = allBets.filter(bet => !bet.settled);
    
    // Temizleme butonu ekle (sadece sonuçlanmış bahis varsa)
    if (settledBets.length > 0) {
        const clearBtnSection = document.createElement('div');
        clearBtnSection.className = 'clear-bets-section';
        clearBtnSection.innerHTML = `
            <button id="clearSettledBetsBtn" class="clear-bets-btn">
                <i class="fas fa-broom"></i> Sonuçlanan Bahisleri Temizle
            </button>
        `;
        container.appendChild(clearBtnSection);
        
        // Temizleme butonu event listener'ını ekle
        document.getElementById('clearSettledBetsBtn').addEventListener('click', clearSettledBets);
    }

    if (allBets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt"></i>
                <p>Henüz bahis yapılmadı</p>
            </div>
        `;
        return;
    }

    // Bahisleri tarih sırasına göre sırala (yeni bahisler en üstte)
    const sortedBets = [...allBets].sort((a, b) => b.id - a.id);

    sortedBets.forEach(bet => {
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

// Sonuçlanan bahisleri temizle
function clearSettledBets() {
    // Onay iste
    if (!confirm('Sonuçlanan tüm bahisler silinecek. Onaylıyor musunuz?')) {
        return;
    }
    
    // Sonuçlanan bahisleri arşivle
    const settledBets = user.bets.filter(bet => bet.settled);
    
    // Mevcut arşivi kontrol et ve başlat
    if (!window.archivedBets) {
        window.archivedBets = [];
    }
    
    // Arşive ekle
    window.archivedBets = [...window.archivedBets, ...settledBets];
    
    // Sadece bekleyen bahisleri sakla
    const pendingBets = user.bets.filter(bet => !bet.settled);
    user.bets = pendingBets;
    
    // LocalStorage güncelle
    saveToLocalStorage();
    
    // UI güncelle
    renderUserBets();
    
    // Bildirim
    showAlert('success', `${settledBets.length} adet sonuçlanan bahis arşivlendi`);
}

// Bakiye Güncelle
function updateBalance() {
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        balanceElement.textContent = user.balance.toFixed(2);
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
        
        // Arşivlenmiş bahisler için yeni alan
        window.archivedBets = data.archivedBets || [];
        
        // Bahislerin sonuçlarını kontrol et ve bakiyeyi güncelle
        checkBetsAgainstResults();
    }
}

// Sonuçlara göre bahisleri kontrol et
function checkBetsAgainstResults() {
    let balanceChanged = false;
    
    user.bets.forEach(bet => {
        const match = matches.find(m => m.id === bet.matchId);
        
        // Eğer maç sonuçlanmış ve bahis henüz işlenmemişse
        if (match && match.result && !bet.settled) {
            bet.settled = true;
            bet.won = checkBetResult(bet, match);
            
            if (bet.won) {
                user.balance += bet.amount * bet.odds;
                balanceChanged = true;
            }
        }
    });
    
    if (balanceChanged) {
        updateBalance();
        saveToLocalStorage();
    }
}

// Bahis sonucu kontrolü (admin.js'den kopyalanan fonksiyon)
function checkBetResult(bet, match) {
    const { homeScore, awayScore, firstHalfHome, firstHalfAway, cornerCount } = match.result;
    const totalGoals = homeScore + awayScore;
    const firstHalfGoals = firstHalfHome + firstHalfAway;

    switch(bet.selectedOutcome) {
        case 'home': return homeScore > awayScore;
        case 'away': return awayScore > homeScore;
        case 'draw': return homeScore === awayScore;
        case 'under15': return totalGoals < 1.5;
        case 'over15': return totalGoals > 1.5;
        case 'under25': return totalGoals < 2.5;
        case 'over25': return totalGoals > 2.5;
        case 'under35': return totalGoals < 3.5;
        case 'over35': return totalGoals > 3.5;
        case 'btts_yes': return homeScore > 0 && awayScore > 0;
        case 'btts_no': return homeScore === 0 || awayScore === 0;
        case 'firstHalfUnder05': return firstHalfGoals < 0.5;
        case 'firstHalfOver05': return firstHalfGoals > 0.5;
        case 'cornersUnder95': return cornerCount < 9.5;
        case 'cornersOver95': return cornerCount > 9.5;
        default: return false;
    }
}

function saveToLocalStorage() {
    const data = { 
        user, 
        matches,
        archivedBets: window.archivedBets || [] 
    };
    localStorage.setItem('eliteBetData', JSON.stringify(data));
}