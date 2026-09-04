"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import type { PlayerRanking } from "@/types/domain";
import styles from "./player-share-card.module.css";

const value = (number: number | null | undefined) => number == null ? "—" : number.toLocaleString("pt-BR");

export function PlayerShareCard({ player, clubName }: { player: PlayerRanking; clubName: string }) {
  const [message, setMessage] = useState("");

  async function createCard() {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("CANVAS_UNAVAILABLE");
    const gradient = context.createLinearGradient(0, 0, 1080, 1080);
    gradient.addColorStop(0, "#061329");
    gradient.addColorStop(.58, "#0d3268");
    gradient.addColorStop(1, "#081a38");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1080, 1080);
    context.strokeStyle = "#ffcf48";
    context.lineWidth = 5;
    context.strokeRect(54, 54, 972, 972);
    context.fillStyle = "#ffcf48";
    context.font = "700 28px Outfit, sans-serif";
    context.letterSpacing = "5px";
    context.fillText("PRO CLUBS AMERICA", 96, 126);
    context.letterSpacing = "0px";
    context.fillStyle = "#ffffff";
    context.font = "700 74px Outfit, sans-serif";
    context.fillText(player.name.slice(0, 22), 96, 272);
    context.fillStyle = "#b3c4dc";
    context.font = "500 32px Outfit, sans-serif";
    context.fillText(`${clubName.slice(0, 28)} · ${player.position}`, 96, 326);
    context.fillStyle = "#0a2043";
    context.strokeStyle = "#ffcf48";
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(96, 408, 260, 320, 34);
    context.fill();
    context.stroke();
    context.fillStyle = "#ffcf48";
    context.font = "700 104px Outfit, sans-serif";
    context.textAlign = "center";
    context.fillText(String(player.overallRating ?? player.averageRating ?? "—"), 226, 570);
    context.font = "700 26px Outfit, sans-serif";
    context.fillText(player.overallRating == null && player.averageRating != null ? "NOTA" : "OVR", 226, 622);
    const stats = [["JOGOS", value(player.matches)], ["GOLS", value(player.goals)], ["ASSIST.", value(player.assists)], ["VITÓRIAS", player.winRate == null ? "—" : `${player.winRate}%`]];
    context.textAlign = "left";
    stats.forEach(([label, stat], index) => {
      const x = 430 + index % 2 * 282;
      const y = 470 + Math.floor(index / 2) * 180;
      context.fillStyle = "#90a7c8";
      context.font = "700 22px Outfit, sans-serif";
      context.fillText(label, x, y);
      context.fillStyle = "#ffffff";
      context.font = "700 58px Outfit, sans-serif";
      context.fillText(stat, x, y + 68);
    });
    context.fillStyle = "#ffcf48";
    context.font = "700 30px Outfit, sans-serif";
    context.fillText("proclubsamerica.com", 96, 930);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("IMAGE_UNAVAILABLE")), "image/png"));
    return new File([blob], `pro-clubs-america-${player.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`, { type: "image/png" });
  }

  async function share() {
    setMessage("Gerando card…");
    try {
      const file = await createCard();
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${player.name} no Pro Clubs America`, text: `Confira os números de ${player.name} no Pro Clubs America.` });
        setMessage("Card compartilhado.");
        return;
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Card baixado em PNG.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") setMessage("");
      else setMessage("Não foi possível gerar o card agora.");
    }
  }

  return <section className={styles.panel} aria-label="Card compartilhável do jogador">
    <div className={styles.preview}><span className={styles.rating}><strong>{player.overallRating ?? player.averageRating ?? "—"}</strong><small>{player.overallRating == null && player.averageRating != null ? "NOTA" : "OVR"}</small></span><div className={styles.copy}><small>MEU CARD PRO CLUBS</small><h2>{player.name}</h2><p>{clubName} · {player.position}</p><div className={styles.stats}><span><b>{value(player.matches)}</b>JOGOS</span><span><b>{value(player.goals)}</b>GOLS</span><span><b>{value(player.assists)}</b>ASSIST.</span></div></div></div>
    <div className={styles.actions}><button type="button" onClick={share}><Share2 /> Compartilhar meu card</button><small aria-live="polite">{message || "Imagem quadrada pronta para Instagram, WhatsApp e Discord."}</small></div>
  </section>;
}
