/**
 * Game - 主游戏类
 */
class Game {
    constructor() {
        this.canvas = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.player = null;
        this.level = null;
        this.input = { left: false, right: false, jump: false, jumpPressed: false };
        this.running = false;
        this.lastTime = 0;
        this.fixedDt = 1 / 60;
        this._accumulator = 0;
        this.cameraOffset = new THREE.Vector3(0, 3, 15);
        this.hud = null;
        this.score = 0;
        this.coins = 0;
    }

    init() {
        // Canvas & Renderer
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x5C94FC);

        // Sky gradient effect with fog
        this.scene.fog = new THREE.Fog(0x5C94FC, 30, 80);

        // OrthographicCamera - 侧视角
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 12;
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            1000
        );
        this.camera.position.set(0, 3, 20);
        this.camera.lookAt(0, 3, 0);

        // 光照 - 明亮户外风格
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffcc, 0.9);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 30;
        dirLight.shadow.camera.bottom = -10;
        this.scene.add(dirLight);

        // 云朵装饰
        this.createClouds();

        // 背景山脉
        this.createMountains();

        // 创建 HUD
        this.createHUD();

        // Player
        this.player = new Mario();
        this.scene.add(this.player.createMesh());

        // Level
        this.level = new Level();
        this.level.load(Level.getDefaultLevel());
        this.scene.add(this.level.createMeshes());

        // 输入事件
        this.setupInput();

        // 窗口大小变化
        window.addEventListener('resize', () => this.onResize());

        this.running = true;
        this.lastTime = performance.now();
        this.loop();
    }

    createClouds() {
        const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        for (let i = 0; i < 10; i++) {
            const cloud = new THREE.Group();
            const sizes = [1, 0.8, 0.6];
            for (let j = 0; j < 3; j++) {
                const puff = new THREE.Mesh(
                    new THREE.SphereGeometry(sizes[j], 8, 8),
                    cloudMat
                );
                puff.position.x = (j - 1) * 0.8;
                puff.position.y = j === 1 ? 0.2 : 0;
                cloud.add(puff);
            }
            cloud.position.set(
                (Math.random() - 0.5) * 80,
                5 + Math.random() * 3,
                -15 - Math.random() * 10
            );
            cloud.scale.set(1.5, 0.8, 1);
            this.scene.add(cloud);
        }
    }

    createMountains() {
        // 远景山脉
        const mountainMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        for (let i = 0; i < 8; i++) {
            const h = 5 + Math.random() * 8;
            const mountain = new THREE.Mesh(
                new THREE.ConeGeometry(4 + Math.random() * 3, h, 4),
                mountainMat
            );
            mountain.position.set(-40 + i * 12, h / 2 - 2, -25);
            this.scene.add(mountain);
        }

        // 更远的山（蓝色调）
        const farMountainMat = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
        for (let i = 0; i < 6; i++) {
            const h = 8 + Math.random() * 10;
            const mountain = new THREE.Mesh(
                new THREE.ConeGeometry(6 + Math.random() * 4, h, 4),
                farMountainMat
            );
            mountain.position.set(-50 + i * 18, h / 2 - 2, -40);
            this.scene.add(mountain);
        }
    }

    createHUD() {
        // 创建 HUD div
        this.hud = document.createElement('div');
        this.hud.id = 'hud';
        this.hud.innerHTML = `
            <span id="hud-coins">COINS: 0</span>
            <span id="hud-score">SCORE: 0</span>
        `;
        document.body.appendChild(this.hud);
    }

    updateHUD() {
        if (this.hud) {
            document.getElementById('hud-coins').textContent = `COINS: ${this.coins}`;
            document.getElementById('hud-score').textContent = `SCORE: ${this.score}`;
        }
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.input.left = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.input.right = true;
                    break;
                case 'ArrowUp':
                case 'KeyW':
                case 'Space':
                    if (!this.input.jumpPressed) {
                        this.input.jump = true;
                        this.input.jumpPressed = true;
                    }
                    break;
            }
            audioManager.init();
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.input.left = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.input.right = false;
                    break;
                case 'ArrowUp':
                case 'KeyW':
                case 'Space':
                    this.input.jumpPressed = false;
                    break;
            }
        });
    }

    loop() {
        if (!this.running) return;

        const now = performance.now();
        let frameTime = (now - this.lastTime) / 1000;
        this.lastTime = now;

        if (frameTime > 0.25) frameTime = 0.25;

        this._accumulator += frameTime;
        while (this._accumulator >= this.fixedDt) {
            this.update(this.fixedDt);
            this._accumulator -= this.fixedDt;
        }

        this.render();
        requestAnimationFrame(() => this.loop());
    }

    update(dt) {
        this.player.update(dt, this.input, this.level);
        this.input.jump = false;
        this.level.update(dt, this.player);

        // 统计金币
        let collected = this.level.coins.filter(c => c.collected).length;
        if (collected > this.coins) {
            this.coins = collected;
            this.score += 200;
        }

        // 相机跟随
        const targetCamX = this.player.position.x + this.cameraOffset.x;
        this.camera.position.x += (targetCamX - this.camera.position.x) * 5 * dt;
        this.camera.position.y = this.player.position.y + this.cameraOffset.y;
        this.camera.lookAt(this.camera.position.x, this.camera.position.y, 0);

        // 光照跟随
        const lights = this.scene.children.filter(c => c.isDirectionalLight);
        for (const light of lights) {
            light.position.x = this.camera.position.x;
            light.position.y = this.camera.position.y + 10;
        }

        this.updateHUD();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 12;
        this.camera.left = -frustumSize * aspect / 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// 启动游戏
const game = new Game();
window.addEventListener('DOMContentLoaded', () => game.init());
