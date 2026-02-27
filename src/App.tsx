import React, { useEffect, useRef, useState } from 'react';
import { Simulation } from './game/Simulation';
import { AntState, TerrainType, SpiderState, AntCaste } from './game/entities';

const ANT_FRAME_SIZE = 24;
const ANT_NUM_FRAMES = 8;
const antSprites: Record<string, HTMLCanvasElement> = {};

function getAntSprite(bodyColor: string, legColor: string): HTMLCanvasElement {
  const key = `${bodyColor}_${legColor}`;
  if (antSprites[key]) return antSprites[key];

  const canvas = document.createElement('canvas');
  canvas.width = ANT_FRAME_SIZE * ANT_NUM_FRAMES;
  canvas.height = ANT_FRAME_SIZE;
  const ctx = canvas.getContext('2d')!;

  for (let i = 0; i < ANT_NUM_FRAMES; i++) {
    const cx = i * ANT_FRAME_SIZE + ANT_FRAME_SIZE / 2;
    const cy = ANT_FRAME_SIZE / 2;
    
    // Map i from 0 to NUM_FRAMES to a phase from 0 to 2PI
    const phase = (i / ANT_NUM_FRAMES) * Math.PI * 2;
    const walkCycle = Math.sin(phase) * 2;

    ctx.save();
    ctx.translate(cx, cy);

    // Draw Legs (3 pairs)
    ctx.strokeStyle = legColor;
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    
    for (let j = 0; j < 3; j++) {
      const legOffset = (j % 2 === 0) ? walkCycle : -walkCycle;
      const baseX = -1.5 + j * 1.5; // Spread legs along thorax
      
      // Right leg
      ctx.beginPath();
      ctx.moveTo(baseX, 0.5);
      ctx.quadraticCurveTo(baseX + 1.5, 3.5, baseX + legOffset, 4);
      ctx.stroke();
      
      // Left leg
      ctx.beginPath();
      ctx.moveTo(baseX, -0.5);
      ctx.quadraticCurveTo(baseX + 1.5, -3.5, baseX - legOffset, -4);
      ctx.stroke();
    }

    // Draw Body Segments
    ctx.fillStyle = bodyColor;
    
    // Abdomen (back)
    ctx.beginPath();
    ctx.ellipse(-2.5, 0, 2.2, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Thorax (middle)
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.3, 1.0, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Head (front)
    ctx.beginPath();
    ctx.arc(2, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Mandibles
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(2.5, -0.5);
    ctx.quadraticCurveTo(4, -1.5, 3.5, -0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2.5, 0.5);
    ctx.quadraticCurveTo(4, 1.5, 3.5, 0.3);
    ctx.stroke();

    ctx.restore();
  }

  antSprites[key] = canvas;
  return canvas;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terrainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);
  const [stats, setStats] = useState({ tick: 0 });
  const [showPheromones, setShowPheromones] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const simulation = new Simulation(canvas.width, canvas.height);
    setSim(simulation);

    // Pre-render terrain to an offscreen canvas for performance
    const tCanvas = document.createElement('canvas');
    tCanvas.width = canvas.width;
    tCanvas.height = canvas.height;
    const tCtx = tCanvas.getContext('2d');
    if (tCtx) {
      tCtx.fillStyle = '#8B5A2B'; // Dirt color
      tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);
      
      for (let x = 0; x < simulation.cols; x++) {
        for (let y = 0; y < simulation.rows; y++) {
          if (simulation.terrain[x][y] === TerrainType.ROCK) {
            tCtx.fillStyle = '#5c5c5c'; // Gray rock
            tCtx.fillRect(x * simulation.gridSize, y * simulation.gridSize, simulation.gridSize, simulation.gridSize);
          } else if (simulation.terrain[x][y] === TerrainType.WATER) {
            tCtx.fillStyle = '#3b82f6'; // Blue water
            tCtx.fillRect(x * simulation.gridSize, y * simulation.gridSize, simulation.gridSize, simulation.gridSize);
          }
        }
      }
      terrainCanvasRef.current = tCanvas;
    }

    let animationFrameId: number;

    const render = () => {
      simulation.update();
      setStats({ tick: simulation.tickCount });

      // Draw pre-rendered terrain
      if (terrainCanvasRef.current) {
        ctx.drawImage(terrainCanvasRef.current, 0, 0);
      }

      // Draw Pheromones
      if (showPheromones) {
        for (const colony of simulation.colonies) {
          for (const index of colony.activePheromones) {
            const x = index % simulation.cols;
            const y = Math.floor(index / simulation.cols);
            
            const home = colony.homePheromones[x][y];
            const food = colony.foodPheromones[x][y];
            const alarm = colony.alarmPheromones[x][y];
            
            if (alarm > 5) {
              ctx.fillStyle = `rgba(255, 165, 0, ${alarm / 255})`; // Orange for alarm
              ctx.fillRect(x * simulation.gridSize, y * simulation.gridSize, simulation.gridSize, simulation.gridSize);
            } else if (home > 5 || food > 5) {
              ctx.fillStyle = `rgba(0, 0, 255, ${home / 255})`; // Blue for home
              if (home > 5) ctx.fillRect(x * simulation.gridSize, y * simulation.gridSize, simulation.gridSize, simulation.gridSize);
              ctx.fillStyle = `rgba(255, 0, 0, ${food / 255})`; // Red for food
              if (food > 5) ctx.fillRect(x * simulation.gridSize, y * simulation.gridSize, simulation.gridSize, simulation.gridSize);
            }
          }
        }
      }

      // Draw Mounds
      for (const colony of simulation.colonies) {
        ctx.fillStyle = '#3E2723'; // Dark brown
        ctx.beginPath();
        ctx.arc(colony.moundX, colony.moundY, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000'; // Hole
        ctx.beginPath();
        ctx.arc(colony.moundX, colony.moundY, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Food
      ctx.fillStyle = '#4CAF50'; // Green
      for (const food of simulation.foods) {
        ctx.beginPath();
        ctx.arc(food.x, food.y, Math.sqrt(food.amount) * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Ants
      for (const colony of simulation.colonies) {
        for (const ant of colony.ants) {
          ctx.save();
          ctx.translate(ant.x, ant.y);
          ctx.rotate(ant.wanderAngle);

          const isAttacking = ant.state === AntState.ATTACKING;
          const bodyColor = isAttacking ? '#ff5500' : colony.color;
          const legColor = isAttacking ? '#cc3300' : '#000000';
          
          const spriteSheet = getAntSprite(bodyColor, legColor);
          
          // Calculate frame index
          const phase = simulation.tickCount * 0.5 + ant.age;
          const normalizedPhase = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const frameIdx = Math.floor((normalizedPhase / (Math.PI * 2)) * ANT_NUM_FRAMES) % ANT_NUM_FRAMES;

          if (ant.caste === AntCaste.SOLDIER) {
            ctx.scale(1.4, 1.4);
          }

          ctx.drawImage(
            spriteSheet,
            frameIdx * ANT_FRAME_SIZE, 0, ANT_FRAME_SIZE, ANT_FRAME_SIZE,
            -ANT_FRAME_SIZE / 2, -ANT_FRAME_SIZE / 2, ANT_FRAME_SIZE, ANT_FRAME_SIZE
          );

          // Carrying food
          if (ant.state === AntState.RETURNING && ant.carryingFood) {
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            // Draw food in the mandibles (front of head) instead of on back
            ctx.arc(4, 0, Math.max(1.0, ant.payload * 0.25), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      // Draw Caterpillars
      for (const cat of simulation.caterpillars) {
        ctx.save();
        ctx.translate(cat.x, cat.y);
        ctx.rotate(cat.wanderAngle);

        ctx.fillStyle = '#8BC34A'; // Light green
        ctx.strokeStyle = '#558B2F'; // Dark green border
        ctx.lineWidth = 1;

        // 4 segments
        for (let s = -1; s <= 2; s++) {
          const segX = s * 7;
          const segRadius = s === 2 ? 5 : 6;
          
          ctx.beginPath();
          ctx.arc(segX, 0, segRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Health bar
        ctx.rotate(-cat.wanderAngle);
        const healthPercent = Math.max(0, cat.health / cat.maxHealth);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-10, -15, 20, 4);
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : '#F44336';
        ctx.fillRect(-9, -14, 18 * healthPercent, 2);

        ctx.restore();
      }

      // Draw Spiders
      for (const spider of simulation.spiders) {
        ctx.save();
        ctx.translate(spider.x, spider.y);
        ctx.rotate(spider.wanderAngle);

        // Legs with animation
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Only animate if moving
        const isMoving = spider.state !== SpiderState.FIGHTING;
        const walkCycle = isMoving ? Math.sin(simulation.tickCount * 0.3) * 4 : 0;
        
        for(let i=0; i<4; i++) {
          const legOffset = (i % 2 === 0) ? walkCycle : -walkCycle;
          const baseX = -4 + i * 3;
          
          // Right legs
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.quadraticCurveTo(baseX + 4, 12, baseX + legOffset, 16);
          ctx.stroke();
          
          // Left legs
          ctx.beginPath();
          ctx.moveTo(0, -4);
          ctx.quadraticCurveTo(baseX + 4, -12, baseX - legOffset, -16);
          ctx.stroke();
        }

        // Spider abdomen
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.ellipse(-4, 0, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Spider cephalothorax (head/chest)
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(6, 0, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (red glowing)
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(9, -2, 1, 0, Math.PI * 2);
        ctx.arc(9, 2, 1, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        ctx.rotate(-spider.wanderAngle); // Unrotate for health bar
        
        // Health bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-16, -24, 32, 6);
        
        // Health bar fill
        const healthPercent = Math.max(0, spider.health / spider.maxHealth);
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
        ctx.fillRect(-15, -23, 30 * healthPercent, 4);
        
        // Health bar border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-16, -24, 32, 6);

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [showPheromones]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sim || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    sim.spawnFoodAt(x, y, 50);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-300 flex flex-col items-center justify-center p-4 font-mono">
      <div className="max-w-7xl w-full">
        <div className="flex justify-between items-center mb-2 bg-stone-800 px-4 py-2 rounded-lg border border-stone-700 shadow">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-amber-500 tracking-wider">SIM-ANT</h1>
            <div className="flex gap-4 text-sm">
              {sim && sim.colonies.map(c => (
                <div key={c.id} className="flex gap-3 bg-stone-900 px-3 py-1 rounded border border-stone-700 items-center">
                  <span className="text-xs uppercase font-bold" style={{color: c.color === '#111111' ? '#888' : c.color}}>{c.id === 0 ? 'Black' : 'Red'}</span>
                  <span className="text-sm font-bold text-amber-400">{c.ants.length} <span className="text-stone-500 text-[10px]">ANTS</span></span>
                  <span className={`text-sm font-bold ${c.foodStored === 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                    {Math.floor(c.foodStored)} <span className="text-stone-500 text-[10px]">FOOD</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowPheromones(!showPheromones)}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${
              showPheromones 
                ? 'bg-indigo-600 text-white hover:bg-indigo-500' 
                : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
            }`}
          >
            {showPheromones ? 'Hide Scents' : 'Show Scents'}
          </button>
        </div>

        <div className="relative rounded-lg overflow-hidden border-2 border-stone-800 shadow-2xl bg-black">
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            onClick={handleCanvasClick}
            className="w-full h-auto block cursor-crosshair"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>
    </div>
  );
}
