import { layout, layoutNextLine, layoutWithLines, prepare, prepareWithSegments } from '../pretext';
import type { LayoutCursor } from '../pretext';

export interface FlowLine {
  text: string;
  x: number;
  y: number;
  width: number;
  regionId: string;
}

export interface FlowRegion {
  id: string;
  x: number;
  y: number;
  height: number;
  widthAtY: (localY: number) => number;
  xOffsetAtY?: (localY: number) => number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return lerp(outMin, outMax, t);
}

export function estimateBlockHeight(text: string, font: string, width: number, lineHeight: number): number {
  const prepared = prepare(text, font);
  return layout(prepared, width, lineHeight).height;
}

export function getLinesForWidth(text: string, font: string, width: number, lineHeight: number) {
  const prepared = prepareWithSegments(text, font);
  return layoutWithLines(prepared, width, lineHeight).lines;
}

export function flowTextThroughRegions(
  text: string,
  font: string,
  lineHeight: number,
  regions: FlowRegion[]
): { lines: FlowLine[]; exhausted: boolean } {
  const prepared = prepareWithSegments(text, font);
  const lines: FlowLine[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };

  for (const region of regions) {
    let localY = 0;
    while (localY + lineHeight <= region.height) {
      const width = region.widthAtY(localY);
      if (width < 36) {
        localY += lineHeight;
        continue;
      }

      const next = layoutNextLine(prepared, cursor, width);
      if (!next) {
        return { lines, exhausted: true };
      }

      lines.push({
        text: next.text,
        x: region.x + (region.xOffsetAtY ? region.xOffsetAtY(localY) : 0),
        y: region.y + localY,
        width: next.width,
        regionId: region.id,
      });

      cursor = next.end;
      localY += lineHeight;
    }
  }

  return { lines, exhausted: false };
}
