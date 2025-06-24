// Twój klucz API Riot Games - PAMIĘTAJ O JEGO REGULARNEJ WYMIANIE
const RIOT_API_KEY = "RGAPI-ceec8f6f-4325-4d64-be9d-717fe6169912"; // <-- ZAKTUALIZUJ NA SWÓJ AKTYWNY KLUCZ!

// Stałe API
const BASE_ACCOUNT_API_URL = "https://europe.api.riotgames.com";
const BASE_LOL_API_URL = "https://eun1.api.riotgames.com";
const BASE_MATCH_API_URL = "https://europe.api.riotgames.com";

// ZMIENNE GLOBALNE DLA DANYCH GRY
let LATEST_DDRAGON_VERSION = "";
let DDRAGON_CDN_IMG = "";
let championIdMap = {};

// NOWA ZMIENNA DO KONTROLI WYSZUKIWAŃ
let currentSearchId = 0;

async function initializeGameData() {
    console.log("[DEBUG] initializeGameData: Starting DDragon data initialization.");
    try {
        const versionsResponse = await fetch(`https://ddragon.leagueoflegends.com/api/versions.json`);
        if (!versionsResponse.ok) throw new Error("Nie udało się pobrać wersji gry.");
        const versions = await versionsResponse.json();
        LATEST_DDRAGON_VERSION = versions[0];
        console.log(`[DEBUG] initializeGameData: Pobrano najnowszą wersję gry: ${LATEST_DDRAGON_VERSION}`);
        DDRAGON_CDN_IMG = `https://ddragon.leagueoflegends.com/cdn/${LATEST_DDRAGON_VERSION}/img`;

        const championResponse = await fetch(`https://ddragon.leagueoflegends.com/cdn/${LATEST_DDRAGON_VERSION}/data/en_US/champion.json`);
        if (!championResponse.ok) throw new Error("Nie udało się pobrać listy postaci.");
        
        const json = await championResponse.json();
        const champions = json.data;
        
        for (const championKey in champions) {
            const championData = champions[championKey];
            championIdMap[championData.key] = championData.id;
        }
        console.log("[DEBUG] initializeGameData: Mapa postaci została pomyślnie załadowana.");

    } catch (error) {
        console.error("[ERROR] Krytyczny błąd podczas inicjalizacji danych gry:", error);
        displayError("Nie można załadować podstawowych danych gry. Odśwież stronę.");
    }
}

function getSpellName(spellId) {
    const spellMap = { '1': 'SummonerBoost', '3': 'SummonerExhaust', '4': 'SummonerFlash', '6': 'SummonerHaste', '7': 'SummonerHeal', '11': 'SummonerSmite', '12': 'SummonerTeleport', '13': 'SummonerMana', '14': 'SummonerDot', '21': 'SummonerBarrier' };
    return spellMap[spellId] || 'SummonerFlash'; // Domyślna wartość
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " lat temu";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " mies. temu";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " dni temu";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " godz. temu";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min. temu";
    return Math.floor(seconds) + " sek. temu";
}

function formatGameDuration(seconds) {
    if (seconds > 3600 * 1000) { seconds = Math.floor(seconds / 1000); } // Konwersja z ms na s, jeśli potrzebna
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
}

function createPlayerRowHtml(player, mainPlayerPuuid) {
    const isMainPlayer = player.puuid === mainPlayerPuuid;
    const items = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5, player.item6]
        .map(id => `<div class="item-slot-small">${id !== 0 ? `<img src="${DDRAGON_CDN_IMG}/item/${id}.png" onerror="this.onerror=null;this.src='https://via.placeholder.com/24x24?text=X';">` : ''}</div>`).join('');
    
    const championFileId = championIdMap[player.championId] || player.championName;
    const championImgUrl = `${DDRAGON_CDN_IMG}/champion/${championFileId}.png`;

    return `
        <tr class="${isMainPlayer ? 'main-player-row' : ''}">
            <td class="player-cell">
                <img class="table-champ-icon" src="${championImgUrl}" onerror="this.onerror=null;this.src='https://via.placeholder.com/32x32?text=NA';">
                <div class="table-spells">
                    <img src="${DDRAGON_CDN_IMG}/spell/${getSpellName(player.summoner1Id)}.png" onerror="this.onerror=null;this.src='https://via.placeholder.com/16x16?text=S1';">
                    <img src="${DDRAGON_CDN_IMG}/spell/${getSpellName(player.summoner2Id)}.png" onerror="this.onerror=null;this.src='https://via.placeholder.com/16x16?text=S2';">
                </div>
                <span class="table-player-name">${player.riotIdGameName.split('#')[0]}</span>
            </td>
            <td class="kda-cell">${player.kills} / ${player.deaths} / ${player.assists}</td>
            <td class="damage-cell">${player.totalDamageDealtToChampions.toLocaleString('pl-PL')}</td>
            <td class="cs-cell">${player.totalMinionsKilled + player.neutralMinionsKilled}</td>
            <td class="items-cell">${items}</td>
        </tr>
    `;
}

const summonerNameInput = document.getElementById("summonerNameInput");
const searchButton = document.getElementById("searchButton");
const errorMessageDiv = document.getElementById("errorMessage");
const playerProfileDiv = document.getElementById("playerProfileSection");
const initialPlayerProfileMessage = document.getElementById("initialPlayerProfileMessage");
const summonerHeaderContainer = document.getElementById("summonerHeaderContainer");
const summonerDetailsContainer = document.getElementById("summonerDetailsContainer");
const refreshButton = document.getElementById("refreshButton");
const matchHistorySection = document.getElementById("matchHistorySection");
const matchesContainer = document.getElementById("matchesContainer");
const loadMoreMatchesButton = document.getElementById("loadMoreMatchesButton");
const playerSelectButtons = document.querySelectorAll('.player-select-button');

let currentSearchedPlayer = { gameName: null, tagLine: null, puuid: null };
let currentMatchStartIndex = 0;
const MATCHES_PER_LOAD = 10;
const API_CALL_DELAY_MS = 1200; // Opóźnienie między wywołaniami API

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function displayError(message) { errorMessageDiv.textContent = message; }
function clearError() { errorMessageDiv.textContent = ""; }

// BEZPOŚREDNIE WYWOŁANIA FETCH (jak w Twojej poprzedniej wersji)
async function getAccountByRiotId(gameName, tagLine) {
    clearError();
    const url = `${BASE_ACCOUNT_API_URL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
    console.log(`[DEBUG] getAccountByRiotId: Fetching from ${url}`);
    try {
        const response = await fetch(url);
        // Podstawowa obsługa błędów, jak w Twoim pierwotnym kodzie
        if (response.status === 401 || response.status === 403) throw new Error(`Błąd autoryzacji: Sprawdź klucz API.`);
        if (!response.ok) throw new Error(`Błąd API ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`[ERROR] [getAccountByRiotId] Błąd:`, error);
        displayError(`Błąd wyszukiwania konta: ${error.message}. Sprawdź Riot ID i klucz API.`);
        return null;
    }
}

// BEZPOŚREDNIE WYWOŁANIA FETCH (jak w Twojej poprzedniej wersji)
async function getSummonerByPuuid(puuid) {
    const url = `${BASE_LOL_API_URL}/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
    console.log(`[DEBUG] getSummonerByPuuid: Fetching from ${url}`);
    try {
        const response = await fetch(url);
        if (response.status === 401 || response.status === 403) throw new Error(`Błąd autoryzacji: Sprawdź klucz API.`);
        if (!response.ok) throw new Error(`Błąd API ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`[ERROR] [getSummonerByPuuid] Błąd:`, error);
        displayError(`Błąd pobierania danych przywoływacza: ${error.message}`);
        return null;
    }
}

// NOWA FUNKCJA: Pobiera rangę BEZPOŚREDNIO Z PUUID (jak w działającym ranking.html)
async function getRankDataByPuuid(puuid) {
    if (!puuid) {
        console.warn("[DEBUG] getRankDataByPuuid: Brak puuid, nie można pobrać danych rankingowych.");
        return null; 
    }
    const url = `${BASE_LOL_API_URL}/lol/league/v4/entries/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
    console.log(`[DEBUG] getRankDataByPuuid: Fetching from ${url}`);
    try {
        const response = await fetch(url);
        if (response.status === 401 || response.status === 403) throw new Error(`Błąd autoryzacji: Sprawdź klucz API.`);
        if (response.status === 404) {
             console.warn(`[DEBUG] getRankDataByPuuid: 404 - Gracz unranked lub brak danych rankingowych dla PUUID: ${puuid}`);
             return null; // Gracz może być unranked
        }
        if (!response.ok) throw new Error(`Błąd API ${response.status}: ${response.statusText}`);
        const data = await response.json();
        // Dane mogą zawierać wiele kolejek, szukamy tylko Solo/Duo
        return data.find(q => q.queueType === 'RANKED_SOLO_5x5') || null;
    } catch (error) {
        console.error("[ERROR] [getRankDataByPuuid] Błąd:", error);
        displayError(`Błąd pobierania danych rankingowych: ${error.message}`);
        return null;
    }
}


// UŻYWAJĄC BEZPOŚREDNICH WYWOŁAŃ FETCH (jak w Twojej poprzedniej wersji)
async function getMatchIds(puuid, start = 0, count = 10) {
    const url = `${BASE_MATCH_API_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}&api_key=${RIOT_API_KEY}`;
    console.log(`[DEBUG] getMatchIds: Fetching from ${url}`);
    try {
        const response = await fetch(url);
        if (response.status === 401 || response.status === 403) throw new Error(`Błąd autoryzacji: Sprawdź klucz API.`);
        if (response.status === 404) return []; // Brak meczów
        if (!response.ok) throw new Error(`Błąd API ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`[ERROR] [getMatchIds] Błąd:`, error);
        displayError(`Błąd pobierania historii meczów: ${error.message}.`);
        return null;
    }
}

// UŻYWAJĄC BEZPOŚREDNICH WYWOŁAŃ FETCH (jak w Twojej poprzedniej wersji)
async function getMatchDetails(matchId) {
    const url = `${BASE_MATCH_API_URL}/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`;
    console.log(`[DEBUG] getMatchDetails: Fetching from ${url}`);
    try {
        const response = await fetch(url);
        if (response.status === 401 || response.status === 403) throw new Error(`Błąd autoryzacji: Sprawdź klucz API.`);
        if (!response.ok) throw new Error(`Błąd API ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`[ERROR] [getMatchDetails] Błąd dla meczu ${matchId}:`, error);
        return null;
    }
}

function renderMatchCard(match, puuid) {
    console.log("[DEBUG] renderMatchCard: Rendering match card.");
    if (!match?.info?.participants) {
        console.warn("[DEBUG] renderMatchCard: Invalid match data, missing participants.");
        return '';
    }
    const mainPlayer = match.info.participants.find(p => p.puuid === puuid);
    if (!mainPlayer) {
        console.warn("[DEBUG] renderMatchCard: Main player not found in match participants.");
        return '';
    }

    const resultClass = mainPlayer.win ? 'victory' : 'defeat';
    
    const championFileId = championIdMap[mainPlayer.championId] || mainPlayer.championName;
    const championImgUrl = `${DDRAGON_CDN_IMG}/champion/${championFileId}.png`;
    
    const spell1ImgUrl = `${DDRAGON_CDN_IMG}/spell/${getSpellName(mainPlayer.summoner1Id)}.png`;
    const spell2ImgUrl = `${DDRAGON_CDN_IMG}/spell/${getSpellName(mainPlayer.summoner2Id)}.png`;
    
    // Uproszczone ścieżki dla run - w prawdziwej aplikacji wymagałoby to więcej logiki DDragon
    const rune1ImgUrl = `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7201_Precision.png`; // Placeholder
    const rune2ImgUrl = `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7200_Domination.png`; // Placeholder

    const kdaString = `${mainPlayer.kills} / <span class="deaths">${mainPlayer.deaths}</span> / ${mainPlayer.assists}`;
    const kdaRatio = mainPlayer.deaths === 0 ? 'Perfect' : `${((mainPlayer.kills + mainPlayer.assists) / mainPlayer.deaths).toFixed(2)} KDA`;
    const items = [mainPlayer.item0, mainPlayer.item1, mainPlayer.item2, mainPlayer.item3, mainPlayer.item4, mainPlayer.item5, mainPlayer.item6].map(id => `<div class="item-slot">${id !== 0 ? `<img src="${DDRAGON_CDN_IMG}/item/${id}.png" onerror="this.onerror=null;this.src='https://via.placeholder.com/32x32?text=X';">` : ''}</div>`).join('');
    const cs = mainPlayer.totalMinionsKilled + mainPlayer.neutralMinionsKilled;
    const gold = `${(mainPlayer.goldEarned / 1000).toFixed(1)}k`;
    const teamKills = match.info.participants.filter(p => p.teamId === mainPlayer.teamId).reduce((t, p) => t + p.kills, 0);
    const killParticipation = teamKills === 0 ? '0%' : `${Math.round(((mainPlayer.kills + mainPlayer.assists) / teamKills) * 100)}%`;
    
    const blueTeamHtml = match.info.participants
        .filter(p => p.teamId === 100)
        .map(p => `<div class="player"><img src="${DDRAGON_CDN_IMG}/champion/${championIdMap[p.championId] || p.championName}.png" onerror="this.onerror=null;this.src='https://via.placeholder.com/18x18?text=NA';"><span>${p.riotIdGameName.split('#')[0]}</span></div>`)
        .join('');
    const redTeamHtml = match.info.participants
        .filter(p => p.teamId === 200)
        .map(p => `<div class="player"><img src="${DDRAGON_CDN_IMG}/champion/${championIdMap[p.championId] || p.championName}.png" onerror="this.onerror=null;this.src='https://via.placeholder.com/18x18?text=NA';"><span>${p.riotIdGameName.split('#')[0]}</span></div>`)
        .join('');
        
    const duration = formatGameDuration(match.info.gameDuration);
    const timeAgo = formatTimeAgo(match.info.gameEndTimestamp);

    const blueTeamWin = match.info.teams.find(t => t.teamId === 100)?.win ? 'ZWYCIĘSTWO' : 'PORAŻKA';
    const redTeamWin = match.info.teams.find(t => t.teamId === 200)?.win ? 'ZWYCIĘSTWO' : 'PORAŻKA';

    const blueTeamRows = match.info.participants.filter(p => p.teamId === 100).map(p => createPlayerRowHtml(p, puuid)).join('');
    const redTeamRows = match.info.participants.filter(p => p.teamId === 200).map(p => createPlayerRowHtml(p, puuid)).join('');
    const detailsTableHtml = `
        <div class="match-details-table-container">
            <table class="match-details-table">
                <thead>
                    <tr><th colspan="5">${blueTeamWin} (Drużyna Niebieska)</th></tr>
                    <tr><th>Gracz</th><th>KDA</th><th>Obrażenia</th><th>CS</th><th>Przedmioty</th></tr>
                </thead>
                <tbody>${blueTeamRows}</tbody>
                <thead>
                    <tr><th colspan="5">${redTeamWin} (Drużyna Czerwona)</th></tr>
                    <tr><th>Gracz</th><th>KDA</th><th>Obrażenia</th><th>CS</th><th>Przedmioty</th></tr>
                </thead>
                <tbody>${redTeamRows}</tbody>
            </table>
        </div>`;

    return `
        <div class="match-card-adapted ${resultClass}">
            <div class="match-summary-view">
                <div class="match-stats-left">
                    <div class="champion-details">
                        <div class="champion-icon-container">
                            <img src="${championImgUrl}" class="champion-icon" onerror="this.onerror=null;this.src='https://via.placeholder.com/64x64?text=NA';">
                            <span class="level">${mainPlayer.champLevel}</span>
                        </div>
                    </div>
                    <div class="spells-runes">
                        <div class="spells">
                            <img src="${spell1ImgUrl}" onerror="this.onerror=null;this.src='https://via.placeholder.com/30x30?text=S1';">
                            <img src="${spell2ImgUrl}" onerror="this.onerror=null;this.src='https://via.placeholder.com/30x30?text=S2';">
                        </div>
                        <div class="runes">
                            <img src="${rune1ImgUrl}" class="rune-main" onerror="this.onerror=null;this.src='https://via.placeholder.com/30x30?text=R1';">
                            <img src="${rune2ImgUrl}" class="rune-main" onerror="this.onerror=null;this.src='https://via.placeholder.com/30x30?text=R2';">
                        </div>
                    </div>
                    <div class="kda-stats">
                        <div class="kda-score">${kdaString}</div>
                        <div class="kda-ratio">${kdaRatio}</div>
                    </div>
                    <div class="items">${items}</div>
                    <div class="game-stats">
                        <div class="stat">CS ${cs}</div>
                        <div class="stat">Złoto ${gold}</div>
                        <div class="stat-kp">KP ${killParticipation}</div>
                    </div>
                </div>
                <div class="match-stats-right">
                    <div class="player-lists">
                        <div class="team">${blueTeamHtml}</div>
                        <div class="team">${redTeamHtml}</div>
                    </div>
                    <div class="match-meta">
                        <div class="match-duration">${duration}</div>
                        <div class="match-timestamp">${timeAgo}</div>
                    </div>
                </div>
            </div>
            ${detailsTableHtml}
        </div>`;
}

async function loadMatchHistory(puuid, clearExisting = true, searchId) {
    console.log(`[DEBUG] loadMatchHistory: Starting for PUUID ${puuid}, searchId ${searchId}. Current searchId ${currentSearchId}`);
    if (searchId !== currentSearchId) {
        console.log("[DEBUG] loadMatchHistory: Nowe wyszukiwanie rozpoczęte, anulowanie starego ładowania historii meczów.");
        return;
    }

    matchHistorySection.style.display = 'block';
    if (clearExisting) {
        matchesContainer.innerHTML = `<p style="text-align: center; color: #bbb;">Ładowanie historii meczów...</p>`;
        currentMatchStartIndex = 0;
        console.log("[DEBUG] loadMatchHistory: Clearing existing matches and resetting index.");
    }
    
    const matchIds = await getMatchIds(puuid, currentMatchStartIndex, MATCHES_PER_LOAD);
    if (!matchIds || matchIds.length === 0) {
        if(clearExisting) matchesContainer.innerHTML = `<p style="text-align: center; color: #ccc;">Brak historii meczów dla tego gracza.</p>`;
        loadMoreMatchesButton.style.display = 'none';
        console.log("[DEBUG] loadMatchHistory: No match IDs found or API error.");
        return;
    }
    console.log(`[DEBUG] loadMatchHistory: Found ${matchIds.length} match IDs.`);

    if (searchId !== currentSearchId) { 
        console.log("[DEBUG] loadMatchHistory: New search started after getting match IDs, aborting.");
        return; 
    } 

    if (clearExisting) matchesContainer.innerHTML = '';
    
    for (const matchId of matchIds) {
        if (searchId !== currentSearchId) {
            console.log("[DEBUG] loadMatchHistory: Nowe wyszukiwanie rozpoczęte w trakcie pętli, przerywanie ładowania meczów.");
            return; 
        }

        const matchDetails = await getMatchDetails(matchId);
        if (matchDetails) {
            if (searchId === currentSearchId) {
                matchesContainer.insertAdjacentHTML('beforeend', renderMatchCard(matchDetails, puuid));
                console.log(`[DEBUG] loadMatchHistory: Rendered match ${matchId}`);
            }
        } else {
            console.warn(`[DEBUG] loadMatchHistory: Could not get details for match ${matchId}`);
        }
        await delay(API_CALL_DELAY_MS); // Opóźnienie po każdym zapytaniu o szczegóły meczu
    }
    
    currentMatchStartIndex += matchIds.length;
    loadMoreMatchesButton.style.display = (matchIds.length < MATCHES_PER_LOAD) ? 'none' : 'block';
    console.log(`[DEBUG] loadMatchHistory: Finished. Loaded ${matchIds.length} matches. Next start index: ${currentMatchStartIndex}`);
}

async function displaySummonerData(gameName, tagLine) {
    console.log(`[DEBUG] displaySummonerData: Starting for ${gameName}#${tagLine}.`);
    currentSearchId++;
    const thisSearchId = currentSearchId;

    initialPlayerProfileMessage.style.display = 'none';
    playerProfileDiv.style.display = 'block';
    matchHistorySection.style.display = 'block';
    summonerHeaderContainer.innerHTML = `<p style="text-align: center; color: #bbb;">Ładowanie danych dla ${gameName}#${tagLine}...</p>`;
    summonerDetailsContainer.innerHTML = '';
    matchesContainer.innerHTML = '';
    clearError();
    refreshButton.style.display = 'none';
    loadMoreMatchesButton.style.display = 'none';

    currentSearchedPlayer = { gameName, tagLine, puuid: null };
    
    try {
        const accountData = await getAccountByRiotId(gameName, tagLine);
        
        if (thisSearchId !== currentSearchId) { console.log("[DEBUG] displaySummonerData: New search started, aborting accountData processing."); return; }
        if (!accountData) {
            summonerHeaderContainer.innerHTML = `<p style="text-align: center; color: #e74c3c;">Nie znaleziono gracza ${gameName}#${tagLine}. Sprawdź Riot ID i Tagline.</p>`;
            return;
        }
        console.log(`[DEBUG] displaySummonerData: Account data retrieved for ${accountData.gameName}#${accountData.tagLine}. PUUID: ${accountData.puuid}`);
        
        currentSearchedPlayer.puuid = accountData.puuid;

        // Pobieranie summonerData (dla poziomu i ikony)
        const summonerData = await getSummonerByPuuid(accountData.puuid);
        
        if (thisSearchId !== currentSearchId) { console.log("[DEBUG] displaySummonerData: New search started, aborting summonerData processing."); return; }
        if (!summonerData) {
            console.warn(`[DEBUG] displaySummonerData: Nie udało się pobrać summonerData dla PUUID: ${accountData.puuid}. Poziom i ikona mogą być niedostępne.`);
        }
        console.log(`[DEBUG] displaySummonerData: Summoner data retrieved. Level: ${summonerData?.summonerLevel || 'N/A'}`);
        
        // Renderuj nagłówek z ikoną i poziomem
        const profileIconUrl = summonerData ? `${DDRAGON_CDN_IMG}/profileicon/${summonerData.profileIconId}.png` : `https://via.placeholder.com/80x80?text=NA`;
        const summonerLevel = summonerData ? summonerData.summonerLevel : 'N/A';

        summonerHeaderContainer.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; gap: 15px;">
                <img src="${profileIconUrl}" style="width: 80px; height: 80px; border-radius: 50%;" onerror="this.onerror=null;this.src='https://via.placeholder.com/80x80?text=NA';">
                <div class="summoner-info">
                    <h2 style="margin:0;">${accountData.gameName}#${accountData.tagLine}</h2>
                    <p style="margin:0;">Poziom: ${summonerLevel}</p>
                </div>
            </div>`;
        
        await delay(API_CALL_DELAY_MS); // Opóźnienie przed zapytaniem o rangę

        // POBIERANIE RANGI (UŻYWAMY getRankDataByPuuid, która pobiera rangę bezpośrednio z PUUID)
        const rankData = await getRankDataByPuuid(accountData.puuid); 
        if (thisSearchId !== currentSearchId) { console.log("[DEBUG] displaySummonerData: New search started, aborting rankData processing."); return; }

        let rankInfoHtml = '<p style="color: #bbb;">Brak danych rankingowych (Solo/Duo Queue).</p>';
        if (rankData) { 
            console.log(`[DEBUG] displaySummonerData: Rank data retrieved: ${rankData.tier} ${rankData.rank}`);
            rankInfoHtml = `<div class="rank-card" style="text-align: left;"><h4>Solo/Duo Queue</h4><p>${rankData.tier} ${rankData.rank} - ${rankData.leaguePoints} LP</p><p>Wygrane: ${rankData.wins} / Przegrane: ${rankData.losses}</p></div>`;
        } else {
             console.log("[DEBUG] displaySummonerData: No Solo/Duo Rank data found.");
        }
        summonerDetailsContainer.innerHTML = rankInfoHtml;

        refreshButton.style.display = 'block';
        // Ładowanie historii meczów
        await loadMatchHistory(currentSearchedPlayer.puuid, true, thisSearchId);

    } catch (error) {
        console.error("[ERROR] Error in displaySummonerData (main catch block):", error);
        if (!errorMessageDiv.textContent) {
            summonerHeaderContainer.innerHTML = `<p style="text-align: center; color: #e74c3c;">Wystąpił błąd podczas ładowania danych gracza. ${error.message}</p>`;
        } else {
             summonerHeaderContainer.innerHTML = `<p style="text-align: center; color: #e74c3c;">${errorMessageDiv.textContent}</p>`;
        }
        summonerDetailsContainer.innerHTML = '';
        matchesContainer.innerHTML = '';
        refreshButton.style.display = 'none';
        loadMoreMatchesButton.style.display = 'none';
    }
}

// --- Główna funkcja inicjalizująca ---
async function main() {
    console.log("[DEBUG] main: DOMContentLoaded - Initializing game data.");
    await initializeGameData();

    searchButton.addEventListener("click", () => {
        const fullRiotId = summonerNameInput.value.trim();
        const parts = fullRiotId.split('#');
        if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
            displaySummonerData(parts[0].trim(), parts[1].trim());
        } else {
            displayError("Wpisz poprawne Riot ID w formacie: NazwaGry#Tagline");
            console.warn("[DEBUG] main: Invalid Riot ID format entered.");
        }
    });

    summonerNameInput.addEventListener("keypress", e => { if (e.key === "Enter") searchButton.click(); });
    refreshButton.addEventListener("click", () => { 
        if (currentSearchedPlayer.gameName && currentSearchedPlayer.tagLine) {
            console.log("[DEBUG] main: Refresh button clicked. Re-displaying summoner data.");
            displaySummonerData(currentSearchedPlayer.gameName, currentSearchedPlayer.tagLine); 
        } else {
            displayError("Brak gracza do odświeżenia. Wyszukaj gracza najpierw.");
            console.warn("[DEBUG] main: Refresh button clicked without a selected player.");
        }
    });
    
    loadMoreMatchesButton.addEventListener("click", () => {
        if (currentSearchedPlayer.puuid) {
            console.log("[DEBUG] main: Load More Matches button clicked.");
            loadMatchHistory(currentSearchedPlayer.puuid, false, currentSearchId);
        } else {
            console.warn("[DEBUG] main: Load More Matches button clicked without a selected player.");
        }
    });

    playerSelectButtons.forEach(button => {
        button.addEventListener('click', () => {
            const summonerNameWithTag = button.getAttribute('data-summoner-name');
            const [gameName, tagLine] = summonerNameWithTag.split('#');
            summonerNameInput.value = summonerNameWithTag;
            console.log(`[DEBUG] main: Player select button clicked: ${summonerNameWithTag}`);
            displaySummonerData(gameName, tagLine);
        });
    });

    matchesContainer.addEventListener('click', function(event) {
        const card = event.target.closest('.match-card-adapted');
        if (card) {
            card.classList.toggle('expanded');
            console.log(`[DEBUG] main: Match card clicked, toggling expanded class.`);
        }
    });

    playerProfileDiv.style.display = 'none';
    matchHistorySection.style.display = 'none';
    refreshButton.style.display = 'none';
    loadMoreMatchesButton.style.display = 'none';
    if (initialPlayerProfileMessage) {
        initialPlayerProfileMessage.style.display = 'block';
        console.log("[DEBUG] main: Initial player profile message displayed.");
    }
}

document.addEventListener("DOMContentLoaded", main);