import { Scene } from "phaser";

// Default settings if no localStorage
const DEFAULT_SETTINGS = {
    difficulty: 1,
    volume: 1.0,
};

export class SettingsScene extends Scene {
    constructor() {
        super("SettingsScene");
    }

    async create() {
        // --- Background ---
        this.add.image(0, 0, "home_bg")
            .setOrigin(0, 0)
            .setDisplaySize(this.scale.width, this.scale.height);
        this.add.image(0, 0, "home_fg")
            .setOrigin(0, 0)
            .setDisplaySize(this.scale.width, this.scale.height);
        
        // Load stored or default volume
        this.volume = parseFloat(localStorage.getItem("volume"));
        if (isNaN(this.volume)) this.volume = DEFAULT_SETTINGS.volume;

        // Store volume globally
        this.game.sfxVolume = Math.max(0, Math.min(1, this.volume));
        this.game.playSFX = (scene, key, config = {}) => {
            scene.sound.play(key, {
                ...config,
                volume: this.game.sfxVolume,
            });
        };

        // Sync music immediately
        if (this.game.musicManager) {
            this.game.musicManager.setVolume(this.game.sfxVolume);
        }

        // Settings panel
        const panelWidth = 750;
        const panelHeight = 500;
        const panelX = this.scale.width / 2;
        const panelY = this.scale.height / 2;

        const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0xa8321a)
            .setStrokeStyle(3, 0x570600);

        // Title
        this.add.text(panelX, panelY - panelHeight / 2 + 40, "Settings", {
            fontSize: "50px",
            fill: "#dcc89f",
            fontFamily: '"Jersey 10", sans-serif',
        }).setOrigin(0.5);

        // function to create a button
        const createButton = (x, y, labelText, onClick) => {
            const border = this.add.rectangle(0, 0, 129, 54, 0x7f1a02).setDepth(3);
            border.setStrokeStyle(3, 0xdcc89f);

            const rect = this.add.rectangle(0, 0, 125, 50, 0x7f1a02).setDepth(3);
            const label = this.add.text(0, 0, labelText, {
                fontSize: "30px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#dcc89f",
                align: "center",
                //wordWrap: { width: 90, useAdvancedWrap: true },  // wrap text within button width
            }).setOrigin(0.5).setDepth(3);

            const button = this.add.container(x, y, [border, rect, label]).setDepth(3);
            rect.setInteractive({ useHandCursor: true });

            rect.on("pointerover", () => {
                rect.setFillStyle(0xa8321a);
                this.tweens.add({ targets: button, scale: 1.05, duration: 150, ease: "Power1" });
            });
            rect.on("pointerout", () => {
                rect.setFillStyle(0x7f1a02);
                this.tweens.add({ targets: button, scale: 1, duration: 150, ease: "Power1" });
            });
            rect.on("pointerdown", () => {
                if ((this.game.sfxVolume ?? this.sound.volume) > 0) this.sound.play("selection");
                const tween = this.tweens.add({
                    targets: button,
                    scale: 0.9,
                    duration: 80,
                    yoyo: true,
                    ease: "Power1",
                });
                tween.once("complete", onClick);
            });

            return button;
        };

        // Exit button
        createButton(panelX - panelWidth / 2 + 72.5,
                     panelY - panelHeight / 2 + 35,
                     "Exit",
                     () => this.scene.start("MainMenuScene"));

        const buttonSpacing = 140;
        const labelX = panelWidth / 2 - 60;
        const settingX = panelWidth / 2 + 60;
        //const buttonRowY = panelY + panelHeight / 2 - 35;
        //const buttonStartX = panelX - ((modes.length - 1) * buttonSpacing) / 2;

        // Volume label
        this.add.text(labelX, panelHeight / 2 - 100, "Volume", {
            fontFamily: '"Jersey 10", sans-serif',
            fontSize: "42px",
            color: "#dcc89f",
            //fontStyle: "bold",
            //stroke: "#000000",
            //strokeThickness: 2,
        }).setOrigin(0.30);

        // Create Volume Slider
        this.volumeSlider = this.createVolumeSlider(settingX, panelHeight / 2 - 100);

        // Volume display
        this.volumeDisplay = this.add.text(settingX + 235, panelHeight / 2 - 100, `${(this.volume * 100).toFixed(0)}%`, {
            fontFamily: '"Jersey 10", sans-serif',
            fontSize: "42px",
            color: "#dcc89f",
        }).setOrigin(0.30);

        // Difficulty label
        this.add.text(labelX - 22, (panelHeight / 2 - 100) + 75, "Difficulty", {
            fontFamily: '"Jersey 10", sans-serif',
            fontSize: "42px",
            color: "#dcc89f",
        }).setOrigin(0.30);
        
        /*
        // Difficulty button
        const speeds = [
            { label: "Beginner", multiplier: 0.5 },
            { label: "Normal", multiplier: 1 },
            { label: "Advanced", multiplier: 2 },
        ];

        speeds.forEach((speed, i) => {
            this.createButton(
                width / 2,
                startY + i * spacing,
                speed.label,
                () => {
                if ((this.game?.sfxVolume ?? this.sound.volume) > 0)
                    this.sound.play("selection");

                // Stop menu music before gameplay
                this.game.musicManager?.stop();

                this.scene.start("MainScene", {
                    type: this.gameMode,
                    speedMultiplier: speed.multiplier
                });
                }
            );
        });

        // Difficulty button
        createButton(panelX - panelWidth / 2 + 72.5,
                     panelY - panelHeight / 2 + 35,
                     "Beginner",
                     () => this.scene.start("MainMenuScene"));
        */

        // ESC goes back
        this._escKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC
        );
        this._escKey.on("down", () => this.scene.start("MainMenuScene"));
    }

    createVolumeSlider(x, y) {
        const slider = this.add.dom(x, y).createFromHTML(`
            <input type="range" min="0" max="100" value="${
                this.volume * 100
            }" style="width: 200px;">
        `);
        slider.setOrigin(0, 0);

        slider.addListener("input");
        slider.on("input", (event) => {
            const val = parseFloat(event.target.value) / 100;
            this.volume = val;
            this.updateVolume();
        });

        return slider;
    }

    updateVolume() {
        // Update text
        if (this.volumeDisplay) {
            this.volumeDisplay.setText(
                `${(this.volume * 100).toFixed(0)}%`
            );
        }

        localStorage.setItem("volume", this.volume);

        if (this.game.musicManager) {
            this.game.musicManager.setVolume(this.volume);
        }
        this.game.sfxVolume = Math.max(0, Math.min(1, this.volume));

        this.sound.sounds.forEach((sfx) => {
            if (sfx.isPlaying) {
                sfx.setVolume(this.game.sfxVolume);
            }
        });
    }

    createStyledButton(x, y, label, styleOptions = {}) {
        const { backgroundColor = "#444", color = "#ffffff" } = styleOptions;

        return this.add
            .text(x, y, label, {
                fontFamily: "Arial",
                fontSize: "20px",
                color: color,
                backgroundColor: backgroundColor,
                padding: { x: 15, y: 8 },
            })
            .setOrigin(0.5)
            .setInteractive();
    }
}

