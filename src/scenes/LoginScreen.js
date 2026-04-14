//fake login screen for testing purposes

import Phaser from "phaser";

export default class LoginScreen extends Phaser.Scene {
  constructor() {
    // This key MUST match what you put in this.scene.start("LoginScreen")
    super("LoginScreen");
    
    // Check localStorage first! If it's null (first time playing), default to ""
    this.formData = {
      username: localStorage.getItem("game_username") || "",
      firstName: localStorage.getItem("game_firstName") || "",
      lastName: localStorage.getItem("game_lastName") || "",
      sectionNumber: localStorage.getItem("game_section") || ""
    };
    
    // Track which box is currently selected
    this.activeField = "username"; 
    
    // Ordered array of fields so we can cycle through them with the Tab key
    this.fieldOrder = ["username", "firstName", "lastName", "sectionNumber"];
    
    // Will hold the UI text/box objects for easy updating
    this.uiElements = {};
  }

  create() {
    const { width, height } = this.scale;

    // --- Background & Title ---
    this.add.rectangle(0, 0, width, height, 0x2b2b2b).setOrigin(0, 0).setDepth(0);
    this.add.text(width / 2, height * 0.12, "LOGIN TESTING", {
      fontSize: "48px", color: "#dcc89f", fontFamily: '"Jersey 10", sans-serif'
    }).setOrigin(0.5).setDepth(1);

    // --- Back Button ---
    const backBtn = this.add.text(30, 30, "< Back", {
        fontSize: "32px", color: "#dcc89f", fontFamily: '"Jersey 10", sans-serif'
    }).setInteractive({ useHandCursor: true }).setDepth(2);

    backBtn.on("pointerdown", () => {
        if ((this.game.sfxVolume ?? this.sound.volume) > 0) this.sound.play("selection");
        this.scene.start("SettingsScene"); 
    });
    backBtn.on("pointerover", () => backBtn.setColor("#ffffff"));
    backBtn.on("pointerout", () => backBtn.setColor("#dcc89f"));

    // --- Helper Function to Create Input Fields ---
    const createInput = (y, labelText, key) => {
      // Label
      this.add.text(width / 2 - 200, y - 45, labelText, {
        fontSize: "24px", color: "#ffffff", fontFamily: '"Jersey 10", sans-serif'
      }).setOrigin(0, 0.5).setDepth(1);

      // White Input Box
      const box = this.add.rectangle(width / 2, y, 400, 50, 0xeeeeee)
        .setInteractive({ useHandCursor: true }).setDepth(1);
      
      // The Typed Text
      const text = this.add.text(width / 2 - 180, y, "", {
        fontSize: "28px", color: "#000000", fontFamily: 'monospace'
      }).setOrigin(0, 0.5).setDepth(2);

      // Click to focus
      box.on("pointerdown", () => {
        this.activeField = key;
        this._updateUI();
      });

      // Store references so we can update them later
      this.uiElements[key] = { box, text };
    };

    // --- Generate the 4 Fields ---
    createInput(height * 0.30, "Username", "username");
    createInput(height * 0.45, "First Name:", "firstName");
    createInput(height * 0.60, "Last Name:", "lastName");
    createInput(height * 0.75, "Section Number:", "sectionNumber");

    // --- Blinking Cursor ---
    this.cursor = this.add.rectangle(0, 0, 3, 30, 0x000000).setDepth(2);
    this.tweens.add({ targets: this.cursor, alpha: 0, duration: 400, yoyo: true, repeat: -1 });

    // --- Submit Button ---
    this.submitBtn = this.add.rectangle(width / 2, height * 0.88, 200, 60, 0x7f1a02)
      .setStrokeStyle(3, 0xdcc89f).setInteractive({ useHandCursor: true }).setDepth(1);
    
    this.submitText = this.add.text(width / 2, height * 0.88, "SEND TO SERVER", {
      fontSize: "32px", color: "#dcc89f", fontFamily: '"Jersey 10", sans-serif'
    }).setOrigin(0.5).setDepth(2);

    this.submitBtn.on("pointerdown", () => {
        if ((this.game.sfxVolume ?? this.sound.volume) > 0) this.sound.play("selection");
        this._sendToServer();
    });
    this.submitBtn.on("pointerover", () => this.submitBtn.setFillStyle(0xa8321a));
    this.submitBtn.on("pointerout", () => this.submitBtn.setFillStyle(0x7f1a02));

    // Status text for showing network results
    this.statusText = this.add.text(width / 2, height * 0.96, "", {
      fontSize: "24px", color: "#ffffff", fontFamily: '"Jersey 10", sans-serif'
    }).setOrigin(0.5).setDepth(1);

    // --- Keyboard Listener ---
    this.input.keyboard.on('keydown', this._handleKeydown, this);

    // Initialize UI state
    this._updateUI();
  }

  _handleKeydown(event) {
    // Ignore keyboard input if a modifier key is pressed (like Cmd+R to refresh)
    if (event.ctrlKey || event.metaKey) return; 
    
    if (event.key === " ") event.preventDefault(); // Stop page scrolling

    // Handle Tab key to cycle through fields
    if (event.key === "Tab") {
      event.preventDefault();
      const currentIndex = this.fieldOrder.indexOf(this.activeField);
      const nextIndex = (currentIndex + 1) % this.fieldOrder.length;
      this.activeField = this.fieldOrder[nextIndex];
      this._updateUI();
      return;
    }

    if (event.key === "Enter") {
      this._sendToServer();
      return;
    }

    // Handle Typing and Backspace
    let currentText = this.formData[this.activeField];

    if (event.key === "Backspace") {
      this.formData[this.activeField] = currentText.slice(0, -1);
    } 
    // Accept standard typing characters (length 1)
    else if (event.key.length === 1) {
      if (currentText.length < 25) { // Max character limit to prevent overflowing box
        this.formData[this.activeField] += event.key;
      }
    }

    this._updateUI();
  }

  _updateUI() {
    // 1. Update all text fields and reset borders
    this.fieldOrder.forEach(key => {
      const element = this.uiElements[key];
      element.text.setText(this.formData[key]);
      element.box.setStrokeStyle(0); // Remove border from inactive boxes
    });

    // 2. Highlight the active box
    const activeElement = this.uiElements[this.activeField];
    activeElement.box.setStrokeStyle(4, 0x7f1a02);

    // 3. Move the cursor to the end of the active text
    this.cursor.setPosition(
      activeElement.text.x + activeElement.text.width + 4, 
      activeElement.text.y
    );
  }

  // --- THE BACKEND CONNECTION ---
  // --- THE BACKEND CONNECTION ---
  async _sendToServer() {
    const { username, firstName, lastName, sectionNumber } = this.formData;
    
    if (!username || !firstName || !lastName || !sectionNumber) {
      this.statusText.setText("Error: All fields must be filled!").setColor("#ff0000");
      return;
    }

    this.statusText.setText("Connecting to server...").setColor("#ffff00");

    const payload = {
      username: username,      
      first_name: firstName,
      last_name: lastName,       
      section: sectionNumber,    
      timestamp: new Date().toISOString()
    };

    try {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const apiBase = isLocal ? "http://localhost:8000" : "https://accounting-game.cse.eng.auburn.edu/api"; 
        const backendURL = `${apiBase}/saml/login`;
      
        const response = await fetch(backendURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // Important for cookies/session
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const responseData = await response.json();
            
            if (responseData.status === 'success') {
                // Visual feedback only - no automatic scene start
                this.statusText.setText("Success! Profile Updated.").setColor("#00ff00");
                this.submitText.setText("DATA SAVED"); // Feedback on the button itself

                // Save to localStorage
                localStorage.setItem("game_username", username);
                localStorage.setItem("game_firstName", firstName);
                localStorage.setItem("game_lastName", lastName);
                localStorage.setItem("game_section", sectionNumber);

                // Save to global game state for Leaderboard.js initials/section filtering
                this.game.userSection = sectionNumber; 
                this.game.userUsername = username; 

            } else {
                this.statusText.setText(`Login Failed: ${responseData.message}`).setColor("#ff0000");
            }
        } else {
            this.statusText.setText(`Server Error: ${response.status}`).setColor("#ff0000");
        }
    } catch (error) {
        console.error("Network error:", error);
        this.statusText.setText("Network error! Is your backend running?").setColor("#ff0000");
    }
  }
}
