(() => {
      const board = document.querySelector("#board");
      const moveCount = document.querySelector("#moves");
      const minimumCount = document.querySelector("#minimum");
      const timerDisplay = document.querySelector("#timer");
      const message = document.querySelector("#message");
      const diskSelect = document.querySelector("#disk-count");
      const undoButton = document.querySelector("#undo");
      const newGameButton = document.querySelector("#new-game");
      const themeToggle = document.querySelector("#theme-toggle");
      const themeIcon = document.querySelector("#theme-icon");
      const themeLabel = document.querySelector("#theme-label");
      const pegNames = ["Start", "Helper", "Goal"];
      let towers;
      let selectedPeg = null;
      let moves = 0;
      let history = [];
      let elapsedSeconds = 0;
      let timerInterval = null;
      let gameComplete = false;

      function setTheme(theme) {
        const isDark = theme === "dark";
        document.body.dataset.theme = isDark ? "dark" : "light";
        themeToggle.setAttribute("aria-pressed", String(isDark));
        themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
        themeIcon.textContent = isDark ? "☀" : "☾";
        themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
        document.querySelector('meta[name="theme-color"]').content = isDark ? "#1d2723" : "#f5f1e8";
        localStorage.setItem("hanoi-theme", isDark ? "dark" : "light");
      }

      const savedTheme = localStorage.getItem("hanoi-theme");
      setTheme(savedTheme === "dark" ? "dark" : "light");
      themeToggle.addEventListener("click", () => {
        setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
      });

      function startGame() {
        const diskCount = Number(diskSelect.value);
        towers = [Array.from({ length: diskCount }, (_, index) => diskCount - index), [], []];
        selectedPeg = null;
        moves = 0;
        history = [];
        elapsedSeconds = 0;
        gameComplete = false;
        window.clearInterval(timerInterval);
        timerInterval = null;
        updateStats();
        setMessage("Choose a tower to pick up its top disk.");
        render();
      }

      function setMessage(text, isError = false) {
        message.textContent = text;
        message.classList.toggle("error", isError);
      }

      function updateStats() {
        moveCount.textContent = String(moves);
        minimumCount.textContent = String((2 ** Number(diskSelect.value)) - 1);
        const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
        const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
        timerDisplay.textContent = `${minutes}:${seconds}`;
        undoButton.disabled = history.length === 0 || gameComplete;
      }

      function startTimer() {
        if (timerInterval !== null) return;
        timerInterval = window.setInterval(() => {
          elapsedSeconds += 1;
          updateStats();
        }, 1000);
      }

      function render() {
        board.replaceChildren();
        const diskCount = Number(diskSelect.value);

        towers.forEach((tower, pegIndex) => {
          const peg = document.createElement("button");
          peg.type = "button";
          peg.className = "peg";
          peg.dataset.peg = String(pegIndex);
          peg.setAttribute("aria-label", `${pegNames[pegIndex]} tower, ${tower.length} ${tower.length === 1 ? "disk" : "disks"}${selectedPeg === pegIndex ? ", selected" : ""}`);
          peg.setAttribute("aria-pressed", String(selectedPeg === pegIndex));
          peg.disabled = gameComplete;
          if (selectedPeg === pegIndex) peg.classList.add("selected");

          const number = document.createElement("span");
          number.className = "peg-number";
          number.setAttribute("aria-hidden", "true");
          number.textContent = String(pegIndex + 1);

          const pole = document.createElement("span");
          pole.className = "tower";
          pole.setAttribute("aria-hidden", "true");

          const base = document.createElement("span");
          base.className = "base";
          base.setAttribute("aria-hidden", "true");

          const disks = document.createElement("span");
          disks.className = "disks";
          disks.setAttribute("aria-hidden", "true");
          tower.forEach((size, diskIndex) => {
            const disk = document.createElement("span");
            disk.className = "disk";
            disk.dataset.size = String(size);
            disk.style.width = `${Math.max(31, 94 - ((diskCount - size) * (54 / Math.max(1, diskCount - 1))))}%`;
            if (diskIndex === tower.length - 1) disk.classList.add("top-disk");
            disks.append(disk);
          });

          const name = document.createElement("span");
          name.className = "peg-name";
          name.textContent = pegNames[pegIndex];

          peg.append(number, pole, base, disks, name);
          peg.addEventListener("click", () => handlePegClick(pegIndex));
          peg.addEventListener("dragover", (event) => {
            if (selectedPeg !== null && selectedPeg !== pegIndex && isLegalMove(selectedPeg, pegIndex)) {
              event.preventDefault();
              peg.classList.add("drag-over");
            }
          });
          peg.addEventListener("dragleave", () => peg.classList.remove("drag-over"));
          peg.addEventListener("drop", (event) => {
            event.preventDefault();
            peg.classList.remove("drag-over");
            if (selectedPeg !== null) moveDisk(selectedPeg, pegIndex);
          });
          board.append(peg);
        });

        board.querySelectorAll(".disk.top-disk").forEach((disk) => {
          disk.draggable = !gameComplete;
          disk.addEventListener("dragstart", (event) => {
            const sourcePeg = disk.closest(".peg");
            selectedPeg = Number(sourcePeg.dataset.peg);
            sourcePeg.classList.add("selected");
            sourcePeg.setAttribute("aria-pressed", "true");
            sourcePeg.setAttribute("aria-label", `${pegNames[selectedPeg]} tower, ${towers[selectedPeg].length} disks, selected`);
            event.dataTransfer.setData("text/plain", sourcePeg.dataset.peg);
            event.dataTransfer.effectAllowed = "move";
          });
          disk.addEventListener("dragend", () => {
            board.querySelectorAll(".peg").forEach((peg) => peg.classList.remove("drag-over"));
          });
        });

        updateStats();
      }

      function isLegalMove(from, to) {
        if (from === to || towers[from].length === 0) return false;
        const movingDisk = towers[from][towers[from].length - 1];
        const targetDisk = towers[to][towers[to].length - 1];
        return targetDisk === undefined || movingDisk < targetDisk;
      }

      function handlePegClick(pegIndex) {
        if (gameComplete) return;

        if (selectedPeg === null) {
          if (towers[pegIndex].length === 0) {
            setMessage("That tower is empty. Choose one with a disk.", true);
            return;
          }
          selectedPeg = pegIndex;
          setMessage(`Top disk picked up. Choose where to move it.`);
          render();
          return;
        }

        if (selectedPeg === pegIndex) {
          selectedPeg = null;
          setMessage("Selection cleared. Choose a tower to pick up its top disk.");
          render();
          return;
        }

        moveDisk(selectedPeg, pegIndex);
      }

      function moveDisk(from, to) {
        if (!isLegalMove(from, to)) {
          selectedPeg = null;
          setMessage("A larger disk can't go on top of a smaller one. Try another tower.", true);
          render();
          return;
        }

        history.push({ from, to });
        towers[to].push(towers[from].pop());
        moves += 1;
        selectedPeg = null;
        startTimer();

        if (towers[2].length === Number(diskSelect.value)) {
          gameComplete = true;
          window.clearInterval(timerInterval);
          timerInterval = null;
          const minimumMoves = (2 ** Number(diskSelect.value)) - 1;
          setMessage(moves === minimumMoves
            ? `Perfect! You solved it in the fewest possible moves: ${moves}.`
            : `You did it! Solved in ${moves} moves. Can you beat ${minimumMoves}?`);
        } else {
          setMessage("Nice move. Keep going!");
        }
        render();
      }

      undoButton.addEventListener("click", () => {
        const previousMove = history.pop();
        if (!previousMove) return;
        towers[previousMove.from].push(towers[previousMove.to].pop());
        moves -= 1;
        selectedPeg = null;
        setMessage("Last move undone.");
        render();
      });

      newGameButton.addEventListener("click", startGame);
      diskSelect.addEventListener("change", startGame);
      startGame();
    })();
