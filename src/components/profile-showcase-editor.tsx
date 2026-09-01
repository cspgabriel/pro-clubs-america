"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Camera, Check, CirclePlay, LoaderCircle, Plus, Save, Trash2, Trophy } from "lucide-react";
import { getProfileShowcase, saveProfileShowcase, uploadShowcasePhoto, type ProfileShowcase } from "@/lib/community-service";

const POSITIONS = ["Goleiro", "Zagueiro", "Ala", "Volante", "Meia", "Ponta", "Atacante"];
const ARCHETYPES = ["Finalizador", "Armador", "Motor", "Maestro", "Caçador", "Guardião", "Construtor", "Infiltrador"];
const emptyShowcase: ProfileShowcase = { overall: null, positions: [], archetypes: [], photoUrls: [], youtubeUrls: [] };

function toggle(values: string[], value: string, maximum: number) {
  return values.includes(value) ? values.filter((item) => item !== value) : values.length < maximum ? [...values, value] : values;
}

export function ProfileShowcaseEditor() {
  const [showcase, setShowcase] = useState<ProfileShowcase>(emptyShowcase);
  const [videoInput, setVideoInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { getProfileShowcase().then(setShowcase).catch(() => setNotice("Não foi possível carregar a vitrine agora.")).finally(() => setLoading(false)); }, []);

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (showcase.photoUrls.length >= 3) { setNotice("Sua vitrine aceita até três fotos."); return; }
    setUploading(true); setNotice("");
    try {
      const uploaded = await uploadShowcasePhoto(file);
      setShowcase((current) => ({ ...current, photoUrls: [...current.photoUrls, uploaded.url] }));
      event.currentTarget.value = "";
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível enviar a foto."); }
    finally { setUploading(false); }
  }

  function addVideo() {
    const url = videoInput.trim();
    if (!url || showcase.youtubeUrls.length >= 5 || showcase.youtubeUrls.includes(url)) return;
    setShowcase((current) => ({ ...current, youtubeUrls: [...current.youtubeUrls, url] }));
    setVideoInput("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setNotice("");
    try { setShowcase(await saveProfileShowcase(showcase)); setNotice("Vitrine publicada no seu perfil."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível salvar sua vitrine."); }
    finally { setSaving(false); }
  }

  return <article className="showcase-editor">
    <header><div><small>VITRINE DO ATLETA</small><h2>Mostre seu boneco e seus melhores lances.</h2><p>Essas informações aparecem no seu perfil público da comunidade.</p></div><Trophy /></header>
    {loading ? <div className="showcase-loading"><LoaderCircle /> Carregando vitrine…</div> : <form onSubmit={save}>
      <div className="showcase-ovr"><label>OVR do seu boneco<input type="number" min="1" max="99" value={showcase.overall ?? ""} onChange={(event) => setShowcase((current) => ({ ...current, overall: event.target.value ? Number(event.target.value) : null }))} placeholder="Ex.: 88" /></label><span>Ovr informado por você</span></div>
      <fieldset><legend>Posições</legend><div className="showcase-chips">{POSITIONS.map((position) => <button type="button" className={showcase.positions.includes(position) ? "active" : ""} onClick={() => setShowcase((current) => ({ ...current, positions: toggle(current.positions, position, 4) }))} key={position}>{showcase.positions.includes(position) && <Check />}{position}</button>)}</div></fieldset>
      <fieldset><legend>Arquétipos</legend><div className="showcase-chips">{ARCHETYPES.map((archetype) => <button type="button" className={showcase.archetypes.includes(archetype) ? "active" : ""} onClick={() => setShowcase((current) => ({ ...current, archetypes: toggle(current.archetypes, archetype, 5) }))} key={archetype}>{showcase.archetypes.includes(archetype) && <Check />}{archetype}</button>)}</div></fieldset>
      <fieldset><legend>Fotos do boneco <span>{showcase.photoUrls.length}/3</span></legend><div className="showcase-photos">{showcase.photoUrls.map((url) => <figure key={url}><img src={url} alt="Avatar do jogador no EA SPORTS FC" /><button type="button" onClick={() => setShowcase((current) => ({ ...current, photoUrls: current.photoUrls.filter((photo) => photo !== url) }))} aria-label="Remover foto"><Trash2 /></button></figure>)}<div className="showcase-upload"><Camera /><label>Enviar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={uploading || showcase.photoUrls.length >= 3} /></label><span>{uploading ? "Enviando…" : "JPG, PNG ou WebP"}</span></div></div></fieldset>
      <fieldset><legend>Melhores momentos do YouTube <span>{showcase.youtubeUrls.length}/5</span></legend><div className="showcase-video-input"><CirclePlay /><input type="url" value={videoInput} onChange={(event) => setVideoInput(event.target.value)} placeholder="Cole o link do YouTube" /><button type="button" onClick={addVideo} disabled={!videoInput.trim() || showcase.youtubeUrls.length >= 5}><Plus /> Adicionar</button></div><div className="showcase-video-list">{showcase.youtubeUrls.map((url) => <span key={url}><CirclePlay /> {url}<button type="button" onClick={() => setShowcase((current) => ({ ...current, youtubeUrls: current.youtubeUrls.filter((video) => video !== url) }))} aria-label="Remover vídeo"><Trash2 /></button></span>)}</div></fieldset>
      <footer><button type="submit" disabled={saving}>{saving ? <LoaderCircle /> : <Save />}{saving ? "Publicando…" : "Publicar minha vitrine"}</button>{notice && <p role="status">{notice}</p>}</footer>
    </form>}
  </article>;
}
