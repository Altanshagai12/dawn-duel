// Network snapshots are frequent; unchanged HUD values must not invalidate DOM.
export function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

export function setStyle(node, property, value) {
  if (node.style[property] !== value) node.style[property] = value;
}

export function setClass(node, name, enabled) {
  if (node.classList.contains(name) !== enabled) node.classList.toggle(name, enabled);
}
