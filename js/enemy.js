/**
 * Enemy 基类
 */
class Enemy {
    constructor(x, y, patrolLeft, patrolRight) {
        this.position = new THREE.Vector3(x, y, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.state = 'patrol';
        this.patrolLeft = patrolLeft;
        this.patrolRight = patrolRight;
        this.moveSpeed = 2;
        this.width = 0.8;
        this.height = 0.8;
        this.gravity = 20;  // 降低重力，避免高速穿透
        this.mesh = null;
        this.facingRight = false;
    }

    createMesh() {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.width);
        const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.copy(this.position);
        return this.mesh;
    }

    update(dt, player, level) {
        if (this.state === 'dead') return;
        this.velocity.y -= this.gravity * dt;
        this.updateAI(dt, player);
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        const onGround = this.checkOnGround(level);
        if (onGround && this.velocity.y < 0) this.velocity.y = 0;

        if (this.state === 'patrol') {
            if (this.position.x <= this.patrolLeft) {
                this.position.x = this.patrolLeft;
                this.facingRight = true;
            } else if (this.position.x >= this.patrolRight) {
                this.position.x = this.patrolRight;
                this.facingRight = false;
            }
        }

        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.scale.x = this.facingRight ? 1 : -1;
        }
    }

    updateAI(dt, player) {
        if (this.state === 'patrol') {
            this.velocity.x = this.facingRight ? this.moveSpeed : -this.moveSpeed;
        }
    }

    checkOnGround(level) {
        const footY = this.position.y - this.height / 2;
        for (const platform of level.platforms) {
            if (this.position.x >= platform.bounds.min.x - this.width / 2 &&
                this.position.x <= platform.bounds.max.x + this.width / 2) {
                if (footY <= platform.bounds.max.y + 0.1 && footY >= platform.bounds.max.y - 0.2) {
                    return true;
                }
            }
        }
        return false;
    }

    getBounds() {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        return {
            min: { x: this.position.x - halfW, y: this.position.y - halfH, z: -0.4 },
            max: { x: this.position.x + halfW, y: this.position.y + halfH, z: 0.4 }
        };
    }

    stomped() {
        this.state = 'dead';
        this.velocity.set(0, 0, 0);
        audioManager.playStomp();
    }
}

/**
 * Goomba - 蘑菇敌人
 */
class Goomba extends Enemy {
    constructor(x, y, patrolLeft, patrolRight) {
        super(x, y, patrolLeft, patrolRight);
        this.moveSpeed = 1.5;
        this.width = 0.7;
        this.height = 0.7;
    }

    createMesh() {
        // 身体 - 棕色圆形（简化）
        const bodyGeom = new THREE.BoxGeometry(this.width, this.height * 0.7, this.width);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);

        // 头部
        const headGeom = new THREE.BoxGeometry(this.width * 0.9, this.height * 0.4, this.width * 0.9);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xA0522D });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = this.height * 0.5;

        // 眼睛
        const eyeGeom = new THREE.BoxGeometry(0.15, 0.15, 0.1);
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
        const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
        eyeL.position.set(-0.18, this.height * 0.5, 0.36);
        eyeR.position.set(0.18, this.height * 0.5, 0.36);

        // 脚
        const footGeom = new THREE.BoxGeometry(0.2, 0.15, 0.2);
        const footMat = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const footL = new THREE.Mesh(footGeom, footMat);
        const footR = new THREE.Mesh(footGeom, footMat);
        footL.position.set(-0.15, -this.height * 0.35, 0);
        footR.position.set(0.15, -this.height * 0.35, 0);

        this.mesh = new THREE.Group();
        this.mesh.add(body);
        this.mesh.add(head);
        this.mesh.add(eyeL);
        this.mesh.add(eyeR);
        this.mesh.add(footL);
        this.mesh.add(footR);
        this.mesh.castShadow = true;
        this.mesh.position.copy(this.position);
        return this.mesh;
    }
}

/**
 * Koopa - 乌龟敌人
 */
class Koopa extends Enemy {
    constructor(x, y, patrolLeft, patrolRight) {
        super(x, y, patrolLeft, patrolRight);
        this.moveSpeed = 2;
        this.width = 0.8;
        this.height = 1.0;
        this.shellState = false;
    }

    createMesh() {
        // 壳
        const shellGeom = new THREE.BoxGeometry(this.width, this.height * 0.6, this.width);
        const shellMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const shell = new THREE.Mesh(shellGeom, shellMat);
        shell.position.y = 0;

        // 头
        const headGeom = new THREE.BoxGeometry(this.width * 0.5, this.height * 0.4, this.width * 0.5);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = this.height * 0.45;

        // 眼睛
        const eyeGeom = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });
        const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
        const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
        eyeL.position.set(-0.12, this.height * 0.5, 0.2);
        eyeR.position.set(0.12, this.height * 0.5, 0.2);

        this.mesh = new THREE.Group();
        this.mesh.add(shell);
        this.mesh.add(head);
        this.mesh.add(eyeL);
        this.mesh.add(eyeR);
        this.mesh.castShadow = true;
        this.mesh.position.copy(this.position);
        return this.mesh;
    }

    updateAI(dt, player) {
        if (this.shellState) {
            this.velocity.x = 0;
            return;
        }
        super.updateAI(dt, player);
    }

    stomped() {
        if (!this.shellState) {
            this.shellState = true;
            this.height = 0.5;
            this.velocity.x = 0;
            this.mesh.scale.y = 0.5;
            audioManager.playBump();
        } else {
            super.stomped();
        }
    }
}
