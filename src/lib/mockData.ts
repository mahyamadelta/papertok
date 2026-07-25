/**
 * mockData.ts — Data contoh (mock) untuk ArxivTok
 *
 * File ini berisi 3 paper contoh yang lengkap dengan AI-generated content.
 * Dipakai sebagai FALLBACK saat backend API tidak bisa dijangkau.
 * Dengan data ini, frontend tetap bisa jalan dan ditampilkan
 * meskipun backend mati atau belum diinstall.
 *
 * Setiap paper mengikuti tipe FeedItem yang didefinisikan di src/types/index.ts.
 */

import type { FeedItem } from "@/types";

// ── MOCK_FEED ───────────────────────────────────────────────────────────────
// Array berisi 3 paper contoh dari berbagai kategori.
// Paper ini punya semua field yang dibutuhkan komponen:
// - paper metadata (judul, penulis, abstrak, kategori, dll)
// - ai_processed (ringkasan, hasil utama, fun fact, konsep kunci, diagram, dll)
// - recommendation_score & reason_tags (untuk sorting feed)
export const MOCK_FEED: FeedItem[] = [
  // ── Paper 1: AI / Machine Learning ──────────────────────────────────────────
  {
    paper: {
      id: "mock-001",
      arxiv_id: "2401.12345",
      title: "Diffusion Models for Protein Structure Prediction with Enhanced Sampling",
      authors: ["Alice Chen", "Bob Kumar", "Carol Zhang"],
      institution: "MIT CSAIL",
      abstract:
        "We propose a novel diffusion-based framework for protein structure prediction that leverages enhanced sampling techniques to explore the conformational landscape more efficiently. Our approach combines denoising diffusion probabilistic models (DDPMs) with physics-informed priors, achieving state-of-the-art results on CASP15 benchmarks. The model generates diverse structural ensembles that capture both native conformations and biologically relevant alternative states. We demonstrate that our method outperforms existing AlphaFold2 variants in predicting disordered regions and multi-domain protein assemblies.",
      categories: ["AI", "Biology"],
      published_at: "2024-01-15T00:00:00Z",
      url: "https://arxiv.org/abs/2401.12345",
      pdf_url: "https://arxiv.org/pdf/2401.12345",
      journal_source: "arXiv",
      image_url: null,
      ai_processed: {
        inti_penelitian:
          "Penelitian ini mengembangkan model diffusion baru yang bisa memprediksi struktur protein dengan lebih akurat, terutama untuk wilayah yang tidak teratur (disordered regions) dan protein multi-domain.",
        hasil_utama: [
          "Mengalahkan AlphaFold2 di benchmark CASP15 untuk prediksi region tidak teratur",
          "Menghasilkan ensemble struktur protein yang lebih beragam dan biologis relevan",
          "Waktu inferensi 3x lebih cepat dibanding metode sampling sebelumnya",
        ],
        fun_fact:
          "🧬 Model ini bisa memprediksi struktur protein yang 'bergoyang' — sesuatu yang AlphaFold2 tidak bisa lakukan! Protein tidak selalu statis, mereka bergerak terus-menerus di dalam tubuh kita.",
        konsep_kunci: [
          {
            term: "Diffusion Model",
            definition:
              "Model AI yang belajar menghasilkan data dengan cara perlahan menghapus noise (gangguan) dari data acak, seperti melihat kabut yang perlahan menghilang.",
          },
          {
            term: "Protein Structure",
            definition:
              "Bentuk 3D dari protein yang menentukan fungsinya di dalam tubuh. Seperti kunci yang harus pas dengan gemboknya.",
          },
          {
            term: "CASP Benchmark",
            definition:
              "Kompetisi dunia (Olimpiade-nya AI protein) untuk menguji siapa yang paling akurat memprediksi struktur protein.",
          },
        ],
        diagram: [
          {
            label: "Sequence Input",
            sublabel: "Asam Amino",
            description: "Urutan asam amino protein dimasukkan ke model",
            position: "input",
          },
          {
            label: "Diffusion Sampling",
            sublabel: "Multi-Step Denoise",
            description:
              "Model secara bertahap menghilangkan noise untuk membentuk struktur 3D",
            position: "process",
          },
          {
            label: "3D Structure",
            sublabel: "Ensemble Output",
            description:
              "Hasil: struktur protein 3D lengkap dengan prediksi tingkat kepercayaan",
            position: "output",
          },
        ],
        ringkasan_panjang:
          "Penelitian ini memperkenalkan pendekatan baru dalam prediksi struktur protein menggunakan model diffusion. Berbeda dengan AlphaFold2 yang menghasilkan satu struktur statis, metode ini menghasilkan ensemble (kumpulan) struktur yang merepresentasikan kemungkinan bentuk protein yang berbeda-beda. Ini penting karena protein di alam tidak selalu dalam satu bentuk kaku — mereka bergerak dan berubah konformasi terus-menerus. Dengan menggabungkan denoising diffusion probabilistic models (DDPM) dengan prior berbasis fisika, model ini tidak hanya lebih akurat untuk wilayah yang tidak teratur, tetapi juga 3x lebih cepat dari metode sampling sebelumnya.",
        insight_personal:
          "Paper ini relevan kalau kamu tertarik AI untuk biologi — bidang yang sedang BOOM sejak AlphaFold.",
        tags: ["protein", "diffusion", "structural-biology", "CASP"],
      },
    },
    recommendation_score: 0.92,
    reason_tags: ["AI", "Biology", "🆕 New"],
  },

  // ── Paper 2: Fisika / Quantum ──────────────────────────────────────────────
  {
    paper: {
      id: "mock-002",
      arxiv_id: "2402.67890",
      title: "Quantum Error Correction Beyond the Break-Even Point with Surface Codes",
      authors: ["David Müller", "Elena Rossi", "Feng Wang"],
      institution: "Google Quantum AI",
      abstract:
        "We demonstrate quantum error correction that extends the lifetime of quantum information beyond the break-even point using a distance-5 surface code on a superconducting quantum processor. Our experiment achieves a logical error rate that is lower than the physical error rate of the constituent qubits, a milestone that has been pursued for over two decades. The logical qubit maintains coherence for 2.5 times longer than the best physical qubit on the same chip, demonstrating that error correction can truly add value in near-term devices.",
      categories: ["Physics", "CS"],
      published_at: "2024-02-20T00:00:00Z",
      url: "https://arxiv.org/abs/2402.67890",
      pdf_url: "https://arxiv.org/pdf/2402.67890",
      journal_source: "arXiv",
      image_url: null,
      ai_processed: {
        inti_penelitian:
          "Tim Google Quantum AI berhasil memperbaiki error pada komputer kuantum melewati titik 'break-even' — artinya komputer kuantum mereka bertahan LEBIH LAMA berkat koreksi error dibanding tanpa koreksi.",
        hasil_utama: [
          "Lifetime qubit logikal 2.5x lebih lama dari qubit fisik terbaik di chip yang sama",
          "Milestone yang sudah dikejar selama lebih dari 20 tahun akhirnya tercapai",
          "Membuka jalan menuju komputer kuantum yang praktis untuk masalah nyata",
        ],
        fun_fact:
          "⚛️ Ini seperti punya hard drive yang selalu korupt data, tapi kita bikin sistem backup yang malah membuat data bertahan LEBIH LAMA — bukan cuma tetap sama! Ini revolusioner untuk dunia komputasi kuantum.",
        konsep_kunci: [
          {
            term: "Quantum Error Correction",
            definition:
              "Teknik untuk melindungi informasi kuantum dari error yang terjadi secara alami, seperti ECC di komputer biasa tapi versi kuantum yang jauh lebih sulit.",
          },
          {
            term: "Surface Code",
            definition:
              "Jenis error correction code yang menempatkan qubit fisik di pola 2D seperti papan catur, membuatnya lebih mudah diimplementasikan di chip nyata.",
          },
          {
            term: "Break-Even Point",
            definition:
              "Titik dimana koreksi error mulai benar-benar membantu — qubit logikal bertahan lebih lama dari qubit fisik individualnya.",
          },
        ],
        diagram: [
          {
            label: "Noisy Qubits",
            sublabel: "Data Masuk",
            description: "Informasi kuantum dimasukkan ke qubit yang rentan error",
            position: "input",
          },
          {
            label: "Surface Code",
            sublabel: "Error Correction",
            description:
              "Kode surface memperbaiki error tanpa mengukur informasi kuantum itu sendiri",
            position: "process",
          },
          {
            label: "Stable Logical Qubit",
            sublabel: "Data Keluar",
            description:
              "Qubit logikal yang bertahan 2.5x lebih lama dari qubit fisik terbaik",
            position: "output",
          },
        ],
        ringkasan_panjang:
          "Eksperimen ini merupakan terobosan besar dalam komputasi kuantum. Selama puluhan tahun, para ilmuwan berusaha membuktikan bahwa koreksi error kuantum benar-benar bisa bekerja di dunia nyata — bukan hanya di teori. Google Quantum AI berhasil melakukannya dengan surface code distance-5 pada prosesor superkonduktor mereka. Hasilnya: qubit logikal (yang dilindungi oleh error correction) bertahan 2.5x lebih lama dari qubit fisik terbaik di chip yang sama. Ini berarti kita sudah melewati 'break-even point' dan koreksi error kuantum benar-benar menghasilkan nilai tambah.",
        insight_personal:
          "Paper ini SEBUAH BUKTI bahwa komputer kuantum praktis bukan lagi mimpi — ini milestone yang sangat penting.",
        tags: ["quantum", "error-correction", "surface-code", "google"],
      },
    },
    recommendation_score: 0.87,
    reason_tags: ["Physics", "CS"],
  },

  // ── Paper 3: Ekonomi / Data Science ───────────────────────────────────────
  {
    paper: {
      id: "mock-003",
      arxiv_id: "2403.11111",
      title: "Large Language Models as Economic Forecasters: Evidence from Central Bank Communications",
      authors: ["Maria Garcia", "James Park", "Sofia Andersson"],
      institution: "Stanford University",
      abstract:
        "We investigate whether large language models (LLMs) can serve as effective economic forecasters by analyzing central bank communications. Using GPT-4 and Llama-2, we process thousands of Federal Reserve statements, minutes, and press conferences to predict monetary policy decisions. Our models achieve 78% accuracy in predicting rate decisions, outperforming traditional econometric models by 12 percentage points. We find that LLMs capture nuanced hawkish-dovish signals that traditional sentiment analysis methods miss.",
      categories: ["Economics", "AI"],
      published_at: "2024-03-05T00:00:00Z",
      url: "https://arxiv.org/abs/2403.11111",
      pdf_url: "https://arxiv.org/pdf/2403.11111",
      journal_source: "arXiv",
      image_url: null,
      ai_processed: {
        inti_penelitian:
          "ChatGPT ternyata bisa memprediksi keputusan suku bunga bank sentral dengan akurasi 78% — mengalahkan model ekonomi tradisional. AI membaca 'antara baris' komunikasi The Fed untuk menangkap sinyal hawkish vs dovish.",
        hasil_utama: [
          "Akurasi 78% dalam memprediksi keputusan suku bunga Federal Reserve",
          "Mengalahkan model ekonometri tradisional sebesar 12 poin persentase",
          "Menangkap nuansa bahasa 'hawkish-dovish' yang terlewat oleh metode analisis sentimen biasa",
        ],
        fun_fact:
          "💰 AI sekarang bisa 'menebak' apa yang akan dilakukan bank sentral SEBELUM pengumuman resmi. Ini bisa mengubah cara trader dan investor mengambil keputusan — dan ini semua berkat kemampuan AI membaca 'budaya' bahasa diplomatik The Fed!",
        konsep_kunci: [
          {
            term: "Hawkish vs Dovish",
            definition:
              "Hawkish = ingin naikkan suku bunga (anti-inflasi). Dovish = ingin turunkan suku bunga (pro-pertumbuhan). Bahasa diplomatik The Fed penuh sinyal halus ini.",
          },
          {
            term: "Econometric Model",
            definition:
              "Model matematika tradisional yang dipakai ekonom untuk memprediksi ekonomi berdasarkan data angka (inflasi, GDP, dll).",
          },
          {
            term: "Sentiment Analysis",
            definition:
              "Teknik NLP untuk menentukan apakah sebuah teks bernada positif, negatif, atau netral.",
          },
        ],
        diagram: [
          {
            label: "Fed Documents",
            sublabel: "Statements & Minutes",
            description:
              "Ribuan dokumen komunikasi Federal Reserve dimasukkan ke model",
            position: "input",
          },
          {
            label: "LLM Analysis",
            sublabel: "GPT-4 Processing",
            description:
              "AI menganalisis nuansa bahasa untuk menangkap sinyal hawkish-dovish",
            position: "process",
          },
          {
            label: "Rate Prediction",
            sublabel: "78% Accuracy",
            description:
              "Prediksi keputusan suku bunga dengan akurasi lebih tinggi dari model tradisional",
            position: "output",
          },
        ],
        ringkasan_panjang:
          "Penelitian ini mengeksplorasi kemampuan Large Language Models (GPT-4 dan Llama-2) dalam memprediksi keputusan kebijakan moneter Federal Reserve. Dengan menganalisis ribuan dokumen komunikasi The Fed — termasuk pernyataan, notulasi rapat, dan konferensi pers — model AI mencapai akurasi 78% dalam memprediksi apakah suku bunga akan naik, turun, atau tetap. Ini 12 poin persentase lebih baik dari model ekonometri tradisional. Temuan kunci: LLM bisa menangkap sinyal halus dalam bahasa diplomatik The Fed yang tidak terdeteksi oleh metode analisis sentimen konvensional.",
        insight_personal:
          "Kalau kamu tertarik Finance + AI, paper ini menunjukkan betapa powerful-nya LLM untuk tugas yang dulu hanya bisa dilakukan ekonom profesional.",
        tags: ["economics", "LLM", "forecasting", "Federal-Reserve", "finance"],
      },
    },
    recommendation_score: 0.83,
    reason_tags: ["Economics", "AI"],
  },
];
