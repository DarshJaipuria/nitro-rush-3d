/**
 * AICar — AI opponent that follows the track center-line spline.
 * Uses CatmullRomCurve3 path-following with speed variation for realism.
 */
import * as THREE from 'three';

export class AICar {
    /**
     * @param {THREE.Scene} scene
     * @param {import('./track.js').Track} track
     * @param {number} color
     */
    constructor(scene, track, color = 0x2266ff) {
        this.scene = scene;
        this.track = track;

        // Path-following state
        this.pathT      = 0;     // 0–1 position along curve
        this.speed      = 0;
        this.targetSpeed = 48;   // base cruise speed
        this.position   = new THREE.Vector3();

        // Speed variation — overridden by applyDifficulty()
        this.minSpeed = 36;
        this.maxSpeed = 55;

        this.enabled = false;

        // Build visual
        this.mesh = this._buildMesh(color);
        scene.add(this.mesh);
    }

    /** Apply difficulty settings from config.js */
    applyDifficulty(diffConfig) {
        this.minSpeed = diffConfig.aiMinSpeed;
        this.maxSpeed = diffConfig.aiMaxSpeed;
    }

    /** Place AI at starting grid position */
    resetToStart(pos, heading) {
        this.position.copy(pos);
        this.pathT = 0.0;
        this.speed = 0;
        this.mesh.position.copy(pos);
        this.mesh.rotation.y = heading;
    }

    update(dt) {
        if (!this.enabled) return;

        // ---- Compute target speed based on curvature ----
        const lookAheadT = (this.pathT + 0.03) % 1;
        const currentTan = this.track.curve.getTangent(this.pathT);
        const aheadTan   = this.track.curve.getTangent(lookAheadT);
        const curvature  = 1 - currentTan.dot(aheadTan);  // 0 = straight, higher = curvy

        this.targetSpeed = THREE.MathUtils.lerp(this.maxSpeed, this.minSpeed, Math.min(curvature * 15, 1));

        // ---- Accelerate / decelerate toward target ----
        const accelRate = this.speed < this.targetSpeed ? 30 : 45;
        this.speed += (this.targetSpeed - this.speed > 0 ? 1 : -1) * accelRate * dt;
        this.speed = THREE.MathUtils.clamp(this.speed, 0, this.maxSpeed);

        // ---- Move along spline ----
        const curveLen = this.track.curve.getLength();
        this.pathT += (this.speed * dt) / curveLen;
        if (this.pathT >= 1) this.pathT -= 1;

        // ---- Get world position and tangent ----
        const point   = this.track.curve.getPoint(this.pathT);
        const tangent = this.track.curve.getTangent(this.pathT);

        this.position.set(point.x, 0, point.z);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = Math.atan2(tangent.x, tangent.z);

        // ---- Animate wheels ----
        const spin = this.speed * dt * 4;
        for (const w of this.wheels) {
            w.rotation.x += spin;
        }
    }

    // ---- Mesh (same structure as player car, different color) ----

    _buildMesh(color) {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(2.2, 0.7, 4.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.28 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.55;
        body.castShadow = true;
        group.add(body);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(1.8, 0.55, 2.0);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.85, roughness: 0.15 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.1, -0.25);
        cabin.castShadow = true;
        group.add(cabin);

        // Front bumper
        const spoilerGeo = new THREE.BoxGeometry(2.4, 0.2, 0.5);
        const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const front = new THREE.Mesh(spoilerGeo, spoilerMat);
        front.position.set(0, 0.3, 2.3);
        group.add(front);

        // Rear spoiler
        const rearGeo = new THREE.BoxGeometry(2.0, 0.35, 0.15);
        const rear = new THREE.Mesh(rearGeo, spoilerMat);
        rear.position.set(0, 1.2, -2.1);
        group.add(rear);

        // Headlights
        const lightGeo = new THREE.BoxGeometry(0.35, 0.18, 0.1);
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.8 });
        for (const sx of [-0.7, 0.7]) {
            const hl = new THREE.Mesh(lightGeo, lightMat);
            hl.position.set(sx, 0.55, 2.21);
            group.add(hl);
        }

        // Tail lights
        const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6 });
        for (const sx of [-0.8, 0.8]) {
            const tl = new THREE.Mesh(lightGeo, tlMat);
            tl.position.set(sx, 0.55, -2.21);
            group.add(tl);
        }

        // Wheels
        this.wheels = [];
        const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.2, roughness: 0.75 });
        const positions = [
            [-1.15, 0.38,  1.35],
            [ 1.15, 0.38,  1.35],
            [-1.15, 0.38, -1.35],
            [ 1.15, 0.38, -1.35],
        ];
        for (const [x, y, z] of positions) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, y, z);
            wheel.castShadow = true;
            group.add(wheel);
            this.wheels.push(wheel);
        }

        return group;
    }
}
