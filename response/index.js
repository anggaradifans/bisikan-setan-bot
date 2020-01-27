export const bisikan = [
  "Mumpung ada, belum tentu ketemu lagi kan",
  "Ya beli lah",
  "Belilah, kan lu sultan",
  "Beli dulu aja, kalo gak suka tinggal jual",
  "Keep khilaf, and nasi kecap",
  "Beli dulu, ntar makannya tinggal nasi kecap aja",
  "Beli lah, tinggal gesek",
  "Udah gajian kan? tunggu apalagi, langsung beli lah",
  "Udah, khilaf aja",
  "Beli lah, mumpung belom gratis--, ehem maksudnya mumpung masih diskon",
  "Pokoknya kalo pilihannya beli atau gak beli, ya beli lah",
  "Iya dong, mumpung barangnya belum habis",
  "Gak usah ditanya lagi",
  "Mending beli lah, daripada nyesel",
  "Lebih baik menyesal beli, daripada menyesal gak beli",
  "Punya duit gak? jangan sok sok beli",
  "Of course lah",
  "Kalo diskon mah ngapain nanya lagi"
];

export const advice = [
  "Why not. You like them",
  "Do not buy something straight after seeing it, even if it seems mandatory to buy for some reasons.",
  "Believe it or not, there are occasions when it is OK to spend money — even on things you want, but don’t necessarily need. It’s not about guilt; it’s about making mindful decisions before parting with the money you have worked so hard to earn.",
  "Do you have an immediate use for this item? If not, you might want to wait until you truly need it and make a plan to save up for it.",
  "Buy it already!",
  "Buying stuff you want isn’t necessarily a bad thing"
];

export const getResponseList = array => {
  let string = "";
  array.forEach(o => (string += o + "\n"));
  return string;
};

export const greeting = person => {
  let time = new Date().getHours();
  if (time < 10) {
    return `Good morning, ${person}`;
  } else if (time < 20) {
    return `Good day, ${person}`;
  } else {
    return `Good evening, ${person}`;
  }
};
