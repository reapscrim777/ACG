// Twój klucz API Riot Games - PAMIĘTAJ O JEGO REGULARNEJ WYMIANIE
const RIOT_API_KEY = "RGAPI-ceec8f6f-4325-4d64-be9d-717fe6169912"; 

// Stałe API
const BASE_ACCOUNT_API_URL = "https://europe.api.riotgames.com";
const BASE_LOL_API_URL = "https://eun1.api.riotgames.com";
const BASE_MATCH_API_URL = "https://europe.api.riotgames.com";

// --- ZMIENNE GLOBALNE DLA DANYCH GRY (WERSJA I OBRAZKI) ---
let LATEST_DDRAGON_VERSION = ""; // Ta zmienna będzie przechowywać najnowszą wersję
let DDRAGON_CDN_IMG = ""; // Ten URL będzie dynamicznie tworzony
let championIdMap = {}; // Mapa ID postaci

// --- NOWA, ULEPSZONA FUNKCJA INICJALIZUJĄCA ---
async function initializeGameData() {
    try {
        // Krok 1: Pobierz listę wszystkich wersji Data Dragon
        const versionsResponse = await fetch(`https://ddragon.leagueoflegends.com/api/versions.json`);
        if (!versionsResponse.ok) throw new Error("Nie udało się pobrać wersji gry.");
        const versions = await versionsResponse.json();
        LATEST_DDRAGON_VERSION = versions[0]; // Pierwsza pozycja to zawsze najnowsza wersja
        console.log(`Pobrano najnowszą wersję gry: ${LATEST_DDRAGON_VERSION}`);

        // Krok 2: Ustaw dynamicznie ścieżkę do obrazków
        DDRAGON_CDN_IMG = `https://ddragon.leagueoflegends.com/cdn/${LATEST_DDRAGON_VERSION}/img`;

        // Krok 3: Pobierz dane postaci używając najnowszej wersji
        const championResponse = await fetch(`https://ddragon.leagueoflegends.com/cdn/${LATEST_DDRAGON_VERSION}/data/en_US/champion.json`);
        if (!championResponse.ok) throw new Error("Nie udało się pobrać listy postaci.");
        
        const json = await championResponse.json();
        const champions = json.data;
        
        for (const championKey in champions) {
            const championData = champions[championKey];
            championIdMap[championData.key] = championData.id;
        }
        console.log("Mapa postaci została pomyślnie załadowana.");

    } catch (error) {
        console.error("Krytyczny błąd podczas inicjalizacji danych gry:", error);
        displayError("Nie można załadować podstawowych danych gry. Odśwież stronę.");
    }
}


// --- FUNKCJE POMOCNICZE (bez zmian) ---

function getSpellName(spellId) {
    const spellMap = { '1': 'SummonerBoost', '3': 'SummonerExhaust', '4': 'SummonerFlash', '6': 'SummonerHaste', '7': 'SummonerHeal', '11': 'SummonerSmite', '12': 'SummonerTeleport', '13': 'SummonerMana', '14': 'SummonerDot', '21': 'SummonerBarrier' };
    return spellMap[spellId] || 'SummonerFlash';
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
    if (seconds > 3600) { seconds = Math.floor(seconds / 1000); }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
}

function createPlayerRowHtml(player, mainPlayerPuuid) {
    const isMainPlayer = player.puuid === mainPlayerPuuid;
    const items = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5, player.item6]
        .map(id => `<div class="item-slot-small">${id !== 0 ? `<img src="${DDRAGON_CDN_IMG}/item/${id}.png">` : ''}</div>`).join('');
    
    const championFileId = championIdMap[player.championId] || player.championName;

    return `
        <tr class="${isMainPlayer ? 'main-player-row' : ''}">
            <td class="player-cell">
                <img class="table-champ-icon" src="${DDRAGON_CDN_IMG}/champion/${championFileId}.png">
                <div class="table-spells">
                    <img src="${DDRAGON_CDN_IMG}/spell/${getSpellName(player.summoner1Id)}.png">
                    <img src="${DDRAGON_CDN_IMG}/spell/${getSpellName(player.summoner2Id)}.png">
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

// Reszta kodu pozostaje identyczna...
// ...
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
const API_CALL_DELAY_MS = 1200;

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function displayError(message) { errorMessageDiv.textContent = message; }
function clearError() { errorMessageDiv.textContent = ""; }

async function getAccountByRiotId(gameName, tagLine) {
    clearError();
    const url = `${BASE_ACCOUNT_API_URL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Błąd API ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`[getAccountByRiotId] Błąd:`, error);
        displayError(`Błąd wyszukiwania konta: ${error.message}. Sprawdź Riot ID i klucz API.`);
        return null;
    }
}

async function getSummonerByPuuid(puuid) {
    const url = `${BASE_LOL_API_URL}/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Błąd API ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`[getSummonerByPuuid] Błąd:`, error);
        displayError(`Błąd pobierania danych przywoływacza: ${error.message}`);
        return null;
    }
}

async function getSummonerRank(summonerId) {
    const url = `${BASE_LOL_API_URL}/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${RIOT_API_KEY}`;
    try {
        const response = await fetch(url);
        if (response.status === 404) return [];
        if (!response.ok) throw new Error(`Błąd API ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error("[getSummonerRank] Błąd:", error);
        return null;
    }
}

async function getMatchIds(puuid, start = 0, count = 10) {
    const url = `${BASE_MATCH_API_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}&api_key=${RIOT_API_KEY}`;
    try {
        const response = await fetch(url);
        if (response.status === 404) return [];
        if (!response.ok) throw new Error(`Błąd API ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`[getMatchIds] Błąd:`, error);
        displayError(`Błąd pobierania historii meczów: ${error.message}.`);
        return null;
    }
}

async function getMatchDetails(matchId) {
    const url = `${BASE_MATCH_API_URL}/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Błąd API ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`[getMatchDetails] Błąd dla meczu ${matchId}:`, error);
        return null;
    }
}

function renderMatchCard(match, puuid) {
    if (!match?.info?.participants) return '';
    const mainPlayer = match.info.participants.find(p => p.puuid === puuid);
    if (!mainPlayer) return '';

    const resultClass = mainPlayer.win ? 'victory' : 'defeat';
    
    const championFileId = championIdMap[mainPlayer.championId] || mainPlayer.championName;
    const championImgUrl = `${DDRAGON_CDN_IMG}/champion/${championFileId}.png`;
    
    const spell1ImgUrl = `${DDRAGON_CDN_IMG}/spell/${getSpellName(mainPlayer.summoner1Id)}.png`;
    const spell2ImgUrl = `${DDRAGON_CDN_IMG}/spell/${getSpellName(mainPlayer.summoner2Id)}.png`;
    const rune1ImgUrl = `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7201_Precision.png`;
    const rune2ImgUrl = `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7200_Domination.png`;

    const kdaString = `${mainPlayer.kills} / <span class="deaths">${mainPlayer.deaths}</span> / ${mainPlayer.assists}`;
    const kdaRatio = mainPlayer.deaths === 0 ? 'Perfect' : `${((mainPlayer.kills + mainPlayer.assists) / mainPlayer.deaths).toFixed(2)} KDA`;
    const items = [mainPlayer.item0, mainPlayer.item1, mainPlayer.item2, mainPlayer.item3, mainPlayer.item4, mainPlayer.item5, mainPlayer.item6].map(id => `<div class="item-slot">${id !== 0 ? `<img src="${DDRAGON_CDN_IMG}/item/${id}.png">` : ''}</div>`).join('');
    const cs = mainPlayer.totalMinionsKilled + mainPlayer.neutralMinionsKilled;
    const gold = `${(mainPlayer.goldEarned / 1000).toFixed(1)}k`;
    const teamKills = match.info.participants.filter(p => p.teamId === mainPlayer.teamId).reduce((t, p) => t + p.kills, 0);
    const killParticipation = teamKills === 0 ? '0%' : `${Math.round(((mainPlayer.kills + mainPlayer.assists) / teamKills) * 100)}%`;
    
    const blueTeamHtml = match.info.participants
        .filter(p => p.teamId === 100)
        .map(p => `<div class="player"><img src="${DDRAGON_CDN_IMG}/champion/${championIdMap[p.championId] || p.championName}.png"><span>${p.riotIdGameName.split('#')[0]}</span></div>`)
        .join('');
    const redTeamHtml = match.info.participants
        .filter(p => p.teamId === 200)
        .map(p => `<div class="player"><img src="${DDRAGON_CDN_IMG}/champion/${championIdMap[p.championId] || p.championName}.png"><span>${p.riotIdGameName.split('#')[0]}</span></div>`)
        .join('');
        
    const duration = formatGameDuration(match.info.gameDuration);
    const timeAgo = formatTimeAgo(match.info.gameEndTimestamp);

    const blueTeamRows = match.info.participants.filter(p => p.teamId === 100).map(p => createPlayerRowHtml(p, puuid)).join('');
    const redTeamRows = match.info.participants.filter(p => p.teamId === 200).map(p => createPlayerRowHtml(p, puuid)).join('');
    const detailsTableHtml = `<div class="match-details-table-container"><table class="match-details-table"><thead><tr><th>${match.info.teams.find(t=>t.teamId===100).win ? 'ZWYCIĘSTWO' : 'PORAŻKA'} (Drużyna Niebieska)</th><th>KDA</th><th>Obrażenia</th><th>CS</th><th>Przedmioty</th></tr></thead><tbody>${blueTeamRows}</tbody><thead><tr><th>${match.info.teams.find(t=>t.teamId===200).win ? 'ZWYCIĘSTWO' : 'PORAŻKA'} (Drużyna Czerwona)</th><th>KDA</th><th>Obrażenia</th><th>CS</th><th>Przedmioty</th></tr></thead><tbody>${redTeamRows}</tbody></table></div>`;

    return `
        <div class="match-card-adapted ${resultClass}">
            <div class="match-summary-view">
                <div class="match-stats-left">
                    <div class="champion-details">
                        <div class="champion-icon-container">
                            <img src="${championImgUrl}" class="champion-icon">
                            <span class="level">${mainPlayer.champLevel}</span>
                        </div>
                    </div>
                    <div class="spells-runes"><div class="spells"><img src="${spell1ImgUrl}"><img src="${spell2ImgUrl}"></div><div class="runes"><img src="${rune1ImgUrl}" class="rune-main"><img src="${rune2ImgUrl}"></div></div>
                    <div class="kda-stats"><div class="kda-score">${kdaString}</div><div class="kda-ratio">${kdaRatio}</div></div>
                    <div class="items">${items}</div>
                    <div class="game-stats"><div class="stat">CS ${cs}</div><div class="stat">Złoto ${gold}</div><div class="stat-kp">KP ${killParticipation}</div></div>
                </div>
                <div class="match-stats-right">
                    <div class="player-lists"><div class="team">${blueTeamHtml}</div><div class="team">${redTeamHtml}</div></div>
                    <div class="match-meta"><div class="match-duration">${duration}</div><div class="match-timestamp">${timeAgo}</div></div>
                </div>
            </div>
            ${detailsTableHtml}
        </div>`;
}

async function loadMatchHistory(puuid, clearExisting = true) {
    matchHistorySection.style.display = 'block';
    if (clearExisting) {
        matchesContainer.innerHTML = `<p style="text-align: center; color: #bbb;">Ładowanie historii meczów...</p>`;
        currentMatchStartIndex = 0;
    }
    const matchIds = await getMatchIds(puuid, currentMatchStartIndex, MATCHES_PER_LOAD);
    if (!matchIds) return;
    if (clearExisting) matchesContainer.innerHTML = '';
    if (matchIds.length === 0) {
        if(clearExisting) matchesContainer.innerHTML = `<p style="text-align: center; color: #ccc;">Brak historii meczów dla tego gracza.</p>`;
        loadMoreMatchesButton.style.display = 'none';
        return;
    }

    for (const matchId of matchIds) {
        const matchDetails = await getMatchDetails(matchId);
        if (matchDetails) {
            matchesContainer.insertAdjacentHTML('beforeend', renderMatchCard(matchDetails, puuid));
        }
        await delay(API_CALL_DELAY_MS);
    }
    currentMatchStartIndex += matchIds.length;
    loadMoreMatchesButton.style.display = (matchIds.length < MATCHES_PER_LOAD) ? 'none' : 'block';
}

async function displaySummonerData(gameName, tagLine) {
    initialPlayerProfileMessage.style.display = 'none';
    playerProfileDiv.style.display = 'block';
    matchHistorySection.style.display = 'block';
    summonerHeaderContainer.innerHTML = `<p style="text-align: center; color: #bbb;">Ładowanie danych dla ${gameName}#${tagLine}...</p>`;
    summonerDetailsContainer.innerHTML = '';
    clearError();
    refreshButton.style.display = 'none';

    currentSearchedPlayer = { gameName, tagLine, puuid: null };
    const accountData = await getAccountByRiotId(gameName, tagLine);
    if (!accountData) return;
    currentSearchedPlayer.puuid = accountData.puuid;

    const summonerData = await getSummonerByPuuid(accountData.puuid);
    if (!summonerData) return;

    const rankData = await getSummonerRank(summonerData.id);
    
    // Używamy dynamicznej ścieżki do obrazków
    const profileIconUrl = `${DDRAGON_CDN_IMG}/profileicon/${summonerData.profileIconId}.png`;
    summonerHeaderContainer.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; gap: 15px;"><img src="${profileIconUrl}" style="width: 80px; height: 80px; border-radius: 50%;"><div class="summoner-info"><h2 style="margin:0;">${accountData.gameName}#${accountData.tagLine}</h2><p style="margin:0;">Poziom: ${summonerData.summonerLevel}</p></div></div>`;
    
    let rankInfoHtml = '<p style="color: #bbb;">Brak danych rankingowych.</p>';
    if (rankData && rankData.length > 0) {
        const soloDuoRank = rankData.find(entry => entry.queueType === "RANKED_SOLO_5x5");
        if (soloDuoRank) {
            rankInfoHtml = `<div class="rank-card" style="text-align: left;"><h4>Solo/Duo Queue</h4><p>${soloDuoRank.tier} ${soloDuoRank.rank} - ${soloDuoRank.leaguePoints} LP</p><p>Wygrane: ${soloDuoRank.wins} / Przegrane: ${soloDuoRank.losses}</p></div>`;
        }
    }
    summonerDetailsContainer.innerHTML = rankInfoHtml;

    refreshButton.style.display = 'block';
    await loadMatchHistory(currentSearchedPlayer.puuid, true);
}

// --- Główna funkcja inicjalizująca ---
async function main() {
    await initializeGameData(); // Najpierw ładujemy dane gry

    // Dopiero potem podpinamy event listenery, które mogą z nich korzystać
    searchButton.addEventListener("click", () => {
        const fullRiotId = summonerNameInput.value.trim();
        const parts = fullRiotId.split('#');
        if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
            displaySummonerData(parts[0].trim(), parts[1].trim());
        } else {
            displayError("Wpisz poprawne Riot ID w formacie: NazwaGry#Tagline");
        }
    });

    summonerNameInput.addEventListener("keypress", e => { if (e.key === "Enter") searchButton.click(); });
    refreshButton.addEventListener("click", () => { if (currentSearchedPlayer.gameName) displaySummonerData(currentSearchedPlayer.gameName, currentSearchedPlayer.tagLine); });
    loadMoreMatchesButton.addEventListener("click", () => { if (currentSearchedPlayer.puuid) loadMatchHistory(currentSearchedPlayer.puuid, false); });

    playerSelectButtons.forEach(button => {
        button.addEventListener('click', () => {
            const summonerNameWithTag = button.getAttribute('data-summoner-name');
            const [gameName, tagLine] = summonerNameWithTag.split('#');
            summonerNameInput.value = summonerNameWithTag;
            displaySummonerData(gameName, tagLine);
        });
    });

    matchesContainer.addEventListener('click', function(event) {
        const card = event.target.closest('.match-card-adapted');
        if (card) {
            card.classList.toggle('expanded');
        }
    });

    playerProfileDiv.style.display = 'none';
    matchHistorySection.style.display = 'none';
    refreshButton.style.display = 'none';
    loadMoreMatchesButton.style.display = 'none';
    if (initialPlayerProfileMessage) {
        initialPlayerProfileMessage.style.display = 'block';
    }
}


document.addEventListener("DOMContentLoaded", main);