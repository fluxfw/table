import { flux_css_api } from "../../flux-css-api/src/FluxCssApi.mjs";
import { FORMAT_TYPE_FLUX_TABLE_ACTIONS } from "./FORMAT_TYPE.mjs";
import { FORMAT_TYPE_TEXT } from "../../flux-format/src/FORMAT_TYPE.mjs";
import { ROW_ACTION_UPDATE_TYPE_DISABLE_ON_FIRST, ROW_ACTION_UPDATE_TYPE_DISABLE_ON_LAST } from "./ROW_ACTION_UPDATE_TYPE.mjs";

/** @typedef {import("./Action.mjs").Action} Action */
/** @typedef {import("./Column.mjs").Column} Column */
/** @typedef {import("../../flux-format/src/FluxFormat.mjs").FluxFormat} FluxFormat */
/** @typedef {import("./Row.mjs").Row} Row */
/** @typedef {import("./RowAction.mjs").RowAction} RowAction */

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
     * @type {FluxFormat}
     */
    #flux_format;
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
     * @param {FluxFormat} flux_format
     * @returns {void}
     */
    static #addFormats(flux_format) {
        flux_format.addFormat(
            FORMAT_TYPE_FLUX_TABLE_ACTIONS,
            /**
             * @param {RowAction[] | null} actions
             * @returns {Promise<HTMLDivElement | string>}
             */
            async (actions = null) => {
                if ((actions ?? []).length > 0) {
                    const actions_element = document.createElement("div");
                    actions_element.classList.add("row_actions");

                    for (const action of actions) {
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

                    return actions_element;
                } else {
                    return flux_format.formatValue(
                        null,
                        FORMAT_TYPE_TEXT
                    );
                }
            }
        );
    }

    /**
     * @param {FluxFormat} flux_format
     * @param {Action[] | null} actions
     * @param {Column[] | null} columns
     * @param {string | null} row_id_key
     * @param {Row[] | null} rows
     * @param {string | null} no_rows_label
     * @returns {Promise<FluxTableElement>}
     */
    static async newWithData(flux_format, actions = null, columns = null, row_id_key = null, rows = null, no_rows_label = null) {
        const flux_table_element = this.new(
            flux_format,
            actions ?? [],
            row_id_key ?? ""
        );

        await flux_table_element.setColumns(
            columns ?? [],
            false
        );
        await flux_table_element.setRows(
            rows ?? [],
            false
        );
        await flux_table_element.setNoRowsLabel(
            no_rows_label
        );

        return flux_table_element;
    }

    /**
     * @param {FluxFormat} flux_format
     * @param {Action[] | null} actions
     * @param {string | null} row_id_key
     * @returns {FluxTableElement}
     */
    static new(flux_format, actions = null, row_id_key = null) {
        return new this(
            flux_format,
            actions ?? [],
            row_id_key ?? ""
        );
    }

    /**
     * @param {FluxFormat} flux_format
     * @param {Action[]} actions
     * @param {string} row_id_key
     * @private
     */
    constructor(flux_format, actions, row_id_key) {
        super();

        this.#flux_format = flux_format;

        this.constructor.#addFormats(
            flux_format
        );

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
        this.row_id_key = row_id_key;
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
     * @returns {Promise<void>}
     */
    async addColumn(column, before_key = null, after_key = null, update = null) {
        if ((before_key !== null && after_key !== null) || before_key === column.key || after_key === column.key) {
            return;
        }

        await this.deleteColumn(
            column.key,
            false
        );

        const column_element = document.createElement("th");
        column_element.dataset.column_key = column.key;
        column_element.dataset.column_format_type = column["format-type"] ?? FORMAT_TYPE_TEXT;
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
            await this.#flux_format.formatValueToElement(
                row_column_element,
                null,
                column_element.dataset.column_format_type
            );

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
            await this.update();
        }
    }

    /**
     * @param {Row} row
     * @param {string | null} before_id
     * @param {string | null} after_id
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async addRow(row, before_id = null, after_id = null, update = null) {
        if ((before_id !== null && after_id !== null) || before_id === row[this.#row_id_key] || after_id === row[this.#row_id_key]) {
            return;
        }

        await this.deleteRow(
            row[this.#row_id_key],
            false
        );

        const row_element = document.createElement("tr");
        row_element.dataset.row_id = row[this.#row_id_key];

        for (const column_element of this.#getColumnElements()) {
            const key = column_element.dataset.column_key;

            const row_column_element = document.createElement("td");
            row_column_element.dataset.column_key = key;

            await this.#flux_format.formatValueToElement(
                row_column_element,
                row[key] ?? null,
                column_element.dataset.column_format_type
            );

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
            await this.update();
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
     * @param {string} key
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async deleteColumn(key, update = null) {
        this.#getColumnElements(
            false,
            key
        ).forEach(column_element => {
            column_element.remove();
        });

        if (update ?? true) {
            await this.update();
        }
    }

    /**
     * @param {string} id
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async deleteRow(id, update = null) {
        const row_element = this.#getRowElement(
            id
        );

        if (row_element === null) {
            return;
        }

        row_element.remove();

        if (update ?? true) {
            await this.update();
        }
    }

    /**
     * @param {string} key
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async moveColumnLeft(key, update = null) {
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
            await this.update();
        }
    }

    /**
     * @param {string} key
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async moveColumnRight(key, update = null) {
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
            await this.update();
        }
    }

    /**
     * @param {string} key
     * @param {string | null} before_key
     * @param {string | null} after_key
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async moveColumnTo(key, before_key = null, after_key = null, update = null) {
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
            await this.update();
        }
    }

    /**
     * @param {string} id
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async moveRowDown(id, update = null) {
        if (!this.#insertAfterNextElement(
            this.#getRowElement(
                id
            )
        )) {
            return;
        }

        if (update ?? true) {
            await this.update();
        }
    }

    /**
     * @param {string} id
     * @param {string | null} before_id
     * @param {string | null} after_id
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async moveRowTo(id, before_id = null, after_id = null, update = null) {
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
            await this.update();
        }
    }

    /**
     * @param {string} id
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async moveRowUp(id, update = null) {
        if (!this.#insertBeforePreviousElement(
            this.#getRowElement(
                id
            )
        )) {
            return;
        }

        if (update ?? true) {
            await this.update();
        }
    }

    /**
     * @returns {string | null}
     */
    get no_rows_label() {
        return this.#no_rows_label;
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
     * @param {Column[]} columns
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async setColumns(columns, update = null) {
        await this.setRows(
            [],
            false
        );

        this.#getHeaderRowElement().replaceChildren();

        for (const column of columns) {
            await this.addColumn(
                column,
                null,
                null,
                false
            );
        }

        if (update ?? true) {
            await this.update();
        }
    }

    /**
     * @param {string | null} no_rows_label
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async setNoRowsLabel(no_rows_label, update = null) {
        this.#no_rows_label = no_rows_label;

        if (update ?? true) {
            await this.update();
        }
    }

    /**
     * @param {Row[]} rows
     * @param {boolean | null} update
     * @returns {Promise<void>}
     */
    async setRows(rows, update = null) {
        this.#getRowElements().forEach(row_element => {
            row_element.remove();
        });

        for (const row of rows) {
            await this.addRow(
                row,
                null,
                null,
                false
            );
        }

        if (update ?? true) {
            await this.update();
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async update() {
        await this.#updateNoRowsRow();

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
     * @returns {Promise<void>}
     */
    async #updateNoRowsRow() {
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
        await this.#flux_format.formatValueToElement(
            row_column_element,
            this.#no_rows_label,
            FORMAT_TYPE_TEXT
        );

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
