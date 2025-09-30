const jsonInput = document.getElementById("jsonInput");
const pathOutput = document.getElementById("pathOutput");
const errorMessage = document.getElementById("errorMessage");

let ast = null;

function parseJson() {
  const content = jsonInput.value;
  if (!content.trim()) {
    ast = null;
    pathOutput.textContent = "$";
    errorMessage.textContent = "";
    return;
  }

  try {
    ast = jsonToAst(content, { loc: true, range: true });
    errorMessage.textContent = "";
  } catch (error) {
    ast = null;
    pathOutput.textContent = "—";
    const message = error && error.message ? error.message : "Не удалось разобрать JSON";
    errorMessage.textContent = `Ошибка: ${message}`;
  }
}

function updatePath() {
  if (!ast) {
    return;
  }
  const offset = jsonInput.selectionStart ?? 0;
  const path = getPathForOffset(ast, offset);
  pathOutput.textContent = path;
}

function getPathForOffset(root, offset) {
  const segments = traverse(root, offset, ["$"]);
  return segments ? segments.join("") : "$";
}

function traverse(node, offset, segments) {
  if (!node || typeof node.range === "undefined") {
    return null;
  }

  const [start, end] = node.range;
  if (offset < start || offset >= end) {
    return null;
  }

  switch (node.type) {
    case "Object": {
      if (!node.children || node.children.length === 0) {
        return segments;
      }

      for (const property of node.children) {
        const keySegments = segments.concat(`.${property.key.value}`);
        const keyRange = property.key.range;
        if (keyRange && offset >= keyRange[0] && offset < keyRange[1]) {
          return keySegments;
        }

        const valueMatch = traverse(property.value, offset, keySegments);
        if (valueMatch) {
          return valueMatch;
        }

        if (property.value.range && offset < property.value.range[0]) {
          return keySegments;
        }
      }

      return segments;
    }
    case "Array": {
      if (!node.children || node.children.length === 0) {
        return segments;
      }

      for (let index = 0; index < node.children.length; index += 1) {
        const child = node.children[index];
        const childSegments = segments.concat(`[${index}]`);
        const match = traverse(child, offset, childSegments);
        if (match) {
          return match;
        }

        if (child.range && offset < child.range[0]) {
          return segments;
        }
      }

      return segments;
    }
    case "Property":
    case "Literal":
    default:
      return segments;
  }
}

parseJson();
updatePath();

jsonInput.addEventListener("input", () => {
  const previousOffset = jsonInput.selectionStart;
  parseJson();
  if (typeof previousOffset === "number") {
    jsonInput.setSelectionRange(previousOffset, previousOffset);
  }
  updatePath();
});

jsonInput.addEventListener("click", updatePath);
jsonInput.addEventListener("keyup", updatePath);
jsonInput.addEventListener("mouseup", updatePath);

document.addEventListener("selectionchange", () => {
  if (document.activeElement === jsonInput) {
    updatePath();
  }
});
