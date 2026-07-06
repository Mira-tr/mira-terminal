export function filterScenarios(
    scenarios,
    options
){

    let result =
        [...scenarios];


    const keyword =
        options.keyword
        .toLowerCase();


    if(keyword){

        result =
            result.filter(
                s=>

                s.title
                .toLowerCase()
                .includes(keyword)

                ||

                s.author
                .toLowerCase()
                .includes(keyword)
            );

    }



    if(options.status){

        result =
            result.filter(
                s=>
                s.status === options.status
            );

    }



    if(options.system){

        result =
            result.filter(
                s=>
                s.system === options.system
            );

    }



    if(options.sort==="name"){

        result.sort(
            (a,b)=>

            (a.kana || a.title)
            .localeCompare(
                b.kana || b.title,
                "ja"
            )
        );

    }



    if(options.sort==="date"){

        result.sort(
            (a,b)=>
            b.createdAt - a.createdAt
        );

    }



    return result;

}