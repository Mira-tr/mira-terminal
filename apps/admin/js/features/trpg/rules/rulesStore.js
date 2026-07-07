import {
    RULES_KEY,
    load,
    save
} from "../../../store.js";

const DEFAULT_RULES = {
    systems: [
        {
            id: "coc6",
            label: "CoC6版",
            description: "MIRA卓で使用するクトゥルフ神話TRPG 6版のハウスルールです。",
            status: "public",
            sections: [
                {
                    id: "intro",
                    title: "はじめに",
                    body: "MIRA卓では、以下の方針でTRPGを行います。\n\n- ルールブックの基本ルールを尊重する\n- 不明点はGMの裁定に従う\n- プレイヤーの提案を柔軟に検討する\n- 楽しくプレイすることを最優先する",
                    order: 1,
                    status: "public"
                },
                {
                    id: "system",
                    title: "使用ルール",
                    body: "主に以下のルールブックを使用します。\n\n- クトゥルフの呼び声 第6版（CoC6）\n- クトゥルフの呼び声 第7版（CoC7）\n- エモクロア コアルールブック\n- その他、シナリオに応じたルール",
                    order: 2,
                    status: "public"
                },
                {
                    id: "character",
                    title: "キャラクター作成",
                    body: "能力値\n基本的にルールブック通りのロールで決定します。ただし、GMの許可があればポイントバイ方式も可能です。\n\n技能\n技能ポイントはルールブック通りに配分してください。職業技能は職業に応じたものを選択します。\n\n技能上限\n初期段階での技能上限は以下の通りです。\n\n- 職業技能：最大75%\n- 興味技能：最大50%\n- ただし、シナリオによって上限が変更される場合があります",
                    order: 3,
                    status: "public"
                },
                {
                    id: "english-skills",
                    title: "英語技能の初期値",
                    body: "英語技能の初期値はルールブック通りに設定してください。シナリオによっては初期値が変更される場合があります。",
                    order: 4,
                    status: "public"
                },
                {
                    id: "skills-growth",
                    title: "技能・成長",
                    body: "技能の成長はルールブック通りに行います。セッション終了後に技能ロールを行い、成功した場合のみ技能値が上昇します。",
                    order: 5,
                    status: "public"
                },
                {
                    id: "sanity",
                    title: "狂気",
                    body: "SAN値チェック\nルールブック通りのSAN値チェックを行います。失敗した場合の狂気症状は、GMが状況に応じて決定します。\n\n一時的狂気\n一時的狂気になったPCは、GMの指示に従ってロールプレイを行います。他のプレイヤーも協力して演出に参加してください。\n\n不定の狂気\n不定の狂気になった場合、そのセッション中は回復しません。セッション終了後に治療が必要です。",
                    order: 6,
                    status: "public"
                },
                {
                    id: "combat",
                    title: "戦闘",
                    body: "イニシアチブ\n戦闘開始時のDEXロールで決定します。同値の場合はDEXの高い順、それも同じ場合はGMの裁定で決定します。\n\n射撃\n射撃武器の使用には技能ロールが必要です。失敗した場合、弾薬を消費しても命中しません。ファンブルの場合はジャムや誤射の可能性があります。\n\n部位狙い\n部位狙いを行う場合、通常の難易度に加えてペナルティを受けます。具体的な難易度はGMが状況に応じて決定します。\n\nかばう\n「かばう」アクションを行うには、DEXロールか技能ロールが必要です。成功した場合、対象が受けるダメージを肩代わりします。\n\n致死ダメージ\n致死ダメージを受けた場合、即死チェックを行います。失敗した場合、そのPCは死亡します。",
                    order: 7,
                    status: "public"
                },
                {
                    id: "special-rulings",
                    title: "特殊裁定",
                    body: "シナリオ固有の特殊裁定がある場合、GMが事前に説明します。不明点はセッション中に確認してください。",
                    order: 8,
                    status: "public"
                },
                {
                    id: "r18-rating",
                    title: "R18区分",
                    body: "全年齢（All）\n一般的なTRPGシナリオです。年齢制限はありません。\n\nR18\n18歳未満の参加は推奨しません。暴力的描写や性的な表現が含まれる可能性があります。\n\nR18G\n18歳未満の参加は禁止です。過激な暴力表現や性的表現が含まれます。",
                    order: 9,
                    status: "public"
                },
                {
                    id: "notice",
                    title: "参加時のお願い",
                    body: "時間厳守\n開始時間は厳守してください。遅刻の場合、途中参加となる可能性があります。\n\n環境\n騒音の少ない環境で参加してください。マイクの使用は推奨します。\n\nマナー\n他のプレイヤーへの敬意を持ってロールプレイを行ってください。不快な言動は慎んでください。\n\n休憩\n適宜休憩を挟みます。休憩中は雑談や準備を行ってください。\n\nキャンセル\nやむを得ずキャンセルする場合は、事前にGMへ連絡してください。",
                    order: 10,
                    status: "public"
                }
            ]
        },
        {
            id: "coc7",
            label: "CoC7版",
            description: "MIRA卓で使用するクトゥルフ神話TRPG 7版のハウスルールです。",
            status: "draft",
            sections: []
        }
    ]
};

export function loadRules(){
    return load(
        RULES_KEY,
        DEFAULT_RULES
    );
}

export function saveRules(rules){
    return save(
        RULES_KEY,
        rules
    );
}

export function getRules(){
    return loadRules();
}

export function setRules(rules){
    saveRules(rules);
}

export function getSystem(systemId){
    const rules = getRules();
    return rules.systems.find(s => s.id === systemId);
}

export function updateSystem(systemId, updates){
    const rules = getRules();
    const systemIndex = rules.systems.findIndex(s => s.id === systemId);
    
    if(systemIndex === -1){
        return false;
    }
    
    rules.systems[systemIndex] = {
        ...rules.systems[systemIndex],
        ...updates
    };
    
    setRules(rules);
    return true;
}

export function addSection(systemId, section){
    const rules = getRules();
    const system = rules.systems.find(s => s.id === systemId);
    
    if(!system){
        return false;
    }
    
    const maxOrder = system.sections.length > 0
        ? Math.max(...system.sections.map(s => s.order))
        : 0;
    
    system.sections.push({
        ...section,
        order: maxOrder + 1,
        status: "draft"
    });
    
    setRules(rules);
    return true;
}

export function updateSection(systemId, sectionId, updates){
    const rules = getRules();
    const system = rules.systems.find(s => s.id === systemId);
    
    if(!system){
        return false;
    }
    
    const sectionIndex = system.sections.findIndex(s => s.id === sectionId);
    
    if(sectionIndex === -1){
        return false;
    }
    
    system.sections[sectionIndex] = {
        ...system.sections[sectionIndex],
        ...updates
    };
    
    setRules(rules);
    return true;
}

export function deleteSection(systemId, sectionId){
    const rules = getRules();
    const system = rules.systems.find(s => s.id === systemId);
    
    if(!system){
        return false;
    }
    
    system.sections = system.sections.filter(s => s.id !== sectionId);
    
    setRules(rules);
    return true;
}

export function moveSection(systemId, sectionId, direction){
    const rules = getRules();
    const system = rules.systems.find(s => s.id === systemId);
    
    if(!system){
        return false;
    }
    
    const sectionIndex = system.sections.findIndex(s => s.id === sectionId);
    
    if(sectionIndex === -1){
        return false;
    }
    
    const section = system.sections[sectionIndex];
    const targetIndex = direction === "up" ? sectionIndex - 1 : sectionIndex + 1;
    
    if(targetIndex < 0 || targetIndex >= system.sections.length){
        return false;
    }
    
    const targetSection = system.sections[targetIndex];
    const tempOrder = section.order;
    
    section.order = targetSection.order;
    targetSection.order = tempOrder;
    
    system.sections.sort((a, b) => a.order - b.order);
    
    setRules(rules);
    return true;
}
