(function () {
  "use strict";

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function reverseBuffer(ctx, buffer) {
    const reversed = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = reversed.getChannelData(ch);
      for (let i = 0, j = src.length - 1; i < src.length; i++, j--) {
        dst[i] = src[j];
      }
    }
    return reversed;
  }

  function initAudioLab(root) {
    const src = root.getAttribute("data-src");
    if (!src) return;

    const statusEl = root.querySelector("[data-audio-status]");
    const playBtn = root.querySelector("[data-audio-play]");
    const seekEl = root.querySelector("[data-audio-seek]");
    const timeCurEl = root.querySelector("[data-audio-time-cur]");
    const timeDurEl = root.querySelector("[data-audio-time-dur]");
    const reverseBtn = root.querySelector("[data-audio-reverse]");
    const speedBtns = root.querySelectorAll("[data-audio-speed]");

    const audio = document.createElement("audio");
    audio.className = "audio-lab__native";
    audio.preload = "auto";
    audio.playsInline = true;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    audio.src = src;
    root.appendChild(audio);

    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    let ctx = null;
    let decodedBuffer = null;
    let reversedBuffer = null;
    let arrayBufferCache = null;
    let decodePromise = null;
    let waSource = null;
    let reverse = false;
    let speed = 1;
    let duration = 0;
    let positionForward = 0;
    let waPlaying = false;
    let playStartedAt = 0;
    let playStartPosition = 0;
    let rafId = 0;
    let seekDragging = false;
    let nativeReady = false;

    function setStatus(text) {
      if (statusEl) statusEl.textContent = text;
    }

    function setControlsEnabled(on) {
      playBtn.disabled = !on;
      seekEl.disabled = !on;
      speedBtns.forEach(function (btn) {
        btn.disabled = !on;
      });
      reverseBtn.disabled = !on || !AudioCtx;
    }

    function updatePlayLabel() {
      const playing = reverse ? waPlaying : !audio.paused;
      playBtn.textContent = playing ? "Pause" : "Play";
      playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    }

    function updateReverseUi() {
      reverseBtn.classList.toggle("audio-lab__reverse--on", reverse);
      reverseBtn.setAttribute("aria-pressed", reverse ? "true" : "false");
      reverseBtn.textContent = reverse ? "Reverse: on" : "Reverse: off";
    }

    function updateSpeedUi() {
      speedBtns.forEach(function (btn) {
        const rate = parseFloat(btn.getAttribute("data-audio-speed"), 10);
        btn.classList.toggle("audio-lab__speed--active", rate === speed);
        btn.setAttribute("aria-pressed", rate === speed ? "true" : "false");
      });
    }

    function unlockWebAudio() {
      if (!AudioCtx) return;
      if (!ctx) ctx = new AudioCtx();
      if (ctx.state === "suspended") void ctx.resume();
    }

    function ensureReverseDecoded() {
      if (reversedBuffer) return Promise.resolve();
      if (!AudioCtx) return Promise.reject(new Error("no webaudio"));
      if (decodePromise) return decodePromise;

      unlockWebAudio();

      decodePromise = Promise.resolve()
        .then(function () {
          if (!arrayBufferCache) {
            return fetch(src).then(function (res) {
              if (!res.ok) throw new Error("fetch failed");
              return res.arrayBuffer();
            });
          }
          return arrayBufferCache;
        })
        .then(function (arr) {
          arrayBufferCache = arr;
          if (decodedBuffer) return decodedBuffer;
          return ctx.decodeAudioData(arr.slice(0));
        })
        .then(function (decoded) {
          decodedBuffer = decoded;
          reversedBuffer = reverseBuffer(ctx, decodedBuffer);
          if (!duration) duration = decodedBuffer.duration;
        });

      return decodePromise;
    }

    function stopWaSource() {
      if (waSource) {
        try {
          waSource.stop();
        } catch (e) {
          /* already stopped */
        }
        waSource.disconnect();
        waSource = null;
      }
      waPlaying = false;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function waForwardPosition() {
      if (!waPlaying || !ctx) return positionForward;
      const elapsed = (ctx.currentTime - playStartedAt) * speed;
      return Math.max(0, playStartPosition - elapsed);
    }

    function getForwardPosition() {
      if (reverse) return waPlaying ? waForwardPosition() : positionForward;
      return audio.currentTime || 0;
    }

    function syncTimeline() {
      const pos = getForwardPosition();
      timeCurEl.textContent = formatTime(pos);
      if (!seekDragging && duration > 0) {
        seekEl.value = String(Math.round((pos / duration) * 1000));
      }
    }

    function tickWa() {
      syncTimeline();
      if (waPlaying) rafId = window.requestAnimationFrame(tickWa);
    }

    function playWaFrom(forwardPos) {
      if (!reversedBuffer || !ctx) return;
      stopWaSource();
      positionForward = Math.max(0, Math.min(duration, forwardPos));
      const offset = Math.max(0, duration - positionForward);
      if (offset >= duration - 0.02) {
        positionForward = 0;
        syncTimeline();
        updatePlayLabel();
        return;
      }

      waSource = ctx.createBufferSource();
      waSource.buffer = reversedBuffer;
      waSource.playbackRate.value = speed;
      waSource.connect(ctx.destination);
      waSource.onended = function () {
        waPlaying = false;
        positionForward = 0;
        updatePlayLabel();
        syncTimeline();
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      };
      waSource.start(0, offset);
      playStartedAt = ctx.currentTime;
      playStartPosition = positionForward;
      waPlaying = true;
      updatePlayLabel();
      rafId = window.requestAnimationFrame(tickWa);
    }

    function pauseAll() {
      if (reverse) {
        if (waPlaying) {
          positionForward = waForwardPosition();
          stopWaSource();
          updatePlayLabel();
          syncTimeline();
        }
        return;
      }
      audio.pause();
    }

    function playForwardFrom(forwardPos) {
      positionForward = Math.max(0, Math.min(duration, forwardPos));
      audio.currentTime = positionForward;
      audio.playbackRate = speed;
      const playAttempt = audio.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(function () {
          setStatus("Tap Play again to start audio on this device.");
        });
      }
    }

    function togglePlay() {
      unlockWebAudio();

      if (!nativeReady && !duration) return;

      if (reverse) {
        if (waPlaying) {
          pauseAll();
          return;
        }
        if (positionForward >= duration - 0.02) positionForward = duration;
        if (positionForward <= 0.02) positionForward = duration;
        setStatus("Preparing reverse…");
        void ensureReverseDecoded()
          .then(function () {
            setStatus("");
            playWaFrom(positionForward);
          })
          .catch(function () {
            setStatus("Reverse playback is not available in this browser.");
          });
        return;
      }

      if (!audio.paused) {
        audio.pause();
        return;
      }

      if (audio.currentTime >= duration - 0.02) audio.currentTime = 0;
      playForwardFrom(audio.currentTime);
    }

    function setSpeed(nextSpeed) {
      speed = nextSpeed;
      updateSpeedUi();
      if (reverse) {
        if (waPlaying) playWaFrom(waForwardPosition());
        return;
      }
      audio.playbackRate = speed;
    }

    function setReverse(nextReverse) {
      if (reverse === nextReverse) return;
      unlockWebAudio();

      const pos = getForwardPosition();
      const wasPlaying = reverse ? waPlaying : !audio.paused;

      if (reverse) stopWaSource();
      else audio.pause();

      reverse = nextReverse;
      updateReverseUi();
      positionForward = pos;

      if (reverse) {
        setStatus("Preparing reverse…");
        void ensureReverseDecoded()
          .then(function () {
            setStatus("");
            syncTimeline();
            if (wasPlaying) playWaFrom(pos);
          })
          .catch(function () {
            reverse = false;
            updateReverseUi();
            setStatus("Reverse playback is not available in this browser.");
          });
        return;
      }

      audio.currentTime = pos;
      audio.playbackRate = speed;
      syncTimeline();
      if (wasPlaying) playForwardFrom(pos);
    }

    playBtn.addEventListener("click", togglePlay);

    seekEl.addEventListener("input", function () {
      seekDragging = true;
      if (duration > 0) {
        const pos = (parseInt(seekEl.value, 10) / 1000) * duration;
        timeCurEl.textContent = formatTime(pos);
      }
    });

    seekEl.addEventListener("change", function () {
      seekDragging = false;
      if (duration <= 0) return;
      const pos = (parseInt(seekEl.value, 10) / 1000) * duration;
      positionForward = pos;
      if (reverse) {
        if (waPlaying) playWaFrom(pos);
        else syncTimeline();
        return;
      }
      audio.currentTime = pos;
      syncTimeline();
    });

    reverseBtn.addEventListener("click", function () {
      unlockWebAudio();
      setReverse(!reverse);
    });

    speedBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        unlockWebAudio();
        const rate = parseFloat(btn.getAttribute("data-audio-speed"), 10);
        if (Number.isFinite(rate)) setSpeed(rate);
      });
    });

    audio.addEventListener("loadedmetadata", function () {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        duration = audio.duration;
        timeDurEl.textContent = formatTime(duration);
        seekEl.max = "1000";
      }
    });

    audio.addEventListener("canplaythrough", function () {
      nativeReady = true;
      setControlsEnabled(true);
      setStatus("");
      syncTimeline();
    });

    audio.addEventListener("timeupdate", function () {
      if (!reverse && !seekDragging) syncTimeline();
    });

    audio.addEventListener("play", function () {
      if (!reverse) updatePlayLabel();
    });

    audio.addEventListener("pause", function () {
      if (!reverse) updatePlayLabel();
    });

    audio.addEventListener("ended", function () {
      if (!reverse) {
        updatePlayLabel();
        syncTimeline();
      }
    });

    audio.addEventListener("error", function () {
      setStatus("Could not load the recording. Check your connection and refresh.");
    });

    setControlsEnabled(false);
    updateReverseUi();
    updateSpeedUi();
    updatePlayLabel();
    setStatus("Loading audio…");

    fetch(src)
      .then(function (res) {
        if (!res.ok) throw new Error("fetch failed");
        return res.arrayBuffer();
      })
      .then(function (arr) {
        arrayBufferCache = arr;
      })
      .catch(function () {
        /* native audio element may still load the file */
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-audio-lab]").forEach(initAudioLab);
  });
})();
