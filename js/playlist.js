import supabase from "./supabase.js";

async function loadPlaylistFromSupabase() {
  try {
    console.log("Đang tải danh sách bài hát từ Supabase...");

    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log("Đã tải xong danh sách bài hát:", data?.length || 0, "bài");
    return data || [];
  } catch (error) {
    console.error("Lỗi khi tải danh sách bài hát:", error);
    return [];
  }
}

function initPlaylist(songs) {
  if (songs) {
    window.playlist = songs;
    return songs;
  }

  return loadPlaylistFromSupabase().then((data) => {
    window.playlist = data;
    return data;
  });
}

async function getSongPlayUrl(filePath) {
  try {
    if (filePath.startsWith("assets/")) {
      return filePath;
    }

    // Lấy URL từ Supabase Storage
    const { data, error } = await supabase.storage
      .from("music-files")
      .createSignedUrl(filePath, 3600); // URL hết hạn sau 1 giờ

    if (error) throw error;

    return data.signedUrl;
  } catch (error) {
    console.error("Lỗi khi lấy URL phát nhạc:", error);
    throw error;
  }
}

export { loadPlaylistFromSupabase, getSongPlayUrl, initPlaylist };
