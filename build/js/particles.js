/**
 * ParticleSystem — Simple tire smoke / dust particles behind the car.
 * Uses a pool of small meshes recycled in a ring buffer.
 */
import * as THREE from 'three';

export class ParticleSystem {
    /**
     * @param {THREE.Scene} scene
     * @param {number} poolSize  max simultaneous particles
     */
    constructor(scene, poolSize = 60) {
        this.scene    = scene;
        this.pool     = [];
        this.poolSize = poolSize;
        this.nextIdx  = 0;

        const geo = new THREE.SphereGeometry(0.25, 4, 4);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0.5,
        });

        for (let i = 0; i < poolSize; i++) {
            const mesh = new THREE.Mesh(geo, mat.clone());
            mesh.visible = false;
            scene.add(mesh);
            this.pool.push({
                mesh,
                life: 0,
                maxLife: 0,
                velocity: new THREE.Vector3(),
            });
        }
    }

    /**
     * Emit particles behind a car.
     * @param {THREE.Vector3} pos       car position
     * @param {number} heading          car heading
     * @param {number} speed            car speed (abs)
     * @param {boolean} drifting        extra particles when drifting
     */
    emit(pos, heading, speed, drifting = false) {
        const absSpeed = Math.abs(speed);
        if (absSpeed < 8) return;  // no dust at low speed

        const count = drifting ? 3 : 1;
        for (let i = 0; i < count; i++) {
            const p = this.pool[this.nextIdx];
            this.nextIdx = (this.nextIdx + 1) % this.poolSize;

            const spread = (Math.random() - 0.5) * 2;
            const sin = Math.sin(heading);
            const cos = Math.cos(heading);

            // Spawn behind the car
            p.mesh.position.set(
                pos.x - sin * 2.5 + cos * spread,
                0.2 + Math.random() * 0.3,
                pos.z - cos * 2.5 - sin * spread
            );

            const spd = absSpeed * 0.05;
            p.velocity.set(
                (Math.random() - 0.5) * spd,
                0.5 + Math.random() * 1.0,
                (Math.random() - 0.5) * spd
            );

            p.maxLife = 0.6 + Math.random() * 0.5;
            p.life    = p.maxLife;

            p.mesh.visible = true;
            p.mesh.material.opacity = 0.45;
            const s = 0.2 + Math.random() * 0.25;
            p.mesh.scale.setScalar(s);
        }
    }

    /** Update all active particles */
    update(dt) {
        for (const p of this.pool) {
            if (p.life <= 0) { p.mesh.visible = false; continue; }

            p.life -= dt;
            p.mesh.position.addScaledVector(p.velocity, dt);
            p.velocity.y -= 1.5 * dt;    // gravity

            const t = 1 - p.life / p.maxLife;
            p.mesh.material.opacity = 0.45 * (1 - t);
            p.mesh.scale.setScalar(0.2 + t * 0.6);    // grow as it fades
        }
    }
}
