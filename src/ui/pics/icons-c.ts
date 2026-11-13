// Images de vocabulaire (3/3, v31) : la Corée au quotidien. Repère 64 × 64.
import { C, ci, el, g, li, pa, re } from "./kit.js";

const steam = () => li("M24 20c-3-4 3-6 0-10M32 18c-3-4 3-6 0-10M40 20c-3-4 3-6 0-10", C.dgrey, 2.5);
const half = (x: number, y: number, col: string) => pa(`M${x - 9} ${y}c1-9 17-11 18 0-5 2-13 2-18 0z`, col);

export const ICONS_C: Record<string, string> = {
  hanbok:
    pa("M18 30h28l12 28H6z", C.pink) +
    li("M20 36l-6 20M32 34v22M44 36l6 20", "#E56A92", 2) +
    pa("M21 6l-13 8 4 11 8-4v9h24v-9l8 4 4-11-13-8c-2 4-6 6-11 6s-9-2-11-6z", "#7FC4FF") +
    li("M10 20l4-2M54 20l-4-2", C.yel, 3) +
    li("M21 7l11 12 11-12", C.white, 3) +
    pa("M32 20l-4 15h3l2-11z", C.red) +
    pa("M32 20l5 14h3l-6-15z", C.red) +
    ci(32, 20, 2.6, C.red),
  tteokguk:
    steam() +
    pa("M7 32h50c0 13-11 23-25 23S7 45 7 32z", C.white) +
    li("M12 40c6 4 34 4 40 0", C.blue, 2.5) +
    el(32, 32, 25, 4.5, "#F5EBD8") +
    el(22, 29, 5.5, 2.8, C.white) +
    el(34, 30, 5.5, 2.8, C.white) +
    el(44, 28, 5, 2.6, C.white) +
    el(28, 26, 5, 2.6, C.white) +
    li("M18 32l4-1M38 27l4 1", C.yel, 2) +
    li("M30 33l3-1M46 31l2-1", C.dgreen, 2),
  songpyeon:
    el(32, 48, 28, 8, C.white) +
    li("M8 30l8 8M12 26l6 10M54 28l-8 9", C.green, 2) +
    half(20, 44, "#F4F7EC") +
    half(38, 45, C.pink) +
    half(29, 36, "#B9E3A8") +
    half(46, 37, "#F4F7EC") +
    half(14, 36, C.pink),
  kimbap:
    el(32, 50, 28, 8, C.white) +
    [
      [17, 38],
      [32, 34],
      [47, 38],
    ]
      .map(
        ([x, y]) =>
          ci(x, y, 10, "#2E3A2F") +
          ci(x, y, 7.5, C.white) +
          re(x - 2, y - 3.5, 4, 3, 0.5, C.yel, 0) +
          re(x - 4, y + 0.5, 3, 3, 0.5, C.orange, 0) +
          re(x + 1, y + 0.5, 3, 3, 0.5, C.green, 0) +
          ci(x, y + 4.6, 1.4, C.pink, 0),
      )
      .join(""),
  bibimbap:
    pa("M7 36h50c0 12-11 20-25 20S7 48 7 36z", C.slate) +
    li("M13 43c6 3 32 3 38 0", "#6E6E92", 2.5) +
    pa("M8 36c2-11 12-17 24-17s22 6 24 17z", "#FFF8EC") +
    pa("M11 35c2-6 6-10 11-11l4 11z", C.green) +
    pa("M42 24c5 1 9 5 11 11H38z", C.orange) +
    pa("M22 24c3-1 7-2 10-2l-1 13h-6z", C.dbrown) +
    pa("M33 22c3 0 6 1 9 2l-3 11h-6z", C.red) +
    el(32, 27, 8, 5, C.white) +
    ci(32, 27, 3.2, C.yel, 0),
  tteokbokki:
    el(32, 44, 28, 12, C.white) +
    pa("M10 42c0-8 10-12 22-12s22 4 22 12-10 10-22 10-22-2-22-10z", C.red) +
    g(
      "rotate(-15 32 40)",
      re(16, 35, 15, 6, 3, "#FF8A7E") + re(34, 33, 16, 6, 3, "#FF8A7E") + re(24, 42, 16, 6, 3, "#FF8A7E"),
    ) +
    pa("M42 42l8-4 2 7z", "#F2C27B") +
    ci(20, 46, 1, C.white, 0) +
    ci(38, 38, 1, C.white, 0) +
    ci(30, 50, 1, C.white, 0) +
    li("M44 32l3-1M16 38l3 1", C.green, 2),
  ramyeon:
    pa("M13 20h38l-5 38H18z", C.red) +
    re(14, 30, 36, 12, 0, C.white, 0) +
    li("M14.5 30h35M15.5 42h33") +
    li("M20 36c3-3 5 3 8 0s5 3 8 0 5 3 8 0", C.gold, 2.5) +
    pa("M11 20c4-9 34-12 42-2l-1 4H11z", C.yel) +
    li("M17 16c8-4 22-5 30-2", C.gold, 2),
  hairdryer:
    li("M8 24h-4M8 30h-5M8 36h-4", C.blue, 2.5) +
    re(26, 32, 11, 24, 4, C.purple) +
    re(10, 16, 40, 20, 10, C.purple) +
    re(48, 19, 10, 14, 3, "#7B4DD6") +
    ci(20, 26, 5, C.lilac) +
    li("M31 60c4 2 10 0 10-4", C.slate, 2.5),
  stamp:
    re(11, 8, 42, 48, 1, C.white) +
    li("M11 8h42v48H11z", C.white, 3, ' stroke-dasharray="1 5"') +
    re(17, 14, 30, 28, 1, "#9CC9FF") +
    pa("M17 42l9-12 6 7 5-5 10 10z", C.green, 0) +
    ci(40, 21, 4, C.yel, 0) +
    re(17, 14, 30, 28, 1, "none") +
    li("M20 48h14M38 48h6", C.dgrey, 2.5),
  atm:
    re(12, 4, 40, 56, 5, C.lgrey) +
    re(18, 10, 28, 18, 2, "#7FC4FF") +
    li("M22 16h12M22 21h8", C.white, 2) +
    [33, 39, 45].flatMap(y => [20, 27, 34].map(x => re(x, y, 4.5, 4, 1, C.grey))).join("") +
    re(41, 34, 5, 2.5, 1, C.slate, 0) +
    re(22, 46, 20, 9, 1, C.mint) +
    re(18, 52, 28, 4, 1, C.slate),
};
