import { createWebSkillGenerator } from 'web-skill'
import { z } from 'zod'
import type { GameStatus, UserAction } from './store/useGameStore'
import { useGameStore } from './store/useGameStore'

const gridRowSchema = z.array(z.number().int().nonnegative()).length(4)
const gridSchema = z.array(gridRowSchema).length(4)
const directionSchema = z.enum(['up', 'down', 'left', 'right'])
const userActionSchema = z.enum([
  'move_up',
  'move_down',
  'move_left',
  'move_right',
  'restart',
  'undo',
] satisfies UserAction[])
const gameStatusSchema = z.enum(['ready', 'playing', 'won', 'over'] satisfies GameStatus[])
const serializedGameStateSchema = z.object({
  grid: gridSchema,
  score: z.number().int().nonnegative(),
  bestScore: z.number().int().nonnegative(),
  moveCount: z.number().int().nonnegative(),
  status: gameStatusSchema,
})

export const webSkills = createWebSkillGenerator()

const game2048Skill = webSkills.newSkill({
  name: 'game2048',
  title: '2048 game actions for move control and state synchronization',
  description:
    'Expose task-level actions from the 2048 Zustand store so agents can move tiles, restart, undo, and sync game state without DOM clicks.',
})

game2048Skill.addFunction(
  () => {
    useGameStore.getState().startNewGame()
    return true
  },
  'startNewGame',
  {
    description: 'Start a fresh 2048 game and clear local move history.',
    inputSchema: z.object({}).default({}),
    outputSchema: z.boolean(),
  },
)

game2048Skill.addFunction(
  () => {
    useGameStore.getState().restartGame()
    return true
  },
  'restartGame',
  {
    description: 'Restart the current 2048 game with a new random grid.',
    inputSchema: z.object({}).default({}),
    outputSchema: z.boolean(),
  },
)

game2048Skill.addFunction(
  (input) => useGameStore.getState().move(input.direction),
  'move',
  {
    description: 'Apply a move in one of four directions.',
    inputSchema: z.object({
      direction: directionSchema,
    }),
    outputSchema: z.boolean(),
  },
)

game2048Skill.addFunction(() => useGameStore.getState().moveUp(), 'moveUp', {
  description: 'Move tiles upward.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.boolean(),
})

game2048Skill.addFunction(() => useGameStore.getState().moveDown(), 'moveDown', {
  description: 'Move tiles downward.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.boolean(),
})

game2048Skill.addFunction(() => useGameStore.getState().moveLeft(), 'moveLeft', {
  description: 'Move tiles to the left.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.boolean(),
})

game2048Skill.addFunction(() => useGameStore.getState().moveRight(), 'moveRight', {
  description: 'Move tiles to the right.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.boolean(),
})

game2048Skill.addFunction(() => useGameStore.getState().undo(), 'undo', {
  description: 'Undo the previous successful move.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.boolean(),
})

game2048Skill.addFunction(
  (input) => useGameStore.getState().handleKeyboardInput(input.key),
  'handleKeyboardInput',
  {
    description: 'Handle one keyboard key as if typed by a user.',
    inputSchema: z.object({
      key: z.string().min(1),
    }),
    outputSchema: z.boolean(),
  },
)

game2048Skill.addFunction(
  (input) => useGameStore.getState().handleSwipe(input.deltaX, input.deltaY, input.threshold),
  'handleSwipe',
  {
    description: 'Handle one swipe gesture using X/Y deltas.',
    inputSchema: z.object({
      deltaX: z.number(),
      deltaY: z.number(),
      threshold: z.number().nonnegative().optional(),
    }),
    outputSchema: z.boolean(),
  },
)

game2048Skill.addFunction(
  (input) => useGameStore.getState().dispatchUserAction(input.action as UserAction),
  'dispatchUserAction',
  {
    description: 'Dispatch a normalized user action against the store.',
    inputSchema: z.object({
      action: userActionSchema,
    }),
    outputSchema: z.boolean(),
  },
)

game2048Skill.addFunction(
  () => useGameStore.getState().serializeState(),
  'serializeState',
  {
    description: 'Read the current serializable game snapshot.',
    inputSchema: z.object({}).default({}),
    outputSchema: serializedGameStateSchema,
  },
)

game2048Skill.addFunction(
  (input) => {
    useGameStore.getState().hydrateFromState(input.state)
    return true
  },
  'hydrateFromState',
  {
    description: 'Hydrate the store from a serialized game snapshot.',
    inputSchema: z.object({
      state: serializedGameStateSchema,
    }),
    outputSchema: z.boolean(),
  },
)

game2048Skill.addFunction(
  () => {
    const state = useGameStore.getState()
    return {
      grid: state.grid,
      score: state.score,
      bestScore: state.bestScore,
      moveCount: state.moveCount,
      status: state.status,
      historyLength: state.history.length,
      lastAction: state.lastAction,
    }
  },
  'getSnapshot',
  {
    description: 'Get live state details including history size and last action.',
    inputSchema: z.object({}).default({}),
    outputSchema: z.object({
      grid: gridSchema,
      score: z.number().int().nonnegative(),
      bestScore: z.number().int().nonnegative(),
      moveCount: z.number().int().nonnegative(),
      status: gameStatusSchema,
      historyLength: z.number().int().nonnegative(),
      lastAction: userActionSchema.nullable(),
    }),
  },
)
