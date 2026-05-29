function makeAccentInsensitiveRegex(str) {
  if (!str) return str;
  const map = {
    'a': '[aáäâ]',
    'e': '[eéëê]',
    'i': '[iíïî]',
    'o': '[oóöô]',
    'u': '[uúüû]',
    'n': '[nñ]',
    'c': '[cç]'
  };
  const cleanStr = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let regexStr = '';
  for (const char of cleanStr) {
    if (map[char]) {
      regexStr += map[char];
    } else {
      regexStr += char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
  }
  return new RegExp(regexStr, 'i');
}

module.exports = {
  makeAccentInsensitiveRegex
};
