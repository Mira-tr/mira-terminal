export function getElement(id){
    const element = document.getElementById(id);

    if(!element){
        throw new Error(`#${id} が見つかりません`);
    }

    return element;
}

export function createOption(value, label){
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;

    return option;
}

export function clearElement(element){
    element.textContent = "";
}