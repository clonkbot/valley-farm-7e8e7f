import React, { useState, useEffect, useCallback } from 'react';

type CropType = 'parsnip' | 'cauliflower' | 'potato' | 'strawberry' | 'melon' | 'corn' | 'pumpkin';
type Season = 'spring' | 'summer' | 'fall' | 'winter';
type Weather = 'sunny' | 'rainy' | 'cloudy';

interface Crop {
  type: CropType;
  growth: number;
  maxGrowth: number;
  watered: boolean;
  planted: number;
}

interface Tile {
  tilled: boolean;
  crop: Crop | null;
}

interface GameState {
  gold: number;
  day: number;
  season: Season;
  weather: Weather;
  energy: number;
  maxEnergy: number;
  tool: 'hoe' | 'water' | 'seeds' | 'harvest';
  selectedSeed: CropType;
  inventory: Record<CropType, number>;
  seeds: Record<CropType, number>;
}

const CROP_DATA: Record<CropType, { emoji: string; stages: string[]; growTime: number; sellPrice: number; seedPrice: number; seasons: Season[] }> = {
  parsnip: { emoji: '🥕', stages: ['🌱', '🌿', '🥕'], growTime: 4, sellPrice: 35, seedPrice: 20, seasons: ['spring'] },
  cauliflower: { emoji: '🥦', stages: ['🌱', '🌿', '🥬', '🥦'], growTime: 12, sellPrice: 175, seedPrice: 80, seasons: ['spring'] },
  potato: { emoji: '🥔', stages: ['🌱', '🌿', '🥔'], growTime: 6, sellPrice: 80, seedPrice: 50, seasons: ['spring'] },
  strawberry: { emoji: '🍓', stages: ['🌱', '🌿', '🌸', '🍓'], growTime: 8, sellPrice: 120, seedPrice: 100, seasons: ['spring', 'summer'] },
  melon: { emoji: '🍈', stages: ['🌱', '🌿', '🍈'], growTime: 12, sellPrice: 250, seedPrice: 80, seasons: ['summer'] },
  corn: { emoji: '🌽', stages: ['🌱', '🌿', '🌾', '🌽'], growTime: 14, sellPrice: 50, seedPrice: 150, seasons: ['summer', 'fall'] },
  pumpkin: { emoji: '🎃', stages: ['🌱', '🌿', '🎃'], growTime: 13, sellPrice: 320, seedPrice: 100, seasons: ['fall'] },
};

const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter'];
const SEASON_COLORS: Record<Season, { bg: string; accent: string }> = {
  spring: { bg: 'from-green-200 via-pink-100 to-green-300', accent: '#ff9eb5' },
  summer: { bg: 'from-yellow-200 via-orange-200 to-yellow-300', accent: '#ffd93d' },
  fall: { bg: 'from-orange-300 via-amber-200 to-red-300', accent: '#ff6b35' },
  winter: { bg: 'from-blue-100 via-slate-200 to-blue-200', accent: '#a8dadc' },
};

const GRID_SIZE = 6;

function createInitialGrid(): Tile[][] {
  return Array(GRID_SIZE).fill(null).map(() =>
    Array(GRID_SIZE).fill(null).map(() => ({ tilled: false, crop: null }))
  );
}

export default function App() {
  const [grid, setGrid] = useState<Tile[][]>(createInitialGrid);
  const [gameState, setGameState] = useState<GameState>({
    gold: 500,
    day: 1,
    season: 'spring',
    weather: 'sunny',
    energy: 100,
    maxEnergy: 100,
    tool: 'hoe',
    selectedSeed: 'parsnip',
    inventory: { parsnip: 0, cauliflower: 0, potato: 0, strawberry: 0, melon: 0, corn: 0, pumpkin: 0 },
    seeds: { parsnip: 15, cauliflower: 0, potato: 0, strawberry: 0, melon: 0, corn: 0, pumpkin: 0 },
  });
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  const [showShop, setShowShop] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(0.5);

  const getSeasonCrops = useCallback((season: Season): CropType[] => {
    return (Object.keys(CROP_DATA) as CropType[]).filter(crop =>
      CROP_DATA[crop].seasons.includes(season)
    );
  }, []);

  const addParticle = useCallback((x: number, y: number, emoji: string) => {
    const id = Date.now() + Math.random();
    setParticles(prev => [...prev, { id, x, y, emoji }]);
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 1000);
  }, []);

  const handleTileClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;

    if (gameState.energy <= 0) {
      addParticle(x, y, '😴');
      return;
    }

    setGrid(prev => {
      const newGrid = prev.map(r => r.map(t => ({ ...t, crop: t.crop ? { ...t.crop } : null })));
      const tile = newGrid[row][col];

      if (gameState.tool === 'hoe' && !tile.tilled) {
        tile.tilled = true;
        setGameState(g => ({ ...g, energy: g.energy - 2 }));
        addParticle(x, y, '💨');
      } else if (gameState.tool === 'water' && tile.tilled && tile.crop && !tile.crop.watered) {
        tile.crop.watered = true;
        setGameState(g => ({ ...g, energy: g.energy - 1 }));
        addParticle(x, y, '💧');
      } else if (gameState.tool === 'seeds' && tile.tilled && !tile.crop) {
        const seedType = gameState.selectedSeed;
        if (gameState.seeds[seedType] > 0 && CROP_DATA[seedType].seasons.includes(gameState.season)) {
          tile.crop = {
            type: seedType,
            growth: 0,
            maxGrowth: CROP_DATA[seedType].growTime,
            watered: false,
            planted: gameState.day,
          };
          setGameState(g => ({
            ...g,
            energy: g.energy - 1,
            seeds: { ...g.seeds, [seedType]: g.seeds[seedType] - 1 }
          }));
          addParticle(x, y, '🌱');
        }
      } else if (gameState.tool === 'harvest' && tile.crop && tile.crop.growth >= tile.crop.maxGrowth) {
        const cropType = tile.crop.type;
        setGameState(g => ({
          ...g,
          inventory: { ...g.inventory, [cropType]: g.inventory[cropType] + 1 }
        }));
        addParticle(x, y, CROP_DATA[cropType].emoji);
        addParticle(x + 20, y - 10, '✨');
        tile.crop = null;
      }

      return newGrid;
    });
  }, [gameState, addParticle]);

  const sleepAndAdvanceDay = useCallback(() => {
    setGrid(prev => {
      const newGrid = prev.map(r => r.map(t => {
        if (t.crop) {
          const newCrop = { ...t.crop };
          if (newCrop.watered) {
            newCrop.growth = Math.min(newCrop.growth + 1, newCrop.maxGrowth);
          }
          newCrop.watered = false;
          return { ...t, crop: newCrop };
        }
        return t;
      }));
      return newGrid;
    });

    setGameState(g => {
      const newDay = g.day + 1;
      const seasonDay = ((newDay - 1) % 28) + 1;
      const seasonIndex = Math.floor((newDay - 1) / 28) % 4;
      const newSeason = SEASONS[seasonIndex];
      const weathers: Weather[] = ['sunny', 'sunny', 'sunny', 'cloudy', 'rainy'];
      const newWeather = weathers[Math.floor(Math.random() * weathers.length)];

      return {
        ...g,
        day: newDay,
        season: newSeason,
        weather: newWeather,
        energy: g.maxEnergy,
      };
    });

    setTimeOfDay(0.3);
  }, []);

  const sellAllCrops = useCallback(() => {
    let totalGold = 0;
    const newInventory = { ...gameState.inventory };

    (Object.keys(newInventory) as CropType[]).forEach(crop => {
      totalGold += newInventory[crop] * CROP_DATA[crop].sellPrice;
      newInventory[crop] = 0;
    });

    if (totalGold > 0) {
      setGameState(g => ({
        ...g,
        gold: g.gold + totalGold,
        inventory: newInventory,
      }));
    }
  }, [gameState.inventory]);

  const buySeed = useCallback((crop: CropType) => {
    if (gameState.gold >= CROP_DATA[crop].seedPrice) {
      setGameState(g => ({
        ...g,
        gold: g.gold - CROP_DATA[crop].seedPrice,
        seeds: { ...g.seeds, [crop]: g.seeds[crop] + 1 },
      }));
    }
  }, [gameState.gold]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(t => Math.min(t + 0.01, 1));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (gameState.weather === 'rainy') {
      setGrid(prev => prev.map(r => r.map(t =>
        t.crop ? { ...t, crop: { ...t.crop, watered: true } } : t
      )));
    }
  }, [gameState.day, gameState.weather]);

  const getCropEmoji = (crop: Crop) => {
    const data = CROP_DATA[crop.type];
    const stageIndex = Math.floor((crop.growth / crop.maxGrowth) * (data.stages.length - 1));
    return data.stages[Math.min(stageIndex, data.stages.length - 1)];
  };

  const seasonColors = SEASON_COLORS[gameState.season];
  const skyOpacity = Math.sin(timeOfDay * Math.PI);
  const isNight = timeOfDay > 0.8;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${seasonColors.bg} relative overflow-hidden flex flex-col`}>
      {/* Sky overlay for time of day */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-indigo-900 to-purple-900 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: isNight ? 0.7 : 0 }}
      />

      {/* Weather effects */}
      {gameState.weather === 'rainy' && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-4 bg-blue-400/50 animate-rain"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Floating particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="fixed text-2xl pointer-events-none animate-float-up z-50"
          style={{ left: p.x, top: p.y }}
        >
          {p.emoji}
        </div>
      ))}

      {/* Header */}
      <header className="relative z-10 p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 md:mb-4 drop-shadow-lg"
            style={{
              fontFamily: "'Press Start 2P', cursive",
              color: '#5c3d2e',
              textShadow: '2px 2px 0 #f4d03f, 4px 4px 0 rgba(0,0,0,0.2)'
            }}
          >
            Valley Farm
          </h1>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 text-xs sm:text-sm" style={{ fontFamily: "'Press Start 2P', cursive" }}>
            <div className="bg-amber-100/90 backdrop-blur px-2 py-1 md:px-3 md:py-2 rounded-lg border-2 border-amber-600 shadow-lg">
              <span className="text-amber-800">Day {((gameState.day - 1) % 28) + 1}</span>
            </div>
            <div className="bg-green-100/90 backdrop-blur px-2 py-1 md:px-3 md:py-2 rounded-lg border-2 border-green-600 shadow-lg capitalize">
              <span className="text-green-800">{gameState.season}</span>
            </div>
            <div className="bg-blue-100/90 backdrop-blur px-2 py-1 md:px-3 md:py-2 rounded-lg border-2 border-blue-600 shadow-lg">
              <span className="text-blue-800">{gameState.weather === 'sunny' ? '☀️' : gameState.weather === 'rainy' ? '🌧️' : '☁️'}</span>
            </div>
            <div className="bg-yellow-100/90 backdrop-blur px-2 py-1 md:px-3 md:py-2 rounded-lg border-2 border-yellow-600 shadow-lg">
              <span className="text-yellow-800">{gameState.gold}g</span>
            </div>
            <div className="bg-red-100/90 backdrop-blur px-2 py-1 md:px-3 md:py-2 rounded-lg border-2 border-red-600 shadow-lg">
              <span className="text-red-800">⚡{gameState.energy}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 p-2 md:p-4 flex flex-col items-center">
        {/* Tool selection */}
        <div className="mb-3 md:mb-4 flex flex-wrap justify-center gap-1 md:gap-2">
          {(['hoe', 'water', 'seeds', 'harvest'] as const).map(tool => (
            <button
              key={tool}
              onClick={() => setGameState(g => ({ ...g, tool }))}
              className={`px-3 py-2 md:px-4 md:py-3 rounded-lg border-2 transition-all transform hover:scale-105 active:scale-95 text-lg md:text-2xl min-w-[48px] min-h-[48px] ${
                gameState.tool === tool
                  ? 'bg-amber-400 border-amber-700 shadow-inner scale-105'
                  : 'bg-amber-200 border-amber-500 shadow-lg hover:bg-amber-300'
              }`}
            >
              {tool === 'hoe' && '⛏️'}
              {tool === 'water' && '🚿'}
              {tool === 'seeds' && '🌱'}
              {tool === 'harvest' && '🧺'}
            </button>
          ))}
        </div>

        {/* Seed selection (when seeds tool is active) */}
        {gameState.tool === 'seeds' && (
          <div className="mb-3 md:mb-4 flex flex-wrap justify-center gap-1 md:gap-2 max-w-sm">
            {getSeasonCrops(gameState.season).map(crop => (
              <button
                key={crop}
                onClick={() => setGameState(g => ({ ...g, selectedSeed: crop }))}
                className={`px-2 py-1 md:px-3 md:py-2 rounded-lg border-2 transition-all text-sm min-h-[44px] ${
                  gameState.selectedSeed === crop
                    ? 'bg-green-400 border-green-700'
                    : 'bg-green-200 border-green-500'
                }`}
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
              >
                {CROP_DATA[crop].emoji} {gameState.seeds[crop]}
              </button>
            ))}
          </div>
        )}

        {/* Farm grid */}
        <div
          className="relative p-3 md:p-6 rounded-2xl shadow-2xl mb-4"
          style={{
            background: 'linear-gradient(145deg, #8b7355, #6b5344)',
            border: '4px solid #4a3728',
          }}
        >
          <div className="grid gap-1 md:gap-2" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
            {grid.map((row, rowIdx) =>
              row.map((tile, colIdx) => (
                <button
                  key={`${rowIdx}-${colIdx}`}
                  onClick={(e) => handleTileClick(rowIdx, colIdx, e)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg transition-all transform hover:scale-110 active:scale-95 relative ${
                    tile.tilled
                      ? 'bg-gradient-to-br from-amber-800 to-amber-900'
                      : 'bg-gradient-to-br from-green-500 to-green-600'
                  } border-2 ${tile.tilled ? 'border-amber-950' : 'border-green-700'} shadow-lg`}
                  style={{
                    boxShadow: tile.tilled
                      ? 'inset 0 2px 4px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)'
                      : '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  {/* Watered indicator */}
                  {tile.crop?.watered && (
                    <div className="absolute inset-0 bg-blue-400/30 rounded-lg" />
                  )}

                  {/* Crop */}
                  {tile.crop && (
                    <span className="text-lg sm:text-xl md:text-2xl animate-gentle-bounce">
                      {getCropEmoji(tile.crop)}
                    </span>
                  )}

                  {/* Ready to harvest glow */}
                  {tile.crop && tile.crop.growth >= tile.crop.maxGrowth && (
                    <div className="absolute inset-0 rounded-lg animate-pulse-glow" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-4">
          <button
            onClick={sleepAndAdvanceDay}
            className="px-4 py-2 md:px-6 md:py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl border-2 border-indigo-700 shadow-lg transform hover:scale-105 active:scale-95 transition-all min-h-[48px]"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
          >
            🛏️ Sleep
          </button>
          <button
            onClick={sellAllCrops}
            className="px-4 py-2 md:px-6 md:py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl border-2 border-yellow-700 shadow-lg transform hover:scale-105 active:scale-95 transition-all min-h-[48px]"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
          >
            💰 Sell All
          </button>
          <button
            onClick={() => setShowShop(!showShop)}
            className="px-4 py-2 md:px-6 md:py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl border-2 border-emerald-700 shadow-lg transform hover:scale-105 active:scale-95 transition-all min-h-[48px]"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
          >
            🏪 Shop
          </button>
        </div>

        {/* Shop modal */}
        {showShop && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShop(false)}>
            <div
              className="bg-amber-100 p-4 md:p-6 rounded-2xl border-4 border-amber-800 shadow-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg md:text-xl mb-4 text-amber-900 text-center" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                Pierre's Seeds
              </h2>
              <div className="space-y-2">
                {getSeasonCrops(gameState.season).map(crop => (
                  <div key={crop} className="flex items-center justify-between bg-amber-200 p-2 md:p-3 rounded-lg">
                    <span className="text-xl md:text-2xl">{CROP_DATA[crop].emoji}</span>
                    <span className="text-amber-800 capitalize text-xs" style={{ fontFamily: "'Press Start 2P', cursive" }}>{crop}</span>
                    <button
                      onClick={() => buySeed(crop)}
                      disabled={gameState.gold < CROP_DATA[crop].seedPrice}
                      className={`px-2 py-1 md:px-3 md:py-2 rounded-lg text-xs min-h-[44px] ${
                        gameState.gold >= CROP_DATA[crop].seedPrice
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                      style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}
                    >
                      {CROP_DATA[crop].seedPrice}g
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowShop(false)}
                className="mt-4 w-full py-2 md:py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl min-h-[48px]"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Inventory display */}
        <div className="bg-amber-100/90 backdrop-blur p-3 md:p-4 rounded-xl border-2 border-amber-600 shadow-lg max-w-md w-full">
          <h3 className="text-xs md:text-sm mb-2 text-amber-800 text-center" style={{ fontFamily: "'Press Start 2P', cursive" }}>
            Inventory
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {(Object.keys(gameState.inventory) as CropType[]).map(crop => (
              gameState.inventory[crop] > 0 && (
                <div key={crop} className="flex items-center gap-1 bg-amber-200 px-2 py-1 rounded-lg">
                  <span>{CROP_DATA[crop].emoji}</span>
                  <span className="text-xs text-amber-800" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                    {gameState.inventory[crop]}
                  </span>
                </div>
              )
            ))}
            {Object.values(gameState.inventory).every(v => v === 0) && (
              <span className="text-xs text-amber-600" style={{ fontFamily: "'Press Start 2P', cursive" }}>Empty</span>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center">
        <p className="text-xs text-amber-800/60" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px' }}>
          Requested by @EngMarketer · Built by @clonkbot
        </p>
      </footer>

      <style>{`
        @keyframes rain {
          0% { transform: translateY(-100vh); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .animate-rain {
          animation: rain 1s linear infinite;
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-50px) scale(1.5); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up 1s ease-out forwards;
        }
        @keyframes gentle-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-gentle-bounce {
          animation: gentle-bounce 2s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 5px 2px rgba(255, 215, 0, 0.5); }
          50% { box-shadow: 0 0 15px 5px rgba(255, 215, 0, 0.8); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
