// 数独相关常量
export const SUDOKU_SIZE = 9;
export const BOX_SIZE = 3;
export const GRID_LENGTH = 81;

// 游戏状态枚举
export const GameState = {
  PLAYING: 'playing',
  PAUSED: 'paused',
  WON: 'won',
  EXPLORING: 'exploring'  // 探索模式
};