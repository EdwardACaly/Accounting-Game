import { Scene } from "phaser";

export default class AdminDash extends Scene {
    constructor() {
        super("AdminDash");
    }

    create() {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0a1a2a).setOrigin(0);
        this.infoArea = null;

        this.add.text(this.scale.width / 2, 40, "Global Admin Panel", {
            fontSize: "42px", fontFamily: '"Jersey 10", sans-serif', color: "#dcc89f"
        }).setOrigin(0.5);

        // Header Buttons
        const sections = ["001", "002", "003"];
        sections.forEach((id, index) => {
            this.createSmallBtn(150 + (index * 150), 100, `Sec ${id}`, () => this.showSection(id));
        });

        // Global Stats Button
        this.createSmallBtn(650, 100, "GLOBAL STATS", () => this.showGlobal());

        // Return Button
        this.createSmallBtn(this.scale.width / 2, this.scale.height - 50, "Return to Student View", () => {
            this.scene.start("MainMenuScene");
        });
    }

    async showGlobal() {
        if (this.infoArea) this.infoArea.destroy();
        
        const response = await fetch(`http://accounting-game.cse.eng.auburn.edu/api/stats/admin/global-tops`);
        const data = await response.json();

        let str = "GLOBAL TOP SCORES\n\n";
        data.forEach(item => {
            str += `${item.game}: ${item.score} - ${item.student} (Sec ${item.section})\n`;
        });

        this.infoArea = this.add.text(this.scale.width / 2, 300, str, { fontSize: "18px", color: "#00ff00" }).setOrigin(0.5);

        // Global Download
        this.createSmallBtn(this.scale.width / 2, 450, "Download Global CSV", () => {
            window.open(`http://accounting-game.cse.eng.auburn.edu/api/stats/admin/global-tops/csv`, "_blank");
        });
    }

    async showSection(id) {
        if (this.infoArea) this.infoArea.destroy();
        const res = await fetch(`http://accounting-game.cse.eng.auburn.edu/api/stats/section/${id}`);
        const data = await res.json();
        
        this.infoArea = this.add.text(this.scale.width / 2, 300, `Section ${id} Loaded.\nRecords: ${data.student_breakdown.length}`, { color: "#ffffff" }).setOrigin(0.5);
    }

    createSmallBtn(x, y, label, callback) {
        return this.add.text(x, y, label, {
            fontSize: "20px", backgroundColor: "#333", padding: 5
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on("pointerdown", callback);
    }
}