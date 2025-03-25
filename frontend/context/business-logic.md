# Overall objective
- Design a game in 5 days
- Therefore, simplicity is key! Unnecessary complexity should be avoided!

## Business Logic of the Non-Graphic First Person Shooter Game (Online Multiplayer Edition)

## Introduction
This game transforms the classic first-person experience into a tactical shooter that emphasizes engaging gun mechanics and projectile physics without explicit or graphic violence. The focus is on strategic combat and movement in a stylized, minimalistic environment, with players competing in online multiplayer free-for-all matches.

## Key Features
- **First-Person Immersion**: Experience the game directly from the player's perspective.
- **Tactical Movement**: Navigate the environment using familiar controls (W, A, S, D, and Spacebar for jumping) with fluid camera-based aiming.
- **Gun Mechanics**: Utilize a range of firearms, each with unique handling, reload timings, and firing rates.
- **Projectile Dynamics**: Simulate realistic bullet trajectories and collision detection, ensuring satisfying yet non-graphic impacts.
- **Non-Graphic Presentation**: Combat outcomes are communicated through abstract effects and minimalistic visuals, avoiding explicit depictions of violence.
- **Online Multiplayer Matches**: Engage in competitive free-for-all battles with up to 15 players over the internet.

## Core Mechanics

### 1. Player Control
- **Movement**: Navigate with directional keys; movement is smoothly integrated with the camera's orientation.
- **Camera and Aim**: Mouse movement provides precise control over where you look and aim, ensuring intuitive shooting mechanics.

### 2. Weapon Handling
- **Firearm Selection**: Choose from multiple weapons, each with distinct characteristics such as rate of fire, accuracy, and reload time.
- **Shooting Mechanics**: 
  - **Firing**: Bullets are emitted as projectiles that follow a realistic trajectory.
  - **Reloading**: Each gun features a reload mechanic that requires strategic timing.

### 3. Projectile Physics
- **Trajectory and Impact**: 
  - Bullets travel along a linear or ballistic path depending on the weapon.
  - Collision detection ensures that projectiles interact with the environment and opponents accurately.
- **Feedback Effects**: Impact effects (e.g., sparks, abstract hit markers) communicate successful hits without graphic details.

### 4. Multiplayer Combat and Online Interaction
- **Player Encounters**: 
  - Fight against opponents with real human players engaging in dynamic, unpredictable combat.
  - Matches are organized as free-for-all games with up to 15 players, where individual performance is tracked.
- **Networking and Matchmaking**: 
  - Real-time communication channels may be provided for in-game interactions.
- **Damage and Scoring System**: 
  - Hits are registered through precise collision checks.
  - A clear scoring system tracks kills and deaths for each player, determining the match winner based on individual performance.