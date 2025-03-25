import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getNextState } from './movement';
import { connectGame, connectHello } from './sockets';
import { addBoxesToScene, initScene } from './three';

connectHello();

const { scene, camera, renderer } = initScene();

let gameBoxes: any[] = [];

function storeAndAddBoxes(boxes: any[]) {
  gameBoxes = boxes;
  addBoxesToScene(boxes, scene);
}

// Player Robot Setup
let playerRobot: THREE.Group | undefined;
let mixer: THREE.AnimationMixer | undefined;
const animations: { [key: string]: THREE.AnimationAction } = {};
let activeAction: THREE.AnimationAction | undefined;

// Robot body object
const robotBody = new THREE.Object3D();
scene.add(robotBody);

const loader = new GLTFLoader();
loader.load('three/models/RobotExpressive.glb', (gltf) => {
  playerRobot = gltf.scene;
  robotBody.add(playerRobot);
  playerRobot.position.set(0, 0, 0);

  mixer = new THREE.AnimationMixer(playerRobot);
  gltf.animations.forEach((clip) => {
    // @ts-ignore
    animations[clip.name] = mixer.clipAction(clip);
  });

  activeAction = animations['Idle'];
  activeAction.play();
});

// Other players
interface OtherPlayer {
  robot: THREE.Group;
  mixer: THREE.AnimationMixer;
  idleAction: THREE.AnimationAction;
  walkingAction: THREE.AnimationAction;
  activeAction: THREE.AnimationAction;
  history: { time: number; position: THREE.Vector3; rotation_y: number }[];
}

const otherPlayers: { [key: string]: OtherPlayer } = {};

function createOtherPlayer(
  playerId: string,
  position: { x: number; y: number; z: number },
  rotation_y: number
) {
  loader.load('three/models/RobotExpressive.glb', (gltf) => {
    const robot = gltf.scene;
    scene.add(robot);
    robot.position.set(position.x, position.y, position.z);
    robot.rotation.y = rotation_y;

    const mixer = new THREE.AnimationMixer(robot);
    const clips = gltf.animations;
    const idleClip = clips.find((clip) => clip.name === 'Idle');
    const walkingClip = clips.find((clip) => clip.name === 'Walking');
    if (!idleClip || !walkingClip) {
      console.error('Missing animation clips for other player');
      return;
    }
    const idleAction = mixer.clipAction(idleClip);
    const walkingAction = mixer.clipAction(walkingClip);
    idleAction.play();

    otherPlayers[playerId] = {
      robot,
      mixer,
      idleAction,
      walkingAction,
      activeAction: idleAction,
      history: [
        {
          time: Date.now(),
          position: new THREE.Vector3(position.x, position.y, position.z),
          rotation_y
        }
      ]
    };
  });
}

// Local player ID
let localPlayerId: string;

// Predicted state
let predictedState = {
  position: new THREE.Vector3(),
  rotation_y: 0,
  velocity_y: 0,
  on_ground: true
};

// Input tracking
let sequenceNumber = 0;
const inputBuffer: { sequenceNumber: number; keys: any; rotation_y: number }[] = [];

const handleGameDataReceived = (data: any) => {
  const { player_id, starting_position, players, boxes } = data;
  localPlayerId = player_id;

  // Set local player's starting position
  robotBody.position.set(starting_position.x, starting_position.y, starting_position.z);
  predictedState.position.copy(robotBody.position);
  predictedState.rotation_y = 0;
  predictedState.velocity_y = 0;
  predictedState.on_ground = true;

  camera.position.set(starting_position.x, starting_position.y + 2, starting_position.z);

  storeAndAddBoxes(boxes);

  Object.entries(players).forEach(([id, playerData]) => {
    if (id !== localPlayerId) {
      const { position, rotation_y } = playerData as {
        position: { x: number; y: number; z: number };
        rotation_y: number;
      };
      createOtherPlayer(id, position, rotation_y);
    }
  });
};

const handleUpdatePlayerData = (data: any) => {
  const { players } = data;
  const serverData = players[localPlayerId];
  if (serverData) {
    const serverSequence = serverData.sequence_number;
    predictedState.position.set(serverData.position.x, serverData.position.y, serverData.position.z);
    predictedState.rotation_y = serverData.rotation_y;
    predictedState.velocity_y = serverData.velocity_y;
    predictedState.on_ground = serverData.on_ground;

    // Remove processed inputs
    while (inputBuffer.length > 0 && inputBuffer[0].sequenceNumber <= serverSequence) {
      inputBuffer.shift();
    }

    // Reapply unprocessed inputs
    let currentState = { ...predictedState, position: predictedState.position.clone() };
    inputBuffer.forEach(input => {
      currentState = getNextState(currentState, input, gameBoxes);
    });
    predictedState.position.copy(currentState.position);
    predictedState.rotation_y = currentState.rotation_y;
    predictedState.velocity_y = currentState.velocity_y;
    predictedState.on_ground = currentState.on_ground;
  }

  // Update other players
  Object.entries(players).forEach(([id, playerData]) => {
    if (id !== localPlayerId) {
      const { position, rotation_y } = playerData as {
        position: { x: number; y: number; z: number };
        rotation_y: number;
      };
      if (otherPlayers[id]) {
        const player = otherPlayers[id];
        player.history.push({
          time: Date.now(),
          position: new THREE.Vector3(position.x, position.y, position.z),
          rotation_y
        });
        // Remove old history entries (older than 1 second)
        player.history = player.history.filter((entry) => entry.time > Date.now() - 1000);
      } else {
        createOtherPlayer(id, position, rotation_y);
      }
    }
  });

  // Remove players who have left
  Object.keys(otherPlayers).forEach((id) => {
    if (!players[id]) {
      scene.remove(otherPlayers[id].robot);
      delete otherPlayers[id];
    }
  });
};
const sendInputs = connectGame(handleGameDataReceived, handleUpdatePlayerData);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.object);

const keys = { w: false, a: false, s: false, d: false, space: false };
const clock = new THREE.Clock();

// Create a smoothed quaternion for camera rotation
const smoothedQuaternion = camera.quaternion.clone();
const dampingFactor = 0.6; // Adjust between 0 (more smoothing) and 1 (less smoothing)

const cameraObject = controls.object;
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (playerRobot) {
    // Calculate rotation based on camera direction
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(cameraObject.quaternion);
    cameraDirection.y = 0;
    if (cameraDirection.length() > 0) {
      robotBody.rotation.y = Math.atan2(cameraDirection.x, cameraDirection.z);
    }

    // Send inputs to server
    const currentKeys = { ...keys };
    const currentRotationY = robotBody.rotation.y;
    sendInputs(currentKeys, currentRotationY, sequenceNumber);
    inputBuffer.push({ sequenceNumber, keys: currentKeys, rotation_y: currentRotationY });
    sequenceNumber++;

    // Update predicted state (for position only)
    predictedState = getNextState(predictedState, { keys: currentKeys, rotation_y: currentRotationY }, gameBoxes);
    const correctionFactor = 0.2;
    robotBody.position.lerp(predictedState.position, correctionFactor);

    // Compute target rotation from pointer lock controls and smoothly update the common quaternion
    const targetQuaternion = controls.object.quaternion.clone();
    smoothedQuaternion.slerp(targetQuaternion, dampingFactor);
    camera.quaternion.copy(smoothedQuaternion);

    // Sync robot rotation with camera: extract the yaw (Y-axis) from the smoothed quaternion
    const euler = new THREE.Euler().setFromQuaternion(smoothedQuaternion, 'YXZ');
    robotBody.rotation.y = euler.y + Math.PI;

    // Update camera position relative to the robot (without smoothing)
    cameraObject.position.set(robotBody.position.x, robotBody.position.y + 1.8, robotBody.position.z);

    // Animation logic
    const isMoving = keys.w || keys.a || keys.s || keys.d;
    if (isMoving) {
      if (activeAction !== animations['Walking']) {
        activeAction?.stop();
        activeAction = animations['Walking'];
        activeAction?.play();
      }
    } else {
      if (activeAction !== animations['Idle']) {
        activeAction?.stop();
        activeAction = animations['Idle'];
        activeAction?.play();
      }
    }

    if (mixer) mixer.update(delta);
  }

  // Interpolate other players
  const interpolationDelay = 100; // ms
  const currentTime = Date.now();
  const renderTime = currentTime - interpolationDelay;

  Object.values(otherPlayers).forEach((player) => {
    const { history, robot, mixer, idleAction, walkingAction } = player;

    // Need at least 2 updates to interpolate
    if (history.length < 2) {
      if (history.length === 1) {
        robot.position.copy(history[0].position);
        robot.rotation.y = history[0].rotation_y;
        // Assume idle
        if (player.activeAction !== idleAction) {
          player.activeAction.stop();
          player.activeAction = idleAction;
          player.activeAction.play();
        }
      }
      return;
    }

    let i = 0;
    let alpha = 0;
    if (renderTime < history[0].time) {
      // renderTime before earliest update, use first state
      i = 0;
      alpha = 0;
    } else if (renderTime >= history[history.length - 1].time) {
      // renderTime at or after latest update, use latest state
      i = history.length - 2;
      alpha = 1;
    } else {
      // renderTime between two updates, find bracketing pair
      for (i = 0; i < history.length - 1; i++) {
        if (history[i].time <= renderTime && renderTime < history[i + 1].time) {
          // Calculate interpolation factor (0 to 1) between the two timestamps
          alpha = (renderTime - history[i].time) / (history[i + 1].time - history[i].time);
          break;
        }
      }
    }

    const t0 = history[i].time;
    const t1 = history[i + 1].time;
    const p0 = history[i].position;
    const p1 = history[i + 1].position;
    const r0 = history[i].rotation_y;
    const r1 = history[i + 1].rotation_y;

    const interpolatedPosition = p0.clone().lerp(p1, alpha);

    // Interpolate rotation, adjusting for angle wrapping
    let deltaRotation = r1 - r0;
    if (deltaRotation > Math.PI) deltaRotation -= 2 * Math.PI;
    if (deltaRotation < -Math.PI) deltaRotation += 2 * Math.PI;
    const interpolatedRotation = r0 + deltaRotation * alpha;

    robot.position.copy(interpolatedPosition);
    robot.rotation.y = interpolatedRotation;

    // Calculate speed for animation
    let speed = 0;
    if (t1 > t0) {
      const dt = (t1 - t0) / 1000; // seconds
      const velocity = p1.clone().sub(p0).divideScalar(dt);
      speed = velocity.length();
    }
    const walkingThreshold = 1.0;
    if (speed > walkingThreshold) {
      if (player.activeAction !== walkingAction) {
        player.activeAction.stop();
        player.activeAction = walkingAction;
        player.activeAction.play();
      }
    } else {
      if (player.activeAction !== idleAction) {
        player.activeAction.stop();
        player.activeAction = idleAction;
        player.activeAction.play();
      }
    }

    // Update mixer
    mixer.update(delta);
  });

  renderer.render(scene, camera);
}

animate();

// Event listeners
document.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => console.log('Controls locked'));
controls.addEventListener('unlock', () => console.log('Controls unlocked'));

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': keys.w = true; break;
    case 'KeyA': keys.a = true; break;
    case 'KeyS': keys.s = true; break;
    case 'KeyD': keys.d = true; break;
    case 'Space': keys.space = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': keys.w = false; break;
    case 'KeyA': keys.a = false; break;
    case 'KeyS': keys.s = false; break;
    case 'KeyD': keys.d = false; break;
    case 'Space': keys.space = false; break;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});