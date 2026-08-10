import sharp from "sharp";
import fs from "fs";
import path from "path";

const outDir = path.resolve("public/stickers");
fs.mkdirSync(outDir, { recursive: true });

const asset = (id) =>
  path.join(
    process.env.USERPROFILE || "",
    ".cursor/projects/c-Users-sithu-Projects-mi-river/assets",
    `c__Users_sithu_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_${id}.png`
  );

const sheets = [
  {
    src: asset("image-de95977b-6a76-4b02-8e83-84342d84febf"),
    cols: 4,
    rows: 3,
    ids: [
      "ace-hearts",
      "gem-berry",
      "orange-spade",
      "red-heart",
      "green-spade",
      "duo-cherry",
      "ornate-heart",
      "single-cherry",
      "masked-joker",
      "ace-spades",
      "lime-spade",
      "purple-club",
    ],
  },
  {
    src: asset("image-2b9998ac-36be-4fc8-afb7-3f366e763f76"),
    cols: 4,
    rows: 4,
    ids: [
      "golden-777",
      "chip-100",
      "suit-casino",
      "royal-suits",
      "chip-10",
      "lucky-horseshoe",
      "poker-club",
      "lucky-chip",
      "lucky-dice",
      "four-aces",
      "chip-50",
      "vip-crown",
      "suit-cross",
      "chip-25",
      "good-luck",
      "royal-flush",
    ],
  },
];

for (const sheet of sheets) {
  const meta = await sharp(sheet.src).metadata();
  const cw = Math.floor(meta.width / sheet.cols);
  const ch = Math.floor(meta.height / sheet.rows);
  const inset = Math.max(2, Math.floor(Math.min(cw, ch) * 0.03));
  for (let r = 0; r < sheet.rows; r++) {
    for (let c = 0; c < sheet.cols; c++) {
      const id = sheet.ids[r * sheet.cols + c];
      const left = c * cw + inset;
      const top = r * ch + inset;
      const width = cw - inset * 2;
      const height = ch - inset * 2;
      await sharp(sheet.src)
        .extract({ left, top, width, height })
        .resize(256, 256, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(path.join(outDir, `${id}.png`));
      console.log("wrote", id);
    }
  }
}
console.log("done", fs.readdirSync(outDir).length);
