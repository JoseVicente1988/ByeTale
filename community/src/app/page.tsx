import Image from "next/image";

const roadmap = [
  {
    title: "Arquitectura multijugador",
    state: "Base implementada",
    progress: 86,
    detail: "Autenticación, spawning y flujo cliente-servidor sobre ENet."
  },
  {
    title: "Sincronización de jugadores",
    state: "En evolución",
    progress: 72,
    detail: "Estado del jugador, replicación y consistencia del mundo compartido."
  },
  {
    title: "Mundo y Godspire Citadel",
    state: "En desarrollo",
    progress: 45,
    detail: "Entorno, criaturas y dirección visual del universo de ByeTale."
  }
];

const participation = [
  {
    index: "01",
    icon: "✦",
    title: "Ideas",
    copy: "Propón sistemas, contenido y mejoras. Las propuestas podrán debatirse, votarse y recibir una respuesta oficial."
  },
  {
    index: "02",
    icon: "◉",
    title: "Voces y casting",
    copy: "Convocatorias para personajes, audiciones, feedback de la comunidad y selección oficial dentro de cada casting."
  },
  {
    index: "03",
    icon: "⌁",
    title: "Bugs y testing",
    copy: "Reportes reproducibles, pruebas de builds y seguimiento público desde la detección hasta la resolución."
  },
  {
    index: "04",
    icon: "◇",
    title: "Arte y lore",
    copy: "Concept art, textos, traducciones y aportaciones creativas conectadas directamente con el mundo del juego."
  }
];

export default function HomePage() {
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
            <a href="#mundo">Mundo</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#participa">Participa</a>
            <a href="#twitch">Twitch</a>
          </nav>

          <span className="streamPill"><i aria-hidden="true" />Twitch por conectar</span>
        </div>
      </header>

      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <Image
          className="heroScene"
          src="/byetale-background.jpeg"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          aria-hidden="true"
        />
        <div className="heroShade" aria-hidden="true" />

        <div className="shell heroLayout">
          <div className="heroCopy">
            <span className="eyebrow">MMORPG en desarrollo · Godot + ENet</span>
            <h1 id="hero-title">ByeTale</h1>
            <p className="heroTagline">Un mundo en desarrollo. Una comunidad dentro del proceso.</p>
            <p className="lead">
              Sigue el desarrollo real del juego, aporta ideas, prueba nuevas builds,
              participa en castings de voz y comparte feedback mientras el roadmap
              de ByeTale evoluciona de forma pública.
            </p>
            <div className="actions">
              <a className="button primary" href="#roadmap">Explorar roadmap</a>
              <a className="button secondary" href="#participa">Cómo participar</a>
            </div>
            <div className="tech" aria-label="Tecnologías y pilares del proyecto">
              <span>Godot Engine</span><span>ENet</span><span>Player Sync</span><span>Encrypted Networking</span>
            </div>
          </div>
          <div className="heroCaption">
            <span>Universo ByeTale</span>
            <strong>Del prototipo multijugador a un mundo vivo.</strong>
          </div>
        </div>
        <a className="scrollCue" href="#mundo" aria-label="Continuar hacia la sección del mundo"><span>Descubre el proyecto</span><i aria-hidden="true">↓</i></a>
      </section>

      <section className="streamSection" id="twitch"><div className="shell"><article className="streamBand"><div className="streamIdentity"><span className="streamDot" aria-hidden="true" /><div><small>Twitch / desarrollo en directo</small><strong>El stream formará parte del flujo de desarrollo.</strong></div></div><p>Cuando conectemos tu canal, cada directo podrá enlazar con propuestas, tareas, votaciones o castings que estén activos en la comunidad.</p><span className="streamStatus">Canal pendiente</span></article></div></section>

      <section className="section worldSection" id="mundo"><div className="shell"><div className="sectionHead"><div><span>El mundo</span><h2>ByeTale ya tiene un ADN propio.</h2></div><p>El repositorio contiene infraestructura multijugador, recursos de personajes y Godspire Citadel. La comunidad web crece alrededor de lo que el juego ya es.</p></div><div className="worldGrid"><article className="featureCard featureLarge"><span className="featureNumber">01</span><div><span className="label gold">Localización</span><h3>Godspire Citadel</h3><p>Uno de los entornos 3D existentes del proyecto y una referencia central para la dirección fantasy de ByeTale.</p></div></article><article className="featureCard"><span className="featureNumber">02</span><div><span className="label">Criaturas</span><h3>Personajes y enemigos</h3><p>Player Character, Skeleton y Slime ya forman parte de los recursos del juego.</p></div></article><article className="featureCard"><span className="featureNumber">03</span><div><span className="label">Tecnología</span><h3>Multijugador primero</h3><p>Login, persistencia, spawning, ENet y sincronización son parte del núcleo técnico sobre el que seguirá creciendo el proyecto.</p></div></article></div></div></section>

      <section className="section roadmapSection" id="roadmap"><div className="shell"><div className="sectionHead"><div><span>Desarrollo público</span><h2>Roadmap de ByeTale</h2></div><p>El objetivo es que esta vista lea siempre el estado oficial desde Neon. El roadmap será una ventana al desarrollo, no una copia desconectada.</p></div><div className="roadmap">{roadmap.map((item) => <article className="roadCard" key={item.title}><div className="roadTop"><span>{item.state}</span><small>{item.progress}%</small></div><h3>{item.title}</h3><p>{item.detail}</p><div className="progress" role="progressbar" aria-label={`${item.title}: ${item.progress}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress}><b style={{ width: `${item.progress}%` }} /></div></article>)}</div></div></section>

      <section className="section participationSection" id="participa"><div className="shell"><div className="sectionHead"><div><span>Comunidad</span><h2>Tu aportación puede dejar huella.</h2></div><p>Los votos muestran interés y ayudan a priorizar conversaciones. La dirección final del juego seguirá perteneciendo a ByeTale.</p></div><div className="participation">{participation.map((item) => <article className="participationCard" key={item.title}><span className="participationIndex">{item.index}</span><i aria-hidden="true">{item.icon}</i><h3>{item.title}</h3><p>{item.copy}</p><a href="#inicio">Próximamente <span aria-hidden="true">→</span></a></article>)}</div></div></section>

      <section className="section finalSection"><div className="shell"><article className="manifesto"><div><span className="label gold">Principio del proyecto</span><h2>La comunidad participa. ByeTale mantiene su visión.</h2><p>Transparencia sobre qué se está construyendo, por qué se toman decisiones y qué aportaciones de la comunidad terminan formando parte del juego.</p></div><a className="button primary" href="#inicio">Volver arriba</a></article></div></section>

      <footer><div className="shell footer"><div className="brand"><Image className="brandIcon footerIcon" src="/byetale-icon.svg" alt="" width={38} height={38} unoptimized /><span className="brandCopy"><strong>ByeTale</strong><small>Community &amp; Development</small></span></div><p>Godot · ENet · comunidad · roadmap · testing · voces</p><a href="https://github.com/JoseVicente1988/ByeTale" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a></div></footer>
    </main>
  );
}
