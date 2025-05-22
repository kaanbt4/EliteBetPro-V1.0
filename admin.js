// Check authentication
function checkAuth() {
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// DOM Elementleri
const calculateOddsBtn = document.getElementById('calculateOddsBtn');
const addMatchBtn = document.getElementById('addMatchBtn');
const settleMatchBtn = document.getElementById('settleMatchBtn');
const goToHomeBtn = document.getElementById('goToHomeBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    adminInit();
});

calculateOddsBtn.addEventListener('click', calculateOdds);
addMatchBtn.addEventListener('click', addMatch);
settleMatchBtn.addEventListener('click', settleMatch);
goToHomeBtn.addEventListener('click', () => window.location.href = 'index.html');

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('adminLoggedIn');
        window.location.href = 'login.html';
    });
}

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

    // Sadece maç sonuç oranlarını hesapla
    const margin = 1.05; // %5 marj
    const odds = {
        home: (1 / (homeProb / 100)) * margin,
        draw: (1 / (drawProb / 100)) * margin,
        away: (1 / (awayProb / 100)) * margin
    };

    // Sonuçları göster
    const preview = document.getElementById('oddsPreview');
    preview.innerHTML = `
        <div class="odds-result">
            <div class="odds-category">
                <h3>1X2 (Maç Sonucu)</h3>
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
            </div>
        </div>
        <p class="odds-note">Not: Diğer oranları aşağıdan manuel olarak girebilirsiniz.</p>
    `;
    preview.dataset.odds = JSON.stringify(odds);
    return true;
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
        showAlert('error', 'Önce maç sonuç oranlarını hesaplayın!');
        return;
    }
    
    // Maç sonuç oranlarını al
    const mainOdds = JSON.parse(oddsPreview.dataset.odds);
    
    // Manuel girilen diğer oranları kontrol et ve al
    const manualOddsFields = [
        'under15', 'over15', 'under25', 'over25', 'under35', 'over35',
        'btts_yes', 'btts_no', 'firstHalfUnder05', 'firstHalfOver05',
        'cornersUnder95', 'cornersOver95'
    ];
    
    const manualOdds = {};
    let missingOdds = false;
    
    manualOddsFields.forEach(field => {
        const value = parseFloat(document.getElementById(field).value);
        if (isNaN(value) || value < 1) {
            missingOdds = true;
            document.getElementById(field).classList.add('error-input');
        } else {
            document.getElementById(field).classList.remove('error-input');
            manualOdds[field] = value;
        }
    });
    
    if (missingOdds) {
        showAlert('error', 'Lütfen tüm oranları geçerli değerler olarak girin (minimum 1.00)');
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

    // Tüm oranları birleştir
    const allOdds = {
        ...mainOdds,
        ...manualOdds
    };

    const newMatch = {
        id: Date.now(),
        homeTeam,
        awayTeam,
        odds: allOdds,
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
    
    // Manuel oran alanlarını temizle
    manualOddsFields.forEach(field => {
        document.getElementById(field).value = '';
    });
    
    oddsPreview.innerHTML = '<div class="preview-placeholder"><i class="fas fa-check-circle"></i><p>Yeni maç için veri girin</p></div>';
    delete oddsPreview.dataset.odds;
    
    showAlert('success', `${homeTeam} vs ${awayTeam} maçı eklendi!`);
}

// Maç Sonuçlandır
function settleMatch() {
    const matchId = parseInt(document.getElementById('matchSelect').value);
    const homeScore = parseInt(document.getElementById('homeScore').value);
    const awayScore = parseInt(document.getElementById('awayScore').value);
    const firstHalfHome = parseInt(document.getElementById('firstHalfHome').value || 0);
    const firstHalfAway = parseInt(document.getElementById('firstHalfAway').value || 0);
    const cornerCount = parseInt(document.getElementById('cornerCount').value || 0);

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
    match.result = { 
        homeScore, 
        awayScore,
        firstHalfHome,
        firstHalfAway,
        cornerCount,
        settledAt: Date.now() // Sonuçlandırma zamanını ekle
    };
    
    // Bahisleri işle
    let settlementAmount = 0;
    
    user.bets.forEach(bet => {
        if (bet.matchId === matchId && !bet.settled) {
            bet.settled = true;
            bet.settledAt = Date.now();
            bet.won = checkBetResult(bet, match);
            
            if (bet.won) {
                const winAmount = bet.amount * bet.odds;
                user.balance += winAmount;
                settlementAmount += winAmount;
            }
        }
    });

    updateMatchSelect();
    updateStats();
    saveToLocalStorage();
    
    // Formu temizle
    document.getElementById('homeScore').value = '';
    document.getElementById('awayScore').value = '';
    document.getElementById('firstHalfHome').value = '';
    document.getElementById('firstHalfAway').value = '';
    document.getElementById('cornerCount').value = '';
    
    // Bildirim
    let message = `Maç sonuçlandırıldı: ${match.homeTeam} ${homeScore}-${awayScore} ${match.awayTeam}`;
    if (settlementAmount > 0) {
        message += `\nKazanan bahisler için toplam ${settlementAmount.toFixed(2)} ₺ ödendi`;
    }
    
    showAlert('success', message);
}

// Bahis Sonucu Kontrolü
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