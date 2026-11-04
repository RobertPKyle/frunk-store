// Sound for Neverputt: the page's half of the engine's share/audio_emscripten.c,
// which calls window.Neverball from C. These functions are from Neverball's
// js/index.html, unchanged except for what's around them:
//
// Copyright (C) 2020-2025 Jānis Rūcis and Neverball contributors.
// Neverball is free software; you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License, or (at your option)
// any later version. It comes with no warranty. See engine/COPYING.

window.Neverball = {
  audioContext: null,

  /** @type {GainNode?} */
  audioSoundSink: null,

  /** @type {GainNode?} */
  audioMusicSink: null,

  /** @type {string?} */
  audioMusicFile: null,

  /** @type {AudioBufferSourceNode?} */
  audioMusicSourceNode: null,

  /** @type {GainNode?} */
  audioMusicGainNode: null,

  audioMusicTrack: null,

  audioInit: function () {
    this.audioContext = new AudioContext({
      sampleRate: 44100.0
    });

    this.audioSoundSink = new GainNode(this.audioContext);
    this.audioMusicSink = new GainNode(this.audioContext);

    this.audioSoundSink.connect(this.audioContext.destination);
    this.audioMusicSink.connect(this.audioContext.destination);

    this.audioCanPlayOgg = (new Audio()).canPlayType('audio/ogg') !== '';
  },

  audioVolume: function (soundVolume, musicVolume) {
    this.audioSoundSink?.gain.setValueAtTime(soundVolume, this.audioContext.currentTime);
    this.audioMusicSink?.gain.setValueAtTime(musicVolume, this.audioContext.currentTime);
  },

  _createMusicTrack: function (fileName, fileData) {
    const blob = new Blob([fileData], {type: this.audioCanPlayOgg ? 'audio/ogg' : 'audio/mp3'});
    const url = URL.createObjectURL(blob);

    const audioElem = new Audio(url);
    audioElem.loop = true;

    const sourceNode = new MediaElementAudioSourceNode(this.audioContext, {
      mediaElement: audioElem,
    });

    const gainNode = new GainNode(this.audioContext, {
      gain: 0.0,
    });

    sourceNode.connect(gainNode);
    gainNode.connect(this.audioMusicSink);

    let rampStartVal = 0.0;
    let rampEndVal = 0.0;
    let rampStartTime = 0.0;
    let rampEndTime = 0.0;
    let stopTimer = null;

    const getCurrentGain = (now) => {
      if (now <= rampStartTime) return rampStartVal;
      if (now >= rampEndTime) return rampEndVal;
      const progress = (now - rampStartTime) / (rampEndTime - rampStartTime);
      return rampStartVal + (rampEndVal - rampStartVal) * progress;
    };

    const track = {
      fileName: fileName,
      audioElem: audioElem,
      sourceNode: sourceNode,
      gainNode: gainNode,
      blobUrl: url,

      rampGain: (target, duration) => {
        const now = this.audioContext.currentTime;
        const current = getCurrentGain(now);

        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(current, now);

        if (duration > 0.001) {
          gainNode.gain.linearRampToValueAtTime(target, now + duration);
          rampStartTime = now;
          rampEndTime = now + duration;
          rampStartVal = current;
          rampEndVal = target;
        } else {
          gainNode.gain.setValueAtTime(target, now);
          rampStartTime = now;
          rampEndTime = now;
          rampStartVal = target;
          rampEndVal = target;
        }
      },

      fadeIn: (duration) => {
        if (stopTimer) {
          clearTimeout(stopTimer);
          stopTimer = null;
        }
        track.rampGain(1.0, duration);
        const p = audioElem.play();
        if (p !== undefined) {
          p.catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn('Audio playback error:', err);
            }
          });
        }
      },

      fadeOut: (duration) => {
        if (stopTimer) {
          clearTimeout(stopTimer);
          stopTimer = null;
        }
        if (duration <= 0.001) {
          track.stop();
          return;
        }
        track.rampGain(0.0, duration);
        stopTimer = setTimeout(() => {
          stopTimer = null;
          track.stop();
        }, duration * 1000);
      },

      stop: () => {
        if (stopTimer) {
          clearTimeout(stopTimer);
          stopTimer = null;
        }
        if (this.audioContext) {
          const now = this.audioContext.currentTime;
          gainNode.gain.cancelScheduledValues(now);
          gainNode.gain.setValueAtTime(0.0, now);
        }

        audioElem.pause();
        audioElem.removeAttribute('src');
        audioElem.load();

        try {
          sourceNode.disconnect();
        } catch (e) {}
        try {
          gainNode.disconnect();
        } catch (e) {}

        if (url) {
          URL.revokeObjectURL(url);
        }
      }
    };

    return track;
  },

  _syncAudioMusicProperties: function () {
    this.audioMusicFile = this.audioMusicTrack?.fileName || null;
    this.audioMusicSourceNode = this.audioMusicTrack?.sourceNode || null;
    this.audioMusicGainNode = this.audioMusicTrack?.gainNode || null;
  },

  audioQuit: function () {
    this.audioMusicStop();

    this.audioContext?.close();

    this.audioContext = null;

    this.audioSoundSink = null;
    this.audioMusicSink = null;
  },

  audioPlay: async function (fileName, fileData, a) {
    const audioContext = this.audioContext;
    const audioSoundSink = this.audioSoundSink;

    if (!audioContext) {
      return;
    }

    if (!audioSoundSink) {
      return;
    }

    const audioBuffer = await audioContext.decodeAudioData(fileData);

    if (!audioBuffer) {
      return;
    }

    const sourceNode = new AudioBufferSourceNode(audioContext, {
        buffer: audioBuffer,
    });

    const gainNode = new GainNode(audioContext, {
      gain: a
    });

    sourceNode.onended = () => {
      gainNode.disconnect();
    };

    sourceNode.connect(gainNode);
    gainNode.connect(audioSoundSink);

    sourceNode.start();
  },

  audioMusicFadeTo: function (fileName, fileData, fadeTime) {
    if (!this.audioContext || !this.audioMusicSink) {
      return;
    }

    if (this.audioMusicTrack && fileName === this.audioMusicTrack.fileName) {
      // If we're already playing this BGM, just force a fade-in.
      this.audioMusicTrack.fadeIn(fadeTime);
      this._syncAudioMusicProperties();
      return;
    }

    // Fade out any existing BGM.
    if (this.audioMusicTrack) {
      this.audioMusicTrack.fadeOut(fadeTime);
      this.audioMusicTrack = null;
    }

    // Set up and fade in the new BGM.
    this.audioMusicTrack = this._createMusicTrack(fileName, fileData);
    this.audioMusicTrack.fadeIn(fadeTime);
    this._syncAudioMusicProperties();
  },

  audioMusicFadeIn: function (fadeTime) {
    this.audioMusicTrack?.fadeIn(fadeTime);
  },

  audioMusicFadeOut: function (fadeTime) {
    if (this.audioMusicTrack) {
      this.audioMusicTrack.fadeOut(fadeTime);
      this.audioMusicTrack = null;
      this._syncAudioMusicProperties();
    }
  },

  audioMusicStop: function () {
    this.audioMusicTrack?.stop();
    this.audioMusicTrack = null;
    this._syncAudioMusicProperties();
  },

  // Called by the engine when its main loop ends; set by neverputt.js
  quit() { window.neverputtQuit?.(); },
  // Replays have no screen here
  refreshReplays() {},
};
