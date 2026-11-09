# Sincronización Claude ⇄ GitHub ⇄ Vercel

## Principio

**El Artifact de Claude es el entorno principal de diseño.**
`src/Main.dc.html` es el mismo archivo que el lienzo, sin traducir. Por eso
actualizar la landing nunca exige reconstruirla: se reemplaza un archivo y Vercel
publica solo.

```
Artifact (Claude) ──► src/Main.dc.html en GitHub ──► Vercel prepara y publica
```

## Flujo de una actualización (Fase 1)

1. Se pide el cambio a Claude, que lo hace en el Artifact (antes guarda un respaldo).
2. Claude entrega el `Main.dc.html` actualizado (y las imágenes nuevas, si las hay)
   y confirma qué cambió.
3. En GitHub: abrir la carpeta `src/` › **Add file › Upload files** › arrastrar el
   archivo › **Commit changes**. Si hay imágenes nuevas, van en `src/assets/`.
4. Vercel publica en 1–2 minutos. Si algo falla, la versión anterior sigue en línea y
   en Vercel › Deployments se puede restaurar cualquier versión con **Promote**.

Opcional: si se conecta GitHub a Claude, el paso 3 lo hace Claude directamente.

### Reglas para no perder cambios

- Nunca editar `src/Main.dc.html` a mano en GitHub. Si alguien lo hiciera, avisar a
  Claude para llevar el cambio al Artifact antes de la siguiente actualización.
- Antes de cada actualización, Claude compara el archivo de GitHub con el Artifact:
  si difieren en algo que no sea el cambio pedido, se detiene y pregunta.
- El contenido de las imágenes se identifica por nombre: una imagen nueva siempre
  tiene un nombre nuevo (así el navegador nunca muestra una versión vieja).

## Fase 2 · Panel /admin (planeado)

Para que el panel y Claude no se sobrescriban, cada uno tendrá **su propio archivo**:

| Archivo | Dueño | Contenido |
|---|---|---|
| `contenido/contenido.json` | Panel `/admin` | Programas, precios, fechas, textos comerciales, promociones, imágenes, visible/destacado |
| `src/Main.dc.html` | Claude (Artifact) | Diseño y estructura |

- El panel guarda en GitHub mediante una función privada de Vercel (la credencial
  vive solo en Vercel, nunca en el navegador). Cada guardado es una versión con
  historial; Vercel publica solo.
- Al preparar la publicación, `tools/build.mjs` combina el diseño con
  `contenido.json`.
- Antes de cualquier cambio de diseño, Claude **lee primero el `contenido.json`
  vigente** de GitHub y lo carga en el Artifact, para trabajar con los datos reales.
- Claude nunca sube `contenido.json`, y el panel nunca toca `Main.dc.html`.
- Cada guardado del panel comprueba que el archivo no haya cambiado desde que se
  abrió; si cambió (otra persona guardó antes), avisa en lugar de sobrescribir.
