import { chunkText } from './core/chunk/chunker.ts';

const text = 'First sentence. Second sentence. Third sentence.';
console.log('Text:', text);
console.log('Length:', text.length);
const result = chunkText(text, 50, 10);
console.log('Result:', result);
console.log('Result length:', result.length);
result.forEach((chunk, i) => {
  console.log(`Chunk ${i}:`, chunk);
});
