# Nano-Banana Typo-Forge

AI-powered typeface DNA extraction and logo generation system using Gemini 2.0 Pro and Nano Banana Pro.

## Overview

Typo-Forge analyzes reference typefaces/logos to extract their "geometric DNA" - a structured specification of their visual characteristics. It then uses this DNA to generate new text in the same style through an iterative feedback loop.

```
Reference Image → DNA Extraction → Prompt Generation → Image Generation → Evaluation → Refinement
                      ↑                                                          ↓
                      └──────────────────── Feedback Loop ───────────────────────┘
```

## Features

- **DNA Extraction**: Analyzes typeface images to extract geometric specifications
- **3 Generation Strategies**: Structural, Tool-Based, and Negative Space approaches
- **Feedback Loop**: Iteratively refines output until convergence
- **4K Output**: Professional quality logo generation at 4096x4096
- **Parallel Strategies**: Run all strategies simultaneously to find the best result

## Installation

```bash
npm install
```

## Setup

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a `.env` file:

```bash
GEMINI_API_KEY=your_api_key_here
```

## Usage

### Full Forging Process

Run the complete feedback loop:

```bash
npm run forge -- --input ./input/reference.png --target "FORGE" --strategy structural
```

Options:
- `-i, --input <path>`: Path to reference image (required)
- `-t, --target <string>`: Target string to generate (required)
- `-s, --strategy <type>`: Strategy (structural, tool_based, negative_space)
- `-m, --max-iterations <n>`: Maximum iterations (default: 5)
- `-c, --convergence <n>`: Convergence threshold 0-100 (default: 90)
- `--parallel`: Run all strategies in parallel
- `--size <size>`: Image size (1K, 2K, 4K)

### Quick Generation

Single-shot generation without feedback loop:

```bash
npm run forge -- quick --input ./input/reference.png --target "TEST"
```

### DNA Analysis Only

Extract and display DNA without generating:

```bash
npm run forge -- analyze --input ./input/reference.png
```

### List Reference Images

```bash
npm run forge -- list
```

### Show Strategies

```bash
npm run forge -- strategies
```

## Strategies

### Structural (Default)
Compass-and-ruler construction focusing on:
- Perfect circles and straight lines
- Mathematical ratios and proportions
- Grid-based alignment
- Euclidean geometry constraints

### Tool-Based
Pen and calligraphic physics focusing on:
- Pen angle and nib width
- Stroke modulation from pressure
- Calligraphic ductus
- Natural ink flow

### Negative Space
Counter-focused design focusing on:
- Counter (internal space) consistency
- Aperture openings
- White space rhythm
- Optical balance

## Output Structure

```
output/
└── TARGET_strategy_timestamp/
    ├── iterations/
    │   ├── iteration_01.png
    │   ├── iteration_02.png
    │   └── ...
    ├── logs/
    │   ├── session.log
    │   ├── session.json
    │   ├── extracted_dna.json
    │   └── iteration_XX.json
    ├── final/
    │   └── TARGET_final.png
    └── result.json
```

## DNA Specification

The system extracts a `UniversalGeometricDNA` object with:

- **Structure**: Archetype, width axis, x-height
- **Stroke**: Weight, contrast ratio, contrast model
- **Terminals**: End cap style, adornments (serifs)
- **Joints**: Style, ink trap configuration
- **Special Rules**: Tittle shape, letter 'a' and 'g' styles
- **Layout**: Tracking, ligature propensity

## API Models Used

| Agent | Model | Purpose |
|-------|-------|---------|
| DNA Analyzer | `gemini-2.0-pro` | Vision-based typeface analysis |
| Prompt Engineer | `gemini-2.0-pro` | Strategy-based prompt generation |
| Image Generator | `gemini-3-pro-image-preview` | 4K logo generation (Nano Banana Pro) |
| Quality Critic | `gemini-2.0-pro` | Vision-based consistency evaluation |

## License

MIT
