// Local hardening additions. No network access and no secrets in diagnostics.
(function(root) {
  'use strict';
  const LIMITS = Object.freeze({ hourlyRequests: 600, dailyRequests: 3000,
    dailyCharacters: 2000000, requestCharacters: 100000, cues: 30000,
    cueCharacters: 8000, trackCharacters: 3000000 });
  function cueMessage(d, videoId, nonce) {
    if (!d || typeof videoId !== 'string' || !videoId || d.videoId !== videoId ||
        !Number.isSafeInteger(d.nonce) || d.nonce !== nonce) return false;
    if (d.type !== 'cues') return true;
    let chars = 0;
    for (const field of ['cues', 'tcues']) {
      const list = d[field];
      if (field === 'tcues' && list == null) continue;
      if (!Array.isArray(list) || list.length > LIMITS.cues) return false;
      for (const c of list) {
        if (!c || typeof c.text !== 'string' || c.text.length > LIMITS.cueCharacters ||
            !Number.isFinite(c.start) || c.start < 0 || c.start > 604800000 ||
            !Number.isFinite(c.dur) || c.dur < 0 || c.dur > 604800000) return false;
        if (c.trans != null && (typeof c.trans !== 'string' || c.trans.length > LIMITS.cueCharacters)) return false;
        chars += c.text.length + (c.trans || '').length;
        if (chars > LIMITS.trackCharacters) return false;
      }
    }
    return true;
  }
  function nextBudget(previous, characters, now) {
    if (!Number.isSafeInteger(characters) || characters < 0 || characters > LIMITS.requestCharacters)
      throw Error('Safety limit: request too large');
    const hour = Math.floor(now / 3600000), day = Math.floor(now / 86400000);
    const p = previous || {};
    const h = p.hour === hour ? Number(p.hourCount) || 0 : 0;
    const n = p.day === day ? Number(p.dayCount) || 0 : 0;
    const c = p.day === day ? Number(p.characters) || 0 : 0;
    if (h >= LIMITS.hourlyRequests || n >= LIMITS.dailyRequests || c + characters > LIMITS.dailyCharacters)
      throw Error('Safety limit reached: translation paused until next quota window');
    return {hour, day, hourCount:h+1, dayCount:n+1, characters:c+characters};
  }
  root.YTDS_SECURITY = {LIMITS, cueMessage, nextBudget};
})(typeof self !== 'undefined' ? self : globalThis);
