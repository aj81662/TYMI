/* Global browser polyfills that must load before app/vendor scripts. */
(function () {
  try {
    if (!window.crypto) window.crypto = window.msCrypto || {};
    if (typeof window.crypto.randomUUID !== 'function') {
      window.crypto.randomUUID = function () {
        var bytes = (window.crypto.getRandomValues && window.crypto.getRandomValues(new Uint8Array(16))) || new Uint8Array(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        var hex = Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        return hex.substr(0, 8) + '-' + hex.substr(8, 4) + '-' + hex.substr(12, 4) + '-' + hex.substr(16, 4) + '-' + hex.substr(20, 12);
      };
    }
  } catch (e) {
    // no-op
  }
})();
