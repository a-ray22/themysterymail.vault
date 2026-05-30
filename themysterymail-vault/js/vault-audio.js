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

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      if (statusEl) statusEl.textContent = "This browser cannot play advanced audio. Try a recent Chrome or Safari.";
      return;
    }

    const ctx = new AudioCtx();
    let buffer = null;
    let reversedBuffer = null;
    let source = null;
    let playing = false;
    let reverse = false;
    let speed = 1;
    let duration = 0;
    let positionForward = 0;
    let playStartedAt = 0;
    let playStartPosition = 0;
    let rafId = 0;
    let seekDragging = false;

    function setStatus(text) {
      if (statusEl) statusEl.textContent = text;
    }

    function setControlsEnabled(on) {
      playBtn.disabled = !on;
      seekEl.disabled = !on;
      speedBtns.forEach(function (btn) {
        btn.disabled = !on;
      });
      reverseBtn.disabled = !on;
    }

    function updatePlayLabel() {
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

    function currentForwardPosition() {
      if (!playing) return positionForward;
      const elapsed = (ctx.currentTime - playStartedAt) * speed;
      if (reverse) return Math.max(0, playStartPosition - elapsed);
      return Math.min(duration, playStartPosition + elapsed);
    }

    function syncTimeline() {
      const pos = currentForwardPosition();
      timeCurEl.textContent = formatTime(pos);
      if (!seekDragging && duration > 0) {
        seekEl.value = String(Math.round((pos / duration) * 1000));
      }
    }

    function tick() {
      syncTimeline();
      if (playing) rafId = window.requestAnimationFrame(tick);
    }

    function stopSource() {
      if (source) {
        try {
          source.stop();
        } catch (e) {
          /* already stopped */
        }
        source.disconnect();
        source = null;
      }
      playing = false;
      updatePlayLabel();
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function bufferOffsetForForwardPosition(pos) {
      if (reverse) return Math.max(0, duration - pos);
      return Math.max(0, Math.min(duration, pos));
    }

    async function ensureContextRunning() {
      if (ctx.state === "suspended") await ctx.resume();
    }

    function playFromPosition(forwardPos) {
      if (!buffer) return;
      stopSource();
      positionForward = Math.max(0, Math.min(duration, forwardPos));
      void ensureContextRunning().then(function () {
        source = ctx.createBufferSource();
        source.buffer = reverse ? reversedBuffer : buffer;
        source.playbackRate.value = speed;
        source.connect(ctx.destination);
        source.onended = function () {
          playing = false;
          positionForward = reverse ? 0 : duration;
          updatePlayLabel();
          syncTimeline();
          if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
          }
        };
        const offset = bufferOffsetForForwardPosition(positionForward);
        if (offset >= duration - 0.02) {
          positionForward = reverse ? 0 : duration;
          syncTimeline();
          return;
        }
        source.start(0, offset);
        playStartedAt = ctx.currentTime;
        playStartPosition = positionForward;
        playing = true;
        updatePlayLabel();
        rafId = window.requestAnimationFrame(tick);
      });
    }

    function togglePlay() {
      if (!buffer) return;
      if (playing) {
        positionForward = currentForwardPosition();
        stopSource();
        syncTimeline();
        return;
      }
      if (positionForward >= duration - 0.02 && !reverse) positionForward = 0;
      if (positionForward <= 0.02 && reverse) positionForward = duration;
      playFromPosition(positionForward);
    }

    function setSpeed(nextSpeed) {
      speed = nextSpeed;
      updateSpeedUi();
      if (playing) {
        const pos = currentForwardPosition();
        playFromPosition(pos);
      }
    }

    function setReverse(nextReverse) {
      if (reverse === nextReverse) return;
      const pos = playing ? currentForwardPosition() : positionForward;
      reverse = nextReverse;
      updateReverseUi();
      if (playing) playFromPosition(pos);
      else {
        positionForward = pos;
        syncTimeline();
      }
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
      if (!buffer || duration <= 0) return;
      const pos = (parseInt(seekEl.value, 10) / 1000) * duration;
      positionForward = pos;
      if (playing) playFromPosition(pos);
      else syncTimeline();
    });

    reverseBtn.addEventListener("click", function () {
      setReverse(!reverse);
    });

    speedBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const rate = parseFloat(btn.getAttribute("data-audio-speed"), 10);
        if (Number.isFinite(rate)) setSpeed(rate);
      });
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
        return ctx.decodeAudioData(arr);
      })
      .then(function (decoded) {
        buffer = decoded;
        reversedBuffer = reverseBuffer(ctx, buffer);
        duration = buffer.duration;
        timeDurEl.textContent = formatTime(duration);
        seekEl.max = "1000";
        setControlsEnabled(true);
        setStatus("");
        syncTimeline();
      })
      .catch(function () {
        setStatus("Could not load the recording. Check your connection and refresh.");
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-audio-lab]").forEach(initAudioLab);
  });
})();
