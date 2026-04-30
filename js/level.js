/**
 * Level - 关卡类
 */
class Level {
    constructor() {
        this.platforms = [];
        this.coins = [];
        this.enemies = [];
        this.pipes = [];
        this.goal = null;
        this.meshGroup = null;
    }

    load(data) {
        this.platforms = [];
        this.coins = [];
        this.enemies = [];
        this.pipes = [];

        if (data.platforms) {
            for (const p of data.platforms) {
                this.platforms.push({
                    position: new THREE.Vector3(p.x || 0, p.y || 0, p.z || 0),
                    size: new THREE.Vector3(p.width || 2, p.height || 0.5, p.depth || 2),
                    bounds: {
                        min: { x: (p.x || 0) - (p.width || 2) / 2, y: (p.y || 0) - (p.height || 0.5) / 2, z: -(p.depth || 2) / 2 },
                        max: { x: (p.x || 0) + (p.width || 2) / 2, y: (p.y || 0) + (p.height || 0.5) / 2, z: (p.depth || 2) / 2 }
                    }
                });
            }
        }

        if (data.coins) {
            for (const c of data.coins) {
                this.coins.push({
                    position: new THREE.Vector3(c.x || 0, c.y || 0, c.z || 0),
                    collected: false,
                    mesh: null
                });
            }
        }

        if (data.enemies) {
            for (const e of data.enemies) {
                let enemy;
                if (e.type === 'goomba') {
                    enemy = new Goomba(e.x || 0, e.y || 0, e.patrolLeft || -10, e.patrolRight || 10);
                } else if (e.type === 'koopa') {
                    enemy = new Koopa(e.x || 0, e.y || 0, e.patrolLeft || -10, e.patrolRight || 10);
                } else {
                    enemy = new Enemy(e.x || 0, e.y || 0, e.patrolLeft || -10, e.patrolRight || 10);
                }
                this.enemies.push(enemy);
            }
        }

        if (data.pipes) {
            for (const p of data.pipes) {
                this.pipes.push({
                    position: new THREE.Vector3(p.x || 0, p.y || 0, p.z || 0),
                    size: new THREE.Vector3(p.width || 1, p.height || 2, p.depth || 1),
                    bounds: {
                        min: { x: (p.x || 0) - (p.width || 1) / 2, y: (p.y || 0) - (p.height || 2) / 2, z: -(p.depth || 1) / 2 },
                        max: { x: (p.x || 0) + (p.width || 1) / 2, y: (p.y || 0) + (p.height || 2) / 2, z: (p.depth || 1) / 2 }
                    }
                });
            }
        }

        if (data.goal) {
            this.goal = {
                position: new THREE.Vector3(data.goal.x || 50, data.goal.y || 2, data.goal.z || 0),
                size: new THREE.Vector3(1, 4, 1)
            };
        }
    }

    createMeshes() {
        this.meshGroup = new THREE.Group();

        // 平台 - 绿色草地风格
        const platGeom = new THREE.BoxGeometry(1, 1, 1);
        for (const p of this.platforms) {
            const platMesh = new THREE.Mesh(platGeom, new THREE.MeshLambertMaterial({ color: 0x00AA00 }));
            platMesh.position.copy(p.position);
            platMesh.scale.copy(p.size);
            platMesh.receiveShadow = true;
            this.meshGroup.add(platMesh);
        }

        // 金币
        const coinGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16);
        const coinMat = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xAA8800, emissiveIntensity: 0.3 });
        for (const c of this.coins) {
            const coinMesh = new THREE.Mesh(coinGeom, coinMat);
            coinMesh.position.copy(c.position);
            coinMesh.rotation.z = Math.PI / 2;
            c.mesh = coinMesh;
            this.meshGroup.add(coinMesh);
        }

        // 敌人
        for (const e of this.enemies) {
            this.meshGroup.add(e.createMesh());
        }

        // 管道 - 绿色
        const pipeGeom = new THREE.CylinderGeometry(0.5, 0.55, 1, 16);
        const pipeMat = new THREE.MeshLambertMaterial({ color: 0x00AA00 });
        for (const p of this.pipes) {
            const pipeMesh = new THREE.Mesh(pipeGeom, pipeMat);
            pipeMesh.position.copy(p.position);
            pipeMesh.scale.set(p.size.x, p.size.y, p.size.z);
            pipeMesh.castShadow = true;
            this.meshGroup.add(pipeMesh);
        }

        // 终点旗杆
        if (this.goal) {
            const poleGeom = new THREE.BoxGeometry(0.15, 4, 0.15);
            const poleMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
            const pole = new THREE.Mesh(poleGeom, poleMat);
            pole.position.copy(this.goal.position);

            const flagGeom = new THREE.BoxGeometry(1, 0.6, 0.05);
            const flagMat = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
            const flag = new THREE.Mesh(flagGeom, flagMat);
            flag.position.set(this.goal.position.x + 0.5, this.goal.position.y + 2, this.goal.position.z);

            this.meshGroup.add(pole);
            this.meshGroup.add(flag);
        }

        return this.meshGroup;
    }

    update(dt, player) {
        for (const c of this.coins) {
            if (!c.collected && c.mesh) {
                c.mesh.rotation.x += 2 * dt;
            }
        }

        for (const e of this.enemies) {
            if (e.state !== 'dead') {
                e.update(dt, player, this);
            }
        }

        const pb = player.getBounds();

        // 金币碰撞
        for (const c of this.coins) {
            if (c.collected) continue;
            const cb = {
                min: { x: c.position.x - 0.25, y: c.position.y - 0.25, z: -0.2 },
                max: { x: c.position.x + 0.25, y: c.position.y + 0.25, z: 0.2 }
            };
            if (this.aabbIntersect(pb, cb)) {
                c.collected = true;
                if (c.mesh) c.mesh.visible = false;
                audioManager.playCoin();
            }
        }

        // 敌人碰撞
        for (const e of this.enemies) {
            if (e.state === 'dead') continue;
            const eb = e.getBounds();
            if (this.aabbIntersect(pb, eb)) {
                const playerBottom = pb.min.y;
                const enemyTop = eb.max.y;
                const playerVelY = player.velocity.y;

                if (playerBottom >= enemyTop - 0.2 && playerVelY < 0) {
                    e.stomped();
                    player.velocity.y = 6;
                } else {
                    player.takeDamage();
                }
            }
        }

        // 终点检测
        if (this.goal) {
            const gb = {
                min: { x: this.goal.position.x - 0.5, y: this.goal.position.y - 2, z: -0.5 },
                max: { x: this.goal.position.x + 0.5, y: this.goal.position.y + 2, z: 0.5 }
            };
            if (this.aabbIntersect(pb, gb)) {
                console.log('Level Complete!');
            }
        }
    }

    aabbIntersect(a, b) {
        return (
            a.min.x <= b.max.x && a.max.x >= b.min.x &&
            a.min.y <= b.max.y && a.max.y >= b.min.y &&
            a.min.z <= b.max.z && a.max.z >= b.min.z
        );
    }

    static getDefaultLevel() {
        return {
            platforms: [
                { x: 0, y: -0.25, width: 100, height: 0.5, depth: 3 },
                { x: 5, y: 1.5, width: 3, height: 0.5, depth: 2 },
                { x: 10, y: 3, width: 3, height: 0.5, depth: 2 },
                { x: 16, y: 2, width: 4, height: 0.5, depth: 2 },
                { x: 22, y: 3.5, width: 3, height: 0.5, depth: 2 },
                { x: 30, y: 1, width: 5, height: 0.5, depth: 2 }
            ],
            coins: [
                { x: 5, y: 2.5 }, { x: 6, y: 2.5 },
                { x: 10, y: 4 }, { x: 11, y: 4 },
                { x: 16, y: 3 }, { x: 17, y: 3 },
                { x: 22, y: 4.5 }
            ],
            enemies: [
                { type: 'goomba', x: 8, y: 0.5, patrolLeft: 6, patrolRight: 12 },
                { type: 'goomba', x: 14, y: 0.5, patrolLeft: 13, patrolRight: 19 },
                { type: 'koopa', x: 20, y: 0.5, patrolLeft: 19, patrolRight: 25 }
            ],
            pipes: [
                { x: 3, y: 0.5, width: 1, height: 1, depth: 1 },
                { x: 12, y: 0.5, width: 1, height: 1, depth: 1 },
                { x: 25, y: 0.5, width: 1, height: 1, depth: 1 }
            ],
            goal: { x: 30, y: 3 }
        };
    }
}
