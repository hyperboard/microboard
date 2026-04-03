# Transformation

To do common transformation on items like translation, scaling and rotation.

# Matrix

To combine multiple transformations into one as if they all were applied in order multiply a matrix by a matrix.

You need to transform in a correct order. Matrix multiplication is associative but not commutative. Take the matrix of the first transformation and multiply it by the matrix of the next.

In mathematical notation matricies are written from right to left (the first transformation is on the right and the last transformation is on the left).

A Matrix in the end gets applied to a [Point](../Point/README.md) or a [Mbr](../Mbr/README.md).

A Matrix at the start can be applied to a [Shape](../Shape/README.md), [Text](../RichText/README.md) or [Path](../Path/README.md).

A Shape stores its Transformation and Path. When shapes transformation changes it shoud either apply the same change to the Path or reset path to its original state and apply the changed transformation to it.
