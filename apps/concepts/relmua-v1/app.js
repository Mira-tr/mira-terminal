const body = document.body;
const page = body.dataset.page;
const mode = body.dataset.mode;
const baseDepth = {home:0,"404":0,projects:1,tools:1,notes:1,creators:1,about:1,contact:1,chikage:1,trpg:1,rules:2,admin:1,terminal:2}[page] ?? 0;
const base = baseDepth ? "../".repeat(baseDepth) : "./";
const href = target => `${base}${target}`;

function el(tag, options = {}, children = []){
    const node = document.createElement(tag);
    Object.entries(options).forEach(([key, value]) => {
        if(value === undefined || value === null) return;
        if(key === "class") node.className = value;
        else if(key === "text") node.textContent = value;
        else if(key === "htmlFor") node.htmlFor = value;
        else node.setAttribute(key, value);
    });
    const values = Array.isArray(children) ? children : [children];
    values.filter(Boolean).forEach(child => node.append(child.nodeType ? child : document.createTextNode(child)));
    return node;
}
function link(label, target, options = {}, children = []){
    const {children: ignored, ...attrs} = options;
    return el("a", {...attrs, href: href(target), text: label}, children);
}
function button(label, options = {}){ return el("button", {type:"button", text:label, ...options}); }
function label(text){ return el("p", {class:"eyebrow", text}); }
function heading(level, text, className = ""){ return el(`h${level}`, {class:className, text}); }
function section(className, children){ return el("section", {class:className}, children); }
function arrowLink(labelText, target, className = "text-link"){ return link("", target, {class:className, "aria-label":labelText}, [labelText]); }
function cta(labelText, target, quiet = false){ return link(labelText, target, {class:`button${quiet ? " button--quiet" : ""}`}); }
function shell(children){ return el("div", {class:"shell"}, children); }

function themeButton(){
    const toggle = button("", {class:"theme", "aria-label":"テーマを切り替える", "aria-pressed":"false"});
    toggle.append(el("span", {class:"theme__orb", "aria-hidden":"true"}), el("span", {text:"Light"}));
    const update = () => {
        const dark = body.dataset.theme === "dark";
        toggle.setAttribute("aria-pressed", String(dark));
        toggle.querySelector("span:last-child").textContent = dark ? "Night" : "Light";
    };
    toggle.addEventListener("click", () => { body.dataset.theme = body.dataset.theme === "dark" ? "" : "dark"; update(); });
    return toggle;
}

const brandItems = [["ホーム","" ,"home"],["作品","projects/","projects"],["道具","tools/","tools"],["記録","notes/","notes"],["活動者","creators/","creators"],["ブランド","about/","about"],["連絡","contact/","contact"]];
function brandHeader(){
    const nav = el("nav", {class:"brand-nav", "aria-label":"RELMUA ナビゲーション"});
    brandItems.forEach(([name,target,id]) => nav.append(link(name,target,{...(id === page ? {"aria-current":"page"} : {})})));
    const logo = link("", "", {class:"wordmark", "aria-label":"RELMUA ホーム"}, [el("span", {class:"mark", text:"R", "aria-hidden":"true"}), "RELMUA"]);
    return el("header", {class:"brand-header"}, shell([el("div", {class:"brand-header__in"}, [logo,nav,themeButton()])]))
}
function brandFooter(){
    const links = el("nav", {class:"footer-links", "aria-label":"フッター"});
    brandItems.slice(1).forEach(([name,target]) => links.append(link(name,target)));
    return el("footer", {class:"brand-footer"}, shell([
        el("div", {class:"brand-footer__in"}, [el("div", {}, [el("div", {class:"wordmark"}, [el("span", {class:"mark", text:"R"}),"RELMUA"]),el("p", {text:"つくることの周囲にある、作品、道具、記録、人を、長く育てていくための場所。"})]),links]),
        el("div", {class:"footer-bottom"}, [el("span", {text:"© RELMUA / CONCEPT V1"}), el("span", {text:"A quiet place for making"})])
    ]));
}

function home(){
    const hero = section("home-hero", [
        el("div", {}, [label("Creative brand / since 2026"),heading(1,"余白から、\nつくる。","display"),el("p",{class:"home-hero__copy",text:"RELMUAは、作品だけでなく、つくる過程と関わる人の輪郭までを丁寧に残すクリエイティブブランドです。"}),el("div",{class:"home-hero__actions"},[cta("作品を見る","projects/"),cta("RELMUAについて","about/",true)])]),
        el("div",{class:"home-orbit","aria-label":"RELMUAの軌道を表現する図"},el("div",{class:"home-orbit__caption"},[el("strong",{text:"CURRENT ORBIT"}),"Project, Tool, Note, Creator。離れたものを、ひとつの制作の軌道に置く。 "]))
    ]);
    const statement = section("home-statement",[el("div",{},[label("What we keep"),heading(2,"つくることを、\n急がせない。","display")]),el("p",{text:"速さよりも、見通し。量よりも、手ざわり。RELMUAは、作品が生まれるまでの選択や寄り道も、未来の制作に役立つ資産として扱います。"})]);
    const project = section("home-feature",[el("div",{class:"section-head"},[el("div",{},[label("Selected project"),heading(2,"いま、見てほしいもの。","display")]),link("作品一覧へ →","projects/",{class:"text-link"})]),el("article",{class:"feature-project"},[el("div",{class:"feature-project__art","aria-hidden":"true"}),el("div",{class:"feature-project__body"},[label("01 / Ongoing"),heading(3,"Element\n/ 余白の設計","display"),el("p",{text:"視線の流れと操作の間を観察しながら、静かなインターフェースを試作する継続プロジェクト。"}),cta("展示を見る","projects/")])])]);
    const quick = section("home-feature",[el("div",{class:"section-head"},[el("div",{},[label("Around the practice"),heading(2,"制作を支える、\n小さな場所。","display")])]),el("div",{class:"home-grid"},[
        el("article",{},[label("Tools"),heading(3,"手を止めない\n道具。","display"),el("p",{text:"作業の途中にある、ささやかな摩擦を減らす。"}),link("道具を見る →","tools/",{class:"text-link"})]),
        el("article",{},[label("Notes"),heading(3,"判断を残す\n記録。","display"),el("p",{text:"完成品の背景にある思考を、短く、明確に。"}),link("記録を読む →","notes/",{class:"text-link"})]),
        el("article",{},[label("Creators"),heading(3,"人から始まる\n活動。","display"),el("p",{text:"ブランドの輪郭をつくる、個人の視点と営み。"}),link("活動者を見る →","creators/",{class:"text-link"})])
    ])]);
    const people = section("home-creators",[el("div",{class:"section-head"},[el("div",{},[label("People"),heading(2,"顔の見える、\nブランドへ。","display")]),link("すべての活動者 →","creators/",{class:"text-link"})]),el("div",{class:"people-strip"},[
        el("article",{class:"person-card"},[el("div",{class:"person-card__avatar",text:"千"}),el("div",{},[heading(3,"千景","display"),el("p",{text:"文章、Web、ゲーム、TRPG。異なる制作を、静かな観察とともにつなぐ。"}),link("千景のサイトへ →","chikage/",{class:"text-link"})])]),
        el("article",{class:"person-card person-card--asagiri"},[el("div",{class:"person-card__avatar",text:"朝"}),el("div",{},[heading(3,"朝霧","display"),el("p",{text:"新しい視点と表現を準備中。RELMUAの次の輪郭を、少しずつ育てている。"}),el("span",{class:"text-link",text:"Coming soon"})])])
    ])]);
    return el("main",{},shell([hero,statement,project,quick,people]));
}

const projects = [
    ["01","Element / 余白の設計","操作と静けさの両立を探る、インターフェースの連続研究。"],
    ["02","Eclipse Chronicle","光が弱い場所でこそ見えてくる物語を、テキストと空間で試す。"],
    ["03","Field Notes","観察と採集から始める、小さな視覚言語のアーカイブ。"],
    ["04","未定義の道具箱","制作途中の道具、仕組み、試作を公開前に育てる場所。"]
];
function pageHero(kicker,title,lede){return section("page-hero",[label(kicker),heading(1,title,"display"),el("p",{class:"page-hero__lede",text:lede})])}
function projectsPage(){return el("main",{},shell([pageHero("Projects","見せるためではなく、\n残るための作品。","RELMUAの作品は、完成したものだけではありません。時間をかけて育った問いと、その答えの断片を展示します。"),section("gallery",[el("div",{class:"gallery-grid"},projects.map(([n,t,d]) => el("article",{class:"gallery-card"},[el("span",{class:"card-index",text:n}),heading(2,t,"display"),el("p",{text:d}),el("span",{class:"gallery-card__shape","aria-hidden":"true"})])))] )]));}
function toolsPage(){
    const data=[["01","Index","断片的なメモを、次の行動に変える軽い整理ツール。","毎日使う"],["02","Tone","文章のリズムと温度を確認する、書く人のための道具。","試作中"],["03","Trace","制作の判断を時系列でたどる、個人用の記録ビュー。","Coming soon"],["04","Dice","卓上の偶然を、静かに呼び出すシンプルなロール機能。","公開予定"]];
    return el("main",{},shell([pageHero("Tools","手の速度を、\n思考の速度へ。","毎日使いたくなる道具は、派手な機能ではなく、つまずきをひとつ減らすことから始まります。"),section("tools-list",[el("div",{class:"tools-intro"},[heading(2,"必要なものだけを、\n手元に。","display"),el("p",{text:"RELMUA Toolsは、制作の流れを壊さないための小さなユーティリティ集です。説明は短く、使い始めるまでを軽くします。"})]),...data.map(([id,name,desc,status])=>el("article",{class:"tool-row"},[el("div",{class:"tool-icon",text:id}),el("div",{},[heading(2,name),el("p",{text:desc})]),el("small",{text:status})]))]) ]));
}
function notesPage(){
    const notes=[["2026.07.14","DESIGN","余白は、情報を減らすためだけにあるのではない。","画面に残すものを選び、選ばなかったものにも意味を与える。"],["2026.07.08","PROCESS","最初に決めない、という設計。","早すぎる結論を避けるための、小さな保留について。"],["2026.06.29","SYSTEM","道具の数より、戻ってこられる場所。","ワークフローを増やす前に、制作の現在地を見失わないために。"],["2026.06.21","OBSERVATION","静かな画面は、静かな体験になるか。","視覚的な主張を抑えたとき、操作はどこまで明快でいられるだろう。"]];
    return el("main",{},shell([pageHero("Notes","完成の前にある、\n判断の記録。","これはブログではなく、制作の途中で手元に残した観察と判断です。あとから作品を読み直すための、もうひとつの入口。"),section("notes-list",notes.map(([date,kind,title,desc])=>el("article",{class:"note-row"},[el("time",{text:date}),el("span",{class:"note-kind",text:kind}),el("div",{},[heading(2,title),el("p",{text:desc})]),el("a",{href:"#",text:"読む →"})])))]));
}
function creatorsPage(){return el("main",{},shell([pageHero("Creators","ブランドの前に、\nひとりの人がいる。","RELMUAは、誰かの名前を均質化しません。それぞれの視点と活動が、並んで見えることを大切にします。"),el("section",{class:"creator-grid"},[
    el("article",{class:"creator-profile creator-profile--chikage"},[el("div",{class:"creator-profile__monogram",text:"千"}),label("Creator / Active"),heading(2,"千景","display"),el("p",{text:"制作、Web、Game、TRPG。複数の領域を行き来しながら、言葉と体験の手ざわりを観察する。"}),link("千景のサイトへ →","chikage/")]),
    el("article",{class:"creator-profile"},[el("div",{class:"creator-profile__monogram",text:"朝"}),label("Creator / Coming soon"),heading(2,"朝霧","display"),el("p",{text:"新しい活動領域を準備中。朝霧が何をつくり、何を残すのかは、これから少しずつ見えてきます。"}),el("span",{class:"text-link",text:"準備中"})])
]) ]));}
function aboutPage(){return el("main",{},shell([pageHero("About RELMUA","つくることの、\n周辺を育てる。","作品は、ひとりで突然生まれません。考える時間、使う道具、残した記録、誰かとの関係。そのすべてが制作の一部です。"),section("about-manifesto",[heading(2,"作品を中心にしながら、作品だけを見ない。","display"),el("p",{text:"RELMUAは、個人の制作を長く続けるためのブランドです。公開のために整えるのではなく、次の制作に戻ってこられるように整える。作品、道具、記録、人が互いに意味を持ち始める状態を目指します。"}),el("div",{class:"principles"},[
    el("article",{},[label("01"),heading(3,"静けさ","display"),el("p",{text:"視線と判断を奪わない。余白は、考えるための場所。"})]),
    el("article",{},[label("02"),heading(3,"明瞭さ","display"),el("p",{text:"美しさのために、使いやすさを曖昧にしない。"})]),
    el("article",{},[label("03"),heading(3,"継続性","display"),el("p",{text:"いまだけではなく、数年後にも意味を持てる形にする。"})])
])]) ]));}
function contactPage(){
    const form = el("form",{class:"contact-form"});
    [["お名前","name","text"],["返信先","email","email"],["ご用件","subject","text"]].forEach(([labelText,id,type])=>{const input=el("input",{id,type,required:""});form.append(el("label",{htmlFor:id,text:labelText}),input)});
    const message=el("textarea",{id:"message",required:""});form.append(el("label",{htmlFor:"message",text:"メッセージ"}),message);
    const status=el("p",{class:"form-status","aria-live":"polite"}); form.append(button("送信内容を確認する",{class:"button",type:"submit"}),status); form.addEventListener("submit",e=>{e.preventDefault();status.textContent="ありがとうございます。これはプロトタイプのため、送信は行われません。"});
    return el("main",{},shell([pageHero("Contact","話しかけるための、\n余白。","依頼、感想、制作についての会話。RELMUAへの連絡は、内容がまだ整理されていなくても大丈夫です。"),section("contact-grid",[el("article",{class:"contact-card"},[label("For a conversation"),heading(2,"まず、\n言葉から。","display"),el("p",{text:"公開されている活動について、または新しい取り組みについて。短いメッセージから始められます。"}),el("p",{text:"通常、3営業日以内に返信します。"})]),el("article",{class:"contact-card"},[label("Message"),form])]) ]));
}
function notFound(){return el("main",{},shell([section("not-found",[label("Lost, not gone"),heading(1,"404","display"),heading(2,"この場所は、まだ見つかっていません。","display"),el("p",{text:"URLが変わったか、これからつくられるページかもしれません。RELMUAの入口から、もう一度始めてください。"}),cta("ホームへ戻る","")]) ]));}

function chikageHeader(){
    const nav=el("nav",{class:"chikage-nav","aria-label":"千景サイト内"});
    [["千景","chikage/","chikage"],["プロフィール","chikage/#profile","chikage"],["作品","chikage/#works","chikage"],["記録","chikage/#notes","chikage"],["TRPG","trpg/","trpg"],["連絡先","chikage/#contact","chikage"]].forEach(([t,u,id])=>nav.append(link(t,u,{...(id===page&&t===(page==="chikage"?"千景":"TRPG")?{"aria-current":"page"}:{})})));
    return el("header",{class:"chikage-header"},shell([el("div",{class:"chikage-header__top"},[el("div",{class:"chikage-name",text:"千景"}),link("← RELMUAへ戻る","",{class:"chikage-back"})]),nav]));
}
function chikagePage(){return el("main",{},shell([section("chikage-hero",[el("div",{},[label("Chikage / personal site"),heading(1,"静かな場所で、\nつくる。","display"),el("p",{text:"千景は、文章、画面、遊びをつくる人の個人サイトです。活動を急いで並べず、そのとき考えていることから始めます。"}),el("div",{class:"home-hero__actions"},[cta("制作を見る","chikage/#works"),cta("TRPGへ","trpg/",true)])]),el("div",{class:"season-art","aria-label":"藍色の山と季節を表す抽象画"})]),
    el("section",{class:"chikage-sections",id:"works"},[el("article",{},[label("Works"),heading(2,"制作","display"),el("p",{text:"画面と言葉を往復しながら、体験の輪郭をつくります。"})]),el("article",{},[label("Notes"),heading(2,"記録","display"),el("p",{text:"日々の制作で見つけた、名前のない判断を残します。"})]),el("article",{},[label("TRPG"),heading(2,"遊び","display"),el("p",{text:"卓上にある物語と、そこで生まれる時間について。"}),link("シナリオ書架へ →","trpg/",{class:"text-link"})])]),
    section("chikage-journal",[el("div",{},[label("Recent notes"),heading(2,"季節のあいだに、\n残したこと。","display")]),el("div",{},[["2026.07.12","屏風のような画面について","画面を二分する線は、情報を分けるだけでなく、視線を休ませる場所にもなる。"],["2026.07.02","薄明の配色","暗くするためではなく、光を置く場所をつくるための藍。"],["2026.06.17","ゲームの入口","遊びの前に、世界へ入るための小さな予感を置く。"]].map(([date,title,desc])=>el("article",{class:"journal-entry"},[el("time",{text:date}),el("div",{},[heading(3,title),el("p",{text:desc})])])))]),
    section("contact-grid",[el("article",{class:"contact-card",id:"contact"},[label("Contact"),heading(2,"連絡先","display"),el("p",{text:"活動についての連絡や、静かな制作の話はこちらから。"})]),el("article",{class:"contact-card"},[el("p",{text:"外部の連絡先は、公開準備が整い次第ここに追加されます。"}),cta("RELMUAの連絡先へ","contact/",true)])])
 ]));}

function libraryHeader(){return el("header",{class:"library-header"},shell([el("div",{class:"library-header__in"},[el("div",{},[el("div",{class:"library-title",text:"千景のシナリオ書架"}),el("span",{class:"eyebrow",text:"A quiet library for tabletop stories"})]),el("nav",{class:"library-nav","aria-label":"書架ナビゲーション"},[link("シナリオ","trpg/",{...(page==="trpg"?{"aria-current":"page"}:{})}),link("卓のしおり","trpg/rules/",{...(page==="rules"?{"aria-current":"page"}:{})}),link("千景へ","chikage/")])]) ]));}
const books=[["夜を継ぐ庭","CoC 6th","2–4人 / 4–6時間","夜だけ花を咲かせる庭園で、失われた約束を探す。"],["霧中標本","エモクロア","3–5人 / 3時間","名前のない感情を採集する、夏の終わりの標本室。"],["白紙の航路","CoC 7th","2–3人 / 5時間","海図から消えた島へ向かう、静かな探索譚。"],["ひとひらの観測者","マーダーミステリー","4人 / 2時間","観測記録に残された、ある夜の矛盾をたどる。"],["灯台には手紙がある","CoC 6th","2–4人 / 4時間","海辺の小さな灯台と、届かなかった手紙の話。"]];
function trpgPage(){
    const grid=el("section",{class:"book-grid","aria-live":"polite"}); const display = list => grid.replaceChildren(...list.map(([title,sys,meta,desc])=>el("article",{class:"book"},[el("div",{class:"book__spine"}),label(sys),heading(2,title,"display"),el("p",{text:desc}),el("div",{class:"book__meta"},[el("span",{text:meta}),el("span",{text:"詳細を見る"})])])));
    const chips=el("div",{class:"shelf-filter"}); ["すべて","CoC","エモクロア","短時間","少人数"].forEach((name,i)=>{const chip=button(name,{class:`filter-chip${i===0?" is-active":""}`});chip.addEventListener("click",()=>{chips.querySelectorAll("button").forEach(item=>item.classList.remove("is-active"));chip.classList.add("is-active");display(name==="すべて"?books:books.filter(item=>name==="CoC"?item[1].includes("CoC"):name==="エモクロア"?item[1].includes(name):name==="短時間"?item[2].includes("2時間")||item[2].includes("3時間"):item[2].includes("2–")||item[2].includes("2–3")));});chips.append(chip)});display(books);
    return el("main",{},shell([section("library-hero",[label("Scenario library / Chikage"),heading(1,"物語を、\n棚から選ぶ。","display"),el("p",{text:"条件を入力して絞り込む前に、まず本棚を眺める。遊びたい夜の気分から、物語に出会うための書架です。"})]),el("div",{class:"shelf-toolbar"},[chips,el("span",{class:"shelf-count",text:"05 STORIES / UPDATED 2026.07"})]),grid]));
}
function rulesPage(){
    const toc=el("aside",{class:"rules-toc"},[heading(2,"目次"),...[["はじめに","intro"],["卓の空気","atmosphere"],["安全と合意","safety"],["セッション後","after"]].map(([t,id])=>el("a",{href:`#${id}`,text:t}))]);
    const doc=el("article",{class:"rules-document"},[label("House rules / Chikage"),heading(1,"卓のしおり","display"),el("p",{class:"rules-note",text:"ここにあるのは、遊びを縛るためのルールではありません。全員が物語に安心して入るための、最初の合図です。"}),
        ...[["intro","はじめに","千景の卓では、ルールの正しさよりも、参加者が物語を楽しめることを優先します。判断に迷うときは、いちばん物語が前へ進む方法を一緒に選びます。"],["atmosphere","卓の空気","開始前に、その日の遊び方や気分を短く共有します。発言の速さ、演出の濃さ、休憩の取り方も、卓ごとに変えてよいものです。"],["safety","安全と合意","苦手な表現や避けたい題材は、いつでも伝えてください。途中で気持ちが変わっても構いません。物語よりも、参加している人を大切にします。"],["after","セッション後","終了後には、短く感想を交わす時間を取ります。楽しかった場面、気になったこと、次に持ち越したいことを残し、物語を静かに閉じます。"]].map(([id,title,text])=>el("section",{id},[label(id.toUpperCase()),heading(2,title),el("p",{text}),el("p",{text:"必要に応じて、休憩・巻き戻し・場面転換を提案できます。進行のために無理をする必要はありません。"})]))]);
    return el("main",{},shell([el("div",{class:"rules-layout"},[toc,doc]) ]));
}

function adminRail(){return el("aside",{class:"admin-rail"},[el("div",{class:"admin-brand"},[el("span",{class:"mark",text:"R"}),el("span",{text:"RELMUA / STUDIO"})]),el("nav",{class:"admin-nav","aria-label":"Studio navigation"},[["01","Overview","admin/","admin"],["02","Command room","admin/terminal/","terminal"],["03","Publish","#",""],["04","Library","#",""],["05","Settings","#",""]].map(([id,title,target,selected])=>link("",target,{...(selected===page?{"aria-current":"page"}:{}),children:[]},[el("i",{text:id}),el("span",{text:title})]))),el("div",{class:"admin-user",text:"千景 / OWNER\nAll systems operational"})]);}
function adminTop(){return el("div",{class:"admin-topbar"},[el("span",{class:"admin-crumb",text:"STUDIO / CURRENT SPACE"}),el("div",{class:"admin-actions"},[button("プレビュー",{class:"admin-button"}),button("公開準備",{class:"admin-button admin-button--accent"})])]);}
function metric(labelText,value){return el("article",{class:"metric"},[el("span",{text:labelText}),el("strong",{text:value})]);}
function adminPage(){return el("div",{class:"admin-shell"},[adminRail(),el("main",{class:"admin-main"},[adminTop(),el("section",{class:"admin-heading"},[el("div",{},[heading(1,"おはよう、千景。","display"),el("p",{text:"今日の制作を、ひとつずつ前へ。"})]),el("span",{class:"save-status",text:"すべて保存済み"})]),el("section",{class:"admin-metrics"},[metric("PUBLIC ITEMS","12"),metric("DRAFTS","04"),metric("OPEN TASKS","07"),metric("LAST EXPORT","09:42")]),el("section",{class:"admin-grid"},[el("article",{class:"admin-card"},[el("div",{class:"admin-card__head"},[heading(2,"次に進めること"),el("small",{text:"FOCUS / 03"})]),el("div",{class:"work-list"},[["Scenario libraryの空状態を整える","TRPG / Interface","今日"],["朝霧のプロフィール構成を決める","Creators / Content","明日"],["夏の制作記録を公開する","Notes / Publish","今週" ]].map(([t,d,date])=>el("article",{class:"work-item"},[el("span",{class:"work-dot"}),el("div",{},[heading(3,t),el("p",{text:d})]),el("time",{text:date})])))]),el("article",{class:"admin-card"},[el("div",{class:"admin-card__head"},[heading(2,"制作シグナル"),el("small",{text:"LIVE"})]),el("div",{class:"signal-list"},[el("article",{class:"signal"},[el("b",{text:"PUBLIC"}),el("p",{text:"公開データは最新です。次回Exportまで問題ありません。"})]),el("article",{class:"signal"},[el("b",{text:"ATTENTION"}),el("p",{text:"2件の下書きが7日以上更新されていません。"})])])])])])]);}
function terminalPage(){
    const nodes=[["01","ブランド","Home、作品、道具、記録をひとつの軌道で管理。"],["02","活動者","千景と朝霧、それぞれのサイトの現在地。"],["03","公開","Export、配信、公開前チェックを一箇所に。"],["04","書架","TRPG、シナリオ、ハウスルールの編集と整合性。"],["05","設計","トークン、コンポーネント、テーマの観察。"],["06","保管庫","バックアップと履歴。必要なときに戻れること。"]];
    return el("div",{class:"admin-shell"},[adminRail(),el("main",{class:"admin-main"},[adminTop(),el("section",{class:"admin-heading"},[el("div",{},[heading(1,"Command room","display"),el("p",{text:"ブランドを眺め、次の一手を選ぶための司令室。"})]),el("span",{class:"save-status",text:"Studio online"})]),el("section",{class:"command-hero"},[label("RELMUA / COMMAND ROOM"),heading(1,"つくるための世界を、\n見渡す。","display"),el("p",{text:"制作の現在地、公開の準備、各サイトの状態。分散しがちな作業を、ひとつの地図として扱う。"}),el("div",{class:"command-actions"},[button("今日の作業を開く",{class:"admin-button admin-button--accent"}),button("公開前チェック",{class:"admin-button"})])]),el("section",{class:"command-map"},nodes.map(([id,t,d])=>el("article",{class:"command-node"},[el("span",{class:"node-id",text:id}),heading(2,t),el("p",{text:d})])))] )]);}

function mount(){
    if(mode === "brand"){
        body.append(brandHeader());
        const views={home,projects:projectsPage,tools:toolsPage,notes:notesPage,creators:creatorsPage,about:aboutPage,contact:contactPage,"404":notFound}; body.append(views[page]()); body.append(brandFooter());
    }else if(mode === "chikage"){
        body.append(chikageHeader(),chikagePage(),brandFooter());
    }else if(mode === "library"){
        body.append(libraryHeader(),page === "trpg" ? trpgPage() : rulesPage(),brandFooter());
    }else if(mode === "admin"){
        body.append(page === "admin" ? adminPage() : terminalPage());
    }
}
mount();
