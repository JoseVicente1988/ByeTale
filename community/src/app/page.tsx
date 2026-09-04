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
    Twitch?: {
      Player: TwitchPlayerConstructor;
    };
  }
}

const TWITCH_CHANNEL = "thespaguetticode";
const TWITCH_URL = `https://www.twitch.tv/${TWITCH_CHANNEL}`;

const roadmap = [
  {
    title: "Exploración y mapas 2D",
    state: "Proyecto actual",
    meta: "Mundo",
    detail:
      "Plaza, Campiña de Valdoria, Bosque de los Susurros, Camino Viejo, Puente del Este, Ruinas Antiguas y Fortaleza Goblin forman parte del proyecto Godot actual.",
  },
  {
    title: "Combate por carga",
    state: "Build V34.3.12",
    meta: "Combate",
    detail:
      "Combate 2D con barra de carga manual, acciones explícitas del jugador y heartbeat para que los enemigos mantengan su propio ritmo de acción.",
  },
  {
    title: "Sistemas RPG online",
    state: "En evolución",
    meta: "Gameplay",
    detail:
      "Quests, diálogos, party, profesiones, tiempo del mundo, eventos y sincronización del estado compartido ya tienen sistemas dedicados en el cliente.",
  },
];

const participation = [
  {
    index: "01",
    icon: "✦",
    title: "Ideas",
    copy: "Propón sistemas, contenido y mejoras para el ByeTale 2D actual. Las propuestas pueden debatirse, recibir apoyo y obtener una respuesta oficial.",
  },
  {
    index: "02",
    icon: "◉",
    title: "Voces y casting",
    copy: "Convocatorias para personajes, audiciones y feedback vinculados a NPCs, diálogos y contenido narrativo del juego.",
  },
  {
    index: "03",
    icon: "⌁",
    title: "Bugs y testing",
    copy: "Reporta problemas de mapas, combate, quests, party o interfaz y sigue el hilo desde la reproducción hasta la corrección.",
  },
  {
    index: "04",
    icon: "◇",
    title: "Arte y lore",
    copy: "Pixel art, UI, textos, localización y aportaciones creativas que puedan encajar con la identidad visual y narrativa de ByeTale.",
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
          <a className="brand" href="#inicio" aria-label="Ir al inicio de ByeTale Community">
            <Image className="brandIcon" src="/byetale-icon.svg" alt="" width={42} height={42} priority unoptimized />
            <span className="brandCopy">
              <strong>ByeTale</strong>
              <small>Community &amp; Development</small>
            </span>
          </a>

          <nav className="navLinks" aria-label="Navegación principal">
            <a href="#juego">El juego</a>
            <a href="#roadmap">Desarrollo</a>
            <a href="#participa">Participa</a>
            <a href="/forum">Foro</a>
            <a href="#twitch">Twitch</a>
          </nav>

          <a className="streamPill" href="#twitch" aria-label={`Twitch @${TWITCH_CHANNEL}: ${streamLabel}`}>
            <i
              aria-hidden="true"
              style={{
                background: streamColor,
                boxShadow: `0 0 0 5px ${streamGlow}, 0 0 14px ${streamGlow}`,
              }}
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
            <p className="heroTagline">Un mundo 2D en desarrollo. Una comunidad dentro del proceso.</p>
            <p className="lead">
              Sigue el ByeTale actual: exploración por mapas 2D, combate por carga,
              quests, party, profesiones y eventos del mundo. Prueba nuevas builds,
              aporta ideas y deja feedback mientras el juego evoluciona.
            </p>
            <div className="actions">
              <a className="button primary" href="/forum">Entrar al foro</a>
              <a className="button secondary" href="#juego">Ver el juego actual</a>
            </div>
            <div className="tech" aria-label="Pilares actuales del proyecto">
              <span>Godot 4</span>
              <span>2D / TileMap</span>
              <span>Combate por carga</span>
              <span>World Sync</span>
            </div>
          </div>
          <div className="heroCaption">
            <span>Arte del proyecto actual</span>
            <strong>Fondo pixel art utilizado por el ByeTale 2D.</strong>
          </div>
        </div>
        <a className="scrollCue" href="#juego" aria-label="Continuar hacia la sección del juego">
          <span>Descubre el proyecto</span><i aria-hidden="true">↓</i>
        </a>
      </section>

      <section className="streamSection" id="twitch">
        <div className="shell">
          <article className="streamBand">
            <div className="streamIdentity">
              <span
                className="streamDot"
                aria-hidden="true"
                style={{
                  background: streamColor,
                  boxShadow: `0 0 0 6px ${streamGlow}, 0 0 18px ${streamGlow}`,
                }}
              />
              <div>
                <small>Twitch / desarrollo en directo</small>
                <strong>@{TWITCH_CHANNEL}</strong>
              </div>
            </div>
            <p>Directos de desarrollo, pruebas y decisiones del ByeTale 2D conectados con la comunidad.</p>
            <span className="streamStatus" style={{ color: streamColor }}>{streamLabel}</span>
          </article>

          <div className="twitchFrame">
            <div
              id="byetale-twitch-player"
              className="twitchPlayer"
              aria-label={`Reproductor de Twitch de ${TWITCH_CHANNEL}`}
            />
            <div className="twitchFooter">
              <span>Twitch oficial de ByeTale</span>
              <a href={TWITCH_URL} target="_blank" rel="noreferrer">Abrir en Twitch ↗</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section worldSection" id="juego">
        <div className="shell">
          <div className="sectionHead">
            <div>
              <span>El juego actual</span>
              <h2>ByeTale es un RPG 2D multijugador.</h2>
            </div>
            <p>
              La web toma como referencia el proyecto Godot 4 actual: sus escenas 2D,
              mapas, combate, personajes y sistemas de mundo. Esta es la identidad que se mostrará a partir de ahora.
            </p>
          </div>

          <div className="worldGrid">
            <article className="featureCard featureLarge currentBattleCard">
              <span className="featureNumber">01</span>
              <div>
                <span className="label gold">Combate 2D</span>
                <h3>Carga manual y ritmo propio de enemigos</h3>
                <p>
                  La build actual usa combate por barra de carga y un heartbeat dedicado
                  para mantener la actividad enemiga sin depender de que el jugador pulse una acción.
                </p>
              </div>
            </article>

            <article className="featureCard">
              <span className="featureNumber">02</span>
              <div>
                <span className="label">Exploración</span>
                <h3>Mapas 2D conectados</h3>
                <p>
                  Campiña de Valdoria, Bosque de los Susurros, Camino Viejo, Puente del Este,
                  Ruinas Antiguas, Fortaleza Goblin y zonas de Plaza forman el mundo jugable actual.
                </p>
              </div>
            </article>

            <article className="featureCard">
              <span className="featureNumber">03</span>
              <div>
                <span className="label">Sistemas RPG</span>
                <h3>Quests, party, profesiones y mundo vivo</h3>
                <p>
                  El cliente incluye sistemas dedicados para diálogos y quests, grupos,
                  profesiones, ciclo horario, eventos del mundo, inventario, equipo y habilidades.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section roadmapSection" id="roadmap">
        <div className="shell">
          <div className="sectionHead">
            <div>
              <span>Desarrollo público</span>
              <h2>Estado del ByeTale 2D</h2>
            </div>
            <p>
              Sin porcentajes decorativos: esta vista resume sistemas y contenido que existen
              en el proyecto actual y qué áreas continúan evolucionando.
            </p>
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
              <span>Entra en el proceso</span>
              <h2>Ayuda a mejorar el juego que existe hoy.</h2>
            </div>
            <p>
              Ideas, casting, bugs y colaboración viven en el foro de ByeTale.
              Los votos muestran interés; la dirección final del juego sigue perteneciendo a ByeTale.
            </p>
          </div>
          <div className="participation">
            {participation.map((item) => (
              <article className="participationCard" key={item.title}>
                <span className="participationIndex">{item.index}</span>
                <i aria-hidden="true">{item.icon}</i>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <a href="/forum">Abrir en el foro <span aria-hidden="true">→</span></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section finalSection">
        <div className="shell">
          <article className="manifesto">
            <div>
              <span className="label gold">Principio del proyecto</span>
              <h2>La comunidad participa. ByeTale mantiene su visión.</h2>
              <p>
                Desarrollo visible, feedback útil y una identidad 2D coherente con el juego real.
                Cada sección de la comunidad debe ayudar a mejorar ese proyecto, no otro prototipo anterior.
              </p>
            </div>
            <a className="button primary" href="/forum">Entrar al foro</a>
          </article>
        </div>
      </section>

      <footer>
        <div className="shell footer">
          <div className="brand">
            <Image className="brandIcon footerIcon" src="/byetale-icon.svg" alt="" width={38} height={38} unoptimized />
            <span className="brandCopy"><strong>ByeTale</strong><small>Community &amp; Development</small></span>
          </div>
          <p>RPG 2D · Godot 4 · combate · quests · party · world events</p>
          <a href="https://github.com/JoseVicente1988/ByeTale" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </footer>
    </main>
  );
}
