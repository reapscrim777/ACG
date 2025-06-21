// ========================================================================
// OSTATECZNA WERSJA DIAGNOSTYCZNA
// ========================================================================

const RIOT_API_KEY = "RGAPI-ceec8f6f-4325-4d64-be9d-717fe6169912"; 

const playersToCheck = [
    { displayName: 'Likht', riotId: 'Likht', tagLine: 'EUNE' },
    { displayName: 'Weedolas', riotId: 'Weedolas', tagLine: '4WB' },
    { displayName: 'reap777', riotId: 'pizza fanboy', tagLine: 'EUNE' },
    { displayName: 'Kohayushi', riotId: 'Kohayushi', tagLine: 'acg' },
    { displayName: 'Yanny', riotId: 'Hide on fpl', tagLine: 'eune' }
];

const REFRESH_INTERVAL_MS = 120000;
const API_CALL_DELAY_MS = 1500; // Lekko zwiększone opóźnienie

// --- ELEMENTY DOM ---
const playerStatusList = document.getElementById('player-status-list');
const lastUpdatedP = document.getElementById('status-last-updated');

// --- GŁÓWNA LOGIKA ---

function log(message, data = '') {
    console.log(`[STATUS] ${message}`, data);
}

async function fetchWithHeaders(url) {
    // Dodajemy więcej opcji do zapytania, aby było jak najbardziej standardowe
    const requestOptions = {
        method: 'GET',
        headers: {
            "X-Riot-Token": RIOT_API_KEY,
            "Accept": "application/json"
        },
        mode: 'cors',      // Jawne ustawienie trybu CORS
        cache: 'no-cache'  // Nakazujemy przeglądarce, aby nie używała cache dla tego zapytania
    };

    log(`Wysyłam zapytanie do: ${url}`, requestOptions);
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
        throw new Error(`Błąd API: Status ${response.status} dla URL: ${url}`);
    }
    return response.json().catch(() => null);
}

async function getPuuidForPlayer(player) {
    const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(player.riotId)}/${encodeURIComponent(player.tagLine)}`;
    const data = await fetchWithHeaders(url);
    if (!data || !data.puuid) {
        throw new Error(`Nie udało się pobrać PUUID dla ${player.displayName}`);
    }
    return data.puuid;
}

async function checkGameStatusByPuuid(puuid) {
    const url = `https://eun1.api.riotgames.com/lol/spectator/v5/active-games/by-puuid/${puuid}`;
    try {
        const gameData = await fetchWithHeaders(url);
        return gameData !== null;
    } catch (error) {
        if (error.message.includes('404')) {
            return false; // Gracz nie jest w grze
        }
        throw error; // Rzuć dalej inne błędy (403, 500 etc.)
    }
}

async function processSinglePlayer(player) {
    log(`Rozpoczynam przetwarzanie gracza: ${player.displayName}`);
    try {
        const puuid = await getPuuidForPlayer(player);
        await delay(API_CALL_DELAY_MS);
        const isInGame = await checkGameStatusByPuuid(puuid);
        log(`Zakończono! Status dla ${player.displayName}: ${isInGame ? 'W grze' : 'Offline'}`);
        return { name: player.displayName, status: isInGame ? 'online' : 'offline' };
    } catch (error) {
        log(`BŁĄD dla ${player.displayName}: ${error.message}`);
        return { name: player.displayName, status: 'error' };
    }
}

function renderStatus(statuses) {
    playerStatusList.innerHTML = '';
    statuses.forEach(player => {
        const listItem = document.createElement('li');
        listItem.className = 'player-status-item';
        const dotClass = player.status === 'online' ? 'online' : 'offline';
        listItem.innerHTML = `<span>${player.name}</span><span class="status-dot ${dotClass}"></span>`;
        playerStatusList.appendChild(listItem);
    });
}

async function updateAllStatuses() {
    log('--- ROZPOCZYNAM PEŁNĄ AKTUALIZACJĘ ---');
    playerStatusList.innerHTML = '<li>Aktualizowanie...</li>';
    
    const statusPromises = playersToCheck.map(processSinglePlayer);
    const statuses = await Promise.all(statusPromises);
    
    renderStatus(statuses);
    lastUpdatedP.textContent = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString('pl-PL')}`;
    log('--- AKTUALIZACJA ZAKOŃCZONA ---');
}

document.addEventListener('DOMContentLoaded', () => {
    updateAllStatuses();
    setInterval(updateAllStatuses, REFRESH_INTERVAL_MS);
});
