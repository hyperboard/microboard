# Camera

to get Board Point From View Point

```
const x = view.x * viewScale + boardZero.x;
const y = view.y * viewScale + boardZero.y;
```

to get Board Zero To Sync View And Board Points With New View Scale

```
const x = view.x - board.x * viewScale;
const y = view.y - board.y * viewScale;
```

to get View Point From Board Point

```
const x = (board.x - boardZero.x) / viewScale;
const y = (board.y - boardZero.y) / viewScale;
```
