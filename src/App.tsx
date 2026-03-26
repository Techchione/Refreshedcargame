/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Zap, AlertTriangle } from 'lucide-react';
import { 
  GameState, 
  Enemy, 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  CAR_WIDTH, 
  CAR_HEIGHT, 
  ROAD_WIDTH,
  LANE_COUNT 
} from './types';

const LANE_WIDTH = ROAD_WIDTH / 3;
const ROAD_X = (CANVAS_WIDTH - ROAD_WIDTH) / 2;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    playerX: CANVAS_WIDTH / 2 - CAR_WIDTH / 2,
    playerY: CANVAS_HEIGHT - CAR_HEIGHT - 20,
    enemies: [],
    score: 0,
    gameOver: false,
    speed: 5,
    distance: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(0);
  
  const requestRef = useRef<number>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const spawnEnemy = useCallback(() => {
    const lane = Math.floor(Math.random() * 3);
    const x = ROAD_X + lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
    const type = Math.floor(Math.random() * 4);
    return {
      id: Date.now() + Math.random(),
      x,
      y: -CAR_HEIGHT,
      speed: 2 + Math.random() * 3,
      type,
    };
  }, []);

  const startGame = () => {
    setGameState({
      playerX: CANVAS_WIDTH / 2 - CAR_WIDTH / 2,
      playerY: CANVAS_HEIGHT - CAR_HEIGHT - 20,
      enemies: [spawnEnemy()],
      score: 0,
      gameOver: false,
      speed: 5,
      distance: 0,
    });
    setIsPlaying(true);
  };

  const updateGame = useCallback(() => {
    if (!isPlaying || gameState.gameOver) return;

    setGameState(prev => {
      // Handle movement
      let newPlayerX = prev.playerX;
      const moveSpeed = 7;
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['a']) {
        newPlayerX = Math.max(ROAD_X, prev.playerX - moveSpeed);
      }
      if (keysPressed.current['ArrowRight'] || keysPressed.current['d']) {
        newPlayerX = Math.min(ROAD_X + ROAD_WIDTH - CAR_WIDTH, prev.playerX + moveSpeed);
      }

      // Update enemies
      let newEnemies = prev.enemies.map(e => ({ ...e, y: e.y + e.speed + prev.speed * 0.5 }));
      
      // Remove off-screen enemies and spawn new ones
      newEnemies = newEnemies.filter(e => e.y < CANVAS_HEIGHT);
      if (newEnemies.length < 3 && Math.random() < 0.02) {
        newEnemies.push(spawnEnemy());
      }

      // Check collisions
      const playerRect = { x: newPlayerX + 5, y: prev.playerY + 5, w: CAR_WIDTH - 10, h: CAR_HEIGHT - 10 };
      const collision = newEnemies.some(e => {
        const enemyRect = { x: e.x + 5, y: e.y + 5, w: CAR_WIDTH - 10, h: CAR_HEIGHT - 10 };
        return playerRect.x < enemyRect.x + enemyRect.w &&
               playerRect.x + playerRect.w > enemyRect.x &&
               playerRect.y < enemyRect.y + enemyRect.h &&
               playerRect.y + playerRect.h > enemyRect.y;
      });

      if (collision) {
        if (prev.score > highScore) setHighScore(prev.score);
        return { ...prev, gameOver: true };
      }

      // Update score and speed
      const newDistance = prev.distance + prev.speed;
      const newScore = Math.floor(newDistance / 100);
      const newSpeed = 5 + Math.floor(newScore / 10) * 0.5;

      return {
        ...prev,
        playerX: newPlayerX,
        enemies: newEnemies,
        score: newScore,
        distance: newDistance,
        speed: Math.min(newSpeed, 15),
      };
    });

    requestRef.current = requestAnimationFrame(updateGame);
  }, [isPlaying, gameState.gameOver, spawnEnemy, highScore]);

  useEffect(() => {
    if (isPlaying && !gameState.gameOver) {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, gameState.gameOver, updateGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Rendering logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Grass
      ctx.fillStyle = '#2d5a27';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Road
      ctx.fillStyle = '#333';
      ctx.fillRect(ROAD_X, 0, ROAD_WIDTH, CANVAS_HEIGHT);

      // Draw Lane Markings
      ctx.strokeStyle = '#fff';
      ctx.setLineDash([40, 40]);
      ctx.lineDashOffset = -(gameState.distance % 80);
      ctx.lineWidth = 4;
      
      for (let i = 1; i < LANE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(ROAD_X + i * LANE_WIDTH, 0);
        ctx.lineTo(ROAD_X + i * LANE_WIDTH, CANVAS_HEIGHT);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw Player Car
      drawCar(ctx, gameState.playerX, gameState.playerY, '#3b82f6', true);

      // Draw Enemies
      gameState.enemies.forEach(e => {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];
        drawCar(ctx, e.x, e.y, colors[e.type], false);
      });
    };

    const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isPlayer: boolean) => {
      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, CAR_WIDTH, CAR_HEIGHT, 8);
      ctx.fill();

      // Roof/Windows
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 5, y + 20, CAR_WIDTH - 10, 30);

      // Headlights
      ctx.fillStyle = isPlayer ? '#fff' : '#ff0';
      ctx.fillRect(x + 5, y + 2, 8, 5);
      ctx.fillRect(x + CAR_WIDTH - 13, y + 2, 8, 5);

      // Tail lights
      ctx.fillStyle = isPlayer ? '#f00' : '#f00';
      ctx.fillRect(x + 5, y + CAR_HEIGHT - 7, 8, 5);
      ctx.fillRect(x + CAR_WIDTH - 13, y + CAR_HEIGHT - 7, 8, 5);

      // Wheels
      ctx.fillStyle = '#111';
      ctx.fillRect(x - 2, y + 10, 4, 15);
      ctx.fillRect(x + CAR_WIDTH - 2, y + 10, 4, 15);
      ctx.fillRect(x - 2, y + CAR_HEIGHT - 25, 4, 15);
      ctx.fillRect(x + CAR_WIDTH - 2, y + CAR_HEIGHT - 25, 4, 15);
    };

    draw();
  }, [gameState]);

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-4 font-sans text-white overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-4 px-2">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">Score</span>
          <span className="text-3xl font-black italic text-blue-500">{gameState.score}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">High Score</span>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-xl font-bold">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-[#333]">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          className="bg-[#333]"
        />

        {/* Overlay UI */}
        <AnimatePresence>
          {!isPlaying && !gameState.gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.h1 
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-6xl font-black italic mb-2 tracking-tighter text-blue-500"
              >
                TURBO<br/>RACER
              </motion.h1>
              <p className="text-gray-300 mb-8 max-w-xs">
                Avoid traffic and race as far as you can. Use Arrow keys or WASD to steer.
              </p>
              <button 
                onClick={startGame}
                className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 transition-all rounded-full font-bold flex items-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                <Play className="fill-current" />
                START ENGINE
              </button>
            </motion.div>
          )}

          {gameState.gameOver && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-red-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <AlertTriangle className="w-16 h-16 text-white mb-4 animate-bounce" />
              <h2 className="text-5xl font-black italic mb-2">CRASHED!</h2>
              <div className="bg-black/40 p-6 rounded-2xl mb-8 w-full">
                <div className="text-sm text-gray-300 uppercase tracking-widest mb-1">Final Score</div>
                <div className="text-4xl font-black text-yellow-500">{gameState.score}</div>
              </div>
              <button 
                onClick={startGame}
                className="px-8 py-4 bg-white text-red-900 hover:bg-gray-200 transition-all rounded-full font-bold flex items-center gap-3"
              >
                <RotateCcw />
                TRY AGAIN
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUD Elements */}
        {isPlaying && !gameState.gameOver && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full border border-white/10">
                <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
                <span className="text-sm font-bold">{Math.floor(gameState.speed * 20)} KM/H</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls Info */}
      <div className="mt-8 flex gap-8 text-gray-500 text-sm font-medium uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <kbd className="bg-[#333] px-2 py-1 rounded border border-[#444] text-gray-300">A</kbd>
          <kbd className="bg-[#333] px-2 py-1 rounded border border-[#444] text-gray-300">D</kbd>
          <span>Steer</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="bg-[#333] px-2 py-1 rounded border border-[#444] text-gray-300">Arrows</kbd>
          <span>Steer</span>
        </div>
      </div>
    </div>
  );
}
