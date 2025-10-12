import { z } from 'zod';
import { ChunkProcessor } from '../core/chunk/processor';
import { EmbeddingGenerator } from '../core/embed/generator';
import { CryptoService } from '../core/crypto/encrypt';

const WorkerConfigSchema = z.object({
    batchSize: z.number().int().min(1).max(32).default(8),
    maxRetries: z.number().int().min(1).max(5).default(3),
    retryDelay: z.number().int().min(1000).max(30000).default(5000),
});

export type WorkerConfig = z.infer<typeof WorkerConfigSchema>;

export interface EmbeddingJob {
    id: string;
    entryId: string;
    content: string;
    occurredAt: number;
    priority: number;
    retries: number;
}

export interface EmbeddingResult {
    jobId: string;
    chunks: Array<{
        id: string;
        text: string;
        embedding: Float32Array;
        startOff: number;
        endOff: number;
    }>;
    success: boolean;
    error?: string;
}

export class EmbeddingWorker {
    private chunkProcessor: ChunkProcessor;
    private embeddingGenerator: EmbeddingGenerator;
    private config: WorkerConfig;
    private isProcessing: boolean = false;
    private queue: EmbeddingJob[] = [];

    constructor(config: Partial<WorkerConfig> = {}) {
        this.config = WorkerConfigSchema.parse({
            batchSize: 8,
            maxRetries: 3,
            retryDelay: 5000,
            ...config,
        });

        this.chunkProcessor = new ChunkProcessor();
        this.embeddingGenerator = new EmbeddingGenerator();
    }

    async initialize(): Promise<void> {
        await this.embeddingGenerator.initialize();
    }

    async addJob(job: Omit<EmbeddingJob, 'id' | 'retries'>): Promise<string> {
        const jobId = crypto.randomUUID();
        const fullJob: EmbeddingJob = {
            ...job,
            id: jobId,
            retries: 0,
        };

        this.queue.push(fullJob);
        this.queue.sort((a, b) => b.priority - a.priority);

        if (!this.isProcessing) {
            this.processQueue();
        }

        return jobId;
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        try {
            const batch = this.queue.splice(0, this.config.batchSize);
            const results = await Promise.allSettled(
                batch.map(job => this.processJob(job))
            );

            // Handle results and retries
            for (let i = 0; i < batch.length; i++) {
                const job = batch[i];
                const result = results[i];

                if (result.status === 'rejected') {
                    await this.handleJobFailure(job, result.reason);
                } else {
                    await this.handleJobSuccess(job, result.value);
                }
            }
        } catch (error) {
            console.error('Error processing embedding queue:', error);
        } finally {
            this.isProcessing = false;

            // Continue processing if there are more jobs
            if (this.queue.length > 0) {
                setTimeout(() => this.processQueue(), 1000);
            }
        }
    }

    private async processJob(job: EmbeddingJob): Promise<EmbeddingResult> {
        try {
            // Chunk the text
            const chunks = this.chunkProcessor.processText(
                job.content,
                job.entryId,
                job.occurredAt
            );

            // Generate embeddings for chunks
            const texts = chunks.map(c => c.text);
            const embeddings = await this.embeddingGenerator.generateBatchEmbeddings(texts);

            // Combine chunks with embeddings
            const result: EmbeddingResult = {
                jobId: job.id,
                chunks: chunks.map((chunk, index) => ({
                    id: chunk.id,
                    text: chunk.text,
                    embedding: embeddings[index].vector,
                    startOff: chunk.startOff,
                    endOff: chunk.endOff,
                })),
                success: true,
            };

            return result;
        } catch (error) {
            throw new Error(`Failed to process job ${job.id}: ${error}`);
        }
    }

    private async handleJobSuccess(
        job: EmbeddingJob,
        result: EmbeddingResult
    ): Promise<void> {
        // Store embeddings in database
        // This would integrate with your database layer
        console.log(`Successfully processed job ${job.id} with ${result.chunks.length} chunks`);

        // Emit success event
        this.emit('jobSuccess', { job, result });
    }

    private async handleJobFailure(
        job: EmbeddingJob,
        error: any
    ): Promise<void> {
        job.retries++;

        if (job.retries < this.config.maxRetries) {
            // Retry with exponential backoff
            const delay = this.config.retryDelay * Math.pow(2, job.retries - 1);
            setTimeout(() => {
                this.queue.push(job);
                this.processQueue();
            }, delay);
        } else {
            // Max retries exceeded
            console.error(`Job ${job.id} failed after ${job.retries} retries:`, error);
            this.emit('jobFailed', { job, error });
        }
    }

    private emit(event: string, data: any): void {
        // Event emitter implementation
        // This would integrate with your event system
        console.log(`Event: ${event}`, data);
    }

    getQueueStatus(): {
        total: number;
        processing: boolean;
        nextJob?: EmbeddingJob;
    } {
        return {
            total: this.queue.length,
            processing: this.isProcessing,
            nextJob: this.queue[0],
        };
    }

    clearQueue(): void {
        this.queue = [];
    }
}
