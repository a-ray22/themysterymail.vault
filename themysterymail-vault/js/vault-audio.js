(function () {
  "use strict";

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function initAudioLab(root) {
    const statusEl = root.querySelector("[data-audio-status]");
    const playBtn = root.querySelector("[data-audio-play]");
    const seekEl = root.querySelector("[data-audio-seek]");
    const timeCurEl = root.querySelector("[data-audio-time-cur]");
    const timeDurEl = root.querySelector("[data-audio-time-dur]");
    const reverseBtn = root.querySelector("[data-audio-reverse]");
    const speedBtns = root.querySelectorAll("[data-audio-speed]");

    const audioFwd = root.querySelector("[data-audio-forward]");
    const audioRev = root.querySelector("[data-audio-reversed]");
    if (!audioFwd || !audioRev) return;

    [audioFwd, audioRev].forEach(function (el) {
      el.preload = "auto";
      el.playsInline = true;
      el.volume = 1;
      el.muted = false;
      el.setAttribute("playsinline", "");
      el.setAttribute("webkit-playsinline", "");
    });

    let reverse = false;
    let speed = 1;
    let duration = 0;
    let seekDragging = false;
    let fwdReady = false;
    let revReady = false;
    let ready = false;

    function activeAudio() {
      return reverse ? audioRev : audioFwd;
    }

    function inactiveAudio() {
      return reverse ? audioFwd : audioRev;
    }

    function displayPosition() {
      const a = activeAudio();
      const t = a.currentTime || 0;
      if (reverse) return clamp(duration - t, 0, duration);
      return clamp(t, 0, duration);
    }

    function mapDisplayToAudioTime(displayPos) {
      const p = clamp(displayPos, 0, duration);
      return reverse ? clamp(duration - p, 0, duration) : p;
    }

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

    function isPlaying() {
      return !activeAudio().paused;
    }

    function updatePlayLabel() {
      playBtn.textContent = isPlaying() ? "Pause" : "Play";
      playBtn.setAttribute("aria-label", isPlaying() ? "Pause" : "Play");
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

    function applySpeed() {
      audioFwd.playbackRate = speed;
      audioRev.playbackRate = speed;
    }

    function syncTimeline() {
      const pos = displayPosition();
      timeCurEl.textContent = formatTime(pos);
      if (!seekDragging && duration > 0) {
        seekEl.value = String(Math.round((pos / duration) * 1000));
      }
    }

    function seekBothToDisplayPos(displayPos) {
      const p = clamp(displayPos, 0, duration);
      audioFwd.currentTime = p;
      audioRev.currentTime = clamp(duration - p, 0, duration);
      syncTimeline();
    }

    function pauseInactive() {
      inactiveAudio().pause();
    }

    function playActiveFromDisplayPos(displayPos) {
      pauseInactive();
      const a = activeAudio();
      a.volume = 1;
      a.muted = false;
      applySpeed();
      let audioTime = mapDisplayToAudioTime(displayPos);
      if (reverse && audioTime >= duration - 0.03) audioTime = 0;
      a.currentTime = audioTime;
      const attempt = a.play();
      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(function () {
          setStatus("Tap Play again to start audio on this device.");
        });
      }
    }

    function togglePlay() {
      if (!ready) return;

      const a = activeAudio();
      if (!a.paused) {
        a.pause();
        return;
      }

      let pos = displayPosition();
      if (pos >= duration - 0.02) pos = 0;
      playActiveFromDisplayPos(pos);
    }

    function setSpeed(nextSpeed) {
      speed = nextSpeed;
      updateSpeedUi();
      applySpeed();
    }

    function setReverse(nextReverse) {
      if (reverse === nextReverse) return;

      const pos = displayPosition();
      const playing = isPlaying();
      activeAudio().pause();
      reverse = nextReverse;
      updateReverseUi();
      seekBothToDisplayPos(pos);
      updatePlayLabel();

      if (playing) playActiveFromDisplayPos(pos);
    }

    function markTrackReady(which) {
      if (which === "fwd") fwdReady = true;
      if (which === "rev") revReady = true;

      const fwdDur = audioFwd.duration;
      if (Number.isFinite(fwdDur) && fwdDur > 0 && !Number.isNaN(fwdDur)) {
        duration = fwdDur;
        timeDurEl.textContent = formatTime(duration);
        seekEl.max = "1000";
      }

      if (fwdReady && revReady && duration > 0 && !ready) {
        ready = true;
        setControlsEnabled(true);
        setStatus("");
        applySpeed();
        syncTimeline();
      }
    }

    function bindAudioEvents(el, which) {
      el.addEventListener("loadedmetadata", function () {
        markTrackReady(which);
      });
      el.addEventListener("canplay", function () {
        markTrackReady(which);
      });
      el.addEventListener("timeupdate", function () {
        if (el === activeAudio() && !seekDragging) syncTimeline();
      });
      el.addEventListener("play", function () {
        if (el === activeAudio()) {
          pauseInactive();
          updatePlayLabel();
        }
      });
      el.addEventListener("pause", function () {
        if (el === activeAudio()) updatePlayLabel();
      });
      el.addEventListener("ended", function () {
        if (el === activeAudio()) {
          updatePlayLabel();
          syncTimeline();
        }
      });
      el.addEventListener("error", function () {
        setStatus("Could not load the recording. Check your connection and refresh.");
      });
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
      const wasPlaying = isPlaying();
      activeAudio().pause();
      seekBothToDisplayPos(pos);
      if (wasPlaying) playActiveFromDisplayPos(pos);
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

    bindAudioEvents(audioFwd, "fwd");
    bindAudioEvents(audioRev, "rev");

    setControlsEnabled(false);
    updateReverseUi();
    updateSpeedUi();
    updatePlayLabel();
    setStatus("Loading audio…");
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-audio-lab]").forEach(initAudioLab);
  });
})();
