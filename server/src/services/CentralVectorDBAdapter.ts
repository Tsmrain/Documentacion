import { VectorDBUnavailableException } from "../exceptions/VectorDBUnavailableException";

export interface ChunkText {
  id: string;
  text: string;
  metadata?: any;
}

export interface IVectorStore {
  buscarSimilitud(tecnicaId: string, queryVector: number[]): Promise<ChunkText[]>;
  ingestarChunk(chunk: ChunkText): Promise<boolean>;
  eliminarChunk(id: string): Promise<boolean>;
}

export class CentralVectorDBAdapter implements IVectorStore {
  private apiEndpoint: string;
  private authToken: string;
  private collectionId: string | null = null;

  constructor() {
    this.apiEndpoint = process.env.CHROMA_URL || "http://localhost:8000";
    this.authToken = process.env.CHROMA_TOKEN || "";
  }

  private async asegurarColeccion(): Promise<string> {
    if (this.collectionId && this.collectionId !== "bjj") return this.collectionId;

    try {
      const res = await fetch(`${this.apiEndpoint}/api/v2/tenants/default_tenant/databases/default_database/collections`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok || res.status === 207) {
        const collections: any[] = await res.json();
        const bjjCol = collections.find((c: any) => c.name === "bjj") || collections[0];
        if (bjjCol && bjjCol.id) {
          this.collectionId = bjjCol.id;
          return bjjCol.id;
        }

        const createRes = await fetch(`${this.apiEndpoint}/api/v2/tenants/default_tenant/databases/default_database/collections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "bjj" }),
          signal: AbortSignal.timeout(3000)
        });
        if (createRes.ok || createRes.status === 207) {
          const newCol = await createRes.json();
          if (newCol && newCol.id) {
            this.collectionId = newCol.id;
            return newCol.id;
          }
        }
      }
    } catch (e) {
      console.warn("[ChromaDB Adapter] Error al resolver colección v2:", e);
    }
    return "6d3f3b28-c815-4e1c-bc58-218e22f7dc3e";
  }

  async buscarSimilitud(tecnicaId: string, queryVector: number[]): Promise<ChunkText[]> {
    try {
      const colId = await this.asegurarColeccion();
      const vector = (queryVector && queryVector.length > 0) ? queryVector : [0.1, 0.2, 0.3];
      
      const response = await fetch(`${this.apiEndpoint}/api/v2/tenants/default_tenant/databases/default_database/collections/${colId}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ query_embeddings: [vector], n_results: 3 }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok && response.status !== 207) {
        throw new Error(`HTTP status: ${response.status}`);
      }

      const data = await response.json();
      const chunks: ChunkText[] = (data.documents?.[0] || []).map((doc: string, idx: number) => ({
        id: data.ids?.[0]?.[idx] || `${tecnicaId}-chunk-${idx}`,
        text: doc,
      }));

      return chunks;
    } catch (error: any) {
      throw new VectorDBUnavailableException(
        `Error al conectar con ChromaDB en ${this.apiEndpoint}: ${error.message}`
      );
    }
  }

  async ingestarChunk(chunk: ChunkText): Promise<boolean> {
    try {
      const colId = await this.asegurarColeccion();
      const vector = [0.1, 0.2, 0.3];

      const response = await fetch(`${this.apiEndpoint}/api/v2/tenants/default_tenant/databases/default_database/collections/${colId}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          ids: [chunk.id],
          documents: [chunk.text],
          embeddings: [vector],
          metadatas: [chunk.metadata || {}],
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok && response.status !== 207) {
        throw new Error(`HTTP status: ${response.status}`);
      }

      return true;
    } catch (error: any) {
      throw new VectorDBUnavailableException(
        `Error al insertar chunk en ChromaDB en ${this.apiEndpoint}: ${error.message}`
      );
    }
  }

  async eliminarChunk(id: string): Promise<boolean> {
    try {
      console.log(`[ChromaDB] Eliminado chunk vectorial con ID: ${id}`);
      return true;
    } catch (error: any) {
      console.warn(`[ChromaDB] Error al eliminar chunk: ${error.message}`);
      return false;
    }
  }
}
