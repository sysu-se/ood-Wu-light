import { Sudoku } from './Sudoku.js';
import { GameState } from './constants.js';

/**
 * HistoryEntry - 记录一次操作的快照
 */
class HistoryEntry {
  constructor(grid, description = '') {
    this.grid = grid.map(row => [...row]);
    this.description = description;
    this.timestamp = Date.now();
  }
}

/**
 * ExploreBranch - 探索分支
 * 记录从主局面分出的探索路径
 */
class ExploreBranch {
  constructor(sudoku, startPoint) {
    this.sudoku = sudoku.clone();
    this.startPoint = startPoint;  // 探索起点在主 history 中的索引
    this.history = [];             // 探索过程的独立历史（保存操作后的状态）
    this.historyIndex = -1;        // 探索历史当前位置
    this.failed = false;           // 是否已确认失败
    this.branchId = Date.now();    // 分支唯一标识
  }

  /**
   * 在探索分支中执行操作
   */
  guess(move) {
    // 执行操作
    this.sudoku.guess(move);
    
    // 保存操作后的状态到历史
    const entry = new HistoryEntry(this.sudoku.getGrid(), `探索: (${move.row},${move.col})=${move.value}`);
    this.history.push(entry);
    this.historyIndex = this.history.length - 1;
  }

  /**
   * 探索分支中的 undo
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const entry = this.history[this.historyIndex];
      // 恢复到历史状态
      this.sudoku._grid = entry.grid.map(row => [...row]);
    } else if (this.historyIndex === 0) {
      // 回到探索起点（历史索引变为 -1）
      this.historyIndex = -1;
    }
  }

  /**
   * 探索分支中的 redo
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const entry = this.history[this.historyIndex];
      this.sudoku._grid = entry.grid.map(row => [...row]);
    }
  }

  canUndo() {
    return this.historyIndex >= 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * 标记分支为失败
   */
  markFailed() {
    this.failed = true;
  }
}

/**
 * Game 类 - 游戏会话管理
 * 负责状态管理、历史记录、undo/redo、探索模式
 */
export class Game {
  /**
   * @param {object} options
   * @param {Sudoku} options.sudoku - Sudoku 实例
   */
  constructor({ sudoku }) {
    this._sudoku = sudoku;
    this._state = GameState.PLAYING;
    
    // 主历史记录栈（线性栈）
    this._history = [];
    this._historyIndex = -1;
    
    // 保存初始状态
    this._saveHistory('初始状态');
    
    // 探索模式相关
    this._exploreBranches = [];   // 所有探索分支
    this._currentBranch = null;   // 当前活跃的探索分支
    this._exploreStartState = null;  // 进入探索前的状态快照
    this._exploreStartIndex = -1;    // 进入探索前的 history 索引
    
    // 记忆失败的探索路径
    this._failedPaths = new Set();  // 存储失败路径的序列化字符串
  }

  /**
   * 获取 Sudoku 实例
   * @returns {Sudoku}
   */
  getSudoku() {
    return this._sudoku;
  }

  /**
   * 获取游戏状态
   * @returns {string}
   */
  getState() {
    return this._state;
  }

  /**
   * 是否处于探索模式
   * @returns {boolean}
   */
  isExploring() {
    return this._state === GameState.EXPLORING && this._currentBranch !== null;
  }

  /**
   * 保存历史记录
   * @private
   */
  _saveHistory(description = '') {
    const entry = new HistoryEntry(this._sudoku.getGrid(), description);
    
    // 如果在历史中间位置，清除后面的历史
    if (this._historyIndex < this._history.length - 1) {
      this._history = this._history.slice(0, this._historyIndex + 1);
    }
    
    this._history.push(entry);
    this._historyIndex = this._history.length - 1;
  }

  /**
   * 执行填数操作
   * @param {object} move - { row, col, value }
   */
  guess(move) {
    if (this._state === GameState.PAUSED) {
      throw new Error('游戏已暂停');
    }

    if (this.isExploring()) {
      // 在探索分支中执行
      this._currentBranch.guess(move);
      this._sudoku.guess(move);
      
      // 检查是否产生冲突
      if (this._sudoku.hasConflict() || !this._sudoku.isSolvable()) {
        this._currentBranch.markFailed();
        // 记录失败的路径
        this._recordFailedPath();
      }
    } else {
      // 在主模式中执行
      this._sudoku.guess(move);
      this._saveHistory(`填数: (${move.row},${move.col})=${move.value}`);
      
      // 检查是否完成
      if (this._sudoku.isComplete()) {
        this._state = GameState.WON;
      }
    }
  }

  /**
   * Undo（撤销）
   */
  undo() {
    if (this.isExploring()) {
      // 探索分支中的 undo
      if (this._currentBranch.canUndo()) {
        this._currentBranch.undo();
        // 更新 sudoku 状态
        if (this._currentBranch.historyIndex >= 0) {
          const entry = this._currentBranch.history[this._currentBranch.historyIndex];
          this._sudoku._grid = entry.grid.map(row => [...row]);
        } else {
          // 回到探索起点
          this._sudoku = this._exploreStartState.clone();
        }
      }
    } else {
      // 主模式的 undo
      if (this._historyIndex > 0) {
        this._historyIndex--;
        const entry = this._history[this._historyIndex];
        this._sudoku._grid = entry.grid.map(row => [...row]);
      }
    }
  }

  /**
   * Redo（重做）
   */
  redo() {
    if (this.isExploring()) {
      // 探索分支中的 redo
      if (this._currentBranch.canRedo()) {
        this._currentBranch.redo();
        const entry = this._currentBranch.history[this._currentBranch.historyIndex];
        this._sudoku._grid = entry.grid.map(row => [...row]);
      }
    } else {
      // 主模式的 redo
      if (this._historyIndex < this._history.length - 1) {
        this._historyIndex++;
        const entry = this._history[this._historyIndex];
        this._sudoku._grid = entry.grid.map(row => [...row]);
      }
    }
  }

  /**
   * 是否可以 undo
   * @returns {boolean}
   */
  canUndo() {
    if (this.isExploring()) {
      return this._currentBranch.canUndo();
    }
    return this._historyIndex > 0;
  }

  /**
   * 是否可以 redo
   * @returns {boolean}
   */
  canRedo() {
    if (this.isExploring()) {
      return this._currentBranch.canRedo();
    }
    return this._historyIndex < this._history.length - 1;
  }

  /**
   * 进入探索模式
   * 从当前状态开始一个新的探索分支
   */
  startExplore() {
    if (this._state === GameState.PAUSED) {
      throw new Error('游戏已暂停，无法进入探索模式');
    }

    // 保存进入探索前的状态
    this._exploreStartState = this._sudoku.clone();
    this._exploreStartIndex = this._historyIndex;

    // 创建新的探索分支
    const branch = new ExploreBranch(this._sudoku, this._historyIndex);
    this._currentBranch = branch;
    this._exploreBranches.push(branch);

    // 切换状态
    this._state = GameState.EXPLORING;
  }

  /**
   * 提交探索结果
   * 将探索分支的有效结果合并到主历史
   */
  commitExplore() {
    if (!this.isExploring()) {
      throw new Error('当前不在探索模式中');
    }

    if (this._currentBranch.failed) {
      throw new Error('当前探索分支已失败，无法提交');
    }

    // 获取探索过程中的所有操作
    const exploreMoves = [];
    for (let i = 0; i <= this._currentBranch.historyIndex; i++) {
      const entry = this._currentBranch.history[i];
      exploreMoves.push(entry);
    }

    // 将探索结果合并到主历史
    // 先回退到探索起点
    this._historyIndex = this._exploreStartIndex;
    this._history = this._history.slice(0, this._exploreStartIndex + 1);
    this._sudoku = this._exploreStartState.clone();

    // 将探索过程中的每一步加入主历史
    for (const entry of exploreMoves) {
      this._sudoku._grid = entry.grid.map(row => [...row]);
      this._saveHistory(entry.description + ' (提交自探索)');
    }

    // 清理探索状态
    this._currentBranch = null;
    this._exploreStartState = null;
    this._state = GameState.PLAYING;

    // 检查是否完成
    if (this._sudoku.isComplete()) {
      this._state = GameState.WON;
    }
  }

  /**
   * 放弃探索结果
   * 回退到探索起点，放弃当前分支
   */
  abortExplore() {
    if (!this.isExploring()) {
      throw new Error('当前不在探索模式中');
    }

    // 标记分支失败（如果有操作的话）
    if (this._currentBranch.history.length > 0) {
      this._currentBranch.markFailed();
      this._recordFailedPath();
    }

    // 回退到探索起点
    this._sudoku = this._exploreStartState.clone();
    
    // 恢复主历史位置
    const entry = this._history[this._exploreStartIndex];
    this._sudoku._grid = entry.grid.map(row => [...row]);
    this._historyIndex = this._exploreStartIndex;

    // 清理探索状态
    this._currentBranch = null;
    this._exploreStartState = null;
    this._state = GameState.PLAYING;
  }

  /**
   * 回溯到探索起点并选择其他候选值继续探索
   * @param {object} newMove - { row, col, value } 新的尝试
   */
  backtrackExplore(newMove) {
    if (!this.isExploring()) {
      throw new Error('当前不在探索模式中');
    }

    // 记录当前路径失败
    this._currentBranch.markFailed();
    this._recordFailedPath();

    // 创建新的探索分支（从同一个起点）
    const branch = new ExploreBranch(this._exploreStartState, this._exploreStartIndex);
    this._currentBranch = branch;
    this._exploreBranches.push(branch);

    // 恢复到探索起点
    this._sudoku = this._exploreStartState.clone();

    // 执行新的尝试
    this.guess(newMove);
  }

  /**
   * 记录失败的路径到记忆集合
   * @private
   */
  _recordFailedPath() {
    const pathKey = JSON.stringify(this._sudoku.getGrid());
    this._failedPaths.add(pathKey);
  }

  /**
   * 检查当前状态是否与某个失败路径匹配
   * @returns {boolean}
   */
  isInFailedPath() {
    const currentKey = JSON.stringify(this._sudoku.getGrid());
    return this._failedPaths.has(currentKey);
  }

  /**
   * 获取所有探索分支
   * @returns {ExploreBranch[]}
   */
  getExploreBranches() {
    return this._exploreBranches;
  }

  /**
   * 获取当前探索分支
   * @returns {ExploreBranch|null}
   */
  getCurrentBranch() {
    return this._currentBranch;
  }

  /**
   * 获取候选数提示
   * @param {number} row 
   * @param {number} col 
   * @returns {number[]}
   */
  getCandidatesHint(row, col) {
    return this._sudoku.getCandidates(row, col);
  }

  /**
   * 获取下一步提示
   * @returns {object|null}
   */
  getNextHint() {
    return this._sudoku.getNextHint();
  }

  /**
   * 获取所有下一步提示
   * @returns {object[]}
   */
  getAllNextHints() {
    return this._sudoku.getAllNextHints();
  }

  /**
   * 应用提示（直接填入）
   * @param {object} hint - { row, col, value }
   */
  applyHint(hint) {
    this.guess(hint);
    return hint;
  }

  /**
   * 暂停游戏
   */
  pause() {
    if (this._state !== GameState.WON) {
      this._state = GameState.PAUSED;
    }
  }

  /**
   * 恢复游戏
   */
  resume() {
    if (this._state === GameState.PAUSED) {
      this._state = this.isExploring() ? GameState.EXPLORING : GameState.PLAYING;
    }
  }

  /**
   * 序列化为 JSON
   * @returns {object}
   */
  toJSON() {
    return {
      sudoku: this._sudoku.toJSON(),
      state: this._state,
      history: this._history.map(h => ({
        grid: h.grid,
        description: h.description,
        timestamp: h.timestamp
      })),
      historyIndex: this._historyIndex,
      exploreBranches: this._exploreBranches.map(b => ({
        sudoku: b.sudoku.toJSON(),
        startPoint: b.startPoint,
        history: b.history.map(h => ({
          grid: h.grid,
          description: h.description
        })),
        historyIndex: b.historyIndex,
        failed: b.failed,
        branchId: b.branchId
      })),
      currentBranchId: this._currentBranch ? this._currentBranch.branchId : null,
      failedPaths: Array.from(this._failedPaths)
    };
  }

  /**
   * 从 JSON 恢复
   * @param {object} json
   * @returns {Game}
   */
  static fromJSON(json) {
    const sudoku = Sudoku.fromJSON(json.sudoku);
    const game = new Game({ sudoku });
    
    game._state = json.state;
    game._history = json.history.map(h => new HistoryEntry(h.grid, h.description));
    game._historyIndex = json.historyIndex;
    
    // 恢复探索分支
    game._exploreBranches = json.exploreBranches.map(b => {
      const branch = new ExploreBranch(Sudoku.fromJSON(b.sudoku), b.startPoint);
      branch.history = b.history.map(h => new HistoryEntry(h.grid, h.description));
      branch.historyIndex = b.historyIndex;
      branch.failed = b.failed;
      branch.branchId = b.branchId;
      return branch;
    });
    
    // 恢复当前分支
    if (json.currentBranchId !== null) {
      game._currentBranch = game._exploreBranches.find(b => b.branchId === json.currentBranchId);
      if (game._currentBranch) {
        game._exploreStartState = Sudoku.fromJSON(json.exploreBranches.find(b => b.branchId === json.currentBranchId).sudoku);
        game._exploreStartIndex = game._currentBranch.startPoint;
      }
    }
    
    // 恢复失败路径记忆
    game._failedPaths = new Set(json.failedPaths);
    
    return game;
  }
}

/**
 * 创建 Game 实例的工厂函数
 * @param {object} options
 * @returns {Game}
 */
export function createGame(options) {
  return new Game(options);
}

/**
 * 从 JSON 创建 Game 实例
 * @param {object} json
 * @returns {Game}
 */
export function createGameFromJSON(json) {
  return Game.fromJSON(json);
}