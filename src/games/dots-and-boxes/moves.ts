export const BOX_ROWS = 4;
export const BOX_COLS = 4;
export const BOX_COUNT = BOX_ROWS * BOX_COLS;

export const HORIZONTAL_EDGE_COUNT = (BOX_ROWS + 1) * BOX_COLS;
export const VERTICAL_EDGE_COUNT = BOX_ROWS * (BOX_COLS + 1);
export const EDGE_COUNT = HORIZONTAL_EDGE_COUNT + VERTICAL_EDGE_COUNT;

/** The edge connecting dot(row,col) to dot(row,col+1). */
export function horizontalEdge(row: number, col: number): number {
  return row * BOX_COLS + col;
}

/** The edge connecting dot(row,col) to dot(row+1,col). */
export function verticalEdge(row: number, col: number): number {
  return HORIZONTAL_EDGE_COUNT + row * (BOX_COLS + 1) + col;
}

export function boxIndex(row: number, col: number): number {
  return row * BOX_COLS + col;
}

/** The 4 edges bordering a box: top, bottom, left, right. */
export function edgesForBox(box: number): [number, number, number, number] {
  const row = Math.floor(box / BOX_COLS);
  const col = box % BOX_COLS;
  return [horizontalEdge(row, col), horizontalEdge(row + 1, col), verticalEdge(row, col), verticalEdge(row, col + 1)];
}

/** The 1 or 2 boxes adjacent to an edge — a border edge touches only one box. */
export function boxesForEdge(edge: number): number[] {
  const boxes: number[] = [];
  for (let box = 0; box < BOX_COUNT; box++) {
    if (edgesForBox(box).includes(edge)) boxes.push(box);
  }
  return boxes;
}
