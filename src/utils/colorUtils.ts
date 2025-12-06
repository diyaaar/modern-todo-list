/**
 * Color utility functions for workspace colors and color IDs
 */

/**
 * Maps workspace color hex codes to color IDs (1-11)
 * This mapping is used to assign color_id to tasks based on their workspace color
 */
export const COLOR_TO_ID_MAP: Record<string, number> = {
  '#a4bdfc': 1,  // Light Blue
  '#7ae7bf': 2,  // Mint Green
  '#dbadff': 3,  // Light Purple
  '#ff887c': 4,  // Coral/Salmon
  '#fbd75b': 5,  // Light Yellow
  '#ffb878': 6,  // Peach/Orange
  '#46d6db': 7,  // Cyan
  '#e1e1e1': 8,  // Light Gray
  '#5484ed': 9,  // Medium Blue
  '#51b749': 10, // Green
  '#dc2127': 11  // Red
}

/**
 * Maps color IDs back to hex codes
 */
export const ID_TO_COLOR_MAP: Record<number, string> = {
  1: '#a4bdfc',  // Light Blue
  2: '#7ae7bf',  // Mint Green
  3: '#dbadff',  // Light Purple
  4: '#ff887c',  // Coral/Salmon
  5: '#fbd75b',  // Light Yellow
  6: '#ffb878',  // Peach/Orange
  7: '#46d6db',  // Cyan
  8: '#e1e1e1',  // Light Gray
  9: '#5484ed',  // Medium Blue
  10: '#51b749', // Green
  11: '#dc2127'  // Red
}

/**
 * Get color ID from workspace color hex code
 * @param colorHex - Hex color code (e.g., '#a4bdfc')
 * @returns Color ID (1-11) or null if color not found
 */
export function getColorIdFromHex(colorHex: string | null | undefined): number | null {
  if (!colorHex) return null
  return COLOR_TO_ID_MAP[colorHex.toLowerCase()] || null
}

/**
 * Get color hex code from color ID
 * @param colorId - Color ID (1-11)
 * @returns Hex color code or null if ID not found
 */
export function getColorHexFromId(colorId: number | null | undefined): string | null {
  if (!colorId || colorId < 1 || colorId > 11) return null
  return ID_TO_COLOR_MAP[colorId] || null
}

