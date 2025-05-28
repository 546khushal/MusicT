console.log('JavaScript Initialized');

let currentSong = new Audio();
let songs = [];
let currFolder = '';
const play = document.querySelector("#play");
const previous = document.querySelector("#previous");
const next = document.querySelector("#next");

// Convert seconds to MM:SS format
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Fetch list of folders dynamically from songs root directory
async function getFolders() {
    try {
        const response = await fetch("./songs/");
        if (!response.ok) throw new Error("Failed to fetch folder list");

        const text = await response.text();
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(text, 'text/html');
        
        const folderLinks = Array.from(htmlDoc.querySelectorAll("a"))
            .map(a => a.href)
            .filter(href => {
                return href.includes("/songs/") && !href.endsWith(".mp3") && !href.endsWith("/songs/");
            })
            .map(href => {
                const parts = href.split("/songs/");
                if (parts.length < 2) return "";
                return decodeURIComponent(parts[1].replace(/\/$/, ""));
            })
            .filter(folderName => folderName.length > 0);

        if (folderLinks.length === 0) throw new Error("No music folders found!");
        return folderLinks;
    } catch (error) {
        console.error("Error fetching folders:", error);
        return [];
    }
}

// Fetch songs from the folder
async function getSongs(folder) {
    currFolder = folder;
    try {
        const response = await fetch(`./songs/${encodeURIComponent(currFolder)}/`);
        if (!response.ok) throw new Error(`Folder ${currFolder} not found`);

        const text = await response.text();
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(text, 'text/html');

        songs = Array.from(htmlDoc.querySelectorAll("a"))
            .filter(a => a.href.endsWith(".mp3"))
            .map(a => {
                const hrefParts = a.href.split(`/${folder}/`);
                return decodeURIComponent(hrefParts[hrefParts.length - 1]);
            });

        const songUL = document.querySelector(".songList ul");
        songUL.innerHTML = songs.map(song => `
            <li>
                <img class="invert" width="34" src="img/music.svg" alt="music icon">
                <div class="info">
                    <div>${song.replace('.mp3', '')}</div>
                    <div>Artist</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="play icon">
                </div>
            </li>
        `).join('');

        Array.from(songUL.querySelectorAll("li")).forEach((li, index) => {
            li.addEventListener("click", () => playMusic(songs[index]));
            li.addEventListener("touchstart", (e) => {
                e.preventDefault();
                playMusic(songs[index]);
            });
        });

    } catch (error) {
        console.error("Error fetching songs:", error);
        songs = [];
        document.querySelector(".songList ul").innerHTML = `<li>No songs found in folder "${folder}"</li>`;
    }
}

// Play or pause the current song
function playMusic(track, pause = false) {
    if (!track) {
        console.warn("No track provided to playMusic");
        return;
    }

    currentSong.src = `./songs/${encodeURIComponent(currFolder)}/${encodeURIComponent(track)}`;
    
    if (!pause) {
        currentSong.play()
            .then(() => {
                play.src = "img/pause.svg";
            })
            .catch(error => {
                console.error("Playback failed:", error);
            });
    } else {
        currentSong.pause();
        play.src = "img/play.svg";
    }

    document.querySelector(".songinfo").innerHTML = `<span>${track.replace('.mp3', '')}</span>`;
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}

// Display albums dynamically
async function displayAlbums(folder) {
    try {
        const response = await fetch(`./songs/${encodeURIComponent(folder)}/info.json`);
        if (!response.ok) throw new Error(`Metadata not found for folder: ${folder}`);

        const data = await response.json();

        const cardContainer = document.querySelector(".cardContainer");
        if (!cardContainer) {
            console.error("No element with class 'cardContainer' found!");
            return;
        }

        cardContainer.innerHTML += `
            <div data-folder="${folder}" class="card">
                <div class="play">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
                    </svg>
                </div>
                <img src="./songs/${encodeURIComponent(folder)}/cover.jpg" alt="Cover for ${data.title}">
                <h2>${data.title}</h2>
                <p>${data.description}</p>
            </div>`;

        // Attach click to card to load songs from this album
        const cards = cardContainer.querySelectorAll(".card");
        cards.forEach(card => {
            card.addEventListener("click", () => {
                const selectedFolder = card.getAttribute("data-folder");
                getSongs(selectedFolder).then(() => {
                    if (songs.length > 0) playMusic(songs[0], true);
                });
            });
            card.addEventListener("touchstart", (e) => {
                e.preventDefault();
                const selectedFolder = card.getAttribute("data-folder");
                getSongs(selectedFolder).then(() => {
                    if (songs.length > 0) playMusic(songs[0], true);
                });
            });
        });

    } catch (error) {
        console.error(`Error loading metadata for folder ${folder}:`, error);
    }
}

// Helper to get current song index in songs array
function getCurrentSongIndex() {
    if (!currentSong.src) return -1;
    const currentSrc = decodeURIComponent(currentSong.src);
    const currentFile = currentSrc.substring(currentSrc.lastIndexOf('/') + 1);
    return songs.indexOf(currentFile);
}

// Initialize the app
async function main() {
    try {
        // Mobile menu toggle
        document.querySelector(".hamburger").addEventListener("click", () => {
            document.querySelector(".left").style.left = "0";
        });
        document.querySelector(".hamburger").addEventListener("touchstart", (e) => {
            e.preventDefault();
            document.querySelector(".left").style.left = "0";
        });

        document.querySelector(".close").addEventListener("click", () => {
            document.querySelector(".left").style.left = "-120%";
        });
        document.querySelector(".close").addEventListener("touchstart", (e) => {
            e.preventDefault();
            document.querySelector(".left").style.left = "-120%";
        });

        const folders = await getFolders();

        if (folders.length === 0) {
            console.warn("No music folders found!");
            document.querySelector(".cardContainer").innerHTML = "<p>No music albums found. Please check your songs directory.</p>";
            return;
        }

        const cardContainer = document.querySelector(".cardContainer");
        cardContainer.innerHTML = ""; // Clear previous cards

        for (const folder of folders) {
            await displayAlbums(folder);
        }

        await getSongs(folders[0]);
        if (songs.length > 0) {
            playMusic(songs[0], true);
        }

        // Player controls
        play.addEventListener("click", () => {
            if (currentSong.paused) {
                currentSong.play()
                    .then(() => {
                        play.src = "img/pause.svg";
                    })
                    .catch(error => {
                        console.error("Playback failed:", error);
                    });
            } else {
                currentSong.pause();
                play.src = "img/play.svg";
            }
        });

        previous.addEventListener("click", () => {
            const currentIndex = getCurrentSongIndex();
            const index = currentIndex > 0 ? currentIndex - 1 : 0;
            playMusic(songs[index]);
        });

        next.addEventListener("click", () => {
            const currentIndex = getCurrentSongIndex();
            const index = currentIndex < songs.length - 1 ? currentIndex + 1 : songs.length - 1;
            playMusic(songs[index]);
        });

        // Touch events for mobile
        play.addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (currentSong.paused) {
                currentSong.play()
                    .then(() => {
                        play.src = "img/pause.svg";
                    });
            } else {
                currentSong.pause();
                play.src = "img/play.svg";
            }
        });

        previous.addEventListener("touchstart", (e) => {
            e.preventDefault();
            const currentIndex = getCurrentSongIndex();
            const index = currentIndex > 0 ? currentIndex - 1 : 0;
            playMusic(songs[index]);
        });

        next.addEventListener("touchstart", (e) => {
            e.preventDefault();
            const currentIndex = getCurrentSongIndex();
            const index = currentIndex < songs.length - 1 ? currentIndex + 1 : songs.length - 1;
            playMusic(songs[index]);
        });

        // Progress bar
        currentSong.addEventListener("timeupdate", () => {
            if (currentSong.duration) {
                document.querySelector(".songtime").innerHTML = 
                    `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
                document.querySelector(".circle").style.left = 
                    (currentSong.currentTime / currentSong.duration) * 100 + "%";
            }
        });

        currentSong.addEventListener("ended", () => {
            const currentIndex = getCurrentSongIndex();
            const nextIndex = currentIndex < songs.length - 1 ? currentIndex + 1 : 0;
            playMusic(songs[nextIndex]);
        });

        document.querySelector(".seekbar").addEventListener("click", (e) => {
            const percent = (e.offsetX / e.target.offsetWidth);
            currentSong.currentTime = currentSong.duration * percent;
        });

        // Touch support for seekbar
        document.querySelector(".seekbar").addEventListener("touchstart", (e) => {
            const rect = e.target.getBoundingClientRect();
            const percent = (e.touches[0].clientX - rect.left) / rect.width;
            currentSong.currentTime = currentSong.duration * percent;
        });

        // Volume control
        const volumeInput = document.querySelector(".range input");
        volumeInput.addEventListener("input", (e) => {
            currentSong.volume = parseInt(e.target.value) / 100;
            if (currentSong.volume > 0) {
                document.querySelector(".volume img").src = "img/volume.svg";
            }
        });

        document.querySelector(".volume img").addEventListener("click", (e) => {
            if (e.target.src.includes("volume.svg")) {
                e.target.src = "img/mute.svg";
                currentSong.volume = 0;
                volumeInput.value = 0;
            } else {
                e.target.src = "img/volume.svg";
                currentSong.volume = 0.5;
                volumeInput.value = 50;
            }
        });

        // Touch support for volume
        document.querySelector(".volume img").addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (e.target.src.includes("volume.svg")) {
                e.target.src = "img/mute.svg";
                currentSong.volume = 0;
                volumeInput.value = 0;
            } else {
                e.target.src = "img/volume.svg";
                currentSong.volume = 0.5;
                volumeInput.value = 50;
            }
        });

    } catch (error) {
        console.error("Error initializing the app:", error);
        document.querySelector(".cardContainer").innerHTML = 
            `<p>Error loading music player: ${error.message}</p>`;
    }
}

// Start the app
main();