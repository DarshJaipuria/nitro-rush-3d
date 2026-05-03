/**
 * ChaseCamera — Smooth third-person follow camera.
 * Tracks behind and above the car with spring-like interpolation.
 */
import * as THREE from 'three';

export class ChaseCamera {
    /**
     * @param {THREE.PerspectiveCamera} camera
     */
    constructor(camera) {
        this.camera = camera;

        // Offset from the car (in car-local space)
        this.distance   = 14;     // how far behind
        this.height     = 6.5;    // how high above
        this.lookAhead  = 5;      // look-target distance ahead of car
        this.lookHeight = 1.5;    // look-target height

        // Smoothing (higher = snappier)
        this.positionSmooth = 5;
        this.lookSmooth     = 8;

        // Internal interpolation targets
        this._currentPos    = new THREE.Vector3();
        this._currentLookAt = new THREE.Vector3();
        this._initialized   = false;
    }

    /**
     * Call every frame.
     * @param {number} dt  delta time in seconds
     * @param {THREE.Vector3} carPos
     * @param {number} carHeading  radians
     * @param {number} carSpeed    signed
     */
    update(dt, carPos, carHeading, carSpeed = 0) {
        const sin = Math.sin(carHeading);
        const cos = Math.cos(carHeading);

        // Dynamic distance: pull out slightly at higher speeds
        const speedFactor = Math.min(Math.abs(carSpeed) / 80, 1);
        const dynDist   = this.distance + speedFactor * 3;
        const dynHeight = this.height   - speedFactor * 0.5;

        // Desired position (behind the car)
        const desiredPos = new THREE.Vector3(
            carPos.x - sin * dynDist,
            carPos.y + dynHeight,
            carPos.z - cos * dynDist
        );

        // Desired look-at (ahead of car)
        const desiredLook = new THREE.Vector3(
            carPos.x + sin * this.lookAhead,
            carPos.y + this.lookHeight,
            carPos.z + cos * this.lookAhead
        );

        if (!this._initialized) {
            this._currentPos.copy(desiredPos);
            this._currentLookAt.copy(desiredLook);
            this._initialized = true;
        }

        // Spring interpolation
        const posLerp  = 1 - Math.exp(-this.positionSmooth * dt);
        const lookLerp = 1 - Math.exp(-this.lookSmooth * dt);

        this._currentPos.lerp(desiredPos, posLerp);
        this._currentLookAt.lerp(desiredLook, lookLerp);

        this.camera.position.copy(this._currentPos);
        this.camera.lookAt(this._currentLookAt);
    }

    /** Instantly snap camera to the correct chase position (start / reset) */
    snapTo(carPos, carHeading) {
        this._initialized = false;
        this.update(1, carPos, carHeading, 0);
    }
}
