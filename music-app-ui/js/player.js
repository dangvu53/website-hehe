import supabase from "./supabase.js";

const audio = new Audio();
let currentTrackIndex = 0;
let playlist = [];
let isPlaying = false;

// Biến để theo dõi UI elements
let playerUI = {
  playPauseBtn: null,
  prevBtn: null,
  nextBtn: null,
  progressBar: null,
  currentTimeDisplay: null,
  totalTimeDisplay: null,
  songTitleDisplay: null,
  songArtistDisplay: null,
};

// Khởi tạo player và gán các elements UI
function initPlayer() {
  // Tìm các phần tử UI
  if (window.playlist) {
    playlist = window.playlist;
    console.log(
      "Đã cập nhật playlist từ window.playlist, có",
      playlist.length,
      "bài"
    );
  }

  playerUI.playPauseBtn = document.querySelector(".control-btn.play-pause");
  playerUI.prevBtn = document.querySelector(".control-btn.previous");
  playerUI.nextBtn = document.querySelector(".control-btn.next");
  playerUI.progressBar = document.querySelector(".progress");
  playerUI.currentTimeDisplay = document.querySelector(".current-time");
  playerUI.totalTimeDisplay = document.querySelector(".total-time");
  playerUI.songTitleDisplay = document.querySelector(".song-info-player p");

  // Thêm event listeners cho các nút
  if (playerUI.playPauseBtn) {
    playerUI.playPauseBtn.addEventListener("click", togglePlayPause);
  }

  if (playerUI.prevBtn) {
    playerUI.prevBtn.addEventListener("click", previousTrack);
  }

  if (playerUI.nextBtn) {
    playerUI.nextBtn.addEventListener("click", nextTrack);
  }

  // Thêm event listeners cho audio element
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", () => {
    if (playerUI.totalTimeDisplay) {
      playerUI.totalTimeDisplay.textContent = formatTime(audio.duration);
    }
  });
  audio.addEventListener("ended", nextTrack);
  audio.addEventListener("error", (e) => {
    console.error("Audio error:", e);
    alert("Không thể phát bài hát. Vui lòng thử lại.");
  });

  // tthiết lập volume ban đầu
  audio.volume = 0.5;

  // thiết lập thanh volume nếu có
  const volumeSlider = document.querySelector(".volume-slider");
  if (volumeSlider) {
    volumeSlider.value = audio.volume * 100;
    volumeSlider.addEventListener("input", (e) => {
      audio.volume = e.target.value / 100;
    });
  }
}

// Cập nhật danh sách bài hát
function updateSongsList() {
  const songsList = document.querySelector(".playlist");
  if (!songsList) return;

  songsList.innerHTML = "";

  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    li.dataset.index = index;
    li.className = index === currentTrackIndex && isPlaying ? "active" : "";

    li.innerHTML = `
      <div class="song-info">
        <span class="song-title">${song.title}</span>
        <span class="artist">${song.artist}</span>
        
      </div>
      <span class="duration">${song.duration}</span>
    `;

    li.addEventListener("click", () => {
      currentTrackIndex = index;
      loadTrack(currentTrackIndex).then(() => {
        playTrack(True);
      });
    });

    songsList.appendChild(li);
  });
}

async function loadAndPlayTrack(index) {
  showMusicPlayer();

  if (window.playlist && (!playlist || playlist.length === 0)) {
    playlist = window.playlist;
  }

  currentTrackIndex = index;

  const success = await loadTrack(index);

  if (success) {
    playTrack();
  } else {
  }
}

// Load một bài hát cụ thể từ Supabase
async function loadTrack(index) {
  if (index < 0 || index >= playlist.length) return false;

  const song = playlist[index];

  try {
    // Lấy signed URL từ Supabase
    const { data, error } = await supabase.storage
      .from("music-files")
      .createSignedUrl(song.file_path, 3600); // URL hết hạn sau 1 giờ

    if (error) throw error;

    // Cập nhật nguồn cho audio
    audio.src = data.signedUrl;
    audio.load();

    updateTrackInfo(song);

    return true;
  } catch (error) {
    console.error("Error loading track:", error);
    return false;
  }
}

// Cập nhật thông tin bài hát hiển thị
function updateTrackInfo(song) {
  const playerLeft = document.querySelector(".player-left");
  if (playerLeft) {
    const songInfo = playerLeft.querySelector(".song-info-player");
    if (songInfo) {
      const isFav =
        typeof window.isFavorite === "function"
          ? window.isFavorite(song.id)
          : false;

      songInfo.innerHTML = `
        <div class="now-playing-header">
          <p class="song-title">${song.title}</p>
          <button class="player-favorite-btn ${
            isFav ? "active" : ""
          }" data-id="${song.id}">❤</button>
        </div>
        <p class="song-artist">${song.artist}</p>
      `;

      const favoriteBtn = songInfo.querySelector(".player-favorite-btn");
      if (favoriteBtn) {
        favoriteBtn.addEventListener("click", () => {
          if (typeof window.toggleFavorite === "function") {
            const songId = favoriteBtn.dataset.id;
            const isNowFavorite = window.toggleFavorite(songId);
            favoriteBtn.classList.toggle("active", isNowFavorite);
          }
        });
      }

      const downloadBtn = document.querySelector(".player-download-btn");
      if (downloadBtn && song) {
        downloadBtn.dataset.id = song.id;
        downloadBtn.dataset.path = song.file_path;
        downloadBtn.dataset.title = song.title;

        console.log("a");
        downloadBtn.onclick = function () {
          if (typeof window.downloadSong === "function") {
            window.downloadSong(song.id, song.file_path, song.title);
          } else {
            console.error("Hàm downloadSong chưa được định nghĩa");
          }
        };
      }
    }
  }

  if (playerUI.songTitleDisplay) {
    playerUI.songTitleDisplay.textContent = `${song.title} - ${song.artist}`;
  }

  // Highlight bài hát đang phát trong danh sách
  document.querySelectorAll("#song-list li").forEach((li) => {
    li.classList.toggle(
      "active",
      parseInt(li.dataset.index) === currentTrackIndex
    );
  });
}

// Chuyển đổi play/pause
function togglePlayPause() {
  if (playlist.length === 0) return;

  if (isPlaying) {
    pauseTrack();
  } else {
    playTrack();
  }
}

// Phát bài hát hiện tại
function playTrack() {
  if (playlist.length === 0) return;

  showMusicPlayer();

  audio
    .play()
    .then(() => {
      isPlaying = true;

      // Cập nhật nút play/pause
      if (playerUI.playPauseBtn) {
        playerUI.playPauseBtn.textContent = "❚❚";
      }

      // Cập nhật trạng thái active trong danh sách
      updateSongsList();
    })
    .catch((error) => {
      console.error("Error playing track:", error);
    });
}

// Tạm dừng bài hát hiện tại
function pauseTrack() {
  audio.pause();
  isPlaying = false;

  // Cập nhật nút play/pause
  if (playerUI.playPauseBtn) {
    playerUI.playPauseBtn.textContent = "▶";
  }
}

// Phát bài hát tiếp theo
function nextTrack() {
  currentTrackIndex++;
  if (currentTrackIndex >= playlist.length) {
    currentTrackIndex = 0; // Loop back to the start
  }

  loadTrack(currentTrackIndex).then((success) => {
    if (success && isPlaying) {
      playTrack();
    }
  });
}

// Phát bài hát trước đó
function previousTrack() {
  currentTrackIndex--;
  if (currentTrackIndex < 0) {
    currentTrackIndex = playlist.length - 1; // Loop to the end
  }

  loadTrack(currentTrackIndex).then((success) => {
    if (success && isPlaying) {
      playTrack();
    }
  });
}

// Cập nhật thanh tiến trình
function updateProgress() {
  if (!audio.duration) return;

  const percent = (audio.currentTime / audio.duration) * 100;

  // Cập nhật thanh progress
  if (playerUI.progressBar) {
    playerUI.progressBar.style.width = `${percent}%`;
  }

  // Cập nhật thời gian hiện tại
  if (playerUI.currentTimeDisplay) {
    playerUI.currentTimeDisplay.textContent = formatTime(audio.currentTime);
  }
}

// đđịnh dạng thời gian (giây -> mm:ss)
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function showMusicPlayer() {
  const player = document.querySelector(".music-player");
  if (player && player.classList.contains("hidden")) {
    player.classList.remove("hidden");
  }
}

window.loadAndPlayTrack = loadAndPlayTrack;

export {
  initPlayer,
  loadAndPlayTrack,
  togglePlayPause,
  playTrack,
  pauseTrack,
  nextTrack,
  previousTrack,
};
