/* Local, visual-only analysis. It does not identify people, props, or camera settings. */
const PhotoClassifier = (() => {
  const size = 48;

  async function analyze(dataUrl) {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    let brightness = 0;
    let saturation = 0;
    let warmth = 0;
    let edges = 0;
    const luminance = new Float32Array(size * size);
    const fingerprint = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        const r = pixels[index] / 255;
        const g = pixels[index + 1] / 255;
        const b = pixels[index + 2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const light = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        luminance[y * size + x] = light;
        brightness += light;
        saturation += max === 0 ? 0 : (max - min) / max;
        warmth += r - b;
        if (x % 12 === 5 && y % 12 === 5) fingerprint.push(r, g, b);
      }
    }
    for (let y = 1; y < size; y++) {
      for (let x = 1; x < size; x++) {
        const position = y * size + x;
        edges += Math.abs(luminance[position] - luminance[position - 1]);
        edges += Math.abs(luminance[position] - luminance[position - size]);
      }
    }
    const count = size * size;
    brightness /= count;
    saturation /= count;
    warmth /= count;
    edges /= (size - 1) ** 2 * 2;
    const ratio = image.naturalWidth / image.naturalHeight;
    return {
      orientation: ratio > 1.12 ? '가로 사진' : ratio < 0.88 ? '세로 사진' : '정사각형 사진',
      lighting: brightness >= 0.72 ? '밝은 사진' : brightness < 0.38 ? '어두운 사진' : '은은한 사진',
      tone: saturation < 0.12 ? '담백한 색감' : warmth > 0.08 ? '따뜻한 색감' : warmth < -0.06 ? '차가운 색감' : '중성 색감',
      metrics: { brightness, saturation, warmth, edges, ratio },
      fingerprint
    };
  }

  function distance(a, b) {
    const left = a.classification;
    const right = b.classification;
    if (!left?.fingerprint || !right?.fingerprint) return Infinity;
    const length = Math.min(left.fingerprint.length, right.fingerprint.length);
    let squared = 0;
    for (let index = 0; index < length; index++) squared += (left.fingerprint[index] - right.fingerprint[index]) ** 2;
    const visual = Math.sqrt(squared / length);
    const first = left.metrics;
    const second = right.metrics;
    const orientation = left.orientation === right.orientation ? 0 : 0.14;
    return visual * 0.65 + Math.abs(first.brightness - second.brightness) * 0.16 + Math.abs(first.saturation - second.saturation) * 0.1 + Math.abs(first.edges - second.edges) * 0.09 + orientation;
  }

  function similarGroups(references) {
    const groups = [];
    for (const ref of references) {
      if (!ref.classification) {
        let unclassified = groups.find(group => group.unclassified);
        if (!unclassified) groups.push(unclassified = { unclassified: true, members: [] });
        unclassified.members.push(ref);
        continue;
      }
      let best = null;
      let bestDistance = Infinity;
      for (const group of groups) {
        if (group.unclassified) continue;
        const average = group.members.reduce((total, member) => total + distance(ref, member), 0) / group.members.length;
        if (average < bestDistance) { best = group; bestDistance = average; }
      }
      if (best && bestDistance <= 0.24) best.members.push(ref);
      else groups.push({ members: [ref] });
    }
    return groups;
  }

  return { analyze, similarGroups };
})();
