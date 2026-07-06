import {
    AUTHOR_KEY,
    load,
    save
} from "../../store.js";

let authors = normalizeAuthors(
    load(
        AUTHOR_KEY,
        []
    )
);

export function getAuthors(){
    return [...authors];
}

export function saveAuthor(name){
    const author = normalizeAuthor(name);

    if(!author){
        return;
    }

    if(authors.includes(author)){
        return;
    }

    authors = [
        ...authors,
        author
    ];

    save(
        AUTHOR_KEY,
        authors
    );
}

export function setAuthors(data){
    authors = normalizeAuthors(data);

    save(
        AUTHOR_KEY,
        authors
    );
}

export function initAuthorSuggest(inputId, areaId){
    const input = document.getElementById(inputId);
    const area = document.getElementById(areaId);

    input.addEventListener("input", ()=>{
        renderAuthorSuggest(input, area);
    });
}

export function deleteAuthor(name){
    if(!confirm(`${name} を作者候補から削除しますか？`)){
        return;
    }

    authors = authors.filter(
        author=>author !== name
    );

    save(
        AUTHOR_KEY,
        authors
    );
}

function renderAuthorSuggest(input, area){
    const word = normalizeAuthor(input.value);
    const fragment = document.createDocumentFragment();

    if(!word){
        area.replaceChildren();
        return;
    }

    authors
    .filter(author=>author.includes(word))
    .forEach(author=>{
        fragment.appendChild(
            createAuthorSuggestItem(author, input, area)
        );
    });

    area.replaceChildren(fragment);
}

function createAuthorSuggestItem(author, input, area){
    const wrapper = document.createElement("div");
    wrapper.className = "author-suggest-wrapper";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "author-suggest";
    btn.textContent = author;

    btn.addEventListener("click", ()=>{
        input.value = author;
        area.replaceChildren();
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "author-delete";
    del.textContent = "×";
    del.setAttribute("aria-label", `${author} を作者候補から削除`);

    del.addEventListener("click", event=>{
        event.stopPropagation();
        deleteAuthor(author);
        area.replaceChildren();
    });

    wrapper.append(btn, del);
    return wrapper;
}

function normalizeAuthors(data){
    if(!Array.isArray(data)){
        return [];
    }

    return [
        ...new Set(
            data
            .map(normalizeAuthor)
            .filter(Boolean)
        )
    ];
}

function normalizeAuthor(name){
    return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ");
}