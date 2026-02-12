/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate Euclidean distance between two vectors
 * Lower values mean more similar
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Find top K most similar vectors using cosine similarity
 */
export function findTopKSimilar(
  query: number[],
  vectors: number[][],
  k: number = 5,
  minSimilarity: number = 0
): Array<{ index: number; similarity: number }> {
  const similarities = vectors.map((vector, index) => ({
    index,
    similarity: cosineSimilarity(query, vector)
  }));

  // Filter by minimum similarity
  const filtered = similarities.filter(item => item.similarity >= minSimilarity);

  // Sort by similarity (descending)
  filtered.sort((a, b) => b.similarity - a.similarity);

  // Return top K
  return filtered.slice(0, k);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude === 0) {
    return vector;
  }

  return vector.map(val => val / magnitude);
}

/**
 * Calculate average vector (centroid)
 */
export function averageVector(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error('Cannot calculate average of empty vector array');
  }

  const dimensions = vectors[0].length;
  const sum = new Array(dimensions).fill(0);

  for (const vector of vectors) {
    if (vector.length !== dimensions) {
      throw new Error('All vectors must have the same dimensions');
    }
    for (let i = 0; i < dimensions; i++) {
      sum[i] += vector[i];
    }
  }

  return sum.map(val => val / vectors.length);
}

/**
 * Calculate vector magnitude (L2 norm)
 */
export function vectorMagnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
  }

  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Test similarity functions
 */
export function testSimilarity(): void {
  console.log('[Similarity] 🧪 Testing similarity functions...');

  // Test vectors
  const v1 = [1, 0, 0];
  const v2 = [1, 0, 0];
  const v3 = [0, 1, 0];
  const v4 = [0.7, 0.7, 0];

  console.log('Vector 1:', v1);
  console.log('Vector 2:', v2);
  console.log('Vector 3:', v3);
  console.log('Vector 4:', v4);

  console.log('\n--- Cosine Similarity ---');
  console.log('v1 vs v2 (identical):', cosineSimilarity(v1, v2)); // Should be 1.0
  console.log('v1 vs v3 (orthogonal):', cosineSimilarity(v1, v3)); // Should be 0.0
  console.log('v1 vs v4 (45 degrees):', cosineSimilarity(v1, v4)); // Should be ~0.707

  console.log('\n--- Euclidean Distance ---');
  console.log('v1 vs v2 (identical):', euclideanDistance(v1, v2)); // Should be 0.0
  console.log('v1 vs v3 (orthogonal):', euclideanDistance(v1, v3)); // Should be ~1.414
  console.log('v1 vs v4:', euclideanDistance(v1, v4));

  console.log('\n--- Normalization ---');
  const normalized = normalizeVector([3, 4]); // Should be [0.6, 0.8]
  console.log('Normalize [3, 4]:', normalized);
  console.log('Magnitude:', vectorMagnitude(normalized)); // Should be 1.0

  console.log('\n--- Average Vector ---');
  const avg = averageVector([[1, 0], [0, 1], [1, 1]]);
  console.log('Average of [[1,0], [0,1], [1,1]]:', avg); // Should be [0.667, 0.667]

  console.log('\n✅ All tests completed');
}
