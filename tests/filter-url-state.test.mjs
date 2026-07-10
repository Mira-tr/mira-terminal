import test from "node:test";
import assert from "node:assert/strict";

import {
    createFilterSearch,
    createFilterUrl,
    hasShareableFilterState,
    readFilterStateFromSearch
} from "../apps/web/trpg/js/filterUrlState.js";

const ALLOWED = {
    systems: ["CoC6", "CoC7"],
    tags: ["推理重視", "秘匿HO"]
};

test("検索条件をURLクエリへ変換して復元する", ()=>{
    const filters = {
        keyword: " 深海 ",
        author: " 作者 ",
        system: "CoC6",
        players: "4",
        time: "5",
        rating: "r18",
        tags: ["推理重視", "秘匿HO"],
        sort: "title",
        favoriteOnly: true
    };

    const search = createFilterSearch(filters);

    assert.equal(
        search,
        "?q=%E6%B7%B1%E6%B5%B7&author=%E4%BD%9C%E8%80%85&system=CoC6&players=4&time=5&rating=r18&tag=%E6%8E%A8%E7%90%86%E9%87%8D%E8%A6%96&tag=%E7%A7%98%E5%8C%BFHO&sort=title"
    );

    assert.deepEqual(
        readFilterStateFromSearch(search, ALLOWED),
        {
            keyword: "深海",
            author: "作者",
            system: "CoC6",
            players: "4",
            time: "5",
            rating: "r18",
            tags: ["推理重視", "秘匿HO"],
            sort: "title"
        }
    );
});

test("旧adult値をR18へ統合し、その他の不正値を無視する", ()=>{
    const state = readFilterStateFromSearch(
        "?system=Unknown&players=0&time=99&rating=adult&tag=%E6%8E%A8%E7%90%86%E9%87%8D%E8%A6%96&tag=Unknown&tag=%E6%8E%A8%E7%90%86%E9%87%8D%E8%A6%96&sort=random",
        ALLOWED
    );

    assert.deepEqual(
        state,
        {
            keyword: "",
            author: "",
            system: "",
            players: "",
            time: "",
            rating: "r18",
            tags: ["推理重視"],
            sort: "recommended"
        }
    );
});

test("旧rating URLをR18へ正規化する", ()=>{
    ["r18g", "R-18G", "hard", "adult"].forEach(value=>{
        assert.equal(
            readFilterStateFromSearch(`?rating=${encodeURIComponent(value)}`, ALLOWED).rating,
            "r18"
        );
    });

    assert.equal(
        createFilterSearch({
            rating: "r18g"
        }),
        "?rating=r18"
    );

    assert.equal(
        readFilterStateFromSearch("?rating=unknown", ALLOWED).rating,
        ""
    );
});

test("デフォルト値とお気に入り条件は共有URLへ含めない", ()=>{
    assert.equal(
        createFilterSearch({
            sort: "recommended",
            favoriteOnly: true
        }),
        ""
    );

    assert.equal(
        hasShareableFilterState({
            favoriteOnly: true
        }),
        false
    );
});

test("URL更新時にハッシュを維持する", ()=>{
    assert.equal(
        createFilterUrl(
            "https://example.com/trpg/?old=value#result",
            {
                system: "CoC6"
            }
        ),
        "https://example.com/trpg/?system=CoC6#result"
    );
});

test("authorがない既存URLを従来どおり復元する", ()=>{
    assert.deepEqual(
        readFilterStateFromSearch(
            "?q=%E6%B7%B1%E6%B5%B7&system=CoC6&players=4&time=5&rating=r18&tag=%E6%8E%A8%E7%90%86%E9%87%8D%E8%A6%96",
            ALLOWED
        ),
        {
            keyword: "深海",
            author: "",
            system: "CoC6",
            players: "4",
            time: "5",
            rating: "r18",
            tags: ["推理重視"],
            sort: "recommended"
        }
    );
});

test("旧keywordパラメータもキーワード検索として復元する", ()=>{
    assert.deepEqual(
        readFilterStateFromSearch(
            "?keyword=%E6%B7%B1%E6%B5%B7&author=%E4%BD%9C%E8%80%85",
            ALLOWED
        ),
        {
            keyword: "深海",
            author: "作者",
            system: "",
            players: "",
            time: "",
            rating: "",
            tags: [],
            sort: "recommended"
        }
    );
});

test("空または過長なauthorを安全に正規化する", ()=>{
    assert.equal(
        readFilterStateFromSearch("?author=", ALLOWED).author,
        ""
    );

    assert.equal(
        readFilterStateFromSearch(
            `?author=${"a".repeat(400)}`,
            ALLOWED
        ).author.length,
        200
    );

    assert.equal(
        createFilterSearch({
            author: "   ",
            system: "CoC6"
        }),
        "?system=CoC6"
    );
});
