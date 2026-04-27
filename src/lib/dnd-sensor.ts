import { PointerSensor } from '@dnd-kit/core';

function shouldActivate(event: PointerEvent): boolean {
  if (event.button !== 0) return false;
  const target = event.target as HTMLElement;
  if (
    target.closest('.card-body') ||
    target.closest('.card-locked-body') ||
    target.closest('.card-body-preview') ||
    target.closest('.card-actions-wrapper') ||
    target.closest('button')
  )
    return false;
  // Block drag when a contenteditable element has focus (user is actively editing)
  const focused = document.activeElement;
  if (
    focused instanceof HTMLElement &&
    focused.contentEditable === 'true' &&
    (focused === target || focused.contains(target))
  )
    return false;
  return true;
}

export class AppPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: { nativeEvent: PointerEvent }): boolean =>
        shouldActivate(nativeEvent),
    },
  ];
}
