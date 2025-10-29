/**
 * Validate and clamp volume value between 0 and 1
 * @param {number} volume - Volume value to validate
 * @returns {number} Clamped volume value
 */
const validateVolume = (volume) => {
  if (typeof volume !== 'number' || isNaN(volume)) {
    return 1.0; // Default to full volume for invalid values
  }
  return Math.min(1, Math.max(0, volume));
};

/**
 * Validate audio object structure
 * @param {Object} audio - Audio object to validate
 * @returns {Object} Validated audio object with defaults
 */
const validateAudioObject = (audio) => {
  if (!audio || typeof audio !== 'object') {
    return {
      volume: 1.0,
      isMuted: false
    };
  }
  
  return {
    volume: validateVolume(audio.volume),
    isMuted: Boolean(audio.isMuted)
  };
};

/**
 * Migrate old clip structure to new audio object structure
 * @param {Object} clip - Clip object to migrate
 * @returns {Object} Migrated clip object
 */
const migrateClipAudio = (clip) => {
  if (!clip) return clip;
  
  // If audio object already exists, validate it
  if (clip.audio) {
    return {
      ...clip,
      audio: validateAudioObject(clip.audio)
    };
  }
  
  // Migrate from old structure (audioVolume, isMuted) to new structure
  const { audioVolume, isMuted, ...clipWithoutOldAudio } = clip;
  return {
    ...clipWithoutOldAudio,
    audio: {
      volume: validateVolume(audioVolume),
      isMuted: Boolean(isMuted)
    }
  };
};

module.exports = {
  validateVolume,
  validateAudioObject,
  migrateClipAudio
};
