// Utility functions for highlight management

export const hasCSSHighlights = () => 
  typeof CSS !== 'undefined' && 'highlights' in CSS && 
  typeof window !== 'undefined' && 'Highlight' in window;

export function clearPaint(id) {
  if (hasCSSHighlights()) {
    CSS.highlights.delete(id);
  }
  const overlays = document.querySelectorAll(`[data-group="${id}"]`);
  overlays.forEach(n => n.remove());
}

export function paintRange(range, id, layerEl, styleTag) {
  clearPaint(id);
  if (hasCSSHighlights()) {
    const hl = new window.Highlight(range);
    CSS.highlights.set(id, hl);
    
    // Inject CSS rule for this highlight
    if (styleTag && !styleTag.innerHTML.includes(`::highlight(${id})`)) {
      styleTag.innerHTML += `\n  ::highlight(${id}) { background-color: rgba(245, 207, 87, 0.35); }`;
    }
  } else {
    if (!layerEl) return;
    for (const rect of range.getClientRects()) {
      const el = document.createElement('div');
      el.className = 'overlay-rect';
      el.dataset.group = id;
      Object.assign(el.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`
      });
      layerEl.appendChild(el);
    }
  }
}

export function serializeRange(range, root) {
  function getPath(node, ancestor) {
    const path = [];
    while (node && node !== ancestor) {
      const parent = node.parentNode;
      if (!parent) break;
      const index = Array.from(parent.childNodes).indexOf(node);
      path.unshift(index);
      node = parent;
    }
    return path;
  }
  
  return {
    startPath: getPath(range.startContainer, root),
    startOffset: range.startOffset,
    endPath: getPath(range.endContainer, root),
    endOffset: range.endOffset
  };
}

export function deserializeRange(serialized, root) {
  function getNode(path, ancestor) {
    let node = ancestor;
    for (const index of path) {
      if (!node || !node.childNodes[index]) return null;
      node = node.childNodes[index];
    }
    return node;
  }
  
  const startNode = getNode(serialized.startPath, root);
  const endNode = getNode(serialized.endPath, root);
  
  if (!startNode || !endNode) return null;
  
  try {
    const range = document.createRange();
    range.setStart(startNode, serialized.startOffset);
    range.setEnd(endNode, serialized.endOffset);
    return range;
  } catch (e) {
    return null;
  }
}
