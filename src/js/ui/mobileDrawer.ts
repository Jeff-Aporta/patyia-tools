/** Paper del Drawer móvil: ancho/alto acotados al viewport del iframe o ventana. */
export const MOBILE_DRAWER_PAPER_SX = {
  width: "min(300px, calc(100vw - 12px))",
  maxWidth: "100%",
  height: "100%",
  maxHeight: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
} as const;

export function mobileDrawerPaperProps(className: string) {
  return {
    className,
    sx: MOBILE_DRAWER_PAPER_SX,
  };
}
