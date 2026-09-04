const roadmap = [
  { title: "Arquitectura multijugador", state: "Base implementada", progress: 86 },
  { title: "Sincronización de jugadores", state: "En evolución", progress: 72 },
  { title: "Mundo y Godspire Citadel", state: "En desarrollo", progress: 45 }
];

const participation = [
  { icon: "✦", title: "Ideas", copy: "Propón sistemas, contenido y mejoras para ByeTale. La comunidad puede debatir y apoyar propuestas." },
  { icon: "◉", title: "Voces y casting", copy: "Audiciones para personajes, feedback de voz y selección oficial dentro de cada convocatoria." },
  { icon: "⌁", title: "Bugs y testing", copy: "Reportes reproducibles, pruebas de builds y seguimiento público hasta su resolución." },
  { icon: "◇", title: "Arte y lore", copy: "Conceptos, textos, traducciones y aportaciones creativas conectadas con el mundo del juego." }
];

export default function HomePage() {
  return (
    <main>
      <header className="siteHeader">
        <div className="shell nav">
          <a className="brand" href="#inicio" aria-label="ByeTale Community">
            <span className="brandMark">B</span>
            <span><strong>ByeTale</strong><small>Community & Development</small></span>
          </a>
          <nav className="navLinks" aria-label="Navegación principal">
            <a href="#mundo">Mundo</a><a href="#roadmap">Roadmap</a><a href="#participa">Participa</a><a href="#twitch">Twitch</a>
          </nav>
          <span className="streamPill"><i /> Twitch por conectar</span>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="shell heroGrid">
          <div>
            <span className="eyebrow">MMORPG en desarrollo · Godot + ENet</span>
            <h1>ByeTale <span>un mundo que se construye contigo</span></h1>
            <p className="lead">Sigue el desarrollo real del juego, comenta decisiones, aporta ideas, participa en testing y casting de voces, y conecta lo que ocurre en Twitch con el roadmap público.</p>
            <div className="actions"><a className="button primary" href="#roadmap">Ver roadmap</a><a className="button secondary" href="#participa">Participar</a></div>
            <div className="tech"><span>Godot Engine</span><span>ENet</span><span>Player Sync</span><span>Encrypted Networking</span></div>
          </div>
          <aside className="glass twitchCard" id="twitch">
            <span className="label">Twitch / Dev stream</span>
            <h2>El directo forma parte del desarrollo</h2>
            <p>Cuando conectemos tu canal, esta tarjeta mostrará el estado del directo y enlazará cada sesión con las propuestas o tareas que estemos trabajando.</p>
            <div className="cardFooter"><span><i className="offline" /> Canal pendiente</span><small>Sin usuario inventado</small></div>
          </aside>
        </div>
      </section>

      <section className="section" id="mundo">
        <div className="shell">
          <div className="sectionHead"><div><span>El mundo</span><h2>De prototipo técnico a universo vivo</h2></div><p>El repo ya contiene las bases multijugador, recursos de personajes y Godspire Citadel. La comunidad web debe crecer alrededor de ese desarrollo real.</p></div>
          <div className="worldGrid">
            <article className="glass worldPrimary"><div><span className="label gold">Localización</span><h3>Godspire Citadel</h3><p>Uno de los entornos 3D existentes en el proyecto y una referencia visual para construir la identidad fantasy de ByeTale.</p></div></article>
            <div className="worldSide"><article className="glass mini"><strong>Personajes y criaturas</strong><p>Player Character, Skeleton y Slime ya forman parte de los recursos del proyecto.</p></article><article className="glass mini"><strong>Multijugador primero</strong><p>Login, persistencia, spawning, ENet y sincronización son parte del ADN técnico de ByeTale.</p></article></div>
          </div>
        </div>
      </section>

      <section className="section" id="roadmap">
        <div className="shell">
          <div className="sectionHead"><div><span>Desarrollo público</span><h2>Roadmap de ByeTale</h2></div><p>Esta vista terminará leyendo el estado oficial desde Neon; nunca será una copia desconectada del foro.</p></div>
          <div className="roadmap">{roadmap.map((item) => <article className="glass road" key={item.title}><span>{item.state}</span><h3>{item.title}</h3><div className="progress"><b style={{ width: `${item.progress}%` }} /></div><small>{item.progress}%</small></article>)}</div>
        </div>
      </section>

      <section className="section" id="participa">
        <div className="shell">
          <div className="sectionHead"><div><span>Comunidad</span><h2>Participa en el desarrollo</h2></div><p>Los votos muestran interés y ayudan a priorizar conversaciones. La dirección final del juego permanece en el equipo de ByeTale.</p></div>
          <div className="participation">{participation.map((item) => <article className="glass participationCard" key={item.title}><i>{item.icon}</i><h3>{item.title}</h3><p>{item.copy}</p><a href="#inicio">Próximamente →</a></article>)}</div>
        </div>
      </section>

      <section className="section finalSection"><div className="shell"><article className="glass manifesto"><div><span className="label gold">Principio del proyecto</span><h2>La comunidad aconseja. ByeTale mantiene su visión.</h2><p>Transparencia sobre qué se está construyendo, por qué se toman decisiones y qué aportaciones de la comunidad terminan formando parte del juego.</p></div><a className="button primary" href="#inicio">Volver arriba</a></article></div></section>

      <footer><div className="shell footer"><div className="brand"><span className="brandMark">B</span><span><strong>ByeTale</strong><small>Community & Development</small></span></div><p>Godot · ENet · comunidad · roadmap · testing · voces</p><a href="https://github.com/JoseVicente1988/ByeTale" target="_blank" rel="noreferrer">GitHub ↗</a></div></footer>
    </main>
  );
}
