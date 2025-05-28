console.clear();

const currentSong = new Audio();
let songs = [];
let currFolder = "";

// Enable cross-origin requests for GitHub hosting
currentSong.crossOrigin = "anonymous";

// DOM Elements
const playBtn = document.querySelector("#play");
const previousBtn = document.querySelector("#previous");
const nextBtn = document.querySelector("#next");
const cardContainer = document.querySelector(".cardContainer");
const songListUl = document.querySelector(".songList ul");
const songInfoDiv = document.querySelector(".songinfo");
const songTimeDiv = document.querySelector(".songtime");
const seekBar = document.querySelector(".seekbar");
const volumeInput = document.querySelector(".range input");
const volumeIcon = document.querySelector(".volume img");
const progressCircle = document.querySelector(".circle");

// Utility: Format seconds to MM:SS
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Fetch album folders
async function getFolders() {
    try {
        const res = await fetch("./albums.json");
        if (!res.ok) throw new Error("Failed to fetch albums.json");
        const folders = await res.json();
        return Array.isArray(folders) && folders.length > 0 ? folders : [];
    } catch (e) {
        console.error(e);
        return [];
    }
}

// Display album cards
async function displayAlbums(folders) {
    cardContainer.innerHTML = "";
    for (const folder of folders) {
        try {
            const res = await fetch(`./songs/${encodeURIComponent(folder)}/info.json`);
            if (!res.ok) throw new Error(`info.json missing for ${folder}`);
            const data = await res.json();

            const card = document.createElement("div");
            card.classList.add("card");
            card.dataset.folder = folder;
            card.innerHTML = `
                <div class="play">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round"/>
                  </svg>
                </div>
                <img src="./songs/${encodeURIComponent(folder)}/cover.jpg" alt="Cover for ${data.title}" />
                <h2>${data.title}</h2>
                <p>${data.description}</p>
            `;

            cardContainer.appendChild(card);

            card.addEventListener("click", () => loadSongsFromInfo(folder, data.songs));
        } catch (err) {
            console.error(`Error loading album ${folder}:`, err);
        }
    }
}

// Load songs from album info
function loadSongsFromInfo(folder, songArray) {
    currFolder = folder;
    songs = songArray;

    songListUl.innerHTML = songs.map((song, i) => `
        <li data-index="${i}">
          <img class="invert" width="34" src="img/music.svg" alt="music icon" />
          <div class="info">
            <div>${song.title}</div>
            <div>${song.artist}</div>
          </div>
          <div class="playnow">
            <span>Play Now</span>
            <img class="invert" src="img/play.svg" alt="play icon" />
          </div>
        </li>
    `).join("");

    songListUl.querySelectorAll("li").forEach(li => {
        li.addEventListener("click", () => {
            const index = parseInt(li.dataset.index, 10);
            playMusic(songs[index].fileName);
        });
    });

    if (songs.length > 0) {
        playMusic(songs[0].fileName, true);
    }
}

// Play or pause a song
function playMusic(trackFileName, pause = false) {
    if (!trackFileName) return;

    currentSong.src = `./songs/${encodeURIComponent(currFolder)}/${encodeURIComponent(trackFileName)}`;

    const songObj = songs.find(s => s.fileName === trackFileName);
    songInfoDiv.innerHTML = songObj
        ? `<span>${songObj.title}</span>`
        : `<span>${trackFileName.replace(".mp3", "")}</span>`;

    songTimeDiv.textContent = "00:00 / 00:00";
    seekBar.value = 0;
    updateSeekbarBackground(0);
    progressCircle.style.left = "0%";

    if (!pause) {
        currentSong.play().then(() => {
            playBtn.src = "img/pause.svg";
        }).catch(console.error);
    } else {
        currentSong.pause();
        playBtn.src = "img/play.svg";
    }
}

// Update the seekbar's background fill for progress effect
function updateSeekbarBackground(percent) {
    seekBar.style.background = `linear-gradient(to right, rgb(83, 12, 130) ${percent}%, #272c3f ${percent}%)`;
}

// Setup controls and event listeners
function setupControls() {
    playBtn.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play().then(() => playBtn.src = "img/pause.svg");
        } else {
            currentSong.pause();
            playBtn.src = "img/play.svg";
        }
    });

    previousBtn.addEventListener("click", () => {
        let idx = getCurrentSongIndex();
        idx = idx > 0 ? idx - 1 : songs.length - 1;
        playMusic(songs[idx].fileName);
    });

    nextBtn.addEventListener("click", () => {
        let idx = getCurrentSongIndex();
        idx = idx < songs.length - 1 ? idx + 1 : 0;
        playMusic(songs[idx].fileName);
    });

    currentSong.addEventListener("timeupdate", () => {
        if (!currentSong.duration) return;

        const progressPercent = (currentSong.currentTime / currentSong.duration) * 100;

        progressCircle.style.left = `${progressPercent}%`;
        updateSeekbarBackground(progressPercent);

        songTimeDiv.textContent = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
    });

    seekBar.addEventListener("input", e => {
        const percent = e.target.value;
        progressCircle.style.left = `${percent}%`;
        updateSeekbarBackground(percent);
        currentSong.currentTime = (currentSong.duration * percent) / 100;
    });

    volumeInput.addEventListener("input", () => {
        currentSong.muted = false;
        currentSong.volume = volumeInput.value / 100;
    });
}

// Initialize the player on page load
async function init() {
    const folders = await getFolders();
    if (folders.length === 0) {
        cardContainer.innerHTML = "<p>No albums found!</p>";
        return;
    }

    await displayAlbums(folders);
    setupControls();
}

window.addEventListener("load", init);
