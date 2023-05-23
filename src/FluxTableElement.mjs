import { COLUMN_KEY_ACTIONS } from "./COLUMN_KEY.mjs";
import { EMPTY_COLUMN } from "./EMPTY_COLUMN.mjs";
import { flux_css_api } from "../../flux-css-api/src/FluxCssApi.mjs";
import { ROW_ACTION_UPDATE_TYPE_DISABLE_ON_FIRST, ROW_ACTION_UPDATE_TYPE_DISABLE_ON_LAST } from "./ROW_ACTION_UPDATE_TYPE.mjs";

/** @typedef {import("./Action.mjs").Action} Action */
/** @typedef {import("./Column.mjs").Column} Column */
/** @typedef {import("./Row.mjs").Row} Row */

flux_css_api.adopt(
    document,
    await flux_css_api.import(
        `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxTableElementVariables.css`
    ),
    true
);

const css = await flux_css_api.import(
    `${import.meta.url.substring(0, import.meta.url.lastIndexOf("/"))}/FluxTableElement.css`
);

export class FluxTableElement extends HTMLElement {
    /**
     * @type {string | null}
     */
    #no_rows_label;
    /**
     * @type {string}
     */
    #row_id_key;
    /**
     * @type {ShadowRoot}
     */
    #shadow;

    /**
     * @param {Action[] | null} actions
     * @param {Column[] | null} columns
     * @param {string | null} row_id_key
     * @param {Row[] | null} rows
     * @param {string | null} no_rows_label
     * @returns {FluxTableElement}
     */
    static new(actions = null, columns = null, row_id_key = null, rows = null, no_rows_label = null) {
        return new this(
            actions ?? [],
            columns ?? [],
            row_id_key ?? "",
            rows ?? [],
            no_rows_label
        );
    }

    /**
     * @param {Action[]} actions
     * @param {Column[]} columns
     * @param {string} row_id_key
     * @param {Row[]} rows
     * @param {string | null} no_rows_label
     * @private
     */
    constructor(actions, columns, row_id_key, rows, no_rows_label) {
        super();

        this.#shadow = this.attachShadow({
            mode: "closed"
        });

        flux_css_api.adopt(
            this.#shadow,
            css
        );

        const actions_element = document.createElement("div");
        actions_element.classList.add("actions");
        this.#shadow.appendChild(actions_element);

        const table_element = document.createElement("table");

        const header_element = document.createElement("thead");
        header_element.appendChild(document.createElement("tr"));
        table_element.appendChild(header_element);

        table_element.appendChild(document.createElement("tbody"));

        this.#shadow.appendChild(table_element);

        this.actions = actions;
        this.columns = columns;
        this.row_id_key = row_id_key;
        this.no_rows_label = no_rows_label;
        this.rows = rows;
    }

    /**
     * @param {Action[]} actions
     * @returns {void}
     */
    set actions(actions) {
        const actions_element = this.#shadow.querySelector(".actions");

        for (const action of actions) {
            const button_element = document.createElement("button");
            button_element.innerText = action.label;
            if ((action.title ?? "") !== "") {
                button_element.title = action.title;
            }
            button_element.type = "button";
            button_element.addEventListener("click", () => {
                action.action();
            });
            actions_element.appendChild(button_element);
        }
    }

    /**
     * @param {Column} column
     * @param {string | null} before_key
     * @param {string | null} after_key
     * @param {boolean | null} update
     * @returns {void}
     */
    addColumn(column, before_key = null, after_key = null, update = null) {
        if ((before_key !== null && after_key !== null) || before_key === column.key || after_key === column.key) {
            return;
        }

        this.deleteColumn(
            column.key,
            false
        );

        const column_element = document.createElement("th");
        column_element.dataset.column_key = column.key;
        column_element.innerText = column.label;

        if (before_key !== null) {
            if (!this.#insertBeforeElement(
                column_element,
                this.#getColumnElement(
                    before_key
                )
            )) {
                return;
            }
        } else {
            if (after_key !== null) {
                if (!this.#insertAfterElement(
                    column_element,
                    this.#getColumnElement(
                        after_key
                    )
                )) {
                    return;
                }
            } else {
                this.#getHeaderRowElement().appendChild(column_element);
            }
        }

        for (const row_element of this.#getRowElements()) {
            const row_column_element = document.createElement("td");
            row_column_element.dataset.column_key = column.key;
            row_column_element.innerText = EMPTY_COLUMN;

            if (before_key !== null) {
                if (!this.#insertBeforeElement(
                    row_column_element,
                    this.#getColumnElement(
                        before_key,
                        row_element
                    )
                )) {
                    continue;
                }
            } else {
                if (after_key !== null) {
                    if (!this.#insertAfterElement(
                        row_column_element,
                        this.#getColumnElement(
                            after_key,
                            row_element
                        )
                    )) {
                        continue;
                    }
                } else {
                    row_element.appendChild(row_column_element);
                }
            }
        }

        if (update ?? true) {
            this.update();
        }
    }

    /**
     * @param {Row} row
     * @param {string | null} before_id
     * @param {string | null} after_id
     * @param {boolean | null} update
     * @returns {void}
     */
    addRow(row, before_id = null, after_id = null, update = null) {
        if ((before_id !== null && after_id !== null) || before_id === row[this.#row_id_key] || after_id === row[this.#row_id_key]) {
            return;
        }

        this.deleteRow(
            row[this.#row_id_key],
            false
        );

        const row_element = document.createElement("tr");
        row_element.dataset.row_id = row[this.#row_id_key];

        for (const column_element of this.#getColumnElements()) {
            const key = column_element.dataset.column_key;

            const row_column_element = document.createElement("td");
            row_column_element.dataset.column_key = key;

            if (key === COLUMN_KEY_ACTIONS) {
                if ((row[key] ?? []).length > 0) {
                    const actions_element = document.createElement("div");
                    actions_element.classList.add("row_actions");

                    for (const action of row[key]) {
                        const button_element = document.createElement("button");
                        if ((action["update-type"] ?? "") !== "") {
                            button_element.dataset.row_action_update_type = action["update-type"];
                        }
                        button_element.innerText = action.label;
                        if ((action.title ?? "") !== "") {
                            button_element.title = action.title;
                        }
                        button_element.type = "button";
                        button_element.addEventListener("click", () => {
                            action.action();
                        });
                        actions_element.appendChild(button_element);
                    }

                    row_column_element.appendChild(actions_element);
                } else {
                    row_column_element.innerText = EMPTY_COLUMN;
                }
            } else {
                row_column_element.innerText = row[key] ?? EMPTY_COLUMN;
            }

            row_element.appendChild(row_column_element);
        }

        if (before_id !== null) {
            if (!this.#insertBeforeElement(
                row_element,
                this.#getRowElement(
                    before_id
                )
            )) {
                return;
            }
        } else {
            if (after_id !== null) {
                if (!this.#insertAfterElement(
                    row_element,
                    this.#getRowElement(
                        after_id
                    )
                )) {
                    return;
                }
            } else {
                this.#getBodyElement().appendChild(row_element);
            }
        }

        if (update ?? true) {
            this.update();
        }
    }

    /**
     * @returns {Column[]}
     */
    get columns() {
        return this.#getColumnElements().map(column_element => ({
            key: column_element.dataset.column_key,
            label: column_element.innerText
        }));
    }

    /**
     * @param {Column[]} columns
     * @returns {void}
     */
    set columns(columns) {
        this.rows = [];

        this.#getHeaderRowElement().replaceChildren();

        for (const column of columns) {
            this.addColumn(
                column,
                null,
                null,
                false
            );
        }

        this.update();
    }

    /**
     * @param {string} key
     * @param {boolean | null} update
     * @returns {void}
     */
    deleteColumn(key, update = null) {
        this.#getColumnElements(
            false,
            key
        ).forEach(column_element => {
            column_element.remove();
        });

        if (update ?? true) {
            this.update();
        }
    }

    /**
     * @param {string} id
     * @param {boolean | null} update
     * @returns {void}
     */
    deleteRow(id, update = null) {
        const row_element = this.#getRowElement(
            id
        );

        if (row_element === null) {
            return;
        }

        row_element.remove();

        if (update ?? true) {
            this.update();
        }
    }

    /**
     * @param {string} key
     * @param {boolean | null} update
     * @returns {void}
     */
    moveColumnLeft(key, update = null) {
        if (!this.#insertBeforePreviousElement(
            this.#getColumnElement(
                key
            )
        )) {
            return;
        }

        for (const row_element of this.#getRowElements()) {
            if (!this.#insertBeforePreviousElement(
                this.#getColumnElement(
                    key,
                    row_element
                )
            )) {
                continue;
            }
        }

        if (update ?? true) {
            this.update();
        }
    }

    /**
     * @param {string} key
     * @param {boolean | null} update
     * @returns {void}
     */
    moveColumnRight(key, update = null) {
        if (!this.#insertAfterNextElement(
            this.#getColumnElement(
                key
            )
        )) {
            return;
        }

        for (const row_element of this.#getRowElements()) {
            if (!this.#insertAfterNextElement(
                this.#getColumnElement(
                    key,
                    row_element
                )
            )) {
                continue;
            }
        }

        if (update ?? true) {
            this.update();
        }
    }

    /**
     * @param {string} key
     * @param {string | null} before_key
     * @param {string | null} after_key
     * @param {boolean | null} update
     * @returns {void}
     */
    moveColumnTo(key, before_key = null, after_key = null, update = null) {
        if ((before_key === null && after_key === null) || (before_key !== null && after_key !== null) || before_key === key || after_key === key) {
            return;
        }

        if (after_key !== null) {
            if (!this.#insertAfterElement(
                this.#getColumnElement(
                    key
                ),
                this.#getColumnElement(
                    after_key
                )
            )) {
                return;
            }
        } else {
            if (!this.#insertBeforeElement(
                this.#getColumnElement(
                    key
                ),
                this.#getColumnElement(
                    before_key
                )
            )) {
                return;
            }
        }

        for (const row_element of this.#getRowElements()) {
            if (after_key !== null) {
                if (!this.#insertAfterElement(
                    this.#getColumnElement(
                        key,
                        row_element
                    ),
                    this.#getColumnElement(
                        after_key,
                        row_element
                    )
                )) {
                    continue;
                }
            } else {
                if (!this.#insertBeforeElement(
                    this.#getColumnElement(
                        key,
                        row_element
                    ),
                    this.#getColumnElement(
                        before_key,
                        row_element
                    )
                )) {
                    continue;
                }
            }
        }

        if (update ?? true) {
            this.update();
        }
    }

    /**
     * @param {string} id
     * @param {boolean | null} update
     * @returns {void}
     */
    moveRowDown(id, update = null) {
        if (!this.#insertAfterNextElement(
            this.#getRowElement(
                id
            )
        )) {
            return;
        }

        if (update ?? true) {
            this.update();
        }
    }

    /**
     * @param {string} id
     * @param {string | null} before_id
     * @param {string | null} after_id
     * @param {boolean | null} update
     * @returns {void}
     */
    moveRowTo(id, before_id = null, after_id = null, update = null) {
        if ((before_id === null && after_id === null) || (before_id !== null && after_id !== null) || before_id === id || after_id === id) {
            return;
        }

        if (after_id !== null) {
            if (!this.#insertAfterElement(
                this.#getRowElement(
                    id
                ),
                this.#getRowElement(
                    after_id
                )
            )) {
                return;
            }
        } else {
            if (!this.#insertBeforeElement(
                this.#getRowElement(
                    id
                ),
                this.#getRowElement(
                    before_id
                )
            )) {
                return;
            }
        }

        if (update ?? true) {
            this.update();
        }
    }

    /**
     * @param {string} id
     * @param {boolean | null} update
     * @returns {void}
     */
    moveRowUp(id, update = null) {
        if (!this.#insertBeforePreviousElement(
            this.#getRowElement(
                id
            )
        )) {
            return;
        }

        if (update ?? true) {
            this.update();
        }
    }

    /**
     * @returns {string | null}
     */
    get no_rows_label() {
        return this.#no_rows_label;
    }

    /**
     * @param {string | null} no_rows_label
     * @returns {void}
     */
    set no_rows_label(no_rows_label) {
        this.#no_rows_label = no_rows_label;

        this.update();
    }

    /**
     * @returns {string}
     */
    get row_id_key() {
        return this.#row_id_key;
    }

    /**
     * @param {string} row_id_key
     * @returns {void}
     */
    set row_id_key(row_id_key) {
        this.#row_id_key = row_id_key;
    }

    /**
     * @returns {Row[]}
     */
    get rows() {
        return this.#getRowElements().map(row_element => ({
            [this.#row_id_key]: row_element.dataset.row_id
        }));
    }

    /**
     * @param {Row[]} rows
     * @returns {void}
     */
    set rows(rows) {
        this.#getRowElements().forEach(row_element => {
            row_element.remove();
        });

        for (const row of rows) {
            this.addRow(
                row,
                null,
                null,
                false
            );
        }

        this.update();
    }

    /**
     * @returns {void}
     */
    update() {
        this.#updateNoRowsRow();

        this.#updateRowActions();
    }

    /**
     * @returns {HTMLTableSectionElement}
     */
    #getBodyElement() {
        return this.#shadow.querySelector("tbody");
    }

    /**
     * @param {string} key
     * @param {HTMLTableRowElement | null} row_element
     * @returns {HTMLTableCellElement | null}
     */
    #getColumnElement(key, row_element = null) {
        return (row_element ?? this.#shadow).querySelector(`${row_element !== null ? "" : "th"}[data-column_key="${key}"]`);
    }

    /**
     * @param {boolean | null} header_only
     * @param {string | null} key
     * @returns {HTMLTableCellElement[]}
     */
    #getColumnElements(header_only = null, key = null) {
        return Array.from(this.#shadow.querySelectorAll(`${header_only ?? true ? "th" : ""}[data-column_key${key !== null ? `="${key}"` : ""}]`));
    }

    /**
     * @returns {HTMLTableRowElement}
     */
    #getHeaderRowElement() {
        return this.#shadow.querySelector("thead tr");
    }

    /**
     * @param {string} id
     * @returns {HTMLTableRowElement | null}
     */
    #getRowElement(id) {
        return this.#shadow.querySelector(`[data-row_id="${id}"]`);
    }

    /**
     * @returns {HTMLTableRowElement[]}
     */
    #getRowElements() {
        return Array.from(this.#shadow.querySelectorAll("[data-row_id]"));
    }

    /**
     * @param {HTMLElement | null} element
     * @param {HTMLElement | null} after_element
     * @returns {boolean}
     */
    #insertAfterElement(element = null, after_element = null) {
        if (element === null || after_element === null) {
            return false;
        }

        after_element.after(element);

        return true;
    }

    /**
     * @param {HTMLElement | null} element
     * @returns {boolean}
     */
    #insertAfterNextElement(element = null) {
        return this.#insertAfterElement(
            element,
            element?.nextElementSibling ?? null
        );
    }

    /**
     * @param {HTMLElement | null} element
     * @param {HTMLElement | null} before_element
     * @returns {boolean}
     */
    #insertBeforeElement(element = null, before_element = null) {
        if (element === null || before_element === null) {
            return false;
        }

        before_element.before(element);

        return true;
    }

    /**
     * @param {HTMLElement | null} element
     * @returns {boolean}
     */
    #insertBeforePreviousElement(element = null) {
        return this.#insertBeforeElement(
            element,
            element?.previousElementSibling ?? null
        );
    }

    /**
     * @returns {void}
     */
    #updateNoRowsRow() {
        const columns_count = this.#getColumnElements().length;

        if (this.#getRowElements().length > 0 || columns_count === 0) {
            this.#shadow.querySelectorAll("[data-no_rows_row]").forEach(row_element => {
                row_element.remove();
            });
            return;
        }

        const row_element = this.#shadow.querySelector("[data-no_rows_row]") ?? document.createElement("tr");

        const row_column_element = row_element.querySelector("td") ?? document.createElement("td");
        row_column_element.colSpan = columns_count;
        row_column_element.innerText = this.#no_rows_label ?? EMPTY_COLUMN;

        if (!row_column_element.isConnected) {
            row_element.appendChild(row_column_element);
        }

        if (!row_element.isConnected) {
            row_element.dataset.no_rows_row = true;
            this.#getBodyElement().appendChild(row_element);
        }
    }

    /**
     * @returns {void}
     */
    #updateRowActions() {
        for (const button_element of this.#shadow.querySelectorAll("[data-row_action_update_type]")) {
            switch (button_element.dataset.row_action_update_type) {
                case ROW_ACTION_UPDATE_TYPE_DISABLE_ON_FIRST:
                    button_element.disabled = button_element.parentElement.parentElement.parentElement.previousElementSibling === null;
                    break;

                case ROW_ACTION_UPDATE_TYPE_DISABLE_ON_LAST:
                    button_element.disabled = button_element.parentElement.parentElement.parentElement.nextElementSibling === null;
                    break;

                default:
                    break;
            }
        }
    }
}

export const FLUX_TABLE_ELEMENT_TAG_NAME = "flux-table";

customElements.define(FLUX_TABLE_ELEMENT_TAG_NAME, FluxTableElement);
