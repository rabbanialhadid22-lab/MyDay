# MyDay — Panduan Singkat

MyDay adalah aplikasi web yang dipasang di HP seperti aplikasi biasa. Isinya: jadwal harian dengan waktu sholat otomatis, Al-Qur'an per halaman mushaf, keuangan sederhana, serta kebiasaan, dzikir, dan doa harian.

## 1. Unggah ke internet (sekali saja, gratis)

Aplikasi harus dibuka lewat alamat `https://` agar bisa dipasang dan notifikasinya berfungsi.

**GitHub Pages (disarankan):**
1. Ekstrak `myday.zip`, buka foldernya sampai `index.html`, `style.css`, dan `app.js` terlihat berdampingan.
2. Di github.com buat repositori **Public**, lalu **uploading an existing file**. Seret **semua file di dalam folder** (bukan foldernya) dan **Commit changes**.
3. **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
4. Tunggu 1-2 menit. Alamatnya `https://NAMA-GITHUB.github.io/NAMA-REPO/`.

**Memperbarui versi yang sudah terunggah:** di repositori, **Add file → Upload files**, seret semua file dari versi baru (nama yang sama akan menggantikan yang lama), lalu **Commit changes**. Tunggu 1-2 menit, tutup MyDay di HP, lalu buka lagi.

Alternatif: Netlify Drop (app.netlify.com/drop, seret folder) atau Cloudflare Pages.

## 2. Pasang di HP Android

1. Buka alamat tadi di **Chrome**.
2. Ketuk menu ⋮ → **Instal aplikasi** (atau **Tambahkan ke layar utama**).
3. Buka MyDay dari layar utama.
4. Masuk ke **Lainnya → Pengaturan → Notifikasi → Aktifkan**, lalu pilih **Izinkan**.
5. Pilih kota di **Pengaturan → Waktu sholat** (bawaan: Medan).

Di Android, matikan penghematan baterai untuk Chrome/MyDay agar tidak dihentikan di latar belakang.

## 3. Soal notifikasi (penting)

Aplikasi web tidak bisa membunyikan notifikasi terjadwal setelah benar-benar tertutup.

| Situasi | Yang terjadi |
|---|---|
| MyDay terbuka atau masih berjalan di latar belakang | Notifikasi muncul tepat waktu: sholat, jadwal, baca Al-Qur'an, kebiasaan, puasa sunnah. |
| MyDay sudah ditutup | Notifikasi dari MyDay tidak dijamin muncul. |

Untuk pengingat saat aplikasi tertutup, kirim jadwal ke Google Kalender (bagian 4). Aplikasi Google Kalender di HP yang akan membunyikannya.

## 4. Kirim ke Google Kalender (tanpa setup rumit)

1. Ketuk **Kalender** di pojok kanan atas (atau **Lainnya → Kirim ke Google Kalender**).
2. Pilih isi (jadwal saya, waktu sholat) dan lama hari, lalu ketuk **Unduh file kalender**.
3. Buka file `myday-jadwal.ics` yang terunduh, lalu pilih **Google Kalender** untuk menambahkannya.
4. Di Google Kalender, buka pengaturan kalender tersebut dan atur **notifikasi bawaan** agar pengingatnya berbunyi. Pengingat di dalam file belum bisa saya pastikan ikut terbawa saat impor.

Mengunduh ulang file di kemudian hari memakai ID acara yang tetap, jadi biasanya memperbarui acara yang sama dan tidak menggandakan. Untuk satu jadwal saja, ketuk jadwalnya lalu pilih **Tambah ke Google Kalender**.

## 5. Fitur

- **Hari Ini:** sapaan, sholat berikutnya dengan hitung mundur, dan satu daftar jadwal yang memuat lima waktu sholat otomatis beserta kegiatan Anda. Centang untuk menandai selesai.
- **Al-Qur'an:** per halaman mushaf (604 halaman), terjemahan Indonesia bisa disembunyikan, ukuran huruf bisa diubah, dan ada daftar surah dan juz. Ketuk **Selesai halaman ini** untuk mencatat bacaan harian dan lanjut.
- **Keuangan:** pemasukan, pengeluaran, selisih bulan ini, dan anggaran bulanan dengan sisa.
- **Lainnya:** kebiasaan harian dengan rangkaian hari beruntun, dzikir, doa harian, pengaturan, dan cadangan data.
- **Dzikir:** tiga tab. **Pagi** (13 bacaan) dan **Petang** (14 bacaan) memuat Ayat Kursi, Al-Ikhlas, Al-Falaq, An-Nas, dzikir memasuki pagi atau petang, Sayyidul Istighfar, dan lainnya, masing-masing dengan penghitung sesuai jumlah bacaannya. Tab **Setelah sholat** berisi tasbih, tahmid, takbir, dan dzikir umum. Hitungan tersimpan per hari dan terpisah antara pagi dan petang.
- **Puasa sunnah:** Senin, Kamis, Ayyamul Bidh (13-15 hijriah), Arafah, Tasu'a dan Asyura. Pengingat muncul malam sebelumnya. Hari Ramadhan, Idul Fitri, dan Idul Adha serta hari Tasyrik tidak disarankan puasa sunnah.

## 6. Data Anda

Semua data tersimpan di HP (penyimpanan browser), tanpa server.
- Data di satu HP tidak otomatis muncul di HP lain.
- Menghapus data situs atau browser akan menghapus data MyDay.
- Gunakan **Pengaturan → Unduh cadangan** secara rutin, dan **Pulihkan** untuk mengembalikannya.

## 7. Yang sudah dan belum diuji

Sudah diuji di browser sungguhan dengan tampilan layar HP, memakai layanan tiruan: semua tab, jadwal sholat masuk ke daftar, tambah jadwal, file kalender (.ics), tautan Google Kalender, Al-Qur'an per halaman dan pencatatan bacaan, keuangan dan anggaran, kebiasaan, dzikir, doa, ganti kota, deteksi puasa sunnah, pembuatan pengingat, dan data bertahan setelah muat ulang.

Belum bisa diuji dari sini: layanan jadwal sholat (Aladhan) dan Al-Qur'an (alquran.cloud) yang asli, notifikasi di HP nyata, dan tampilan di HP nyata. Format data kedua layanan saya ikuti dari pengetahuan tentang API-nya. Jika Al-Qur'an per halaman gagal memuat teks dan terjemahan sekaligus, aplikasi mencoba memuat teks Arab saja. Jika ada yang tidak muncul setelah dipasang, kirim pesan yang tampil dan saya perbaiki.

Teks dzikir pagi dan petang serta doa ditulis dari bacaan yang umum dikenal (rujukan seperti Hisnul Muslim). Jumlah pengulangan mengikuti yang masyhur. Mohon periksa kembali dengan sumber yang Anda percaya.

## Mengubah tampilan

- Warna: bagian `:root` di `style.css` (teal `--primary`, amber `--accent`).
- Kebiasaan bawaan: bagian `DEFAULT_HABITS` di `app.js`, atau ubah langsung dari menu Lainnya → Kebiasaan harian.
