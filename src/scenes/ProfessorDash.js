import { Scene } from "phaser";

export default class ProfessorDash extends Scene {
    constructor() {
        super("ProfessorDash");
        this.statsContainer = null;
        this.sectionButtons = []; // Track buttons to hide them
    }

    create() {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x1a1a1a).setOrigin(0);

        this.title = this.add.text(this.scale.width / 2, 50, "Professor Dashboard", {
            fontSize: "42px", fontFamily: '"Jersey 10", sans-serif', color: "#dcc89f"
        }).setOrigin(0.5);

        
        this.sectionTitle = this.add.text(this.scale.width / 2, 90, "", {
            fontSize: "32px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#ffffff"
        }).setOrigin(0.5);

        // Create Section Selection Buttons
        const sections = ["001", "002", "003"];
        sections.forEach((id, index) => {
            let btn = this.createTabButton(200 + (index * 200), 120, `Section ${id}`, () => this.loadSectionData(id));
            this.sectionButtons.push(btn);
        });

        // Return Button (Always visible at bottom)
        this.createTabButton(this.scale.width / 2, this.scale.height - 50, "Return to Student View", () => {
            this.scene.start("MainMenuScene");
        });
    }

    async loadSectionData(sectionId) {
        // --- 1. UI CLEANUP ---
        // Hide Section Buttons
        this.sectionButtons.forEach(btn => btn.setVisible(false));
        this.sectionTitle.setText(`Viewing Section: ${sectionId}`);

        // Inside loadSectionData
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

        // --- 2. DATA FETCH ---
        try {
            const response = await fetch(`https://accounting-game.cse.eng.auburn.edu/api/stats/section/${sectionId}`);
            const data = await response.json();

            // Create fresh container
            this.statsContainer = this.add.container(this.scale.width / 2, 200);
            let yOffset = 0;

            data.student_breakdown.forEach((s) => {
                // Formatting to include Top and Bottom
                const gameName = GAME_NAMES[s.game] || s.game;
                const row = `${s.name.padEnd(15)} | ${gameName.padEnd(12)} | Avg: ${s.avg.toFixed(0).padStart(4)} | T: ${String(s.top).padStart(4)} | B: ${String(s.bottom).padStart(4)}`;
    
                let txt = this.add.text(0, yOffset, row, {
                    fontSize: "16px", // Slightly smaller to fit the extra data
                    fontFamily: "Courier", 
                    color: "#ffffff"
                }).setOrigin(0.5);
    
            this.statsContainer.add(txt);
            yOffset += 30;
        });

            // --- 3. SCROLLING & MASK ---
            this.setupScrolling(yOffset);

            // Add Download Button
            if (this.downloadBtn) this.downloadBtn.destroy();
            this.downloadBtn = this.createTabButton(this.scale.width / 2, 450, "Download CSV", () => {
                window.open(`https://accounting-game.cse.eng.auburn.edu/api/stats/section/${sectionId}/csv`, "_blank");
            });

        } catch (e) {
            console.error("Fetch failed", e);
        }
    }


    setupScrolling(contentHeight) {
    const maskVisibleHeight = 250; 
    const maskY = 180;
    const startY = 200; // This is the default Y position of your container

    // 1. Create the Window (Mask)
    const maskShape = this.make.graphics();
    maskShape.fillRect(this.scale.width / 2 - 375, maskY, 750, maskVisibleHeight);
    this.statsContainer.setMask(maskShape.createGeometryMask());

    // 2. Trackpad / Mouse Wheel Listener
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (this.statsContainer) {
            // Move the container based on scroll delta
            // deltaY is positive when scrolling down, negative when scrolling up
            this.statsContainer.y -= deltaY * 0.5; 

            // 3. Define the scroll boundaries
            const minScroll = startY - Math.max(0, contentHeight - maskVisibleHeight);
            const maxScroll = startY;

            // Clamp the position so it doesn't scroll into infinity
            this.statsContainer.y = Phaser.Math.Clamp(this.statsContainer.y, minScroll, maxScroll);
        }
    });
}

    createTabButton(x, y, label, callback) {
        return this.add.text(x, y, label, {
            fontSize: "24px", fontFamily: '"Jersey 10", sans-serif',
            backgroundColor: "#7f1a02", padding: { x: 10, y: 5 }, color: "#dcc89f"
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on("pointerdown", callback);
    }
}