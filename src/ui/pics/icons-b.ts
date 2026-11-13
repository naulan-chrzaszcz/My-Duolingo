// Images de vocabulaire (2/2) : transports, lieux, bureau, argent, santé, nature, animaux, corps, loisirs. Repère 64 × 64.
import { C, K, ci, el, g, li, pa, re, star } from "./kit.js";

const shine = (x: number, y: number, rx = 2.5, ry = 4) => el(x, y, rx, ry, "rgba(255,255,255,.75)", 0);
const wheel = (x: number, y: number, r = 7) => ci(x, y, r, C.slate) + ci(x, y, r * 0.38, C.grey);
const eyes = (x1: number, x2: number, y: number, r = 2.6) =>
  ci(x1, y, r, K, 0) +
  ci(x2, y, r, K, 0) +
  ci(x1 + 0.9, y - 0.9, r * 0.35, C.white, 0) +
  ci(x2 + 0.9, y - 0.9, r * 0.35, C.white, 0);
const win = (x: number, y: number, w = 7, h = 7) => re(x, y, w, h, 1, C.sky);
const carBody = (col: string) =>
  pa("M5 42c0-5 3-8 8-8l8-10c2-2 4-3 7-3h12c3 0 5 1 7 3l8 10c4 0 8 3 8 8v7H5z", col) +
  pa("M23 25h8v9H16z", C.sky) +
  pa("M35 25h6l7 9H35z", C.sky) +
  wheel(18, 49) +
  wheel(46, 49);
const cloudP = (dy = 0, f = C.ice) =>
  pa(`M16 ${46 + dy}c-6 0-10-4-10-9s4-9 10-9c1-8 8-14 16-14 7 0 13 4 15 11 6 0 11 5 11 11s-5 10-11 10z`, f);

export const ICONS_B: Record<string, string> = {
  // ---- transports & voyage ----
  car: carBody(C.red) + re(54, 37, 4, 3, 1, C.yel, 0),
  bus:
    re(5, 12, 54, 38, 6, C.yel) +
    [9, 21, 33].map(x => win(x, 18, 9, 11)).join("") +
    re(46, 18, 9, 26, 1, C.sky) +
    li("M5 36h37", "#E0A800", 2.5) +
    wheel(17, 51, 6) +
    wheel(46, 51, 6),
  taxi:
    re(26, 13, 12, 7, 2, C.white) + carBody(C.yel) + [12, 20, 28, 36, 44].map(x => re(x, 38, 4, 4, 0, K, 0)).join(""),
  train:
    ci(14, 8, 4, C.lgrey) +
    ci(20, 5, 3, C.lgrey) +
    re(12, 12, 9, 13, 1, C.slate) +
    re(7, 24, 32, 22, 5, C.red) +
    re(37, 14, 20, 32, 3, C.dred) +
    re(42, 19, 10, 9, 1, C.sky) +
    li("M2 55h60", K, 2.5) +
    wheel(14, 48, 6) +
    wheel(29, 48, 6) +
    wheel(47, 48, 6),
  subway:
    pa("M3 60V32C3 15 16 5 32 5s29 10 29 27v28z", C.lgrey) +
    re(15, 17, 34, 37, 8, "#3DBE8B") +
    re(20, 23, 24, 14, 3, C.sky) +
    ci(22, 45, 3, C.yel) +
    ci(42, 45, 3, C.yel) +
    li("M12 60l6-6M52 60l-6-6", K, 2.5),
  bike:
    ci(16, 42, 11, "none") +
    ci(48, 42, 11, "none") +
    li("M16 42l10-17h17l5 17M26 25l7 17 10-17M22 20h8M43 25l-2-7h6", C.red, 3) +
    ci(33, 42, 2.5, K, 0),
  plane:
    pa("M32 3c3 0 5 4 5 10v12l21 11v6l-21-5v12l7 4v4l-12-3-12 3v-4l7-4V37l-21 5v-6l21-11V13c0-6 2-10 5-10z", C.ice) +
    li("M32 10v6", C.blue, 2.5),
  boat:
    li("M32 41V5", K, 3) +
    pa("M35 8l18 29H35z", C.white) +
    pa("M29 13v24H14z", C.white) +
    pa("M5 41h54l-8 13H13z", C.red) +
    li("M3 59c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0 8-3 12 0", C.blue, 3),
  motorbike:
    wheel(14, 45, 9) +
    wheel(50, 45, 9) +
    li("M14 45l10-10h16l10 10M48 26l-6 19", K, 3) +
    pa("M20 34h22l6-8h6l-3 9H42l-6 8H24z", C.red) +
    re(22, 28, 14, 6, 3, C.slate) +
    li("M47 26l3-8h7", K, 3),
  ticket:
    pa("M6 17h52v10a5 5 0 0 0 0 10v10H6V37a5 5 0 0 0 0-10z", C.yel) +
    li("M42 19v26", K, 2, ' stroke-dasharray="3 4"') +
    li("M13 25h21M13 32h16M13 39h21", "#B58A00", 2.5) +
    pa("M50 27l2 4 4 .6-3 3 .7 4-3.7-2-3.7 2 .7-4-3-3 4-.6z", C.white, 0),
  suitcase:
    pa("M24 18v-6c0-2 2-4 4-4h8c2 0 4 2 4 4v6", "none") +
    re(11, 18, 42, 37, 6, C.orange) +
    li("M22 18v37M42 18v37", "#C9650A", 3) +
    ci(18, 58, 3, C.slate) +
    ci(46, 58, 3, C.slate),
  passport:
    re(14, 5, 36, 54, 4, "#2F4FA8") +
    ci(32, 25, 9, "none") +
    li("M23 25h18M32 16c-4 5-4 13 0 18M32 16c4 5 4 13 0 18", C.yel, 2) +
    ci(32, 25, 9, "none") +
    re(23, 43, 18, 3, 1, C.yel, 0) +
    li("M14 5v54", "#1E3580", 3),
  map:
    pa("M5 14l17-7 20 7 17-7v43l-17 7-20-7-17 7z", "#E7F5DC") +
    li("M22 7v43M42 14v43") +
    li("M10 42c6-6 12 0 17-8s10-6 15-12 7-4 9-6", C.red, 2.5, ' stroke-dasharray="3 3"') +
    pa("M51 9c-4 0-6 3-6 6 0 4 6 9 6 9s6-5 6-9c0-3-2-6-6-6z", C.red) +
    ci(51, 15, 2, C.white, 0),
  trafficlight:
    re(30, 52, 4, 10, 0, C.grey) +
    re(21, 3, 22, 50, 6, C.slate) +
    ci(32, 14, 6, C.red) +
    ci(32, 28, 6, C.yel) +
    ci(32, 42, 6, C.green),
  busstop:
    re(29, 16, 31, 4, 1, C.grey) +
    re(56, 20, 3, 36, 1, C.grey) +
    re(33, 40, 21, 4, 1, C.brown) +
    li("M36 44v8M51 44v8", K, 2.5) +
    li("M14 60V22", C.grey, 4) +
    ci(14, 15, 10, C.blue) +
    re(9, 10, 10, 8, 2, C.white, 0) +
    ci(11, 19, 1.5, C.white, 0) +
    ci(17, 19, 1.5, C.white, 0) +
    li("M3 60h58"),
  camera:
    re(20, 11, 16, 9, 2, C.slate) +
    re(5, 17, 54, 38, 7, C.slate) +
    ci(32, 36, 13, C.grey) +
    ci(32, 36, 8, C.blue) +
    ci(29, 33, 2.5, C.white, 0) +
    re(46, 22, 8, 5, 1.5, C.yel),
  // ---- lieux ----
  school:
    li("M32 13V3") +
    pa("M32 3h9l-2 3 2 3h-9", C.red) +
    re(9, 26, 46, 31, 1, "#FFD8A8") +
    pa("M5 28L32 12l27 16z", C.red) +
    ci(32, 22, 4, C.white) +
    re(27, 42, 10, 15, 1, C.brown) +
    win(13, 32, 8, 8) +
    win(43, 32, 8, 8) +
    win(13, 45, 8, 8) +
    win(43, 45, 8, 8),
  hospital:
    re(10, 12, 44, 46, 2, C.white) +
    pa("M28 17h8v7h7v8h-7v7h-8v-7h-7v-8h7z", C.red) +
    win(15, 44, 7, 7) +
    win(42, 44, 7, 7) +
    re(26, 46, 12, 12, 1, C.sky) +
    li("M32 46v12", K, 1.5),
  pharmacy:
    re(8, 24, 48, 33, 2, C.white) +
    pa("M6 23h52l-4 8H10z", C.green) +
    re(23, 2, 18, 18, 3, C.green) +
    re(29.5, 5, 5, 12, 0, C.white, 0) +
    re(26, 8.5, 12, 5, 0, C.white, 0) +
    re(12, 36, 18, 13, 1, C.sky) +
    re(36, 36, 14, 21, 1, C.sky),
  bank:
    pa("M5 23L32 8l27 15z", C.lgrey) +
    ci(32, 17, 3.5, C.yel) +
    re(7, 23, 50, 5, 1, C.lgrey) +
    [11, 23, 35, 47].map(x => re(x, 28, 6, 23, 0, C.white)).join("") +
    re(5, 51, 54, 7, 1, C.lgrey),
  shop:
    re(8, 25, 48, 32, 2, C.cream) +
    pa(
      "M6 13h52v11c0 4-3 6-6.5 6S45 28 45 24c0 4-3 6-6.5 6S32 28 32 24c0 4-3 6-6.5 6S19 28 19 24c0 4-3 6-6.5 6S6 28 6 24z",
      C.red,
    ) +
    li("M19 13v11M32 13v11M45 13v11", C.white, 3) +
    re(12, 35, 20, 14, 1, C.sky) +
    re(37, 35, 14, 22, 1, C.brown),
  postoffice:
    re(9, 24, 46, 33, 2, "#FFE7B8") +
    re(7, 17, 50, 8, 2, C.red) +
    re(21, 29, 22, 15, 1, C.white) +
    li("M21 30l11 8 11-8", K, 2) +
    re(27, 47, 10, 10, 1, C.brown),
  restaurant:
    re(8, 22, 48, 35, 2, C.cream) +
    re(6, 15, 52, 8, 2, C.purple) +
    ci(32, 36, 10, C.white) +
    li("M28 30v12M26 30v4c0 2 4 2 4 0v-4M36 30c-2 0-2 6 0 7v5", K, 1.6) +
    re(12, 47, 10, 10, 1, C.sky) +
    re(42, 47, 10, 10, 1, C.sky),
  hotel:
    star(20, 7, 4.5, 2, C.yel) +
    star(32, 5, 5, 2.2, C.yel) +
    star(44, 7, 4.5, 2, C.yel) +
    re(13, 14, 38, 44, 2, "#9CC9FF") +
    [19, 29, 39].flatMap(x => [20, 30, 40].map(y => re(x, y, 6, 6, 1, C.white))).join("") +
    re(27, 48, 10, 10, 1, C.brown),
  convstore:
    re(8, 24, 48, 33, 2, C.white) +
    re(6, 14, 52, 11, 2, "#3DBE8B") +
    re(6, 20, 52, 4, 0, C.orange, 0) +
    `<text x="32" y="21" text-anchor="middle" font-size="9" font-weight="900" fill="${C.white}" stroke="none" font-family="Nunito,system-ui,sans-serif">24</text>` +
    re(12, 33, 22, 14, 1, C.sky) +
    re(38, 33, 13, 24, 1, C.sky) +
    li("M44.5 33v24", K, 1.5),
  park:
    pa("M3 50h58v9H3z", C.green) +
    re(17, 32, 5, 19, 1, C.brown) +
    pa("M8 32c-4-1-6-5-4-9 1-2 4-3 6-3 0-6 5-11 11-10 5 0 9 4 9 9 3 0 6 3 5 7-1 4-4 6-8 6z", C.dgreen) +
    re(34, 38, 24, 4, 1, C.brown) +
    re(34, 32, 24, 4, 1, C.brown) +
    li("M37 42v8M55 42v8", K, 2.5),
  building:
    re(14, 5, 36, 53, 2, "#D9DDEA") +
    [19, 29, 39].flatMap(x => [10, 19, 28, 37].map(y => re(x, y, 6, 6, 1, C.sky))).join("") +
    re(27, 47, 10, 11, 1, C.slate),
  // ---- bureau & école ----
  phone:
    re(18, 3, 28, 58, 6, C.slate) +
    re(21, 9, 22, 43, 2, "#7FC4FF") +
    ci(32, 56.5, 2, C.white, 0) +
    li("M25 15l7-3M25 21l4-2", C.white, 2),
  laptop:
    re(11, 11, 42, 30, 3, C.slate) +
    re(15, 15, 34, 22, 1, "#7FC4FF") +
    pa("M5 42h54l-4 9H9z", C.grey) +
    li("M27 46h10", K, 2),
  computer:
    re(7, 6, 50, 34, 3, C.slate) +
    re(11, 10, 42, 26, 1, "#7FC4FF") +
    re(28, 40, 8, 7, 0, C.grey) +
    re(19, 46, 26, 4, 2, C.grey) +
    re(9, 53, 46, 7, 2, C.lgrey),
  charger:
    re(25, 13, 4, 11, 1, C.grey) +
    re(35, 13, 4, 11, 1, C.grey) +
    li("M32 47c0 8-9 7-9 14", K, 3) +
    re(19, 23, 26, 24, 5, C.white) +
    pa("M34 27l-7 10h5l-2 7 7-10h-5z", C.yel),
  headphones:
    pa("M7 40C7 22 18 9 32 9s25 13 25 31h-6c0-14-8-25-19-25S13 26 13 40z", C.purple) +
    re(5, 34, 13, 22, 6, C.purple) +
    re(46, 34, 13, 22, 6, C.purple) +
    re(9, 38, 6, 14, 3, "#7B4DD6", 0) +
    re(49, 38, 6, 14, 3, "#7B4DD6", 0),
  book:
    pa("M17 50h33v8H19c-3 0-3-8-2-8z", C.white) +
    re(14, 5, 36, 47, 3, C.red) +
    re(14, 5, 7, 47, 2, C.dred) +
    re(27, 15, 16, 5, 1, C.white),
  notebook:
    re(14, 5, 38, 54, 3, C.white) +
    li("M22 17h24M22 25h24M22 33h24M22 41h24M22 49h16", C.blue, 1.8) +
    li("M26 5v54", C.red, 1.8) +
    [12, 22, 32, 42, 52].map(y => ci(14, y, 3, C.slate)).join(""),
  pen: g(
    "rotate(40 32 32)",
    re(28, 3, 8, 44, 3, C.blue) + pa("M28 47h8l-4 12z", C.lgrey) + re(36, 7, 3, 17, 1, C.grey) + ci(32, 58, 1.2, K, 0),
  ),
  pencil: g(
    "rotate(40 32 32)",
    re(28, 3, 8, 7, 2, C.pink) +
      re(28, 9, 8, 4, 0, C.grey) +
      re(28, 13, 8, 34, 0, C.yel) +
      pa("M28 47h8l-4 12z", "#F5D9A8") +
      pa("M30.6 54h2.8l-1.4 5z", K, 0) +
      li("M32 13v34", C.gold, 1.5),
  ),
  scissors:
    pa("M25 40L43 6l3 2-17 34z", C.lgrey) +
    pa("M39 40L21 6l-3 2 17 34z", C.lgrey) +
    ci(22, 48, 8, C.red) +
    ci(42, 48, 8, C.red) +
    ci(22, 48, 3.5, C.white) +
    ci(42, 48, 3.5, C.white) +
    ci(32, 32, 2, K, 0),
  letter:
    re(7, 15, 50, 34, 3, C.white) +
    li("M7 17l25 18 25-18") +
    li("M7 47l18-14M57 47L39 33") +
    re(45, 19, 8, 9, 1, C.red, 0),
  calendar:
    re(9, 11, 46, 46, 4, C.white) +
    pa("M9 24V15c0-2 2-4 4-4h38c2 0 4 2 4 4v9z", C.red) +
    re(18, 5, 5, 11, 2.5, C.grey) +
    re(41, 5, 5, 11, 2.5, C.grey) +
    [16, 27, 38]
      .flatMap(y => [15, 24, 33, 42].map(x => re(x, y + 13, 6, 5, 1, x === 33 && y === 27 ? C.red : C.lgrey, 0)))
      .join(""),
  newspaper:
    re(10, 8, 44, 48, 2, C.white) +
    re(14, 13, 36, 6, 1, K, 0) +
    re(14, 24, 16, 13, 1, C.grey) +
    li("M34 25h16M34 30h16M34 35h12M14 43h36M14 49h28", C.dgrey, 2),
  printer:
    re(18, 6, 28, 19, 1, C.white) +
    re(7, 23, 50, 24, 5, C.grey) +
    ci(48, 30, 2, C.green, 0) +
    re(14, 39, 36, 3, 1, C.slate) +
    re(18, 40, 28, 19, 1, C.white) +
    li("M22 46h20M22 51h14", C.dgrey, 2),
  backpack:
    pa("M25 14c0-7 14-7 14 0", "none") +
    li("M25 14c0-7 14-7 14 0", K, 3) +
    re(13, 13, 38, 46, 11, C.green) +
    re(19, 36, 26, 17, 5, C.dgreen) +
    li("M25 43h14", C.white, 2) +
    li("M22 20v12M42 20v12", "#3DAA5C", 2.5),
  box:
    pa("M9 26l12-11h34L44 26z", "#E8B57C") +
    pa("M44 26l11-11v31L44 57z", "#C48A52") +
    re(9, 26, 35, 31, 1, "#D9A06A") +
    pa("M21 26l12-11h7L28 26z", "#F2D3A6", 0) +
    re(21, 26, 7, 12, 0, "#F2D3A6", 0) +
    li("M9 26h35"),
  gift:
    re(10, 28, 44, 29, 2, C.red) +
    re(7, 21, 50, 9, 2, C.red) +
    re(28, 21, 8, 36, 0, C.yel) +
    pa("M32 21c-8-13-19-9-13-2 3 3 8 2 13 2zM32 21c8-13 19-9 13-2-3 3-8 2-13 2z", C.yel),
  // ---- argent ----
  wallet:
    re(12, 10, 30, 12, 1, C.mint) +
    re(7, 17, 50, 37, 6, C.brown) +
    pa("M32 26h25v17H32c-4 0-7-4-7-8.5s3-8.5 7-8.5z", "#9A5E36") +
    ci(36, 34.5, 3, C.yel),
  money:
    re(5, 23, 46, 26, 3, "#8FD6A0") +
    re(12, 15, 46, 26, 3, "#B4EBC0") +
    ci(35, 28, 7, "none") +
    ci(35, 28, 3, C.dgreen, 0) +
    ci(17, 20, 1.6, C.dgreen, 0) +
    ci(53, 36, 1.6, C.dgreen, 0),
  coin: ci(32, 32, 23, C.yel) + ci(32, 32, 17, "#FFE27A") + star(32, 32, 10, 4.5, C.gold, 0) + shine(22, 22, 2.5, 4),
  card:
    re(5, 13, 54, 38, 6, C.blue) +
    re(13, 22, 11, 9, 2, C.yel) +
    li("M13 26h11M18.5 22v9", C.gold, 1.2) +
    re(13, 38, 32, 3.5, 1.5, C.white, 0) +
    ci(46, 22, 4, C.orange, 0) +
    ci(50, 22, 4, C.red, 0),
  receipt:
    pa("M14 5h36v53l-4.5-3-4.5 3-4.5-3-4.5 3-4.5-3-4.5 3-4.5-3-4.5 3z", C.white) +
    li("M20 14h24M20 21h18M20 28h22M20 35h16", C.dgrey, 2) +
    li("M20 45h24", K, 3),
  // ---- santé ----
  medicine:
    g(
      "rotate(-40 26 28)",
      pa("M8 28a8 8 0 0 1 8-8h11v16H16a8 8 0 0 1-8-8z", C.red) +
        pa("M27 20h11a8 8 0 0 1 0 16H27z", C.white) +
        el(15, 25, 3, 1.5, "rgba(255,255,255,.7)", 0),
    ) +
    ci(47, 47, 9, C.blue) +
    li("M41 47h12", C.white, 2),
  thermometer: g(
    "rotate(-40 32 32)",
    re(27, 3, 10, 43, 5, C.white) +
      re(30, 18, 4, 30, 2, C.red, 0) +
      ci(32, 50, 8, C.red) +
      li("M37 12h-3M37 20h-3M37 28h-3M37 36h-3", K, 1.5),
  ),
  bandage: g(
    "rotate(-40 32 32)",
    re(4, 23, 56, 18, 9, "#F5C9A0") +
      re(22, 23, 20, 18, 1, "#FFE7D2") +
      [9, 13, 51, 55].flatMap(x => [28, 36].map(y => ci(x, y, 1, "#C98B5E", 0))).join(""),
  ),
  tooth:
    pa(
      "M17 12c6-5 10-1 15-1s9-4 15 1c6 6 5 15 2 22-3 6-2 24-7 24-4 0-4-14-10-14s-6 14-10 14c-5 0-4-18-7-24-3-7-4-16 2-22z",
      C.white,
    ) + li("M21 17c-2 2-3 5-2 9", C.sky, 2.5),
  ambulance:
    pa("M4 20h35v9h10l11 12v12H4z", C.white) +
    re(4, 36, 56, 5, 0, C.red, 0) +
    pa("M17 24h6v4h4v6h-4v4h-6v-4h-4v-6h4z", C.red, 0) +
    pa("M41 32h6l7 8H41z", C.sky) +
    re(16, 14, 8, 6, 2, C.blue) +
    pa("M4 20h35v9h10l11 12v12H4z", "none") +
    wheel(16, 53, 6) +
    wheel(48, 53, 6),
  mask:
    li("M14 26c-9 0-9 12 0 12M50 26c9 0 9 12 0 12", K, 2) +
    pa("M14 22c6-4 30-4 36 0v15c0 9-10 13-18 13s-18-4-18-13z", C.sky) +
    li("M18 30h28M18 37h28M20 44h24", "#8CC8FF", 2),
  // ---- nature & météo ----
  sun:
    li("M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M12 52l6-6M46 18l6-6", C.orange, 4) +
    ci(32, 32, 14, C.yel) +
    shine(26, 27, 2.5, 3.5),
  moon:
    pa("M38 7a25 25 0 1 0 19 35A20 20 0 0 1 38 7z", C.yel) + star(48, 14, 4.5, 2, C.yel) + ci(53, 26, 1.5, C.yel, 0),
  star: star(32, 33, 28, 12, C.yel) + shine(27, 25, 2, 3),
  cloud: cloudP(2),
  rain: cloudP(-8, C.lgrey) + li("M18 46l-3 7M30 46l-3 7M42 46l-3 7M24 55l-2 5M36 55l-2 5", C.blue, 3),
  snow: li(
    "M32 6v52M9.5 19l45 26M9.5 45l45-26M26 9l6 6 6-6M26 55l6-6 6 6M9 26l8 2-2 8M55 38l-8-2 2-8M15 46l2-8-8-2M49 18l-2 8 8 2",
    "#4DA3FF",
    3.5,
  ),
  rainbow:
    li("M6 52a26 26 0 0 1 52 0", C.red, 5) +
    li("M11 52a21 21 0 0 1 42 0", C.orange, 5) +
    li("M16 52a16 16 0 0 1 32 0", C.yel, 5) +
    li("M21 52a11 11 0 0 1 22 0", C.green, 5) +
    el(9, 53, 8, 5, C.white) +
    el(55, 53, 8, 5, C.white),
  tree:
    re(28, 38, 8, 21, 2, C.brown) +
    pa("M17 42c-8 0-12-6-10-12 1-5 6-8 10-7 0-9 7-16 15-16s15 7 15 16c4-1 9 2 10 7 2 6-2 12-10 12z", C.green) +
    li("M16 30c1-3 3-4 5-4", C.mint, 2.5),
  flower:
    li("M32 34v25", C.dgreen, 3.5) +
    pa("M32 50c-8 0-12-6-12-10 6 0 12 4 12 10z", C.green) +
    [0, 72, 144, 216, 288]
      .map(a => {
        const r = (a * Math.PI) / 180;
        return ci(32 + 10 * Math.sin(r), 22 - 10 * Math.cos(r), 8, C.pink);
      })
      .join("") +
    ci(32, 22, 6, C.yel),
  leaf:
    pa("M9 55C9 25 29 8 56 8c0 27-17 47-47 47z", C.green) +
    li("M9 55L47 17M24 40l-2-12M32 32l11 2M39 25l-2-9", C.dgreen, 2),
  mountain:
    pa("M3 56L23 17l10 17 7-10 21 32z", "#8FA3C8") +
    pa("M23 17l-7 13 4 2 3-3 3 3 5-3z", C.white) +
    pa("M40 24l-5 8 3 1 2-2 3 2 1-2z", C.white),
  sea:
    ci(46, 15, 7, C.yel) +
    pa("M3 30c6-6 10-6 15 0s10 6 14 0 10-6 15 0 10 6 14 0v29H3z", C.blue) +
    pa("M3 43c6-6 10-6 15 0s10 6 14 0 10-6 15 0 10 6 14 0v16H3z", C.dblue),
  fire:
    pa("M32 3c4 11 17 17 17 33 0 11-8 20-17 20s-17-9-17-20c0-8 4-13 9-17 0 6 2 10 5 11-1-11 1-19 3-27z", C.orange) +
    pa("M32 30c2 6 9 9 9 17 0 5-4 9-9 9s-9-4-9-9c0-6 5-9 6-12 1 4 2 5 3 5z", C.yel),
  // ---- animaux ----
  cat:
    pa("M14 32l1-21 15 10zM50 32l-1-21-15 10z", "#F2A65A") +
    ci(32, 37, 19, "#F2A65A") +
    pa("M18 16l1 8 5-4zM46 16l-1 8-5-4z", C.pink, 0) +
    eyes(25, 39, 35) +
    pa("M30 41h4l-2 3z", C.pink) +
    li("M32 44c-1 3-4 4-6 2M32 44c1 3 4 4 6 2", K, 1.8) +
    li("M18 41l-10-2M18 45l-10 1M46 41l10-2M46 45l10 1", K, 1.5) +
    li("M26 22l2 5M32 20v6M38 22l-2 5", "#C46F1E", 2.5),
  dog:
    el(32, 34, 17, 18, "#E8C39E") +
    pa("M17 21c-9 1-11 15-7 22 4 2 9-2 10-9z", C.brown) +
    pa("M47 21c9 1 11 15 7 22-4 2-9-2-10-9z", C.brown) +
    eyes(25, 39, 31) +
    el(32, 43, 9, 7, C.white) +
    el(32, 39, 4.5, 3, K, 0) +
    li("M32 42v4M28 47c2 2 6 2 8 0", K, 1.8),
  bird:
    pa("M13 37l-9-6 2 12z", C.blue) +
    el(29, 38, 17, 14, C.blue) +
    li("M24 52v7M32 52v7", C.orange, 2.5) +
    ci(41, 24, 10, C.blue) +
    pa("M50 23l9 2-9 4z", C.orange) +
    eyes(43, 43, 22, 2) +
    pa("M19 34c6-3 14-1 17 7-8 4-15 3-17-7z", C.dblue),
  fish:
    pa("M47 32l12-12v24z", C.orange) +
    pa("M7 32c8-13 31-15 42 0-11 15-34 13-42 0z", C.orange) +
    ci(18, 30, 2.8, K, 0) +
    li("M28 24c3 5 3 11 0 16M35 24c3 5 3 11 0 16", "#D97B0F", 2) +
    pa("M28 42l6 8 4-8z", C.yel),
  tiger:
    ci(15, 17, 7, C.orange) +
    ci(49, 17, 7, C.orange) +
    ci(32, 35, 21, C.orange) +
    pa("M26 14l3 9 3-9zM32 14l3 9 3-9M12 32l9 2-9 3zM52 32l-9 2 9 3z", K, 0) +
    el(32, 44, 11, 8, C.white) +
    eyes(24, 40, 32) +
    pa("M29 39h6l-3 4z", K, 0) +
    li("M32 43v3M28 48c2 1 6 1 8 0", K, 1.8),
  rabbit:
    el(24, 15, 5.5, 14, C.white) +
    el(40, 15, 5.5, 14, C.white) +
    el(24, 16, 2.5, 9, C.pink, 0) +
    el(40, 16, 2.5, 9, C.pink, 0) +
    ci(32, 40, 17, C.white) +
    eyes(26, 38, 38) +
    pa("M30 44h4l-2 2.5z", C.pink) +
    li("M32 46.5v3M18 44l-9-1M18 47l-9 2M46 44l9-1M46 47l9 2", K, 1.5),
  horse:
    pa("M19 59V39c0-15 8-27 21-30l4-6 3 7c6 4 10 13 10 21 0 4-3 7-7 7-4 0-6-3-8-7l-5 3v25z", "#B9774A") +
    pa("M40 9c-9 3-15 11-17 22l-4 8c3-15 9-25 21-30z", C.dbrown) +
    pa("M41 9c-4 5-10 7-14 16 1-9 7-14 14-16z", C.dbrown) +
    ci(45, 22, 2.2, K, 0) +
    ci(52, 34, 1.4, K, 0),
  cow:
    pa("M19 22c-6-2-9-8-7-13 3 4 7 6 11 6zM45 22c6-2 9-8 7-13-3 4-7 6-11 6z", "#F5E6C8") +
    el(11, 30, 7, 4, C.white) +
    el(53, 30, 7, 4, C.white) +
    el(32, 34, 17, 19, C.white) +
    pa("M20 26c3-5 8-6 9-2s-3 7-9 6z", K, 0) +
    eyes(25, 39, 33) +
    el(32, 47, 13, 9, C.pink) +
    el(27, 47, 2, 3, K, 0) +
    el(37, 47, 2, 3, K, 0),
  pig:
    pa("M14 26l2-15 11 8zM50 26l-2-15-11 8z", C.pink) +
    ci(32, 35, 21, C.pink) +
    eyes(23, 41, 30) +
    el(32, 41, 10, 7, "#FF6F9E") +
    el(28.5, 41, 2, 3, K, 0) +
    el(35.5, 41, 2, 3, K, 0),
  hen:
    li("M27 54v7M35 54v7", C.orange, 2.5) +
    pa("M12 36c-6-4-8-12-4-16 4 4 8 6 10 8z", C.white) +
    el(31, 41, 18, 15, C.white) +
    pa("M38 14c-1-4 3-6 5-3 1-4 6-3 5 1 3-1 5 3 2 5z", C.red) +
    ci(43, 23, 9, C.white) +
    pa("M51 23l8 2-8 3z", C.orange) +
    pa("M47 29c2 4 1 7-2 7-1-3 0-5 2-7z", C.red) +
    ci(44, 21, 2, K, 0) +
    li("M21 40c4 4 10 4 14 0", C.grey, 2.5),
  mouse:
    li("M12 44c-8 0-9-10-4-12", K, 2.5) +
    el(31, 42, 20, 13, C.grey) +
    ci(38, 26, 8, C.grey) +
    ci(38, 26, 4.5, C.pink, 0) +
    pa("M44 37c6 0 12 3 14 6-2 3-8 4-14 3z", C.grey) +
    ci(57, 43, 2, C.pink, 0) +
    ci(46, 39, 2, K, 0),
  bear:
    ci(16, 18, 8, C.brown) +
    ci(48, 18, 8, C.brown) +
    ci(16, 18, 3.5, C.dbrown, 0) +
    ci(48, 18, 3.5, C.dbrown, 0) +
    ci(32, 36, 20, C.brown) +
    eyes(24, 40, 32) +
    el(32, 43, 10, 8, "#F2D2A8") +
    el(32, 40, 4, 2.6, K, 0) +
    li("M32 42v3M28 47c2 1 6 1 8 0", K, 1.8),
  duck:
    pa("M3 50c8 6 50 6 58 0", "none") +
    li("M3 54c8 4 50 4 58 0", C.blue, 3) +
    pa("M9 38c0 10 9 15 22 15s21-6 21-14c0-6-5-8-10-7l-8 1c-6-5-14-6-25 5z", C.yel) +
    ci(41, 22, 10, C.yel) +
    pa("M49 23c4-1 9 0 10 2-2 3-7 4-11 3z", C.orange) +
    ci(43, 19, 2, K, 0) +
    pa("M19 38c6-2 13 0 15 6-7 3-13 2-15-6z", C.gold),
  butterfly:
    ci(20, 22, 12, C.purple) +
    ci(44, 22, 12, C.purple) +
    ci(22, 42, 9, C.pink) +
    ci(42, 42, 9, C.pink) +
    ci(18, 21, 4, C.lilac, 0) +
    ci(46, 21, 4, C.lilac, 0) +
    re(29.5, 14, 5, 36, 2.5, C.slate) +
    li("M31 14c-2-5-5-8-8-9M33 14c2-5 5-8 8-9", K, 2),
  // ---- corps ----
  hand: pa(
    "M18 60c-5-4-11-12-14-19-1-3 2-6 5-4l7 8V17c0-4 7-4 7 0v13V10c0-4 7-4 7 0v20V12c0-4 7-4 7 0v18V18c0-4 7-4 7 0v24c0 10-5 16-11 18z",
    C.skin,
  ),
  eye:
    pa("M3 32c8-12 20-17 29-17s21 5 29 17c-8 12-20 17-29 17S11 44 3 32z", C.white) +
    ci(32, 32, 11, C.blue) +
    ci(32, 32, 5, K, 0) +
    ci(35.5, 28.5, 2.2, C.white, 0) +
    li("M14 20l-3-4M24 15l-1-5M40 15l1-5M50 20l3-4", K, 2.5),
  ear:
    pa(
      "M20 24c0-12 10-19 20-17 10 2 15 12 12 23-2 8-8 10-10 16-2 8-6 13-12 13-6 0-10-4-10-10 0-4 4-7 4-11 0-6-4-6-4-14z",
      C.skin,
    ) + li("M29 25c1-7 10-8 13-2s-3 10-6 13c-2 2-3 5-6 5", "#E09A6E", 2.5),
  nose:
    pa("M28 7c0 15-13 24-13 35 0 8 8 13 17 13s17-5 17-13c0-11-13-20-13-35z", C.skin) +
    el(25, 46, 3.5, 2.2, "#9A5E36", 0) +
    el(39, 46, 3.5, 2.2, "#9A5E36", 0),
  mouth:
    pa("M5 32c6-9 14-13 21-9 2 1 4 2 6 2s4-1 6-2c7-4 15 0 21 9-8 11-18 15-27 15S13 43 5 32z", C.red) +
    li("M5 32c10 4 18 5 27 5s17-1 27-5", K, 2.5) +
    pa("M16 35c10 3 22 3 32 0l-2 4c-9 2-19 2-28 0z", C.white),
  foot:
    pa("M20 30c0-6 5-9 12-9s12 3 12 10-3 17-3 22c0 5-4 8-9 8s-9-3-9-8c0-5-3-15-3-23z", C.skin) +
    ci(22, 14, 4.5, C.skin) +
    ci(30, 11, 3.8, C.skin) +
    ci(37, 12, 3.4, C.skin) +
    ci(42.5, 15, 3, C.skin) +
    ci(46, 20, 2.6, C.skin),
  // ---- loisirs ----
  ball:
    ci(32, 32, 25, C.white) +
    pa("M32 23l9 6.5-3.4 10.6H26.4L23 29.5z", K) +
    li("M32 23V9M41 29.5l12-5M37.6 40.1l8 10M26.4 40.1l-8 10M23 29.5l-12-5"),
  guitar: g(
    "rotate(35 32 32)",
    re(30, 3, 4, 27, 1, C.dbrown) +
      re(28, 1, 8, 7, 2, C.slate) +
      pa(
        "M32 26c6 0 10 4 9 9-1 3-2 4 0 6 4 3 6 6 6 10 0 7-7 11-15 11s-15-4-15-11c0-4 2-7 6-10 2-2 1-3 0-6-1-5 3-9 9-9z",
        C.orange,
      ) +
      ci(32, 45, 4.5, K, 0) +
      re(26, 53, 12, 3, 1, C.dbrown) +
      li("M31 8v46M33 8v46", C.white, 0.8),
  ),
  piano:
    re(4, 16, 56, 34, 3, C.white) +
    li("M12 16v34M20 16v34M28 16v34M36 16v34M44 16v34M52 16v34", K, 1.8) +
    [10, 18, 34, 42, 50].map(x => re(x, 16, 5, 20, 1, K, 0)).join("") +
    li("M4 22h56", K, 2),
  tent: pa("M5 55L32 10l27 45z", C.orange) + pa("M32 24l-9 31h18z", "#8A4A1A") + li("M32 10V5M2 56h60", K, 2.5),
  drum:
    li("M14 6l20 24M50 6L30 30", C.tan, 3.5) +
    pa("M12 26v22c0 4 9 8 20 8s20-4 20-8V26z", C.red) +
    li("M12 30l8 20 8-20 8 20 8-20 8 18", C.white, 2) +
    el(32, 26, 20, 6, "#F5E6C8"),
};
