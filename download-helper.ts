/**
 * ダウンロード用のObject
 */
export type DownloadObj = { posts: Record<string, PostObj[]>, id: string };

/**
 * 投稿情報のObject
 */
export type PostObj = { name: string, info: string, files: Record<string, FileObj[]>, html: string, cover?: FileObj };

/**
 * ファイル用のObject
 */
export type FileObj = { url: string, name: string, extension: string };

/**
 * ダウンロード用JSON元オブジェクト
 */
export type DownloadJsonObj = {
    posts: {
        originalName: string,
        encodedName: string,
        informationText: string,
        htmlText: string,
        files: { url: string, originalName: string, encodedName: string }[],
        cover?: { url: string, name: string }
    }[];
    id: string;
    fileCount: number;
    postCount: number;
};

/**
 * ダウンロード用のUtilityクラス
 */
export class DownloadUtils {
    /**
     * 保存するファイル名のエンコード
     * 主にwindowsで使えないファイル名のエスケープ処理をする
     * @param name ファイル名
     */
    encodeFileName(name: string): string {
        return name
            .replace(/\//g, "／")
            .replace(/\\/g, "＼")
            .replace(/,/g, "，")
            .replace(/:/g, "：")
            .replace(/\*/g, "＊")
            .replace(/"/g, "“")
            .replace(/</g, "＜")
            .replace(/>/g, "＞")
            .replace(/\|/g, "｜")
            .trimEnd();
    }

    /**
     * URIのエンコード
     * @param name ファイル名
     */
    encodeURI(name: string): string {
        return this.encodeFileName(name).replaceAll(/[;,/?:@&=+$#]/g, encodeURIComponent)
    }

    /**
     * 拡張子の分割
     * @param name ファイル名
     */
    splitExt(name: string): string[] {
        return name.split(/(?=\.[^.]+$)/);
    }

    /**
     * 同一名の設定
     * @param name 名
     * @param extension 拡張子(.を含む)
     * @param length インデックスの最大値
     * @param index インデックス
     */
    getFileName(name: string, extension: string, length: number, index: number): string {
        return length <= 1 ? `${name}${extension}` : `${name}_${index}${extension}`
    }
}

/**
 * ダウンロード用のオブジェクトラッパークラス
 */
export class DownloadObject {
    private readonly downloadObj: DownloadObj;
    private readonly utils: DownloadUtils;
    private readonly orderedPosts: PostObject[] = [];

    constructor(id: string, utils: DownloadUtils) {
        this.downloadObj = {posts: {}, id};
        this.utils = utils;
    }

    stringify(): string {
        const downloadJson: DownloadJsonObj = {
            posts: this.orderedPosts.map(it => it.toJsonObjBy(this.downloadObj.posts)),
            id: this.downloadObj.id,
            postCount: this.countPost(),
            fileCount: this.countFile()
        };
        return JSON.stringify(downloadJson);
    }

    addPost(name: string): PostObject {
        const encodedName = this.utils.encodeFileName(name);
        if (this.downloadObj.posts[encodedName] === undefined) {
            this.downloadObj.posts[encodedName] = [];
        }
        const postObj: PostObj = {name, info: '', files: {}, html: ''};
        this.downloadObj.posts[encodedName].push(postObj);
        const postObject = new PostObject(postObj, this.utils);
        this.orderedPosts.push(postObject);
        return postObject;
    }

    private countPost(): number {
        return Object.values(this.downloadObj.posts).reduce((s, posts) => s + posts.length, 0);
    }

    private countFile(): number {
        return Object.values(this.downloadObj.posts).reduce((allFileSize, posts) =>
                allFileSize + posts.reduce((postFileSize, post) =>
                        postFileSize + Object.values(post.files).reduce((s, files) =>
                            s + files.length, 0
                        ), 0
                ), 0
        );
    }
}

/**
 * 投稿情報オブジェクトラッパークラス
 */
export class PostObject {
    private readonly postObj: PostObj;
    private readonly utils: DownloadUtils;

    constructor(postObj: PostObj, utils: DownloadUtils) {
        this.postObj = postObj;
        this.utils = utils;
    }

    setInfo(info: string) {
        this.postObj.info = info;
    }

    setHtml(html: string) {
        this.postObj.html = html;
    }

    setCover(name: string, extension: string, url: string): FileObject {
        const fileObj: FileObj = {name, extension: extension ? `.${extension}` : "", url};
        this.postObj.cover = fileObj;
        return new FileObject(fileObj, this.utils);
    }

    addFile(name: string, extension: string, url: string): FileObject {
        const encodedName = this.utils.encodeFileName(name);
        if (this.postObj.files[encodedName] === undefined) {
            this.postObj.files[encodedName] = [];
        }
        const fileObj: FileObj = {name, extension: extension ? `.${extension}` : "", url};
        this.postObj.files[encodedName].push(fileObj);
        return new FileObject(fileObj, this.utils);
    }


    getImageLinkTag(fileObject: FileObject): string {
        const filePath = this.getCurrentFilePath(fileObject);
        return `<a class="hl" href="${filePath}" download="${fileObject.getEncodedName() + fileObject.getEncodedExtension()}"><div class="post card">\n` +
            `<img class="card-img-top" src="${filePath}" alt="${fileObject.getOriginalName()}"/>\n</div></a>`;
    }

    getFileLinkTag(fileObject: FileObject): string {
        const filePath = this.getCurrentFilePath(fileObject);
        return `<span><a href="${filePath}" download="${fileObject.getEncodedName() + fileObject.getEncodedExtension()}">${fileObject.getOriginalName()}</a></span>`;
    }

    private getCurrentFilePath(fileObject: FileObject): string {
        const encodedName = fileObject.getEncodedName();
        if (fileObject.equals(this.postObj.cover)) {
            const fileName = this.utils.getFileName(encodedName, fileObject.getEncodedExtension(), 1, 1);
            return `./${this.utils.encodeURI(fileName)}`;
        }
        if (this.postObj.files[encodedName] === undefined) {
            throw new Error(`file object is undefined: ${fileObject.getOriginalName()}`)
        }
        const index = this.postObj.files[encodedName].findIndex(it => fileObject.equals(it));
        if (index < 0) {
            throw new Error(`file object is not found: ${fileObject.getOriginalName()}`)
        }
        const fileName = this.utils.getFileName(encodedName, fileObject.getEncodedExtension(), this.postObj.files[encodedName].length, index + 1);
        return `./${this.utils.encodeURI(fileName)}`;
    }

    toJsonObjBy(posts: Record<string, PostObj[]>): DownloadJsonObj['posts'][number] {
        const key = this.utils.encodeFileName(this.postObj.name);
        const postIndex = posts[key]?.indexOf(this.postObj);
        if (postIndex === undefined || postIndex < 0) {
            throw new Error(`post object is not found: ${this.postObj.name}`);
        }
        const encodedName = this.utils.getFileName(key, "", posts[key].length, postIndex + 1);
        const cover = this.postObj.cover ? {
            url: this.postObj.cover.url,
            name: this.utils.getFileName(this.postObj.cover.name, this.postObj.cover.extension, 1, 1)
        } : undefined;
        return {
            originalName: this.postObj.name,
            encodedName,
            informationText: this.postObj.info,
            htmlText: this.postObj.html,
            files: this.collectFiles(),
            cover
        };
    }

    private collectFiles(): DownloadJsonObj['posts'][number]['files'] {
        // 順序自由
        const ret: DownloadJsonObj['posts'][number]['files'] = [];
        for (const [key, fileObjArray] of Object.entries(this.postObj.files)) {
            let fileIndex = 0;
            for (const fileObj of fileObjArray) {
                fileIndex++;
                const extension = fileObj.extension ? this.utils.encodeFileName(fileObj.extension) : "";
                const encodedName = this.utils.getFileName(key, extension, fileObjArray.length, fileIndex);
                ret.push({
                    url: fileObj.url,
                    originalName: fileObj.name,
                    encodedName
                });
            }
        }
        return ret;
    }
}

/**
 * ファイルオブジェクトラッパークラス
 */
export class FileObject {
    private readonly fileObj: FileObj;
    private readonly utils: DownloadUtils;

    constructor(fileObj: FileObj, utils: DownloadUtils) {
        this.fileObj = fileObj;
        this.utils = utils;
    }

    getEncodedName(): string {
        return this.utils.encodeFileName(this.fileObj.name);
    }

    getEncodedExtension(): string {
        return this.fileObj.extension ? this.utils.encodeFileName(this.fileObj.extension) : "";
    }

    getOriginalName(): string {
        return this.fileObj.name;
    }

    getUrl(): string {
        return this.fileObj.url;
    }

    equals(obj: any): boolean {
        if (typeof obj != 'object') {
            return false;
        }
        return obj.name === this.fileObj.name && obj.url === this.fileObj.url;
    }
}

/**
 * ダウンロード用のヘルパー
 */
export class DownloadHelper {
    private readonly utils: DownloadUtils;

    constructor(utils: DownloadUtils) {
        this.utils = utils;
    }

    /**
     * bootstrapのCSS情報
     */
    bootCSS = {
        href: "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/css/bootstrap.min.css",
        integrity: "sha384-giJF6kkoqNQ00vy+HMDP7azOuL0xtbfIcaT9wjKHr8RbDVddVHyTfAAsrekwKmP1",
    };

    /**
     * bootstrapのjs情報
     */
    bootJS = {
        src: "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/js/bootstrap.bundle.min.js",
        integrity: "sha384-ygbV9kiqUc6oa4msXn9868pTtWMgiQaeYH7/t7LECLbyPA2x65Kgf80OJFdroafW",
    };

    /**
     * カバー画像代替対象拡張子
     */
    coverExt = /\.(apng|avif|gif|jpg|jpeg|jfif|pjpeg|pjp|png|svg|webp)$/;

    /**
     * ダウンロード用のUIを作成する
     * @param title ダウンローダーの名前
     */
    async createDownloadUI(title: string) {
        document.head.innerHTML = "";
        document.body.innerHTML = "";
        document.getElementsByTagName("html")[0].style.height = "100%";
        document.body.style.height = "100%";
        document.body.style.margin = "0";
        document.title = title;

        let bootLink = document.createElement("link");
        bootLink.href = this.bootCSS.href;
        bootLink.rel = "stylesheet";
        bootLink.integrity = this.bootCSS.integrity;
        bootLink.crossOrigin = "anonymous";
        document.head.appendChild(bootLink);

        let bodyDiv = document.createElement("div");
        bodyDiv.style.display = "flex";
        bodyDiv.style.alignItems = "center";
        bodyDiv.style.justifyContent = "center";
        bodyDiv.style.flexDirection = "column";
        bodyDiv.style.height = "100%";
        let inputDiv = document.createElement("div");
        inputDiv.className = "input-group mb-2";
        inputDiv.style.width = "400px";
        let input = document.createElement("input");
        input.type = "text"
        input.className = "form-control"
        input.placeholder = "ここにJSONを貼り付け"
        inputDiv.appendChild(input);
        let buttonDiv = document.createElement("div");
        buttonDiv.className = "input-group-append";
        let button = document.createElement("button");
        button.className = "btn btn-outline-secondary btn-labeled";
        button.type = "button";
        button.innerText = "Download";
        buttonDiv.appendChild(button);
        inputDiv.appendChild(buttonDiv);
        bodyDiv.appendChild(inputDiv);
        let progressDiv = document.createElement("div");
        progressDiv.className = "progress mb-3";
        progressDiv.style.width = "400px";
        let progress = document.createElement("div");
        progress.className = "progress-bar";
        // @ts-ignore
        progress["role"] = "progressbar";
        // @ts-ignore
        progress["aria-valuemin"] = "0";
        // @ts-ignore
        progress["aria-valuemax"] = "100";
        // @ts-ignore
        progress["aria-valuenow"] = "0";
        progress.style.width = "0%"
        progress.innerText = "0%";
        const setProgress = (n: number) => {
            // @ts-ignore
            progress["aria-valuenow"] = `${n}`;
            progress.style.width = `${n}%`;
            progress.innerText = `${n}%`;
        };
        progressDiv.appendChild(progress);
        bodyDiv.appendChild(progressDiv);
        let infoDiv = document.createElement("div");
        infoDiv.style.width = "350px";
        let checkBoxDiv = document.createElement("div");
        checkBoxDiv.className = "form-check float-start";
        let checkBox = document.createElement("input");
        checkBox.className = "form-check-input";
        checkBox.type = "checkbox";
        checkBox.id = "LogCheck";
        checkBox.checked = true;
        checkBoxDiv.appendChild(checkBox);
        let checkBoxLabel = document.createElement("label");
        checkBoxLabel.className = "form-check-label";
        // @ts-ignore
        checkBoxLabel["for"] = "LogCheck";
        checkBoxLabel.innerText = "ログを自動スクロール";
        checkBoxDiv.appendChild(checkBoxLabel);
        infoDiv.appendChild(checkBoxDiv);
        let remainTimeDiv = document.createElement("div");
        remainTimeDiv.className = "float-end";
        remainTimeDiv.innerText = "残りおよそ -:--";
        const setRemainTime = (r: string) => remainTimeDiv.innerText = `残りおよそ ${r}`;
        infoDiv.appendChild(remainTimeDiv);
        bodyDiv.appendChild(infoDiv);
        let textarea = document.createElement("textarea");
        textarea.className = "form-control";
        textarea.readOnly = true;
        textarea.style.resize = "both";
        textarea.style.width = "500px";
        textarea.style.height = "80px";
        const textLog = (t: string) => {
            textarea.value += `${t}\n`;
            if (checkBox.checked) {
                textarea.scrollTop = textarea.scrollHeight;
            }
        };
        bodyDiv.appendChild(textarea);
        document.body.appendChild(bodyDiv);

        let bootScript = document.createElement("script");
        bootScript.src = this.bootJS.src;
        bootScript.integrity = this.bootJS.integrity;
        bootScript.crossOrigin = "anonymous";
        document.body.appendChild(bootScript);
        const loadingFun = ((event: BeforeUnloadEvent) => event.returnValue = `downloading`);
        const downloadFun = this.downloadZip.bind(this);

        button.onclick = function () {
            button.disabled = true;
            window.addEventListener('beforeunload', loadingFun);
            downloadFun(JSON.parse(input.value), setProgress, textLog, setRemainTime)
                .then(() => window.removeEventListener("beforeunload", loadingFun))
                .catch((e) => {
                    textLog('エラー出た');
                    if (typeof e.message == 'string') {
                        textLog(e.message);
                        console.error(e.message);
                    }
                    console.error(e);
                    window.removeEventListener("beforeunload", loadingFun);
                });
        };
    }

    /**
     * ZIPでダウンロード
     * @param downloadObj ダウンロード対象オブジェクト
     * @param progress 進捗率出力関数
     * @param log ログ出力関数
     * @param remainTime 終了予測出力関数
     */
    async downloadZip(downloadObj: any, progress: (n: number) => void, log: (s: string) => void, remainTime: (r: string) => void) {
        if (!this.isDownloadJsonObj(downloadObj)) throw new Error('ダウンロード対象オブジェクトの型が不正');
        await this.script('https://cdn.jsdelivr.net/npm/web-streams-polyfill@2.0.2/dist/ponyfill.min.js');
        await this.script('https://cdn.jsdelivr.net/npm/streamsaver@2.0.3/StreamSaver.js');
        await this.script('https://cdn.jsdelivr.net/npm/streamsaver@2.0.3/examples/zip-stream.js');

        const ui = this;
        const utils = this.utils;
        const encodedId = utils.encodeFileName(downloadObj.id);
        // @ts-ignore
        const fileStream = streamSaver.createWriteStream(`${encodedId}.zip`);
        // @ts-ignore
        const readableZipStream = new createWriter({
            async pull(ctrl: any) {
                const startTime = Math.floor(Date.now() / 60000);
                let count = 0;
                const enqueue = (fileBits: BlobPart[], path: string) => ctrl.enqueue(new File(fileBits, `${encodedId}/${path}`));
                log(`@${downloadObj.id} 投稿:${downloadObj.postCount} ファイル:${downloadObj.fileCount}`);
                // ルートhtml
                enqueue([ui.createHtmlFromBody(downloadObj.id, ui.createRootHtmlFromPosts(downloadObj.posts))], 'index.html');
                // 投稿処理
                let postCount = 0;
                for (const post of downloadObj.posts) {
                    log(`${post.originalName} (${++postCount}/${downloadObj.postCount})`);
                    // 投稿情報+html
                    enqueue([post.informationText], `${post.encodedName}/info.txt`);
                    enqueue([ui.createHtmlFromBody(post.originalName, post.htmlText)], `${post.encodedName}/index.html`);
                    // カバー画像
                    if (post.cover) {
                        log(`download ${post.cover.name}`);
                        const blob = await ui.download(post.cover, 1);
                        if (blob) {
                            enqueue([blob], `${post.encodedName}/${post.cover.name}`);
                        }
                    }
                    // ファイル処理
                    let fileCount = 0;
                    for (const file of post.files) {
                        log(`download ${file.encodedName} (${++fileCount}/${post.files.length})`);
                        const blob = await ui.download({url: file.url, name: file.encodedName}, 1);
                        if (blob) {
                            enqueue([blob], `${post.encodedName}/${file.encodedName}`);
                        } else {
                            console.error(`${file.encodedName}(${file.url})のダウンロードに失敗、読み飛ばすよ`);
                            log(`${file.encodedName}のダウンロードに失敗`);
                        }
                        count++;
                        setTimeout(() => {
                            const remain = Math.floor(Math.abs(Math.floor(Date.now() / 60000) - startTime) * (downloadObj.fileCount - count) / count);
                            const h = remain / 60 | 0;
                            const m = (remain - 60 * h) / 60 | 0;
                            remainTime(`${h}:${('00' + m).slice(-2)}`);
                            progress(count * 100 / downloadObj.fileCount | 0);
                        }, 0);
                        await ui.sleep(100);
                    }
                }
                ctrl.close();
            }
        });

        // more optimized
        if (window.WritableStream && readableZipStream.pipeTo) {
            return readableZipStream.pipeTo(fileStream).then(() => console.log('done writing'));
        }

        // less optimized
        const writer = fileStream.getWriter();
        const reader = readableZipStream.getReader();
        const pump = () => reader.read().then((res: any) => res.done ? writer.close() : writer.write(res.value).then(pump));
        await pump();
    }

    /**
     * timeoutによる疑似スリーブ
     * @param ms ミリ秒
     */
    async sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * DOMによる外部スクリプト読み込み (importじゃだめなとき用)
     * @param url
     */
    async script(url: string) {
        return new Promise((resolve, reject) => {
            let script = document.createElement("script");
            script.src = url;
            script.onload = () => resolve(script);
            script.onerror = (e) => reject(e);
            document.head.appendChild(script);
        });
    }

    /**
     * fetch
     * @param url
     * @param filename
     * @param limit 回数制限
     */
    async download({url, name}: { url: string, name: string }, limit: number): Promise<Blob | null> {
        if (limit < 0) return null;
        try {
            const blob = await fetch(url)
                .catch(e => {
                    throw new Error(e)
                })
                .then(r => r.ok ? r.blob() : null);
            return blob ? blob : await this.download({url, name}, limit - 1);
        } catch (_) {
            console.error(`通信エラー: ${name}, ${url}`);
            await this.sleep(1000);
            return await this.download({url, name}, limit - 1);
        }
    }

    /**
     * 型検証
     * @param target 検証対象
     */
    isDownloadJsonObj(target: any): target is DownloadJsonObj {
        switch (true) {
            case typeof target !== 'object':
                console.error('ダウンロード用オブジェクトの型が不正(対象がobjectでない)', target);
                return false;
            case typeof target.postCount !== 'number':
                console.error('ダウンロード用オブジェクトの型が不正(postCountが数値でない)', target.postCount);
                return false;
            case typeof target.fileCount !== 'number':
                console.error('ダウンロード用オブジェクトの型が不正(fileCountが数値でない)', target.fileCount);
                return false;
            case typeof target.id !== 'string':
                console.error('ダウンロード用オブジェクトの型が不正(idが文字列でない)', target.id);
                return false;
            case !Array.isArray(target.posts):
                console.error('ダウンロード用オブジェクトの型が不正(postsが配列でない)', target.posts);
                return false;
        }
        return !target.posts.some((it: any) => {
            switch (true) {
                case typeof it !== 'object':
                    console.error('ダウンロード用オブジェクトの型が不正(postsの値にobjectでないものが含まれる)', it, target.posts);
                    return true;
                case typeof it.informationText !== 'string':
                    console.error('ダウンロード用オブジェクトの型が不正(postsの値にinformationTextが文字列でないものが含まれる)', it.informationText, target.posts);
                    return true;
                case typeof it.htmlText !== 'string':
                    console.error('ダウンロード用オブジェクトの型が不正(postsの値にhtmlTextが文字列でないものが含まれる)', it.htmlText, target.posts);
                    return true;
                case  !Array.isArray(it.files):
                    console.error('ダウンロード用オブジェクトの型が不正(postsの値にfilesが配列でないものが含まれる)', it.files, target.posts);
                    return true;
                case it.files.some((f: any) => {
                    switch (true) {
                        case typeof f !== 'object':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのfilesの値にオブジェクトでないものが含まれる)', f, it.files);
                            return true;
                        case typeof f.url !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのfilesの値にurlが文字列でないものが含まれる)', f.url, it.files);
                            return true;
                        case typeof f.originalName !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのfilesの値にoriginalNameが文字列でないものが含まれる)', f.originalName, it.files);
                            return true;
                        case typeof f.encodedName !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのfilesの値にencodedNameが文字列でないものが含まれる)', f.encodedName, it.files);
                            return true;
                        case it.cover === undefined:
                            return false;
                        case typeof it.cover !== 'object':
                            console.error('ダウンロード用オブジェクトの型が不正(postsの値にcoverがobjectでないものが含まれる)', it.cover, target.posts);
                            return true;
                        case typeof it.cover?.url !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのcoverの値にurlが文字列でないものが含まれる)', it.cover?.url, it.cover);
                            return true;
                        case typeof it.cover?.name !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのcoverの値にnameが文字列でないものが含まれる)', it.cover?.name, it.cover);
                            return true;
                        default:
                            return false;
                    }
                }):
                    return true;
                default:
                    return false;
            }
        });
    }

    /**
     * 投稿一覧からルートのhtmlを作成する
     * @param posts 投稿一覧のオブジェクト
     */
    createRootHtmlFromPosts(posts: DownloadJsonObj['posts']): string {
        return posts.map(post => `<a class="hl" href="./${this.utils.encodeURI(post.encodedName)}/index.html"><div class="root card">\n` +
            this.createCoverHtmlFromPost(post) +
            `<div class="card-body"><h5 class="card-title">${post.originalName}</h5></div>\n</div></a><br>\n`
        ).join('\n');
    }

    /**
     * cover画像htmlの生成
     * カバー画像が無い場合は投稿画像をスライドショーする
     * @param post 投稿情報オブジェクト
     */
    createCoverHtmlFromPost(post: DownloadJsonObj['posts'][number]): string {
        const postUri = `./${this.utils.encodeURI(post.encodedName)}/`;
        if (post.cover) {
            return `<img class="card-img-top gray-card" src="${postUri}${this.utils.encodeURI(post.cover.name)}" alt="カバー画像"/>\n`;
        }
        const images = post.files.filter(file => file.encodedName.match(this.coverExt));
        if (images.length > 0) {
            return '<div class="carousel slide" data-bs-ride="carousel" data-interval="1000"><div class="carousel-inner">' +
                '\n<div class="carousel-item active">' +
                images.map(img =>
                    '<div class="d-flex justify-content-center gray-carousel">' +
                    `<img src="${postUri}${this.utils.encodeURI(img.encodedName)}" class="d-block pd-carousel" height="180px"/></div>`
                ).join('</div>\n<div class="carousel-item">') +
                '</div>\n</div></div>\n';
        } else {
            return `<img class="card-img-top gray-card"/>\n`;
        }
    }

    /**
     * 投稿再現htmlの生成
     * @param title 投稿
     * @param body
     */
    createHtmlFromBody(title: string, body: string): string {
        return `<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="utf-8" />\n<title>${title}</title>\n` +
            `<link href="${this.bootCSS.href}" rel="stylesheet" integrity="${this.bootCSS.integrity}" crossOrigin="anonymous">\n` +
            '<style>div.main{width: 600px; float: none; margin: 0 auto}div.root{width: 400px}div.post{width: 600px}' +
            'a.hl,a.hl:hover{color: inherit;text-decoration: none;}div.card{float: none; margin: 0 auto;}' +
            'img.gray-card{height: 210px;background-color: gray;}' +
            'div.gray-carousel{height: 210px; width: 400px;background-color: gray;}' +
            'img.pd-carousel{height: 210px; padding: 15px;}</style>\n' +
            `</head>\n<body>\n<div class="main">\n${body}\n</div>\n` +
            `<script src="${this.bootJS.src}" integrity="${this.bootJS.integrity}" crossOrigin="anonymous"></script>\n` +
            '</body></html>';
    }
}
