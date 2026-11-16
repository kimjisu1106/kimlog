// 도안: jewel-stitch (INBOX #394).
// 칸 수가 정확히 1000이어야 한 칸 = 1만 원이 맞는다 — 모양을 고치면 treeCells().length를 다시 확인할 것.
// '.' 빈자리 · 'T' 줄기 · 'H' 잎(빛 받는 쪽) · 'L' 잎 · 'D' 잎(그늘)
export const TREE_ROWS = [
  '.....................HHHHHHH....................',
  '...................HHHHHHHHHLL..................',
  '.................HHHHHHHHHLHHHHH................',
  '................HHHHHHHHLHHHHHHHLLL.............',
  '................HHHHHHHLHHHHHHLLLLLL............',
  '..............HHHHHHHLLHHHHHHLLLLLLLL...........',
  '..........HHHHHHHHHLLLLHHHHLLLLLLLLLDHH.........',
  '.........HHHHHHHHLLLLLHHHLLLLLLLLLDDDHLL........',
  '.......HHHHHHHHLLLLLHHHHHHHHHLLLDDDDDLLLLL......',
  '.......HHHHHHLLLLHHHHHHHHHHHHLLLDDDDDLLLLL......',
  '......HHHHHLLLLLHHHHHHHHHHHLLLLLLDDDDLLLLLD.....',
  '......HHHLLLLLLHHHHHHHHHLLLLLLLLLLDDLLLLDDD.....',
  '......HLLLLLLLHHHHHHHHLLLLLLLLLLLLLLLLDDDDD.....',
  '......LLLLLLLHHHHHHLLLLLLLLLLLLLLLDDDDDDDDD.....',
  '.....HHHHHHHLHHHHHLLLLLLLLLLLLLHHHHDDHHHHHH.....',
  '....HHHHHHLHHHHHHHHHLLLLLLLLHHHHHHHHHLHHHHLLL...',
  '...HHHHHHLHHHHHHHHLLLLLLLLLHHHHHHHHLLLLHLLLLLL..',
  '..HHHHHLLHHHHHHHLLLLLLLLLDHHHHHHHLLLLLLLLLLLLLL.',
  '..HHHLLLHHHHHHLLLLLLLHHHHHHHHHLLLLLLLLLLLLLLLLD.',
  '..HLLLLLHHHHLLLLLLHHHHHHHHHHLLLLLLLLLLLDDLLLDDD.',
  '..LLLLLLHHLLLLLLTTHHHHHHHLLLLLTTLLLLLDDDDLDDDDD.',
  '..LLLLLLLLLLLLLLHTTHHHHLLLLLLTTLLLLDDDDDDDDDDDD.',
  '...LLLLDLLLLLLLHHHTTLLLLLLLLTTLLDDDDDDDDDDDDDD..',
  '...DDDDDLLLLLLDHHHLTTLTTTTLTTLDDDDDDDDDDDDDDDD..',
  '.....DDDDDDDDDDLLLLLTTTTTTTTDDDDDDDDDDDDDDDD....',
  '..........DDDDDLLLLLLTTTTTTDDDDDDDDDDDD.........',
  '.............DDDLLLLLLTTTTDDDDDDDDDD............',
  '.................DDDDDTTTTDDDDDD................',
  '...................DDDTTTTDDDD..................',
  '......................TTTTD.....................',
  '......................TTTT......................',
  '......................TTTT......................',
  '......................TTTT......................',
  '......................TTTT......................',
  '......................TTTT......................',
  '......................TTTT......................',
  '.....................TTTTTT.....................',
  '.....................TTTTTT.....................',
  '....................TTTTTTTT....................',
  '..................TTTTTTTTTTTT..................',
  '................TTTTTTTTTTTTTTTT................',
];

export type TreeCell = { x: number; y: number; kind: 'T' | 'H' | 'L' | 'D' };

// 줄기 밑동에서 위로, 같은 줄에서는 가운데부터 칠해 나무가 자라는 것처럼 보이게 한다.
export function treeCells(): TreeCell[] {
  const cx = (TREE_ROWS[0].length - 1) / 2;
  const cells: TreeCell[] = [];
  TREE_ROWS.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== '.') cells.push({ x, y, kind: c as TreeCell['kind'] });
    });
  });
  return cells.sort((a, b) => b.y - a.y || Math.abs(a.x - cx) - Math.abs(b.x - cx));
}
