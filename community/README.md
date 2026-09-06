# ByeTale Community

Aplicación web oficial de comunidad y desarrollo de ByeTale.

Esta carpeta vive **dentro del mismo repositorio que el juego** para compartir identidad, documentación y ciclo de cambios sin mezclar el runtime de Godot con el runtime web.

## Vercel

- Repository: `JoseVicente1988/ByeTale`
- Root Directory: `community`
- Framework: Next.js
- Production project: `byetale-community`

No crear proyectos Vercel alternativos para cada iteración. Los fallos de build se corrigen y se redeployan sobre el mismo proyecto.

## Backend

La integración funcional seguirá utilizando el proyecto Neon existente **ByeTale Community**. Las credenciales deben vivir exclusivamente en variables de entorno de Vercel/Neon y nunca dentro del repositorio.

## Desarrollo

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Identidad visual

La portada toma como referencia el fondo real que utiliza el login de ByeTale (`UI/background_1.jpeg`) y los recursos existentes del proyecto, como Godspire Citadel y las entidades Player Character, Skeleton y Slime.
