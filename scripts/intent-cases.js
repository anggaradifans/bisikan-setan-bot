// Labelled chats for `npm run eval`. The last entry of each chat is the message
// being checked, written by "andi"; earlier entries are [author, text].
export default [
  // Thinking about buying now.
  { expected: "BELI", chat: ["mau beli keyboard baru nih, worth it gak ya?"] },
  { expected: "BELI", chat: ["guys enaknya beli yang 128 atau 256gb?"] },
  { expected: "BELI", chat: ["ada yang tau beli monitor 27 inch yang bagus dimana?"] },
  { expected: "BELI", chat: [["budi", "MH Wilds lagi diskon 50% di steam tuh"], "wah beli ga ya"] },
  { expected: "BELI", chat: ["lagi kepikiran beli sepatu lari, tapi mahal bgt 2 juta"] },
  { expected: "BELI", chat: ["beli ga nih https://tokopedia.link/abc123"] },
  { expected: "BELI", chat: [["andi", "headphone gw rusak anjir"], "kayaknya harus beli baru deh"] },
  { expected: "BELI", chat: ["akhirnya kepikiran beli kursi gaming, ada rekomendasi?"] },
  { expected: "BELI", chat: ["top up genshin lagi ada bonus, beli welkin ga ya"] },

  // Wants it, but postponing.
  { expected: "TUNDA", chat: ["ntar aja deh belinya pas gajian"] },
  { expected: "TUNDA", chat: ["pengen beli sih tapi nunggu harbolnas aja kali ya"] },
  { expected: "TUNDA", chat: [["budi", "jadi ambil laptop yang kemarin?"], "belum, nanti aja belinya tunggu bonus"] },
  { expected: "TUNDA", chat: ["kayaknya gw tahan dulu deh, bulan depan aja belinya"] },
  { expected: "TUNDA", chat: ["duh pengen banget beli, tapi lagi bokek, nanti dulu deh"] },

  // Past purchases.
  { expected: "TIDAK", chat: ["Pas beli armor up jadi dragonia lord nya, dari yang runner dragonia lord dapet 2 lagi set wing"] },
  { expected: "TIDAK", chat: ["kemarin gw beli kopi di deket kantor, enak banget"] },
  { expected: "TIDAK", chat: ["akhirnya kemaren beli juga tuh keyboard, mantap"] },
  { expected: "TIDAK", chat: [["andi", "gw baru dapet ssd kemarin"], ["budi", "berapa?"], "1.2jt, beli di tokped"] },
  { expected: "TIDAK", chat: ["pembelian tiket konser kemarin ribet banget"] },

  // Inside a game, with game currency.
  { expected: "TIDAK", chat: ["di game ini lu bisa beli potion di toko npc pake gold"] },
  { expected: "TIDAK", chat: [["budi", "udah sampe chapter 5?"], "udah, tadi beli pedang baru di blacksmith pake gold"] },
  { expected: "TIDAK", chat: ["di MH Wilds beli bahan di support desk pake poin aja"] },

  // Someone else's purchase, or advice to others.
  { expected: "TIDAK", chat: ["temen gw baru beli mobil baru"] },
  { expected: "TIDAK", chat: ["siapa yang beli gorengan tadi?"] },
  { expected: "TIDAK", chat: ["jangan beli di toko itu, barangnya palsu"] },

  // Not buying, other meanings, unclear.
  { expected: "TIDAK", chat: ["gw gak jadi beli, udah gak pengen"] },
  { expected: "TIDAK", chat: ["beliau lagi rapat, nanti aja ya"] },
  { expected: "TIDAK", chat: ["kurs beli dolar hari ini berapa ya"] },
  { expected: "TIDAK", chat: ["wkwk beli beli beli"] },
  { expected: "TIDAK", chat: ["beli"] },
  { expected: "TIDAK", chat: [["budi", "anjir lag parah servernya"], ["citra", "iya nih"], "beli server sendiri aja lah wkwk"] },
];
