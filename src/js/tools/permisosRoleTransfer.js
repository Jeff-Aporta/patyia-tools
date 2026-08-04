/** Textos de impacto al mover (no copiar) roles en el kanban de permisos. */

export function isTopDevLeadRole(roleName) {
  return String(roleName ?? "").trim().toUpperCase() === "DEVISS";
}

export function isSamePermisosUser(a, b) {
  const x = String(a ?? "").trim().toUpperCase();
  const y = String(b ?? "").trim().toUpperCase();
  return !!x && x === y;
}

/** Viñetas para modal de confirmación de move (quitar rol origen). */
export function moveRoleImpactBullets({ username, fromRoleTitle, toRoleTitle, isSelf, leavesDevLead }) {
  const user = String(username ?? "").trim().toUpperCase();
  const from = fromRoleTitle || "origen";
  const to = toRoleTitle || "destino";
  const bullets = [
    `${isSelf ? "Dejarás" : `${user} dejará`} de tener el rol **${from}** (solo quedará en **${to}**).`,
    `${isSelf ? "Perderás" : "Perderá"} permisos, rutas y privilegios asociados solo a **${from}**.`,
    `${isSelf ? "Desaparecerás" : "Desaparecerá"} de la columna **${from}** en este tablero.`,
    "Los demás roles que ya tenga el usuario no se modifican.",
  ];
  if (leavesDevLead) {
    bullets.push(
      isSelf
        ? "Al salir de **DEVISS** (máximo privilegio) perderás gestión de permisos hasta que otro DEVISS te reasigne o un administrador ajuste la BD."
        : `Al salir de **DEVISS**, ${user} necesitará que otro DEVISS lo reasigne o un ajuste manual en BD para recuperar el rol.`,
    );
  }
  return bullets;
}

/** Viñetas extra al quitar del rol (botón ×). */
export function removeRoleImpactBullets({ username, roleTitle, isSelf, isDevLead }) {
  const user = String(username ?? "").trim().toUpperCase();
  const role = roleTitle || "rol";
  const bullets = [
    `${isSelf ? "Perderás" : "Perderá"} permisos, rutas y privilegios de **${role}**.`,
    `${isSelf ? "Dejarás" : "Dejará"} de aparecer en la columna **${role}** del tablero.`,
    "Los otros roles asignados no cambian.",
  ];
  if (isDevLead) {
    bullets.push(
      isSelf
        ? "Si te quitas **DEVISS**, otro DEVISS deberá reasignarte o habrá que corregirlo en BD."
        : `Para restaurar **DEVISS** en ${user}, otro DEVISS deberá volver a asignar el rol.`,
    );
  } else {
    bullets.push("Para restaurar el acceso, un DEVISS puede volver a asignar el rol.");
  }
  return bullets;
}

/** ¿Se permite agregar usuario al rol destino (botón +)? Sin herencia — solo username presente. */
export function canAddUserToRole({ username } = {}) {
  if (!String(username ?? "").trim()) {
    return { ok: false, reason: "Indique un usuario." };
  }
  return { ok: true };
}
