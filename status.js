// ========================================================================
// FINALNA WERSJA SKRYPTU DLA SPRAWDZANIA STATUSU GRACZY W GRZE
// ========================================================================

// WAŻNE: Pamiętaj, aby regularnie aktualizować ten klucz API.
// Jest on wrażliwy i widoczny w kodzie klienta.
const RIOT_API_KEY = "RGAPI-ceec8f6f-4325-4d64-be9d-717fe6169912"; 

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

// --- Elementy DOM (pobrane z index.html) ---
const playerStatusList = document.getElementById('player-status-list'); // Lista do wyświetlania statusu graczy
const lastUpdatedP = document.getElementById('status-last-updated'); // Paragraf do wyświetlania czasu ostatniej aktualizacji

// --- GŁÓWNA LOGIKA ---

/**
 * Funkcja do wykonywania zapytań HTTP z dodanym nagłówkiem X-Riot-Token.
 * Jest to preferowana metoda autoryzacji w Riot API.
 * @param {string} url Adres URL do pobrania.
 * @returns {Promise<Object|null>} Zwraca dane JSON lub null, jeśli nie ma zawartości.
 * @throws {Error} Wyrzuca błąd w przypadku problemów z siecią lub niepowodzenia API (innego niż 404).
 */
async function fetchWithHeaders(url) {
    const requestOptions = {
        method: 'GET',
        headers: {
            "X-Riot-Token": RIOT_API_KEY // Użycie klucza API w nagłówku
        },
        mode: 'cors', // Wymagane dla zapytań cross-origin
        cache: 'no-cache' // Zawsze pobieraj świeże dane
    };

    const response = await fetch(url, requestOptions);

    if (response.status === 404) {
        // Specjalna obsługa dla 404: oznacza to, że zasób nie istnieje (np. gracz nie jest w grze)
        // Zwracamy null, co zostanie zinterpretowane jako "nie w grze".
        return null;
    }

    if (!response.ok) {
        // Rzuć błąd dla wszystkich innych nieudanych odpowiedzi (np. 403 Forbidden, 500 Internal Server Error)
        throw new Error(`Błąd API: Status ${response.status} - ${response.statusText}`);
    }

    // Spróbuj sparsować JSON. Niektóre odpowiedzi (np. puste 204) mogą nie mieć JSON.
    try {
        return await response.json();
    } catch (e) {
        console.warn(`Odpowiedź z ${url} nie jest prawidłowym JSON:`, e);
        return null; // Zwróć null, jeśli nie można sparsować JSON
    }
}

/**
 * KROK 1: Pobiera PUUID gracza na podstawie Riot ID i Tagline.
 * @param {Object} player Obiekt gracza zawierający riotId i tagLine.
 * @returns {Promise<string>} Zwraca PUUID gracza.
 * @throws {Error} Wyrzuca błąd, jeśli nie uda się pobrać PUUID.
 */
async function getPuuidForPlayer(player) {
    // Endpoint do pobierania konta Riot Account (region europe dla wszystkich kont)
    const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(player.riotId)}/${encodeURIComponent(player.tagLine)}`;
    const data = await fetchWithHeaders(url);
    if (!data || !data.puuid) {
        throw new Error(`Nie udało się pobrać PUUID dla ${player.displayName}. Sprawdź Riot ID i Tagline.`);
    }
    return data.puuid;
}

/**
 * KROK 2: Sprawdza status gry gracza za pomocą PUUID.
 * @param {string} puuid PUUID gracza.
 * @returns {Promise<boolean>} Zwraca true, jeśli gracz jest w grze, false w przeciwnym razie.
 * @throws {Error} Wyrzuca błąd, jeśli wystąpi problem z API inny niż 404 (gracz nie w grze).
 */
async function checkGameStatusByPuuid(puuid) {
    // Endpoint do sprawdzania aktywnych gier (region serwera gracza, np. eun1 dla EUNE)
    // UWAGA: Zakładam, że wszyscy gracze są na EUNE. Jeśli są na innych serwerach,
    // potrzebny byłby dodatkowy logic, aby określić region summonera.
    const url = `https://eun1.api.riotgames.com/lol/spectator/v5/active-games/by-puuid/${puuid}`;
    try {
        const gameData = await fetchWithHeaders(url);
        // Jeśli gameData jest null (z powodu 404) lub puste, gracz nie jest w grze.
        return gameData !== null;
    } catch (error) {
        // Wszystkie inne błędy (np. błąd serwera Riot, problem z kluczem API)
        throw error; // Przekazujemy błąd dalej
    }
}

/**
 * Przetwarza status pojedynczego gracza: pobiera PUUID, a następnie sprawdza status gry.
 * Zawiera mechanizm opóźnienia, aby nie przekraczać limitów Riot API.
 * @param {Object} player Obiekt gracza.
 * @returns {Promise<Object>} Obiekt z nazwą gracza i jego statusem ('online', 'offline', 'error').
 */
async function processSinglePlayer(player) {
    try {
        // Pobierz PUUID
        const puuid = await getPuuidForPlayer(player);
        // Poczekaj przed kolejnym wywołaniem API
        await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));
        // Sprawdź status gry
        const isInGame = await checkGameStatusByPuuid(puuid);
        return { name: player.displayName, status: isInGame ? 'online' : 'offline' };
    } catch (error) {
        // Zaloguj błąd do konsoli dla celów debugowania
        console.error(`Błąd podczas przetwarzania gracza ${player.displayName}: ${error.message}`);
        return { name: player.displayName, status: 'error' }; // Zwróć status błędu dla tego gracza
    }
}

/**
 * Renderuje (wyświetla) statusy graczy na stronie.
 * @param {Array<Object>} statuses Tablica obiektów statusu graczy.
 */
function renderStatus(statuses) {
    playerStatusList.innerHTML = ''; // Wyczyść bieżącą listę
    statuses.forEach(player => {
        const listItem = document.createElement('li');
        listItem.className = 'player-status-item'; // Użyj istniejącej klasy CSS
        // Ustaw klasę dla kropki statusu na podstawie stanu gracza
        let dotClass = 'offline'; // Domyślnie offline
        if (player.status === 'online') {
            dotClass = 'online';
        } else if (player.status === 'error') {
            dotClass = 'error'; // Możesz dodać styl dla statusu błędu w style.css
        }
        listItem.innerHTML = `<span>${player.name}</span><span class="status-dot ${dotClass}"></span>`; // Generuj HTML
        playerStatusList.appendChild(listItem); // Dodaj element do listy
    });
}

/**
 * Główna funkcja aktualizująca statusy wszystkich graczy.
 * Uruchamia przetwarzanie dla każdego gracza i aktualizuje interfejs użytkownika.
 */
async function updateAllStatuses() {
    // Wyświetl wiadomość o aktualizacji, aby użytkownik wiedział, że coś się dzieje
    playerStatusList.innerHTML = '<li>Aktualizowanie statusu...</li>'; 
    lastUpdatedP.textContent = `Ostatnia aktualizacja: Ładowanie...`; // Zaktualizuj tekst statusu

    const statusPromises = playersToCheck.map(processSinglePlayer); // Utwórz tablicę Promise'ów
    const statuses = await Promise.all(statusPromises); // Czekaj na wszystkie Promise'y

    renderStatus(statuses); // Wyświetl zaktualizowane statusy
    // Zaktualizuj czas ostatniej aktualizacji
    lastUpdatedP.textContent = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString('pl-PL')}`; 
}

// Nasłuchuj zdarzenia DOMContentLoaded, aby upewnić się, że DOM jest w pełni załadowany
document.addEventListener('DOMContentLoaded', () => {
    updateAllStatuses(); // Wykonaj pierwszą aktualizację od razu po załadowaniu strony
    // Ustaw interwał dla cyklicznych aktualizacji
    setInterval(updateAllStatuses, REFRESH_INTERVAL_MS); 
});
