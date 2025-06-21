// --- KONFIGURACJA ---
// PAMIĘTAJ, ABY WSTAWIAĆ TUTAJ SWÓJ AKTUALNY KLUCZ API
const RIOT_API_KEY = "TWÓJ_KLUCZ_API";
const REFRESH_INTERVAL_MS = 120000; // 120,000 ms = 2 minuty

// Lista graczy do śledzenia statusu
const playersToCheck = [
    { displayName: 'Likht', riotId: 'Likht', tagLine: 'EUNE' },
    { displayName: 'Weedolas', riotId: 'Weedolas', tagLine: '4WB' },
    { displayName: 'reap777', riotId: 'pizza fanboy', tagLine: 'EUNE' },
    { displayName: 'Kohayushi', riotId: 'Kohayushi', tagLine: 'acg' },
    { displayName: 'Yanny', riotId: 'Hide on fpl', tagLine: 'eune' }
];

// --- ELEMENTY DOM ---
const playerStatusList = document.getElementById('player-status-list');
const lastUpdatedP = document.getElementById('status-last-updated');

// --- FUNKCJE API ---
const API_CALL_DELAY_MS = 1200; // Opóźnienie między graczami, aby nie przekroczyć limitu
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Funkcja do pobierania PUUID
async function getPuuid(riotId, tagLine) {
    const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(riotId)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Nie znaleziono konta dla ${riotId}#${tagLine}`);
    const data = await response.json();
    return data.puuid;
}

// ZMODYFIKOWANA funkcja sprawdzająca aktywną grę po PUUID
async function checkActiveGame(puuid) {
    // ZMIANA: Endpoint odpytuje teraz o grę po puuid i używa wersji v5 API
    const url = `https://eun1.api.riotgames.com/lol/spectator/v5/active-games/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
    try {
        const response = await fetch(url);
        // Jeśli status to 200 OK - gracz jest w grze
        return response.ok; 
    } catch (error) {
        // Każdy błąd (w tym 404 Not Found) oznacza, że nie ma aktywnej gry
        return false;
    }
}

// --- GŁÓWNA LOGIKA ---

// ZMODYFIKOWANA, UPROSZCZONA funkcja pobierająca status gracza
async function getPlayerStatus(player) {
    try {
        const puuid = await getPuuid(player.riotId, player.tagLine);
        await delay(API_CALL_DELAY_MS); // Zachowujemy opóźnienie
        // ZMIANA: Usunięto zbędny krok pobierania SummonerID.
        // Od razu sprawdzamy grę, przekazując `puuid`.
        const isInGame = await checkActiveGame(puuid);
        
        return {
            name: player.displayName,
            status: isInGame ? 'online' : 'offline'
        };
    } catch (error) {
        console.error(`Błąd podczas sprawdzania statusu dla ${player.displayName}:`, error);
        return { name: player.displayName, status: 'error' };
    }
}

function renderStatusList(playerStatuses) {
    playerStatusList.innerHTML = ''; // Wyczyść listę

    playerStatuses.forEach(player => {
        const listItem = document.createElement('li');
        listItem.className = 'player-status-item';
        
        let dotClass = 'offline';
        if (player.status === 'online') {
            dotClass = 'online';
        } else if (player.status === 'error') {
            dotClass = 'error';
        }

        listItem.innerHTML = `
            <span>${player.name}</span>
            <span class="status-dot ${dotClass}" title="${player.status}"></span>
        `;
        playerStatusList.appendChild(listItem);
    });
}

async function updateAllPlayerStatuses() {
    console.log("Rozpoczynam sprawdzanie statusu graczy...");
    playerStatusList.innerHTML = '<li>Trwa aktualizacja...</li>';

    const promises = playersToCheck.map(player => getPlayerStatus(player));
    const statuses = await Promise.all(promises);

    renderStatusList(statuses);
    lastUpdatedP.textContent = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString('pl-PL')}`;
    console.log("Aktualizacja statusu zakończona.");
}

// --- INICJALIZACJA ---
document.addEventListener('DOMContentLoaded', () => {
    updateAllPlayerStatuses(); // Uruchom pierwszy raz
    setInterval(updateAllPlayerStatuses, REFRESH_INTERVAL_MS); // Ustaw automatyczne odświeżanie
});
