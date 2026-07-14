const DATA_URL = "./data/public-notes.json";
const SUPPORTED_SCHEMA_VERSION = 1;

async function fetchNotes(){
    const response = await fetch(DATA_URL, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`Failed to load Notes data: ${response.status}`);
    }

    const data = await response.json();
    const schemaVersion = Number(data?.schemaVersion);

    if(
        !data ||
        data.module !== "notes" ||
        data.exportType !== "public-notes" ||
        !Number.isInteger(schemaVersion) ||
        schemaVersion > SUPPORTED_SCHEMA_VERSION ||
        !Array.isArray(data.notes)
    ){
        throw new Error("Notes data format is invalid.");
    }

    return data.notes
        .filter(value => value && typeof value === "object")
        .map(value => ({
            id: text(value.id),
            title: text(value.title),
            summary: text(value.summary),
            body: text(value.body),
            category: text(value.category),
            tags: Array.isArray(value.tags)
                ? value.tags.map(text).filter(Boolean)
                : [],
            authorCreatorId: text(value.authorCreatorId),
            order: Number(value.order) || 0
        }))
        .filter(value => value.id && value.title)
        .filter(isBrandVisibleNote)
        .sort((a, b) => a.order - b.order);
}

function isBrandVisibleNote(note){
    const source = [
        note.title,
        note.summary,
        note.body,
        note.category,
        ...note.tags
    ].join(" ").toLowerCase();

    return ![
        "mira terminal",
        "trpg",
        "house rules",
        "scenario library",
        "ハウスルール",
        "シナリオ管理"
    ].some(keyword => source.includes(keyword.toLowerCase()));
}

function text(value){
    return String(value ?? "").trim();
}

function createBrandTextLink(label, href){
    const link = document.createElement("a");
    link.className = "brand-text-link";
    link.href = href;
    link.textContent = label;
    return link;
}

function createNotesEmptyState(title, message){
    const box = document.createElement("div");
    box.className = "notes-empty-state";
    box.setAttribute("role", "status");

    const label = document.createElement("p");
    label.className = "section-label";
    label.textContent = "記録";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const description = document.createElement("p");
    description.textContent = message;

    box.append(
        label,
        heading,
        description,
        createBrandTextLink("作品を見る", "../projects/")
    );
    return box;
}

function createNoteRow(note){
    const article = document.createElement("article");
    article.className = "note-row";

    // When Notes adds publishedAt, this row can place the date beside the category
    // without changing the current public-notes.json structure.
    const category = document.createElement("p");
    category.className = "note-category";
    category.textContent = note.category || "記録";

    const title = document.createElement("h3");
    title.textContent = note.title;

    const summary = document.createElement("p");
    summary.className = "note-summary";
    summary.textContent = note.summary || "概要を準備しています。";

    const main = document.createElement("div");
    main.className = "note-row-main";
    main.append(title, summary);

    article.append(category, main);

    if(note.body){
        const detail = document.createElement("details");
        detail.className = "note-body-detail";

        const detailLabel = document.createElement("summary");
        detailLabel.textContent = "読む";

        const body = document.createElement("p");
        body.className = "note-body";
        body.textContent = note.body;
        detail.append(detailLabel, body);
        article.appendChild(detail);
    }

    return article;
}

function renderCategoryRail(notes, rail){
    const categories = Array.from(new Set(notes.map(note => note.category || "記録")));
    const chips = ["すべて", ...categories].map(label => {
        const chip = document.createElement("span");
        chip.className = "notes-category-label";
        chip.textContent = label;
        return chip;
    });

    rail.replaceChildren(...chips);
}

async function init(){
    const list = document.getElementById("notesList");
    const rail = document.getElementById("notesCategoryRail");

    if(!list || !rail){
        return;
    }

    try{
        const notes = await fetchNotes();
        renderCategoryRail(notes, rail);
        updateNotesSummary(notes.length);
        list.replaceChildren(...(
            notes.length
                ? notes.map(createNoteRow)
                : [
                    createNotesEmptyState(
                        "公開できる記録から、静かに置いていきます",
                        "制作の判断や移行メモなど、あとから読み返す価値のあるものだけを掲載します。"
                    )
                ]
        ));
    }catch(error){
        console.warn("Failed to load Notes data.", error);
        updateNotesSummary(0, true);
        list.replaceChildren(
            createNotesEmptyState(
                "記録を読み込めませんでした",
                "時間を置いて再度お試しください。"
            )
        );
    }
}

function updateNotesSummary(count, failed = false){
    const summary = document.getElementById("notesSummary");

    if(!summary){
        return;
    }

    if(failed){
        summary.textContent = "記録一覧を一時的に読み込めません。";
        return;
    }

    summary.textContent = count
        ? `${count}件の記録を公開順に表示しています。`
        : "読み返す価値のある制作記録から掲載します。";
}

if(typeof document !== "undefined"){
    init();
}
