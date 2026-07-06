import {
    TAG_KEY,
    save
} from "../../store.js";


let masterTags = [];
let selectedTags = [];


export function initTags(tags){

    masterTags = tags;
    selectedTags = [];

    renderTagButtons();
}


export function getSelectedTags(){

    return selectedTags;

}


export function setSelectedTags(tags){

    selectedTags = [
        ...(tags || [])
    ];

    syncTagsInput();

    renderTagButtons();

}


export function renderTagButtons(){

    const area =
        document.getElementById("tagButtons");


    area.innerHTML="";


    masterTags.forEach(tag=>{


        const wrapper =
            document.createElement("div");


        wrapper.className="tag-wrapper";


        const btn =
            document.createElement("button");


        btn.type="button";

        btn.textContent="#"+tag;


        btn.className =
            selectedTags.includes(tag)
            ?
            "tag-button active"
            :
            "tag-button";


        btn.addEventListener(
            "click",
            ()=>{


                selectedTags.includes(tag)
                ?
                selectedTags =
                    selectedTags.filter(
                        t=>t!==tag
                    )
                :
                selectedTags.push(tag);


                syncTagsInput();

                renderTagButtons();

            }
        );


        const del =
            document.createElement("button");


        del.type="button";

        del.textContent="×";

        del.className="tag-delete";


        del.addEventListener(
            "click",
            ()=>deleteTag(tag)
        );


        wrapper.append(
            btn,
            del
        );


        area.appendChild(
            wrapper
        );

    });

}


export function addMasterTag(){

    const input =
        document.getElementById(
            "newTagInput"
        );


    const tag =
        input.value.trim();


    if(!tag)return;


    if(!masterTags.includes(tag)){


        masterTags.push(tag);


        save(
            TAG_KEY,
            masterTags
        );

    }


    if(!selectedTags.includes(tag)){

        selectedTags.push(tag);

    }


    input.value="";


    syncTagsInput();

    renderTagButtons();

}



function deleteTag(tag){


    if(
        !confirm(
            `#${tag} を削除しますか？`
        )
    ){
        return;
    }


    masterTags =
        masterTags.filter(
            t=>t!==tag
        );


    selectedTags =
        selectedTags.filter(
            t=>t!==tag
        );


    save(
        TAG_KEY,
        masterTags
    );


    syncTagsInput();

    renderTagButtons();

}



function syncTagsInput(){


    document
    .getElementById("tags")
    .value =
    selectedTags.join(",");

}