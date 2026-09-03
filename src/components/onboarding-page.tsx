"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Globe2, Search, Shield, UserRound } from "lucide-react";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { getCommunityProfile, saveCommunityPreferences, searchCatalogClubs, type CatalogClub } from "@/lib/community-service";
import { countries, locales, regionalPreferenceKey, type LocaleId } from "@/lib/i18n";
import { BrandLogo } from "./brand-logo";
import styles from "./onboarding.module.css";

const copy = {
  "pt-br": {
    language: "Seu idioma", club: "Seu time", step: "Etapa", of: "de", welcome: "Vamos começar.",
    intro: "Duas escolhas e você está em campo.", languageHint: "Como prefere continuar?", country: "País da comunidade",
    next: "Escolher meu time", clubTitle: "Onde você joga?", clubHint: "Busque seu time na nossa base. Não precisa cadastrar de novo.",
    search: "Nome ou ID do time", platform: "Plataforma", gen5: "PS5 · Xbox Series · PC", gen4: "PS4 · Xbox One", switch: "Nintendo Switch",
    searching: "Buscando times…", empty: "Nenhum time encontrado. Tente outro nome, ID ou plataforma.", results: "Times encontrados", limit: "Mostrando até 20 times. Digite para refinar.",
    selected: "Time selecionado", choose: "Escolha um time ou a opção abaixo para continuar.", noClub: "Ainda não tenho time", noClubHint: "Posso encontrar um depois no mercado.",
    back: "Voltar", finish: "Entrar na comunidade", saving: "Salvando…", loading: "Preparando sua conta…", retry: "Tentar novamente",
    loadError: "Não foi possível carregar sua conta.", searchError: "Não foi possível buscar os times. Tente novamente.", saveError: "Não foi possível salvar. Suas escolhas foram mantidas; tente novamente.",
    membership: "A seleção identifica seu time no perfil. Não concede administração nem comprova um jogador da EA.",
  },
  es: {
    language: "Tu idioma", club: "Tu equipo", step: "Paso", of: "de", welcome: "Vamos a empezar.",
    intro: "Dos elecciones y estás en la cancha.", languageHint: "¿Cómo prefieres continuar?", country: "País de la comunidad",
    next: "Elegir mi equipo", clubTitle: "¿Dónde juegas?", clubHint: "Busca tu equipo en nuestra base. No necesitas registrarlo otra vez.",
    search: "Nombre o ID del equipo", platform: "Plataforma", gen5: "PS5 · Xbox Series · PC", gen4: "PS4 · Xbox One", switch: "Nintendo Switch",
    searching: "Buscando equipos…", empty: "No encontramos equipos. Prueba otro nombre, ID o plataforma.", results: "Equipos encontrados", limit: "Hasta 20 equipos. Escribe para precisar la búsqueda.",
    selected: "Equipo seleccionado", choose: "Elige un equipo o la opción de abajo para continuar.", noClub: "Aún no tengo equipo", noClubHint: "Puedo encontrar uno después en el mercado.",
    back: "Volver", finish: "Entrar en la comunidad", saving: "Guardando…", loading: "Preparando tu cuenta…", retry: "Reintentar",
    loadError: "No pudimos cargar tu cuenta.", searchError: "No pudimos buscar los equipos. Inténtalo de nuevo.", saveError: "No pudimos guardar. Tus elecciones se conservaron; inténtalo de nuevo.",
    membership: "La selección identifica tu equipo en el perfil. No concede administración ni verifica un jugador de EA.",
  },
  en: {
    language: "Your language", club: "Your team", step: "Step", of: "of", welcome: "Let's get started.",
    intro: "Two choices and you're on the pitch.", languageHint: "How would you like to continue?", country: "Community country",
    next: "Choose my team", clubTitle: "Where do you play?", clubHint: "Find your team in our database. No need to register it again.",
    search: "Team name or ID", platform: "Platform", gen5: "PS5 · Xbox Series · PC", gen4: "PS4 · Xbox One", switch: "Nintendo Switch",
    searching: "Finding teams…", empty: "No teams found. Try another name, ID or platform.", results: "Matching teams", limit: "Showing up to 20 teams. Type to narrow your search.",
    selected: "Selected team", choose: "Choose a team or the option below to continue.", noClub: "I don't have a team yet", noClubHint: "I can find one later in the market.",
    back: "Back", finish: "Join the community", saving: "Saving…", loading: "Preparing your account…", retry: "Try again",
    loadError: "We couldn't load your account.", searchError: "We couldn't find teams. Please try again.", saveError: "We couldn't save. Your choices were kept; please try again.",
    membership: "This identifies your team on your profile. It does not grant administration or verify an EA player.",
  },
} satisfies Record<LocaleId, Record<string, string>>;

export function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [step, setStep] = useState<1 | 2>(1);
  const [locale, setLocale] = useState<LocaleId>("pt-br");
  const [country, setCountry] = useState("brasil");
  const [platform, setPlatform] = useState("common-gen5");
  const [query, setQuery] = useState("");
  const [clubs, setClubs] = useState<CatalogClub[]>([]);
  const [selected, setSelected] = useState<CatalogClub | null>(null);
  const [withoutClub, setWithoutClub] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = useRef<HTMLHeadingElement>(null);
  const t = copy[locale];

  useEffect(() => {
    let active = true;
    const unsubscribe = observeAuth(async (current) => {
      if (!active) return;
      if (!current) { router.replace("/entrar"); return; }
      setUser(current);
      try {
        const profile = await getCommunityProfile();
        if (!active) return;
        if (!profile) throw new Error("PROFILE_REQUIRED");
        setCountry(profile.country || "brasil");
        setLocale(locales.find((item) => item.id === profile.locale)?.id || "pt-br");
        if (profile.clubId) setSelected({ id: profile.clubId, name: profile.clubName || profile.clubId, platform: profile.clubId.startsWith("common-gen4-") ? "common-gen4" : profile.clubId.startsWith("nx-") ? "nx" : "common-gen5" });
        try {
          const draft = JSON.parse(sessionStorage.getItem(`pca-onboarding-${current.uid}`) || "null");
          if (draft) {
            if (countries.some((item) => item.slug === draft.country)) setCountry(draft.country);
            if (locales.some((item) => item.id === draft.locale)) setLocale(draft.locale);
            if (draft.step === 2) setStep(2);
            if (!profile.clubId) {
              if (typeof draft.selected?.id === "string" && typeof draft.selected?.name === "string") setSelected(draft.selected);
              setWithoutClub(draft.withoutClub === true && !draft.selected);
            }
          }
        } catch { /* A corrupt local draft must not block the server profile. */ }
        setLoadFailed(false);
        setReady(true);
      } catch { if (active) setLoadFailed(true); }
    });
    return () => { active = false; unsubscribe(); };
  }, [router, retry]);

  useEffect(() => {
    if (!ready || !user) return;
    sessionStorage.setItem(`pca-onboarding-${user.uid}`, JSON.stringify({ step, country, locale, selected, withoutClub }));
  }, [ready, user, step, country, locale, selected, withoutClub]);

  useEffect(() => {
    if (ready) title.current?.focus();
  }, [step, ready]);

  useEffect(() => {
    if (step !== 2 || !ready) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true); setSearchFailed(false);
      searchCatalogClubs(query, platform, controller.signal)
        .then((items) => { if (!controller.signal.aborted) setClubs(items); })
        .catch(() => { if (!controller.signal.aborted) { setSearchFailed(true); setClubs([]); } })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [step, ready, query, platform, retry]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step === 1) { setStep(2); setError(""); return; }
    if (!selected && !withoutClub) { setError(t.choose); return; }
    setBusy(true); setError("");
    try {
      await saveCommunityPreferences({ country, locale, clubId: selected?.id || null, completeOnboarding: true });
      localStorage.setItem(regionalPreferenceKey, JSON.stringify({ country, locale }));
      if (user) sessionStorage.removeItem(`pca-onboarding-${user.uid}`);
      router.replace("/inicio");
    } catch (cause) { setError(cause instanceof Error && !cause.message.startsWith("API_") ? cause.message : t.saveError); setBusy(false); }
  }

  if (!ready) return <main className={styles.loading}><BrandLogo size={72} /><p role={loadFailed ? "alert" : "status"}>{loadFailed ? t.loadError : t.loading}</p>{loadFailed && <button onClick={() => setRetry((value) => value + 1)}>{t.retry}</button>}</main>;

  return <main className={styles.wizard} lang={locale}>
    <header className={styles.brand}><BrandLogo size={42} /><span>PRO CLUBS AMERICA</span></header>
    <div className={styles.layout}>
      <section className={styles.intro}>
        <span className={styles.eyebrow}>{t.step} {step} {t.of} 2</span>
        <h1 ref={title} tabIndex={-1}>{step === 1 ? t.welcome : t.clubTitle}</h1>
        <p>{step === 1 ? t.intro : t.clubHint}</p>
        <ol className={styles.progress} aria-label={`${t.step} ${step} ${t.of} 2`}>
          <li aria-current={step === 1 ? "step" : undefined} data-active="true"><span>{step === 2 ? <Check size={16} /> : "1"}</span>{t.language}</li>
          <li aria-current={step === 2 ? "step" : undefined} data-active={step === 2}><span>2</span>{t.club}</li>
        </ol>
      </section>
      <form className={styles.card} onSubmit={submit}>
        {step === 1 ? <>
          <fieldset className={styles.choices}><legend><Globe2 size={20} />{t.languageHint}</legend>
            {locales.map((item) => <label className={styles.choice} key={item.id} data-selected={locale === item.id}>
              <input type="radio" name="locale" value={item.id} checked={locale === item.id} onChange={() => setLocale(item.id)} />
              <strong>{item.label}</strong>{locale === item.id && <Check size={18} aria-hidden="true" />}
            </label>)}
          </fieldset>
          <label className={styles.field}>{t.country}<select value={country} onChange={(event) => setCountry(event.target.value)}>{countries.map((item) => <option key={item.code} value={item.slug}>{item.name[locale === "pt-br" ? "pt" : locale]}</option>)}</select></label>
        </> : <>
          <label className={styles.field}>{t.platform}<select value={platform} onChange={(event) => { setPlatform(event.target.value); setClubs([]); }}><option value="common-gen5">{t.gen5}</option><option value="common-gen4">{t.gen4}</option><option value="nx">{t.switch}</option></select></label>
          <label className={styles.field}>{t.search}<span className={styles.search}><Search size={18} /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setClubs([]); }} placeholder={t.search} maxLength={80} autoComplete="off" /></span></label>
          <div className={styles.results} aria-label={t.results} aria-busy={searching}>
            {searching ? <p role="status">{t.searching}</p> : searchFailed ? <div role="alert"><p>{t.searchError}</p><button className={styles.retry} type="button" onClick={() => setRetry((value) => value + 1)}>{t.retry}</button></div> : clubs.length ? clubs.map((club) => <button className={styles.club} type="button" key={club.id} aria-pressed={selected?.id === club.id} onClick={() => { setSelected(club); setWithoutClub(false); setError(""); }}>
              <Shield size={22} /><span><strong>{club.name}</strong><small>ID {club.id} {club.countryCode ? `· ${club.countryCode}` : ""}</small></span>{selected?.id === club.id && <Check size={18} />}
            </button>) : <p role="status">{t.empty}</p>}
          </div>
          <small className={styles.hint}>{t.limit}</small>
          {selected && <div className={styles.selection} role="status"><Check size={18} /><span>{t.selected}<strong>{selected.name}</strong></span></div>}
          <button type="button" className={styles.noClub} aria-pressed={withoutClub} onClick={() => { setSelected(null); setWithoutClub(true); setError(""); }}><UserRound size={22} /><span><strong>{t.noClub}</strong><small>{t.noClubHint}</small></span>{withoutClub && <Check size={18} />}</button>
          <small className={styles.hint}>{t.membership}</small>
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>{step === 2 && <button className={styles.back} type="button" disabled={busy} onClick={() => { setStep(1); setError(""); }}><ArrowLeft size={18} />{t.back}</button>}<button className={styles.primary} type="submit" disabled={busy || (step === 2 && !selected && !withoutClub)}>{busy ? t.saving : step === 1 ? t.next : t.finish}<ArrowRight size={18} /></button></div>
      </form>
    </div>
  </main>;
}
