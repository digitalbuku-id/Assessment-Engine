module.exports = {
  // Threshold band sesuai RD-DISC-001
  thresholds: {
    high: 70,
    low: 40,
  },

  // Release hygiene: Teks deskriptif netral untuk validasi awal (bukan RD-DISC-002 final)
  dimensions: {
    dominance: {
      high: 'Skor Anda menunjukkan kecenderungan yang lebih tinggi pada dimensi Dominance. Individu dengan pola seperti ini sering merasa nyaman mengambil keputusan dan menghadapi tantangan secara langsung.',
      medium: 'Skor Anda menunjukkan keseimbangan pada dimensi Dominance. Anda dapat bersikap tegas saat diperlukan, namun tetap terbuka untuk kolaborasi dan diskusi.',
      low: 'Skor Anda menunjukkan kecenderungan yang lebih rendah pada dimensi Dominance. Anda cenderung lebih mengutamakan harmoni, mendengarkan berbagai perspektif, dan menghindari konflik langsung.'
    },
    influence: {
      high: 'Skor Anda menunjukkan kecenderungan yang lebih tinggi pada dimensi Influence. Anda sering merasa energik dalam interaksi sosial dan nyaman memengaruhi atau menginspirasi orang lain.',
      medium: 'Skor Anda menunjukkan keseimbangan pada dimensi Influence. Anda nyaman berinteraksi dengan orang lain, tetapi juga menghargakan waktu untuk bekerja secara mandiri.',
      low: 'Skor Anda menunjukkan kecenderungan yang lebih rendah pada dimensi Influence. Anda lebih fokus pada substansi tugas dan analisis mendalam daripada menjadi pusat perhatian sosial.'
    },
    steadiness: {
      high: 'Skor Anda menunjukkan kecenderungan yang lebih tinggi pada dimensi Steadiness. Anda menghargai stabilitas, konsistensi, dan sering menjadi pendukung yang dapat diandalkan dalam tim.',
      medium: 'Skor Anda menunjukkan keseimbangan pada dimensi Steadiness. Anda dapat beradaptasi dengan perubahan, namun tetap menghargai rutinitas dan lingkungan yang terprediksi.',
      low: 'Skor Anda menunjukkan kecenderungan yang lebih rendah pada dimensi Steadiness. Anda cenderung dinamis, cepat beradaptasi dengan perubahan, dan menyukai variasi dalam pekerjaan.'
    },
    conscientiousness: {
      high: 'Skor Anda menunjukkan kecenderungan yang lebih tinggi pada dimensi Conscientiousness. Anda berorientasi pada detail, akurasi, dan struktur dalam menyelesaikan pekerjaan.',
      medium: 'Skor Anda menunjukkan keseimbangan pada dimensi Conscientiousness. Anda mampu menjaga standar kualitas, namun tetap fleksibel ketika situasi menuntut penyesuaian cepat.',
      low: 'Skor Anda menunjukkan kecenderungan yang lebih rendah pada dimensi Conscientiousness. Anda lebih mengutamakan hasil besar dan kecepatan, serta nyaman bekerja dengan prosedur yang lebih longgar.'
    }
  },

  // Disclaimer wajib sesuai RD-DISC-001
  normed: false,
  disclaimer: 'Interpretasi ini menggunakan aturan interpretasi internal dan belum didasarkan pada norma populasi Indonesia. Hasil ditujukan sebagai alat refleksi dan pengembangan diri, bukan diagnosis klinis.'
};
