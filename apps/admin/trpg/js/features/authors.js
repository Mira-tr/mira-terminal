import {

    AUTHOR_KEY,

    load,
    save

} from "../store.js";



let authors =
    load(
        AUTHOR_KEY,
        []
    );



export function getAuthors(){

    return authors;

}



export function saveAuthor(name){

    if(!name)return;


    if(
        !authors.includes(name)
    ){

        authors.push(name);


        save(
            AUTHOR_KEY,
            authors
        );

    }

}



export function setAuthors(data){

    authors =
        data || [];


    save(
        AUTHOR_KEY,
        authors
    );

}



export function initAuthorSuggest(inputId, areaId){
    const input = document.getElementById(inputId);
    const area = document.getElementById(areaId);

    input.addEventListener("input",()=>{
        const word = input.value.trim();
        area.innerHTML = "";

        if(!word)return;

        authors
        .filter(author=>author.includes(word))
        .forEach(author=>{
            const wrapper = document.createElement("div");
            wrapper.className = "author-suggest-wrapper";

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "author-suggest";
            btn.textContent = author;

            btn.addEventListener("click",()=>{
                input.value = author;
                area.innerHTML = "";
            });

            const del = document.createElement("button");
            del.type = "button";
            del.className = "author-delete";
            del.textContent = "×";

            del.addEventListener("click",e=>{
                e.stopPropagation();
                deleteAuthor(author);
                area.innerHTML = "";
            });

            wrapper.append(btn,del);
            area.appendChild(wrapper);
        });
    });
}



export function deleteAuthor(name){
    if(!confirm(`${name} を作者候補から削除しますか？`)){
        return;
    }

    authors = authors.filter(
        author=>author!==name
    );

    save(
        AUTHOR_KEY,
        authors
    );
}