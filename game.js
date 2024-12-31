class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.cellSize = 5;
        this.grid = [];
        this.gameMode = 'classic';
        this.difficulty = 'medium';
        this.aiOpponents = [];
        this.gameStarted = false;
        this.gameTime = 0;
        this.lastTime = 0;
        
        this.player = {
            x: 400,
            y: 300,
            speed: 2,
            direction: { x: 0, y: 0 },
            trail: [],
            isDrawing: false,
            territory: new Set(),
            color: '#0f0'
        };
        
        this.territory = new Set();
        this.initGrid();
        this.setupMainMenu();
        this.setupEventListeners();
    }

    setupMainMenu() {
        const menuButtons = document.querySelectorAll('.menu-options button');
        menuButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.gameMode = button.dataset.mode;
                this.difficulty = button.dataset.difficulty || 'medium';
                this.startGame();
            });
        });
    }

    startGame() {
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('gameUI').style.display = 'block';
        this.gameStarted = true;
        this.resetGame();
        this.initAI();
        this.gameLoop(0);
    }

    initAI() {
        this.aiOpponents = [];
        const aiCount = this.getAICountForMode();
        const aiColors = ['#f00', '#00f', '#ff0', '#f0f'];
        
        for (let i = 0; i < aiCount; i++) {
            this.aiOpponents.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                speed: this.getAISpeedForDifficulty(),
                direction: { x: 1, y: 0 },
                trail: [],
                isDrawing: true,
                territory: new Set(),
                color: aiColors[i],
                behavior: this.getAIBehaviorForDifficulty()
            });
        }
    }

    getAICountForMode() {
        switch(this.gameMode) {
            case 'classic': return 1;
            case 'team': return 4;
            case 'challenge': return 2;
            case 'custom': return 3;
            default: return 1;
        }
    }

    getAISpeedForDifficulty() {
        switch(this.difficulty) {
            case 'easy': return 1;
            case 'medium': return 1.5;
            case 'hard': return 2;
            default: return 1.5;
        }
    }

    getAIBehaviorForDifficulty() {
        switch(this.difficulty) {
            case 'easy': return 'random';
            case 'medium': return 'defensive';
            case 'hard': return 'aggressive';
            default: return 'defensive';
        }
    }

    initGrid() {
        for (let i = 0; i < this.canvas.width / this.cellSize; i++) {
            this.grid[i] = new Array(this.canvas.height / this.cellSize).fill(0);
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                    this.player.direction = { x: 0, y: -1 };
                    break;
                case 'ArrowDown':
                    this.player.direction = { x: 0, y: 1 };
                    break;
                case 'ArrowLeft':
                    this.player.direction = { x: -1, y: 0 };
                    break;
                case 'ArrowRight':
                    this.player.direction = { x: 1, y: 0 };
                    break;
            }
            this.player.isDrawing = true;
        });

        document.getElementById('restartButton').addEventListener('click', () => {
            this.resetGame();
        });
    }

    updatePlayer() {
        if (this.player.isDrawing) {
            this.player.x += this.player.direction.x * this.player.speed;
            this.player.y += this.player.direction.y * this.player.speed;
            
            const gridX = Math.floor(this.player.x / this.cellSize);
            const gridY = Math.floor(this.player.y / this.cellSize);
            
            if (this.isValidPosition(gridX, gridY)) {
                this.player.trail.push({ x: gridX, y: gridY });
                this.grid[gridX][gridY] = 1;
            }

            // Check for loop completion
            if (this.checkForLoop(this.player.trail)) {
                this.fillTerritory(this.player.trail);
                this.player.trail = [];
            }
        }
    }

    updateAI() {
        this.aiOpponents.forEach(ai => {
            switch(ai.behavior) {
                case 'random':
                    this.updateRandomAI(ai);
                    break;
                case 'defensive':
                    this.updateDefensiveAI(ai);
                    break;
                case 'aggressive':
                    this.updateAggressiveAI(ai);
                    break;
            }

            // Check for collisions with player's trail
            const gridX = Math.floor(ai.x / this.cellSize);
            const gridY = Math.floor(ai.y / this.cellSize);

            if (this.isValidPosition(gridX, gridY)) {
                ai.trail.push({ x: gridX, y: gridY });
                
                // Check if AI crosses player's trail
                if (this.grid[gridX][gridY] === 1) {
                    this.gameOver();
                }
            }
        });
    }

    updateRandomAI(ai) {
        // Simple random movement with occasional direction changes
        if (Math.random() < 0.02) {
            const directions = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];
            ai.direction = directions[Math.floor(Math.random() * directions.length)];
        }

        // Avoid walls
        const nextX = ai.x + ai.direction.x * ai.speed;
        const nextY = ai.y + ai.direction.y * ai.speed;
        
        if (nextX < 0 || nextX > this.canvas.width || nextY < 0 || nextY > this.canvas.height) {
            ai.direction = {
                x: -ai.direction.x,
                y: -ai.direction.y
            };
        }

        ai.x += ai.direction.x * ai.speed;
        ai.y += ai.direction.y * ai.speed;
    }

    updateDefensiveAI(ai) {
        const playerDist = this.getDistanceToPlayer(ai);
        const nearestTrail = this.findNearestTrail(ai);
        
        // Stay away from player if too close
        if (playerDist < 100) {
            const angle = Math.atan2(ai.y - this.player.y, ai.x - this.player.x);
            ai.direction = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
        } 
        // Avoid trails
        else if (nearestTrail && nearestTrail.distance < 50) {
            const angle = Math.atan2(ai.y - nearestTrail.y, ai.x - nearestTrail.x);
            ai.direction = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
        }
        // Otherwise, move in patterns
        else {
            this.moveInPattern(ai);
        }

        // Apply movement with boundary checking
        const nextX = ai.x + ai.direction.x * ai.speed;
        const nextY = ai.y + ai.direction.y * ai.speed;
        
        if (this.isValidMove(nextX, nextY)) {
            ai.x = nextX;
            ai.y = nextY;
        } else {
            this.findNewSafeDirection(ai);
        }
    }

    updateAggressiveAI(ai) {
        const playerDist = this.getDistanceToPlayer(ai);
        
        // Try to intercept player
        if (playerDist < 200) {
            // Predict player's position
            const predictedX = this.player.x + this.player.direction.x * this.player.speed * 10;
            const predictedY = this.player.y + this.player.direction.y * this.player.speed * 10;
            
            const angle = Math.atan2(predictedY - ai.y, predictedX - ai.x);
            ai.direction = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
        } else {
            // Look for opportunities to cut off player's path
            const playerTrail = this.findNearestPlayerTrail(ai);
            if (playerTrail && playerTrail.distance < 150) {
                const angle = Math.atan2(playerTrail.y - ai.y, playerTrail.x - ai.x);
                ai.direction = {
                    x: Math.cos(angle),
                    y: Math.sin(angle)
                };
            } else {
                // Move towards player's territory
                this.moveTowardsPlayerTerritory(ai);
            }
        }

        // Apply movement with smart collision avoidance
        const nextX = ai.x + ai.direction.x * ai.speed;
        const nextY = ai.y + ai.direction.y * ai.speed;
        
        if (this.isValidMove(nextX, nextY)) {
            ai.x = nextX;
            ai.y = nextY;
        } else {
            this.findNewSafeDirection(ai);
        }
    }

    // Helper methods for AI
    getDistanceToPlayer(ai) {
        const dx = this.player.x - ai.x;
        const dy = this.player.y - ai.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    findNearestTrail(ai) {
        let nearest = null;
        let minDist = Infinity;

        // Check player's trail
        this.player.trail.forEach(point => {
            const dist = this.getDistance(ai.x, ai.y, point.x * this.cellSize, point.y * this.cellSize);
            if (dist < minDist) {
                minDist = dist;
                nearest = point;
            }
        });

        // Check other AIs' trails
        this.aiOpponents.forEach(otherAi => {
            if (otherAi !== ai) {
                otherAi.trail.forEach(point => {
                    const dist = this.getDistance(ai.x, ai.y, point.x * this.cellSize, point.y * this.cellSize);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = point;
                    }
                });
            }
        });

        return nearest ? { ...nearest, distance: minDist } : null;
    }

    moveInPattern(ai) {
        // Create spiral or zigzag patterns
        ai.patternTime = (ai.patternTime || 0) + 1;
        const angle = ai.patternTime * 0.05;
        ai.direction = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }

    findNewSafeDirection(ai) {
        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
            { x: 1, y: 1 },
            { x: -1, y: 1 },
            { x: 1, y: -1 },
            { x: -1, y: -1 }
        ];

        // Normalize diagonal directions
        directions.forEach(dir => {
            if (dir.x !== 0 && dir.y !== 0) {
                const norm = Math.sqrt(2);
                dir.x /= norm;
                dir.y /= norm;
            }
        });

        // Find the safest direction
        let bestDirection = null;
        let maxSafetyScore = -Infinity;

        directions.forEach(dir => {
            const safetyScore = this.calculateSafetyScore(ai, dir);
            if (safetyScore > maxSafetyScore) {
                maxSafetyScore = safetyScore;
                bestDirection = dir;
            }
        });

        if (bestDirection) {
            ai.direction = bestDirection;
        }
    }

    calculateSafetyScore(ai, direction) {
        const lookAhead = 50;
        const testX = ai.x + direction.x * lookAhead;
        const testY = ai.y + direction.y * lookAhead;
        
        let score = 0;
        
        // Penalty for being close to walls
        score -= Math.abs(testX - this.canvas.width/2) / (this.canvas.width/2);
        score -= Math.abs(testY - this.canvas.height/2) / (this.canvas.height/2);
        
        // Penalty for being close to trails
        const nearestTrail = this.findNearestTrail(ai);
        if (nearestTrail) {
            score -= 100 / (nearestTrail.distance + 1);
        }
        
        // Bonus for moving away from player if aggressive
        if (ai.behavior === 'aggressive') {
            const currentPlayerDist = this.getDistanceToPlayer(ai);
            const newPlayerDist = this.getDistance(testX, testY, this.player.x, this.player.y);
            score += (newPlayerDist - currentPlayerDist) * 0.1;
        }
        
        return score;
    }

    getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    isValidMove(x, y) {
        return x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height;
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.grid.length && y >= 0 && y < this.grid[0].length;
    }

    checkForLoop(trail) {
        if (trail.length < 4) return false;
        
        const lastPoint = trail[trail.length - 1];
        for (let i = 0; i < trail.length - 3; i++) {
            if (lastPoint.x === trail[i].x && lastPoint.y === trail[i].y) {
                return true;
            }
        }
        return false;
    }

    fillTerritory(trail) {
        // Simple flood fill algorithm
        const visited = new Set();
        const queue = [];
        
        // Start flood fill from a point inside the loop
        const startX = Math.floor(this.canvas.width / (2 * this.cellSize));
        const startY = Math.floor(this.canvas.height / (2 * this.cellSize));
        queue.push({ x: startX, y: startY });

        while (queue.length > 0) {
            const current = queue.pop();
            const key = `${current.x},${current.y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (this.isValidPosition(current.x, current.y)) {
                this.territory.add(key);
                
                // Add adjacent cells to queue
                queue.push({ x: current.x + 1, y: current.y });
                queue.push({ x: current.x - 1, y: current.y });
                queue.push({ x: current.x, y: current.y + 1 });
                queue.push({ x: current.x, y: current.y - 1 });
            }
        }

        this.updateScore();
    }

    updateScore() {
        const totalCells = (this.canvas.width / this.cellSize) * (this.canvas.height / this.cellSize);
        const percentage = (this.territory.size / totalCells * 100).toFixed(1);
        document.getElementById('score').textContent = `Territory: ${percentage}%`;
    }

    gameOver() {
        alert('Game Over! The AI crossed your trail!');
        this.resetGame();
    }

    resetGame() {
        this.player.trail = [];
        this.aiOpponents.forEach(ai => {
            ai.trail = [];
        });
        this.territory.clear();
        this.initGrid();
        this.player.x = 400;
        this.player.y = 300;
        this.updateScore();
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw territory
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        this.territory.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            this.ctx.fillRect(
                x * this.cellSize,
                y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
        });

        // Draw player trail
        this.ctx.fillStyle = this.player.color;
        this.player.trail.forEach(point => {
            this.ctx.fillRect(
                point.x * this.cellSize,
                point.y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
        });

        // Draw AI trails
        this.aiOpponents.forEach(ai => {
            this.ctx.fillStyle = ai.color;
            ai.trail.forEach(point => {
                this.ctx.fillRect(
                    point.x * this.cellSize,
                    point.y * this.cellSize,
                    this.cellSize,
                    this.cellSize
                );
            });
        });

        // Draw player
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(
            this.player.x - this.cellSize/2,
            this.player.y - this.cellSize/2,
            this.cellSize,
            this.cellSize
        );

        // Draw AIs
        this.aiOpponents.forEach(ai => {
            this.ctx.fillStyle = ai.color;
            this.ctx.fillRect(
                ai.x - this.cellSize/2,
                ai.y - this.cellSize/2,
                this.cellSize,
                this.cellSize
            );
        });
    }

    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.gameStarted) {
            this.gameTime += deltaTime;
            this.updatePlayer();
            this.updateAI();
            this.draw();
        }
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    moveTowardsPlayerTerritory(ai) {
        // Simple implementation - move towards player's position
        const angle = Math.atan2(this.player.y - ai.y, this.player.x - ai.x);
        ai.direction = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }

    findNearestPlayerTrail(ai) {
        let nearest = null;
        let minDist = Infinity;

        this.player.trail.forEach(point => {
            const dist = this.getDistance(ai.x, ai.y, point.x * this.cellSize, point.y * this.cellSize);
            if (dist < minDist) {
                minDist = dist;
                nearest = point;
            }
        });

        return nearest ? { ...nearest, distance: minDist } : null;
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
}; 