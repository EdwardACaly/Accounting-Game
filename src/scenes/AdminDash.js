import { Scene } from "phaser";

export class AdminDash extends Scene {
    constructor() {
        super("AdminDash");
    }

    create() {
        // Background (Different color so you can tell them apart instantly)
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0a1a2a).setOrigin(0);

        // Title
        this.add.text(this.scale.width / 2, 100, "Global Admin Dashboard", {
            fontSize: "48px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#dcc89f"
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, 160, "(Global Top Scores & All Sections)", {
            fontSize: "24px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#aaaaaa"
        }).setOrigin(0.5);

        // Back Button
        const backBtn = this.add.text(this.scale.width / 2, 500, "Back to Student View", {
            fontSize: "32px",
            fontFamily: '"Jersey 10", sans-serif',
            backgroundColor: "#7f1a02",
            padding: { x: 20, y: 10 },
            color: "#dcc89f"
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.scene.start("SettingsScene"));
    }
}