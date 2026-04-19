import { Scene } from "phaser";

export default class AdminDash extends Scene {
    constructor() {
        super("AdminDash");
        this.statsContainer = null;
    }

    create() {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0a1a2a).setOrigin(0);

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

        // clear data button
        this.createSmallBtn(880, 100, "CLEAR DATA", () => this.showClearConfirm());

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

        // game names for the 5 games, coming from spreadsheet
        const GAME_NAMES = {
            "game1":   "Db. vs. Cr.",
            "game2":   "Elements",
            "game3-1": "Balance",
            "game3-2": "Effects",
            "game3-3": "Errors",
        };

        // Move the container slightly lower so the Title (at -60) stays within the mask
        this.statsContainer = this.add.container(this.scale.width / 2, 220);

        try {
            const response = await fetch(`https://accounting-game.cse.eng.auburn.edu${endpoint}`);
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
                    const gameName = GAME_NAMES[item.game] || item.game;
                    const row = `${gameName.padEnd(12)} | ${item.score.toString().padStart(5)} | ${item.student.padEnd(15)} (Sec ${item.section})`;
                    this.statsContainer.add(this.add.text(0, yOffset, row, { fontFamily: "Courier", fontSize: "16px", color: "#ffffff" }).setOrigin(0.5));
                    yOffset += rowSpacing;
                });
            } else if (type === "all") {
                // Fix: 'all-students' returns a direct list [], not a dictionary
                data.forEach(s => {
                    const gameName = GAME_NAMES[s.game] || s.game;
                    const row = `S${s.section} | ${s.name.padEnd(12)} | ${gameName.padEnd(12)} | Avg: ${s.avg.toFixed(0)} | T: ${s.top}`;
                    this.statsContainer.add(this.add.text(0, yOffset, row, { fontFamily: "Courier", fontSize: "14px", color: "#00ff00" }).setOrigin(0.5));
                    yOffset += rowSpacing;
                });
            } else {
                // Section view uses .student_breakdown
                data.student_breakdown.forEach(s => {
                    const gameName = GAME_NAMES[s.game] || s.game;
                    const row = `${s.name.padEnd(15)} | ${gameName.padEnd(8)} | Avg: ${s.avg.toFixed(0)} | T: ${s.top} | B: ${s.bottom}`;
                    this.statsContainer.add(this.add.text(0, yOffset, row, { fontFamily: "Courier", fontSize: "15px", color: "#ffffff" }).setOrigin(0.5));
                    yOffset += rowSpacing;
                });
            }

            this.setupScrolling(yOffset);

            if (this.downloadBtn) this.downloadBtn.destroy();
            this.downloadBtn = this.createSmallBtn(this.scale.width - 80, 100, "CSV", () => {
                window.open(`https://accounting-game.cse.eng.auburn.edu${endpoint}/csv`, "_blank");
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
            fontSize: "18px", fontFamily: '"Jersey 10", sans-serif', backgroundColor: "#333", padding: 8, color: "#dcc89f"
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on("pointerdown", callback);
    }
    showClearConfirm() {
    const overlay = this.add.rectangle(
        this.scale.width / 2, this.scale.height / 2,
        this.scale.width, this.scale.height,
        0x000000, 0.7
    ).setDepth(10);

    const box = this.add.rectangle(
        this.scale.width / 2, this.scale.height / 2,
        500, 300, 0x1a1a2e
    ).setDepth(11).setStrokeStyle(2, 0xdcc89f);

    const title = this.add.text(
        this.scale.width / 2, this.scale.height / 2 - 100,
        "⚠ Clear All Data?", {
            fontSize: "28px", fontFamily: '"Jersey 10", sans-serif', color: "#ff4444"
        }
    ).setOrigin(0.5).setDepth(12);

    const msg = this.add.text(
        this.scale.width / 2, this.scale.height / 2 - 50,
        "This will permanently delete all\nstudent profiles and game analytics.\nThis cannot be undone.", {
            fontSize: "16px", fontFamily: '"Jersey 10", sans-serif',
            color: "#ffffff", align: "center"
        }
    ).setOrigin(0.5).setDepth(12);

    const downloadBtn = this.add.text(
        this.scale.width / 2, this.scale.height / 2 + 20,
        "Download Statistics First", {
            fontSize: "18px", fontFamily: '"Jersey 10", sans-serif',
            backgroundColor: "#1a5276", padding: 8, color: "#dcc89f"
        }
    ).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
        window.open("https://accounting-game.cse.eng.auburn.edu/api/stats/admin/all-students/csv", "_blank");
    });

    const cancelBtn = this.add.text(
        this.scale.width / 2 - 100, this.scale.height / 2 + 80,
        "Cancel", {
            fontSize: "18px", fontFamily: '"Jersey 10", sans-serif',
            backgroundColor: "#333", padding: 8, color: "#dcc89f"
        }
    ).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
        [overlay, box, title, msg, downloadBtn, cancelBtn, confirmBtn].forEach(o => o.destroy());
    });

    const confirmBtn = this.add.text(
        this.scale.width / 2 + 100, this.scale.height / 2 + 80,
        "Confirm Delete", {
            fontSize: "18px", fontFamily: '"Jersey 10", sans-serif',
            backgroundColor: "#7b241c", padding: 8, color: "#ffffff"
        }
    ).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
        [overlay, box, title, msg, downloadBtn, cancelBtn, confirmBtn].forEach(o => o.destroy());
        this.clearAllData();
    });
}

async clearAllData() {
    try {
        // for local testing, use localhost. For deployed version, use the production api url
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const apiBase = isLocal ? "http://localhost:8000" : "https://accounting-game.cse.eng.auburn.edu/api";
        const response = await fetch(
            `${apiBase}/admin/clear-data`,
            { method: "DELETE" }
        );
        
        const result = await response.json();
        if (result.status === "success") {
            const msg = this.add.text(
                this.scale.width / 2, this.scale.height / 2,
                "✓ Data cleared successfully", {
                    fontSize: "24px", fontFamily: '"Jersey 10", sans-serif',
                    color: "#00ff00", backgroundColor: "#1a1a2e", padding: 12
                }
            ).setOrigin(0.5).setDepth(13);
            this.time.delayedCall(2000, () => msg.destroy());
            if (this.statsContainer) {
                this.statsContainer.destroy();
                this.statsContainer = null;
            }
        }
    } catch (e) {
        console.error("Clear data failed", e);
        const msg = this.add.text(
            this.scale.width / 2, this.scale.height / 2,
            "✗ Failed to clear data", {
                fontSize: "24px", fontFamily: '"Jersey 10", sans-serif',
                color: "#ff4444", backgroundColor: "#1a1a2e", padding: 12
            }
        ).setOrigin(0.5).setDepth(13);
        this.time.delayedCall(2000, () => msg.destroy());
    }
}
}