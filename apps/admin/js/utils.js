// =====================
// DOM
// =====================

export function value(id){

    return document
    .getElementById(id)
    .value;

}


export function setValue(id,val){

    document
    .getElementById(id)
    .value =
    val || "";

}


// =====================
// Message
// =====================

export function showMessage(text){

    const msg =
        document
        .getElementById("message");


    msg.textContent=text;


    setTimeout(()=>{

        msg.textContent="";

    },1500);

}