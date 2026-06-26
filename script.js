(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealElements = document.querySelectorAll("[data-reveal]");
  const petalsRoot = document.getElementById("petalField");
  const playButton = document.getElementById("playFavorite");
  const favoriteAudio = document.getElementById("favoriteAudio");
  const playerStatus = document.getElementById("playerStatus");
  const playerPanel = document.querySelector(".favorite-player");
  const mazeButton = document.getElementById("openMaze");
  const miniMaze = document.getElementById("miniMaze");
  const year = document.getElementById("year");
  const navLinks = document.querySelectorAll(".main-nav a");

  let demoAudioContext = null;
  let demoTimers = [];
  let demoIsPlaying = false;

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  function createPetals() {
    if (!petalsRoot || prefersReducedMotion) return;

    const petalCount = window.innerWidth < 620 ? 18 : 34;
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < petalCount; index += 1) {
      const petal = document.createElement("span");
      const duration = 8 + Math.random() * 10;
      const delay = Math.random() * -18;
      const size = 8 + Math.random() * 8;
      const drift = -80 + Math.random() * 160;

      petal.className = "petal";
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.width = `${size}px`;
      petal.style.height = `${Math.max(6, size * 0.62)}px`;
      petal.style.animationDuration = `${duration}s`;
      petal.style.animationDelay = `${delay}s`;
      petal.style.setProperty("--drift", `${drift}px`);
      fragment.appendChild(petal);
    }

    petalsRoot.appendChild(fragment);
  }

  function setupRevealAnimation() {
    if (!("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    revealElements.forEach((element) => observer.observe(element));
  }

  function setupNavState() {
    const sections = Array.from(navLinks)
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (!("IntersectionObserver" in window) || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            const isCurrent = link.getAttribute("href") === `#${entry.target.id}`;
            link.classList.toggle("is-active", isCurrent);
          });
        });
      },
      { rootMargin: "-42% 0px -48% 0px" }
    );

    sections.forEach((section) => observer.observe(section));
  }

  function setPlayerState(isPlaying, message) {
    playButton?.classList.toggle("is-playing", isPlaying);
    playButton?.setAttribute("aria-pressed", String(isPlaying));
    playerPanel?.classList.toggle("is-playing", isPlaying);

    if (playerStatus && message) {
      playerStatus.textContent = message;
    }
  }

  function stopDemoPreview() {
    demoTimers.forEach((timerId) => window.clearTimeout(timerId));
    demoTimers = [];
    demoIsPlaying = false;
  }

  function playDemoPreview() {
    stopDemoPreview();

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setPlayerState(false, "Браузер не поддерживает аудио-превью, но сайт продолжает работать.");
      return;
    }

    demoAudioContext = demoAudioContext || new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 987.77, 783.99, 659.25, 587.33, 523.25];
    const beatLength = 230;
    demoIsPlaying = true;
    setPlayerState(true, "Файл песни не найден, поэтому играет лёгкий 8-bit preview без краша.");

    const playNote = (frequency, index) => {
      const oscillator = demoAudioContext.createOscillator();
      const gain = demoAudioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, demoAudioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, demoAudioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, demoAudioContext.currentTime + 0.18);

      oscillator.connect(gain);
      gain.connect(demoAudioContext.destination);
      oscillator.start();
      oscillator.stop(demoAudioContext.currentTime + 0.2);

      if (index === notes.length - 1) {
        const endTimer = window.setTimeout(() => {
          demoIsPlaying = false;
          setPlayerState(false, "Preview завершён. Для оригинала добавь аудиофайл в assets/audio.");
        }, beatLength + 80);
        demoTimers.push(endTimer);
      }
    };

    notes.forEach((note, index) => {
      const timerId = window.setTimeout(() => playNote(note, index), index * beatLength);
      demoTimers.push(timerId);
    });
  }

  async function playLocalFavoriteAudio() {
    const audioFile = favoriteAudio?.dataset.src;
    if (!favoriteAudio || !audioFile) {
      throw new Error("Audio source is not configured.");
    }

    const response = await fetch(audioFile, { method: "HEAD", cache: "no-store" });
    if (!response.ok) {
      throw new Error("Audio file is not available.");
    }

    if (favoriteAudio.getAttribute("src") !== audioFile) {
      favoriteAudio.setAttribute("src", audioFile);
    }

    await favoriteAudio.play();
  }

  async function toggleFavoriteSong() {
    if (!playButton || !favoriteAudio) return;

    if (!favoriteAudio.paused) {
      favoriteAudio.pause();
      setPlayerState(false, "Музыка на паузе.");
      return;
    }

    if (demoIsPlaying) {
      stopDemoPreview();
      setPlayerState(false, "Preview остановлен.");
      return;
    }

    try {
      stopDemoPreview();
      await playLocalFavoriteAudio();
      setPlayerState(true, "Играет локальный файл: See You Again by Tyler, The Creator.");
    } catch (error) {
      playDemoPreview();
    }
  }

  function setupMusicCards() {
    document.querySelectorAll(".spin-button").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".vinyl-card");
        if (!card) return;

        const active = card.classList.toggle("is-spinning");
        button.textContent = active ? "Stop" : "Spin";
      });
    });

    favoriteAudio?.addEventListener("ended", () => {
      setPlayerState(false, "Трек закончился.");
    });

    playButton?.addEventListener("click", toggleFavoriteSong);
  }

  function setupMaze() {
    mazeButton?.addEventListener("click", () => {
      const isOpen = miniMaze?.classList.toggle("is-open");
      mazeButton.textContent = isOpen ? "Закрыть проход" : "Открыть проход";
    });
  }

  createPetals();
  setupRevealAnimation();
  setupNavState();
  setupMusicCards();
  setupMaze();
})();
