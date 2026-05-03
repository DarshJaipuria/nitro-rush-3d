/**
 * Car — Arcade-style player car with drift-lite physics.
 * Built from primitive meshes (box body, cylinder wheels).
 */
import * as THREE from 'three';

export class Car {
    /**
     * @param {THREE.Scene} scene
     * @param {number} color  hex body color
     */
    constructor(scene, color = 0xff4444) {
        this.scene = scene;

        // ---- Physics state ----
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.heading  = 0;      // radians, Y-axis rotation
        this.speed    = 0;      // signed scalar speed (m/s game units)

        // ---- Tuning (arcade feel) ----
        this.maxSpeed      = 82;
        this.acceleration  = 42;
        this.brakeForce    = 58;
        this.reverseMax    = -22;
        this.steeringSpeed = 2.8;
        this.grip          = 0.92;     // 1 = perfect grip, lower = more slide
        this.driftGrip     = 0.82;     // grip while braking (hand-brake drift)
        this.drag          = 0.985;    // per-frame velocity damping

        // ---- Boost ----
        this.boostFuel    = 1;         // 0–1
        this.maxBoostFuel = 1;
        this.boostAccel   = 60;
        this.boostMax     = 115;
        this.isBoosting   = false;

        // ---- Flip reset ----
        this.flipTimer = 0;
        this.enabled   = true;        // false during countdown / finish

        // ---- Build visual ----
        this.mesh   = this._buildMesh(color);
        this.wheels = [];
        this._addWheels();
        scene.add(this.mesh);
    }

    // ================================================================
    //  Physics update — called every frame while racing
    // ================================================================

    update(dt, input, track) {
        if (!this.enabled) return;

        // ---- Throttle / reverse ----
        if (input.forward) {
            const max = (input.boost && this.boostFuel > 0) ? this.boostMax : this.maxSpeed;
            const acc = (input.boost && this.boostFuel > 0) ? this.boostAccel : this.acceleration;
            this.speed = Math.min(this.speed + acc * dt, max);
            if (input.boost && this.boostFuel > 0) {
                this.boostFuel = Math.max(0, this.boostFuel - dt * 0.5);
                this.isBoosting = true;
            } else {
                this.isBoosting = false;
            }
        } else if (input.backward) {
            this.speed = Math.max(this.speed - this.acceleration * 0.5 * dt, this.reverseMax);
            this.isBoosting = false;
        } else {
            // Engine braking — gentle decel
            this.speed *= Math.pow(0.97, dt * 60);
            if (Math.abs(this.speed) < 0.4) this.speed = 0;
            this.isBoosting = false;
        }

        // ---- Brake (space) ----
        if (input.brake) {
            const bf = this.brakeForce * dt;
            if (this.speed > 0) this.speed = Math.max(0, this.speed - bf);
            else                this.speed = Math.min(0, this.speed + bf);
        }

        // Regenerate boost slowly
        if (!this.isBoosting) {
            this.boostFuel = Math.min(this.boostFuel + dt * 0.12, this.maxBoostFuel);
        }

        // ---- Steering ----
        const absSpd      = Math.abs(this.speed);
        const speedRatio  = Math.min(absSpd / this.maxSpeed, 1);
        // Steering is strongest at medium speed (less at very low and very high)
        const steerFactor = Math.min(absSpd / 15, 1) * (1 - speedRatio * 0.35);
        const steerInput  = (input.left ? 1 : 0) - (input.right ? 1 : 0);

        if (absSpd > 0.8) {
            this.heading += steerInput * this.steeringSpeed * steerFactor * dt * Math.sign(this.speed);
        }

        // ---- Drift / grip ----
        const headDir   = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
        const desiredVel = headDir.multiplyScalar(this.speed);
        const currentGrip = input.brake ? this.driftGrip : this.grip;
        const lerpFactor  = 1 - Math.pow(1 - currentGrip, dt * 60);
        this.velocity.lerp(desiredVel, lerpFactor);

        // Drag
        this.velocity.multiplyScalar(Math.pow(this.drag, dt * 60));

        // ---- Move ----
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        // ---- Track collision ----
        if (track) {
            const hit = track.constrainToTrack(this.position);
            if (hit) {
                this.speed    *= 0.55;
                this.velocity.multiplyScalar(0.55);
            }
        }

        // ---- Ground ----
        this.position.y = 0;

        // ---- Sync visual ----
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;

        // ---- Animate wheels ----
        const spin = this.speed * dt * 4;
        const steerAngle = steerInput * 0.35;
        for (let i = 0; i < this.wheels.length; i++) {
            this.wheels[i].rotation.x += spin;
            // Front wheels steer visually
            if (i < 2) this.wheels[i].parent.rotation.y = steerAngle;
        }
    }

    // ================================================================
    //  Public helpers
    // ================================================================

    /** Apply difficulty settings from config.js */
    applyDifficulty(diffConfig) {
        this.grip      = diffConfig.playerGrip;
        this.driftGrip = diffConfig.playerDriftGrip;
    }

    /** Teleport to a position + heading (for race start / reset) */
    resetTo(pos, heading) {
        this.position.copy(pos);
        this.heading  = heading;
        this.speed    = 0;
        this.velocity.set(0, 0, 0);
        this.flipTimer = 0;
        this.mesh.position.copy(pos);
        this.mesh.rotation.set(0, heading, 0);
    }

    /** Apply an external speed boost (from boost pads) */
    applyBoost(amount) {
        this.speed = Math.min(this.speed + amount, this.boostMax);
    }

    /** Current speed in "km/h" for HUD display */
    get displaySpeed() {
        return Math.abs(Math.round(this.speed * 3.6));   // rough m/s → km/h
    }

    // ================================================================
    //  Mesh builders (private)
    // ================================================================

    _buildMesh(color) {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(2.2, 0.7, 4.4);
        const bodyMat = new THREE.MeshStandardMaterial({
            color, metalness: 0.55, roughness: 0.28
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.55;
        body.castShadow = true;
        group.add(body);

        // Cabin / roof
        const cabinGeo = new THREE.BoxGeometry(1.8, 0.55, 2.0);
        const cabinMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e, metalness: 0.85, roughness: 0.15
        });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.1, -0.25);
        cabin.castShadow = true;
        group.add(cabin);

        // Front spoiler / bumper
        const spoilerGeo = new THREE.BoxGeometry(2.4, 0.2, 0.5);
        const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const frontBumper = new THREE.Mesh(spoilerGeo, spoilerMat);
        frontBumper.position.set(0, 0.3, 2.3);
        group.add(frontBumper);

        // Rear spoiler
        const rearSpoilerGeo = new THREE.BoxGeometry(2.0, 0.35, 0.15);
        const rearSpoiler = new THREE.Mesh(rearSpoilerGeo, spoilerMat);
        rearSpoiler.position.set(0, 1.2, -2.1);
        group.add(rearSpoiler);

        // Headlights
        const lightGeo = new THREE.BoxGeometry(0.35, 0.18, 0.1);
        const lightMat = new THREE.MeshStandardMaterial({
            color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.8
        });
        for (const sx of [-0.7, 0.7]) {
            const hl = new THREE.Mesh(lightGeo, lightMat);
            hl.position.set(sx, 0.55, 2.21);
            group.add(hl);
        }

        // Tail lights
        const tlMat = new THREE.MeshStandardMaterial({
            color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6
        });
        for (const sx of [-0.8, 0.8]) {
            const tl = new THREE.Mesh(lightGeo, tlMat);
            tl.position.set(sx, 0.55, -2.21);
            group.add(tl);
        }

        return group;
    }

    _addWheels() {
        const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16);
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x111111, metalness: 0.2, roughness: 0.75
        });
        const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.30, 8);
        const hubMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 });

        const positions = [
            { x: -1.15, y: 0.38, z:  1.35 },   // front-left
            { x:  1.15, y: 0.38, z:  1.35 },   // front-right
            { x: -1.15, y: 0.38, z: -1.35 },   // rear-left
            { x:  1.15, y: 0.38, z: -1.35 },   // rear-right
        ];

        for (const p of positions) {
            // Pivot (for steering rotation on front wheels)
            const pivot = new THREE.Group();
            pivot.position.set(p.x, p.y, p.z);

            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            pivot.add(wheel);

            const hub = new THREE.Mesh(hubGeo, hubMat);
            hub.rotation.z = Math.PI / 2;
            pivot.add(hub);

            this.mesh.add(pivot);
            this.wheels.push(wheel);
        }
    }
}
