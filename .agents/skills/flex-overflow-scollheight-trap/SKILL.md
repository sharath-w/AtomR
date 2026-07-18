---
name: flex-overflow-scollheight-trap
description: Diagnose when animating a flex container open by measuring its scrollHeight undercounts and the content collapses.
---

# Flex + overflow:auto scrollHeight undercount

## Symptom
You animate a container's height open by setting `container.style.height = container.scrollHeight + 'px'`. The container opens but is far too short — only the header/non-scroll children show; the scroll list inside is clipped to ~0 and its content is unreachable.

## Cause
The container is `display: flex; flex-direction: column`. One child is a scroll list with `overflow-y: auto`. Per the flexbox spec, a flex item whose `overflow` is not `visible` has its automatic minimum size (`min-height: auto`) resolve to **0**. So the flex algorithm squishes that item to ~0 to fit the container's current (animating) height, and `container.scrollHeight` reports only the non-squishable siblings — it never sees the list's real content height.

## Fix
Don't measure the parent's scrollHeight. Measure the parts:
```js
const head = container.querySelector('.head');
const headH = head ? head.offsetHeight : 0;
container.style.height = `${headH + list.scrollHeight}px`;
```
`list.scrollHeight` (the list's OWN scrollHeight) is its full scrollable content regardless of its squished visible height — so the total is correct.

Cap the container so the list scrolls instead of growing unbounded:
```css
.container { max-height: min(60vh, 520px); } /* or whatever */
.scroll-list { flex: 1 1 0; min-height: 0; overflow-y: auto; }
```

## When this applies
Any 'expand a panel to fit content' animation where the panel is a flex column and a child scrolls: comment drawers, accordion sections, side panels, notification lists. If the open-height measurement keeps returning only the header height, this is almost certainly it.
