import { DOMWrapper } from '@vue/test-utils'

/** Find a button by its accessible name (aria-label, else its text). */
export function button(root: ParentNode, name: string): DOMWrapper<HTMLButtonElement> {
  const found = Array.from(root.querySelectorAll('button')).find(
    (candidate) => (candidate.getAttribute('aria-label') ?? candidate.textContent?.trim()) === name,
  )
  if (!found) throw new Error(`No button named "${name}"`)
  return new DOMWrapper(found)
}

/** Find an input by the text of its <label for>. */
export function field(root: ParentNode, label: string): DOMWrapper<HTMLInputElement> {
  const labelElement = Array.from(root.querySelectorAll('label')).find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  const id = labelElement?.getAttribute('for')
  const input = id ? root.querySelector<HTMLInputElement>(`[id="${id}"]`) : null
  if (!input) throw new Error(`No input for label "${label}"`)
  return new DOMWrapper(input)
}

/** Find an element by ARIA role-like selector and accessible name via aria-labelledby. */
export function region(root: ParentNode, name: string): HTMLElement {
  const found = Array.from(root.querySelectorAll<HTMLElement>('section[aria-labelledby]')).find((section) => {
    const titleId = section.getAttribute('aria-labelledby')
    return titleId !== null && root.querySelector(`[id="${titleId}"]`)?.textContent?.trim() === name
  })
  if (!found) throw new Error(`No region "${name}"`)
  return found
}

/** The text shown in the value box of a stepper group, found by the group's name. */
export function stepperValue(root: ParentNode, name: string): string {
  const group = Array.from(root.querySelectorAll<HTMLElement>('[role="group"]')).find((element) => {
    const labelId = element.getAttribute('aria-labelledby')
    return labelId !== null && root.querySelector(`[id="${labelId}"]`)?.textContent?.trim() === name
  })
  const value = group?.querySelector('output')
  if (!value) throw new Error(`No stepper "${name}"`)
  return value.textContent?.trim() ?? ''
}
