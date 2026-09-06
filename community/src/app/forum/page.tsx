"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { neon } from "../../lib/neon-client";
import "./forum.css";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  position: number;
  is_read_only: boolean;
};

type Thread = {
  id: string;
  slug: string;
  title: string;
  type: string;
  pinned: boolean;
  locked: boolean;
  reply_count: number;
  last_post_at: string;
  author: string;
  category: string;
  category_slug: string;
};

type ForumPost = {
  id: string;
  thread_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author: string;
  avatar_url: string | null;
  is_official: boolean;
  image_url: string | null;
};

type Proposal = {
  id: string;
  status: string;
  official_note: string | null;
  vote_count: number;
};

type Stats = { threads: number; posts: number; members: number };

type Profile = { id: string; display_name: string };

const FORUM_UPLOAD_URL = "https://br-lively-unit-aygkh67q-forumupload.compute.c-5.us-east-2.aws.neon.tech/";

const typeLabels: Record<string, string> = {
  discussion: "Discusión",
  proposal: "Propuesta",
  bug: "Bug",
  casting: "Casting",
  development: "Desarrollo",
  devlog: "Devlog",
  announcement: "Anuncio",
};

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Ha ocurrido un error inesperado.";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function slugify(title: string) {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "hilo";
  return `${base}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

function typeForCategory(slug: string) {
  if (slug === "ideas") return "proposal";
  if (slug === "bugs") return "bug";
  if (slug === "voices") return "casting";
  return "discussion";
}

export default function ForumPage() {
  const session = neon.auth.useSession();
  const user = session.data?.user ?? null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Stats>({ threads: 0, posts: 0, members: 0 });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [composerOpen, setComposerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);

  const loadForum = useCallback(async () => {
    setLoading(true);
    setError("");
    const [categoryResult, threadResult, proposalResult, statsResult] = await Promise.all([
      neon
        .from("community_public_categories")
        .select("id,slug,name,description,icon,position,is_read_only")
        .order("position", { ascending: true }),
      neon
        .from("community_public_threads")
        .select("id,slug,title,type,pinned,locked,reply_count,last_post_at,author,category,category_slug")
        .order("pinned", { ascending: false })
        .order("last_post_at", { ascending: false })
        .limit(100),
      neon
        .from("community_public_proposals")
        .select("id,status,official_note,vote_count")
        .limit(100),
      neon.from("community_public_stats").select("threads,posts,members").limit(1),
    ]);

    const firstError = categoryResult.error || threadResult.error || proposalResult.error || statsResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setCategories((categoryResult.data ?? []) as Category[]);
    setThreads((threadResult.data ?? []) as Thread[]);
    setProposals((proposalResult.data ?? []) as Proposal[]);
    const firstStats = Array.isArray(statsResult.data) ? statsResult.data[0] : null;
    if (firstStats) setStats(firstStats as Stats);
    setLoading(false);
  }, []);

  const loadPosts = useCallback(async (threadId: string) => {
    setPostsLoading(true);
    setError("");
    const result = await neon
      .from("community_public_posts")
      .select("id,thread_id,body,created_at,edited_at,author,avatar_url,is_official,image_url")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (result.error) setError(result.error.message);
    setPosts((result.data ?? []) as ForumPost[]);
    setPostsLoading(false);
  }, []);

  useEffect(() => {
    void loadForum();
  }, [loadForum]);

  useEffect(() => {
    if (selectedThreadId) void loadPosts(selectedThreadId);
    else setPosts([]);
  }, [selectedThreadId, loadPosts]);

  const proposalById = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.id, proposal])),
    [proposals],
  );

  const visibleThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((thread) => {
      if (selectedCategory !== "all" && thread.category_slug !== selectedCategory) return false;
      if (!q) return true;
      return `${thread.title} ${thread.author} ${thread.category}`.toLowerCase().includes(q);
    });
  }, [threads, selectedCategory, search]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  function categoryCount(slug: string) {
    return threads.filter((thread) => thread.category_slug === slug).length;
  }

  async function ensureProfile(): Promise<Profile> {
    if (!user) throw new Error("Debes iniciar sesión.");
    const existing = await neon
      .from("profiles")
      .select("id,display_name")
      .eq("auth_user_id", user.id)
      .limit(1);
    if (existing.error) throw existing.error;
    if (existing.data?.[0]) return existing.data[0] as Profile;

    const displayName = (user.name || user.email?.split("@")[0] || "Miembro ByeTale").slice(0, 40);
    const created = await neon
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        email: user.email,
        display_name: displayName,
        avatar_url: user.image ?? null,
      })
      .select("id,display_name")
      .single();
    if (created.error || !created.data) throw created.error ?? new Error("No se pudo crear el perfil.");
    return created.data as Profile;
  }

  async function uploadForumImage(profile: Profile, file: File | null) {
    if (!file) return null;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      throw new Error("La imagen debe ser PNG, JPG o WEBP.");
    }
    if (file.size > 3 * 1024 * 1024) throw new Error("La imagen no puede superar los 3 MB.");

    const token = crypto.randomUUID();
    const tokenResult = await neon.from("forum_upload_tokens").insert({ token, profile_id: profile.id });
    if (tokenResult.error) throw tokenResult.error;

    const jwt = session.data?.session?.token;
    if (!jwt) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión para adjuntar la imagen.");

    const response = await fetch(FORUM_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": file.type,
        "x-upload-token": token,
      },
      body: file,
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) throw new Error(payload.error || "No se pudo adjuntar la imagen.");
    return payload.url;
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    try {
      if (authMode === "signup") {
        const result = await neon.auth.signUp.email({ email, password, name: name || email.split("@")[0] });
        if (result.error) throw result.error;
        setNotice("Cuenta creada. Ya puedes entrar en el foro.");
      } else {
        const result = await neon.auth.signIn.email({ email, password });
        if (result.error) throw result.error;
        setNotice("Sesión iniciada.");
      }
      setAuthOpen(false);
    } catch (authError) {
      setError(errorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setComposerOpen(false);
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    let newThreadId: string | null = null;
    try {
      const form = new FormData(event.currentTarget);
      const categoryId = String(form.get("category") ?? "");
      const title = String(form.get("title") ?? "").trim();
      const body = String(form.get("body") ?? "").trim();
      const imageEntry = form.get("image");
      const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
      const category = categories.find((item) => item.id === categoryId);
      if (!category || category.is_read_only) throw new Error("Esa categoría no admite nuevos hilos.");
      if (title.length < 6 || title.length > 120) throw new Error("El título debe tener entre 6 y 120 caracteres.");
      if (body.length < 20 || body.length > 10000) throw new Error("El mensaje debe tener entre 20 y 10.000 caracteres.");

      const profile = await ensureProfile();
      const imageUrl = await uploadForumImage(profile, imageFile);
      const threadType = typeForCategory(category.slug);
      const threadResult = await neon
        .from("threads")
        .insert({
          category_id: category.id,
          author_id: profile.id,
          type: threadType,
          title,
          slug: slugify(title),
        })
        .select("id,slug")
        .single();
      if (threadResult.error || !threadResult.data) throw threadResult.error ?? new Error("No se pudo crear el hilo.");
      newThreadId = String(threadResult.data.id);

      const postResult = await neon.from("posts").insert({
        thread_id: newThreadId,
        author_id: profile.id,
        body,
        image_url: imageUrl,
      });
      if (postResult.error) throw postResult.error;

      if (threadType === "proposal") {
        const proposalResult = await neon.from("proposals").insert({ thread_id: newThreadId });
        if (proposalResult.error) throw proposalResult.error;
      }
      if (threadType === "bug") {
        const bugResult = await neon.from("bug_reports").insert({ thread_id: newThreadId });
        if (bugResult.error) throw bugResult.error;
      }

      setComposerOpen(false);
      setNotice("Hilo publicado.");
      await loadForum();
      setSelectedThreadId(newThreadId);
      await loadPosts(newThreadId);
    } catch (createError) {
      setError(
        newThreadId
          ? `El hilo llegó a crearse, pero una operación secundaria falló: ${errorMessage(createError)}`
          : errorMessage(createError),
      );
      if (newThreadId) {
        await loadForum();
        setSelectedThreadId(newThreadId);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThread || !user) {
      setAuthOpen(true);
      return;
    }
    const body = replyBody.trim();
    if ((!body && !replyImage) || body.length > 10000) {
      setError("Escribe una respuesta o adjunta una imagen. El texto admite hasta 10.000 caracteres.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const profile = await ensureProfile();
      const imageUrl = await uploadForumImage(profile, replyImage);
      const result = await neon.from("posts").insert({
        thread_id: selectedThread.id,
        author_id: profile.id,
        body: body || "Imagen adjunta.",
        image_url: imageUrl,
      });
      if (result.error) throw result.error;
      setReplyBody("");
      setReplyImage(null);
      setNotice("Respuesta publicada.");
      await Promise.all([loadPosts(selectedThread.id), loadForum()]);
    } catch (replyError) {
      setError(errorMessage(replyError));
    } finally {
      setBusy(false);
    }
  }

  async function handleVote(threadId: string) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const profile = await ensureProfile();
      const currentVote = await neon
        .from("proposal_votes")
        .select("thread_id,profile_id")
        .eq("thread_id", threadId)
        .eq("profile_id", profile.id)
        .limit(1);
      if (currentVote.error) throw currentVote.error;
      if (currentVote.data?.length) {
        const removed = await neon
          .from("proposal_votes")
          .delete()
          .eq("thread_id", threadId)
          .eq("profile_id", profile.id);
        if (removed.error) throw removed.error;
        setNotice("Has retirado tu apoyo a la propuesta.");
      } else {
        const inserted = await neon.from("proposal_votes").insert({ thread_id: threadId, profile_id: profile.id });
        if (inserted.error) throw inserted.error;
        setNotice("Has apoyado la propuesta.");
      }
      await loadForum();
    } catch (voteError) {
      setError(errorMessage(voteError));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await neon.auth.signOut();
    setBusy(false);
    setNotice("Sesión cerrada.");
  }

  return (
    <main className="forumPage">
      <header className="forumHeader">
        <div className="forumShell forumNav">
          <Link className="forumBrand" href="/">
            BYETALE<small>Community Forum</small>
          </Link>
          <nav className="forumNavLinks" aria-label="Navegación del foro">
            <Link href="/">Inicio</Link>
            <Link href="/#roadmap">Roadmap</Link>
            <Link href="/#participa">Entra en el proceso</Link>
          </nav>
          <div className="forumUser">
            {user ? (
              <>
                <span className="forumUserName">{user.name || user.email}</span>
                <button className="forumButton" onClick={() => void signOut()} disabled={busy}>Salir</button>
              </>
            ) : (
              <button className="forumButton" onClick={() => setAuthOpen(true)}>Acceder</button>
            )}
            <button
              className="forumButton primary"
              onClick={() => (user ? setComposerOpen(true) : setAuthOpen(true))}
            >
              Nuevo hilo
            </button>
          </div>
        </div>
      </header>

      <section className="forumHero">
        <div className="forumShell">
          <span className="forumEyebrow">Comunidad persistente</span>
          <h1>Foro de ByeTale</h1>
          <p>
            Ideas, desarrollo, bugs, voces y colaboración en un único lugar. Los hilos y respuestas forman parte
            real de la comunidad de ByeTale; no son contenido de demostración.
          </p>
          <div className="forumStats" aria-label="Estadísticas del foro">
            <div className="forumStat"><b>{stats.threads}</b><span>Hilos</span></div>
            <div className="forumStat"><b>{stats.posts}</b><span>Mensajes</span></div>
            <div className="forumStat"><b>{stats.members}</b><span>Miembros</span></div>
          </div>
        </div>
      </section>

      <div className="forumShell">
        {error && <div className="forumError">{error}</div>}
        {notice && <div className="forumNotice">{notice}</div>}

        <div className="forumToolbar">
          <div className="forumSearch">
            <label className="sr-only" htmlFor="forum-search">Buscar en el foro</label>
            <input
              id="forum-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, autor o categoría…"
            />
          </div>
          <button className="forumButton primary" onClick={() => (user ? setComposerOpen(true) : setAuthOpen(true))}>
            + Crear hilo
          </button>
        </div>

        <div className="forumLayout">
          <aside className="forumSidebar" aria-label="Categorías">
            <button
              className={`categoryButton ${selectedCategory === "all" ? "active" : ""}`}
              onClick={() => { setSelectedCategory("all"); setSelectedThreadId(null); }}
            >
              <span className="categoryIcon">∞</span>
              <span className="categoryCopy"><b>Todo el foro</b><small>Actividad reciente</small></span>
              <span className="categoryCount">{threads.length}</span>
            </button>
            {categories.map((category, index) => (
              <button
                key={category.id}
                className={`categoryButton ${selectedCategory === category.slug ? "active" : ""}`}
                onClick={() => { setSelectedCategory(category.slug); setSelectedThreadId(null); }}
              >
                <span className="categoryIcon">{String(index + 1).padStart(2, "0")}</span>
                <span className="categoryCopy"><b>{category.name}</b><small>{category.description}</small></span>
                <span className="categoryCount">{categoryCount(category.slug)}</span>
              </button>
            ))}
          </aside>

          <section className="forumMain" aria-live="polite">
            {loading ? (
              <div className="loadingLine"><i className="loadingDot" />Cargando…</div>
            ) : selectedThread ? (
              <>
                <div className="threadDetailHead">
                  <button className="threadBack" onClick={() => setSelectedThreadId(null)}>← Volver a los hilos</button>
                  <h2>{selectedThread.title}</h2>
                  <div className="threadDetailMeta">
                    {selectedThread.category} · {selectedThread.author} · {selectedThread.locked ? "Cerrado" : "Abierto"}
                  </div>
                </div>

                {selectedThread.type === "proposal" && proposalById.get(selectedThread.id) && (
                  <div className="proposalBar">
                    <div>
                      <strong>Propuesta · {proposalById.get(selectedThread.id)?.status}</strong>
                      <span> · {proposalById.get(selectedThread.id)?.vote_count ?? 0} apoyos</span>
                    </div>
                    <button className="forumButton" onClick={() => void handleVote(selectedThread.id)} disabled={busy}>
                      Apoyar / retirar apoyo
                    </button>
                  </div>
                )}

                {postsLoading ? (
                  <div className="loadingLine"><i className="loadingDot" />Cargando…</div>
                ) : posts.length ? (
                  <div className="postList">
                    {posts.map((post) => (
                      <article className="post" key={post.id}>
                        <aside className="postAuthor">
                          {post.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="avatar" src={post.avatar_url} alt="" />
                          ) : (
                            <span className="avatar">{post.author.slice(0, 1).toUpperCase()}</span>
                          )}
                          <div>
                            <b>{post.author}</b>
                            <small>{dateLabel(post.created_at)}</small>
                          </div>
                          {post.is_official && <span className="officialMark">Oficial</span>}
                        </aside>
                        <div className="postBody">
                          <p>{post.body}</p>
                          {post.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <a href={post.image_url} target="_blank" rel="noreferrer" className="postImageLink">
                              <img className="postImage" src={post.image_url} alt={`Imagen adjunta por ${post.author}`} loading="lazy" />
                            </a>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="emptyForum"><b>Sin mensajes visibles</b>Este hilo todavía no tiene contenido público.</div>
                )}

                {!selectedThread.locked && (
                  <form className="replyBox" onSubmit={handleReply}>
                    <textarea
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      placeholder={user ? "Escribe tu respuesta…" : "Inicia sesión para responder"}
                      disabled={!user || busy}
                      maxLength={10000}
                    />
                    <div className="attachmentRow">
                      <label className="attachmentButton">
                        <span>Adjuntar imagen</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => setReplyImage(event.target.files?.[0] ?? null)}
                          disabled={!user || busy}
                        />
                      </label>
                      {replyImage && <span className="attachmentName">{replyImage.name} · {(replyImage.size / 1024 / 1024).toFixed(1)} MB</span>}
                    </div>
                    <div className="replyActions">
                      {!user && <button type="button" className="forumButton" onClick={() => setAuthOpen(true)}>Acceder</button>}
                      <button className="forumButton primary" disabled={!user || busy || (!replyBody.trim() && !replyImage)}>
                        {busy ? "Publicando…" : "Publicar respuesta"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <>
                <div className="forumPanelHead">
                  <div>
                    <h2>{selectedCategory === "all" ? "Actividad reciente" : categories.find((c) => c.slug === selectedCategory)?.name}</h2>
                    <p>{visibleThreads.length} hilos visibles</p>
                  </div>
                  <button className="forumButton primary" onClick={() => (user ? setComposerOpen(true) : setAuthOpen(true))}>Nuevo hilo</button>
                </div>
                {visibleThreads.length ? (
                  <div className="threadList">
                    {visibleThreads.map((thread) => (
                      <button className="threadRow" key={thread.id} onClick={() => setSelectedThreadId(thread.id)}>
                        <span>
                          <span className="threadTitleLine">
                            <span className="threadTitle">{thread.title}</span>
                            {thread.pinned && <span className="threadBadge">Fijado</span>}
                            <span className="threadBadge">{typeLabels[thread.type] ?? thread.type}</span>
                          </span>
                          <span className="threadMeta">
                            <span>{thread.category}</span><span>por {thread.author}</span><span>{dateLabel(thread.last_post_at)}</span>
                          </span>
                        </span>
                        <span className="threadMetrics"><b>{thread.reply_count}</b> respuestas</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="emptyForum">
                    <b>Esta zona está esperando su primer hilo.</b>
                    {user ? "Puedes abrir la conversación ahora mismo." : "Accede para iniciar la conversación."}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {authOpen && (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setAuthOpen(false)}>
          <section className="forumModal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modalHead">
              <div><h3 id="auth-title">Entra en ByeTale</h3><p>Tu cuenta te identifica dentro de la comunidad.</p></div>
              <button className="closeModal" onClick={() => setAuthOpen(false)} aria-label="Cerrar">×</button>
            </div>
            <div className="modalBody">
              <div className="modalTabs">
                <button className={`forumButton ${authMode === "signin" ? "primary" : ""}`} onClick={() => setAuthMode("signin")}>Acceder</button>
                <button className={`forumButton ${authMode === "signup" ? "primary" : ""}`} onClick={() => setAuthMode("signup")}>Crear cuenta</button>
              </div>
              <form className="modalForm" onSubmit={handleAuth}>
                {authMode === "signup" && <label><span>Nombre visible</span><input name="name" minLength={2} maxLength={40} required /></label>}
                <label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
                <label><span>Contraseña</span><input name="password" type="password" minLength={8} autoComplete={authMode === "signup" ? "new-password" : "current-password"} required /></label>
                <div className="modalFooter"><button className="forumButton primary" disabled={busy}>{busy ? "Procesando…" : authMode === "signup" ? "Crear cuenta" : "Entrar"}</button></div>
              </form>
            </div>
          </section>
        </div>
      )}

      {composerOpen && (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setComposerOpen(false)}>
          <section className="forumModal" role="dialog" aria-modal="true" aria-labelledby="composer-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modalHead">
              <div><h3 id="composer-title">Nuevo hilo</h3><p>La categoría determina si será discusión, propuesta, bug o casting.</p></div>
              <button className="closeModal" onClick={() => setComposerOpen(false)} aria-label="Cerrar">×</button>
            </div>
            <div className="modalBody">
              <form className="modalForm" onSubmit={handleCreateThread}>
                <label><span>Categoría</span><select name="category" defaultValue={categories.find((c) => c.slug === selectedCategory && !c.is_read_only)?.id ?? categories.find((c) => !c.is_read_only)?.id} required>{categories.filter((category) => !category.is_read_only).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label><span>Título</span><input name="title" minLength={6} maxLength={120} required placeholder="¿De qué quieres hablar?" /></label>
                <label><span>Primer mensaje</span><textarea name="body" minLength={20} maxLength={10000} required placeholder="Contexto, propuesta, pasos para reproducir el bug, detalles del casting…" /></label>
                <label className="fileField"><span>Imagen opcional</span><input name="image" type="file" accept="image/png,image/jpeg,image/webp" /><small>PNG, JPG o WEBP · máximo 3 MB</small></label>
                <div className="modalFooter"><button type="button" className="forumButton" onClick={() => setComposerOpen(false)}>Cancelar</button><button className="forumButton primary" disabled={busy}>{busy ? "Publicando…" : "Publicar"}</button></div>
              </form>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
