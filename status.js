// ========================================================================
// FINALNA WERSJA SKRYPTU
// ========================================================================

const RIOT_API_KEY = "RGAPI-ceec8f6f-4325-4d64-be9d-717fe6169912"; // WAŻNE: Wklej tu swój najnowszy klucz

const playersToCheck = [
    { displayName: 'Likht', riotId: 'Likht', tagLine: 'EUNE' },
    { displayName: 'Weedolas', riotId: 'Weedolas', tagLine: '4WB' },
    { displayName: 'reap777', riotId: 'pizza fanboy', tagLine: 'EUNE' },
    { displayName: 'Kohayushi', riotId: 'Kohayushi', tagLine: 'acg' },
    { displayName: 'Yanny', riotId: 'Hide on fpl', tagLine: 'eune' }
];

const REFRESH_INTERVAL_MS = 120000;
const API_CALL_DELAY_MS = 1500;

// --- ELEMENTY DOM ---
const playerStatusList = document.getElementById('player-status-list');
const lastUpdatedP = document.getElementById('status-last-updated');

// --- GŁÓWNA LOGIKA ---

// Ta funkcja wysyła zapytania z kluczem w nagłówku, co jest najlepszą praktyką
async function fetchWithHeaders(url) {
    const requestOptions = {
        method: 'GET',
        headers: {
            "X-Riot-Token": RIOT_API_KEY
        },
        mode: 'cors',
        cache: 'no-cache'
    };
    const response = await fetch(url, requestOptions);
    if (!response.ok) {
        throw new Error(`Błąd API: Status ${response.status}`);
    }
    return response.json().catch(() => null);
}

// KROK 1: POBIERANIE PUUID (to już działa)
async function getPuuidForPlayer(player) {
    const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(player.riotId)}/${encodeURIComponent(player.tagLine)}`;
    const data = await fetchWithHeaders(url);
    if (!data || !data.puuid) {
        throw new Error(`Nie udało się pobrać PUUID dla ${player.displayName}`);
    }
    return data.puuid;
}

// KROK 2: WYSŁANIE POPRAWNEGO ZAPYTANIA DO SPECTATOR V5 (o to prosiłeś)
async function checkGameStatusByPuuid(puuid) {
    // Używamy poprawnego endpointu spectator/v5
    const url = `https://eun1.api.riotgames.com/lol/spectator/v5/active-games/by-puuid/${puuid}`;
    try {
        // Wysyłamy zapytanie z kluczem w nagłówku
        const gameData = await fetchWithHeaders(url);
        // Jeśli odpowiedź zawiera dane (status 200 OK), gracz jest w grze
        return gameData !== null;
    } catch (error) {
        // Jeśli API zwróci błąd 404, wiemy, że gracz nie jest w grze. To jest oczekiwane.
        if (error.message.includes('404')) {
            return false;
        }
        // Każdy inny błąd (np. 403, 503) jest traktowany jako błąd.
        throw error;
    }
}

async function processSinglePlayer(player) {
    try {
        const puuid = await getPuuidForPlayer(player);
        await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));
        const isInGame = await checkGameStatusByPuuid(puuid);
        return { name: player.displayName, status: isInGame ? 'online' : 'offline' };
    } catch (error) {
        console.error(`Błąd dla gracza ${player.displayName}: ${error.message}`);
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
    playerStatusList.innerHTML = '<li>Aktualizowanie...</li>';
    const statusPromises = playersToCheck.map(processSinglePlayer);
    const statuses = await Promise.all(statusPromises);
    renderStatus(statuses);
    lastUpdatedP.textContent = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString('pl-PL')}`;
}

document.addEventListener('DOMContentLoaded', () => {
    updateAllStatuses();
    setInterval(updateAllStatuses, REFRESH_INTERVAL_MS);
});
