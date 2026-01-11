#!/usr/bin/env node

/**
 * Nano-Banana Typo-Forge
 * AI-powered typeface DNA extraction and logo generation
 * 
 * Usage:
 *   npx tsx src/index.ts forge --input ./input/reference.png --target "FORGE" --strategy structural
 *   npx tsx src/index.ts analyze --input ./input/reference.png
 *   npx tsx src/index.ts quick --input ./input/reference.png --target "TEST"
 */

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { 
  runForgingProcess, 
  runParallelStrategies, 
  quickForge,
  analyzeOnly,
  type ForgeConfig 
} from './core/loopController.js';
import { type StrategyType, STRATEGIES } from './types/geometricDNA.js';
import { validateInputImage, listInputImages } from './utils/fileManager.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ============================================================================
// CLI Setup
// ============================================================================

const program = new Command();

program
  .name('typo-forge')
  .description('AI-powered typeface DNA extraction and logo generation')
  .version('1.0.0');

// ============================================================================
// FORGE Command - Full feedback loop
// ============================================================================

program
  .command('forge')
  .description('Run the full forging process with feedback loop')
  .requiredOption('-i, --input <path>', 'Path to reference image')
  .requiredOption('-t, --target <string>', 'Target string to generate')
  .option('-s, --strategy <type>', 'Strategy: structural, tool_based, negative_space', 'structural')
  .option('-m, --max-iterations <number>', 'Maximum iterations', '5')
  .option('-c, --convergence <number>', 'Convergence threshold (0-100)', '90')
  .option('--parallel', 'Run all strategies in parallel')
  .option('--size <size>', 'Image size: 1K, 2K, 4K', '4K')
  .option('--direct-prompts', 'Use direct prompts (faster, less adaptive)')
  .action(async (options) => {
    try {
      validateEnvironment();
      
      const inputPath = path.resolve(options.input);
      if (!validateInputImage(inputPath)) {
        console.error(`❌ Invalid input image: ${inputPath}`);
        process.exit(1);
      }

      const config: Partial<ForgeConfig> = {
        maxIterations: parseInt(options.maxIterations, 10),
        convergenceThreshold: parseInt(options.convergence, 10),
        imageOptions: {
          aspectRatio: '1:1',
          imageSize: options.size as '1K' | '2K' | '4K'
        }
      };

      console.log(BANNER);
      console.log('');

      if (options.parallel) {
        // Run all strategies in parallel
        const { bestResult, allResults } = await runParallelStrategies(
          inputPath,
          options.target,
          ['structural', 'tool_based', 'negative_space'],
          config
        );

        console.log('\n📊 Strategy Comparison:');
        for (const [strategy, result] of Object.entries(allResults)) {
          console.log(`  ${strategy}: ${result.finalScore}/100 (${result.converged ? 'converged' : 'not converged'})`);
        }

        console.log(`\n🏆 Best: ${bestResult.strategy}`);
        console.log(`   Output: ${bestResult.finalOutputPath}`);
      } else {
        // Run single strategy
        const strategy = validateStrategy(options.strategy);
        const result = await runForgingProcess(
          inputPath,
          options.target,
          strategy,
          config
        );

        console.log(`\n✅ Forging complete!`);
        console.log(`   Score: ${result.finalScore}/100`);
        console.log(`   Output: ${result.finalOutputPath}`);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// ============================================================================
// ANALYZE Command - DNA extraction only
// ============================================================================

program
  .command('analyze')
  .description('Analyze a reference image and extract its DNA')
  .requiredOption('-i, --input <path>', 'Path to reference image')
  .option('-o, --output <path>', 'Save DNA to JSON file')
  .action(async (options) => {
    try {
      validateEnvironment();
      
      const inputPath = path.resolve(options.input);
      if (!validateInputImage(inputPath)) {
        console.error(`❌ Invalid input image: ${inputPath}`);
        process.exit(1);
      }

      console.log(BANNER);
      console.log('');

      const dna = await analyzeOnly(inputPath);

      if (options.output) {
        const { writeJSON } = await import('./utils/fileManager.js');
        writeJSON(options.output, dna);
        console.log(`\n💾 DNA saved to: ${options.output}`);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// ============================================================================
// QUICK Command - Single-shot generation
// ============================================================================

program
  .command('quick')
  .description('Quick single-shot generation without feedback loop')
  .requiredOption('-i, --input <path>', 'Path to reference image')
  .requiredOption('-t, --target <string>', 'Target string to generate')
  .option('-s, --strategy <type>', 'Strategy: structural, tool_based, negative_space', 'structural')
  .action(async (options) => {
    try {
      validateEnvironment();
      
      const inputPath = path.resolve(options.input);
      if (!validateInputImage(inputPath)) {
        console.error(`❌ Invalid input image: ${inputPath}`);
        process.exit(1);
      }

      console.log(BANNER);
      console.log('');

      const strategy = validateStrategy(options.strategy);
      const result = await quickForge(inputPath, options.target, strategy);

      console.log(`\n✅ Quick forge complete!`);
      console.log(`   Output: ${result.outputPath}`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// ============================================================================
// LIST Command - List input images
// ============================================================================

program
  .command('list')
  .description('List available reference images in the input folder')
  .action(() => {
    const images = listInputImages();
    if (images.length === 0) {
      console.log('📁 No images found in ./input/ folder');
      console.log('   Place your reference images there to get started.');
    } else {
      console.log('📁 Available reference images:');
      images.forEach((img, i) => {
        console.log(`   ${i + 1}. ${img}`);
      });
    }
  });

// ============================================================================
// STRATEGIES Command - Show available strategies
// ============================================================================

program
  .command('strategies')
  .description('Show available generation strategies')
  .action(() => {
    console.log('\n📐 Available Strategies:\n');
    for (const [key, config] of Object.entries(STRATEGIES)) {
      console.log(`  ${key.toUpperCase()}`);
      console.log(`    ${config.description}`);
      console.log('    Focus areas:');
      config.focusAreas.forEach(area => {
        console.log(`      • ${area}`);
      });
      console.log('');
    }
  });

// ============================================================================
// Helper Functions
// ============================================================================

function validateEnvironment(): void {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY environment variable is not set');
    console.error('   Create a .env file with your API key:');
    console.error('   GEMINI_API_KEY=your_api_key_here');
    console.error('');
    console.error('   Get your API key at: https://aistudio.google.com/apikey');
    process.exit(1);
  }
}

function validateStrategy(strategy: string): StrategyType {
  const valid: StrategyType[] = ['structural', 'tool_based', 'negative_space'];
  if (!valid.includes(strategy as StrategyType)) {
    console.error(`❌ Invalid strategy: ${strategy}`);
    console.error(`   Valid options: ${valid.join(', ')}`);
    process.exit(1);
  }
  return strategy as StrategyType;
}

// ============================================================================
// Banner
// ============================================================================

const BANNER = `
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ███╗   ██╗ █████╗ ███╗   ██╗ ██████╗                           ║
║   ████╗  ██║██╔══██╗████╗  ██║██╔═══██╗                          ║
║   ██╔██╗ ██║███████║██╔██╗ ██║██║   ██║                          ║
║   ██║╚██╗██║██╔══██║██║╚██╗██║██║   ██║                          ║
║   ██║ ╚████║██║  ██║██║ ╚████║╚██████╔╝                          ║
║   ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝                           ║
║                                                                   ║
║   ██████╗  █████╗ ███╗   ██╗ █████╗ ███╗   ██╗ █████╗            ║
║   ██╔══██╗██╔══██╗████╗  ██║██╔══██╗████╗  ██║██╔══██╗           ║
║   ██████╔╝███████║██╔██╗ ██║███████║██╔██╗ ██║███████║           ║
║   ██╔══██╗██╔══██║██║╚██╗██║██╔══██║██║╚██╗██║██╔══██║           ║
║   ██████╔╝██║  ██║██║ ╚████║██║  ██║██║ ╚████║██║  ██║           ║
║   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝           ║
║                                                                   ║
║   ████████╗██╗   ██╗██████╗  ██████╗       ███████╗ ██████╗ ██████╗ ██╗   ███████╗
║   ╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔═══██╗      ██╔════╝██╔═══██╗██╔══██╗██║   ██╔════╝
║      ██║    ╚████╔╝ ██████╔╝██║   ██║█████╗█████╗  ██║   ██║██████╔╝██║   █████╗  
║      ██║     ╚██╔╝  ██╔═══╝ ██║   ██║╚════╝██╔══╝  ██║   ██║██╔══██╗██║   ██╔══╝  
║      ██║      ██║   ██║     ╚██████╔╝      ██║     ╚██████╔╝██║  ██║██║██╗███████╗
║      ╚═╝      ╚═╝   ╚═╝      ╚═════╝       ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝╚══════╝
║                                                                   ║
║   Typeface DNA Extraction & Logo Generation                       ║
║   Powered by Gemini 2.0 Pro + Nano Banana Pro                    ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`;

// ============================================================================
// Main
// ============================================================================

program.parse();
