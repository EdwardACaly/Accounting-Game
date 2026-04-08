import { Scene } from "phaser";

export default class AdminDash extends Scene {
    constructor() {
        super("AdminDash");
        this.statsContainer = null;
    }

    create() {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x550000).setOrigin(0);

        this.add.text(this.scale.width / 2, 40, "Global Admin Panel", {
            fontSize: "42px", fontFamily: '"Jersey 10", sans-serif', color: "#dcc89f"
        }).setOrigin(0.5);

        // --- Persistent Header Buttons ---
        const sections = ["001", "002", "003"];
        sections.forEach((id, index) => {
            this.createSmallBtn(100 + (index * 110), 100, `Sec ${id}`, () => 
                this.loadData(`/api/stats/section/${id}`, `Section ${id}`, "section"));
        });

        this.createSmallBtn(480, 100, "GLOBAL TOPS", () => 
            this.loadData(`/api/stats/admin/global-tops`, "Global Rankings", "global"));

        this.createSmallBtn(680, 100, "ALL STUDENTS", () => 
            this.loadData(`/api/stats/admin/all-students`, "Complete Roster", "all"));

        // Return Button (Bottom)
        this.createSmallBtn(this.scale.width / 2, this.scale.height - 40, "Return to Student View", () => {
            this.scene.start("MainMenuScene");
        });
    }

    async loadData(endpoint, titleLabel, type) {
        if (this.statsContainer) {
            this.statsContainer.destroy();
            this.input.off('wheel'); 
        }

        // Move the container slightly lower so the Title (at -60) stays within the mask
        this.statsContainer = this.add.container(this.scale.width / 2, 220);

        try {
            const response = await fetch(`http://accounting-game.cse.eng.auburn.edu${endpoint}`);
            const data = await response.json();

            let yOffset = 0;
            const rowSpacing = 30;

            // Title is now at -60 relative to container Y (220), putting it at screen Y=160
            const header = this.add.text(0, -60, `--- ${titleLabel} ---`, { 
                fontSize: "24px", color: "#dcc89f", fontFamily: '"Jersey 10", sans-serif' 
            }).setOrigin(0.5);
            this.statsContainer.add(header);

            // 2. DATA RENDERING
            if (type === "global") {
                data.forEach(item => {
                    const row = `${item.game.padEnd(8)} | ${item.score.toString().padStart(5)} | ${item.student.padEnd(15)} (Sec ${item.section})`;
                    this.statsContainer.add(this.add.text(0, yOffset, row, { fontFamily: "Courier", fontSize: "16px", color: "#ffffff" }).setOrigin(0.5));
                    yOffset += rowSpacing;
                });
            } else if (type === "all") {
                // Fix: 'all-students' returns a direct list [], not a dictionary
                data.forEach(s => {
                    const row = `S${s.section} | ${s.name.padEnd(12)} | ${s.game.padEnd(8)} | Avg: ${s.avg.toFixed(0)} | T: ${s.top} | Time Played: ${String(s.time_played).padStart(4)}s`;
                    this.statsContainer.add(this.add.text(0, yOffset, row, { fontFamily: "Courier", fontSize: "14px", color: "#ffffff" }).setOrigin(0.5));
                    yOffset += rowSpacing;
                });
            } else {
                // Section view uses .student_breakdown
                data.student_breakdown.forEach(s => {
                    const row = `${s.name.padEnd(15)} | ${s.game.padEnd(8)} | Avg: ${s.avg.toFixed(0)} | T: ${s.top} | B: ${s.bottom} | Time Played: ${String(s.time_played).padStart(4)}s`;
                    this.statsContainer.add(this.add.text(0, yOffset, row, { fontFamily: "Courier", fontSize: "15px", color: "#ffffff" }).setOrigin(0.5));
                    yOffset += rowSpacing;
                });
            }

            this.setupScrolling(yOffset);

            if (this.downloadBtn) this.downloadBtn.destroy();
            this.downloadBtn = this.createSmallBtn(this.scale.width - 80, 100, "CSV", () => {
                window.open(`http://accounting-game.cse.eng.auburn.edu${endpoint}/csv`, "_blank");
            });

        } catch (e) {
            console.error("Admin fetch failed", e);
        }
    }

    setupScrolling(contentHeight) {
        const maskVisibleHeight = 300; // Increased height
        const maskY = 150; // Started higher to include the title
        const startY = 220;

        const maskShape = this.make.graphics();
        // Mask covers area from Y=150 to Y=450
        maskShape.fillRect(this.scale.width / 2 - 375, maskY, 750, maskVisibleHeight);
        this.statsContainer.setMask(maskShape.createGeometryMask());

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (this.statsContainer) {
                this.statsContainer.y -= deltaY * 0.5; 
                const minScroll = startY - Math.max(0, contentHeight - (maskVisibleHeight - 60));
                this.statsContainer.y = Phaser.Math.Clamp(this.statsContainer.y, minScroll, startY);
            }
        });
    }

    createSmallBtn(x, y, label, callback) {
        return this.add.text(x, y, label, {
		fontSize: "18px", fontFamily: '"Jersey 10", sans-serif', color: "#dcc89f", backgroundColor: "#7f1a02", padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on("pointerdown", callback);
    }
}
