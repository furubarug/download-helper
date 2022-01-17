export class DownloadUtils {
    encodeFileName(name) {
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
    encodeURI(name) {
        return this.encodeFileName(name).replaceAll(/[;,/?:@&=+$#]/g, encodeURIComponent);
    }
    splitExt(name) {
        return name.split(/(?=\.[^.]+$)/);
    }
    getFileName(name, extension, length, index) {
        return length <= 1 ? `${name}${extension}` : `${name}_${index}${extension}`;
    }
    async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
export class DownloadObject {
    constructor(id, utils) {
        this.orderedPosts = [];
        this.downloadObj = { posts: {}, id };
        this.utils = utils;
    }
    stringify() {
        const downloadJson = {
            posts: this.orderedPosts.map(it => it.toJsonObjBy(this.downloadObj.posts)),
            id: this.downloadObj.id,
            postCount: this.countPost(),
            fileCount: this.countFile()
        };
        return JSON.stringify(downloadJson);
    }
    addPost(name) {
        const encodedName = this.utils.encodeFileName(name);
        if (this.downloadObj.posts[encodedName] === undefined) {
            this.downloadObj.posts[encodedName] = [];
        }
        const postObj = { name, info: '', files: {}, html: '' };
        this.downloadObj.posts[encodedName].push(postObj);
        const postObject = new PostObject(postObj, this.utils);
        this.orderedPosts.push(postObject);
        return postObject;
    }
    countPost() {
        return Object.values(this.downloadObj.posts).reduce((s, posts) => s + posts.length, 0);
    }
    countFile() {
        return Object.values(this.downloadObj.posts).reduce((allFileSize, posts) => allFileSize + posts.reduce((postFileSize, post) => postFileSize + Object.values(post.files).reduce((s, files) => s + files.length, 0), 0), 0);
    }
}
export class PostObject {
    constructor(postObj, utils) {
        this.postObj = postObj;
        this.utils = utils;
    }
    setInfo(info) {
        this.postObj.info = info;
    }
    setHtml(html) {
        this.postObj.html = html;
    }
    setCover(name, extension, url) {
        const fileObj = { name, extension: extension ? `.${extension}` : "", url };
        this.postObj.cover = fileObj;
        return new FileObject(fileObj, this.utils);
    }
    addFile(name, extension, url) {
        const encodedName = this.utils.encodeFileName(name);
        if (this.postObj.files[encodedName] === undefined) {
            this.postObj.files[encodedName] = [];
        }
        const fileObj = { name, extension: extension ? `.${extension}` : "", url };
        this.postObj.files[encodedName].push(fileObj);
        return new FileObject(fileObj, this.utils);
    }
    getImageLinkTag(fileObject) {
        const filePath = this.getCurrentFilePath(fileObject);
        return `<a class="hl" href="${filePath}" download="${fileObject.getEncodedName() + fileObject.getEncodedExtension()}"><div class="post card">\n` +
            `<img class="card-img-top" src="${filePath}" alt="${fileObject.getOriginalName()}"/>\n</div></a>`;
    }
    getFileLinkTag(fileObject) {
        const filePath = this.getCurrentFilePath(fileObject);
        return `<span><a href="${filePath}" download="${fileObject.getEncodedName() + fileObject.getEncodedExtension()}">${fileObject.getOriginalName()}</a></span>`;
    }
    getCurrentFilePath(fileObject) {
        const encodedName = fileObject.getEncodedName();
        if (fileObject.equals(this.postObj.cover)) {
            const fileName = this.utils.getFileName(encodedName, fileObject.getEncodedExtension(), 1, 1);
            return `./${this.utils.encodeURI(fileName)}`;
        }
        if (this.postObj.files[encodedName] === undefined) {
            throw new Error(`file object is undefined: ${fileObject.getOriginalName()}`);
        }
        const index = this.postObj.files[encodedName].findIndex(it => fileObject.equals(it));
        if (index < 0) {
            throw new Error(`file object is not found: ${fileObject.getOriginalName()}`);
        }
        const fileName = this.utils.getFileName(encodedName, fileObject.getEncodedExtension(), this.postObj.files[encodedName].length, index + 1);
        return `./${this.utils.encodeURI(fileName)}`;
    }
    toJsonObjBy(posts) {
        var _a;
        const key = this.utils.encodeFileName(this.postObj.name);
        const postIndex = (_a = posts[key]) === null || _a === void 0 ? void 0 : _a.indexOf(this.postObj);
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
    collectFiles() {
        const ret = [];
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
export class FileObject {
    constructor(fileObj, utils) {
        this.fileObj = fileObj;
        this.utils = utils;
    }
    getEncodedName() {
        return this.utils.encodeFileName(this.fileObj.name);
    }
    getEncodedExtension() {
        return this.fileObj.extension ? this.utils.encodeFileName(this.fileObj.extension) : "";
    }
    getOriginalName() {
        return this.fileObj.name;
    }
    getUrl() {
        return this.fileObj.url;
    }
    equals(obj) {
        if (typeof obj != 'object') {
            return false;
        }
        return obj.name === this.fileObj.name && obj.url === this.fileObj.url;
    }
}
export class DownloadHelper {
    constructor(utils) {
        this.bootCSS = {
            href: "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/css/bootstrap.min.css",
            integrity: "sha384-giJF6kkoqNQ00vy+HMDP7azOuL0xtbfIcaT9wjKHr8RbDVddVHyTfAAsrekwKmP1",
        };
        this.bootJS = {
            src: "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/js/bootstrap.bundle.min.js",
            integrity: "sha384-ygbV9kiqUc6oa4msXn9868pTtWMgiQaeYH7/t7LECLbyPA2x65Kgf80OJFdroafW",
        };
        this.coverExt = /\.(apng|avif|gif|jpg|jpeg|jfif|pjpeg|pjp|png|svg|webp)$/;
        this.utils = utils;
    }
    async createDownloadUI(title) {
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
        input.type = "text";
        input.className = "form-control";
        input.placeholder = "ここにJSONを貼り付け";
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
        progress["role"] = "progressbar";
        progress["aria-valuemin"] = "0";
        progress["aria-valuemax"] = "100";
        progress["aria-valuenow"] = "0";
        progress.style.width = "0%";
        progress.innerText = "0%";
        const setProgress = (n) => {
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
        checkBoxLabel["for"] = "LogCheck";
        checkBoxLabel.innerText = "ログを自動スクロール";
        checkBoxDiv.appendChild(checkBoxLabel);
        infoDiv.appendChild(checkBoxDiv);
        let remainTimeDiv = document.createElement("div");
        remainTimeDiv.className = "float-end";
        remainTimeDiv.innerText = "残りおよそ -:--";
        const setRemainTime = (r) => remainTimeDiv.innerText = `残りおよそ ${r}`;
        infoDiv.appendChild(remainTimeDiv);
        bodyDiv.appendChild(infoDiv);
        let textarea = document.createElement("textarea");
        textarea.className = "form-control";
        textarea.readOnly = true;
        textarea.style.resize = "both";
        textarea.style.width = "500px";
        textarea.style.height = "80px";
        const textLog = (t) => {
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
        const loadingFun = ((event) => event.returnValue = `downloading`);
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
    async downloadZip(downloadObj, progress, log, remainTime) {
        if (!this.isDownloadJsonObj(downloadObj))
            throw new Error('ダウンロード対象オブジェクトの型が不正');
        await this.script('https://cdn.jsdelivr.net/npm/web-streams-polyfill@2.0.2/dist/ponyfill.min.js');
        await this.script('https://cdn.jsdelivr.net/npm/streamsaver@2.0.3/StreamSaver.js');
        await this.script('https://cdn.jsdelivr.net/npm/streamsaver@2.0.3/examples/zip-stream.js');
        const ui = this;
        const utils = this.utils;
        const encodedId = utils.encodeFileName(downloadObj.id);
        const fileStream = streamSaver.createWriteStream(`${encodedId}.zip`);
        const readableZipStream = new createWriter({
            async pull(ctrl) {
                const startTime = Math.floor(Date.now() / 1000);
                let count = 0;
                const enqueue = (fileBits, path) => ctrl.enqueue(new File(fileBits, `${encodedId}/${path}`));
                log(`@${downloadObj.id} 投稿:${downloadObj.postCount} ファイル:${downloadObj.fileCount}`);
                enqueue([ui.createHtmlFromBody(downloadObj.id, ui.createRootHtmlFromPosts(downloadObj.posts))], 'index.html');
                let postCount = 0;
                for (const post of downloadObj.posts) {
                    log(`${post.originalName} (${++postCount}/${downloadObj.postCount})`);
                    enqueue([post.informationText], `${post.encodedName}/info.txt`);
                    enqueue([ui.createHtmlFromBody(post.originalName, post.htmlText)], `${post.encodedName}/index.html`);
                    if (post.cover) {
                        log(`download ${post.cover.name}`);
                        const blob = await ui.download(post.cover, 1);
                        if (blob) {
                            enqueue([blob], `${post.encodedName}/${post.cover.name}`);
                        }
                    }
                    let fileCount = 0;
                    for (const file of post.files) {
                        log(`download ${file.encodedName} (${++fileCount}/${post.files.length})`);
                        const blob = await ui.download({ url: file.url, name: file.encodedName }, 1);
                        if (blob) {
                            enqueue([blob], `${post.encodedName}/${file.encodedName}`);
                        }
                        else {
                            console.error(`${file.encodedName}(${file.url})のダウンロードに失敗、読み飛ばすよ`);
                            log(`${file.encodedName}のダウンロードに失敗`);
                        }
                        count++;
                        setTimeout(() => {
                            const remain = Math.floor(Math.abs(Math.floor(Date.now() / 1000) - startTime) * (downloadObj.fileCount - count) / count);
                            const h = remain / (60 * 60) | 0;
                            const m = (remain - 60 * 60 * h) / 60 | 0;
                            remainTime(`${h}:${('00' + m).slice(-2)}`);
                            progress(count * 100 / downloadObj.fileCount | 0);
                        }, 0);
                        await utils.sleep(100);
                    }
                }
                ctrl.close();
            }
        });
        if (window.WritableStream && readableZipStream.pipeTo) {
            return readableZipStream.pipeTo(fileStream).then(() => console.log('done writing'));
        }
        const writer = fileStream.getWriter();
        const reader = readableZipStream.getReader();
        const pump = () => reader.read().then((res) => res.done ? writer.close() : writer.write(res.value).then(pump));
        await pump();
    }
    async script(url) {
        return new Promise((resolve, reject) => {
            let script = document.createElement("script");
            script.src = url;
            script.onload = () => resolve(script);
            script.onerror = (e) => reject(e);
            document.head.appendChild(script);
        });
    }
    async download({ url, name }, limit) {
        if (limit < 0)
            return null;
        try {
            const blob = await fetch(url)
                .catch(e => {
                throw new Error(e);
            })
                .then(r => r.ok ? r.blob() : null);
            return blob ? blob : await this.download({ url, name }, limit - 1);
        }
        catch (_) {
            console.error(`通信エラー: ${name}, ${url}`);
            await this.utils.sleep(1000);
            return await this.download({ url, name }, limit - 1);
        }
    }
    isDownloadJsonObj(target) {
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
        return !target.posts.some((it) => {
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
                case !Array.isArray(it.files):
                    console.error('ダウンロード用オブジェクトの型が不正(postsの値にfilesが配列でないものが含まれる)', it.files, target.posts);
                    return true;
                case it.files.some((f) => {
                    var _a, _b, _c, _d;
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
                        case typeof ((_a = it.cover) === null || _a === void 0 ? void 0 : _a.url) !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのcoverの値にurlが文字列でないものが含まれる)', (_b = it.cover) === null || _b === void 0 ? void 0 : _b.url, it.cover);
                            return true;
                        case typeof ((_c = it.cover) === null || _c === void 0 ? void 0 : _c.name) !== 'string':
                            console.error('ダウンロード用オブジェクトの型が不正(postsのcoverの値にnameが文字列でないものが含まれる)', (_d = it.cover) === null || _d === void 0 ? void 0 : _d.name, it.cover);
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
    createRootHtmlFromPosts(posts) {
        return posts.map(post => `<a class="hl" href="./${this.utils.encodeURI(post.encodedName)}/index.html"><div class="root card">\n` +
            this.createCoverHtmlFromPost(post) +
            `<div class="card-body"><h5 class="card-title">${post.originalName}</h5></div>\n</div></a><br>\n`).join('\n');
    }
    createCoverHtmlFromPost(post) {
        const postUri = `./${this.utils.encodeURI(post.encodedName)}/`;
        if (post.cover) {
            return `<img class="card-img-top gray-card" src="${postUri}${this.utils.encodeURI(post.cover.name)}" alt="カバー画像"/>\n`;
        }
        const images = post.files.filter(file => file.encodedName.match(this.coverExt));
        if (images.length > 0) {
            return '<div class="carousel slide" data-bs-ride="carousel" data-interval="1000"><div class="carousel-inner">' +
                '\n<div class="carousel-item active">' +
                images.map(img => '<div class="d-flex justify-content-center gray-carousel">' +
                    `<img src="${postUri}${this.utils.encodeURI(img.encodedName)}" class="d-block pd-carousel" height="180px"/></div>`).join('</div>\n<div class="carousel-item">') +
                '</div>\n</div></div>\n';
        }
        else {
            return `<img class="card-img-top gray-card"/>\n`;
        }
    }
    createHtmlFromBody(title, body) {
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
