// --- KONFIGURACJA ---
// Wklej tutaj swój działający klucz API
const RIOT_API_KEY = "RGAPI-ceec8f6f-4325-4d64-be9d-717fe6169912"; 
const REFRESH_INTERVAL_MS = 120000;

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
const API_CALL_DELAY_MS = 1200;
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// NOWA, CENTRALNA FUNKCJA DO ZAPYTAŃ API
async function apiFetch(url) {
    // Ta funkcja będzie teraz naszym standardowym sposobem odpytywania API.
    // ZAWSZE dodaje klucz w nagłówku, co jest poprawną i bezpieczną metodą.
    const response = await fetch(url, {
        headers: {
            "X-Riot-Token": RIOT_API_KEY
        }
    });
    // Jeśli odpowiedź nie jest OK (np. 403, 404, 500), rzucamy błąd, aby go obsłużyć niżej
    if (!response.ok) {
        throw new Error(`Błąd API: Status ${response.status}`);
    }
    // Jeśli odpowiedź jest OK, ale pusta (status 204 lub brak treści), zwracamy null
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return null;
    }
    // W przeciwnym razie zwracamy dane w formacie JSON
    return response.json();
}

async function getPuuid(riotId, tagLine) {
    // ZMIANA: Adres URL nie zawiera już klucza API
    const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(riotId)}/${encodeURIComponent(tagLine)}`;
    const data = await apiFetch(url); // Używamy nowej funkcji apiFetch
    if (!data) throw new Error(`Nie znaleziono konta dla ${riotId}#${tagLine}`);
    return data.puuid;
}

async function checkActiveGame(puuid) {
    // ZMIANA: Adres URL nie zawiera już klucza API
    const url = `https://eun1.api.riotgames.com/lol/spectator/v5/active-games/by-puuid/${puuid}`;
    try {
        const data = await apiFetch(url); // Używamy nowej funkcji apiFetch
        // Jeśli 'data' nie jest nullem, to znaczy, że odpowiedź była 200 OK (gracz jest w grze)
        return data !== null;
    } catch (error) {
        // Jeśli błąd zawiera status 404, to znaczy, że gracz nie jest w grze.
        if (error.message.includes('404')) {
            return false;
        }
        // Rzuć dalej inne błędy (np. 403, 500), aby wyświetlić je w konsoli
        throw error; 
    }
}

// --- GŁÓWNA LOGIKA ---
async function getPlayerStatus(player) {
    try {
        const puuid = await getPuuid(player.riotId, player.tagLine);
        await delay(API_CALL_DELAY_MS);
        const isInGame = await checkActiveGame(puuid);
        
        return {
            name: player.displayName,
            status: isInGame ? 'online' : 'offline'
        };
    } catch (error) {
        console.error(`Błąd podczas sprawdzania statusu dla ${player.displayName}:`, error.message);
        return { name: player.displayName, status: 'error' };
    }
}

function renderStatusList(playerStatuses) {
    playerStatusList.innerHTML = '';
    playerStatuses.forEach(player => {
        const listItem = document.createElement('li');
        listItem.className = 'player-status-item';
        // Poprawka: 'error' również powinien dawać czerwoną kropkę
        const dotClass = player.status === 'online' ? 'online' : 'offline';
        listItem.innerHTML = `<span>${player.name}</span><span class="status-dot ${dotClass}" title="${player.status}"></span>`;
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
    updateAllPlayerStatuses();
    setInterval(updateAllPlayerStatuses, REFRESH_INTERVAL_MS);
});
