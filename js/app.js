// entry point
import { initPlayer, loadAndPlayTrack } from "./player.js";
import { loadPlaylistFromSupabase, initPlaylist } from "./playlist.js";
import supabase from "./supabase.js";

let favorites = [];
let regularPlaylist = [];

const toastStyle = document.createElement("style");
toastStyle.textContent = `
  .toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
  }
  .toast {
    background-color: rgba(23, 24, 23, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    margin-top: 10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    animation: fadeInOut 3s forwards;
    font-size: 14px;
  }
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(20px); }
    10% { opacity: 1; transform: translateY(0); }
    80% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
  }
`;
document.head.appendChild(toastStyle);

document.addEventListener("DOMContentLoaded", async function () {
  // Load favorites from localStorage
  const storedFavorites = localStorage.getItem("musicAppFavorites");
  favorites = storedFavorites ? JSON.parse(storedFavorites) : [];

  // Expose functions to window
  window.isFavorite = (songId) => favorites.includes(songId);
  window.toggleFavorite = toggleFavorite;
  window.updateFavoritesInSidebar = updateFavoritesInSidebar;
  window.isInPlaylist = (songId) => regularPlaylist.includes(songId);
  window.addToPlaylist = addToPlaylist;
  window.removeFromPlaylist = removeFromPlaylist;
  window.playEntirePlaylist = playEntirePlaylist;
  window.updateRegularPlaylistUI = updateRegularPlaylistUI;
  window.downloadSong = downloadSong;

  // Initialize player and load songs
  initPlayer();
  const songs = await loadPlaylistFromSupabase();
  initPlaylist(songs);
  displayFeaturedSongs(songs);
  displayFavoriteSongs();

  // Highlight favorites link
  const favoriteLink = document.querySelector(".favorite-link");
  if (favoriteLink) {
    favoriteLink.classList.add("active");
    favoriteLink.addEventListener("click", displayFavoriteSongs);
  }

  // Setup playlist link
  const playlistLink = document.querySelector(".playlist-link");
  if (playlistLink) {
    playlistLink.addEventListener("click", displayRegularPlaylist);
  }

  // Handle favorite changes
  document.addEventListener("favoriteChanged", (event) => {
    const { songId, isFavorite } = event.detail;
    document
      .querySelectorAll(`.favorite-btn[data-id="${songId}"]`)
      .forEach((btn) => btn.classList.toggle("active", isFavorite));
    document
      .querySelectorAll(`.player-favorite-btn[data-id="${songId}"]`)
      .forEach((btn) => btn.classList.toggle("active", isFavorite));
  });

  // Handle playlist changes
  document.addEventListener("playlistChanged", (event) => {
    const { songId, isInPlaylist } = event.detail;
    document
      .querySelectorAll(`.add-to-playlist-btn[data-id="${songId}"]`)
      .forEach((btn) => {
        btn.classList.toggle("active", isInPlaylist);
        btn.setAttribute(
          "title",
          isInPlaylist ? "Xóa khỏi danh sách phát" : "Thêm vào danh sách phát"
        );
      });
  });

  // Setup navigation
  const loginBtn = document.querySelector(".btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", function () {
      //window.location.href = "login.html";
    });
  }

  const navItems = document.querySelectorAll(".main-navigation li");
  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      const text = this.textContent.trim();
      if (text === "Trang chủ") {
        window.location.href = "index.html";
      } else if (text === "Tải nhạc lên") {
        window.location.href = "upload.html";
      }
    });
  });
});

async function displayFeaturedSongs(songs, title = "Danh sách bài hát") {
  const featuredDiv = document.querySelector(".featured");
  if (!featuredDiv) return;

  if (!songs || songs.length === 0) {
    featuredDiv.innerHTML = `
      <h2>${title}</h2>
      <p>Chưa có bài hát nào. Hãy tải nhạc lên để bắt đầu!</p>
    `;
    return;
  }

  featuredDiv.innerHTML = `
    <h2>${title}</h2>
    <div class="song-grid" id="song-grid"></div>
  `;

  const songGrid = document.getElementById("song-grid");

  // Create song cards
  songs.forEach((song, index) => {
    const isFav = favorites.includes(song.id);
    const songElement = document.createElement("div");
    songElement.className = "song-card";
    songElement.innerHTML = `
      <div class="song-image">
        <button class="favorite-btn ${isFav ? "active" : ""}" data-id="${
      song.id
    }">❤</button>
        <button class="add-to-playlist-btn ${
          regularPlaylist.includes(song.id) ? "active" : ""
        }" data-id="${song.id}" title="${
      regularPlaylist.includes(song.id)
        ? "Xóa khỏi danh sách phát"
        : "Thêm vào danh sách phát"
    }">
          <span class="add-icon ${
            regularPlaylist.includes(song.id) ? "hidden" : ""
          }">+</span>
          <span class="check-icon ${
            !regularPlaylist.includes(song.id) ? "hidden" : ""
          }">✓</span>
        </button>
        <div class="song-icon">♪</div>
        <div class="song-overlay">
          <button class="play-btn" data-index="${index}">▶</button>
        </div>
      </div>
      <div class="song-details">
        <h3>${song.title}</h3>
        <p>${song.artist}</p>
      </div>
    `;

    songGrid.appendChild(songElement);

    // Setup play button
    const playBtn = songElement.querySelector(".play-btn");
    playBtn.addEventListener("click", () => {
      const sidebarTitle = document.querySelector(".playlist-sidebar h3");
      if (sidebarTitle) {
        sidebarTitle.textContent = `Bài hát hiện tại`;
      }

      const originalPlaylist = window.playlist;
      window.playlist = [song];
      loadAndPlayTrack(0);
      window.playlist = originalPlaylist;
      showToast(`Đang phát: ${song.title}`);
    });

    // Setup favorite button
    const favBtn = songElement.querySelector(".favorite-btn");
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const songId = favBtn.dataset.id;
      const isNowFavorite = toggleFavorite(songId);
      favBtn.classList.toggle("active", isNowFavorite);
    });

    // Setup add to playlist button
    const addToPlaylistBtn = songElement.querySelector(".add-to-playlist-btn");
    addToPlaylistBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const songId = addToPlaylistBtn.dataset.id;
      const isNowInPlaylist = togglePlaylist(songId);
      addToPlaylistBtn.classList.toggle("active", isNowInPlaylist);

      const addIcon = addToPlaylistBtn.querySelector(".add-icon");
      const checkIcon = addToPlaylistBtn.querySelector(".check-icon");

      if (addIcon && checkIcon) {
        addIcon.classList.toggle("hidden", isNowInPlaylist);
        checkIcon.classList.toggle("hidden", !isNowInPlaylist);
      }

      const message = isNowInPlaylist
        ? `Đã thêm "${song.title}" vào danh sách phát`
        : `Đã xóa "${song.title}" khỏi danh sách phát`;

      showToast(message);
    });
  });
}

function showToast(message) {
  let toastContainer = document.querySelector(".toast-container");

  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

function toggleFavorite(songId) {
  const index = favorites.indexOf(songId);

  if (index === -1) {
    favorites.push(songId);
  } else {
    favorites.splice(index, 1);
  }

  localStorage.setItem("musicAppFavorites", JSON.stringify(favorites));

  document.dispatchEvent(
    new CustomEvent("favoriteChanged", {
      detail: { songId, isFavorite: favorites.includes(songId) },
    })
  );

  return favorites.includes(songId);
}

async function updateFavoritesInSidebar() {
  const allSongs = await loadPlaylistFromSupabase();
  const favoriteSongs = allSongs.filter((song) => favorites.includes(song.id));

  // Update sidebar title with play button
  const sidebarTitle = document.querySelector(".playlist-sidebar h3");
  if (sidebarTitle) {
    // Remove old play button if exists
    const oldPlayBtn = document.querySelector(".play-all-btn");
    if (oldPlayBtn) oldPlayBtn.remove();

    sidebarTitle.innerHTML = "";

    sidebarTitle.appendChild(document.createTextNode(` Mục yêu thích`));
  }

  // Update playlist items
  const playlistElement = document.querySelector(".playlist");
  if (!playlistElement) return;

  playlistElement.innerHTML = "";

  if (favoriteSongs.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Chưa có bài hát yêu thích";
    playlistElement.appendChild(emptyItem);
    return;
  }

  // Add song items
  favoriteSongs.forEach((song) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="song-info">
        <span class="song-title">${song.title}</span>
        <span class="artist">${song.artist}</span>
      </div>
      <span class="duration">${song.duration || "0:00"}</span>
    `;

    li.addEventListener("click", () => {
      const fullIndex = allSongs.findIndex((s) => s.id === song.id);
      if (fullIndex !== -1) {
        window.playlist = allSongs;
        loadAndPlayTrack(fullIndex);
      }
    });

    playlistElement.appendChild(li);
  });
}

function displayFavoriteSongs() {
  updateFavoritesInSidebar();
}

async function downloadSong(songId, filePath, songTitle = "song") {
  const { data, error } = await supabase.storage
    .from("music-files")
    .createSignedUrl(filePath, 3600);

  if (error) {
    alert(`Không thể tải xuống bài hát: ${error.message}`);
    return false;
  }

  try {
    const response = await fetch(data.signedUrl);
    if (!response.ok) throw new Error("Không thể tải file");

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");
    downloadLink.href = blobUrl;
    downloadLink.download = `${songTitle || "music-download"}.mp3`;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();

    return true;
  } catch (error) {
    alert("Không thể tải xuống bài hát. Vui lòng thử lại sau.");
    return false;
  }
}

function addToPlaylist(songId) {
  if (!regularPlaylist.includes(songId)) {
    regularPlaylist.push(songId);
    return true;
  }
  return false;
}

function removeFromPlaylist(songId) {
  const index = regularPlaylist.indexOf(songId);
  if (index !== -1) {
    regularPlaylist.splice(index, 1);
    return true;
  }
  return false;
}

function togglePlaylist(songId) {
  if (regularPlaylist.includes(songId)) {
    removeFromPlaylist(songId);
    return false;
  } else {
    addToPlaylist(songId);
    return true;
  }
}

async function playEntirePlaylist(startIndex = 0) {
  if (regularPlaylist.length === 0) {
    alert("Danh sách phát trống. Hãy thêm bài hát trước!");
    return;
  }

  const allSongs = await loadPlaylistFromSupabase();
  const playlistSongs = allSongs.filter((song) =>
    regularPlaylist.includes(song.id)
  );

  if (playlistSongs.length === 0) {
    alert("Không tìm thấy bài hát nào trong danh sách phát");
    return;
  }

  window.playlist = playlistSongs;
  loadAndPlayTrack(Math.min(startIndex, playlistSongs.length - 1));
  showToast(`Đang phát danh sách (${playlistSongs.length} bài hát)`);
}

async function updateRegularPlaylistUI() {
  const allSongs = await loadPlaylistFromSupabase();
  const playlistSongs = allSongs.filter((song) =>
    regularPlaylist.includes(song.id)
  );

  // Update sidebar title
  const sidebarTitle = document.querySelector(".playlist-sidebar h3");
  if (sidebarTitle) {
    sidebarTitle.textContent = `Danh sách thường`;
  }

  // Update playlist items
  const playlistElement = document.querySelector(".playlist");
  if (!playlistElement) return;

  playlistElement.innerHTML = "";

  if (playlistSongs.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Danh sách phát trống";
    playlistElement.appendChild(emptyItem);

    const playAllBtn = document.querySelector(".play-all-btn");
    if (playAllBtn) playAllBtn.style.display = "none";
    return;
  }

  // Add song items
  playlistSongs.forEach((song, index) => {
    const li = document.createElement("li");
    li.dataset.index = index;
    li.innerHTML = `
      <div class="song-info">
        <span class="song-title">${song.title}</span>
        <span class="artist">${song.artist}</span>
      </div>
      <div class="playlist-item-actions">
        <span class="duration">${song.duration || "0:00"}</span>
      </div>
    `;

    playlistElement.appendChild(li);
  });
}

function displayRegularPlaylist() {
  updateRegularPlaylistUI();
}

window.downloadSong = downloadSong;
