console.clear();

const currentSong = new Audio();
let songs = [];
let currFolder = "";
let isLoggedIn = false;
let registeredUsers = [];

currentSong.crossOrigin = "anonymous";

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
const artistContainer = document.querySelector(".artistContainer");

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.querySelector(".loginbtn");
  const overlay = document.getElementById("overlay");
  const authModal = document.getElementById("authModal");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const logoutBtn = document.querySelector(".logoutbtn");

  const showLoginBtn = document.querySelector('a[onclick="showLogin()"]');
  const showSignupBtn = document.querySelector('a[onclick="showSignup()"]');

  // Check login status
  if (localStorage.getItem("isLoggedIn") === "true") {
    isLoggedIn = true;
    updateAuthUI();
  }

  // Login button click
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      authModal.style.display = "block";
      overlay.style.display = "block";
      showSignupForm();
    });
  }

  // Logout functionality
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      isLoggedIn = false;
      localStorage.removeItem("isLoggedIn");
      updateAuthUI();
      currentSong.pause();
      playBtn.src = "img/play.svg";
      alert("You have been logged out");
    });
  }

  // Modal close handlers
  overlay.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  document.querySelectorAll(".cancel").forEach(btn => btn.addEventListener("click", closeModal));

  // Form switching
  showLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    showLoginForm();
  });

  showSignupBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    showSignupForm();
  });

  // Login form submit
  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;
    
    const user = registeredUsers.find(u => u.email === email && u.password === password);
    if (user) {
      isLoggedIn = true;
      localStorage.setItem("isLoggedIn", "true");
      updateAuthUI();
      closeModal();
      alert("Login successful!");
    } else {
      alert("Invalid email or password. Please try again or sign up.");
    }
  });

  // Signup form submit
  signupForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = signupForm.querySelector('input[type="email"]').value;
    const password = signupForm.querySelector('input[type="password"]').value;
    
    if (registeredUsers.some(u => u.email === email)) {
      alert("This email is already registered. Please login.");
      showLoginForm();
    } else {
      registeredUsers.push({email, password});
      alert("Registration successful! Please login.");
      showLoginForm();
    }
  });

  // Initialize artist display
  displayArtists();
});

function showLoginAlert() {
  alert("Please login to play music. Click the login button in the top right corner.");
}

function closeModal() {
  document.getElementById("authModal").style.display = "none";
  document.getElementById("overlay").style.display = "none";
}

function showLoginForm() {
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("signupForm").style.display = "none";
}

function showSignupForm() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("signupForm").style.display = "block";
}

function updateAuthUI() {
  const loginBtn = document.querySelector(".loginbtn");
  const logoutBtn = document.querySelector(".logoutbtn");
  
  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "block";
  } else {
    if (loginBtn) loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

/* Music Player Functions */
function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

async function getFolders() {
  try {
    const res = await fetch("./songs/albums.json");
    if (!res.ok) throw new Error("Failed to load albums");
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function displayAlbums(folders) {
  cardContainer.innerHTML = "";
  
  for (const folder of folders) {
    try {
      const res = await fetch(`./songs/${encodeURIComponent(folder)}/info.json`);
      if (!res.ok) throw new Error(`Album info not found for ${folder}`);
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
        <img src="./songs/${encodeURIComponent(folder)}/cover.jpg" alt="${data.title}" />
        <h2>${data.title}</h2>
        <p>${data.description}</p>
      `;

      card.addEventListener("click", () => {
        if (!isLoggedIn) {
          showLoginAlert();
          return;
        }
        loadSongsFromInfo(folder, data.songs);
      });

      cardContainer.appendChild(card);
    } catch (err) {
      console.error(`Error loading album ${folder}:`, err);
    }
  }
}

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
      if (!isLoggedIn) {
        showLoginAlert();
        return;
      }
      const index = parseInt(li.dataset.index, 10);
      playMusic(songs[index].fileName);
    });
  });

  if (songs.length > 0 && isLoggedIn) {
    playMusic(songs[0].fileName, true);
  }
}

function playMusic(trackFileName, pause = false) {
  if (!trackFileName) return;
  
  if (!isLoggedIn) {
    showLoginAlert();
    return;
  }

  currentSong.src = `./songs/${encodeURIComponent(currFolder)}/${encodeURIComponent(trackFileName)}`;

  const songObj = songs.find(s => s.fileName === trackFileName);
  songInfoDiv.innerHTML = songObj
    ? `<span>${songObj.title} - ${songObj.artist}</span>`
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

function getCurrentSongIndex() {
  if (!currentSong.src) return -1;
  const currentFile = decodeURIComponent(currentSong.src.split("/").pop());
  return songs.findIndex(s => s.fileName === currentFile);
}

function updateSeekbarBackground(percent) {
  seekBar.style.background = `linear-gradient(to right, rgb(83, 12, 130) ${percent}%, #272c3f ${percent}%)`;
}

function setupControls() {
  playBtn.addEventListener("click", () => {
    if (!isLoggedIn) {
      showLoginAlert();
      return;
    }
    
    if (currentSong.paused) {
      currentSong.play().then(() => playBtn.src = "img/pause.svg");
    } else {
      currentSong.pause();
      playBtn.src = "img/play.svg";
    }
  });

  previousBtn.addEventListener("click", () => {
    if (!isLoggedIn) {
      showLoginAlert();
      return;
    }
    
    let idx = getCurrentSongIndex();
    idx = idx > 0 ? idx - 1 : songs.length - 1;
    playMusic(songs[idx].fileName);
  });

  nextBtn.addEventListener("click", () => {
    if (!isLoggedIn) {
      showLoginAlert();
      return;
    }
    
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

  seekBar.addEventListener("click", e => {
    if (!isLoggedIn) {
      showLoginAlert();
      return;
    }
    
    const rect = seekBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = (clickX / seekBar.clientWidth) * 100;
    progressCircle.style.left = `${percent}%`;
    updateSeekbarBackground(percent);
    currentSong.currentTime = (currentSong.duration * percent) / 100;
  });

  volumeInput.addEventListener("input", () => {
    currentSong.muted = false;
    currentSong.volume = volumeInput.value / 100;
    updateVolumeIcon(currentSong.volume);
  });

  volumeIcon.addEventListener("click", () => {
    if (currentSong.muted) {
      currentSong.muted = false;
      volumeInput.value = currentSong.volume * 100;
    } else {
      currentSong.muted = true;
      volumeInput.value = 0;
    }
    updateVolumeIcon(currentSong.volume);
  });
}

function updateVolumeIcon(volume) {
  volumeIcon.src = volume === 0 || currentSong.muted ? "img/mute.svg" : "img/volume.svg";
}

function displayArtists() {
  const artistData = [
    {
        name: "Geeta Rabari",
        image: "https://i.pinimg.com/736x/4e/10/34/4e103409466bcbd80d53f735f40523ec.jpg", 
    },
    {
        name: "Chotu Singh Rawna",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTSYhuQL9Ka8Srt8c8bg9jog651vxmwh6Zaug&s", 
    },
    {
        name: "Honey Singh",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvdAtMc_9bnEoOGft8FOd-b1tKzHyCyZsw5Q&s", 
    },
    {
        name: "Diljit Dosanjh",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSemxdZfU3B1z368HKc0jpByQAqL5gjI5f6KQ&s", 
    },
    {
        name: "Ajit Kumar",
        image: "https://static.moviecrow.com/marquee/thunivu-hd-stills-feat-ak-ajith-kumar/210606_thumb_665.jpg", 
    },
    {
        name: "Neha Kakkar",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShLl_hhHLXtnYMd9iPiS9rxc4VSHoLDGyWMA&s", 
    },
    {
        name: "Arijit Singh",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1X_aYyKSDQOYdnH9SI8_QSoEYPYU_PQWXow&s", 
    },
    {
        name: "Shreya Ghoshal",
        image: "https://i.pinimg.com/736x/b5/69/c2/b569c21b4efb6f21e72e805359284fbb.jpg", 
    },
    {
        name: "Badshah",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRItEixREdkd0VXvJJHbkFgIWsr-24olPU4mg&s", 
    },
    {
        name: "Sonu Nigam",
        image: "https://i.pinimg.com/736x/3a/29/bf/3a29bf3ecfe972975ed82dd296e96441.jpg", 
    },
    {
        name: "Lata Mangeshkar",
        image: "https://i.pinimg.com/736x/eb/f2/14/ebf2149efe8f2d905455d2fe85a2e725.jpg", 
    },
    {
        name: "Kishore Kumar",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9exUF_skLW8erAcvGpkkBrBPFQuCxp1SWbw&s", 
    }
  ];

  artistContainer.innerHTML = "";
  artistData.forEach(artist => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
      <img src="${artist.image}" alt="${artist.name}" />
      <h2>${artist.name}</h2>
    `;
    artistContainer.appendChild(card);
  });
}

// Hamburger menu
document.querySelector(".hamburger").addEventListener("click", () => {
  document.querySelector(".left").style.left = "0";
});

document.querySelector(".close").addEventListener("click", () => {
  document.querySelector(".left").style.left = "-120%";
});

async function init() {
  const folders = await getFolders();
  if (folders.length === 0) {
    cardContainer.innerHTML = "<p>No albums found!</p>";
    return;
  }

  await displayAlbums(folders);
  setupControls();

  currentSong.volume = 0.5;
  volumeInput.value = 50;
  updateVolumeIcon(0.5);
}

window.addEventListener("load", init);