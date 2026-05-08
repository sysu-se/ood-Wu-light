import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 explore mode', () => {
  function makeExploreTestPuzzle() {
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

  describe('Entering explore mode', () => {
    it('can enter explore mode from playing state', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      expect(game.getState()).toBe('playing')
      expect(game.isExploring()).toBe(false)

      game.startExplore()
      
      expect(game.getState()).toBe('exploring')
      expect(game.isExploring()).toBe(true)
    })

    it('cannot enter explore mode when paused', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.pause()
      
      expect(() => game.startExplore()).toThrow()
    })

    it('explore mode preserves the original state', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.guess({ row: 0, col: 2, value: 4 })
      const gridBeforeExplore = game.getSudoku().getGrid()

      game.startExplore()
      
      const gridAtExploreStart = game.getSudoku().getGrid()
      expect(gridAtExploreStart).toEqual(gridBeforeExplore)
    })
  })

  describe('Making moves in explore mode', () => {
    it('can make guesses in explore mode', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.startExplore()
      
      const candidates = game.getCandidatesHint(0, 2)
      if (candidates.length > 0) {
        game.guess({ row: 0, col: 2, value: candidates[0] })
        
        expect(game.getSudoku().getGrid()[0][2]).toBe(candidates[0])
        expect(game.isExploring()).toBe(true)
      }
    })

    it('undo/redo works in explore mode', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.startExplore()
      
      const candidates1 = game.getCandidatesHint(0, 2)
      const candidates2 = game.getCandidatesHint(1, 1)
      
      if (candidates1.length > 0) {
        game.guess({ row: 0, col: 2, value: candidates1[0] })
      }
      if (candidates2.length > 0) {
        game.guess({ row: 1, col: 1, value: candidates2[0] })
      }

      // Undo
      expect(game.canUndo()).toBe(true)
      game.undo()
      
      // Redo
      expect(game.canRedo()).toBe(true)
      game.redo()
      
      expect(game.isExploring()).toBe(true)
    })
  })

  describe('Conflict detection', () => {
    it('detects conflict when wrong move is made', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.startExplore()
      
      game.guess({ row: 0, col: 2, value: 5 })
      
      expect(game.getSudoku().hasConflict()).toBe(true)
    })

    it('marks branch as failed when conflict occurs', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.startExplore()
      
      game.guess({ row: 0, col: 2, value: 5 })
      
      const branch = game.getCurrentBranch()
      expect(branch.failed).toBe(true)
    })
  })

  describe('Committing explore results', () => {
    it('commit preserves valid explore moves in main history', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.startExplore()
      
      const candidates = game.getCandidatesHint(0, 2)
      if (candidates.length > 0) {
        game.guess({ row: 0, col: 2, value: candidates[0] })
        
        game.commitExplore()
        
        expect(game.getState()).toBe('playing')
        expect(game.isExploring()).toBe(false)
        
        expect(game.getSudoku().getGrid()[0][2]).toBe(candidates[0])
        expect(game.canUndo()).toBe(true)
      }
    })

    it('cannot commit failed explore branch', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.startExplore()
      
      game.guess({ row: 0, col: 2, value: 5 })
      
      expect(() => game.commitExplore()).toThrow()
    })
  })

  describe('Aborting explore', () => {
    it('abort returns to original state before explore', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.guess({ row: 0, col: 2, value: 4 })
      const gridBeforeExplore = game.getSudoku().getGrid()
      const historyIndexBefore = game._historyIndex

      game.startExplore()
      game.guess({ row: 1, col: 1, value: 7 })
      
      game.abortExplore()
      
      expect(game.getState()).toBe('playing')
      expect(game.isExploring()).toBe(false)
      expect(game.getSudoku().getGrid()).toEqual(gridBeforeExplore)
    })

    it('abort clears explore history', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.startExplore()
      game.guess({ row: 0, col: 2, value: 4 })
      
      game.abortExplore()
      
      expect(game.getSudoku().getGrid()[0][2]).toBe(0)
    })
  })

  describe('Backtracking explore', () => {
    it('backtrackExplore allows trying alternative candidate', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.startExplore()
      
      const candidates = game.getCandidatesHint(1, 1)
      if (candidates.length >= 2) {
        game.guess({ row: 1, col: 1, value: candidates[0] })
        
        game.backtrackExplore({ row: 1, col: 1, value: candidates[1] })
        
        expect(game.isExploring()).toBe(true)
        expect(game.getSudoku().getGrid()[1][1]).toBe(candidates[1])
      }
    })

    it('backtrack marks previous path as failed', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.startExplore()
      
      const candidates = game.getCandidatesHint(1, 1)
      if (candidates.length >= 2) {
        game.guess({ row: 1, col: 1, value: candidates[0] })
        
        const previousBranch = game.getCurrentBranch()
        
        game.backtrackExplore({ row: 1, col: 1, value: candidates[1] })
        
        expect(game.isInFailedPath() || previousBranch.failed).toBe(true)
      }
    })
  })

  describe('Memory of failed paths', () => {
    it('remembers failed paths', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.startExplore()
      
      game.guess({ row: 0, col: 2, value: 5 })
      
      game.abortExplore()
      
      game.startExplore()
      game.guess({ row: 0, col: 2, value: 5 })
      
      expect(game.isInFailedPath()).toBe(true)
    })
  })

  describe('Undo/Redo preservation', () => {
    it('main mode undo/redo still works after explore abort', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.guess({ row: 0, col: 2, value: 4 })
      game.guess({ row: 1, col: 1, value: 7 })

      game.startExplore()
      game.guess({ row: 2, col: 0, value: 1 })
      game.abortExplore()

      expect(game.canUndo()).toBe(true)
      game.undo()
      expect(game.getSudoku().getGrid()[1][1]).toBe(0)
      
      game.redo()
      expect(game.getSudoku().getGrid()[1][1]).toBe(7)
    })

    it('main mode undo/redo works after explore commit', async () => {
      const { createGame, createSudoku } = await loadDomainApi()
      const game = createGame({ sudoku: createSudoku(makeExploreTestPuzzle()) })

      game.guess({ row: 0, col: 2, value: 4 })

      game.startExplore()
      game.guess({ row: 1, col: 1, value: 7 })
      game.commitExplore()

      expect(game.canUndo()).toBe(true)
      game.undo()
      expect(game.getSudoku().getGrid()[1][1]).toBe(0)
      
      game.redo()
      expect(game.getSudoku().getGrid()[1][1]).toBe(7)
    })
  })
})