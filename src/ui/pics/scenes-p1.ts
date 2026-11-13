// Scènes illustrées de la Part 1 (TOEIC) : une scène par phrase correcte (v30). Repère 160 × 100.
// Chaque dessin ne montre que ce que dit la bonne réponse : les mauvaises réponses restent fausses.
import { C, K, ci, el, li, pa, re } from "./kit.js";
import { chairS, desk, laptopSide, outside, person, plantPot, room } from "./people.js";

const scaled = (s: number, x: number, y: number, inner: string) =>
  `<g transform="translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})">${inner}</g>`;
const win = (x: number, y: number, w: number, h: number) =>
  re(x, y, w, h, 2, C.sky) + li(`M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}`, K, 2);
const bike = (x: number, y: number, col: string) =>
  ci(x - 13, y, 9.5, "none") +
  ci(x + 13, y, 9.5, "none") +
  li(
    `M${x - 13} ${y}l8-14h14l4 14M${x - 5} ${y - 14}l5 14 9-14M${x - 8} ${y - 18}h7M${x + 8} ${y - 14}l-1-6h6`,
    col,
    3,
  ) +
  ci(x, y, 2, K, 0);
const box = (x: number, y: number, w = 16, h = 12) =>
  re(x, y, w, h, 1, "#D9A06A") + li(`M${x + w / 2} ${y}v${h / 2.5}`, "#9A6438", 2);
const books = (x: number, y: number, w: number, cols: string[]) => {
  let s = "",
    cx = x;
  for (let i = 0; cx < x + w - 4; i++) {
    const bw = 4 + (i % 3),
      bh = 13 - (i % 4);
    s += re(cx, y - bh, bw, bh, 0.8, cols[i % cols.length]);
    cx += bw + 0.5;
  }
  return s;
};
const BOOKC = [C.red, C.blue, C.yel, C.green, C.purple, C.orange];
const shelf = (x: number, y: number, w: number, h: number, rows: number, full = true) => {
  let s = re(x, y, w, h, 2, C.brown);
  const rh = (h - 4) / rows;
  for (let r = 0; r < rows; r++) {
    const by = y + 2 + rh * (r + 1);
    s += re(x + 3, y + 2 + rh * r + 1, w - 6, rh - 3, 0, "#8A5232", 0);
    if (full || r !== 1) s += books(x + 4, by - 2.5, w - 8, BOOKC.slice(r).concat(BOOKC.slice(0, r)));
    else s += books(x + 4 + (w - 8) * 0.42, by - 2.5, (w - 8) * 0.58, BOOKC);
    s += re(x, by - 2.5, w, 3.5, 1, C.dbrown);
  }
  return s;
};
const suitcase = (x: number, fy: number, col = C.orange) =>
  li(`M${x + 9} ${fy - 26}v-10`, K, 2.5) +
  re(x + 5, fy - 38, 8, 3, 1.5, C.slate) +
  re(x, fy - 26, 18, 24, 4, col) +
  ci(x + 4, fy - 1, 2.2, C.slate) +
  ci(x + 14, fy - 1, 2.2, C.slate);
const carFront = (x: number, col: string) =>
  re(x - 17, 72, 6, 10, 2, C.slate) +
  re(x + 11, 72, 6, 10, 2, C.slate) +
  pa(`M${x - 13} ${58}l4-10h18l4 10z`, C.sky) +
  re(x - 19, 57, 38, 18, 6, col) +
  re(x - 11, 64, 22, 5, 2, C.slate) +
  ci(x - 13, 62, 3, C.yel) +
  ci(x + 13, 62, 3, C.yel);
const cup = (x: number, y: number) => pa(`M${x + 10} ${y + 2}h2c3 0 3 6 0 6h-2`, "none") + re(x, y, 10, 10, 2, C.white);

export const P1_SCENES: Record<string, string> = {
  "A woman is typing on a laptop.":
    room() +
    win(14, 12, 30, 26) +
    desk(80, 74, 58, 90) +
    chairS(58, 73, 1, 90, C.purple) +
    person({
      x: 60,
      fy: 90,
      pose: "sit",
      hs: "long",
      hair: C.dbrown,
      shirt: C.pink,
      pants: C.slate,
      hl: [88, 55],
      elL: [72, 66],
      hr: [92, 54],
      elR: [76, 65],
    }) +
    laptopSide(94, 58) +
    cup(130, 48),
  "People are attending a presentation.":
    room() +
    re(100, 10, 54, 36, 2, C.white) +
    li("M108 18v22h40", K, 2) +
    re(112, 30, 7, 10, 0, C.blue) +
    re(123, 24, 7, 16, 0, C.green) +
    re(134, 18, 7, 22, 0, C.orange) +
    [14, 38, 62]
      .map(
        (x, i) =>
          chairS(x, 73, 1, 90, C.slate) +
          person({
            x,
            fy: 90,
            pose: "sit",
            hs: i === 1 ? "long" : "short",
            hair: [C.dbrown, C.slate, "#C46F1E"][i],
            shirt: [C.green, C.purple, C.orange][i],
            hl: [x + 8, 70],
            hr: [x + 11, 70],
          }),
      )
      .join("") +
    person({ x: 90, fy: 90, dir: 1, shirt: C.blue, pants: C.slate, hr: [110, 34], elR: [101, 42], hl: [86, 64] }),
  "Pedestrians are crossing the street.":
    re(0, 0, 160, 100, 0, "#DDF0FF", 0) +
    re(6, 14, 30, 50, 1, "#C9B2FF") +
    re(40, 24, 26, 40, 1, "#FFD8A8") +
    re(118, 8, 36, 56, 1, "#9CC9FF") +
    [10, 22].map(x => [20, 32, 44].map(y => re(x, y, 8, 7, 1, C.white)).join("")).join("") +
    [124, 138].map(x => [14, 26, 38].map(y => re(x, y, 9, 7, 1, C.white)).join("")).join("") +
    re(0, 62, 160, 6, 0, C.lgrey) +
    li("M0 62h160M0 68h160", K, 2) +
    re(0, 68, 160, 32, 0, C.dgrey, 0) +
    [46, 60, 74, 88, 102, 116].map(x => re(x, 72, 9, 26, 1, C.white, 0)).join("") +
    re(138, 30, 3, 34, 1, C.grey) +
    re(133, 14, 13, 22, 3, C.slate) +
    ci(139.5, 20, 3.5, "#7A3B3E") +
    ci(139.5, 30, 3.5, C.green) +
    person({ x: 70, fy: 96, pose: "walk", dir: 1, shirt: C.red, pants: C.blue, hl: [62, 76], hr: [80, 74] }) +
    person({
      x: 100,
      fy: 94,
      pose: "walk",
      dir: -1,
      hs: "long",
      hair: K,
      shirt: C.yel,
      pants: C.slate,
      skirt: true,
      hl: [92, 72],
      hr: [110, 74],
    }),
  "A woman is selecting some fruit.":
    room("#FFF3D6", "#E8D7C0") +
    desk(70, 84, 62, 90, C.brown) +
    re(74, 48, 36, 14, 2, C.tan) +
    re(114, 48, 36, 14, 2, C.tan) +
    [80, 88, 96, 104, 84, 92, 100].map((x, i) => ci(x, i < 4 ? 47 : 41, 4, C.red)).join("") +
    [120, 128, 136, 144, 124, 132, 140].map((x, i) => ci(x, i < 4 ? 47 : 41, 4, C.orange)).join("") +
    person({
      x: 48,
      fy: 90,
      dir: 1,
      hs: "long",
      hair: "#C46F1E",
      shirt: C.green,
      pants: C.slate,
      hr: [80, 38],
      elR: [66, 44],
      hl: [42, 70],
    }) +
    ci(80, 38, 4, C.red),
  "Some bicycles have been parked in a row.":
    outside() +
    re(18, 40, 6, 38, 2, C.brown) +
    pa("M8 44c-6 0-9-5-7-10 1-4 5-6 8-5 0-8 6-13 13-13s13 5 13 13c4-1 8 2 9 6 1 5-2 9-8 9z", C.green) +
    li("M36 78h120", K, 3) +
    bike(58, 84, C.red) +
    bike(96, 84, C.blue) +
    bike(134, 84, C.green),
  "A worker is loading boxes into a truck.":
    outside("#DDF0FF", C.lgrey, 82) +
    re(94, 18, 66, 58, 3, C.white) +
    re(97, 22, 30, 50, 1, "#5D5D80") +
    box(99, 58, 13, 12) +
    box(113, 58, 13, 12) +
    box(104, 46, 14, 12) +
    re(94, 76, 66, 5, 1, C.slate) +
    ci(112, 84, 8, C.slate) +
    ci(146, 84, 8, C.slate) +
    person({
      x: 66,
      fy: 94,
      pose: "walk",
      dir: 1,
      hat: "helmet",
      shirt: C.orange,
      pants: C.blue,
      hl: [76, 60],
      hr: [88, 60],
    }) +
    box(72, 46, 20, 15),
  "A chef is cooking a meal.":
    room("#EAF7EF", "#D9DDEA") +
    [10, 30, 50, 70, 90, 110, 130, 150].map(x => li(`M${x} 0v52`, "#CDE8D6", 1.5)).join("") +
    re(70, 60, 76, 30, 3, C.lgrey) +
    re(74, 66, 68, 18, 2, C.slate) +
    pa("M96 56c-2-3 0-5 2-7 0 3 2 3 2 5 1-2 1-3 0-5 3 2 4 5 2 7z", C.orange) +
    pa("M112 56c-2-3 0-5 2-7 0 3 2 3 2 5 1-2 1-3 0-5 3 2 4 5 2 7z", C.orange) +
    li("M78 52h12", C.dbrown, 4) +
    pa("M90 48h34c0 6-4 9-8 9h-18c-4 0-8-3-8-9z", C.slate) +
    el(107, 48, 17, 3, "#E8A35C") +
    li("M100 40c-2-3 2-5 0-8M110 40c-2-3 2-5 0-8", C.dgrey, 2) +
    person({
      x: 56,
      fy: 90,
      dir: 1,
      hat: "chef",
      shirt: C.white,
      pants: C.slate,
      apron: C.white,
      hr: [80, 52],
      elR: [70, 58],
      hl: [96, 40],
      elL: [72, 46],
    }) +
    li("M96 40l8 6", C.dgrey, 3),
  "A man is filing some documents.":
    room() +
    re(86, 28, 36, 62, 2, C.grey) +
    li("M86 48h36M86 68h36", K, 2) +
    re(98, 56, 12, 3, 1, C.slate, 0) +
    re(98, 76, 12, 3, 1, C.slate, 0) +
    re(66, 32, 22, 14, 1, C.grey) +
    re(69, 27, 5, 7, 1, C.yel) +
    re(75, 27, 5, 7, 1, C.blue) +
    re(81, 28, 5, 6, 1, C.green) +
    person({
      x: 46,
      fy: 90,
      dir: 1,
      shirt: C.white,
      pants: C.slate,
      tie: C.red,
      hr: [72, 28],
      elR: [62, 38],
      hl: [66, 34],
      elL: [56, 46],
    }) +
    re(68, 20, 10, 12, 1, C.orange),
  "A traveler is waiting with his luggage.":
    room("#EAF2FF", "#D9DDEA") +
    re(8, 10, 70, 44, 2, C.sky) +
    li("M31 10v44M54 10v44", K, 2) +
    el(28, 24, 9, 4, C.white, 0) +
    el(60, 32, 8, 3.5, C.white, 0) +
    ci(124, 20, 10, C.white) +
    li("M124 20v-6M124 20l4 3", K, 2) +
    re(106, 60, 46, 5, 2, C.blue) +
    re(106, 50, 46, 10, 3, C.blue) +
    li("M112 65v25M146 65v25", K, 2.5) +
    suitcase(82, 90) +
    person({
      x: 66,
      fy: 90,
      dir: 1,
      view: "f",
      shirt: C.green,
      pants: C.slate,
      hr: [91, 52],
      elR: [80, 60],
      hl: [60, 70],
    }),
  "A technician is repairing a printer.":
    room() +
    re(92, 64, 52, 26, 2, C.slate) +
    re(88, 34, 60, 32, 4, C.grey) +
    re(100, 26, 36, 10, 1, C.white) +
    re(126, 40, 14, 6, 1, C.slate) +
    re(84, 44, 8, 18, 1, "#5D5D80") +
    re(28, 78, 22, 12, 2, C.red) +
    li("M33 78v-4h12v4", K, 2) +
    person({
      x: 64,
      fy: 90,
      pose: "kneel",
      dir: 1,
      hat: "cap",
      shirt: C.blue,
      pants: C.slate,
      hr: [88, 52],
      elR: [78, 60],
      hl: [84, 58],
      elL: [74, 66],
    }) +
    li("M88 52l8-4", C.dgrey, 3) +
    ci(97, 47.5, 2.5, "none"),
  "Some chairs have been stacked.":
    room("#FFF3D6", "#E8D7C0") +
    win(20, 12, 34, 30) +
    [0, 1, 2, 3].map(i => chairS(80 + i * 5, 70 - i * 8, -1, 90 - i * 8, [C.blue, C.dblue][i % 2])).join("") +
    plantPot(140, 90),
  "A woman is watering some plants.":
    outside("#DDF0FF", "#BFE6B0", 82) +
    plantPot(104, 92, 1) +
    plantPot(124, 92, 1.1) +
    plantPot(144, 92, 0.9) +
    li("M98 52l3 6M104 52l1 7M110 52l-1 6", C.blue, 2.5) +
    person({
      x: 54,
      fy: 92,
      dir: 1,
      hs: "bun",
      hair: K,
      shirt: C.yel,
      pants: C.blue,
      hr: [76, 48],
      elR: [64, 52],
      hl: [70, 62],
      elL: [60, 64],
    }) +
    re(70, 48, 16, 14, 3, C.green) +
    li("M86 52l10-6", C.green, 3.5),
  "Cars are parked in a lot.":
    re(0, 0, 160, 100, 0, "#DDF0FF", 0) +
    re(0, 40, 160, 60, 0, C.dgrey) +
    li("M12 84V48M60 84V48M108 84V48M156 84V48", C.white, 2.5) +
    li("M0 88h160", C.white, 2.5) +
    carFront(36, C.red) +
    carFront(84, C.blue) +
    carFront(132, C.yel) +
    re(140, 6, 16, 16, 3, C.blue) +
    `<text x="148" y="19" text-anchor="middle" font-size="12" font-weight="900" fill="#fff" stroke="none" font-family="Nunito,system-ui,sans-serif">P</text>`,
  "A man is giving a demonstration.":
    room() +
    desk(92, 60, 62, 90, C.brown) +
    re(118, 50, 14, 12, 3, C.purple) +
    ci(125, 56, 3, C.yel, 0) +
    person({
      x: 128,
      fy: 90,
      dir: -1,
      view: "f",
      shirt: C.white,
      pants: C.slate,
      tie: C.blue,
      hl: [108, 40],
      elL: [116, 48],
      hr: [126, 62],
      elR: [136, 58],
    }) +
    re(100, 36, 12, 8, 2, C.purple) +
    [16, 40, 64]
      .map((x, i) =>
        person({
          x,
          fy: 90,
          dir: 1,
          hs: i === 1 ? "long" : "short",
          hair: [K, "#C46F1E", C.dbrown][i],
          shirt: [C.green, C.pink, C.orange][i],
          pants: C.slate,
        }),
      )
      .join(""),
  "A table has been set for a meal.":
    room("#FFF3D6", "#E8D7C0") +
    plantPot(146, 90, 0.9) +
    re(36, 30, 6, 30, 2, C.dbrown) +
    re(118, 30, 6, 30, 2, C.dbrown) +
    desk(26, 108, 60, 90, C.brown) +
    pa("M24 56h112v12l-4 4H28l-4-4z", C.white) +
    el(48, 55, 11, 2.6, C.white) +
    el(112, 55, 11, 2.6, C.white) +
    li("M34 54v-6M62 54v-6M98 54v-6M126 54v-6", C.dgrey, 2) +
    pa("M68 40h8c0 6-2 8-4 8s-4-2-4-8z", C.white) +
    li("M72 48v6", K, 2) +
    pa("M86 40h8c0 6-2 8-4 8s-4-2-4-8z", C.white) +
    li("M90 48v6", K, 2) +
    re(78, 40, 4, 14, 1, C.white) +
    pa("M80 32c2 3 2 5 0 7-2-2-2-4 0-7z", C.orange),
  "A woman is talking on the phone.":
    room() +
    desk(78, 76, 60, 90) +
    re(104, 54, 8, 6, 0, C.grey) +
    re(92, 30, 32, 24, 3, C.slate) +
    re(95, 33, 26, 18, 1, "#7FC4FF") +
    re(126, 56, 20, 4, 1, C.lgrey) +
    chairS(58, 73, 1, 90, C.purple) +
    person({
      x: 60,
      fy: 90,
      pose: "sit",
      hs: "long",
      hair: K,
      shirt: C.purple,
      pants: C.slate,
      hr: [58, 46],
      elR: [70, 60],
      hl: [74, 62],
    }) +
    re(55, 38, 5, 11, 1.5, C.slate),
  "Workers are building a wall.":
    outside("#DDF0FF", "#E8D7C0", 84) +
    (() => {
      let s = "";
      const tops = [5, 5, 5, 4, 4, 3, 3];
      for (let c = 0; c < 7; c++)
        for (let r = 0; r < tops[c]; r++) s += re(44 + c * 11 + (r % 2 ? 5 : 0), 78 - r * 7, 11, 6, 1, "#D2693C");
      return s;
    })() +
    person({
      x: 28,
      fy: 92,
      dir: 1,
      hat: "helmet",
      shirt: C.orange,
      pants: C.blue,
      hr: [46, 44],
      elR: [38, 50],
      hl: [42, 50],
      elL: [34, 56],
    }) +
    re(40, 40, 11, 6, 1, "#D2693C") +
    person({
      x: 140,
      fy: 92,
      dir: -1,
      hat: "helmet",
      shirt: C.yel,
      pants: C.slate,
      hl: [124, 58],
      elL: [130, 62],
      hr: [146, 70],
    }) +
    pa("M124 58l-8 2 4 4z", C.grey),
  "A person is arranging books on a shelf.":
    room() +
    shelf(88, 14, 60, 76, 3, false) +
    person({
      x: 68,
      fy: 90,
      dir: 1,
      hs: "short",
      hair: "#C46F1E",
      shirt: C.green,
      pants: C.slate,
      hr: [98, 47],
      elR: [84, 48],
      hl: [62, 70],
    }) +
    re(96, 39, 5, 14, 1, C.red),
  "A man is pouring milk into a cup.":
    room("#FFF3D6", "#E8D7C0") +
    re(116, 24, 36, 40, 3, C.grey) +
    re(122, 30, 24, 8, 1, C.slate) +
    li("M128 38v8M140 38v8", K, 2.5) +
    person({
      x: 62,
      fy: 98,
      dir: 1,
      shirt: C.white,
      pants: C.slate,
      apron: C.brown,
      hr: [86, 42],
      elR: [74, 50],
      hl: [72, 64],
    }) +
    pa("M82 36h12l2 10c-4 2-12 2-15 0z", C.lgrey) +
    li("M96 42c3 2 4 6 4 10", C.white, 3) +
    re(0, 64, 160, 36, 0, C.brown) +
    li("M0 64h160", K, 2.5) +
    re(94, 54, 14, 10, 2, C.white) +
    pa("M108 56h2c3 0 3 5 0 5h-2", "none"),
  "Some boxes have been loaded into a vehicle.":
    outside("#DDF0FF", C.lgrey, 84) +
    re(42, 12, 76, 66, 8, C.white) +
    re(48, 18, 64, 54, 2, "#5D5D80") +
    re(22, 18, 18, 58, 2, C.white) +
    re(120, 18, 18, 58, 2, C.white) +
    box(52, 56, 18, 14) +
    box(72, 56, 18, 14) +
    box(92, 56, 16, 14) +
    box(58, 42, 18, 14) +
    box(80, 42, 18, 14) +
    box(66, 28, 18, 14) +
    re(38, 76, 84, 6, 2, C.slate) +
    re(48, 82, 12, 8, 2, C.slate) +
    re(100, 82, 12, 8, 2, C.slate),
  "Shelves have been stocked with merchandise.":
    room("#E6E8F0", "#C9CCDA") +
    [8, 84]
      .map(
        x =>
          re(x, 10, 5, 80, 1, C.orange) +
          re(x + 63, 10, 5, 80, 1, C.orange) +
          [34, 58, 82]
            .map(
              y =>
                box(x + 7, y - 18, 17, 17) +
                box(x + 25, y - 18, 18, 17) +
                box(x + 44, y - 16, 17, 15) +
                re(x, y - 1, 68, 4, 1, C.blue),
            )
            .join(""),
      )
      .join(""),
  "A man is looking at a departure board.":
    room("#EAF2FF", "#D9DDEA") +
    re(30, 8, 100, 46, 3, C.slate) +
    [16, 24, 32, 40]
      .map(
        y =>
          re(36, y, 30, 4, 1, C.yel, 0) +
          re(70, y, 26, 4, 1, C.white, 0) +
          re(100, y, 22, 4, 1, y === 24 ? C.red : C.green, 0),
      )
      .join("") +
    person({ x: 80, fy: 94, view: "b", shirt: C.red, pants: C.blue, hair: K, hl: [72, 76], hr: [88, 76] }),
  "Travelers are waiting in line with their luggage.":
    room("#EAF2FF", "#D9DDEA") +
    re(126, 50, 34, 40, 2, C.blue) +
    re(130, 20, 26, 12, 2, C.white) +
    [42, 74, 106]
      .map(
        (x, i) =>
          suitcase(x - 26, 90, [C.orange, C.purple, C.green][i]) +
          person({
            x,
            fy: 90,
            dir: 1,
            hs: i === 1 ? "long" : "short",
            hair: [K, "#C46F1E", C.dbrown][i],
            shirt: [C.red, C.yel, C.blue][i],
            pants: C.slate,
            hl: [x - 17, 54],
            elL: [x - 12, 66],
          }),
      )
      .join(""),
  "Chairs have been arranged around a long table.":
    room() +
    [12, 40, 68, 96, 124]
      .map(x => re(x, 8, 22, 30, 1, "#F5F5FA") + li(`M${x} 14h22M${x} 20h22M${x} 26h22M${x} 32h22`, C.grey, 1.5))
      .join("") +
    [38, 66, 94, 122].map(x => re(x - 9, 38, 18, 24, 4, C.purple)).join("") +
    desk(18, 124, 58, 90, C.brown) +
    [52, 80, 108]
      .map(
        x =>
          li(`M${x - 7} 78v12M${x + 7} 78v12`, K, 3) +
          re(x - 10, 62, 20, 18, 4, C.purple) +
          re(x - 11, 76, 22, 5, 2, "#7B4DD6"),
      )
      .join(""),
  "Some people are writing on a whiteboard.":
    room() +
    re(28, 10, 104, 50, 2, C.white) +
    re(28, 60, 104, 4, 1, C.grey) +
    li("M38 22c6-4 10 4 16 0s10 4 16 0M38 34h30M84 20l10 12 12-8 10 10M86 44h32", C.blue, 2) +
    li("M40 46h20", C.red, 2) +
    person({
      x: 58,
      fy: 94,
      view: "b",
      shirt: C.green,
      pants: C.slate,
      hair: K,
      hr: [70, 30],
      elR: [68, 46],
      hl: [52, 76],
    }) +
    re(70, 26, 3, 7, 1, C.red) +
    person({
      x: 106,
      fy: 94,
      view: "b",
      hs: "long",
      shirt: C.orange,
      pants: C.blue,
      hair: "#C46F1E",
      hl: [94, 40],
      elL: [94, 54],
      hr: [112, 76],
    }) +
    re(92, 36, 3, 7, 1, C.blue),
  "A man is leaning over a car engine.":
    room("#E6E8F0", "#C9CCDA", 82) +
    pa("M70 60l8-12h70c6 0 10 4 10 10v20H70z", C.red) +
    pa("M80 48l22-30 6 4-20 26z", C.dred) +
    re(82, 44, 26, 6, 1, C.slate) +
    ci(92, 80, 9, C.slate) +
    ci(144, 80, 9, C.slate) +
    re(116, 50, 22, 8, 2, C.sky) +
    person({
      x: 52,
      fy: 92,
      dir: 1,
      lean: 40,
      hat: "cap",
      shirt: C.blue,
      pants: C.slate,
      hr: [66, 54],
      elR: [62, 60],
      hl: [64, 58],
    }),
  "A woman is standing at a counter.":
    room("#FFF3D6", "#E8D7C0") +
    re(100, 10, 56, 4, 1, C.dbrown) +
    re(100, 28, 56, 4, 1, C.dbrown) +
    [104, 116, 128, 140]
      .map((x, i) => re(x, 16 + (i % 2), 9, 12 - (i % 2), 2, [C.red, C.green, C.blue, C.yel][i]))
      .join("") +
    re(84, 54, 76, 36, 2, C.brown) +
    re(120, 42, 22, 12, 2, C.slate) +
    re(123, 44, 10, 5, 1, C.green, 0) +
    person({
      x: 64,
      fy: 90,
      dir: 1,
      hs: "long",
      hair: K,
      shirt: C.purple,
      pants: C.slate,
      skirt: true,
      hr: [86, 54],
      elR: [76, 62],
      hl: [58, 70],
    }) +
    li("M54 60c0-6 8-6 8 0", K, 2) +
    re(51, 60, 14, 12, 3, C.red),
  "A man is sitting in a bus shelter.":
    outside("#DDF0FF", C.lgrey, 84) +
    re(26, 12, 108, 6, 2, C.slate) +
    re(30, 18, 3, 66, 0, C.slate) +
    re(127, 18, 3, 66, 0, C.slate) +
    re(33, 18, 94, 48, 0, "rgba(191,227,255,.55)") +
    re(48, 70, 64, 5, 2, C.brown) +
    li("M54 75v9M106 75v9", K, 2.5) +
    li("M148 84V30", C.grey, 4) +
    ci(148, 24, 7, C.blue) +
    person({ x: 70, fy: 92, pose: "sit", dir: 1, shirt: C.green, pants: C.blue, hl: [78, 70], hr: [82, 70] }),
  "Bicycles are lined up in a row.":
    outside("#DDF0FF", C.lgrey, 80) +
    re(0, 64, 160, 6, 0, C.grey) +
    bike(34, 84, C.blue) +
    bike(68, 84, C.blue) +
    bike(102, 84, C.blue) +
    bike(136, 84, C.blue),
  "She is using a pipette.":
    room("#F2FAFF", "#D9DDEA") +
    desk(58, 98, 62, 90, C.lgrey) +
    re(98, 52, 36, 10, 2, C.white) +
    [102, 110, 118, 126]
      .map((x, i) => re(x, 38, 5, 18, 2.5, C.white) + re(x + 0.5, 48, 4, 7, 2, [C.pink, C.mint, C.sky, C.yel][i], 0))
      .join("") +
    person({
      x: 80,
      fy: 90,
      dir: 1,
      hs: "bun",
      hair: K,
      shirt: C.white,
      pants: C.slate,
      gloves: C.blue,
      hr: [104, 24],
      elR: [94, 40],
      hl: [96, 60],
      elL: [90, 58],
    }) +
    re(102, 10, 5, 12, 2, C.purple) +
    pa("M103 22h3l-1 14h-1z", C.white),
  "A worker is standing on a wooden frame.":
    outside() +
    [30, 55, 80, 105, 130].map(x => re(x - 3, 42, 6, 37, 1, "#D9A06A")).join("") +
    re(22, 40, 116, 6, 1, "#C48A52") +
    re(22, 60, 116, 5, 1, "#C48A52") +
    li("M32 62l20-18M57 44l20 18M82 62l20-18M107 44l20 18", "#C48A52", 3.5) +
    scaled(0.62, 80, 40, person({ x: 80, fy: 40, dir: 1, view: "f", hat: "helmet", shirt: C.orange, pants: C.blue })),
  "Produce is displayed in baskets.":
    re(0, 0, 160, 100, 0, "#FFF3D6", 0) +
    pa(
      "M0 0h160v14c-5 6-15 6-20 0-5 6-15 6-20 0-5 6-15 6-20 0-5 6-15 6-20 0-5 6-15 6-20 0-5 6-15 6-20 0-5 6-15 6-20 0-5 6-15 6-20 0z",
      C.red,
    ) +
    re(0, 62, 160, 38, 0, C.brown) +
    li("M0 62h160", K, 2.5) +
    [28, 80, 132]
      .map((x, i) => {
        const fill =
          i === 0
            ? [-10, -3, 4, 11, -6, 1, 8].map((d, k) => ci(x + d, k < 4 ? 48 : 42, 4, C.red)).join("")
            : i === 1
              ? [-10, -4, 2, 8].map(d => pa(`M${x + d} 52l3-16 3 16z`, C.orange)).join("")
              : [-10, -2, 6].map(d => el(x + d, 44, 6, 9, C.green)).join("");
        return fill + pa(`M${x - 20} 50h40l-4 14h-32z`, "#D9A06A") + li(`M${x - 18} 56h36`, "#9A6438", 2);
      })
      .join(""),
  "Shelves are filled with books.": room("#FFF3D6", "#E8D7C0") + shelf(10, 10, 66, 80, 4) + shelf(84, 10, 66, 80, 4),
  "Two men are shaking hands.":
    room() +
    win(62, 10, 36, 26) +
    person({
      x: 56,
      fy: 90,
      dir: 1,
      shirt: C.slate,
      pants: C.slate,
      tie: C.red,
      hr: [80, 62],
      elR: [68, 64],
      hl: [52, 70],
    }) +
    person({
      x: 104,
      fy: 90,
      dir: -1,
      hair: K,
      shirt: "#2F4FA8",
      pants: C.slate,
      tie: C.yel,
      hl: [80, 62],
      elL: [92, 64],
      hr: [108, 70],
    }),
  "Someone is chopping vegetables.":
    re(0, 0, 160, 100, 0, "#EAF7EF", 0) +
    re(0, 56, 160, 44, 0, C.tan) +
    li("M0 56h160", K, 2.5) +
    re(22, 60, 116, 30, 5, "#F2D3A6") +
    pa("M36 70c10-5 34-6 50-2v9c-16 3-40 2-50-1z", C.orange) +
    li("M36 70l-8-6M36 74l-10-2", C.dgreen, 3) +
    [100, 108, 116].map(x => el(x, 78, 4, 3, C.orange)).join("") +
    `<path d="M160 26L118 46" stroke="${K}" stroke-width="12"/><path d="M160 26L118 46" stroke="${C.blue}" stroke-width="9"/>` +
    pa("M106 52L86 72l4 3 20-18z", C.lgrey) +
    re(104, 44, 14, 7, 3, C.dbrown) +
    ci(114, 46, 5, C.skin) +
    `<path d="M0 44L42 68" stroke="${K}" stroke-width="12"/><path d="M0 44L42 68" stroke="${C.blue}" stroke-width="9"/>` +
    ci(46, 70, 5, C.skin),
  "People are working on laptops.":
    room() +
    [36, 80, 124]
      .map((x, i) =>
        person({
          x,
          fy: 88,
          pose: "stand",
          view: "f",
          hs: i === 1 ? "long" : "short",
          hair: [K, "#C46F1E", C.dbrown][i],
          shirt: [C.green, C.purple, C.orange][i],
          hl: [x - 6, 66],
          hr: [x + 6, 66],
        }),
      )
      .join("") +
    re(6, 62, 148, 28, 2, C.brown) +
    li("M6 68h148", C.dbrown, 2) +
    [36, 80, 124].map(x => re(x - 12, 50, 24, 12, 2, C.grey) + ci(x, 56, 2, C.white, 0)).join(""),
  "A sign is hanging above the platform.":
    re(0, 0, 160, 100, 0, "#E6E8F0", 0) +
    re(0, 0, 160, 8, 0, C.slate) +
    li("M64 8v10M96 8v10", K, 2) +
    re(50, 18, 60, 18, 3, C.dblue) +
    li("M58 27h16M68 22l6 5-6 5", C.white, 2.5) +
    re(84, 22, 18, 10, 2, C.white, 0) +
    re(0, 60, 160, 14, 0, C.lgrey) +
    re(0, 70, 160, 3, 0, C.yel, 0) +
    li("M0 60h160M0 74h160", K, 2) +
    re(0, 74, 160, 26, 0, "#B9B2A6", 0) +
    [6, 22, 38, 54, 70, 86, 102, 118, 134, 150].map(x => re(x, 84, 10, 4, 1, C.dbrown, 0)).join("") +
    li("M0 82h160M0 92h160", C.dgrey, 3),
};
