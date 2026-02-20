import * as XLSX from "xlsx";
import BaseGM3Scene from "./BaseGM3Scene";

export default class GM3Level1 extends BaseGM3Scene {
  constructor() {
    super("GM3Level1", { title: "", level: 1, timeLimit: 90 });
    this.currentIndex = 0;
    this.questions = [];
    
    //ORIGINAL CODE:
    // this.currentCorrect = -1;
    // this._uiNodes = [];
    
    // NEW CODE:
    //We keep currentCorrect around just in case, but add variables to handle text input states
    this.currentCorrect = -1; 
    this.currentInput = "";         // Stores the player's current typed numbers
    this.acceptingInput = false;    // Acts as a gatekeeper so players can't type during countdowns or feedback
    this._uiNodes = [];
    
    this.score = 0; // start score at 0 -> shows as POINTS: 0000
  }

  preload() {
    this.load.binary("gm3_easy_xlsx", "assets/UpdatedAccountingElements.xlsx");
    this.load.image("gm3_level1_bg", "assets/level1.jpg");
  }

  onTimeUp() { this._finishToGameOver("timeup"); }

  _finishToGameOver(reason = "completed") {
    if (this.timerEvent) this.timerEvent.remove(false);
    
    // NEW CODE: 
    // Clean up the keyboard listener so it doesn't carry over into the GameOver scene
    this.input.keyboard.off('keydown'); 
    
    this.scene.start("GameOverScene", { score: this.score, mode: "GM3-Level1", reason });
  }

  buildLevel() {
    this.sound.play("game3", { loop: true, volume: this.game.sfxVolume ?? 1 });
    const buf = this.cache.binary.get("gm3_easy_xlsx");
    if (!buf) return this._failAndBack("Excel file not found.");

    const wb = XLSX.read(buf, { type: "array", cellStyles: true, cellHTML: true });
    const sheetName = wb.SheetNames.find(n => n.trim().toLowerCase() === "a=l+se - easy".toLowerCase());
    if (!sheetName) return this._failAndBack("Sheet 'A=L+SE - Easy' not found.");
    const sh = wb.Sheets[sheetName];

    // --- Extract ALL questions (no cap); no repeats by shuffling once ---
    const rows = [];
    let emptyStreak = 0;
    const MAX_SCAN_ROWS = 2000;

    for (let r = 4; r <= MAX_SCAN_ROWS; r++) {
      const qCell = sh[`F${r}`], gCell = sh[`G${r}`], hCell = sh[`H${r}`], iCell = sh[`I${r}`], jCell = sh[`J${r}`], kCell = sh[`K${r}`];
      const question = this._getCellText(qCell);
      const A = this._getCellText(gCell), B = this._getCellText(hCell), C = this._getCellText(iCell), D = this._getCellText(jCell);
      const allBlank = (!question && !A && !B && !C && !D);
      if (allBlank) {
        emptyStreak++; if (emptyStreak >= 10) break; else continue;
      } else emptyStreak = 0;

      let correctIndex = this._fromKCell(kCell);
      if (correctIndex === -1) correctIndex = this._detectGoodGreen([gCell, hCell, iCell, jCell]);
      if (correctIndex === -1) continue;

      // ORIGINAL CODE:
      // rows.push({ question, answers: [A, B, C, D], correctIndex });

      // NEW CODE:
      //We grab the correct answer based on the index, then strip out anything that isn't a number 0-9
      //so we can compare it strictly against the player's numerical typing.
      //we don't want the player to be able to type anything other than numbers 
      const answersRaw = [A, B, C, D];
      const rawCorrectText = answersRaw[correctIndex] || "";
      const numericCorrect = rawCorrectText.replace(/[^0-9]/g, ''); 
      rows.push({ question, correctAnswer: numericCorrect, originalAnswers: answersRaw });
    }

    if (!rows.length) return this._failAndBack("No valid questions found in the sheet.");

    Phaser.Utils.Array.Shuffle(rows);
    this.questions = rows; // use ALL questions; single pass => no repeats

    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "gm3_level1_bg")
      .setOrigin(0.5).setDisplaySize(width, height).setDepth(0);

    // --- HUD: SCORE top-left, TIMER top-right ---
    if (!this.scoreText) {
      this.scoreText = this.add.text(20, 16, "", {
        fontSize: "40px",
        color: "#dcc89f",
        fontFamily: '"Jersey 10", sans-serif',
      }).setDepth(6).setOrigin(0, 0).setStroke("#7f1a02", 3);
    } else {
      this.scoreText.setPosition(20, 2).setOrigin(0, 0)
        .setFontFamily('"Jersey 10", sans-serif').setFontSize(40)
        .setColor("#dcc89f").setStroke("#7f1a02", 3).setDepth(6);
    }
    this._updateScoreUI();

    if (!this.timerText) {
      this.timerText = this.add.text(width - 20, 16, "", {
        fontSize: "40px",
        color: "#dcc89f",
        fontFamily: '"Jersey 10", sans-serif',
      }).setDepth(6).setOrigin(1, 0).setStroke("#7f1a02", 3);
    } else {
      this.timerText.setPosition(width - 20, 2).setOrigin(1, 0)
        .setFontFamily('"Jersey 10", sans-serif').setFontSize(40)
        .setColor("#dcc89f").setStroke("#7f1a02", 3).setDepth(6);
    }
    if (typeof this.timeLeft !== "number") this.timeLeft = 90;
    this._updateTimerUI();

    // Question text
    const qWrapW = Math.min(560, Math.floor(width * 0.6));
    this.qText = this.add.text(width / 2, height * 0.26, "", {
      fontSize: "30px",
      color: "#7f1a02",
      fontFamily: '"Jersey 10", sans-serif',
      wordWrap: { width: qWrapW, useAdvanced: true },
      align: "center",
    }).setOrigin(0.5).setDepth(6);

    // ORIGINAL CODE: (Multiple Choice 2x2 Grid)
    /*
    const cols = 2, totalBoxes = 4;
    const gridWidth = width * 0.8;
    const boxW = gridWidth / cols - 40;
    const boxH = 84;
    const startX = width / 2 - gridWidth / 2 + boxW / 2;
    const startY = height * 0.64;
    const xGap = boxW + 80;
    const yGap = 110;

    const makeAnswer = (idx) => {
      const rect = this.add.rectangle(0, 0, boxW, boxH, 0xdcc89f)
        .setStrokeStyle(3, 0x7f1a02).setInteractive({ useHandCursor: true }).setDepth(5);
      rect.on("pointerover", () => rect.setFillStyle(0xf5deb3));
      rect.on("pointerout", () => rect.setFillStyle(0xdcc89f));
      rect.on("pointerdown", () => this._chooseAnswer(idx));
      const txt = this.add.text(0, 0, "", {
        fontSize: "35px",
        color: "#7f1a02",
        fontFamily: '"Jersey 10", sans-serif',
        wordWrap: { width: boxW - 32 },
        align: "center",
      }).setOrigin(0.5).setDepth(6);
      return { rect, txt };
    };

    this.ansNodes = [makeAnswer(0), makeAnswer(1), makeAnswer(2), makeAnswer(3)];

    for (let i = 0; i < totalBoxes; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * xGap;
      const y = startY + row * yGap;
      this.ansNodes[i].rect.setPosition(x, y);
      this.ansNodes[i].txt.setPosition(x, y);
    }
    */

    // NEW CODE: (Single Text Input Box)
    // We create a center-aligned box and text object to display what the user types.
    // We also add a feedback text object to tell them if they are right or wrong.
    const inputBoxW = 400;
    const inputBoxH = 80;
    
    this.inputBox = this.add.rectangle(width / 2, height * 0.55, inputBoxW, inputBoxH, 0xdcc89f)
      .setStrokeStyle(4, 0x7f1a02).setDepth(5);

    this.inputText = this.add.text(width / 2, height * 0.55, "", {
      fontSize: "48px", color: "#7f1a02", fontFamily: '"Jersey 10", sans-serif',
    }).setOrigin(0.5).setDepth(6);

    this.feedbackText = this.add.text(width / 2, height * 0.68, "", {
      fontSize: "36px", color: "#7f1a02", fontFamily: '"Jersey 10", sans-serif', align: "center"
    }).setOrigin(0.5).setDepth(6).setAlpha(0);

    //blinking cursor effect
    // Create a 4px wide, 40px tall rectangle to act as the cursor
    this.cursor = this.add.rectangle(width / 2 + 4, height * 0.55, 4, 40, 0x7f1a02).setDepth(6).setAlpha(0);
    this.tweens.add({
      targets: this.cursor,
      alpha: 1,
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    // Floating +100
    this.plusTextAnchor = { x: width / 2, y: height * 0.51 };
    this.plusText = this.add.text(this.plusTextAnchor.x, this.plusTextAnchor.y, "+100", {
      fontSize: "48px",
      color: "#dcc89f",
      fontFamily: '"Jersey 10", sans-serif',
    }).setOrigin(0.5).setDepth(15).setStroke("#7f1a02", 3).setAlpha(0);

    // Hide gameplay UI until start
    // ORIGINAL CODE:
    /*
    this._uiNodes = [
      this.qText,
      this.timerText,
      this.scoreText,
      ...this.ansNodes.flatMap(n => [n.rect, n.txt]),
    ];
    */

    // NEW CODE: Include the new input elements in the UI tracking array instead of ansNodes
    this._uiNodes = [
      this.qText, this.timerText, this.scoreText, 
      this.inputBox, this.inputText, this.feedbackText, this.cursor
    ];
    
    this._setGameplayUIVisible(false);

    // NEW CODE: Bind the keyboard listener for typing
    this.input.keyboard.on('keydown', this._handleKeydown, this);

    this.currentIndex = 0;
    this._showCurrent(false);

    // Persistent start card
    this._showPreStartCard();
  }

  //NEW CODE BLOCK: Keyboard handling logic
  //Listens for numbers, backspace, and the enter key to submit.
  _handleKeydown(event) {
    if (!this.acceptingInput) return; // Ignore typing if not ready

    if (event.key === "Backspace") {
      // Remove the last character
      this.currentInput = this.currentInput.slice(0, -1);
    } else if (event.key === "Enter") {
      // Only submit if they actually typed something
      if (this.currentInput.length > 0) this._submitAnswer();
    } else if (/^[0-9]$/.test(event.key)) {
      // Regex ensures ONLY numbers 0-9 are added to the string
      this.currentInput += event.key;
    }
    
    // Update the visual text on screen
    this.inputText.setText(this.currentInput);
    //cursor 
    this.cursor.x = this.inputText.x + (this.inputText.width / 2) + 4;
  }

  //NEW CODE BLOCK: Submitting and validating the answer
  //Compares the typed input against the purely numeric correct answer from the Excel sheet.
  _submitAnswer() {
    this.acceptingInput = false; // Stop them from typing while feedback is showing
    
    //hide the cursor while feedback is up
    this.cursor.setVisible(false);

    const item = this.questions[this.currentIndex];
    
    if (this.currentInput === item.correctAnswer) {
      this.onScored(100);
      this._updateScoreUI();
      this._showPlus100();
      this.inputBox.setStrokeStyle(4, 0x2e7d32); // Turn box border green
      this.feedbackText.setText("Correct!").setColor("#2e7d32").setAlpha(1);
    } else {
      this.inputBox.setStrokeStyle(4, 0x8b0000); // Turn box border red
      this.feedbackText.setText(`Incorrect!\nCorrect answer: ${item.correctAnswer}`).setColor("#8b0000").setAlpha(1);
    }

    // Delay so they can read the feedback, then automatically advance to next question
    this.time.delayedCall(1000, () => {
      this.currentIndex++;
      this._showCurrent(true);
    });
  }

  // --- Pre-start beige card with perfectly aligned button hitbox (Level 1) ---
  _showPreStartCard() {
    if (this.timerEvent) { this.timerEvent.remove(false); this.timerEvent = null; }
    this._uiNodes?.forEach(n => n && n.setVisible(false));
    this.input.enabled = true;

    const { width, height } = this.scale;

    // Block background clicks
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.25)
      .setDepth(998)
      .setInteractive()
      .setScrollFactor(0);

    // Card (no scale to avoid pointer math issues)
    const card = this.add.container(width / 2, height / 2)
      .setDepth(999)
      .setAlpha(0)
      .setScrollFactor(0);

    const panelW = Math.min(720, Math.floor(width * 0.86));
    const panelH = 220;
    const BEIGE = 0xF5DEB3, BROWN = 0x7f1a02, ACCENT = 0xdcc89f;

    const g = this.add.graphics();
    g.lineStyle(6, BROWN, 1);
    g.fillStyle(BEIGE, 1);
    g.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 18);
    g.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 18);
    card.add(g);

    const title = this.add.text(0, -40, "Solve the accounting equation", {
      fontSize: "44px",
      color: "#7f1a02",
      fontFamily: '"Jersey 10", sans-serif',
      align: "center",
      wordWrap: { width: panelW - 40, useAdvanced: true },
    }).setOrigin(0.5);
    card.add(title);

    // Start button (rectangle is the ONLY interactive target)
    const btnW = 240, btnH = 72, btnY = 50;

    const btnRect = this.add.rectangle(0, btnY, btnW, btnH, BROWN)
      .setOrigin(0.5)
      .setStrokeStyle(4, ACCENT)
      .setDepth(1)
      .setInteractive({ useHandCursor: true }); // default hit area = exact rect

    const btnTxt = this.add.text(0, btnY, "Start", {
      fontSize: "38px",
      color: "#dcc89f",
      fontFamily: '"Jersey 10", sans-serif',
    }).setOrigin(0.5).setDepth(2);

    card.add([btnRect, btnTxt]);

    const hoverIn = () => {
      this.tweens.add({ targets: [btnRect, btnTxt], scale: 1.08, duration: 120, ease: "Quad.easeOut" });
      btnRect.setFillStyle(0x9b2d05);
      this.input.setDefaultCursor("pointer");
    };
    const hoverOut = () => {
      this.tweens.add({ targets: [btnRect, btnTxt], scale: 1.0, duration: 120, ease: "Quad.easeOut" });
      btnRect.setFillStyle(BROWN);
      this.input.setDefaultCursor("default");
    };
    const startNow = () => {
      btnRect.disableInteractive();
      this.tweens.add({
        targets: [card, overlay],
        alpha: 0,
        duration: 200,
        ease: "Quad.easeOut",
        onComplete: () => {
          card.destro