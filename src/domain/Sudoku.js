import { SUDOKU_SIZE, BOX_SIZE } from './constants.js';

/**
 * 计算指定单元格的候选数
 * @param {number[][]} grid - 数独网格
 * @param {number} row - 行索引
 * @param {number} col - 列索引
 * @returns {number[]} - 候选数数组
 */
function calculateCandidates(grid, row, col) {
  // 如果单元格已有数字，返回空数组
  if (grid[row][col] !== 0) {
    return [];
  }

  const used = new Set();

  // 检查同行
  for (let c = 0; c < SUDOKU_SIZE; c++) {
    if (grid[row][c] !== 0) {
      used.add(grid[row][c]);
    }
  }

  // 检查同列
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    if (grid[r][col] !== 0) {
      used.add(grid[r][col]);
    }
  }

  // 检查同宫
  const boxStartRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxStartCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = boxStartRow; r < boxStartRow + BOX_SIZE; r++) {
    for (let c = boxStartCol; c < boxStartCol + BOX_SIZE; c++) {
      if (grid[r][c] !== 0) {
        used.add(grid[r][c]);
      }
    }
  }

  // 返回未使用的数字（1-9）
  const candidates = [];
  for (let num = 1; num <= 9; num++) {
    if (!used.has(num)) {
      candidates.push(num);
    }
  }

  return candidates;
}

/**
 * 检查网格是否有效（无冲突）
 * @param {number[][]} grid - 数独网格
 * @returns {boolean}
 */
function isValidGrid(grid) {
  // 检查每行
  for (let row = 0; row < SUDOKU_SIZE; row++) {
    const seen = new Set();
    for (let col = 0; col < SUDOKU_SIZE; col++) {
      const val = grid[row][col];
      if (val !== 0) {
        if (seen.has(val)) return false;
        seen.add(val);
      }
    }
  }

  // 检查每列
  for (let col = 0; col < SUDOKU_SIZE; col++) {
    const seen = new Set();
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      const val = grid[row][col];
      if (val !== 0) {
        if (seen.has(val)) return false;
        seen.add(val);
      }
    }
  }

  // 检查每个宫
  for (let boxRow = 0; boxRow < BOX_SIZE; boxRow++) {
    for (let boxCol = 0; boxCol < BOX_SIZE; boxCol++) {
      const seen = new Set();
      for (let r = boxRow * BOX_SIZE; r < (boxRow + 1) * BOX_SIZE; r++) {
        for (let c = boxCol * BOX_SIZE; c < (boxCol + 1) * BOX_SIZE; c++) {
          const val = grid[r][c];
          if (val !== 0) {
            if (seen.has(val)) return false;
            seen.add(val);
          }
        }
      }
    }
  }

  return true;
}

/**
 * 检查指定位置是否有冲突
 * @param {number[][]} grid - 数独网格
 * @param {number} row - 行索引
 * @param {number} col - 列索引
 * @returns {boolean}
 */
function hasConflict(grid, row, col) {
  const val = grid[row][col];
  if (val === 0) return false;

  // 检查同行
  for (let c = 0; c < SUDOKU_SIZE; c++) {
    if (c !== col && grid[row][c] === val) return true;
  }

  // 检查同列
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    if (r !== row && grid[r][col] === val) return true;
  }

  // 检查同宫
  const boxStartRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxStartCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = boxStartRow; r < boxStartRow + BOX_SIZE; r++) {
    for (let c = boxStartCol; c < boxStartCol + BOX_SIZE; c++) {
      if (r !== row && c !== col && grid[r][c] === val) return true;
    }
  }

  return false;
}

/**
 * 检查数独是否完成
 * @param {number[][]} grid - 数独网格
 * @returns {boolean}
 */
function isComplete(grid) {
  // 检查是否所有单元格都填满且无冲突
  for (let row = 0; row < SUDOKU_SIZE; row++) {
    for (let col = 0; col < SUDOKU_SIZE; col++) {
      if (grid[row][col] === 0) return false;
    }
  }
  return isValidGrid(grid);
}

/**
 * 深拷贝网格
 * @param {number[][]} grid 
 * @returns {number[][]}
 */
function deepCloneGrid(grid) {
  return grid.map(row => [...row]);
}

/**
 * Sudoku 类 - 数独核心领域对象
 * 负责存储数独状态，提供基本的填数和查询功能
 */
export class Sudoku {
  /**
   * @param {number[][]} initialGrid - 初始数独网格（0表示空格）
   */
  constructor(initialGrid) {
    // 防御性拷贝输入
    this._initialGrid = deepCloneGrid(initialGrid);
    this._grid = deepCloneGrid(initialGrid);
    
    // 记录哪些是初始给定的数字（不可修改）
    this._fixed = initialGrid.map(row => 
      row.map(cell => cell !== 0)
    );
  }

  /**
   * 获取当前网格（返回副本，保证不可变性）
   * @returns {number[][]}
   */
  getGrid() {
    return deepCloneGrid(this._grid);
  }

  /**
   * 获取初始网格
   * @returns {number[][]}
   */
  getInitialGrid() {
    return deepCloneGrid(this._initialGrid);
  }

  /**
   * 检查单元格是否是固定数字
   * @param {number} row 
   * @param {number} col 
   * @returns {boolean}
   */
  isFixed(row, col) {
    return this._fixed[row][col];
  }

  /**
   * 在指定位置填入数字
   * @param {object} move - { row, col, value }
   */
  guess({ row, col, value }) {
    // 不允许修改固定数字
    if (this._fixed[row][col]) {
      throw new Error(`Cell (${row}, ${col}) is fixed and cannot be modified`);
    }
    this._grid[row][col] = value;
  }

  /**
   * 清除指定位置的数字
   * @param {number} row 
   * @param {number} col 
   */
  clear(row, col) {
    if (!this._fixed[row][col]) {
      this._grid[row][col] = 0;
    }
  }

  /**
   * 获取指定单元格的候选数
   * @param {number} row 
   * @param {number} col 
   * @returns {number[]}
   */
  getCandidates(row, col) {
    return calculateCandidates(this._grid, row, col);
  }

  /**
   * 获取所有空格的候选数映射
   * @returns {Map<string, number[]>} - key: "row,col", value: 候选数数组
   */
  getAllCandidates() {
    const candidates = new Map();
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        if (this._grid[row][col] === 0) {
          const cands = this.getCandidates(row, col);
          if (cands.length > 0) {
            candidates.set(`${row},${col}`, cands);
          }
        }
      }
    }
    return candidates;
  }

  /**
   * 获取下一个可以推断出的填数位置（只有一个候选数的单元格）
   * @returns {object|null} - { row, col, value } 或 null
   */
  getNextHint() {
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        if (this._grid[row][col] === 0) {
          const candidates = this.getCandidates(row, col);
          if (candidates.length === 1) {
            return { row, col, value: candidates[0], reason: '唯一候选数' };
          }
        }
      }
    }
    return null;
  }

  /**
   * 获取所有只有一个候选数的单元格（下一步提示）
   * @returns {object[]}
   */
  getAllNextHints() {
    const hints = [];
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        if (this._grid[row][col] === 0) {
          const candidates = this.getCandidates(row, col);
          if (candidates.length === 1) {
            hints.push({ row, col, value: candidates[0], reason: '唯一候选数' });
          }
        }
      }
    }
    return hints;
  }

  /**
   * 检查当前网格是否有冲突
   * @returns {boolean}
   */
  hasConflict() {
    return !isValidGrid(this._grid);
  }

  /**
   * 获取所有冲突的单元格
   * @returns {string[]} - 冲突单元格坐标数组 ["row,col", ...]
   */
  getConflictingCells() {
    const conflicts = [];
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        if (hasConflict(this._grid, row, col)) {
          conflicts.push(`${row},${col}`);
        }
      }
    }
    return conflicts;
  }

  /**
   * 检查数独是否已完成
   * @returns {boolean}
   */
  isComplete() {
    return isComplete(this._grid);
  }

  /**
   * 检查是否可解（没有空候选数的空格）
   * @returns {boolean}
   */
  isSolvable() {
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        if (this._grid[row][col] === 0) {
          const candidates = this.getCandidates(row, col);
          if (candidates.length === 0) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * 克隆当前数独（返回独立的副本）
   * @returns {Sudoku}
   */
  clone() {
    const cloned = new Sudoku(this._initialGrid);
    // 复制当前状态
    cloned._grid = deepCloneGrid(this._grid);
    return cloned;
  }

  /**
   * 序列化为 JSON
   * @returns {object}
   */
  toJSON() {
    return {
      initialGrid: deepCloneGrid(this._initialGrid),
      currentGrid: deepCloneGrid(this._grid)
    };
  }

  /**
   * 转换为可读字符串
   * @returns {string}
   */
  toString() {
    let result = '';
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      if (row > 0 && row % BOX_SIZE === 0) {
        result += '-'.repeat(21) + '\n';
      }
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        if (col > 0 && col % BOX_SIZE === 0) {
          result += '| ';
        }
        const val = this._grid[row][col];
        result += (val === 0 ? '.' : val) + ' ';
      }
      result = result.trimEnd() + '\n';
    }
    return result.trimEnd();
  }

  /**
   * 从 JSON 恢复
   * @param {object} json 
   * @returns {Sudoku}
   */
  static fromJSON(json) {
    const sudoku = new Sudoku(json.initialGrid);
    sudoku._grid = deepCloneGrid(json.currentGrid);
    return sudoku;
  }
}

/**
 * 创建 Sudoku 实例的工厂函数
 * @param {number[][]} grid 
 * @returns {Sudoku}
 */
export function createSudoku(grid) {
  return new Sudoku(grid);
}

/**
 * 从 JSON 创建 Sudoku 实例
 * @param {object} json 
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  return Sudoku.fromJSON(json);
}