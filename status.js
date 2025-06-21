// ========================================================================
// WERSJA MAKSYMALNIE UPROSZCZONA - ZGODNIE Z TWOIM OPISEM
// ========================================================================

const RIOT_API_KEY = "RGAPI-ceec8f6f-4325-4d64-be9d-717fe6169912"; // Wklej tu swój działający klucz

const playersToCheck = [
    { displayName: 'Likht', riotId: 'Likht', tagLine: 'EUNE' },
    { displayName: 'Weedolas', riotId: 'Weedolas', tagLine: '4WB' },
    { displayName: 'reap777', riotId: 'pizza fanboy', tagLine: 'EUNE' },
    { displayName: 'Kohayushi', riotId: 'Kohayushi', tagLine: 'acg' },
    { displayName: 'Yanny', riotId: 'Hide on fpl', tagLine: 'eune' }
];

const playerStatusList = document.getElementById('player-status-list');
const lastUpdatedP = document.getElementById('status-last-updated');
const API_CALL_DELAY_MS = 1200; // Opóźnienie między zapytaniami

// Funkcja 1: Pobiera PUUID na podstawie Riot ID
async function getPuuid(riotId, tagLine) {
    const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(riotId)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Błąd przy pobieraniu PUUID dla ${riotId}#${tagLine}: Status ${response.status}`);
            return null; // Zwraca null w przypadku błędu
        }
        const accountData = await response.json();
        console.log(`Pobrano PUUID dla ${riotId}: ${accountData.puuid}`);
        return accountData.puuid;
    } catch (error) {
        console.error(`Błąd sieciowy przy pobieraniu PUUID dla ${riotId}#${tagLine}:`, error);
        return null;
    }
}

// Funkcja 2: Sprawdza aktywną grę na podstawie PUUID
async function checkGame(puuid) {
    const url = `https://eun1.api.riotgames.com/lol/spectator/v5/active-games/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
    try {
        const response = await fetch(url);
        // response.ok jest true dla statusu 200 (jest w grze), a false dla 404 (nie ma w grze)
        console.log(`Sprawdzono grę dla PUUID ${puuid.substring(0,10)}... Status odpowiedzi: ${response.status}`);
        return response.ok;
    } catch (error) {
        console.error(`Błąd sieciowy przy sprawdzaniu gry dla PUUID ${puuid.substring(0,10)}...:`, error);
        return false;
    }
}

// Główna funkcja, która wszystko uruchamia
async function updateAllPlayerStatuses() {
    console.log("--- Rozpoczynam sprawdzanie ---");
    playerStatusList.innerHTML = '<li>Sprawdzam...</li>';
    let finalStatuses = [];

    // Używamy pętli for...of, aby zapytania szły jedno po drugim - to ułatwia debugowanie
    for (const player of playersToCheck) {
        const puuid = await getPuuid(player.riotId, player.tagLine);
        
        let status = 'error'; // Domyślnie błąd
        if (puuid) {
            await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS)); // Czekamy chwilę
            const isInGame = await checkGame(puuid);
            status = isInGame ? 'online' : 'offline';
        }
        finalStatuses.push({ name: player.displayName, status: status });
    }

    // Renderowanie wyników na stronie
    playerStatusList.innerHTML = '';
    finalStatuses.forEach(player => {
        const listItem = document.createElement('li');
        listItem.className = 'player-status-item';
        const dotClass = player.status === 'online' ? 'online' : 'offline';
        listItem.innerHTML = `<span>${player.name}</span><span class="status-dot ${dotClass}"></span>`;
        playerStatusList.appendChild(listItem);
    });
    
    lastUpdatedP.textContent = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString('pl-PL')}`;
    console.log("--- Zakończono sprawdzanie ---");
}

// Inicjalizacja po załadowaniu strony
document.addEventListener('DOMContentLoaded', updateAllPlayerStatuses);
