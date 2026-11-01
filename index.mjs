import './style.css';
import {decodeSave, encodeSave, MemoryGardenSession, MOTIFS, SIZES} from './model.mjs';
import {MEMORY_GARDEN_RIVE, tilePresentation} from './src/rive/contract.mjs';

export function mount(host) {
  const {make, textButton, appInput} = host.ui;
  const owner = host.w?.launchContext?.owner || host.storage.signedInSubject();
  const windowState = host.w?.memoryGarden ?? {dirty: false};
  if (host.w) {
    host.w.memoryGarden = windowState;
    host.w.ownerSub = owner;
  }

  let session = new MemoryGardenSession({size: "practice"});
  windowState.session = session;
  let disposed = false;
  let busy = false;
  let dirty = false;
  let revision = 0;
  let frame = 0;
  let last = performance.now();
  let savedPath = null;
  let savedVersion = null;
  let unwatch = () => {};
  let watchSerial = 0;
  let watchCheck = 0;
  let audio = null;
  let observedWindow = null;
  let windowObserver = null;
  let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let highContrast = false;
  let soundEnabled = false;
  const buttons = [];

  const body = make("div", "window-content memory-garden");
  const toolbar = make("div", "memory-toolbar");
  const info = make("div", "memory-info");
  const board = make("div", "memory-board");
  const warning = make("p", "memory-warning");
  const status = make("div", "app-status");
  const rivePanel = make("div", "memory-rive");
  const riveTitle = make("strong", "", "Creature presentation");
  const riveNotice = make("span", "", "Procedural fallback. The final memory-creatures.riv artwork is pending.");
  const riveState = make("span", "memory-rive-state");
  rivePanel.append(riveTitle, riveNotice, riveState);

  const size = document.createElement("select");
  size.setAttribute("aria-label", "Board size");
  for (const [id, config] of Object.entries(SIZES)) size.append(new Option(config.label, id));
  const pauseButton = textButton("Resume", () => togglePause());
  const restartButton = textButton("New garden", () => void restart());
  const openButton = textButton("Open from My files", () => void open());
  const saveButton = textButton("Save to My files", () => void save());
  toolbar.append(size, pauseButton, restartButton, saveButton, openButton);

  const saveDetails = document.createElement("details");
  saveDetails.className = "memory-save";
  const saveFields = make("div", "memory-save-fields");
  const path = appInput("Memory Garden save path", host.w?.launchContext?.path || "/Memory Garden.game.json");
  saveFields.append(path, textButton("Choose folder", () => void chooseFolder()));
  saveDetails.append(make("summary", "", "Save location"), saveFields);

  const settings = document.createElement("details");
  settings.className = "memory-settings";
  const motionLabel = make("label", "memory-setting", "Reduced motion ");
  const motion = document.createElement("input");
  motion.type = "checkbox";
  motion.checked = reducedMotion;
  motion.setAttribute("aria-label", "Reduced motion");
  motionLabel.prepend(motion);
  const contrastLabel = make("label", "memory-setting", "High contrast ");
  const contrast = document.createElement("input");
  contrast.type = "checkbox";
  contrast.setAttribute("aria-label", "High contrast");
  contrastLabel.prepend(contrast);
  const soundLabel = make("label", "memory-setting", "Sound effects ");
  const sound = document.createElement("input");
  sound.type = "checkbox";
  sound.setAttribute("aria-label", "Sound effects");
  soundLabel.prepend(sound);
  settings.append(make("summary", "", "Settings"), motionLabel, contrastLabel, soundLabel);

  const help = document.createElement("details");
  help.className = "memory-help";
  help.append(
    make("summary", "", "How to play"),
    make("p", "", "Reveal two tiles at a time. Matching creatures stay open. A mismatch closes after a short active-time delay. Pause freezes that delay. Use the arrow keys to move between tiles and Enter or Space to reveal."),
  );
  body.append(toolbar, info, board, rivePanel, warning, saveDetails, settings, help, status);
  warning.hidden = true;
  warning.setAttribute("role", "status");
  status.setAttribute("role", "status");

  const valid = () => !disposed && !host.signal.aborted && body.isConnected && owner === host.storage.signedInSubject();
  const tell = message => {
    if (valid()) status.textContent = message;
  };
  const mark = () => {
    revision++;
    dirty = true;
    windowState.dirty = true;
  };
  const clearDirty = () => {
    dirty = false;
    windowState.dirty = false;
  };
  const setBusy = value => {
    busy = value;
    size.disabled = value;
    pauseButton.disabled = value;
    restartButton.disabled = value;
    openButton.disabled = value;
    saveButton.disabled = value;
    path.disabled = value;
    updateBoard();
  };
  const seconds = ms => (Math.max(0, ms) / 1000).toFixed(1);
  const pairCount = () => session.matched.size / 2;
  const totalPairs = () => session.tiles.length / 2;

  function updateBoard() {
    board.style.setProperty("--memory-cols", String(session.config.cols));
    board.setAttribute("aria-label", `${SIZES[session.size].label} board`);
    for (const [index, button] of buttons.entries()) {
      const tile = session.tiles[index];
      const matched = session.matched.has(index);
      const revealed = matched || session.revealed.includes(index);
      const visual = tilePresentation(tile, matched, revealed);
      const motif = MOTIFS[tile.motif];
      button.dataset.state = visual.state;
      button.dataset.riveMotif = revealed ? String(tile.motif) : "";
      button.dataset.riveAsset = MEMORY_GARDEN_RIVE.asset;
      button.dataset.riveArtboard = MEMORY_GARDEN_RIVE.artboard;
      button.dataset.riveStateMachine = MEMORY_GARDEN_RIVE.stateMachine;
      button.classList.toggle("revealed", revealed);
      button.classList.toggle("matched", matched);
      button.style.setProperty("--motif-color", motif.color);
      button.querySelector(".memory-face").textContent = revealed ? motif.glyph : "🍃";
      button.querySelector(".memory-name").textContent = revealed ? motif.name : "Hidden";
      button.setAttribute("aria-label", revealed ? `${motif.name}${matched ? ", matched" : ""}` : `Hidden tile ${index + 1}`);
      // Keep unavailable tiles focusable during play so revealing a tile does
      // not eject a keyboard player from the board. The session still refuses
      // duplicate, matched and resolving selections.
      button.disabled = busy || session.paused || session.won;
      button.setAttribute("aria-disabled", String(button.disabled || session.resolving || matched || session.revealed.includes(index)));
    }
  }

  function update() {
    pauseButton.textContent = session.paused ? "Resume" : "Pause";
    pauseButton.setAttribute("aria-label", pauseButton.textContent);
    pauseButton.disabled = busy || session.won;
    size.disabled = busy;
    info.textContent = `${session.won ? "Garden complete" : session.paused ? "Paused" : "Playing"} · ${pairCount()}/${totalPairs()} pairs · ${session.moves} moves · ${seconds(session.elapsedMs)}s`;
    riveState.textContent = session.resolving ? `mismatch · ${seconds(session.pendingMismatchMs)}s` : session.won ? "matched garden" : session.revealed.length ? "front" : "back";
    updateBoard();
  }

  function explain(result) {
    if (result.kind === "reveal") tell("Tile revealed. Choose one more.");
    else if (result.kind === "match") tell("Creature pair matched.");
    else if (result.kind === "mismatch") tell("Not a match. The tiles will close after the pause-aware delay.");
    else if (result.kind === "win") {
      session.pause();
      mark();
      update();
      tell(`Garden complete in ${session.moves} moves.`);
    }
  }

  function playCue(kind) {
    if (!soundEnabled || !audio || audio.state !== "running") return;
    try {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = kind === "match" || kind === "win" ? 660 : kind === "mismatch" ? 220 : 440;
      gain.gain.setValueAtTime(0.035, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.13);
    } catch {}
  }

  function reveal(index) {
    if (busy || !valid() || session.paused) return;
    const before = session.revealed.length;
    const result = session.reveal(index);
    if (before === session.revealed.length && result.kind === "ignored") return;
    mark();
    playCue(result.kind);
    update();
    explain(result);
  }

  function buildBoard() {
    buttons.length = 0;
    board.replaceChildren();
    for (let index = 0; index < session.tiles.length; index++) {
      const button = make("button", "memory-tile");
      button.type = "button";
      button.append(make("span", "memory-face", "🍃"), make("span", "memory-name", "Hidden"));
      button.addEventListener("click", () => reveal(index));
      button.addEventListener("keydown", event => {
        const columns = session.config.cols;
        const moves = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns};
        if (!(event.key in moves)) return;
        event.preventDefault();
        const next = Math.max(0, Math.min(buttons.length - 1, index + moves[event.key]));
        buttons[next]?.focus();
      });
      buttons.push(button);
      board.append(button);
    }
    update();
    if (valid()) buttons.find((button, index) => !button.disabled && !session.matched.has(index))?.focus({preventScroll: true});
  }

  function replaceSession(next, {markDirty = true} = {}) {
    session = next;
    windowState.session = session;
    revision++;
    last = performance.now();
    size.value = session.size;
    savedPath = null;
    savedVersion = null;
    if (host.w) delete host.w.launchContext;
    if (markDirty) {
      dirty = true;
      windowState.dirty = true;
    }
    buildBoard();
  }

  async function togglePause() {
    if (busy || !valid() || session.won) return;
    session.togglePaused();
    last = performance.now();
    if (!session.paused) {
      if (soundEnabled) {
        try {
          audio ??= new AudioContext();
          if (audio.state !== "running") await audio.resume();
        } catch {
          sound.checked = false;
          soundEnabled = false;
          tell("Sound is unavailable in this browser.");
        }
      }
    }
    update();
    tell(session.paused ? "Garden paused." : "Find matching creatures.");
  }

  function suspend() {
    if (session.paused || session.won) return;
    session.pause();
    update();
    tell("Garden paused when its window lost attention. Press Resume to continue.");
  }
  const visibility = () => {
    if (document.hidden) suspend();
  };
  window.addEventListener("blur", suspend);
  document.addEventListener("visibilitychange", visibility);

  function watchWindow() {
    const target = body.closest(".window");
    if (target !== observedWindow) {
      windowObserver?.disconnect();
      observedWindow = target;
      windowObserver = target ? new MutationObserver(() => {
        if (target.hidden || !target.classList.contains("focused") || target.classList.contains("rolled")) suspend();
      }) : null;
      windowObserver?.observe(target, {attributes: true, attributeFilter: ["class", "hidden"]});
    }
    if (target && (target.hidden || !target.classList.contains("focused") || target.classList.contains("rolled"))) suspend();
  }

  function clearWatch() {
    watchSerial++;
    watchCheck++;
    unwatch();
    unwatch = () => {};
    warning.hidden = true;
    warning.textContent = "";
  }

  function watch(context, filePath, version) {
    clearWatch();
    const serial = watchSerial;
    const check = async () => {
      const checkId = ++watchCheck;
      if (!valid() || !context.valid() || savedPath !== filePath || savedVersion !== version) return;
      let message = "";
      try {
        const current = await context.files.stat(filePath);
        message = current.status === "conflict"
          ? "This saved garden has conflicting copies. Resolve them in Files."
          : current.version !== version
            ? "The saved garden changed. Your current board is unchanged."
            : "";
      } catch {
        message = "The saved garden is unavailable. Your current board is unchanged.";
      }
      if (valid() && serial === watchSerial && checkId === watchCheck) {
        warning.textContent = message;
        warning.hidden = !message;
      }
    };
    unwatch = context.files.subscribe?.(check) || (() => {});
    queueMicrotask(check);
  }

  async function restart() {
    if (busy || !valid()) return;
    const selectedSize = size.value;
    setBusy(true);
    session.pause();
    update();
    const before = revision;
    try {
      if (dirty && !await host.ui.confirm("Start a new garden and discard unsaved progress?", {
        title: "New garden", confirmLabel: "New garden", cancelLabel: "Keep garden", danger: true, signal: host.signal,
      })) {
        size.value = session.size;
        tell("Current garden kept and paused.");
        return;
      }
      if (!valid()) return;
      if (revision !== before) throw Error("The garden changed while confirming; try again.");
      clearWatch();
      replaceSession(new MemoryGardenSession({seed: `garden-${Date.now()}`, size: selectedSize}));
      path.value = "/Memory Garden.game.json";
      tell("New garden ready. Press Resume to play.");
    } catch (error) {
      tell("Could not start a new garden: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (busy || !valid()) return;
    const wasDirty = dirty, atRevision = revision, requested = path.value, snapshot = encodeSave(session);
    setBusy(true);
    session.pause();
    dirty = true;
    windowState.dirty = true;
    update();
    let committed = false;
    try {
      const context = await host.storage.mirrorFileContext();
      const target = context.path(requested);
      if (!target.toLowerCase().endsWith(".game.json")) throw Error("Use a .game.json filename.");
      let expected = null;
      try {
        const old = await context.files.stat(target);
        if (old.status === "conflict") throw Error("Resolve the conflict in Files first.");
        if (target === savedPath && savedVersion && old.version !== savedVersion) throw Error("The saved garden changed. Save a copy or reopen it.");
        if (target !== savedPath && !await host.ui.confirm("Replace " + target + "?", {
          title: "Replace saved garden", confirmLabel: "Replace", cancelLabel: "Cancel", danger: true, signal: host.signal,
        })) {
          tell("Save cancelled. Garden remains paused.");
          return;
        }
        expected = old.version;
      } catch (error) {
        if (error.message !== "File not found.") throw error;
      }
      if (!valid() || !context.valid()) return;
      const result = await context.files.write(target, new TextEncoder().encode(snapshot), expected);
      if (!valid() || !context.valid()) return;
      savedPath = target;
      savedVersion = result.version;
      if (path.value === requested) path.value = target;
      dirty = encodeSave(session) !== snapshot || revision !== atRevision;
      windowState.dirty = dirty;
      if (host.w) {
        host.w.launchContext = Object.freeze({version: 1, storage: "mirror", path: target, owner});
        host.w.title = target.split("/").pop() + " — Memory Garden";
      }
      committed = true;
      watch(context, target, result.version);
      tell(result.status === "conflict"
        ? "Garden saved with conflicting copies. Resolve them in Files."
        : dirty ? "Saved the earlier board; newer changes remain unsaved." : "Garden saved to My files; syncing with the server.");
    } catch (error) {
      tell("Could not save garden: " + error.message);
    } finally {
      if (!committed && valid() && revision === atRevision) {
        dirty = wasDirty;
        windowState.dirty = wasDirty;
      }
      setBusy(false);
    }
  }

  async function open(selected) {
    if (busy || !valid()) return;
    setBusy(true);
    session.pause();
    update();
    const before = revision, snapshot = encodeSave(session);
    try {
      if (dirty && !await host.ui.confirm("Open a saved garden and discard current progress?", {
        title: "Unsaved garden", confirmLabel: "Discard progress", cancelLabel: "Keep garden", danger: true, signal: host.signal,
      })) {
        tell("Current garden kept and paused.");
        return;
      }
      if (!valid()) return;
      if (revision !== before || encodeSave(session) !== snapshot) throw Error("The garden changed while confirming; try again.");
      const choice = selected || await host.storage.pickFile({extensions: [".game.json"], signal: host.signal});
      if (!choice || !valid()) return;
      const context = await host.storage.mirrorFileContext();
      const target = context.path(choice);
      const file = await context.files.read(target);
      if (!valid() || !context.valid()) return;
      if (file.status === "conflict") throw Error("Resolve the conflict in Files first.");
      if (file.data.byteLength > 1024 * 1024) throw Error("Save file is too large.");
      const replacement = new MemoryGardenSession({snapshot: decodeSave(new TextDecoder("utf-8", {fatal: true}).decode(file.data))});
      if (revision !== before || encodeSave(session) !== snapshot) throw Error("The garden changed while opening; try again.");
      session = replacement;
      windowState.session = session;
      revision++;
      savedPath = target;
      savedVersion = file.version;
      path.value = target;
      size.value = session.size;
      clearDirty();
      if (host.w) {
        host.w.launchContext = Object.freeze({version: 1, storage: "mirror", path: target, owner});
        host.w.title = target.split("/").pop() + " — Memory Garden";
      }
      buildBoard();
      watch(context, target, file.version);
      tell("Garden loaded and paused. Press Resume to play.");
    } catch (error) {
      tell("Could not open garden: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function chooseFolder() {
    try {
      const directory = await host.storage.pickFolder({signal: host.signal});
      if (directory === null || !valid()) return;
      const context = await host.storage.mirrorFileContext();
      if (!valid() || !context.valid()) return;
      path.value = context.path((directory === "/" ? "" : directory) + "/" + context.name(path.value.split("/").pop() || "Memory Garden.game.json"));
    } catch (error) {
      tell("Could not choose folder: " + error.message);
    }
  }

  size.addEventListener("change", () => {
    if (busy || !valid()) return;
    void restart();
  });
  motion.addEventListener("change", () => {
    reducedMotion = motion.checked;
    body.classList.toggle("reduce-motion", reducedMotion);
  });
  contrast.addEventListener("change", () => {
    highContrast = contrast.checked;
    body.classList.toggle("high-contrast", highContrast);
  });
  sound.addEventListener("change", async () => {
    soundEnabled = sound.checked;
    if (!soundEnabled) return;
    try {
      audio ??= new AudioContext();
      if (audio.state !== "running") await audio.resume();
    } catch {
      sound.checked = false;
      soundEnabled = false;
      tell("Sound is unavailable in this browser.");
    }
  });

  const loop = now => {
    if (disposed) return;
    watchWindow();
    const delta = Math.min(250, Math.max(0, now - last));
    last = now;
    if (!session.paused && !session.won) {
      const changed = session.advance(delta);
      if (changed) {
        revision++;
        dirty = true;
        windowState.dirty = true;
        update();
        tell("The mismatch closed. Continue finding pairs.");
      } else if (session.resolving) {
        riveState.textContent = `mismatch · ${seconds(session.pendingMismatchMs)}s`;
      }
    }
    frame = requestAnimationFrame(loop);
  };

  body.classList.toggle("reduce-motion", reducedMotion);
  size.value = session.size;
  buildBoard();
  update();
  queueMicrotask(() => tell("Garden ready and paused. Press Resume to play."));
  queueMicrotask(watchWindow);
  frame = requestAnimationFrame(loop);

  if (host.w?.launchContext?.storage === "mirror" && host.w.launchContext.owner === owner) {
    const initial = host.w.launchContext.path;
    path.value = initial;
    queueMicrotask(() => {
      if (valid()) void open(initial);
    });
  }

  return {
    element: body,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      clearWatch();
      windowObserver?.disconnect();
      window.removeEventListener("blur", suspend);
      document.removeEventListener("visibilitychange", visibility);
      soundEnabled = false;
      try {
        audio?.close?.();
      } catch {}
      audio = null;
      buttons.length = 0;
      body.replaceChildren();
    },
  };
}
