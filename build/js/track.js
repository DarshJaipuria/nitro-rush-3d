/**
 * Track — Procedural race circuit built from a config-driven CatmullRom spline.
 * Supports multiple track layouts with different visuals and dimensions.
 */
import * as THREE from 'three';

export class Track {
    /**
     * @param {THREE.Scene} scene
     * @param {object} config  Track config from config.js (TRACKS[key])
     */
    constructor(scene, config) {
        this.scene    = scene;
        this.config   = config;
        this.halfWidth = config.width;
        this.barrierHeight = 1.6;
        this.numSamples = 500;

        // Keep references to all added objects for cleanup
        this._objects = [];

        // ---- Build curve from config points ----
        this.curve = new THREE.CatmullRomCurve3(config.points, true, 'catmullrom', 0.5);

        // Pre-sample for collision queries
        this.samplePoints = [];
        for (let i = 0; i < this.numSamples; i++) {
            const t = i / this.numSamples;
            const p = this.curve.getPoint(t);
            this.samplePoints.push(new THREE.Vector3(p.x, 0, p.z));
        }

        // Apply environment
        scene.background = new THREE.Color(config.skyColor);
        scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar);

        // Build visuals
        this._buildGround();
        this._buildRoad();
        this._buildBarriers();
        this._buildStartLine();
        this._buildScenery();
    }

    // ======== Cleanup ========

    /** Remove all track objects from the scene */
    dispose() {
        for (const obj of this._objects) {
            this.scene.remove(obj);
            if (obj.geometry)  obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        }
        this._objects = [];
    }

    _add(obj) {
        this.scene.add(obj);
        this._objects.push(obj);
    }

    // ======== Collision ========

    constrainToTrack(pos) {
        let minDist2 = Infinity;
        let nearestIdx = 0;

        for (let i = 0; i < this.samplePoints.length; i++) {
            const sp = this.samplePoints[i];
            const dx = pos.x - sp.x;
            const dz = pos.z - sp.z;
            const d2 = dx * dx + dz * dz;
            if (d2 < minDist2) { minDist2 = d2; nearestIdx = i; }
        }

        const dist = Math.sqrt(minDist2);
        if (dist > this.halfWidth) {
            const nearest = this.samplePoints[nearestIdx];
            const dx = pos.x - nearest.x;
            const dz = pos.z - nearest.z;
            const push = dist - this.halfWidth;
            pos.x -= (dx / dist) * push;
            pos.z -= (dz / dist) * push;
            return true;
        }
        return false;
    }

    // ======== Start positions ========

    getStartPosition(gridIndex = 0) {
        const point   = this.curve.getPoint(0);
        const tangent = this.curve.getTangent(0).normalize();
        const normal  = new THREE.Vector3(-tangent.z, 0, tangent.x);

        const lateral = (gridIndex % 2 === 0 ? -1 : 1) * 3;
        const back    = -Math.floor(gridIndex / 2) * 8 - 2;

        return new THREE.Vector3(
            point.x + normal.x * lateral + tangent.x * back,
            0,
            point.z + normal.z * lateral + tangent.z * back
        );
    }

    getStartHeading() {
        const t = this.curve.getTangent(0);
        return Math.atan2(t.x, t.z);
    }

    // ======== Boost pad positions ========

    getBoostPadPositions() {
        return [0.15, 0.5, 0.82].map(t => {
            const p = this.curve.getPoint(t);
            const tan = this.curve.getTangent(t);
            return {
                position: new THREE.Vector3(p.x, 0.02, p.z),
                rotation: Math.atan2(tan.x, tan.z)
            };
        });
    }

    // ======== Visual builders ========

    _buildGround() {
        // Determine ground size from track extents
        const extents = this._getExtents();
        const size = Math.max(extents.range * 2.5, 600);

        const geo = new THREE.PlaneGeometry(size, size, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: this.config.groundColor, roughness: 0.95 });
        const ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05;
        ground.receiveShadow = true;
        this._add(ground);
    }

    _buildRoad() {
        const segments = 300;
        const positions = [];
        const normals   = [];
        const uvs       = [];
        const indices   = [];

        for (let i = 0; i <= segments; i++) {
            const t   = i / segments;
            const pt  = this.curve.getPoint(t);
            const tan = this.curve.getTangent(t).normalize();
            const nx  = -tan.z;
            const nz  =  tan.x;

            positions.push(pt.x + nx * this.halfWidth, 0.01, pt.z + nz * this.halfWidth);
            positions.push(pt.x - nx * this.halfWidth, 0.01, pt.z - nz * this.halfWidth);
            normals.push(0, 1, 0,  0, 1, 0);
            uvs.push(0, t * 20,  1, t * 20);

            if (i > 0) {
                const b = (i - 1) * 2;
                indices.push(b, b + 1, b + 2,  b + 1, b + 3, b + 2);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);

        const mat = new THREE.MeshStandardMaterial({ color: this.config.roadColor, roughness: 0.75 });
        const road = new THREE.Mesh(geo, mat);
        road.receiveShadow = true;
        this._add(road);

        this._buildCenterLine(segments);
    }

    _buildCenterLine(segments) {
        const mat = new THREE.MeshStandardMaterial({ color: this.config.centerLineColor, roughness: 0.6 });
        const geo = new THREE.PlaneGeometry(0.4, 3);

        for (let i = 0; i < segments; i += 6) {
            const t   = i / segments;
            const pt  = this.curve.getPoint(t);
            const tan = this.curve.getTangent(t);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.z = -Math.atan2(tan.x, tan.z);
            mesh.position.set(pt.x, 0.02, pt.z);
            this._add(mesh);
        }
    }

    _buildBarriers() {
        const numPerSide = 120;
        const barrierGeo = new THREE.BoxGeometry(1.2, this.barrierHeight, 2.4);
        const matOuter   = new THREE.MeshStandardMaterial({ color: this.config.outerBarrierColor, roughness: 0.5 });
        const matInner   = new THREE.MeshStandardMaterial({ color: this.config.innerBarrierColor, roughness: 0.5 });

        // Neon track gets emissive barriers
        if (this.config === 'neon' || this.config.skyColor === 0x060612) {
            matOuter.emissive = new THREE.Color(this.config.outerBarrierColor);
            matOuter.emissiveIntensity = 0.4;
            matInner.emissive = new THREE.Color(this.config.innerBarrierColor);
            matInner.emissiveIntensity = 0.4;
        }

        for (let side = -1; side <= 1; side += 2) {
            const mat = side > 0 ? matOuter : matInner;
            for (let i = 0; i < numPerSide; i++) {
                const t   = i / numPerSide;
                const pt  = this.curve.getPoint(t);
                const tan = this.curve.getTangent(t).normalize();
                const nx  = -tan.z * side;
                const nz  =  tan.x * side;

                const barrier = new THREE.Mesh(barrierGeo, mat);
                barrier.position.set(
                    pt.x + nx * (this.halfWidth + 0.8),
                    this.barrierHeight / 2,
                    pt.z + nz * (this.halfWidth + 0.8)
                );
                barrier.rotation.y = Math.atan2(tan.x, tan.z);
                barrier.castShadow   = true;
                barrier.receiveShadow = true;
                this._add(barrier);
            }
        }
    }

    _buildStartLine() {
        const pt  = this.curve.getPoint(0);
        const tan = this.curve.getTangent(0);
        const geo = new THREE.PlaneGeometry(this.halfWidth * 2, 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const line = new THREE.Mesh(geo, mat);
        line.rotation.x = -Math.PI / 2;
        line.rotation.z = -Math.atan2(tan.x, tan.z);
        line.position.set(pt.x, 0.025, pt.z);
        this._add(line);

        const checkerGeo = new THREE.PlaneGeometry(1, 1);
        const blackMat   = new THREE.MeshStandardMaterial({ color: 0x111111 });
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < Math.floor(this.halfWidth * 2); c++) {
                if ((r + c) % 2 === 0) continue;
                const ch = new THREE.Mesh(checkerGeo, blackMat);
                ch.rotation.x = -Math.PI / 2;
                ch.rotation.z = -Math.atan2(tan.x, tan.z);
                const nx = -tan.z;
                const nz =  tan.x;
                const offset = c - this.halfWidth + 0.5;
                const fwd    = r - 0.5;
                ch.position.set(
                    pt.x + nx * offset + tan.x * fwd,
                    0.027,
                    pt.z + nz * offset + tan.z * fwd
                );
                this._add(ch);
            }
        }
    }

    _buildScenery() {
        const trunkGeo  = new THREE.CylinderGeometry(0.3, 0.4, 3, 6);
        const trunkMat  = new THREE.MeshStandardMaterial({ color: this.config.trunkColor });
        const leavesGeo = new THREE.SphereGeometry(2, 8, 6);
        const leavesMat = new THREE.MeshStandardMaterial({ color: this.config.treeColor, roughness: 0.9 });

        const extents = this._getExtents();
        const scatterRadius = extents.range * 0.9;

        const rng = this._seededRandom(42);
        const count = 80;
        for (let i = 0; i < count; i++) {
            const angle  = rng() * Math.PI * 2;
            const radius = scatterRadius + rng() * scatterRadius * 0.7;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(x, 1.5, z);
            trunk.castShadow = true;
            this._add(trunk);

            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.set(x, 4, z);
            leaves.castShadow = true;
            this._add(leaves);
        }
    }

    _getExtents() {
        let maxDist = 0;
        for (const p of this.config.points) {
            const d = Math.sqrt(p.x * p.x + p.z * p.z);
            if (d > maxDist) maxDist = d;
        }
        return { range: maxDist };
    }

    _seededRandom(seed) {
        let s = seed;
        return () => {
            s = (s * 16807 + 0) % 2147483647;
            return s / 2147483647;
        };
    }
}
