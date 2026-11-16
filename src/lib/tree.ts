// 칸 수가 정확히 1000이어야 한 칸 = 1만 원이 맞는다 — 모양을 고치면 treeCells().length를 다시 확인할 것.
// '.' 빈자리 · 'T' 줄기 · 'L' 잎
export const TREE_ROWS = [
  '.......................LL.......................',
  '....................LLLLLLLL....................',
  '...................LLLLLLLLLL...................',
  '..................LLLLLLLLLLLL..................',
  '.................LLLLLLLLLLLLLL.................',
  '............LLLLLLLLLLLLLLLLLLLLLLLL............',
  '...........LLLLLLLLLLLLLLLLLLLLLLLLLL...........',
  '..........LLLLLLLLLLLLLLLLLLLLLLLLLLLL..........',
  '.........LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL.........',
  '.........LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL.........',
  '.........LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL.........',
  '........LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL........',
  '.........LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL.........',
  '.........LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL.........',
  '......LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL......',
  '.....LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL.....',
  '....LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....',
  '...LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL...',
  '...LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL...',
  '...LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL...',
  '...LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL...',
  '...LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL...',
  '....LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....',
  '.....LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL.....',
  '......LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL......',
  '........LLLLLLLLLLLLLTTTTTTLLLLLLLLLLLLL........',
  '........LLLLLLLLTLLLLTTTTTTLLLLTLLLLLLLL........',
  '........LLLLLLLLLTLLLTTTTTTLLLTLLLLLLLLL........',
  '.........LLLLLLLL.TLLTTTTTTLLT.LLLLLLLL.........',
  '.........LLLLLLLL..TLTTTTTTLT..LLLLLLLL.........',
  '..........LLLLLL....TTTTTTTT....LLLLLL..........',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '....................TTTTTTTT....................',
  '..................TTTTTTTTTTTT..................',
];

export type TreeCell = { x: number; y: number; kind: 'T' | 'L' };

// 줄기 밑동에서 위로, 같은 줄에서는 가운데부터 칠해 나무가 자라는 것처럼 보이게 한다.
export function treeCells(): TreeCell[] {
  const cx = (TREE_ROWS[0].length - 1) / 2;
  const cells: TreeCell[] = [];
  TREE_ROWS.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== '.') cells.push({ x, y, kind: c as 'T' | 'L' });
    });
  });
  return cells.sort((a, b) => b.y - a.y || Math.abs(a.x - cx) - Math.abs(b.x - cx));
}
