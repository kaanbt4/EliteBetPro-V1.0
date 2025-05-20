// DOM Elementleri
const calculateOddsBtn = document.getElementById('calculateOddsBtn');
const addMatchBtn = document.getElementById('addMatchBtn');
const settleMatchBtn = document.getElementById('settleMatchBtn');
const goToHomeBtn = document.getElementById('goToHomeBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', adminInit);
calculateOddsBtn.addEventListener('click', calculateOdds);
addMatchBtn.addEventListener('click', addMatch);
settleMatchBtn.addEventListener('click', settleMatch);
goToHomeBtn.addEventListener('click', () => window.location.href = 'index.html');

// Admin Initialize
function adminInit() {
    loadFromLocalStorage();
    updateMatchSelect();
    updateStats();
}

// Oran Hesapla
function calculateOdds() {
    const homeProb = parseFloat(document.getElementById('homeWinProb').value);
    const drawProb = parseFloat(document.getElementById('drawProb').value);
    const awayProb = parseFloat(document.getElementById('awayWinProb').value);

    // Validasyon
    if ([homeProb, drawProb, awayProb].some(isNaN)) {
        showAlert('error', 'Lütfen tüm yüzdeleri sayısal değer olarak girin!');
        return false;
    }

    const total = homeProb + drawProb + awayProb;
    if (Math.abs(total - 100) > 0.1) {
        showAlert('warning', `Toplam %${total.toFixed(1)}! Lütfen toplamı %100 yapın.`);
        return false;
    }

    // Oran hesapla
    const margin = 1.05; // %5 marj
    const odds = {
        home: (1 / (homeProb / 100)) * margin,
        draw: (1 / (drawProb / 100)) * margin,
        away: (1 / (awayProb / 100)) * margin,
        under25: calculateUnderOverOdds(homeProb, awayProb).under,
        over25: calculateUnderOverOdds(homeProb, awayProb).over
    };

    // Sonuçları göster
    const preview = document.getElementById('oddsPreview');
    preview.innerHTML = `
        <div class="odds-result">
            <div class="odds-row">
                <span>1 (Ev):</span>
                <strong>${odds.home.toFixed(2)}</strong>
            </div>
            <div class="odds-row">
                <span>X (Beraberlik):</span>
                <strong>${odds.draw.toFixed(2)}</strong>
            </div>
            <div class="odds-row">
                <span>2 (Deplasman):</span>
                <strong>${odds.away.toFixed(2)}</strong>
            </div>
            <div class="odds-row">
                <span>2.5 Alt:</span>
                <strong>${odds.under25.toFixed(2)}</strong>
            </div>
            <div class="odds-row">
                <span>2.5 Üst:</span>
                <strong>${odds.over25.toFixed(2)}</strong>
            </div>
        </div>
    `;
    preview.dataset.odds = JSON.stringify(odds);
    return true;
}

// 2.5 Alt/Üst Oran Hesaplama
function calculateUnderOverOdds(homeProb, awayProb) {
    const attackFactor = (homeProb + awayProb) / 200;
    const baseUnder = 1.70;
    const baseOver = 2.10;
    
    return {
        under: +(baseUnder + (0.3 * (1 - attackFactor))).toFixed(2),
        over: +(baseOver - (0.3 * (1 - attackFactor))).toFixed(2)
    };
}

// Maç Ekle
function addMatch() {
    const homeTeam = document.getElementById('homeTeam').value.trim();
    const awayTeam = document.getElementById('awayTeam').value.trim();
    
    if (!homeTeam || !awayTeam) {
        showAlert('error', 'Takım isimleri boş olamaz!');
        return;
    }

    const oddsPreview = document.getElementById('oddsPreview');
    if (!oddsPreview.dataset.odds) {
        showAlert('error', 'Önce oranları hesaplayın!');
        return;
    }

    // Aynı maç kontrolü
    const isDuplicate = matches.some(match => 
        match.homeTeam === homeTeam && 
        match.awayTeam === awayTeam && 
        !match.result
    );
    
    if (isDuplicate) {
        showAlert('error', 'Bu maç zaten aktif!');
        return;
    }

    const newMatch = {
        id: Date.now(),
        homeTeam,
        awayTeam,
        odds: JSON.parse(oddsPreview.dataset.odds),
        result: null
    };

    matches.push(newMatch);
    updateMatchSelect();
    updateStats();
    saveToLocalStorage();
    
    // Formu temizle
    document.getElementById('homeTeam').value = '';
    document.getElementById('awayTeam').value = '';
    document.getElementById('homeWinProb').value = '';
    document.getElementById('drawProb').value = '';
    document.getElementById('awayWinProb').value = '';
    oddsPreview.innerHTML = '<div class="preview-placeholder"><i class="fas fa-check-circle"></i><p>Yeni maç için veri girin</p></div>';
    delete oddsPreview.dataset.odds;
    
    showAlert('success', `${homeTeam} vs ${awayTeam} maçı eklendi!`);
}

// Maç Sonuçlandır
function settleMatch() {
    const matchId = parseInt(document.getElementById('matchSelect').value);
    const homeScore = parseInt(document.getElementById('homeScore').value);
    const awayScore = parseInt(document.getElementById('awayScore').value);

    if (isNaN(matchId)) {
        showAlert('error', 'Lütfen maç seçin!');
        return;
    }

    if (isNaN(homeScore) || isNaN(awayScore)) {
        showAlert('error', 'Geçerli skor girin!');
        return;
    }

    const match = matches.find(m => m.id === matchId);
    if (!match) {
        showAlert('error', 'Maç bulunamadı!');
        return;
    }

    // Sonuçlandır
    match.result = { homeScore, awayScore };
    
    // Bahisleri işle
    user.bets.forEach(bet => {
        if (bet.matchId === matchId && !bet.settled) {
            bet.settled = true;
            bet.won = checkBetResult(bet, match);
            if (bet.won) {
                user.balance += bet.amount * bet.odds;
            }
        }
    });

    updateMatchSelect();
    updateStats();
    saveToLocalStorage();
    
    // Formu temizle
    document.getElementById('homeScore').value = '';
    document.getElementById('awayScore').value = '';
    
    showAlert('success', `Maç sonuçlandırıldı: ${match.homeTeam} ${homeScore}-${awayScore} ${match.awayTeam}`);
}

// Bahis Sonucu Kontrolü
function checkBetResult(bet, match) {
    const { homeScore, awayScore } = match.result;
    const totalGoals = homeScore + awayScore;

    switch(bet.selectedOutcome) {
        case 'home': return homeScore > awayScore;
        case 'away': return awayScore > homeScore;
        case 'draw': return homeScore === awayScore;
        case 'under25': return totalGoals < 2.5;
        case 'over25': return totalGoals > 2.5;
        default: return false;
    }
}

// Maç Seçiciyi Güncelle
function updateMatchSelect() {
    const select = document.getElementById('matchSelect');
    select.innerHTML = '<option value="">-- Maç Seçin --</option>';

    const activeMatches = matches.filter(match => !match.result);
    activeMatches.forEach(match => {
        const option = document.createElement('option');
        option.value = match.id;
        option.textContent = `${match.homeTeam} vs ${match.awayTeam}`;
        select.appendChild(option);
    });
}

// İstatistikleri Güncelle
function updateStats() {
    document.getElementById('activeMatchesCount').textContent = 
        matches.filter(m => !m.result).length;
    document.getElementById('totalBetsCount').textContent = 
        user.bets.length;
    document.getElementById('totalBalance').textContent = 
        user.balance.toFixed(2) + ' ₺';
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

// LocalStorage'dan Yükle
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('eliteBetData');
    if (savedData) {
        const data = JSON.parse(savedData);
        matches = data.matches || [];
        user = data.user || { balance: 1000, bets: [] };
    }
}

// LocalStorage'a Kaydet
function saveToLocalStorage() {
    const data = { user, matches };
    localStorage.setItem('eliteBetData', JSON.stringify(data));
}