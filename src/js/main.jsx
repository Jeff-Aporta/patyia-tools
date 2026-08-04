/** Punto de entrada — monta la app tras ISAFront + AppShell. */
import { mountApp } from "./app/App.jsx";

window.ISA = window.ISA || {};
window.ISA.mount = mountApp;
mountApp();
