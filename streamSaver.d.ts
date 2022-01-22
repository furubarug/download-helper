declare const streamSaver: {
    createWriteStream: (
        fileName: string,
        options?: {
            size: null,
            pathname: null,
            writableStrategy: undefined,
            readableStrategy: undefined
        }
    ) => WritableStream
};

declare const createWriter: new(underlyingSource: {
    pull: (ctrl: { enqueue: (file: File) => void, close: () => void }) => Promise<void>
}) => ReadableStream & { pull: () => void };
