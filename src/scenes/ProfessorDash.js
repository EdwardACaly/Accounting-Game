import { Scene } from "phaser";

export default class ProfessorDash extends Scene {
    constructor() {
        super("ProfessorDash");
    }

    create() {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x1a1a1a).setOrigin(0);
        this.dataText = null; // Container for the stats text

        // Title
        this.add.text(this.scale.width / 2, 50, "Professor Dashboard", {
            fontSize: "42px", fontFamily: '"Jersey 10", sans-serif', color: "#dcc89f"
        }).setOrigin(0.5);

        // Section Selection Buttons
        const sections = ["001", "002", "003"];
        sections.forEach((id, index) => {
            this.createTabButton(200 + (index * 200), 120, `Section ${id}`, () => this.loadSectionData(id));
        });

        // Return Button (Bottom)
        this.createTabButton(this.scale.width / 2, this.scale.height - 50, "Return to Student View", () => {
            this.scene.start("MainMenuScene");
        });
    }

    async loadSectionData(sectionId) {
        // Clear previous data display
        if (this.dataText) this.dataText.destroy();
        
        try {
            const response = await fetch(`http://accounting-game.cse.eng.auburn.edu/api/stats/section/${sectionId}`);
            const data = await response.json();

            // Basic display of the JSON information
            let displayString = `Viewing Section: ${sectionId}\n\n`;
            data.student_breakdown.slice(0, 5).forEach(s => {
                displayString += `${s.name}: Avg ${s.avg.toFixed(1)} | Top: ${s.top}\n`;
            });

            this.dataText = this.add.text(this.scale.width / 2, 300, displayString, {
                fontSize: "20px", fontFamily: "Courier", color: "#ffffff", align: "center"
            }).setOrigin(0.5);

            // Add Download Button specifically for this section
            this.createTabButton(this.scale.width / 2, 450, "Download CSV", () => {
                window.open(`http://accounting-game.cse.eng.auburn.edu/api/stats/section/${sectionId}/csv`, "_blank");
            });

        } catch (e) {
            console.error("Fetch failed", e);
        }
    }

    createTabButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontSize: "24px", fontFamily: '"Jersey 10", sans-serif',
            backgroundColor: "#7f1a02", padding: { x: 10, y: 5 }, color: "#dcc89f"
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on("pointerdown", callback);
        return btn;
    }
}