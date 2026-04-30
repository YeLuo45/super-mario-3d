/**
 * Mario - 玩家角色类
 */
class Mario {
    constructor() {
        this.position = new THREE.Vector3(0, 1, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.state = 'idle';
        this.facingRight = true;
        this.moveSpeed = 8;
        this.jumpForce = 12;
        this.gravity = 25;
        this.width = 0.8;
        this.height = 1.0;
        this.isBig = false;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.mesh = null;
    }

    createMesh() {
        // 身体
        const bodyGeom = new THREE.BoxGeometry(this.width, this.height * 0.6, this.width);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xE52521 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 0;

        // 头
        const headGeom = new THREE.BoxGeometry(this.width * 0.9, this.width * 0.9, this.width * 0.9);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xFDBF6F });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = this.height * 0.35;

        // 帽子
        const hatGeom = new THREE.BoxGeometry(this.width * 0.95, this.width * 0.3, this.width * 0.5);
        const hatMat = new THREE.MeshLambertMaterial({ color: 0xE52521 });
        const hat = new THREE.Mesh(hatGeom, hatMat);
        hat.position.y = this.height * 0.6;
        hat.position.z = -0.1;

        // 眼睛
        const eyeGeom = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
        const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
        eyeL.position.set(-0.15, this.height * 0.38, 0.4);
        eyeR.position.set(0.15, this.height * 0.38, 0.4);

        this.mesh = new THREE.Group();
        this.mesh.add(body);
        this.mesh.add(head);
        this.mesh.add(hat);
        this.mesh.add(eyeL);
        this.mesh.add(eyeR);
        this.mesh.castShadow = true;
        this.mesh.position.copy(this.position);
        return this.mesh;
    }

    update(dt, input, level) {
        if (this.isInvincible) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
            }
        }

        let moveX = 0;
        if (input.left) {
            moveX = -this.moveSpeed;
            this.facingRight = false;
        } else if (input.right) {
            moveX = this.moveSpeed;
            this.facingRight = true;
        }
        this.velocity.x = moveX;

        const onGround = this.checkOnGround(level);

        if (input.jump && onGround) {
            this.velocity.y = this.jumpForce;
            audioManager.playJump();
        }

        if (!onGround) {
            this.velocity.y -= this.gravity * dt;
        } else {
            if (this.velocity.y < 0) this.velocity.y = 0;
        }

        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        this.resolveCollisions(level);

        if (this.position.y < -10) {
            this.position.y = -10;
            this.velocity.y = 0;
            this.takeDamage();
        }

        this.updateState(onGround);

        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.scale.x = this.facingRight ? 1 : -1;
            if (this.isInvincible) {
                this.mesh.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
            } else {
                this.mesh.visible = true;
            }
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

    resolveCollisions(level) {
        const halfW = this.width / 2;
        const halfH = this.height / 2;

        for (const platform of level.platforms) {
            const bx = this.position.x;
            const by = this.position.y;

            if (bx + halfW > platform.bounds.min.x &&
                bx - halfW < platform.bounds.max.x &&
                by + halfH > platform.bounds.min.y &&
                by - halfH < platform.bounds.max.y) {

                const overlapLeft = (bx + halfW) - platform.bounds.min.x;
                const overlapRight = platform.bounds.max.x - (bx - halfW);
                const overlapTop = (by + halfH) - platform.bounds.min.y;
                const overlapBottom = platform.bounds.max.y - (by - halfH);

                const minOverlapX = Math.min(overlapLeft, overlapRight);
                const minOverlapY = Math.min(overlapTop, overlapBottom);

                if (minOverlapY < minOverlapX) {
                    if (overlapTop < overlapBottom) {
                        this.position.y = platform.bounds.max.y + halfH;
                        if (this.velocity.y > 0) this.velocity.y = 0;
                    } else {
                        this.position.y = platform.bounds.min.y - halfH;
                        if (this.velocity.y < 0) this.velocity.y = 0;
                    }
                } else {
                    if (overlapLeft < overlapRight) {
                        this.position.x = platform.bounds.min.x - halfW;
                    } else {
                        this.position.x = platform.bounds.max.x + halfW;
                    }
                    this.velocity.x = 0;
                }
            }
        }
    }

    updateState(onGround) {
        if (!onGround) {
            this.state = this.velocity.y > 0 ? 'jump' : 'fall';
        } else {
            this.state = Math.abs(this.velocity.x) > 0.1 ? 'run' : 'idle';
        }
    }

    takeDamage() {
        if (this.isInvincible) return;
        if (this.isBig) {
            this.isBig = false;
            this.height = 1.0;
            this.isInvincible = true;
            this.invincibleTimer = 2.0;
            audioManager.playBump();
        } else {
            audioManager.playDeath();
            this.position.set(0, 1, 0);
            this.velocity.set(0, 0, 0);
        }
    }

    grow() {
        this.isBig = true;
        this.height = 1.5;
        this.isInvincible = true;
        this.invincibleTimer = 2.0;
        audioManager.playPowerup();
    }

    getBounds() {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        return {
            min: { x: this.position.x - halfW, y: this.position.y - halfH, z: -0.4 },
            max: { x: this.position.x + halfW, y: this.position.y + halfH, z: 0.4 }
        };
    }
}
