import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("🚀 Starting Vite development server...");

// Run Vite directly
async function startVite() {
  try {
    const viteProcess = exec("npx vite --config vite.replit.config.ts --port 5000 --host 0.0.0.0", (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(stdout);
    });

    // Forward output to console
    viteProcess.stdout?.on('data', (data) => {
      process.stdout.write(data);
    });

    viteProcess.stderr?.on('data', (data) => {
      process.stderr.write(data);
    });

    // Handle process exit
    viteProcess.on('exit', (code) => {
      console.log(`Vite process exited with code ${code}`);
      process.exit(code || 0);
    });

  } catch (error) {
    console.error("Failed to start Vite:", error);
    process.exit(1);
  }
}

startVite();