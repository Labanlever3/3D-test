import { GameEngine } from "./engine/GameEngine";
import { ErrorHandler } from "./utils/ErrorHandler";

// Initialize error handling
const errorHandler = new ErrorHandler();
window.addEventListener("error", (event) => errorHandler.handle(event));
window.addEventListener("unhandledrejection", (event) =>
  errorHandler.handle(event)
);

async function initializeGame() {
  try {
    const engine = new GameEngine();
    await engine.initialize();
    engine.start();

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      engine.dispose();
    });
  } catch (error) {
    errorHandler.handle(error);
    console.error("Failed to initialize game:", error);
  }
}

// Start game
initializeGame().catch((error) => {
  console.error("Fatal error during initialization:", error);
  errorHandler.handle(error);
});
