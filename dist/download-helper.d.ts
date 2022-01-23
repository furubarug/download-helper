export declare type DownloadObj = {
    posts: Record<string, PostObj[]>;
    id: string;
};
export declare type PostObj = {
    name: string;
    info: string;
    files: Record<string, FileObj[]>;
    html: string;
    tags: string[];
    cover?: FileObj;
};
export declare type FileObj = {
    url: string;
    name: string;
    extension: string;
};
export declare type DownloadJsonObj = {
    posts: {
        originalName: string;
        encodedName: string;
        informationText: string;
        htmlText: string;
        files: {
            url: string;
            originalName: string;
            encodedName: string;
        }[];
        tags: string[];
        cover?: {
            url: string;
            name: string;
        };
    }[];
    id: string;
    url: string;
    tags: string[];
    fileCount: number;
    postCount: number;
};
export declare class DownloadUtils {
    audioExtension: RegExp;
    imageExtension: RegExp;
    videoExtension: RegExp;
    isAudio(fileName: string): boolean;
    isImage(fileName: string): boolean;
    isVideo(fileName: string): boolean;
    httpGetAs<T = any>(url: string): T;
    encodeFileName(name: string): string;
    encodeURI(name: string): string;
    splitExt(name: string): string[];
    getFileName(name: string, extension: string, length: number, index: number): string;
    sleep(ms: number): Promise<unknown>;
    fetchWithLimit({ url, name }: {
        url: string;
        name: string;
    }, limit: number): Promise<Blob | null>;
    embedScript(url: string): Promise<unknown>;
}
export declare class DownloadObject {
    private readonly downloadObj;
    private readonly utils;
    private readonly orderedPosts;
    private url;
    private tags;
    constructor(id: string, utils: DownloadUtils);
    stringify(): string;
    setUrl(url: string): void;
    setTags(tags: string[]): void;
    addPost(name: string): PostObject;
    private countPost;
    private countFile;
    private collectTags;
}
export declare class PostObject {
    private readonly postObj;
    private readonly utils;
    constructor(postObj: PostObj, utils: DownloadUtils);
    setInfo(info: string): void;
    setHtml(html: string): void;
    setTags(tags: string[]): void;
    setCover(name: string, extension: string, url: string): FileObject;
    addFile(name: string, extension: string, url: string): FileObject;
    getAutoAssignedLinkTag(fileObject: FileObject): string;
    getAudioLinkTag(fileObject: FileObject): string;
    getFileLinkTag(fileObject: FileObject): string;
    getImageLinkTag(fileObject: FileObject): string;
    getVideoLinkTag(fileObject: FileObject): string;
    private getCurrentFilePath;
    toJsonObjBy(posts: Record<string, PostObj[]>): DownloadJsonObj['posts'][number];
    private collectFiles;
}
export declare class FileObject {
    private readonly fileObj;
    private readonly utils;
    constructor(fileObj: FileObj, utils: DownloadUtils);
    getEncodedName(): string;
    getEncodedExtension(): string;
    getOriginalName(): string;
    getOriginalExtension(): string;
    getUrl(): string;
    equals(obj: any): boolean;
}
export declare class DownloadHelper {
    private readonly utils;
    constructor(utils: DownloadUtils);
    bootCSS: {
        href: string;
        integrity: string;
    };
    bootJS: {
        src: string;
        integrity: string;
    };
    vueJS: {
        src: string;
    };
    createDownloadUI(title: string): Promise<void>;
    downloadZip(downloadObj: any, progress: (n: number) => void, log: (s: string) => void, remainTime: (r: string) => void): Promise<void>;
    isDownloadJsonObj(target: any): target is DownloadJsonObj;
    createRootHtmlFromPosts(downloadObj: DownloadJsonObj): string;
    createCoverHtmlFromPost(post: DownloadJsonObj['posts'][number]): string;
    createHtmlFromBody(title: string, body: string): string;
}
//# sourceMappingURL=download-helper.d.ts.map