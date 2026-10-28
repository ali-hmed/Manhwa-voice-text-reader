/**
 * Script to generate a test comic-style fixture image with known text.
 * Uses canvas to create a simple comic panel with speech bubbles.
 *
 * Run: node scripts/generate-test-fixture.mjs
 */
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../test/fixtures');

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const WIDTH = 800;
const HEIGHT = 1200;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#f0f0f0';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Panel border
ctx.strokeStyle = '#333';
ctx.lineWidth = 3;
ctx.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40);

// Speech bubble 1 (top)
drawBubble(ctx, 200, 120, 350, 100);
ctx.fillStyle = '#000';
ctx.font = 'bold 24px Arial';
ctx.textAlign = 'center';
ctx.fillText('Hello World!', 375, 155);
ctx.font = '18px Arial';
ctx.fillText('This is a test.', 375, 185);

// Speech bubble 2 (middle)
drawBubble(ctx, 100, 400, 380, 120);
ctx.fillStyle = '#000';
ctx.font = 'bold 22px Arial';
ctx.textAlign = 'center';
ctx.fillText('I can read comics!', 290, 445);
ctx.font = '18px Arial';
ctx.fillText('The voice speaks clearly.', 290, 475);

// Speech bubble 3 (bottom)
drawBubble(ctx, 300, 750, 400, 130);
ctx.fillStyle = '#000';
ctx.font = 'bold 24px Arial';
ctx.textAlign = 'center';
ctx.fillText('Great power comes', 500, 795);
ctx.font = '20px Arial';
ctx.fillText('with responsibility.', 500, 825);
ctx.font = '16px Arial';
ctx.fillText('Never forget that.', 500, 855);

// Character placeholders (stick figures)
ctx.strokeStyle = '#666';
ctx.lineWidth = 2;
drawStickFigure(ctx, 120, 250);
drawStickFigure(ctx, 600, 600);

function drawBubble(ctx, x, y, w, h) {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const r = 15;
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, y + h);
  ctx.lineTo(x + w * 0.25, y + h + 25);
  ctx.lineTo(x + w * 0.45, y + h);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.stroke();
}

function drawStickFigure(ctx, x, y) {
  // Head
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.stroke();
  // Body
  ctx.beginPath();
  ctx.moveTo(x, y + 20);
  ctx.lineTo(x, y + 70);
  ctx.stroke();
  // Arms
  ctx.beginPath();
  ctx.moveTo(x - 25, y + 40);
  ctx.lineTo(x + 25, y + 40);
  ctx.stroke();
  // Legs
  ctx.beginPath();
  ctx.moveTo(x, y + 70);
  ctx.lineTo(x - 20, y + 100);
  ctx.moveTo(x, y + 70);
  ctx.lineTo(x + 20, y + 100);
  ctx.stroke();
}

// Save
const buffer = canvas.toBuffer('image/png');
const outPath = resolve(outDir, 'test-comic.png');
writeFileSync(outPath, buffer);
console.log(`Test fixture generated: ${outPath}`);
console.log(`Size: ${buffer.length} bytes (${WIDTH}x${HEIGHT})`);
