import * as THREE from "three";
import { World } from "cannon-es";
import { InputManager } from "./InputManager";
import { PhysicsManager } from "./PhysicsManager";
import { SceneManager } from "./SceneManager";
import { CameraManager } from "./CameraManager";
import { Player } from "../entities/Player";
import { PerformanceMonitor } from "../utils/PerformanceMonitor";
import { ErrorHandler } from "../utils/ErrorHandler";

export class GameEngine {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private world!: World;
  private inputManager!: InputManager;
  private physicsManager!: PhysicsManager;
  private sceneManager!: SceneManager;
  private cameraManager!: CameraManager;
  private player!: Player;
  private performanceMonitor!: PerformanceMonitor;
  private errorHandler!: ErrorHandler;
  private isRunning = false;
  private deltaTime = 0;
  private lastFrameTime = 0;

  async initialize(): Promise<void> {
    try {
      // Initialize core systems
      this.errorHandler = new ErrorHandler();
      this.performanceMonitor = new PerformanceMonitor();

      // Setup THREE.js
      this.setupRenderer();
      this.setupCamera();
      this.setupScene();

      // Setup physics
      this.world = new World();
      this.world.gravity.set(0, -9.82, 0);
      this.physicsManager = new PhysicsManager(this.world);

      // Setup managers
      this.inputManager = new InputManager();
      this.sceneManager = new SceneManager(this.scene);
      this.cameraManager = new CameraManager(this.camera);

      // Create player
      this.player = new Player(this.scene, this.world);

      // Build level
      await this.sceneManager.buildLevel();

      // Handle window resize
      window.addEventListener("resize", () => this.onWindowResize());

      console.log("✓ Game engine initialized successfully");
    } catch (error) {
      this.errorHandler.handle(error);
      throw new Error(`Initialization failed: ${error}`);
    }
  }

  private setupRenderer(): void {
    try {
      const canvas = document.createElement("canvas");
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance",
      });

      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      document.body.appendChild(this.renderer.domElement);
    } catch (error) {
      throw new Error(`Renderer setup failed: ${error}`);
    }
  }

  private setupCamera(): void {
    try {
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
      );
      this.camera.position.set(0, 5, 10);
      this.camera.lookAt(0, 0, 0);
    } catch (error) {
      throw new Error(`Camera setup failed: ${error}`);
    }
  }

  private setupScene(): void {
    try {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x87ceeb);
      this.scene.fog = new THREE.Fog(0x87ceeb, 100, 1000);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 50, 50);
      directionalLight.castShadow = true;
      directionalLight.shadow.camera.left = -100;
      directionalLight.shadow.camera.right = 100;
      directionalLight.shadow.camera.top = 100;
      directionalLight.shadow.camera.bottom = -100;
      this.scene.add(directionalLight);
    } catch (error) {
      throw new Error(`Scene setup failed: ${error}`);
    }
  }

  private onWindowResize(): void {
    try {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    } catch (error) {
      this.errorHandler.handle(error);
    }
  }

  start(): void {
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    try {
      const currentTime = performance.now();
      this.deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.016); // Cap at 60 FPS
      this.lastFrameTime = currentTime;

      // Update
      this.update();

      // Render
      this.renderer.render(this.scene, this.camera);

      // Monitor performance
      this.performanceMonitor.update();
      this.updateUI();
    } catch (error) {
      this.errorHandler.handle(error);
      console.error("Error in game loop:", error);
    }

    requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    // Update input
    this.inputManager.update();

    // Update player
    this.player.update(this.deltaTime, this.inputManager);

    // Update camera
    this.cameraManager.followPlayer(this.player);

    // Update physics
    this.world.step(1 / 60, this.deltaTime, 3);

    // Update scene objects
    this.sceneManager.update(this.deltaTime);
  }

  private updateUI(): void {
    const fpsElement = document.getElementById("fps");
    const debugElement = document.getElementById("debug");

    if (fpsElement) {
      fpsElement.textContent = `FPS: ${this.performanceMonitor.fps.toFixed(0)}`;
    }

    if (debugElement) {
      const playerPos = this.player.getPosition();
      debugElement.innerHTML = `
        Players: 1<br>
        Position: (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)})<br>
        Physics Bodies: ${this.world.bodies.length}<br>
        Memory: ${(performance.memory?.usedJSHeapSize || 0) / 1048576).toFixed(1)} MB
      `;
    }
  }

  dispose(): void {
    try {
      this.isRunning = false;
      this.player.dispose();
      this.renderer.dispose();
      document.body.removeChild(this.renderer.domElement);
    } catch (error) {
      this.errorHandler.handle(error);
    }
  }
}
