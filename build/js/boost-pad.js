/**
 * BoostPad — Glowing pad on the track that gives a speed boost.
 * Uses Area detection (distance check) rather than actual physics.
 */
import * as THREE from 'three';

export class BoostPad {
    /**
     * @param {THREE.Scene} scene
     * @param {THREE.Vector3} position
     * @param {number} rotation  Y-axis rotation (track tangent)
     */
    constructor(scene, position, rotation) {
        this.position      = position.clone();
        this.triggerRadius = 5;
        this.boostAmount   = 25;      // speed units to add
        this.cooldown      = 0;       // prevents re-triggering instantly

        // Visual — glowing rectangle on the road
        const geo = new THREE.PlaneGeometry(8, 4);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.6,
            roughness: 0.3,
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.rotation.z = -rotation;
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.03;
        scene.add(this.mesh);

        // Arrow indicators on the pad
        const arrowGeo = new THREE.ConeGeometry(0.5, 1.5, 4);
        const arrowMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5
        });
        for (let i = -1; i <= 1; i++) {
            const arrow = new THREE.Mesh(arrowGeo, arrowMat);
            arrow.rotation.x = -Math.PI / 2;
            arrow.position.set(
                position.x + Math.cos(rotation) * i * 2,
                0.15,
                position.z - Math.sin(rotation) * i * 2
            );
            arrow.rotation.y = rotation;
            scene.add(arrow);
        }
    }

    /**
     * Check if a car triggers this pad.
     * @param {import('./car.js').Car} car
     * @param {number} dt
     */
    check(car, dt) {
        this.cooldown = Math.max(0, this.cooldown - dt);
        if (this.cooldown > 0) return;

        const dx = car.position.x - this.position.x;
        const dz = car.position.z - this.position.z;
        if (dx * dx + dz * dz < this.triggerRadius * this.triggerRadius) {
            car.applyBoost(this.boostAmount);
            this.cooldown = 2;   // 2 second cooldown

            // Visual feedback — flash brighter
            this.mesh.material.emissiveIntensity = 1.5;
            setTimeout(() => { this.mesh.material.emissiveIntensity = 0.7; }, 300);
        }
    }

    /** Animate glow pulse */
    update(time) {
        const pulse = 0.5 + Math.sin(time * 3) * 0.15;
        this.mesh.material.opacity = pulse;
    }
}
