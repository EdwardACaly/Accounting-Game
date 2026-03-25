import { Scene } from "phaser";

const DEFAULT_SETTINGS = {
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
        
        this.volume = parseFloat(localStorage.getItem("volume"));
        if (isNaN(this.volume)) this.volume = DEFAULT_SETTINGS.volume;

        this.game.sfxVolume = Math.max(0, Math.min(1, this.volume));

        // Settings panel constants
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

        // Standard Button Creator
        const createButton = (x, y, labelText, onClick) => {
            const border = this.add.rectangle(0, 0, 129, 54, 0x7f1a02).setDepth(3);
            border.setStrokeStyle(3, 0xdcc89f);
            const rect = this.add.rectangle(0, 0, 125, 50, 0x7f1a02).setDepth(3);
            const label = this.add.text(0, 0, labelText, {
                fontSize: "24px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#dcc89f",
                align: "center",
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
                this.tweens.add({
                    targets: button,
                    scale: 0.9,
                    duration: 80,
                    yoyo: true,
                    ease: "Power1",
                    onComplete: onClick
                });
            });
            return button;
        };

        // 1. Exit Button (Top Left)
        createButton(panelX - panelWidth / 2 + 72.5,
                     panelY - panelHeight / 2 + 35,
                     "Exit",
                     () => this.scene.start("MainMenuScene"));

        // 2. Volume Section (Upper Mid)
        const volumeY = panelY - 60;
        this.add.text(panelX - 180, volumeY, "Volume", {
            fontFamily: '"Jersey 10", sans-serif',
            fontSize: "42px",
            color: "#dcc89f",
        }).setOrigin(0.5);

        this.volumeSlider = this.createVolumeSlider(panelX - 60, volumeY - 20);

        this.volumeDisplay = this.add.text(panelX + 210, volumeY, `${(this.volume * 100).toFixed(0)}%`, {
            fontFamily: '"Jersey 10", sans-serif',
            fontSize: "42px",
            color: "#dcc89f",
        }).setOrigin(0.5);

        // 3. Login Test Button (Center)
        createButton(panelX, panelY + 20, "Login Test", () => {
            this.scene.start("LoginScreen");
        });

        // 4. View Switching Row (Bottom)
        const footerY = panelY + panelHeight / 2 - 60;
        const spacing = 160;

        createButton(panelX - spacing, footerY, "Student", () => this.scene.start("MainMenuScene"));
        createButton(panelX, footerY, "Professor", () => this.scene.start("ProfessorDashScene"));
        createButton(panelX + spacing, footerY, "Admin", () => this.scene.start("AdminDashScene"));

        // Keyboard Shortcuts
        this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this._escKey.on("down", () => this.scene.start("MainMenuScene"));
    }

    createVolumeSlider(x, y) {
        const slider = this.add.dom(x, y).createFromHTML(`
            <input type="range" min="0" max="100" value="${this.volume * 100}" style="width: 220px;">
        `);
        slider.setOrigin(0, 0);
        slider.addListener("input");
        slider.on("input", (event) => {
            this.volume = parseFloat(event.target.value) / 100;
            this.updateVolume();
        });
        return slider;
    }

    updateVolume() {
        if (this.volumeDisplay) {
            this.volumeDisplay.setText(`${(this.volume * 100).toFixed(0)}%`);
        }
        localStorage.setItem("volume", this.volume);
        if (this.game.musicManager) this.game.musicManager.setVolume(this.volume);
        this.game.sfxVolume = Math.max(0, Math.min(1, this.volume));
    }
}