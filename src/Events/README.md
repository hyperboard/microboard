# Events

To emit events and to apply them in correct order.

## Reordering

Example:

List of events:

| Order | Id  |
| ----- | --- |
| 1     | 1:1 |
| 2     | 1:2 |
|       | 1:3 |
|       | 1:4 |
| 3     | 2:1 |

Should be reordered to:

| Order | Id  |
| ----- | --- |
| 1     | 1:1 |
| 2     | 1:2 |
| 3     | 2:1 |
|       | 1:3 |
|       | 1:4 |

To reorder the events:

1. Revert event 1:4
2. Revert event 1:3
3. Apply event 2:1
4. Apply event 1:3
5. Apply event 1:4

If top event has no order pop it, revert it, push it on to stack until top event has an order. Then apply the new event. Then pop and apply every event from the stack.
