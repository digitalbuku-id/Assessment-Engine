/**
 * Action Library — per tipe assessment + dimensi.
 * Satu action default per dimensi untuk MVP.
 * Placeholder {score} di-substitusi saat runtime.
 */
module.exports = {
  leadership: {
    communication: {
      action:
        'Mulai praktikkan active listening: dalam 2 minggu ke depan, di setiap meeting tim, paraphrase balik apa yang disampaikan anggota tim sebelum memberi respons.',
      rationale:
        'Communication adalah dimensi terendah ({score}). Meningkatkan kualitas mendengar adalah langkah pertama yang paling fundamental.',
    },
    decisiveness: {
      action:
        'Terapkan decision deadline: untuk setiap keputusan yang kamu tunda, tetapkan batas waktu maksimal 48 jam untuk memutuskan.',
      rationale:
        'Decisiveness adalah dimensi terendah ({score}). Memasang deadline memaksa aksi dan mengurangi analysis paralysis.',
    },
    strategic_thinking: {
      action:
        'Blok 2 jam setiap Jumat pagi untuk strategic deep work — review roadmap tim dan identifikasi 1 inisiatif jangka panjang.',
      rationale:
        'Strategic Thinking adalah dimensi terendah ({score}). Menyediakan waktu khusus secara rutin adalah kunci membangun kebiasaan berpikir strategis.',
    },
    people_development: {
      action:
        'Jadwalkan sesi 1-on-1 mingguan dengan 3 direct report untuk mendiskusikan growth plan mereka. Target: dalam 4 minggu pertama.',
      rationale:
        'People Development adalah dimensi terendah ({score}). Membangun kebiasaan coaching rutin adalah langkah konkret pertama yang bisa langsung dijalankan.',
    },
    execution: {
      action:
        'Gunakan metode \'Eat the Frog\': setiap pagi, kerjakan task paling penting dan paling sulit sebelum jam 10 pagi selama 2 minggu.',
      rationale:
        'Execution adalah dimensi terendah ({score}). Membangun momentum pagi hari secara konsisten memperkuat muscle eksekusi.',
    },
  },
};
