import * as THREE from 'three';

export function initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.fog = new THREE.Fog(0xffffff, 0, 300);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
    hemiLight.position.set(0.5, 1, 0.75);
    scene.add(hemiLight);

    const floorGeometry = new THREE.PlaneGeometry(200, 200, 20, 20);
    floorGeometry.rotateX(-Math.PI / 2);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x64a6d9 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    scene.add(floor);

    return { scene, camera, renderer };
}

export function addBoxesToScene(boxes: any[], scene: THREE.Scene) {
    const boxGeometry = new THREE.BoxGeometry(5, 5, 5);
    const boxMaterials = [
        new THREE.MeshPhongMaterial({ color: 0x64a6d9 }),
        new THREE.MeshPhongMaterial({ color: 0x4a86c9 }),
        new THREE.MeshPhongMaterial({ color: 0x3066b9 }),
        new THREE.MeshPhongMaterial({ color: 0x1646a9 }),
        new THREE.MeshPhongMaterial({ color: 0x0026a9 })
    ];

    boxes.forEach((boxData) => {
        const materialIndex = boxData.material_index;
        const box = new THREE.Mesh(boxGeometry, boxMaterials[materialIndex]);
        box.position.set(boxData.position.x, boxData.position.y, boxData.position.z);
        scene.add(box);
    });
}