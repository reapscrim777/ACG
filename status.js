// ========================================================================
// FINALNA WERSJA SKRYPTU DLA SPRAWDZANIA STATUSU GRACZY W GRZE
// Używa PUUID bezpośrednio w Spectator API (tak jak podałeś, że działa ręcznie)
// ========================================================================

// Twój klucz API Riot Games - PAMIĘTAJ O JEGO REGULARNEJ WYMIANIE
// Jest on wrażliwy i widoczny w kodzie klienta.
const RIOT_API_KEY = "RGAPI-ceec8f6f-4325-4d64-be9d-717fe6169912";

// Stałe API - skopiowane z script.js dla spójności
const BASE_ACCOUNT_API_URL = "https://europe.api.riotgames.com";
const BASE_LOL_API_URL = "https://eun1.api.riotgames.com"; // Nadal potrzebne dla endpointów regionalnych, mimo że nie używamy go dla Spectator


// Lista graczy do sprawdzenia. Upewnij się, że riotId i tagLine są poprawne.
const playersToCheck = [
    { displayName: 'Likht', riotId: 'Likht', tagLine: 'EUNE' },
    { displayName: 'Weedolas', riotId: 'Weedolas', tagLine: '4WB' },
    { displayName: 'reap777', riotId: 'pizza fanboy', tagLine: 'EUNE' },
    { displayName: 'Kohayushi', riotId: 'Kohayushi', tagLine: 'acg' },
    { displayName: 'Yanny', riotId: 'Hide on fpl', tagLine: 'eune' }
];

// Interwał odświeżania statusu w milisekundach (np. 120000 ms = 2 minuty)
const REFRESH_INTERVAL_MS = 120000;
// Opóźnienie między kolejnymi wywołaniami API dla uniknięcia limitów rate-limit (w milisekundach)
const API_CALL_DELAY_MS = 1500; 

// --- Elementy DOM ---
const playerStatusList = document.getElementById('player-status-list');
const lastUpdatedP = document.getElementById('status-last-updated');
const refreshStatusButton = document.getElementById('refreshStatusButton');

// --- Funkcje pomocnicze API ---

/**
 * Wykonuje zapytanie HTTP GET do Riot API, dodając klucz API jako parametr URL.
 * Obsługuje błędy 404 (brak zasobu) zwracając null i loguje inne błędy.
 * @param {string} baseUrl - Bazowy URL endpointu (np. BASE_ACCOUNT_API_URL).
 * @param {string} path - Ścieżka do zasobu (np. "/riot/account/v1/accounts/by-riot-id/...").
 * @returns {Promise<Object|null>} - Dane JSON z odpowiedzi lub null w przypadku 404.
 * @throws {Error} - Wyrzuca błąd w przypadku problemów z siecią lub innych błędów API.
 */
async function fetchRiotApi(baseUrl, path) {
    const url = `${baseUrl}${path}?api_key=${RIOT_API_KEY}`; // Dodaj klucz jako parametr URL
    
    try {
        const response = await fetch(url);

        if (response.status === 404) {
            // Zasób nie znaleziony (np. gracz nie w grze, brak Summoner ID dla PUUID/konto nie istnieje)
            return null;
        }

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Błąd API dla URL: ${url}`);
            console.error(`Status: ${response.status} - ${response.statusText}`);
            console.error(`Odpowiedź: ${errorBody}`);
            throw new Error(`Błąd API: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        // Próba sparsowania JSON, obsługa pustej odpowiedzi
        const text = await response.text();
        return text ? JSON.parse(text) : null;

    } catch (error) {
        console.error(`Błąd podczas pobierania danych z ${url}:`, error);
        throw error; // Przekazujemy błąd dalej
    }
}

/**
 * KROK 1: Pobiera PUUID gracza na podstawie Riot ID i Tagline.
 * Używa BASE_ACCOUNT_API_URL z script.js.
 * @param {string} riotId - GameName gracza.
 * @param {string} tagLine - Tagline gracza.
 * @returns {Promise<string|null>} - PUUID gracza lub null, jeśli nie znaleziono.
 */
async function getPuuid(riotId, tagLine) {
    const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(riotId)}/${encodeURIComponent(tagLine)}`;
    const data = await fetchRiotApi(BASE_ACCOUNT_API_URL, path);
    if (data && data.puuid) {
        console.log(`Pobrano PUUID dla ${riotId}#${tagLine}: ${data.puuid}`);
        return data.puuid;
    }
    console.warn(`Nie znaleziono PUUID dla ${riotId}#${tagLine}.`);
    return null;
}

/**
 * KROK 2: Sprawdza status aktywnej gry gracza za pomocą PUUID.
 * Używa BASE_LOL_API_URL z script.js i endpointu /by-puuid/.
 * @param {string} puuid - PUUID gracza.
 * @returns {Promise<boolean>} - True, jeśli gracz jest w grze, false w przeciwnym razie.
 */
async function isPlayerInGame(puuid) {
    if (!puuid) {
        console.warn('isPlayerInGame: Brak PUUID.');
        return false;
    }
    // Używamy endpointu /by-puuid/ dla Spectator API, który podałeś jako działający ręcznie.
    const path = `/lol/spectator/v5/active-games/by-puuid/${puuid}`;
    console.log(`Próba sprawdzenia statusu gry dla PUUID: ${puuid}`); // Loguj PUUID przed zapytaniem
    const data = await fetchRiotApi(BASE_LOL_API_URL, path); // Spectator API jest regionalne!
    const isInGame = data !== null; // Null oznacza 404 lub brak danych = nie w grze
    console.log(`Gracz z PUUID ${puuid} jest w grze: ${isInGame}`);
    return isInGame;
}

// --- Główna logika aktualizacji statusów ---

/**
 * Przetwarza status pojedynczego gracza, wykonując sekwencyjnie zapytania API.
 * @param {Object} player - Obiekt gracza z displayName, riotId, tagLine.
 * @returns {Promise<Object>} - Obiekt z nazwą gracza i jego statusem ('online', 'offline', 'error').
 */
async function processSinglePlayerStatus(player) {
    try {
        console.log(`Rozpoczynam przetwarzanie gracza: ${player.displayName}`);

        const puuid = await getPuuid(player.riotId, player.tagLine);
        if (!puuid) {
            console.warn(`Zakończono przetwarzanie ${player.displayName}: Brak PUUID.`);
            return { name: player.displayName, status: 'offline' };
        }

        await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS)); // Opóźnienie

        // Sprawdzamy status gry bezpośrednio z PUUID
        const inGame = await isPlayerInGame(puuid);
        return { name: player.displayName, status: inGame ? 'online' : 'offline' };

    } catch (error) {
        console.error(`Błąd podczas przetwarzania gracza ${player.displayName}:`, error.message);
        return { name: player.displayName, status: 'error' };
    }
}

/**
 * Renderuje statusy graczy na stronie.
 * @param {Array<Object>} statuses - Tablica obiektów statusu graczy.
 */
function renderPlayerStatuses(statuses) {
    playerStatusList.innerHTML = ''; // Wyczyść listę
    statuses.forEach(player => {
        const listItem = document.createElement('li');
        listItem.className = 'player-status-item';
        let dotClass = 'offline';
        if (player.status === 'online') {
            dotClass = 'online';
        } else if (player.status === 'error') {
            dotClass = 'error'; // Możesz dodać styl dla statusu błędu w style.css
        }
        listItem.innerHTML = `<span>${player.name}</span><span class="status-dot ${dotClass}"></span>`;
        playerStatusList.appendChild(listItem);
    });
}

/**
 * Główna funkcja wywołująca aktualizację statusów wszystkich graczy.
 * Obsługuje stany ładowania i czas ostatniej aktualizacji.
 */
async function updateAllStatuses() {
    playerStatusList.innerHTML = '<li>Aktualizowanie statusu...</li>';
    lastUpdatedP.textContent = `Ostatnia aktualizacja: Ładowanie...`;

    if (refreshStatusButton) {
        refreshStatusButton.disabled = true;
        refreshStatusButton.textContent = 'Odświeżanie...';
    }

    const statuses = await Promise.all(
        playersToCheck.map(player => processSinglePlayerStatus(player))
    );

    renderPlayerStatuses(statuses);
    lastUpdatedP.textContent = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString('pl-PL')}`;

    if (refreshStatusButton) {
        refreshStatusButton.disabled = false;
        refreshStatusButton.textContent = 'Odśwież Status';
    }
}

// --- Inicjalizacja skryptu ---
document.addEventListener('DOMContentLoaded', () => {
    updateAllStatuses(); // Pierwsza aktualizacja przy ładowaniu strony
    setInterval(updateAllStatuses, REFRESH_INTERVAL_MS); // Ustawienie automatycznego odświeżania

    if (refreshStatusButton) {
        refreshStatusButton.addEventListener('click', updateAllStatuses); // Obsługa przycisku
    }
});