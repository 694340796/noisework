// Memos Start
var memo = {
    host: 'https://demo.usememos.com/',
    limit: '10',
    creatorId: '1',
    domId: '#memos',
    username: 'Admin',
    name: 'Administrator',
    APIVersion: 'new',
    language: 'en',
    total: true,
    doubanAPI: '',
}
if (typeof (memos) !== "undefined") {
    for (var key in memos) {
        if (memos[key]) {
            memo[key] = memos[key];
        }
    }
}

var limit = memo.limit
var memos = memo.host.replace(/\/$/, '')

let memoUrl;
if (memo.APIVersion === 'new') {
    const filter = `creator=='users/${memo.creatorId}'&&visibilities==['PUBLIC']`;
    memoUrl = `${memos}/api/v1/memos?filter=${encodeURIComponent(filter)}`;
} else if (memo.APIVersion === 'legacy') {
    memoUrl = memos + "/api/v1/memos?creatorId=" + memo.creatorId + "&rowStatus=NORMAL";
} else {
    throw new Error('Invalid APIVersion');
}

var page = 1,
    nextLength = 0,
    nextDom = [];
var tag = '';
var nextPageToken = '';
var btnRemove = 0;
var memoDom = document.querySelector(memo.domId);
var load = '<button class="load-btn button-load">加载更多</button>';
var isLoading = false; // 新增加载状态标志

if (memoDom) {
    memoDom.insertAdjacentHTML('afterend', load);
    getFirstList(); // 首次加载数据

    // 添加 button 事件监听器
    var btn = document.querySelector("button.button-load");
    btn.addEventListener("click", function () {
        if (isLoading || btnRemove) return; // 如果正在加载或按钮已被移除，返回
        isLoading = true; // 设置加载状态
        getNextList(); // 加载下一页
    });
}

function getFirstList() {
    let memoUrl_first;
    if (memo.APIVersion === 'new') {
        memoUrl_first = memoUrl + '&pageSize=' + limit;
        fetch(memoUrl_first).then(res => res.json()).then(resdata => {
            updateHTMl(resdata);
            nextPageToken = resdata.nextPageToken;
            nextLength = resdata.length;

            // 检查是否还有更多内容
            if (nextLength < limit) {
                handleNoMoreData();
            } else {
                page++;
            }
        }).catch(err => {
            console.error(err);
        }).finally(() => {
            isLoading = false; // 重置加载状态
        });
    } 
}

// 预加载下一页数据
function getNextList() {
    if (!nextPageToken) { // 如果没有更多页码，处理无数据情况
        handleNoMoreData();
        return;
    }

    var memoUrl_next = memoUrl + '&pageSize=' + limit + '&pageToken=' + nextPageToken;
    fetch(memoUrl_next).then(res => res.json()).then(resdata => {
        nextPageToken = resdata.nextPageToken;
        nextDom = resdata;
        nextLength = nextDom.length;

        // 更新内容
        updateHTMl(nextDom);

        // 检查是否还有更多内容
        if (nextLength < limit) {
            handleNoMoreData();
        } else {
            page++;
        }
    }).catch(err => {
        console.error(err);
    }).finally(() => {
        isLoading = false; // 重置加载状态
    });
}

// 处理无更多数据的情况
function handleNoMoreData() {
    var btn = document.querySelector("button.button-load");
    btn.textContent = '已加载全部'; // 修改按钮文本
    btn.disabled = true; // 禁用按钮
    btnRemove = 1; // 标记按钮已移除
}

// 更新 HTML 内容的函数
function updateHTMl(data) {
    data.forEach(item => {
        const newItem = document.createElement('div');
        newItem.textContent = item.content; // 根据实际数据结构调整
        memoDom.appendChild(newItem);
    });
}

// 标签选择
document.addEventListener('click', function (event) {
    var target = event.target;
    if (target.tagName.toLowerCase() === 'a' && target.getAttribute('href').startsWith('#')) {
        event.preventDefault();
        tag = target.getAttribute('href').substring(1); // 获取标签名
        if (btnRemove) { // 如果按钮被移除
            btnRemove = 0;
            memoDom.insertAdjacentHTML('afterend', load);
            var btn = document.querySelector("button.button-load");
            btn.addEventListener("click", function () {
                if (isLoading || btnRemove) return; // 如果正在加载或按钮已被移除，返回
                isLoading = true; // 设置加载状态
                getTagFirstList(); // 加载标签相关内容
            });
        }        
        getTagFirstList();
        var filterElem = document.getElementById('tag-filter');
        filterElem.style.display = 'block';    // 显示过滤器
        var tags = document.getElementById('tags');
        var tagresult = `Filter: <span class='tag-span'><a rel='noopener noreferrer' href=''>#${tag}</a></span>`;
        tags.innerHTML = tagresult;
        scrollTo(0, 0);    // 回到顶部
    }
});

function getTagFirstList() {
    if (memo.APIVersion === 'new') {
        console.log('Could not list tag');
    } else if (memo.APIVersion === 'legacy') {
        page = 1;
        nextLength = 0;
        nextDom = [];
        memoDom.innerHTML = "";
        var memoUrl_tag = memoUrl + "&limit=" + limit + "&tag=" + tag;
        fetch(memoUrl_tag).then(res => res.json()).then(resdata => {
            updateHTMl(resdata);
            var nowLength = resdata.length;
            if (nowLength < limit) { // 返回数据条数小于 limit 则直接移除“加载更多”按钮
                handleNoMoreData();
                return;
            }
            page++;
            nextPageToken = resdata.nextPageToken; // 更新下一页的标识
            getNextList(); // 加载下一页数据
        }).catch(err => {
            console.error(err);
        });
    } else {
        throw new Error('Invalid APIVersion');
    }
}

// 当前页数
let currentPage = 0;

// 切换评论框显示
function toggleCommentBox(link) {
    const commentBox = document.getElementById(`comment-box-${link}`);
    if (commentBox) {
        if (commentBox.style.display === "none") {
            commentBox.style.display = "block";
            // 初始化 Waline 评论框
            initWaline(commentBox, link);
        } else {
            commentBox.style.display = "none";
        }
    }
}

// 初始化 Waline 评论框
function initWaline(container, link) {
    const commentId = `waline-${link}`; // 使用链接生成唯一 ID
    container.innerHTML = `<div id="${commentId}"></div>`;
    import('https://unpkg.com/@waline/client@v3/dist/waline.js').then(({ init }) => {
        init({
            el: `#${commentId}`, // 使用生成的唯一 ID
            serverURL: 'https://ment.noisework.cn',
            meta: ['nick', 'mail', 'link'],
            requiredMeta: ['mail', 'nick'],
            pageview: true,
            search: false,
            wordLimit: 200,
            pageSize: 5,
            avatar: 'monsterid',
            emoji: [
                'https://unpkg.com/@waline/emojis@1.2.0/tieba',
            ],
            imageUploader: false,
            copyright: false,
        });
    });
}

// 更新 HTML 内容的函数
function updateHTMl(data) {
    var memoResult = "", resultAll = "";

    // 解析 TAG 标签，添加样式
    const TAG_REG = /#([^\s#]+?) /g;

    // 解析各种链接
    const BILIBILI_REG = /<a\shref="https:\/\/www\.bilibili\.com\/video\/((av[\d]{1,10})|(BV([\w]{10})))\/?">.*<\/a>/g;
    const QQMUSIC_REG = /<a\shref="https:\/\/y\.qq\.com\/.*(\/[0-9a-zA-Z]+)(\.html)?".*?>.*?<\/a>/g;
    const QQVIDEO_REG = /<a\shref="https:\/\/v\.qq\.com\/.*\/([a-zA-Z0-9]+)\.html".*?>.*?<\/a>/g;
    const SPOTIFY_REG = /<a\shref="https:\/\/open\.spotify\.com\/(track|album)\/([\s\S]+)".*?>.*?<\/a>/g;
    const YOUKU_REG = /<a\shref="https:\/\/v\.youku\.com\/.*\/id_([a-zA-Z0-9=]+)\.html".*?>.*<\/a>/g;
    const YOUTUBE_REG = /<a\shref="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9]{11})".*?>.*<\/a>/g;
    const NETEASE_MUSIC_REG = /<a\shref="https?:\/\/music\.163\.com\/.*?id=(\d+)<\/a>/g;

    // Memos Content
    if (memo.APIVersion === 'new') {
        data = data.memos;
    } else if (memo.APIVersion === 'legacy') {
        data = data;
    } else {
        throw new Error('Invalid APIVersion');
    }

    for (var i = 0; i < data.length; i++) {
        var memoContREG = data[i].content
            .replace(TAG_REG, "<span class='tag-span'><a rel='noopener noreferrer' href='#\$1'>#\$1</a></span>");

        // 先解析 Markdown
        memoContREG = marked.parse(memoContREG)
            .replace(BILIBILI_REG, "<div class='video-wrapper'><iframe src='https://player.bilibili.com/player.html?bvid=\$1&as_wide=1&high_quality=1&danmaku=0&autoplay=0' scrolling='no' border='0' frameborder='no' allowfullscreen='true' style='position:absolute;height:100%;width:100%;'></iframe></div>")
            .replace(YOUTUBE_REG, "<div class='video-wrapper'><iframe src='https://www.youtube.com/embed/\$1' title='YouTube video player' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen title='YouTube Video'></iframe></div>")
            .replace(NETEASE_MUSIC_REG, "<div class='music-wrapper'><meting-js auto='https://music.163.com/#/song?id=\$1'></meting-js></div>")
            .replace(QQMUSIC_REG, "<div class='music-wrapper'><meting-js auto='https://y.qq.com/n/yqq/song\$1.html'></meting-js></div>")
            .replace(QQVIDEO_REG, "<div class='video-wrapper'><iframe src='https://v.qq.com/iframe/player.html?vid=\$1' allowFullScreen='true' frameborder='no'></iframe></div>")
            .replace(SPOTIFY_REG, "<div class='spotify-wrapper'><iframe style='border-radius:12px' src='https://open.spotify.com/embed/\$1/\$2?utm_source=generator&theme=0' width='100%' frameBorder='0' allowfullscreen='' allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' loading='lazy'></iframe></div>")
            .replace(YOUKU_REG, "<div class='video-wrapper'><iframe src='https://player.youku.com/embed/\$1' frameborder='0' allowfullscreen></iframe></div>");

        // 解析内置资源文件
        if (memo.APIVersion === 'new') {
            if (data[i].resourceList && data[i].resourceList.length > 0) {
                var resourceList = data[i].resourceList;
                var imgUrl = '', resUrl = '', resImgLength = 0;
                for (var j = 0; j < resourceList.length; j++) {
                    var resType = resourceList[j].type.slice(0, 5);
                    var resexlink = resourceList[j].externalLink;
                    var resLink = '';
                    if (resexlink) {
                        resLink = resexlink;
                    } else {
                        var fileId = resourceList[j].publicId || resourceList[j].filename;
                        resLink = memos + '/o/r/' + resourceList[j].id + '/' + fileId;
                    }
                    if (resType === 'image') {
                        imgUrl += '<div class="resimg"><img loading="lazy" src="' + resLink + '"/></div>';
                        resImgLength += 1;
                    }
                    if (resType !== 'image') {
                        resUrl += '<a target="_blank" rel="noreferrer" href="' + resLink + '">' + resourceList[j].filename + '</a>';
                    }
                }
                if (imgUrl) {
                    memoContREG += '<div class="resource-wrapper"><div class="images-wrapper">' + imgUrl + '</div></div>';
                }
                if (resUrl) {
                    memoContREG += '<div class="resource-wrapper"><p class="datasource">' + resUrl + '</p></div>';
                }
            }
        } else {
            throw new Error('Invalid APIVersion');
        }

        // 获取相对时间
        var relativeTime = memo.APIVersion === 'new' ? 
            getRelativeTime(new Date(data[i].createTime)) : 
            getRelativeTime(new Date(data[i].createdTs * 1000));

        // 使用实际链接生成评论区的唯一ID
        const memoLink = `${memo.host}m/${data[i].uid}`;
        const commentIndex = encodeURIComponent(memoLink); // 对链接进行编码以确保其有效性

        // 在生成每个条目时确保有评论按钮
        memoResult += `
<li class="timeline">
    <div class="memos__content">
        <div class="memos__text">
            <div class="memos__userinfo">
                <div>${memo.name}</div>
                <div class="memos__id">@${memo.username}</div>
            </div>
            <p>${memoContREG}</p>
        </div>
        <div class="memos__meta">
            <small class="memos__date">${relativeTime} • From「<a href="${memoLink}" target="_blank">Memos</a>」</small>
            <small class="comment-button" data-link="${commentIndex}">• 📧 评论</small>
        </div>
        <div id="comment-box-${commentIndex}" class="comment-box" style="display: none;"></div>
    </div>
</li>
`;
    }

    resultAll = `<ul class="">${memoResult}</ul>`;
    memoDom.insertAdjacentHTML('beforeend', resultAll);
    if (memo.doubanAPI) {
        fetchDB();
    }
    document.querySelector('button.button-load').textContent = '加载更多';
}

// 绑定事件到 memoDom 上
memoDom.addEventListener('click', function (event) {
    if (event.target.classList.contains('comment-button')) {
        const link = event.target.getAttribute('data-link'); // 获取自定义数据属性
        toggleCommentBox(link);
    }
});

// 加载更多内容的函数
function loadMore() {
    currentPage++; // 每次加载更多时增加页数
    // 这里添加加载更多内容的逻辑
}

// 绑定加载更多按钮
document.querySelector('button.button-load').addEventListener('click', loadMore);

// Memos Total Start
// Get Memos total count
function getTotal() {
    let totalUrl;
    if (memo.APIVersion === 'new') {
        const filter = `creator=='users/${memo.creatorId}'&&visibilities==['PUBLIC']`;
        totalUrl = `${memos}/api/v1/memos?pageSize=1&pageToken=&&filter=${encodeURIComponent(filter)}`;
        fetch(totalUrl).then(res => res.json()).then(resdata => {
            if (resdata) {
                var allnums = resdata.memos.map(memo => {
                    const match = memo.name.match(/\d+/);
                    return match ? parseInt(match[0], 10) : null;
                }).filter(num => num !== null);
                // 不准确，但没有找到更好的办法获取总数
                var memosCount = document.getElementById('total');
                memosCount.innerHTML = allnums;
            }
        }).catch(err => {
            // Do something for an error here
        });
    } else if (memo.APIVersion === 'legacy') {
        totalUrl = memos + "/api/v1/memos/stats?creatorId=" + memo.creatorId
        fetch(totalUrl).then(res => res.json()).then(resdata => {
            if (resdata) {
                var allnums = resdata.length
                var memosCount = document.getElementById('total');
                memosCount.innerHTML = allnums;
            }
        }).catch(err => {
            // Do something for an error here
        });
    } else {
        throw new Error('Invalid APIVersion');
    }
};
if (memo.total === true) {
    window.onload = getTotal();
} else {
    var totalDiv = document.querySelector('div.total');
    if (totalDiv) {
        totalDiv.remove();
    }
}
// Relative Time Start
function getRelativeTime(date) {
    const rtf = new Intl.RelativeTimeFormat(memos.language, { numeric: "auto", style: 'short' });

    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
        return rtf.format(-years, 'year');
    } else if (months > 0) {
        return rtf.format(-months, 'month');
    } else if (days > 0) {
        return rtf.format(-days, 'day');
    } else if (hours > 0) {
        return rtf.format(-hours, 'hour');
    } else if (minutes > 0) {
        return rtf.format(-minutes, 'minute');
    } else {
        return rtf.format(-seconds, 'second');
    }
}
// Relative Time End

// Toggle Darkmode
const localTheme = window.localStorage && window.localStorage.getItem("theme");
const themeToggle = document.querySelector(".theme-toggle");

if (localTheme) {
    document.body.classList.remove("light-theme", "dark-theme");
    document.body.classList.add(localTheme);
}

themeToggle.addEventListener("click", () => {
    const themeUndefined = !new RegExp("(dark|light)-theme").test(document.body.className);
    const isOSDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (themeUndefined) {
        if (isOSDark) {
            document.body.classList.add("light-theme");
        } else {
            document.body.classList.add("dark-theme");
        }
    } else {
        document.body.classList.toggle("light-theme");
        document.body.classList.toggle("dark-theme");
    }

    window.localStorage &&
        window.localStorage.setItem(
            "theme",
            document.body.classList.contains("dark-theme") ? "dark-theme" : "light-theme",
        );
});
//显隐按钮  
function showReposBtn(){  
    var clientHeight = $(window).height();  
    var scrollTop = $(document).scrollTop();  
    var maxScroll = $(document).height() - clientHeight;  
    //滚动距离超过可视一屏的距离时显示返回顶部按钮  
    if( scrollTop > clientHeight ){  
        $('#retopbtn').show();  
    }else{  
        $('#retopbtn').hide();  
    }  
    //滚动距离到达最底部时隐藏返回底部按钮  
    if( scrollTop >= maxScroll ){  
        $('#rebtmbtn').hide();  
    }else{  
        $('#rebtmbtn').show();  
    }  
}  
  
window.onload = function(){  
    //获取文档对象  
    $body = (window.opera) ? (document.compatMode == "CSS1Compat" ? $("html") : $("body")) : $("html,body");  
    //显示按钮  
    showReposBtn();  
}  
  
window.onscroll = function(){  
    //滚动时调整按钮显隐  
    showReposBtn();  
}  
  
//返回顶部  
function returnTop(){  
    $body.animate({scrollTop: 0},400);  
}  
  
//返回底部  
function returnBottom(){  
    $body.animate({scrollTop: $(document).height()},400);  
}  