/**
 * ダウンロード対象Objectの型
 */
type DownloadObj = { posts: Record<string, PostObj>, postCount: number, fileCount: number, id: string };

/**
 * 投稿情報のObject
 */
type PostObj = Readonly<{ info: string, items: DlInfo[], html: string, cover?: DlInfo }>;

/**
 * ダウンロード用の情報
 */
type DlInfo = { url: string, filename: string };

export class DownloadHelper {
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
        let textarea = document.createElement("textarea");
        textarea.className = "form-control";
        textarea.readOnly = true;
        textarea.style.resize = "both";
        textarea.style.width = "500px";
        textarea.style.height = "80px";
        const textLog = (t: string) => {
            textarea.value += `${t}\n`;
            textarea.scrollTop = textarea.scrollHeight;
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
            downloadFun(JSON.parse(input.value), setProgress, textLog)
                .then(() => window.removeEventListener("beforeunload", loadingFun));
        };
    }

    /**
     * ZIPでダウンロード
     * @param downloadObj ダウンロード対象オブジェクト
     * @param progress 進捗率出力関数
     * @param log ログ出力関数
     */
    async downloadZip(downloadObj: any, progress: (n: number) => void, log: (s: string) => void) {
        if (!this.isDownloadObj(downloadObj)) throw new Error('ダウンロード対象オブジェクトの型が不正');
        await this.script('https://cdn.jsdelivr.net/npm/web-streams-polyfill@2.0.2/dist/ponyfill.min.js');
        await this.script('https://cdn.jsdelivr.net/npm/streamsaver@2.0.3/StreamSaver.js');
        await this.script('https://cdn.jsdelivr.net/npm/streamsaver@2.0.3/examples/zip-stream.js');

        const ui = this;
        const id = this.encodeFileName(downloadObj.id);
        // @ts-ignore
        const fileStream = streamSaver.createWriteStream(`${id}.zip`);
        // @ts-ignore
        const readableZipStream = new createWriter({
            async pull(ctrl: any) {
                let count = 0;
                const enqueue = (fileBits: BlobPart[], path: string) => ctrl.enqueue(new File(fileBits, ui.encodePath(path)));
                log(`@${downloadObj.id} 投稿:${downloadObj.postCount} ファイル:${downloadObj.fileCount}`);
                // ルートhtml
                enqueue([ui.createHtmlFromBody(downloadObj.id, ui.createRootHtmlFromPosts(downloadObj.posts))], `${id}/index.html`);

                for (const [title, post] of Object.entries(downloadObj.posts)) {
                    if (!post) continue;
                    const path = `${id}/${title}`
                    // 投稿情報+html
                    enqueue([post.info], `${path}/info.txt`);
                    enqueue([ui.createHtmlFromBody(title, post.html)], `${path}/index.html`);
                    // カバー画像
                    if (post.cover) {
                        log(`download ${post.cover.filename}`);
                        const blob = await ui.download(post.cover, 1);
                        if (blob) {
                            enqueue([blob], `${path}/${post.cover.filename}`);
                        }
                    }
                    // ファイル処理
                    let i = 1, l = post.items.length;
                    for (const dl of post.items) {
                        log(`download ${dl.filename} (${i++}/${l})`);
                        const blob = await ui.download(dl, 1);
                        if (blob) {
                            enqueue([blob], `${path}/${dl.filename}`);
                        } else {
                            console.error(`${dl.filename}(${dl.url})のダウンロードに失敗、読み飛ばすよ`);
                            log(`${dl.filename}のダウンロードに失敗`);
                        }
                        count++;
                        await setTimeout(() => progress(count * 100 / downloadObj.fileCount | 0), 0);
                        await ui.sleep(100);
                    }
                    log(`${count * 100 / downloadObj.fileCount | 0}% (${count}/${downloadObj.fileCount})`);
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
    async download({url, filename}: DlInfo, limit: number): Promise<Blob | null> {
        if (limit < 0) return null;
        try {
            const blob = await fetch(url)
                .catch(e => {
                    throw new Error(e)
                })
                .then(r => r.ok ? r.blob() : null);
            return blob ? blob : await this.download({url, filename}, limit - 1);
        } catch (_) {
            console.error(`通信エラー: ${filename}, ${url}`);
            await this.sleep(1000);
            return await this.download({url, filename}, limit - 1);
        }
    }

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
            .replace(/\|/g, "｜");
    }

    /**
     * ファイルパスのエンコード
     * @param path ファイルのパス
     */
    encodePath(path: string): string {
        return path.split('/').map(it => this.encodeFileName(it)).join('/');
    }

    /**
     * URIのエンコード
     * @param path ファイルのパス
     */
    encodeLink(path: string): string {
        return path.split('/').map(it =>
            this.encodeFileName(it).replaceAll(/[;,/?:@&=+$#]/g, encodeURIComponent)
        ).join('/');
    }

    /**
     * 型検証
     * @param target 検証対象
     */
    isDownloadObj(target: any): target is DownloadObj {
        switch (true) {
            case typeof target !== 'object':
                console.error('ダウンロード用オブジェクトの型が不正(対象がobjectでない)', target);
                return false;
            case typeof target.posts !== 'object':
                console.error('ダウンロード用オブジェクトの型が不正(postsがobjectでない)', target.posts);
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
            case Object.keys(target.posts).some(it => !it):
                console.error('ダウンロード用オブジェクトの型が不正(postsのキーに空文字が含まれる)', target.posts);
                return false;
        }
        return !Object.values(target.posts).some((it: any) => {
            switch (true) {
                case typeof it !== 'object':
                    console.error('ダウンロード用オブジェクトの型が不正(postsの値にobjectでないものが含まれる)', it, target.posts);
                    return true;
                case typeof it.info !== 'string':
                    console.error('ダウンロード用オブジェクトの型が不正(postsの値にinfoが文字列でないものが含まれる)', it.info, target.posts);
                    return true;
                case typeof it.html !== 'string':
                    console.error('ダウンロード用オブジェクトの型が不正(postsの値にhtmlが文字列でないものが含まれる)', it.html, target.posts);
                    return true;
                case  !Array.isArray(it.items):
                    console.error('ダウンロード用オブジェクトの型が不正(postsの値にitemsが配列でないものが含まれる)', it.items, target.posts);
                    return true;
                case it.items.some((d: any) => {
                    switch (true) {
                        case typeof d !== 'object':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのitemsの値にオブジェクトでないものが含まれる)', d, it.items);
                            return true;
                        case typeof d.url !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのitemsの値にurlが文字列でないものが含まれる)', d.url, it.items);
                            return true;
                        case typeof d.filename !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのitemsの値にfilenameが文字列でないものが含まれる)', d.filename, it.items);
                            return true;
                        case it.cover === undefined:
                            return false;
                        case typeof it.cover !== 'object':
                            console.error('ダウンロード用オブジェクトの型が不正(postsの値にcoverがobjectでないものが含まれる)', it.cover, target.posts);
                            return true;
                        case typeof it.cover.url !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのcoverの値にurlが文字列でないものが含まれる)', it.cover.url, it.cover);
                            return true;
                        case typeof it.cover.filename !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのcoverの値にfilenameが文字列でないものが含まれる)', it.cover.filename, it.cover);
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
    createRootHtmlFromPosts(posts: Record<string, PostObj>): string {
        return Object.entries(posts).map(([title, post]) => {
            const escapedTitle = this.encodeFileName(title);
            return `<a class="hl" href="${this.encodeLink(`./${escapedTitle}/index.html`)}"><div class="root card">\n` +
                this.createCoverHtmlFromPost(escapedTitle, post) +
                `<div class="card-body"><h5 class="card-title">${title}</h5></div>\n</div></a><br>\n`
        }).join('\n');
    }

    /**
     * cover画像htmlの生成
     * カバー画像が無い場合は投稿画像をスライドショーする
     * @param escapedTitle ファイル名エスケープされたフォルダタイトル
     * @param post 投稿情報オブジェクト
     */
    createCoverHtmlFromPost(escapedTitle: string, post: PostObj): string {
        if (post.cover) {
            return `<img class="card-img-top gray-card" src="${this.encodeLink(`./${escapedTitle}/${post.cover.filename}`)}"/>\n`;
        } else if (post.items.length > 0) {
            return '<div class="carousel slide" data-bs-ride="carousel" data-interval="1000"><div class="carousel-inner">' +
                '\n<div class="carousel-item active">' + post.items.map(it =>
                    '<div class="d-flex justify-content-center gray-carousel">' +
                    `<img src="${this.encodeLink(`./${escapedTitle}/${it.filename}`)}" class="d-block pd-carousel" height="180px"/></div>`
                ).join('</div>\n<div class="carousel-item">') + '</div>\n</div></div>\n';
        } else {
            return `<img class="card-img-top gray-card" />\n`;
        }
    }

    /**
     * bodyからhtmlを作成する
     * @param title 投稿タイトル
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
