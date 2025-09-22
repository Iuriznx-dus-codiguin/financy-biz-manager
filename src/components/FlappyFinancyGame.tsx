import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, RotateCcw, Trophy } from 'lucide-react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'top' | 'bottom';
}

const FlappyFinancyGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('flappy-financy-high-score') || '0');
  });
  const [showGameModal, setShowGameModal] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Game objects
  const [player, setPlayer] = useState<GameObject>({ x: 100, y: 200, width: 40, height: 40 });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [velocity, setVelocity] = useState(0);

  const GRAVITY = 0.6;
  const JUMP_FORCE = -12;
  const GAME_SPEED = 3;
  const OBSTACLE_WIDTH = 60;
  const GAP_SIZE = 150;

  // Initialize game
  const initGame = useCallback(() => {
    setPlayer({ x: 100, y: 200, width: 40, height: 40 });
    setObstacles([]);
    setVelocity(0);
    setScore(0);
  }, []);

  // Jump function
  const jump = useCallback(() => {
    if (gameState === 'playing') {
      setVelocity(JUMP_FORCE);
    }
  }, [gameState]);

  // Open game modal and start countdown
  const openGameModal = useCallback(() => {
    setShowGameModal(true);
    setGameState('countdown');
    setCountdown(3);
  }, []);

  // Start countdown
  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'countdown' && countdown === 0) {
      // Start game after countdown
      initGame();
      setGameState('playing');
    }
  }, [gameState, countdown, initGame]);

  // Start game
  const startGame = useCallback(() => {
    openGameModal();
  }, [openGameModal]);

  // Game over
  const gameOver = useCallback(() => {
    setGameState('gameOver');
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('flappy-financy-high-score', score.toString());
    }
  }, [score, highScore]);

  // Close modal and reset
  const closeGameModal = useCallback(() => {
    setShowGameModal(false);
    setGameState('idle');
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  }, []);

  // Check collisions
  const checkCollision = useCallback((player: GameObject, obstacle: Obstacle): boolean => {
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    );
  }, []);

  // Generate obstacles
  const generateObstacle = useCallback((x: number) => {
    const gapY = Math.random() * (300 - GAP_SIZE) + 100;
    
    return [
      {
        x,
        y: 0,
        width: OBSTACLE_WIDTH,
        height: gapY,
        type: 'top' as const
      },
      {
        x,
        y: gapY + GAP_SIZE,
        width: OBSTACLE_WIDTH,
        height: 400 - (gapY + GAP_SIZE),
        type: 'bottom' as const
      }
    ];
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    // Update player
    setVelocity(prev => prev + GRAVITY);
    setPlayer(prev => {
      const newY = prev.y + velocity;
      
      // Check boundaries
      if (newY <= 0 || newY >= 360) {
        gameOver();
        return prev;
      }
      
      return { ...prev, y: newY };
    });

    // Update obstacles
    setObstacles(prev => {
      let newObstacles = prev.map(obstacle => ({
        ...obstacle,
        x: obstacle.x - GAME_SPEED
      })).filter(obstacle => obstacle.x + obstacle.width > -50);

      // Add new obstacles
      if (newObstacles.length === 0 || newObstacles[newObstacles.length - 1].x < 600) {
        newObstacles.push(...generateObstacle(800));
      }

      // Check collisions
      for (const obstacle of newObstacles) {
        if (checkCollision(player, obstacle)) {
          gameOver();
          break;
        }
      }

      // Update score
      const passedObstacles = newObstacles.filter(
        obstacle => obstacle.type === 'top' && obstacle.x + obstacle.width < player.x
      );
      const newScore = Math.floor(passedObstacles.length);
      if (newScore > score) {
        setScore(newScore);
      }

      return newObstacles;
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, velocity, player, score, gameOver, checkCollision, generateObstacle]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jump]);

  // Start game loop when playing
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (money theme)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(1, '#059669');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw money pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.font = '20px Arial';
    for (let i = 0; i < canvas.width; i += 100) {
      for (let j = 0; j < canvas.height; j += 80) {
        ctx.fillText('$', i, j);
        ctx.fillText('€', i + 50, j + 40);
      }
    }

    if (gameState === 'playing' || gameState === 'gameOver' || gameState === 'countdown') {
      // Draw obstacles
      if (gameState !== 'countdown') {
        obstacles.forEach(obstacle => {
          if (obstacle.type === 'top') {
            // Red obstacles from top
            const redGradient = ctx.createLinearGradient(0, 0, 0, obstacle.height);
            redGradient.addColorStop(0, '#dc2626');
            redGradient.addColorStop(1, '#991b1b');
            ctx.fillStyle = redGradient;
          } else {
            // Green obstacles from bottom
            const greenGradient = ctx.createLinearGradient(0, 0, 0, obstacle.height);
            greenGradient.addColorStop(0, '#16a34a');
            greenGradient.addColorStop(1, '#166534');
            ctx.fillStyle = greenGradient;
          }
          
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          
          // Add border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
      }

      // Draw player (F logo)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('F', player.x + player.width / 2, player.y + player.height / 2);
      
      // Add glow effect to F
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#3b82f6';
      ctx.fillText('F', player.x + player.width / 2, player.y + player.height / 2);
      ctx.shadowBlur = 0;
    }

    // Draw UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    
    if (gameState !== 'countdown') {
      ctx.fillText(`Pontos: ${score}`, 20, 40);
      ctx.fillText(`Recorde: ${highScore}`, 20, 70);
    }
    
    // Draw countdown
    if (gameState === 'countdown' && countdown > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2);
      
      // Add glow effect
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#3b82f6';
      ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2);
      ctx.shadowBlur = 0;
    }
  }, [player, obstacles, score, highScore, gameState, countdown]);

  return (
    <>
      <Card className="rounded-2xl shadow-sm border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">🎮</div>
          <h3 className="font-bold mb-2">Passar o Tempo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Jogue Flappy Financy! Use espaço ou clique para pular
          </p>

          <Button
            onClick={startGame}
            className="w-full rounded-xl bg-purple-600 hover:bg-purple-700"
          >
            <Play className="mr-2 h-4 w-4" />
            Jogar Flappy Financy
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Desvie dos gráficos vermelhos (queda) e verdes (alta) para conseguir pontos!
          </p>
        </CardContent>
      </Card>

      <Dialog open={showGameModal} onOpenChange={closeGameModal}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-center text-2xl font-bold">
              Flappy Financy 🎮
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 p-6 pt-2">
            <div className="relative mb-4 flex justify-center">
              <canvas
                ref={canvasRef}
                width={800}
                height={400}
                className="border-2 border-purple-200 dark:border-purple-600 rounded-lg bg-gradient-to-b from-blue-400 to-green-400 cursor-pointer"
                onClick={jump}
              />
              
              {gameState === 'gameOver' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
                  <div className="text-center text-white">
                    <div className="text-4xl mb-4">💥</div>
                    <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
                    <p className="mb-2">Pontuação: {score}</p>
                    {score === highScore && score > 0 && (
                      <p className="mb-4 text-yellow-400 flex items-center justify-center">
                        <Trophy className="mr-1 h-4 w-4" />
                        Novo Recorde!
                      </p>
                    )}
                    <div className="space-x-2">
                      <Button
                        onClick={startGame}
                        className="rounded-xl bg-green-600 hover:bg-green-700"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Jogar Novamente
                      </Button>
                      <Button
                        onClick={closeGameModal}
                        variant="outline"
                        className="rounded-xl"
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Como jogar:</strong> Clique no canvas ou pressione ESPAÇO para fazer o F pular
              </p>
              <p className="text-xs text-muted-foreground">
                Desvie dos obstáculos vermelhos e verdes para marcar pontos!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FlappyFinancyGame;