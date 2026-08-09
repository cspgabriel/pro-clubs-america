import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Uso: npm run import:data -- caminho/para/dados-normalizados.json");
  process.exit(1);
}

const input = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const required = ["club", "source", "players", "matches"];
for (const key of required) {
  if (!(key in input)) throw new Error(`Campo obrigatório ausente: ${key}`);
}

if (String(input.club.id) !== "171630") {
  throw new Error("O arquivo não pertence ao clube 171630.");
}

const matchIds = new Set();
for (const match of input.matches) {
  if (!match.id) throw new Error("Toda partida precisa de um ID único.");
  if (matchIds.has(match.id)) throw new Error(`Partida duplicada: ${match.id}`);
  matchIds.add(match.id);
}

const output = resolve("src/data/club.json");
await writeFile(output, `${JSON.stringify(input, null, 2)}\n`, "utf8");
console.log(`Base atualizada: ${input.players.length} jogadores e ${input.matches.length} partidas.`);
