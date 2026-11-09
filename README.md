# Black Days 2026 · Akira Travel — Landing

Landing promocional de la campaña Black Days (9 al 27 de noviembre de 2026).
Dominio previsto: `blackfriday.akiratravel.com` (lo configura Sistemas).

## Cómo está organizado

| Ruta | Qué es | ¿Quién lo cambia? |
|---|---|---|
| `src/Main.dc.html` | **La landing completa**: diseño, textos, programas, precios, fechas, contador. Es una copia exacta del lienzo de Claude. | Claude (desde el Artifact) |
| `src/assets/` | Imágenes y flyers. El nombre de cada archivo es el identificador que usa el lienzo. | Claude |
| `src/canvas.json` | Configuración del lienzo (solo para restaurarlo en Claude). | Nadie |
| `runtime/support.js` | Motor que permite que el archivo del lienzo funcione en cualquier navegador. | Rara vez |
| `runtime/preact.min.js` | Librería de actualización de pantalla (Preact 10.19.3, licencia MIT). | Nunca |
| `tools/build.mjs` | Preparación automática que ejecuta Vercel en cada publicación. | Rara vez |
| `vercel.json`, `package.json` | Configuración de Vercel. | Rara vez |

La carpeta `dist/` **no se sube**: Vercel la genera sola en cada publicación.

## Configuración en Vercel (Sistemas)

1. **Add New › Project** → importar este repositorio de GitHub.
2. Framework Preset: **Other**. No cambiar nada más: `vercel.json` ya indica
   el comando (`npm run build`) y la carpeta de salida (`dist`).
3. Deploy. Luego **Settings › Domains** → agregar `blackfriday.akiratravel.com`
   y crear en el DNS el registro CNAME que Vercel indique.
4. Rama de producción: `main`. Cualquier otra rama genera una vista previa privada.

No requiere variables de entorno, base de datos ni dependencias externas.
Si el build falla, el registro de Vercel explica el motivo (por ejemplo, una imagen faltante)
y la versión anterior sigue publicada.

## Probar en local (opcional)

```
npm run build
npx serve dist        # o: cd dist && python3 -m http.server
```

## Actualizaciones

Ver [SINCRONIZACION.md](SINCRONIZACION.md).
