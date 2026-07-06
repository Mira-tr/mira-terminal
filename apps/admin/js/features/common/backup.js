import {

    TAG_KEY,
    AUTHOR_KEY,

    save

} from "../../store.js";


import {

    showMessage

} from "../../utils.js";



export function exportData(
    scenarios,
    masterTags,
    authors
){

    const backup = {

        version:"1.0.0",

        exportedAt:
            new Date()
            .toISOString(),

        scenarios,

        tags:
            masterTags,

        authors

    };


    const blob =
        new Blob(
            [
                JSON.stringify(
                    backup,
                    null,
                    2
                )
            ],
            {
                type:"application/json"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const a =
        document.createElement("a");


    a.href=url;


    a.download=
        "mira-terminal-backup.json";


    a.click();


    URL.revokeObjectURL(url);


    showMessage(
        "データを出力しました"
    );

}



export function importData(
    event,
    callback
){

    const file =
        event.target.files[0];


    if(!file)return;


    const reader =
        new FileReader();



    reader.onload=e=>{


        try{


            const backup =
                JSON.parse(
                    e.target.result
                );


            if(
                !backup.scenarios
                ||
                !backup.tags
            ){

                alert(
                    "バックアップ形式が違います"
                );

                return;
            }



            if(
                !confirm(
                    "現在のデータを上書きしますか？"
                )
            ){
                return;
            }



            save(
                TAG_KEY,
                backup.tags
            );


            save(
                AUTHOR_KEY,
                backup.authors || []
            );


            callback(
                backup
            );


            showMessage(
                "読み込みました"
            );


        }catch{


            alert(
                "読み込み失敗"
            );

        }

    };


    reader.readAsText(file);


    event.target.value="";

}