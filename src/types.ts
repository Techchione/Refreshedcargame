/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GameState {
  playerX: number;
  playerY: number;
  enemies: Enemy[];
  score: number;
  gameOver: boolean;
  speed: number;
  distance: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: number;
}

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;
export const CAR_WIDTH = 40;
export const CAR_HEIGHT = 70;
export const ROAD_WIDTH = 300;
export const LANE_COUNT = 3;
