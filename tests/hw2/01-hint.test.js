import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 hint functionality', () => {
  function makeHintTestPuzzle() {
    return [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ]
  }

  describe('Candidate hints', () => {
    it('getCandidates returns correct candidates for empty cells', async () => {
      const { createSudoku } = await loadDomainApi()
      const sudoku = createSudoku(makeHintTestPuzzle())

      const candidates = sudoku.getCandidates(0, 2)
      expect(candidates).toContain(4)
      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates.length).toBeLessThanOrEqual(9)
    })

    it('getCandidates returns empty array for filled cells', async () => {
      const { createSudoku } = await loadDomainApi()
      const sudoku = createSudoku(makeHintTestPuzzle())

      // 已填充的格子应该返回空数组
      const candidates = sudoku.getCandidates(0, 0)
      expect(candidates).toEqual([])
    })

    it('getCandidates respects row, column, and box constraints', async () => {
      const { createSudoku } = await loadDomainApi()
      const sudoku = createSudoku(makeHintTestPuzzle())

      const candidates02 = sudoku.getCandidates(0, 2)
      
      // Row 0: 5, 3, 7; Column 2: 8; Box (0-2, 0-2): 5, 3, 6, 9, 8
      expect(candidates02).not.toContain(5)
      expect(candidates02).not.toContain(3)
      expect(candidates02).not.toContain(7)
      expect(candidates02).not.toContain(8)
      expect(candidates02).not.toContain(6)
      expect(candidates02).not.toContain(9)
      
      for (const c of candidates02) {
        expect(c).toBeGreaterThanOrEqual(1)
        expect(c).toBeLessThanOrEqual(9)
      }
      
      expect(candidates02.sort()).toEqual([1, 2, 4])
    })
  })

  describe('Next step hints', () => {
    it('getNextHint returns hint for single-candidate cell', async () => {
      const { createSudoku } = await loadDomainApi()
      
      const filledPuzzle = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 0],
      ]
      const sudoku = createSudoku(filledPuzzle)

      const hint = sudoku.getNextHint()
      expect(hint).not.toBeNull()
      expect(hint.row).toBe(8)
      expect(hint.col).toBe(8)
      expect(hint.value).toBe(9)
    })

    it('getNextHint returns correct hint structure', async () => {
      const { createSudoku } = await loadDomainApi()
      const sudoku = createSudoku(makeHintTestPuzzle())

      const hint = sudoku.getNextHint()
      
      if (hint !== null) {
        expect(typeof hint.row).toBe('number')
        expect(typeof hint.col).toBe('number')
        expect(typeof hint.value).toBe('number')
        
        const candidates = sudoku.getCandidates(hint.row, hint.col)
        expect(candidates).toContain(hint.value)
        expect(candidates.length).toBe(1)
      }
    })

    it('getAllNextHints returns all single-candidate cells', async () => {
      const { createSudoku } = await loadDomainApi()
      const sudoku = createSudoku(makeHintTestPuzzle())

      const hints = sudoku.getAllNextHints()
      
      for (const hint of hints) {
        const candidates = sudoku.getCandidates(hint.row, hint.col)
        expect(candidates.length).toBe(1)
        expect(candidates[0]).toBe(hint.value)
      }
    })

    it('getNextHint returns null for complete sudoku', async () => {
      const { createSudoku } = await loadDomainApi()
      
      const completePuzzle = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9],
      ]
      const sudoku = createSudoku(completePuzzle)

      expect(sudoku.getNextHint()).toBeNull()
      expect(sudoku.getAllNextHints()).toEqual([])
    })
  })

  describe('Hint at Game level', () => {
    it('Game provides getCandidatesHint through sudoku', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeHintTestPuzzle()) })

      const candidates = game.getCandidatesHint(0, 2)
      expect(Array.isArray(candidates)).toBe(true)
      expect(candidates.length).toBeGreaterThan(0)
    })

    it('Game provides getNextHint through sudoku', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeHintTestPuzzle()) })

      const hint = game.getNextHint()
      expect(hint === null || typeof hint === 'object').toBe(true)
      if (hint) {
        expect(hint.row).toBeDefined()
        expect(hint.col).toBeDefined()
        expect(hint.value).toBeDefined()
      }
    })

    it('Game applyHint executes the hinted move', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeHintTestPuzzle()) })

      const hint = game.getNextHint()
      if (hint) {
        game.applyHint(hint)
        
        const grid = game.getSudoku().getGrid()
        expect(grid[hint.row][hint.col]).toBe(hint.value)
      }
    })
  })
})