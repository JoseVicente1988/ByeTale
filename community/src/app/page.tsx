"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type StreamStatus = "checking" | "live" | "offline";

type TwitchPlayerInstance = {
  addEventListener: (event: string, callback: () => void) => void;
};

type TwitchPlayerConstructor = {
  new (
    elementId: string,
    options: {
      width: string;
      height: string;
      channel: string;
      parent: string[];
      autoplay: boolean;
      muted: boolean;
    },
  ): TwitchPlayerInstance;
  ONLINE: string;
  OFFLINE: string;
  PLAYING: string;
};

declare global {
  interface Window {
    Twitch?: { Player: TwitchPlayerConstructor };
  }
}

const TWITCH_CHANNEL = "thespaguetticode";
const TWITCH_URL = `https://www.twitch.tv/${TWITCH_CHANNEL}`;

const roadmap = [
  {
    title: "Exploración y mapas 2D",
    state: "Ahora",
    meta: "Mundo",
    detail:
      "Plaza, Campiña de Valdoria, Bosque de los Susurros, Camino Viejo, Puente del Este, Ruinas Antiguas y Fortaleza Goblin ya forman parte del proyecto actual.",
  },
  {
    title: "Combate por carga",
    state: "Build V34.3.12",
    meta: "Combate",
    detail:
      "La base actual usa carga manual y heartbeat para que los enemigos mantengan su propio ritmo de acción.",
  },
  {
    title: "Sistemas RPG online",
    state: "En marcha",
    meta: "Gameplay",
    detail:
      "Quests, diálogos, party, profesiones, tiempo del mundo, eventos, inventario, equipo y habilidades siguen creciendo junto al resto del juego.",
  },
];

const participation = [
  {
    index: "01",
    title: "Ideas",
    copy: "Propuestas de sistemas, contenido y mejoras para el ByeTale 2D actual.",
  },
  {
    index: "02",
    title: "Voces y casting",
    copy: "Convocatorias, audiciones y feedback para personajes, NPCs y diálogos.",
  },
  {
    index: "03",
    title: "Bugs y testing",
    copy: "Problemas de mapas, combate, quests, party o interfaz, con seguimiento en hilo.",
  },
  {
    index: "04",
    title: "Arte y lore",
    copy: "Pixel art, UI, textos, localización y aportaciones creativas que encajen con ByeTale.",
  },
];

export default function HomePage() {
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    const mountPlayer = () => {
      if (cancelled || !window.Twitch?.Player) return;
      const host = document.getElementById("byetale-twitch-player");
      if (!host) return;
      host.innerHTML = "";

      const TwitchPlayer = window.Twitch.Player;
      const player = new TwitchPlayer("byetale-twitch-player", {
        width: "100%",
        height: "100%",
        channel: TWITCH_CHANNEL,
        parent: [window.location.hostname],
        autoplay: false,
        muted: true,
      });

      player.addEventListener(TwitchPlayer.ONLINE, () => setStreamStatus("live"));
      player.addEventListener(TwitchPlayer.PLAYING, () => setStreamStatus("live"));
      player.addEventListener(TwitchPlayer.OFFLINE, () => setStreamStatus("offline"));
    };

    const existingScript = document.getElementById("twitch-player-api") as HTMLScriptElement | null;
    if (existingScript) {
      if (window.Twitch?.Player) mountPlayer();
      else existingScript.addEventListener("load", mountPlayer, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = "twitch-player-api";
      script.src = "https://player.twitch.tv/js/embed/v1.js";
      script.async = true;
      script.addEventListener("load", mountPlayer, { once: true });
      script.addEventListener("error", () => setStreamStatus("offline"), { once: true });
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const streamLabel =
    streamStatus === "live" ? "EN DIRECTO" : streamStatus === "offline" ? "Offline" : "Comprobando";
  const streamColor = streamStatus === "live" ? "#48d17c" : streamStatus === "offline" ? "#e15f5f" : "#8d8792";
  const streamGlow =
    streamStatus === "live"
      ? "rgba(72, 209, 124, .30)"
      : streamStatus === "offline"
        ? "rgba(225, 95, 95, .22)"
        : "rgba(141, 135, 146, .16)";

  return (
    <main>
      <header className="siteHeader">
        <div className="shell nav">
          <a className="brand" href="#inicio" aria-label="Ir al inicio">
            <Image className="brandIcon" src="/byetale-game-icon.png" alt="" width={42} height={42} priority unoptimized />
            <span className="brandCopy">
              <strong>ByeTale</strong>
              <small>Community &amp; Development</small>
            </span>
          </a>

          <nav className="navLinks" aria-label="Navegación principal">
            <a href="#juego">Juego</a>
            <a href="#roadmap">Desarrollo</a>
            <a href="#participa">Comunidad</a>
            <a href="#twitch">Twitch</a>
            <a href="#apoyar">Apoyar</a>
            <a href="/forum">Foro</a>
            <a href="/account?mode=signup">Cuenta</a>
          </nav>

          <a className="streamPill" href="#twitch" aria-label={`Twitch @${TWITCH_CHANNEL}: ${streamLabel}`}>
            <i
              aria-hidden="true"
              style={{ background: streamColor, boxShadow: `0 0 0 5px ${streamGlow}, 0 0 14px ${streamGlow}` }}
            />
            @{TWITCH_CHANNEL}
          </a>
        </div>
      </header>

      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <div className="heroScene" aria-hidden="true" />
        <div className="heroShade" aria-hidden="true" />
        <div className="shell heroLayout">
          <div className="heroCopy">
            <span className="eyebrow">RPG 2D multijugador · Godot 4</span>
            <h1 id="hero-title">ByeTale</h1>
            <p className="heroTagline">Un RPG hecho a mano, build a build.</p>
            <p className="lead">
              Estoy construyendo ByeTale en público. Comparto lo que funciona, lo que estoy cambiando y las decisiones en las que la comunidad puede aportar de verdad.
            </p>
            <div className="actions">
              <a className="button primary" href="/forum">Entrar al foro</a>
              <a className="textLink" href="#roadmap">Ver desarrollo →</a>
            </div>
            <p className="projectLine">Godot 4 · RPG 2D · Multijugador · Desarrollo abierto</p>
          </div>
        </div>
      </section>

      <section className="section worldSection" id="juego">
        <div className="shell">
          <div className="sectionHead">
            <div>
              <span>El juego</span>
              <h2>Lo que ya existe dentro del juego.</h2>
            </div>
            <p>No es una lista de promesas: son partes del proyecto que ya estoy trabajando.</p>
          </div>

          <div className="worldGrid">
            <article className="featureCard featureLarge currentBattleCard">
              <span className="featureNumber">01</span>
              <div>
                <span className="label gold">Combate 2D</span>
                <h3>Carga manual y ritmo propio de enemigos</h3>
                <p>La build actual usa barra de carga y heartbeat dedicado para mantener la actividad enemiga.</p>
              </div>
            </article>

            <article className="featureCard">
              <span className="featureNumber">02</span>
              <div>
                <span className="label">Exploración</span>
                <h3>Mapas 2D conectados</h3>
                <p>Valdoria, Bosque de los Susurros, Camino Viejo, Puente del Este, Ruinas Antiguas y Fortaleza Goblin.</p>
              </div>
            </article>

            <article className="featureCard">
              <span className="featureNumber">03</span>
              <div>
                <span className="label">Sistemas RPG</span>
                <h3>Quests, party, profesiones y mundo vivo</h3>
                <p>Diálogos, grupos, profesiones, ciclo horario, eventos, inventario, equipo y habilidades.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section roadmapSection" id="roadmap">
        <div className="shell">
          <div className="sectionHead">
            <div>
              <span>Desarrollo</span>
              <h2>Notas del desarrollo actual.</h2>
            </div>
            <p>Lo iré actualizando conforme avance el juego.</p>
          </div>
          <div className="roadmap">
            {roadmap.map((item) => (
              <article className="roadCard" key={item.title}>
                <div className="roadTop"><span>{item.state}</span><small>{item.meta}</small></div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section participationSection" id="participa">
        <div className="shell">
          <div className="sectionHead">
            <div>
              <span>Comunidad</span>
              <h2>Hay varias formas de echar una mano.</h2>
            </div>
            <p>El foro se puede leer sin cuenta. Para participar, responder o votar sí necesitas registrarte.</p>
          </div>
          <div className="participation">
            {participation.map((item) => (
              <article className="participationCard" key={item.title}>
                <span className="participationIndex">{item.index}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <a href="/forum">Abrir foro <span aria-hidden="true">→</span></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="streamSection" id="twitch">
        <div className="shell">
          <article className="streamBand">
            <div className="streamIdentity">
              <span
                className="streamDot"
                aria-hidden="true"
                style={{ background: streamColor, boxShadow: `0 0 0 6px ${streamGlow}, 0 0 18px ${streamGlow}` }}
              />
              <div>
                <small>Desarrollo en directo</small>
                <strong>@{TWITCH_CHANNEL}</strong>
              </div>
            </div>
            <p>Directos de desarrollo, pruebas y decisiones del ByeTale 2D.</p>
            <span className="streamStatus" style={{ color: streamColor }}>{streamLabel}</span>
          </article>

          <div className="twitchFrame">
            <div id="byetale-twitch-player" className="twitchPlayer" aria-label={`Twitch de ${TWITCH_CHANNEL}`} />
            <div className="twitchFooter">
              <span>Twitch oficial de ByeTale</span>
              <a href={TWITCH_URL} target="_blank" rel="noreferrer">Abrir en Twitch ↗</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section finalSection" id="apoyar">
        <div className="shell">
          <article className="manifesto">
            <div>
              <span className="label gold">Apoya el proyecto</span>
              <h2>Si quieres apoyar el tiempo que dedico a ByeTale.</h2>
              <p>El apoyo es completamente voluntario y va directamente a ayudarme mientras continúo desarrollando el juego. No desbloquea ventajas ni contenido exclusivo.</p>
            </div>
            <a className="button primary" href="https://paypal.me/byetale" target="_blank" rel="noreferrer">Apoyar en PayPal ↗</a>
          </article>
        </div>
      </section>

      <section className="section finalSection">
        <div className="shell">
          <article className="manifesto">
            <div>
              <span className="label gold">Comunidad</span>
              <h2>¿Tienes una idea, un fallo o algo que enseñar?</h2>
              <p>Déjalo en el foro. Lo leeré y, si encaja con ByeTale, podremos trabajarlo entre todos.</p>
            </div>
            <a className="textLink manifestoLink" href="/forum">Ir al foro →</a>
          </article>
        </div>
      </section>

      <footer>
        <div className="shell footer">
          <div className="brand">
            <Image className="brandIcon footerIcon" src="/byetale-game-icon.png" alt="" width={38} height={38} unoptimized />
            <span className="brandCopy"><strong>ByeTale</strong><small>Community &amp; Development</small></span>
          </div>
          <p>RPG 2D · Godot 4 · Comunidad</p>
        </div>
      </footer>
    </main>
  );
}
