import { VectorStore } from './services/vectorStore';

async function main() {
  const store = new VectorStore();
  await store.init();
  const collection = (store as any).collection;
  if (!collection) {
    console.log('Collection not found');
    return;
  }
  
  // Get all items (up to 500)
  const result = await collection.get({
    limit: 500
  });
  
  console.log('Total items retrieved from ChromaDB:', result.ids.length);
  
  const counts: Record<any, number> = {};
  for (const meta of result.metadatas || []) {
    if (meta && meta.fuenteId !== undefined) {
      counts[meta.fuenteId] = (counts[meta.fuenteId] || 0) + 1;
    } else {
      counts['no-fuente-id'] = (counts['no-fuente-id'] || 0) + 1;
    }
  }
  
  console.log('Chunk counts per fuenteId in ChromaDB:', counts);
}

main().catch(console.error);
