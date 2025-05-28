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
        const response = await fetch("http://127.0.0.1:5500/MusicT/songs/");
        if (!response.ok) throw new Error("Failed to fetch folder list");

        const text = await response.text();
        const div = document.createElement("div");
        div.innerHTML = text;

        const folderLinks = Array.from(div.querySelectorAll("a"))
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
        console.error(error);
        return [];
    }
}

// Fetch songs from the folder
async function getSongs(folder) {
    currFolder = folder;
    try {
        const response = await fetch(`http://127.0.0.1:5500/MusicT/songs/${currFolder}/`);
        if (!response.ok) throw new Error(`Folder ${currFolder} not found`);

        const text = await response.text();
        const div = document.createElement("div");
        div.innerHTML = text;

        songs = Array.from(div.getElementsByTagName("a"))
            .filter(a => a.href.endsWith(".mp3"))
            .map(a => decodeURIComponent(a.href.split(`/${folder}/`)[1]));

        const songUL = document.querySelector(".songList ul");
        songUL.innerHTML = songs.map(song => `
            <li>
                <img class="invert" width="34" src="img/music.svg" alt="music icon">
                <div class="info">
                    <div>${song}</div>
                    <div>Artist</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="img/play icon">
                </div>
            </li>
        `).join('');

        Array.from(songUL.getElementsByTagName("li")).forEach((li, index) => {
            li.addEventListener("click", () => playMusic(songs[index]));
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

    currentSong.src = `http://127.0.0.1:5500/MusicT/songs/${currFolder}/` + track;
    
    if (!pause) {
        currentSong.play();
        play.src = "img/pause.svg";
    } else {
        currentSong.pause();
        play.src = "img/play.svg";
    }

    document.querySelector(".songinfo").innerHTML = `<span>${track}</span>`;
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}


// Display albums dynamically
async function displayAlbums(folder) {
    try {
        const response = await fetch(`http://127.0.0.1:5500/MusicT/songs/${folder}/info.json`);
        if (!response.ok) throw new Error(`Metadata not found for folder: ${folder}`);

        const data = await response.json();

        const cardContainer = document.querySelector(".cardContainer");
        if (!cardContainer) {
            console.error("No element with class 'cardContainer' found!");
            return;
        }

        cardContainer.innerHTML += `
            <div data-folder="${folder}" class="card" style="cursor:pointer;">
                <div class="play">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
                    </svg>
                </div>
                <img src="http://127.0.0.1:5500/MusicT/songs/${folder}/cover.jpg" alt="Cover for ${data.title}">
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
        });

    } catch (error) {
        console.error(`Error loading metadata for folder ${folder}:`, error);
    }
}

// Helper to get current song index in songs array
function getCurrentSongIndex() {
    const currentSrc = decodeURIComponent(currentSong.src);
    const currentFile = currentSrc.substring(currentSrc.lastIndexOf('/') + 1);
    return songs.indexOf(currentFile);
}

// Initialize the app
async function main() {
    try {
        const folders = await getFolders();

        if (folders.length === 0) {
            console.warn("No music folders found!");
            return;
        }

        const cardContainer = document.querySelector(".cardContainer");
        if (cardContainer) cardContainer.innerHTML = ""; // Clear previous cards

        for (const folder of folders) {
            await displayAlbums(folder);
        }

        await getSongs(folders[0]);
        if (songs.length > 0) {
            playMusic(songs[0], true);
        }

        // Attach event listeners
        play.addEventListener("click", () => {
            if (currentSong.paused) {
                currentSong.play();
                play.src = "img/pause.svg";
            } else {
                currentSong.pause();
                play.src = "img/play.svg";
            }
        });

        // Add an event listener for hamburger
        document.querySelector(".hamburger").addEventListener("click", () => {
            document.querySelector(".left").style.left = "0"
        })

        // Add an event listener for close button
        document.querySelector(".close").addEventListener("click", () => {
            document.querySelector(".left").style.left = "-120%"
        })

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

        currentSong.addEventListener("timeupdate", () => {
            if (currentSong.duration) {
                document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
                document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
            }
        });

        currentSong.addEventListener("ended", () => {
            const currentIndex = getCurrentSongIndex();
            const nextIndex = currentIndex < songs.length - 1 ? currentIndex + 1 : 0; // loop to start
            playMusic(songs[nextIndex]);
        });

        document.querySelector(".seekbar").addEventListener("click", (e) => {
            const percent = (e.offsetX / e.target.offsetWidth);
            currentSong.currentTime = currentSong.duration * percent;
        });

        // Add an event to volume
        document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
            console.log("Setting volume to", e.target.value, "/ 100")
            currentSong.volume = parseInt(e.target.value) / 100
            if (currentSong.volume > 0) {
                document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg")
            }
        })

        document.querySelector(".volume>img").addEventListener("click", e => {
            // console.log(e.target)
            if (e.target.src.includes("img/volume.svg")) {
                e.target.src = e.target.src.replace("img/volume.svg", "img/mute.svg")
                currentSong.volume = 0;
                document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
            }
            else {
                e.target.src = e.target.src.replace("img/mute.svg", "img/volume.svg")
                currentSong.volume = .10;
                document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
            }
        })

    } catch (error) {
        console.error("Error initializing the app:", error);
    }
}

main();
