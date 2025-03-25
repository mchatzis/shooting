import * as THREE from 'three';

// Physics constants
const moveSpeed = 10.0;
const jumpForce = 35.0;
const gravity = 9.8 * 4;
const deltaTime = 1 / 60;

export function getNextState(state: any, input: any, boxes: any[]) {
    const { keys, rotation_y } = input;

    let vx = 0;
    let vz = 0;

    if (keys.w) {
        vx += moveSpeed * Math.sin(rotation_y);
        vz += moveSpeed * Math.cos(rotation_y);
    }
    if (keys.s) {
        vx -= moveSpeed * Math.sin(rotation_y);
        vz -= moveSpeed * Math.cos(rotation_y);
    }
    if (keys.a) {
        vx += moveSpeed * Math.cos(rotation_y);
        vz -= moveSpeed * Math.sin(rotation_y);
    }
    if (keys.d) {
        vx -= moveSpeed * Math.cos(rotation_y);
        vz += moveSpeed * Math.sin(rotation_y);
    }

    const speed = Math.sqrt(vx * vx + vz * vz);
    if (speed > moveSpeed && speed > 0) {
        const scale = moveSpeed / speed;
        vx *= scale;
        vz *= scale;
    }

    let vy = state.velocity_y - gravity * deltaTime;
    if (keys.space && state.on_ground) vy = jumpForce;

    const dx = vx * deltaTime;
    const dy = vy * deltaTime;
    const dz = vz * deltaTime;

    let tempPosition = state.position.clone();

    tempPosition.x += dx;
    tempPosition = resolveCollisionAlongX(tempPosition, dx, boxes);

    tempPosition.z += dz;
    tempPosition = resolveCollisionAlongZ(tempPosition, dz, boxes);

    tempPosition.y += dy;
    const collisionResult = resolveCollisionAlongY(tempPosition, dy, vy, boxes);

    return {
        position: collisionResult.position,
        rotation_y,
        velocity_y: collisionResult.vy,
        on_ground: collisionResult.on_ground
    };
}

export function getIntersectingBoxes(position: THREE.Vector3, boxes: any[]) {
    const playerMin = new THREE.Vector3(position.x - 1, position.y, position.z - 0.5);
    const playerMax = new THREE.Vector3(position.x + 1, position.y + 4.5, position.z + 0.5);

    return boxes.filter(box => {
        const boxMin = new THREE.Vector3(box.position.x - 2.5, box.position.y - 2.5, box.position.z - 2.5);
        const boxMax = new THREE.Vector3(box.position.x + 2.5, box.position.y + 2.5, box.position.z + 2.5);

        return (
            playerMin.x < boxMax.x && playerMax.x > boxMin.x &&
            playerMin.y < boxMax.y && playerMax.y > boxMin.y &&
            playerMin.z < boxMax.z && playerMax.z > boxMin.z
        );
    });
}

export function resolveCollisionAlongX(tempPosition: THREE.Vector3, dx: number, boxes: any[]) {
    const intersectingBoxes = getIntersectingBoxes(tempPosition, boxes);
    if (intersectingBoxes.length === 0) return tempPosition;

    if (dx > 0) {
        const box = intersectingBoxes.reduce((minBox, box) =>
            box.position.x - 2.5 < minBox.position.x - 2.5 ? box : minBox
        );
        tempPosition.x = box.position.x - 2.5 - 1;
    } else {
        const box = intersectingBoxes.reduce((maxBox, box) =>
            box.position.x + 2.5 > maxBox.position.x + 2.5 ? box : maxBox
        );
        tempPosition.x = box.position.x + 2.5 + 1;
    }
    return tempPosition;
}

export function resolveCollisionAlongZ(tempPosition: THREE.Vector3, dz: number, boxes: any[]) {
    const intersectingBoxes = getIntersectingBoxes(tempPosition, boxes);
    if (intersectingBoxes.length === 0) return tempPosition;

    if (dz > 0) {
        const box = intersectingBoxes.reduce((minBox, box) =>
            box.position.z - 2.5 < minBox.position.z - 2.5 ? box : minBox
        );
        tempPosition.z = box.position.z - 2.5 - 0.5;
    } else {
        const box = intersectingBoxes.reduce((maxBox, box) =>
            box.position.z + 2.5 > maxBox.position.z + 2.5 ? box : maxBox
        );
        tempPosition.z = box.position.z + 2.5 + 0.5;
    }
    return tempPosition;
}

export function resolveCollisionAlongY(tempPosition: THREE.Vector3, dy: number, vy: number, boxes: any[]) {
    const intersectingBoxes = getIntersectingBoxes(tempPosition, boxes);
    if (intersectingBoxes.length === 0) {
        if (tempPosition.y < 0) {
            tempPosition.y = 0;
            return { position: tempPosition, vy: 0, on_ground: true };
        }
        return { position: tempPosition, vy, on_ground: false };
    }

    if (dy > 0) {
        const box = intersectingBoxes.reduce((minBox, box) =>
            box.position.y - 2.5 < minBox.position.y - 2.5 ? box : minBox
        );
        tempPosition.y = box.position.y - 2.5 - 4.5;
        return { position: tempPosition, vy, on_ground: false };
    } else {
        const box = intersectingBoxes.reduce((maxBox, box) =>
            box.position.y + 2.5 > maxBox.position.y + 2.5 ? box : maxBox
        );
        tempPosition.y = box.position.y + 2.5;
        return { position: tempPosition, vy: 0, on_ground: true };
    }
}
