import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, query, limit } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Load environment variables
dotenv.config();

// Initialize Firebase App via Client JS SDK (using API Key to bypass ADC GCP IAM restrictions)
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
console.log("Firebase Client SDK diinisialisasi sukses untuk Database ID:", firebaseConfig.firestoreDatabaseId);

const app = express();
const PORT = 3000;
const DATABASE_FILE = path.join(process.cwd(), "database.json");

// Increase payload limits for base64 images upload
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Setup lazy loading for Gemini AI
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiInstance;
}

// Ensure database file exists and seed with sample Indonesian data
function readDatabase(): any[] {
  try {
    if (!fs.existsSync(DATABASE_FILE)) {
      const seedData = [
        {
          id: "act-1",
          namaPelaksana: "Ir. Hendry Lesmana, M.Si.",
          jabatan: "Kepala Bidang Infrastruktur Wilayah",
          nip: "197908152005011003",
          judulKegiatan: "Sosialisasi Penyediaan Sarana Air Bersih Kabupaten Pohuwato",
          startDate: "2026-05-24",
          endDate: "2026-05-24",
          startTime: "09:00",
          endTime: "13:00",
          lokasi: "Aula Dinas Pekerjaan Umum, Pancoran, Pohuwato",
          tanggalLapor: "24 Mei 2026",
          regulasi: [
            "Undang-Undang Nomor 17 Tahun 2019 tentang Sumber Daya Air",
            "Peraturan Pemerintah Nomor 122 Tahun 2015 tentang Sistem Penyediaan Air Minum",
            "Peraturan Daerah Kabupaten Pohuwato Nomor 7 Tahun 2021 tentang Infrastruktur Desa Mandiri"
          ],
          resumeOriginal: "Peserta diikuti oleh Dinas A, Dinas B dan Dinas C Se-kabupaten Pohuwato. Acara ini membicarakan masalah air bersih di masing-masing Kabupaten. Bahwa Dinas harus senantiasa berkoordinasi. Sebagai pemateri hadir Kepala Daerah dan Kepala Dinas. Selain Itu Kapolres ikut kasih sambutan.",
          resumeGenerated: "KABUPATEN POHUWATO — Sebagai tindak lanjut koordinasi strategis pemerintahan daerah, Dinas Pekerjaan Umum Kabupaten Pohuwato sukses menyelenggarakan agenda Sosialisasi Penyediaan Sarana Air Bersih Wilayah. Kegiatan komprehensif ini dihadiri secara terpadu oleh jajaran perwakilan instansi sektoral vital, meliputi Dinas A, Dinas B, dan Dinas C se-Kabupaten Pohuwato. Pertemuan ini difokuskan sebagai ruang sinergi guna memetakan serta mengatasi problematika pemenuhan suplai air bersih di masing-masing teritori kelurahan demi mengeskalasi derajat hidup masyarakat.\n\nDalam kesempatannya, Kepala Daerah beserta Kepala Dinas hadir langsung mengemban peran narasumber kunci guna memberikan arahan dan penyuluhan teknis. Disampaikan arahan instruktif mengenai kewajiban dinas kepatuhan regulasi agar senantiasa berkoordinasi intensif di lapangan. Sinergi ini juga diperkuat penuh oleh sambutan hangat dari Kapolres Kabupaten Pohuwato yang menegaskan komitmen pengamanan dan pengawalan infrastruktur vital ini. Dengan terselenggaranya diseminasi ini, diharapkan rencana pembangunan sistem perpipaan air bersih dapat berjalan aman, tertib, dan berkelanjutan.",
          images: [
            `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230d9488"/><circle cx="300" cy="200" r="80" fill="%232563eb" opacity="0.6"/><text x="50%" y="45%" font-family="system-ui" font-weight="bold" font-size="20" fill="white" text-anchor="middle">SOSIALISASI AIR BERSIH</text><text x="50%" y="55%" font-family="system-ui" font-size="14" fill="%23f3f4f6" text-anchor="middle">Dokumentasi Foto Lapangan I - Pancoran</text></svg>`,
            `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230f766e"/><rect x="150" y="100" width="300" height="200" fill="%23dc2626" rx="10" opacity="0.4"/><text x="50%" y="45%" font-family="system-ui" font-weight="bold" font-size="20" fill="white" text-anchor="middle">DISKUSI DINAS SE-KABUPATEN</text><text x="50%" y="55%" font-family="system-ui" font-size="14" fill="%23f3f4f6" text-anchor="middle">Dokumentasi Foto Lapangan II - Sesi Tanya Jawab</text></svg>`
          ],
          status: "Terlapor"
        },
        {
          id: "act-2",
          namaPelaksana: "Ratih Indah Sari, S.E.",
          jabatan: "Penyusun Laporan Keuangan Pariwisata",
          nip: "199405122019032014",
          judulKegiatan: "Rapat Review Pengelolaan Destinasi Wisata Pantai Pohuwato",
          startDate: "2026-05-25",
          endDate: "2026-05-25",
          startTime: "13:30",
          endTime: "16:00",
          lokasi: "Ruang Rapat Utama Bappeda, Gedung Praja, Pohuwato",
          tanggalLapor: "25 Mei 2026",
          regulasi: [
            "Undang-Undang Nomor 10 Tahun 2009 tentang Kepariwisataan",
            "Peraturan Daerah Nomor 3 Tahun 2018 tentang Retribusi Tempat Rekreasi dan Olahraga"
          ],
          resumeOriginal: "Rapat dibuka Kepala Dinas Pariwisata. Membicarakan evaluasi tiket masuk obyek wisata pantai. Retribusi daerah dilaporkan naik 15% dari bulan lalu. Perlu perbaikan rambu petunjuk jalan dan penataan areal parkir. Kapolsek memberikan saran pencegahan pungli liar oleh oknum.",
          resumeGenerated: "KABUPATEN POHUWATO — Dinas Pariwisata berkoordinasi secara taktis menyelenggarakan Rapat Review Pengelolaan Destinasi Wisata Pantai Pohuwato bertempat di Ruang Rapat Utama Bappeda. Kegiatan sinergis ini dibuka secara resmi oleh Kepala Dinas Pariwisata yang mengetengahkan evaluasi berkala mengenai tata laksana tiket masuk obyek wisata dan pengelolaan retribusi lingkungan secara formal.\n\nDalam forum tersebut dilaporkan capaian positif berupa peningkatan retribusi daerah sebesar 15% dibandingkan bulan sebelumnya. Di sisi lain, Bappeda menggarisbawahi urgensi pembenahan fisik rambu navigasi jalan dan tata zonasi lahan parkir agar tertata lebih aman. Pembahasan kian intensif dengan masukan Kapolsek setempat yang menekankan strategi operasional pencegahan pungutan liar (pungli) guna menciptakan kenyamanan bagi wisatawan.",
          images: [
            `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23115e59"/><circle cx="150" cy="150" r="50" fill="%23dc2626" opacity="0.5"/><text x="50%" y="45%" font-family="system-ui" font-weight="bold" font-size="20" fill="white" text-anchor="middle">PEMBAHASAN RETRIBUSI PARIWISATA</text><text x="50%" y="55%" font-family="system-ui" font-size="14" fill="%23f3f4f6" text-anchor="middle">Dokumentasi Rapat I - Kantor Bappeda</text></svg>`,
            `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230f766e"/><line x1="100" y1="200" x2="500" y2="200" stroke="%232563eb" stroke-width="4"/><text x="50%" y="45%" font-family="system-ui" font-weight="bold" font-size="20" fill="white" text-anchor="middle">EVALUASI TATA KELOLA TIKET</text><text x="50%" y="55%" font-family="system-ui" font-size="14" fill="%23f3f4f6" text-anchor="middle">Dokumentasi Rapat II - Paparan Kepala Dinas</text></svg>`
          ],
          status: "Draft"
        }
      ];
      fs.writeFileSync(DATABASE_FILE, JSON.stringify(seedData, null, 2), "utf8");
      return seedData;
    }
    const content = fs.readFileSync(DATABASE_FILE, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Gagal membaca database.json:", err);
    return [];
  }
}

function writeDatabase(data: any[]): void {
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Gagal menulis ke database.json:", err);
  }
}

// Generate fallback journalistic summary if Gemini Key is absent
function createDemoParagraph(judul: string, original: string, pelaksana?: string, jabatan?: string): string {
  const cleanOriginal = original
    .split(/[.\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  
  let joinedPoints = cleanOriginal.join(". Selain itu, dibahas pula ");
  if (joinedPoints) {
    joinedPoints = "terangkum beberapa poin pembahasan utama yaitu " + joinedPoints + ".";
  } else {
    joinedPoints = "pembahasan berjalan lancar dan menghasilkan koordinasi yang sinergis.";
  }

  return `KABUPATEN POHUWATO — Mengenai agenda "${judul}", berikut adalah ringkasan hasil kegiatan secara sederhana dan objektif.\n\nTerkait jalannya kegiatan tersebut, ${joinedPoints} Hasil pembahasan ini diserap sebagai acuan peningkatan pelayanan publik serta koordinasi berkelanjutan di lingkungan kerja Pemerintah Kabupaten Pohuwato.\n\n*(Catatan: Mode Demo Aktif. Pasang GEMINI_API_KEY di panel Secrets untuk hasil jurnalisme kecerdasan buatan berkualitas tinggi).*`;
}

// REST API Endpoints

// GET all activities
app.get("/api/activities", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(firestoreDb, "activities"));
    const data: any[] = [];
    snapshot.forEach((doc) => {
      data.push(doc.data());
    });
    // In case we want reverse chronological order (as unshift originally did)
    // We can sort by id or custom timestamp, or just return them
    // Sort descending by id or custom sorting
    data.sort((a, b) => b.id.localeCompare(a.id));
    res.json(data);
  } catch (err: any) {
    console.error("Gagal mendapatkan data kegiatan dari Firestore:", err);
    res.status(500).json({ error: "Gagal mengunduh daftar kegiatan: " + err.message });
  }
});

// GET single activity
app.get("/api/activities/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const docRef = doc(firestoreDb, "activities", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      res.json(docSnap.data());
    } else {
      res.status(404).json({ error: "Laporan kegiatan tidak ditemukan" });
    }
  } catch (err: any) {
    console.error("Gagal mendapatkan detail kegiatan:", err);
    res.status(500).json({ error: "Error server: " + err.message });
  }
});

// POST to generate AI Summary via Gemini API
app.post("/api/summarize", async (req, res) => {
  const { resumeOriginal, judulKegiatan, namaPelaksana, jabatan } = req.body;
  if (!resumeOriginal) {
    return res.status(400).json({ error: "Isi poin resume original wajib diisi." });
  }

  const client = getGeminiClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Judul Kegiatan: ${judulKegiatan || "Kegiatan Dinas"}\nCatatan Lapangan Terisi:\n${resumeOriginal}`,
        config: {
          systemInstruction:
            "Anda adalah asisten kecerdasan buatan resmi Pemerintah Kabupaten Pohuwato yang mengolah catatan lapangan menjadi ringkasan hasil kegiatan dinas secara sederhana, objektif, dan formal. " +
            "SANGAT PENTING: Ikuti aturan ketat ini: " +
            "1. JANGAN mengulas, membahas, atau menyebutkan keikutsertaan Pelaksana Tugas. " +
            "2. JANGAN pernah menyertakan atau menyebutkan nama personil Pelaksana Tugas, nama pelapor, atau jabatan mereka ke dalam ringkasan. " +
            "3. Hilangkan seluruh kesan atau narasi yang menggambarkan bahwa Pelaksana Tugas aktif berpartisipasi atau mengikuti kegiatan. " +
            "4. Fokuskan hasil ringkasan sepenuhnya pada hasil kegiatan, keputusan rapat, atau poin-poin bahasan inti sesuai dengan Catatan Lapangan Terisi yang diisi oleh user. " +
            "5. Susun hasil ringkasan secara ringkas, sederhana, rapi, dan mengalir bebas dari bullet points (sajikan dalam 1 sampai 2 paragraf pendek menggunakan bahasa Indonesia formal yang baku/PUEBI/KBBI). " +
            "6. JANGAN cantumkan salam pembuka atau penutup seperti 'Berikut ringkasannya', melainkan langsung mulai pada narasi inti kegiatannya.",
          temperature: 0.5,
        },
      });

      const text = response.text;
      if (text) {
        return res.json({ summary: text.trim(), isDemo: false });
      }
    } catch (err: any) {
      console.error("Gemini API error, falling back to local generator:", err);
    }
  }

  // Fallback to beautiful local simulated summary when API key is missing or fails
  const localSummary = createDemoParagraph(judulKegiatan, resumeOriginal, namaPelaksana, jabatan);
  res.json({
    summary: localSummary,
    isDemo: true,
  });
});

// POST create empty/filled activity
app.post("/api/activities", async (req, res) => {
  const {
    id,
    namaPelaksana,
    jabatan,
    nip,
    judulKegiatan,
    startDate,
    endDate,
    startTime,
    endTime,
    lokasi,
    tanggalLapor,
    regulasi,
    resumeOriginal,
    resumeGenerated,
    images,
    status,
  } = req.body;

  // Manual material-like validation
  if (!namaPelaksana || !judulKegiatan || !lokasi || !tanggalLapor) {
    return res.status(400).json({
      error: "Informasi Utama (Nama Pelaksana, Judul Kegiatan, Lokasi & Tanggal Lapor) tidak boleh kosong.",
    });
  }

  const generatedId = id || "act_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const newActivity = {
    id: generatedId,
    namaPelaksana,
    jabatan: jabatan || "Fungsional",
    nip: nip || "-",
    judulKegiatan,
    startDate: startDate || tanggalLapor,
    endDate: endDate || tanggalLapor,
    startTime: startTime || "08:00",
    endTime: endTime || "16:00",
    lokasi,
    tanggalLapor,
    regulasi: regulasi || [],
    resumeOriginal,
    resumeGenerated: resumeGenerated || "",
    images: images || [],
    status: status || "Terlapor",
  };

  try {
    // SECURITY GUARD: Check if this activity ID is in the deleted list of activities.
    // This represents safety against stale browser sessions (like in Edge, other users)
    // resubmitting deleted activities because of old local storage data.
    const deletedRef = doc(firestoreDb, "deleted_activities", generatedId);
    const deletedSnap = await getDoc(deletedRef);
    if (deletedSnap.exists()) {
      console.log(`[Stale Sync Protected] Menolak penyimpanan ulang laporan ${generatedId} karena sudah dihapus sebelumnya oleh Admin.`);
      // Return 201 to keep old clients happy so they don't loop/retry, but don't save to db!
      return res.status(201).json(newActivity);
    }

    const docRef = doc(firestoreDb, "activities", generatedId);
    await setDoc(docRef, newActivity);
    console.log(`Laporan kegiatan ${generatedId} sukses disimpan ke Firestore.`);
    res.status(201).json(newActivity);
  } catch (err: any) {
    console.error("Gagal menyimpan laporan kegiatan ke Firestore:", err);
    res.status(500).json({ error: "Gagal menyimpan kegiatan ke Firestore: " + err.message });
  }
});

// PUT update single activity (supports editing 'namaPelaksana' and 'resumeOriginal' and updating everything)
app.put("/api/activities/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const docRef = doc(firestoreDb, "activities", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Laporan kegiatan tidak ditemukan" });
    }

    const existing = docSnap.data() || {};
    const { namaPelaksana, nip, jabatan, resumeOriginal, resumeGenerated, status, editCount } = req.body;

    // Merge updates
    const updated = {
      ...existing,
      ...req.body, // catch-all for full object update
    };

    // Explicit security: ensure we override with updated fields correctly
    if (namaPelaksana !== undefined) updated.namaPelaksana = namaPelaksana;
    if (nip !== undefined) updated.nip = nip;
    if (jabatan !== undefined) updated.jabatan = jabatan;
    if (resumeOriginal !== undefined) updated.resumeOriginal = resumeOriginal;
    if (resumeGenerated !== undefined) updated.resumeGenerated = resumeGenerated;
    if (status !== undefined) updated.status = status;
    if (editCount !== undefined) updated.editCount = editCount;

    await setDoc(docRef, updated);
    console.log(`Laporan kegiatan ${id} diperbarui otomatis.`);
    res.json(updated);
  } catch (err: any) {
    console.error("Gagal memperbarui laporan kegiatan di Firestore:", err);
    res.status(500).json({ error: "Gagal memperbarui kegiatan di Firestore: " + err.message });
  }
});

// DELETE activity
app.delete("/api/activities/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const docRef = doc(firestoreDb, "activities", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Kegiatan tidak ditemukan" });
    }

    await deleteDoc(docRef);
    console.log(`Laporan kegiatan ${id} dihapus dari Firestore.`);

    // Record the deletion event so other stale client sessions cannot resurrect this item
    try {
      const deletedRef = doc(firestoreDb, "deleted_activities", id);
      await setDoc(deletedRef, {
        id,
        deletedAt: new Date().toISOString(),
      });
      console.log(`ID Kegiatan ${id} berhasil dicatatkan ke daftar terhapus.`);
    } catch (delErr) {
      console.error("Gagal mencatatkan ID kegiatan terhapus ke Firestore:", delErr);
    }

    res.json({ success: true, message: "Laporan kegiatan berhasil dihapus" });
  } catch (err: any) {
    console.error("Gagal menghapus laporan kegiatan dari Firestore:", err);
    res.status(500).json({ error: "Gagal menghapus kegiatan dari Firestore: " + err.message });
  }
});

// Explicit route for robots.txt to prevent fallback to SPA HTML and allow Facebook scrapers
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /

User-agent: facebookexternalhit
Allow: /`);
});


// Move seed and local data to Firestore if Firestore is empty
async function syncDatabaseToFirestore() {
  try {
    const q = query(collection(firestoreDb, "activities"), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("Firestore is empty. Syncing local seed data from database.json to Firestore...");
      const localData = readDatabase();
      if (localData && localData.length > 0) {
        console.log(`Migrating ${localData.length} documents into Firestore...`);
        const batch = writeBatch(firestoreDb);
        for (const act of localData) {
          const docRef = doc(firestoreDb, "activities", act.id);
          batch.set(docRef, act);
        }
        await batch.commit();
        console.log("Migration of local seed data to Firestore was successful.");
      }
    } else {
      console.log("Firestore already initialized under collection 'activities' with active records.");
    }
  } catch (err: any) {
    console.error("Warning: migration to Firestore failed:", err.message || err);
  }
}


// Setup Vite Dev Server / Static files handler
async function startServer() {
  // Sync local data to Firestore first
  await syncDatabaseToFirestore();

  const isProduction =
    process.env.NODE_ENV === "production" ||
    (typeof __filename !== "undefined" && __filename.includes("server.cjs")) ||
    !fs.existsSync(path.resolve(process.cwd(), "server.ts"));

  console.log("Menilai status produksi:", isProduction ? "PRODUKSI (Production)" : "PENGEMBANGAN (Development)");

  if (!isProduction) {
    console.log("Memulai server dalam mode PENGEMBANGAN (Development)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Gunakan middleware Vite untuk menangani file statis & modul TypeScript beserta SPA fallback
    app.use(vite.middlewares);
  } else {
    console.log("Memulai server dalam mode PRODUKSI (Production)...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Sistem Pelaporan Kegiatan berjalan di pelabuhan (port) ${PORT}`);
  });
}

startServer();
