import {

    STORAGE_KEY,

    load,
    save

} from "../../store.js";


let scenarios =
    load(
        STORAGE_KEY,
        []
    );


export function getScenarios(){

    return scenarios;

}


export function addScenario(data){

    scenarios.push(data);

    saveScenarios();

}


export function updateScenario(data){

    scenarios =
        scenarios.map(
            scenario=>
                scenario.id===data.id
                ?
                data
                :
                scenario
        );


    saveScenarios();

}


export function deleteScenario(id){

    scenarios =
        scenarios.filter(
            scenario=>scenario.id!==id
        );


    saveScenarios();

}


export function setScenarios(data){

    scenarios =
        data || [];


    saveScenarios();

}


export function saveScenarios(){

    save(
        STORAGE_KEY,
        scenarios
    );

}