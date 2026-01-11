/**
 * File Manager Utility
 * Handles image and log file management for the forge system
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Configuration
// ============================================================================

const OUTPUT_BASE_DIR = 'output';
const INPUT_DIR = 'input';

export interface SessionPaths {
  sessionDir: string;
  iterationsDir: string;
  logsDir: string;
  finalDir: string;
}

// ============================================================================
// Directory Management
// ============================================================================

/**
 * Create a new session directory structure
 */
export function createSessionDirectory(
  targetString: string,
  strategy: string
): SessionPaths {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedTarget = targetString.replace(/[^a-zA-Z0-9]/g, '_');
  const sessionName = `${sanitizedTarget}_${strategy}_${timestamp}`;
  
  const sessionDir = path.join(OUTPUT_BASE_DIR, sessionName);
  const iterationsDir = path.join(sessionDir, 'iterations');
  const logsDir = path.join(sessionDir, 'logs');
  const finalDir = path.join(sessionDir, 'final');

  // Create all directories
  [sessionDir, iterationsDir, logsDir, finalDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return { sessionDir, iterationsDir, logsDir, finalDir };
}

/**
 * Get the path for an iteration output image
 */
export function getIterationImagePath(
  sessionPaths: SessionPaths,
  iteration: number
): string {
  return path.join(
    sessionPaths.iterationsDir,
    `iteration_${iteration.toString().padStart(2, '0')}.png`
  );
}

/**
 * Get the path for the final output image
 */
export function getFinalImagePath(
  sessionPaths: SessionPaths,
  targetString: string
): string {
  const sanitizedTarget = targetString.replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(sessionPaths.finalDir, `${sanitizedTarget}_final.png`);
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Copy file to destination
 */
export function copyFile(sourcePath: string, destPath: string): void {
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(sourcePath, destPath);
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Read file contents as string
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write string contents to file
 */
export function writeFile(filePath: string, contents: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, contents, 'utf-8');
}

/**
 * Write JSON to file with pretty printing
 */
export function writeJSON(filePath: string, data: unknown): void {
  writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Read JSON from file
 */
export function readJSON<T>(filePath: string): T {
  const contents = readFile(filePath);
  return JSON.parse(contents) as T;
}

// ============================================================================
// Logging
// ============================================================================

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: unknown;
}

/**
 * Create a session logger
 */
export function createSessionLogger(sessionPaths: SessionPaths) {
  const logPath = path.join(sessionPaths.logsDir, 'session.log');
  const jsonLogPath = path.join(sessionPaths.logsDir, 'session.json');
  const entries: LogEntry[] = [];

  const log = (level: LogEntry['level'], message: string, data?: unknown) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    entries.push(entry);

    // Append to text log
    const logLine = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}${data ? ` | ${JSON.stringify(data)}` : ''}\n`;
    fs.appendFileSync(logPath, logLine);

    // Update JSON log
    writeJSON(jsonLogPath, entries);

    // Console output with color
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      debug: '\x1b[90m'    // Gray
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}[${level.toUpperCase()}]${reset} ${message}`);
  };

  return {
    info: (message: string, data?: unknown) => log('info', message, data),
    warn: (message: string, data?: unknown) => log('warn', message, data),
    error: (message: string, data?: unknown) => log('error', message, data),
    debug: (message: string, data?: unknown) => log('debug', message, data),
    getEntries: () => [...entries]
  };
}

// ============================================================================
// Session Results
// ============================================================================

/**
 * Save the complete session result
 */
export function saveSessionResult(
  sessionPaths: SessionPaths,
  result: unknown
): string {
  const resultPath = path.join(sessionPaths.sessionDir, 'result.json');
  writeJSON(resultPath, result);
  return resultPath;
}

/**
 * Save DNA extraction result
 */
export function saveDNAResult(
  sessionPaths: SessionPaths,
  dna: unknown
): string {
  const dnaPath = path.join(sessionPaths.logsDir, 'extracted_dna.json');
  writeJSON(dnaPath, dna);
  return dnaPath;
}

/**
 * Save iteration details
 */
export function saveIterationDetails(
  sessionPaths: SessionPaths,
  iteration: number,
  details: unknown
): string {
  const iterPath = path.join(
    sessionPaths.logsDir,
    `iteration_${iteration.toString().padStart(2, '0')}.json`
  );
  writeJSON(iterPath, details);
  return iterPath;
}

// ============================================================================
// Input File Handling
// ============================================================================

/**
 * List all image files in the input directory
 */
export function listInputImages(): string[] {
  if (!fs.existsSync(INPUT_DIR)) {
    return [];
  }

  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  return fs.readdirSync(INPUT_DIR)
    .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
    .map(file => path.join(INPUT_DIR, file));
}

/**
 * Validate that an input image exists and is readable
 */
export function validateInputImage(imagePath: string): boolean {
  try {
    if (!fs.existsSync(imagePath)) {
      return false;
    }
    
    const stats = fs.statSync(imagePath);
    if (!stats.isFile()) {
      return false;
    }

    const ext = path.extname(imagePath).toLowerCase();
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    return validExtensions.includes(ext);
  } catch {
    return false;
  }
}
