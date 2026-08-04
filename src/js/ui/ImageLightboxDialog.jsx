import { getReact, getMaterialUI } from "../core/platform.ts";
import { Lightbox } from "../core/platform.ts";
import { ensureLightboxReady, isLightboxZoomReady } from "../core/lightboxBoot.ts";

const { useEffect, useState } = getReact();

/** Puente local → ISAComponents.LightboxZoom (carga lazy si el boot no alcanzó). */
export function ImageLightboxDialog(props) {
  const { open, onClose } = props;
  const [ready, setReady] = useState(() => isLightboxZoomReady());
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!open || ready) return undefined;
    let cancelled = false;
    ensureLightboxReady()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err);
      });
    return () => { cancelled = true; };
  }, [open, ready]);

  if (!open) return null;

  if (loadError) {
    const { Typography, Box } = getMaterialUI();
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" color="error">
          No se pudo cargar el visor de imágenes. Recargue sin caché (Ctrl+Shift+R).
        </Typography>
      </Box>
    );
  }

  if (!ready) return null;

  const Comp = Lightbox.ImageLightboxDialog;
  return <Comp ns="ISA" {...props} onClose={onClose} />;
}
