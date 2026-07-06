export function ratingText(rating){

    return {

        all:"全年齢",
        r18:"R18",
        r18g:"R18G"

    }[rating || "all"];

}