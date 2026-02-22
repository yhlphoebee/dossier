export const GRAPHIC_ELEMENTS = [
  '/graphic-01.png',
  '/graphic-02.png',
  '/graphic-03.png',
  '/graphic-04.png',
]

export function getGraphicElement(index: number): string {
  return GRAPHIC_ELEMENTS[index % GRAPHIC_ELEMENTS.length]
}
