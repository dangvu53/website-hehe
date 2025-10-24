import supabase from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const dropArea = document.getElementById("drop-area");
  const fileInput = document.getElementById("file-upload");
  const uploadBtn = document.getElementById("upload-btn");
  const progressBar = document.getElementById("upload-progress-bar");
  const progressText = document.getElementById("progress-text");
  const uploadProgress = document.querySelector(".upload-progress");
  const uploadContainer = document.querySelector(".upload-container");
  const uploadSuccess = document.querySelector(".upload-success");
  const uploadAnotherBtn = document.getElementById("upload-another");

  const titleInput = document.getElementById("title");
  const artistInput = document.getElementById("artist");

  let selectedAudioFile = null;

  // Handle drag and drop events
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    dropArea.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropArea.classList.add("drag-over");
  }

  function unhighlight() {
    dropArea.classList.remove("drag-over");
  }

  // Handle dropped files
  dropArea.addEventListener("drop", handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0 && files[0].type.startsWith("audio/")) {
      handleFiles(files);
    }
  }

  // Handle file selection via the file input
  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      handleFiles(this.files);
    }
  });

  function handleFiles(files) {
    const file = files[0];

    if (file.type.startsWith("audio/")) {
      selectedAudioFile = file;

      // title
      const filename = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      const parts = filename.split(" - ");

      if (parts.length > 1) {
        artistInput.value = parts[0].trim();
        titleInput.value = parts[1].trim();
      } else {
        titleInput.value = filename;
      }

      // enable upload button
      checkFormValidity();
    }
  }

  // Check if form is valid to enable upload button
  titleInput.addEventListener("input", checkFormValidity);
  artistInput.addEventListener("input", checkFormValidity);

  function checkFormValidity() {
    if (
      selectedAudioFile &&
      titleInput.value.trim() &&
      artistInput.value.trim()
    ) {
      uploadBtn.disabled = false;
    } else {
      uploadBtn.disabled = true;
    }
  }

  // Handle upload button click
  uploadBtn.addEventListener("click", uploadFile);

  async function uploadFile() {
    try {
      // Hiển thị progress
      uploadContainer.classList.add("hidden");
      uploadProgress.classList.remove("hidden");

      // Tạo tên file unique để tránh trùng lặp
      const fileName = `${Date.now()}_${selectedAudioFile.name}`;
      const filePath = `music/${fileName}`;

      // Upload file nhạc lên Supabase Storage
      const { data: fileData, error: uploadError } = await supabase.storage
        .from("music-files")
        .upload(filePath, selectedAudioFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      let duration = "0:00";
      try {
        const audio = new Audio();
        audio.src = URL.createObjectURL(selectedAudioFile);
        await new Promise((resolve) => {
          audio.addEventListener("loadedmetadata", () => {
            if (audio.duration !== Infinity) {
              const mins = Math.floor(audio.duration / 60);
              const secs = Math.floor(audio.duration % 60);
              duration = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
              resolve();
            } else {
              resolve();
            }
          });
        });
      } catch (e) {
        console.warn("Không thể đọc thời lượng file nhạc:", e);
      }

      // Lưu metadata vào database
      const { data: songData, error: dbError } = await supabase
        .from("songs")
        .insert([
          {
            title: titleInput.value,
            artist: artistInput.value,
            file_path: filePath,
            duration: duration,
          },
        ])
        .select();

      if (dbError) throw dbError;

      // thành công
      uploadProgress.classList.add("hidden");
      uploadSuccess.classList.remove("hidden");

      console.log("Song uploaded successfully:", songData);
    } catch (error) {
      // Hiển thị lỗi cho người dùng
      alert(`Upload failed: ${error.message}`);

      // Quay lại form upload
      uploadProgress.classList.add("hidden");
      uploadContainer.classList.remove("hidden");
    }
  }

  // Upload another button
  uploadAnotherBtn.addEventListener("click", () => {
    // Reset form
    fileInput.value = "";
    titleInput.value = "";
    artistInput.value = "";
    selectedAudioFile = null;
    uploadBtn.disabled = true;

    // Show upload form again
    uploadSuccess.classList.add("hidden");
    uploadContainer.classList.remove("hidden");
  });
});
