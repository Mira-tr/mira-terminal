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


    const input =
        document.getElementById(
            inputId
        );


    const area =
        document.getElementById(
            areaId
        );



    input.addEventListener(
        "input",
        ()=>{


            const word =
                input.value;


            area.innerHTML="";


            if(!word)return;



            authors

            .filter(
                a=>a.includes(word)
            )

            .forEach(author=>{


                const btn =
                    document.createElement(
                        "button"
                    );


                btn.type="button";


                btn.className=
                    "author-suggest";


                btn.textContent =
                    author;



                btn.addEventListener(
                    "click",
                    ()=>{


                        input.value =
                            author;


                        area.innerHTML="";

                    }
                );



                area.appendChild(
                    btn
                );


            });


        }
    );

}