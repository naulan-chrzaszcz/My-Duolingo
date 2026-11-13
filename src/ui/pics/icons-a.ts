// Images de vocabulaire (1/2) : nourriture, cuisine, maison, vêtements. Repère 64 × 64.
import { C, K, ci, el, g, li, limb, pa, re } from "./kit.js";

const shine = (x: number, y: number, rx = 2.5, ry = 4) => el(x, y, rx, ry, "rgba(255,255,255,.75)", 0);
const leaf = (d: string) => pa(d, C.green);
const dots = (pts: number[][], col = K, r = 1.4) => pts.map(([x, y]) => ci(x, y, r, col, 0)).join("");
const bowlSide = (col: string) => pa("M7 32h50c0 13-11 23-25 23S7 45 7 32z", col);
const steam = (col = C.dgrey) => li("M24 22c-3-4 3-6 0-10M32 20c-3-4 3-6 0-10M40 22c-3-4 3-6 0-10", col, 2.5);

export const ICONS_A: Record<string, string> = {
  // ---- nourriture ----
  apple:
    li("M32 20c0-5 2-9 5-11") +
    pa("M32 20c-6-5-21-4-21 12 0 14 10 25 17 25 2 0 3-1 4-1s2 1 4 1c7 0 17-11 17-25 0-16-15-17-21-12z", C.red) +
    leaf("M35 14c4-6 12-7 15-4-4 5-11 7-15 4z") +
    shine(21, 31),
  banana:
    pa("M12 18c0 22 16 36 40 33l3-5c-20 1-33-12-36-29z", C.yel) +
    li("M18 22c3 12 12 22 26 26", C.gold, 2.5) +
    pa("M10 18l2-8 6 1-1 8z", C.dbrown) +
    ci(53, 49, 2, K, 0),
  orange:
    ci(32, 36, 21, C.orange) +
    leaf("M32 15c2-6 9-8 13-5-3 5-8 6-13 5z") +
    dots(
      [
        [24, 32],
        [38, 42],
        [30, 46],
        [42, 30],
      ],
      "#D97B0F",
      1.3,
    ) +
    shine(22, 28),
  strawberry:
    pa("M32 57c-12-6-20-19-18-29 1-6 8-8 18-8s17 2 18 8c2 10-6 23-18 29z", C.red) +
    dots(
      [
        [24, 30],
        [32, 28],
        [40, 30],
        [27, 39],
        [37, 39],
        [32, 47],
        [22, 36],
        [42, 36],
      ],
      C.yel,
      1.6,
    ) +
    leaf("M19 22l5-7 4 4 4-6 4 6 4-4 5 7c-8 3-18 3-26 0z") +
    li("M32 13v-5"),
  grapes:
    li("M32 15c0-4 1-7 3-9") +
    leaf("M34 10c4-5 11-5 13-1-4 4-9 4-13 1z") +
    [
      [26, 22],
      [38, 22],
      [20, 32],
      [32, 32],
      [44, 32],
      [26, 42],
      [38, 42],
      [32, 51],
    ]
      .map(([x, y]) => ci(x, y, 7, C.purple))
      .join("") +
    shine(24, 20, 1.6, 2.4) +
    shine(30, 30, 1.6, 2.4),
  watermelon:
    pa("M6 22h52a26 26 0 0 1-52 0z", C.green) +
    pa("M11 22h42a21 21 0 0 1-42 0z", C.red) +
    li("M11 22h42", K) +
    [
      [22, 28],
      [32, 32],
      [42, 28],
      [27, 37],
      [37, 37],
    ]
      .map(([x, y]) => el(x, y, 1.6, 2.6, K, 0))
      .join(""),
  lemon:
    pa("M6 34l5-4c5-9 13-14 21-14s16 5 21 14l5 4-5 4c-5 9-13 14-21 14s-16-5-21-14z", C.yel) +
    leaf("M36 17c3-6 10-8 14-6-3 6-9 8-14 6z") +
    shine(22, 30, 2.5, 4),
  tomato:
    ci(32, 37, 20, C.red) +
    pa("M21 20c4 3 7 3 11 1 4 2 7 2 11-1-2 5-6 8-11 8s-9-3-11-8z", C.green) +
    li("M32 21v-7") +
    shine(23, 33),
  carrot:
    li("M44 18c0-6 2-10 6-12", C.dgreen, 3) +
    li("M47 21c4-4 9-6 13-5", C.dgreen, 3) +
    li("M41 16c-2-5-2-9 0-12", C.dgreen, 3) +
    pa("M37 16c7 0 13 6 13 13L16 55c-3 2-7-1-5-4z", C.orange) +
    li("M27 33l5 3M21 42l4 3M33 25l4 3", "#C9650A", 2),
  potato:
    pa("M12 32c0-11 11-18 23-16s17 11 15 21-12 15-23 13S12 43 12 32z", "#D9A86C") +
    dots(
      [
        [24, 28],
        [36, 26],
        [30, 38],
        [41, 38],
        [21, 41],
      ],
      "#8A5E2E",
      1.5,
    ),
  mushroom:
    pa("M24 34h16v15c0 4-3 7-8 7s-8-3-8-7z", C.cream) +
    pa("M7 34c0-14 11-25 25-25s25 11 25 25z", C.red) +
    ci(22, 23, 3.5, C.white, 0) +
    ci(36, 18, 3, C.white, 0) +
    ci(44, 28, 3.5, C.white, 0) +
    ci(30, 29, 2.2, C.white, 0),
  bread:
    pa("M8 42c0-13 11-24 24-24s24 11 24 24v6c0 3-2 5-5 5H13c-3 0-5-2-5-5z", C.tan) +
    li("M21 27l6 6M30 23l6 6M39 25l5 5", "#B5732F", 2.5),
  cheese:
    pa("M8 36L48 18l8 6v12z", "#FFE27A") +
    re(8, 36, 48, 17, 2, C.yel) +
    ci(20, 44, 3.5, C.gold, 0) +
    ci(34, 47, 2.5, C.gold, 0) +
    ci(45, 42, 3, C.gold, 0) +
    el(40, 27, 3, 1.6, C.gold, 0),
  egg: el(32, 35, 17, 22, "#FFF8EC") + shine(25, 27, 3, 5),
  milk:
    pa("M24 13h16l6 10v34c0 2-1 3-3 3H21c-2 0-3-1-3-3V23z", C.white) +
    pa("M24 13h16v-5H24z", C.blue) +
    li("M18 23h28") +
    re(18, 31, 28, 15, 0, C.blue, 0) +
    pa("M32 33c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8z", C.white, 0) +
    li("M18 31h28M18 46h28"),
  rice:
    pa("M13 33c0-9 9-15 19-15s19 6 19 15z", C.white) +
    li("M22 26l2-1M30 23l2 1M38 26l2-1M27 30l2 1M35 30l2-1", C.grey, 2) +
    bowlSide(C.blue) +
    li("M14 42c6 3 30 3 36 0", "#A8D2FF", 2.5),
  noodles:
    li("M20 6l20 13M24 3l18 12", C.dbrown, 3) +
    li("M26 32c0-8 4-11 4-18M32 32c0-8 4-11 4-18M38 32c0-7 3-10 3-15", C.gold, 3.5) +
    bowlSide(C.red) +
    el(32, 32, 25, 4, "#FFE0A8"),
  meat:
    pa("M10 31c0-11 11-17 23-17s21 7 21 17-9 21-23 21S10 42 10 31z", "#E35D5B") +
    li("M18 28c6 4 14 2 20 6M22 40c4-2 10 0 14-3", "#FFC2C2", 2.5) +
    ci(41, 26, 5.5, C.white),
  cake:
    re(30, 12, 4, 13, 1, C.blue) +
    pa("M32 3c3 4 3 7 0 9-3-2-3-5 0-9z", C.orange) +
    re(11, 30, 42, 24, 4, C.pink) +
    pa("M11 34c0-4 2-6 6-6h30c4 0 6 2 6 6-3 4-6 1-9 4s-5-1-8 2-6-1-8 1-5-3-8 0-6 0-9-5z", C.white) +
    ci(20, 27, 3, C.red) +
    ci(44, 27, 3, C.red),
  icecream:
    pa("M20 32h24L32 59z", C.tan) +
    li("M24 36l12 12M30 36l8 8M40 36L28 48", "#B5732F", 2) +
    ci(25, 29, 9, C.pink) +
    ci(39, 29, 9, C.cream) +
    ci(32, 18, 9, C.dbrown),
  cookie:
    ci(32, 32, 22, "#E0A55E") +
    dots(
      [
        [24, 24],
        [36, 22],
        [42, 33],
        [28, 36],
        [22, 44],
        [38, 44],
        [33, 30],
      ],
      C.dbrown,
      2.6,
    ),
  pizza:
    pa("M9 15c15-7 31-7 46 0L32 59z", C.yel) +
    pa("M9 15c15-7 31-7 46 0l-2 6c-14-6-28-6-42 0z", C.tan) +
    ci(27, 28, 4, C.red) +
    ci(38, 30, 4, C.red) +
    ci(32, 42, 3.5, C.red) +
    li("M24 36l2 1M36 22l2 1", C.green, 2.5),
  sandwich:
    re(8, 43, 48, 10, 4, "#F2C27B") +
    re(10, 38, 44, 6, 2, C.red) +
    pa("M8 38c4-4 6 2 10-2s6 2 10-2 6 2 10-2 6 2 10-2 6 2 8 2v4H8z", C.green) +
    pa("M11 29h42l-5 7H16z", C.yel) +
    re(8, 19, 48, 11, 4, "#F2C27B") +
    li("M16 24h4M30 23h4M44 24h4", "#D99A4E", 2),
  soup:
    steam() +
    bowlSide(C.blue) +
    el(32, 32, 25, 4.5, C.orange) +
    ci(26, 32, 1.5, C.green, 0) +
    ci(38, 31, 1.5, C.green, 0),
  kimchi:
    el(32, 52, 27, 6, C.white) +
    pa("M15 49c-4-15 4-33 17-35s21 16 17 35c-4 5-30 5-34 0z", "#E8553B") +
    li("M32 17v32M24 23c4 8 5 17 5 26M40 23c-4 8-5 17-5 26", "#FFD8C2", 2),
  coffee:
    steam() +
    el(30, 55, 22, 4, C.white) +
    pa("M46 30h3c4 0 6 3 6 7s-3 7-7 7h-3", "none") +
    pa("M12 26h36l-4 22c-1 4-4 6-8 6H24c-4 0-7-2-8-6z", C.white) +
    el(30, 26, 18, 3.5, C.dbrown),
  tea:
    li("M38 25c2-6 6-9 11-8", K, 2) +
    re(45, 10, 10, 11, 1.5, C.green) +
    pa("M46 30h3c4 0 6 3 6 7s-3 7-7 7h-3", "none") +
    pa("M12 26h36l-4 22c-1 4-4 6-8 6H24c-4 0-7-2-8-6z", C.white) +
    el(30, 26, 18, 3.5, "#E9A13B"),
  water:
    pa("M20 28h24l-3 25c0 2-2 4-4 4H27c-2 0-4-2-4-4z", "#8CC8FF", 0) +
    pa("M17 9h30l-4 44c0 3-3 5-5 5H26c-2 0-5-2-5-5z", "none") +
    li("M20 28h24", C.dblue, 2) +
    li("M24 14l1 9", C.white, 2.5),
  juice:
    li("M39 4l-5 24", C.red, 3.5) +
    pa("M20 26h24l-3 27c0 2-2 4-4 4H27c-2 0-4-2-4-4z", C.orange, 0) +
    pa("M17 9h30l-4 44c0 3-3 5-5 5H26c-2 0-5-2-5-5z", "none") +
    li("M19 26h26", "#D97B0F", 2) +
    ci(16, 12, 7, C.yel) +
    li("M16 12l-4-4M16 12l5-3M16 12v6", C.gold, 1.5),
  wine:
    pa("M20 6h24c0 15-4 26-12 26S20 21 20 6z", C.white) +
    pa("M21 15h22c-1 10-5 16-11 16s-10-6-11-16z", "#B0284A", 0) +
    pa("M20 6h24c0 15-4 26-12 26S20 21 20 6z", "none") +
    li("M32 32v19") +
    el(32, 53, 11, 3, C.white),
  beer:
    pa("M44 26h4c4 0 6 3 6 8v6c0 5-2 8-6 8h-4", "none", 1) +
    re(14, 20, 30, 37, 4, C.yel) +
    pa("M11 22c0-6 6-8 10-6 2-4 10-4 12 0 4-2 11 0 11 6 0 3-2 4-4 4H15c-2 0-4-1-4-4z", C.white) +
    ci(22, 38, 1.6, C.white, 0) +
    ci(30, 46, 1.6, C.white, 0) +
    ci(36, 34, 1.6, C.white, 0),
  candy:
    pa("M21 32L8 23v18z", C.pink) +
    pa("M43 32l13-9v18z", C.pink) +
    ci(32, 32, 12, C.red) +
    li("M26 28c4-4 10-2 10 3s-6 7-9 4", C.white, 2.5),
  // ---- cuisine ----
  cup:
    pa("M44 24h4c5 0 8 4 8 9s-3 9-8 9h-4", "none", 1) +
    re(14, 16, 30, 38, 6, C.blue) +
    re(14, 28, 30, 8, 0, C.sky, 0) +
    li("M14 28h30M14 36h30"),
  plate: ci(32, 32, 25, C.white) + ci(32, 32, 16, C.ice) + li("M18 18c-3 3-5 7-5 11", C.grey, 2),
  bowl:
    pa("M5 28h54c0 15-12 27-27 27S5 43 5 28z", C.orange) +
    el(32, 28, 27, 5, "#FFD9A8") +
    li("M14 40c5 4 31 4 36 0", "#FFD0A0", 2.5),
  spoon: g(
    "rotate(-35 32 32)",
    re(29, 26, 6, 34, 3, C.grey) + el(32, 15, 10, 13, C.lgrey) + el(30, 13, 3, 5, C.white, 0),
  ),
  fork: g(
    "rotate(35 32 32)",
    pa("M22 4v14c0 5 3 8 7 9v31h6V27c4-1 7-4 7-9V4h-4v13h-2V4h-4v13h-2V4h-4v13h-2V4z", C.lgrey),
  ),
  knife: g(
    "rotate(-35 32 32)",
    pa("M28 4c7 4 9 14 9 27H28z", C.lgrey) +
      re(27, 31, 11, 28, 4, C.dbrown) +
      ci(32.5, 40, 1.5, C.white, 0) +
      ci(32.5, 50, 1.5, C.white, 0),
  ),
  chopsticks:
    pa("M17 5h5l9 53h-4z", C.brown) +
    pa("M42 5h5l-10 53h-4z", C.brown) +
    re(17, 11, 6, 3, 0, C.red, 0) +
    re(41, 11, 6, 3, 0, C.red, 0),
  pan:
    re(42, 32, 20, 8, 4, C.dbrown) +
    ci(25, 36, 19, C.slate) +
    ci(25, 36, 13, "#6E6E92") +
    li("M17 30c2-3 5-5 8-5", "#9A9AC0", 2.5),
  pot:
    re(3, 31, 8, 7, 3, C.red) +
    re(53, 31, 8, 7, 3, C.red) +
    re(9, 25, 46, 29, 5, C.red) +
    pa("M7 25c0-6 11-10 25-10s25 4 25 10z", C.dred) +
    ci(32, 12, 3.5, C.slate) +
    li("M15 33h34", "#FF9A9E", 2.5),
  fridge:
    re(15, 4, 34, 54, 5, C.ice) +
    li("M15 23h34M42 10v8M42 29v14") +
    re(18, 58, 6, 3, 1, C.slate, 0) +
    re(40, 58, 6, 3, 1, C.slate, 0) +
    li("M20 30v18", C.white, 2.5),
  oven:
    re(7, 8, 50, 50, 5, C.lgrey) +
    li("M7 21h50") +
    [15, 25, 35].map(x => ci(x, 14.5, 2.6, C.slate)).join("") +
    re(42, 12, 10, 5, 1.5, C.slate) +
    li("M16 26h32", K, 3) +
    re(13, 30, 38, 22, 3, C.slate) +
    re(17, 34, 30, 14, 2, "#FFB45C"),
  bottle:
    re(26, 3, 12, 7, 2, C.red) +
    pa("M27 10h10v6c0 4 9 6 9 14v26c0 3-2 5-5 5H23c-3 0-5-2-5-5V30c0-8 9-10 9-14z", C.mint) +
    re(18, 33, 28, 14, 0, C.white) +
    li("M24 22v30", C.white, 2.5),
  basket:
    pa("M15 28c0-15 34-15 34 0", "none") +
    li("M15 28c0-15 34-15 34 0", C.dbrown, 3) +
    pa("M7 28h50l-6 27H13z", "#D9A06A") +
    li("M10 37h44M12 46h40M22 28l2 27M32 28v27M42 28l-2 27", "#9A6438", 2),
  // ---- maison ----
  house:
    re(41, 11, 7, 12, 1, "#C46A4A") +
    re(13, 30, 38, 26, 2, "#FFE7B8") +
    pa("M7 32L32 9l25 23z", C.red) +
    re(27, 40, 10, 16, 2, C.brown) +
    re(17, 36, 7, 7, 1, C.sky) +
    re(40, 36, 7, 7, 1, C.sky),
  door:
    li("M8 58h48") +
    re(17, 5, 30, 53, 3, C.brown) +
    re(22, 11, 20, 17, 2, "#A0663F") +
    re(22, 33, 20, 19, 2, "#A0663F") +
    ci(41, 31, 2.6, C.yel),
  window:
    re(9, 8, 46, 46, 3, C.white) +
    re(13, 12, 38, 38, 1, C.sky) +
    li("M32 12v38M13 31h38") +
    li("M18 18l8-2M18 24l5-1", C.white, 2.5) +
    re(5, 53, 54, 6, 2, C.white),
  key:
    ci(18, 32, 12, C.yel) +
    ci(18, 32, 4.5, C.white) +
    re(29, 28.5, 31, 7, 2, C.yel) +
    pa("M45 35h5v8h-5zM54 35h5v6h-5z", C.yel),
  bed:
    re(6, 16, 9, 38, 3, C.brown) +
    re(6, 42, 54, 8, 2, C.brown) +
    re(52, 42, 6, 14, 1, C.dbrown) +
    re(12, 32, 47, 11, 3, C.white) +
    el(21, 30, 8, 4.5, C.white) +
    re(28, 29, 31, 14, 3, C.blue) +
    li("M30 35h27", C.sky, 2),
  chair:
    re(15, 4, 7, 54, 3, C.brown) +
    re(15, 32, 34, 7, 2, C.brown) +
    re(42, 38, 7, 20, 2, C.brown) +
    re(15, 12, 7, 4, 0, C.dbrown, 0) +
    re(15, 22, 7, 4, 0, C.dbrown, 0),
  table:
    re(10, 29, 7, 27, 2, C.dbrown) +
    re(47, 29, 7, 27, 2, C.dbrown) +
    re(5, 22, 54, 8, 3, C.brown) +
    li("M10 26h12", "#D9A06A", 2),
  sofa:
    re(10, 15, 44, 20, 7, C.lilac) +
    re(9, 30, 46, 18, 5, C.purple) +
    re(3, 25, 11, 25, 5, C.purple) +
    re(50, 25, 11, 25, 5, C.purple) +
    li("M32 31v16", "#7B4DD6", 2) +
    re(8, 50, 4, 5, 1, C.slate, 0) +
    re(52, 50, 4, 5, 1, C.slate, 0),
  lamp:
    li("M32 30v20", K, 3) +
    el(32, 54, 13, 4, C.grey) +
    pa("M21 8h22l9 23H12z", C.yel) +
    li("M24 14l-3 10", C.white, 2.5),
  clock:
    ci(32, 32, 26, C.blue) +
    ci(32, 32, 20, C.white) +
    li("M32 15v4M32 45v4M15 32h4M45 32h4", K, 2.5) +
    li("M32 32V20M32 32l9 5", K, 3) +
    ci(32, 32, 2.5, K, 0),
  alarm:
    ci(16, 16, 7, C.yel) +
    ci(48, 16, 7, C.yel) +
    li("M21 52l-5 7M43 52l5 7", K, 3) +
    ci(32, 36, 21, C.red) +
    ci(32, 36, 15, C.white) +
    li("M32 36V26M32 36l7 4", K, 3) +
    li("M28 9h8M32 9v5", K, 3),
  tv:
    li("M26 13l-7-9M38 13l7-9", K, 2.5) +
    re(5, 13, 54, 37, 5, C.slate) +
    re(10, 18, 44, 27, 3, "#7FC4FF") +
    li("M14 24l7-3M14 30l4-2", C.white, 2.5) +
    li("M24 50l-4 8M40 50l4 8", K, 3),
  shower:
    limb("M14 59V16c0-5 3-8 7-8h14", C.grey, 4) +
    pa("M30 8h14l7 11H23z", C.lgrey) +
    li("M27 25l-2 7M35 25l-1 7M43 25l1 7M30 37l-1 7M39 37l1 7M47 30l2 6", C.blue, 3),
  toothbrush: g(
    "rotate(-30 32 32)",
    re(5, 33, 38, 8, 4, C.blue) +
      re(40, 30, 18, 11, 3, C.white) +
      re(41, 22, 16, 9, 1, C.white) +
      li("M45 23v7M49 23v7M53 23v7", C.grey, 1.5) +
      pa("M41 22c3-4 6 0 8-3s6 0 8-2v5H41z", "#9EE6D0"),
  ),
  towel:
    li("M6 12h52", C.grey, 4) +
    re(16, 10, 32, 47, 4, C.pink) +
    li("M16 17h32") +
    re(17, 44, 30, 4, 0, C.white, 0) +
    re(17, 50, 30, 2.5, 0, C.white, 0),
  mirror:
    el(32, 28, 20, 25, C.yel) +
    el(32, 28, 15, 20, C.sky) +
    li("M24 19l6-6M24 27l12-12", C.white, 3) +
    li("M32 53v4", K, 3) +
    re(22, 57, 20, 4, 2, C.yel),
  washer:
    re(9, 5, 46, 54, 5, C.white) +
    li("M9 18h46") +
    ci(17, 11.5, 2.5, C.slate) +
    re(33, 9, 15, 5, 1.5, C.blue) +
    ci(32, 38, 15, C.grey) +
    ci(32, 38, 10.5, "#7FC4FF") +
    pa("M22 40c3-2 6 2 10 0s7-2 10 0v2c0 5-4 8-10 8s-10-4-10-9z", C.dblue, 0),
  plant:
    leaf("M32 34c-2-11-11-17-19-14 2 9 11 15 19 14z") +
    leaf("M32 34c2-12 11-20 19-17-2 10-11 16-19 17z") +
    leaf("M32 34c-4-12-2-22 3-29 4 7 4 19-3 29z") +
    pa("M18 38h28l-4 20H22z", "#D9774A") +
    re(16, 34, 32, 6, 2, "#E8885A"),
  // ---- vêtements ----
  tshirt:
    pa("M21 7l-15 10 6 11 7-4v33h26V24l7 4 6-11-15-10c-2 4-6 6-11 6s-9-2-11-6z", C.red) +
    li("M21 7c2 4 6 6 11 6s9-2 11-6"),
  trousers: pa("M15 6h34l4 52H38l-6-33-6 33H11z", C.blue) + li("M15 13h34M32 13v10") + li("M19 13v6M45 13v6", K, 2),
  dress:
    li("M26 6v8M38 6v8") +
    pa("M25 14h14l3 9 11 34H11l11-34z", C.pink) +
    re(22, 21, 20, 5, 1, "#E56A92") +
    li("M22 36l-4 14M32 32v20M42 36l4 14", "#E56A92", 2),
  skirt:
    pa("M17 19h30l11 35H6z", C.purple) +
    re(17, 13, 30, 7, 2, "#7B4DD6") +
    li("M23 22l-6 30M32 22v30M41 22l6 30", "#7B4DD6", 2),
  coat:
    pa("M22 6l-12 6-4 41h8l3-27v34h30V26l3 27h8l-4-41-12-6-10 10z", "#C47A3A") +
    li("M22 6l10 16 10-16") +
    li("M32 22v38") +
    dots(
      [
        [36, 30],
        [36, 40],
        [36, 50],
      ],
      K,
      1.8,
    ),
  shoes:
    pa("M6 46c0-7 2-13 6-15l10-2 7 6c6 4 14 4 21 6 6 2 8 6 8 9v2H6z", C.blue) +
    re(5, 46, 54, 8, 4, C.white) +
    li("M22 33l4 5M27 31l4 5M32 33l3 5", C.white, 2),
  socks:
    pa("M18 5h18v28l13 11c4 4 2 13-6 13-4 0-6-2-8-4L21 41c-2-2-3-4-3-7z", C.red) +
    re(18, 5, 18, 8, 0, C.white) +
    re(18, 20, 18, 4, 0, C.white, 0) +
    li("M18 13v-8h18v8"),
  hat:
    el(32, 45, 28, 9, C.brown) +
    pa("M17 45c0-17 6-27 15-27s15 10 15 27c-8 3-22 3-30 0z", "#D29A63") +
    pa("M18 36c8 3 20 3 28 0l1 6c-9 3-21 3-30 0z", C.red),
  glasses:
    ci(18, 34, 11, "#DFF1FF") +
    ci(46, 34, 11, "#DFF1FF") +
    li("M29 32c2-3 4-3 6 0", K, 3) +
    li("M7 32l-4-9M57 32l4-9", K, 3) +
    li("M12 31l4-4M40 31l4-4", C.white, 2.5),
  bag: li("M22 26c0-13 20-13 20 0", K, 3) + pa("M10 26h44l-4 30H14z", C.red) + re(27, 31, 10, 7, 2, C.yel),
  umbrella:
    li("M32 32v20c0 5-7 5-7 0", K, 3) +
    pa("M6 32C6 18 18 8 32 8s26 10 26 24c-4-4-9-4-13 0-4-4-9-4-13 0-4-4-9-4-13 0-4-4-9-4-13 0z", C.blue) +
    li("M32 8c-7 6-7 18-6 24M32 8c7 6 7 18 6 24", C.dblue, 2) +
    li("M32 8V4", K, 3),
  watch:
    re(24, 3, 16, 58, 5, C.slate) + ci(32, 32, 15, C.yel) + ci(32, 32, 11, C.white) + li("M32 32v-7M32 32l5 3", K, 2.5),
  scarf:
    g(
      "rotate(8 30 40)",
      re(20, 28, 11, 28, 2, C.red) + li("M22 56v5M26 56v5M30 56v5", C.red, 2) + li("M20 40h11M20 48h11", C.white, 2.5),
    ) +
    re(32, 28, 11, 24, 2, C.red) +
    li("M34 52v5M38 52v5M42 52v5", C.red, 2) +
    li("M32 38h11M32 45h11", C.white, 2.5) +
    pa("M12 8c0 15 9 24 20 24s20-9 20-24h-9c0 9-5 15-11 15S21 17 21 8z", C.red) +
    li("M16 16c2 5 5 8 9 10M48 16c-2 5-5 8-9 10", C.white, 2.5) +
    re(26, 26, 12, 8, 3, C.dred),
  ring:
    ci(32, 41, 17, C.yel) +
    ci(32, 41, 11.5, C.white) +
    pa("M24 15l8-9 8 9-8 11z", "#7FE0FF") +
    li("M24 15h16M32 6v20", K, 1.5),
};
