import css from "./FluxTableElement.css" with { type: "css" };
import root_css from "./FluxTableElementRoot.css" with { type: "css" };

/** @typedef {import("./Column.mjs").Column} Column */
/** @typedef {import("./formatValue.mjs").formatValue} formatValue */
/** @typedef {import("./Row.mjs").Row} Row */
/** @typedef {import("./StyleSheetManager/StyleSheetManager.mjs").StyleSheetManager} StyleSheetManager */
/** @typedef {import("./updateRow.mjs").updateRow} updateRow */

export const FLUX_TABLE_ELEMENT_VARIABLE_PREFIX = "--flux-table-";

export class FluxTableElement extends HTMLElement {
    /**
     * @type {CSSStyleSheet}
     */
    #column_width_style_sheet;
    /**
     * @type {formatValue}
     */
    #format_value;
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
     * @type {updateRow | null}
     */
    #update_row;

    /**
     * @param {Column[] | null} columns
     * @param {string | null} row_id_key
     * @param {Row[] | null} rows
     * @param {formatValue | null} format_value
     * @param {updateRow | null} update_row
     * @param {string | null} no_rows_label
     * @param {StyleSheetManager | null} style_sheet_manager
     * @returns {Promise<FluxTableElement>}
     */
    static async newWithData(columns = null, row_id_key = null, rows = null, format_value = null, update_row = null, no_rows_label = null, style_sheet_manager = null) {
        const flux_table_element = await this.new(
            format_value,
            update_row,
            row_id_key ?? "",
            style_sheet_manager
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
     * @param {formatValue | null} format_value
     * @param {updateRow | null} update_row
     * @param {string | null} row_id_key
     * @param {StyleSheetManager | null} style_sheet_manager
     * @returns {Promise<FluxTableElement>}
     */
    static async new(format_value = null, update_row = null, row_id_key = null, style_sheet_manager = null) {
        if (style_sheet_manager !== null) {
            await style_sheet_manager.generateVariablesRootStyleSheet(
                FLUX_TABLE_ELEMENT_VARIABLE_PREFIX,
                {
                    [`${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}background-color`]: "background-color",
                    [`${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}border-color`]: "foreground-color",
                    [`${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}foreground-color`]: "foreground-color",
                    [`${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}header-row-background-color`]: "accent-color",
                    [`${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}header-row-border-color`]: "accent-color-foreground-color",
                    [`${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}header-row-foreground-color`]: "accent-color-foreground-color"
                },
                true
            );

            await style_sheet_manager.addRootStyleSheet(
                root_css,
                true
            );
        } else {
            if (!document.adoptedStyleSheets.includes(root_css)) {
                document.adoptedStyleSheets.unshift(root_css);
            }
        }

        const flux_table_element = new this(
            format_value ?? this.#defaultFormatValue,
            update_row
        );

        flux_table_element.#shadow = flux_table_element.attachShadow({
            mode: "closed"
        });

        await style_sheet_manager?.addStyleSheetsToShadow(
            flux_table_element.#shadow
        );

        flux_table_element.#shadow.adoptedStyleSheets.push(css);

        flux_table_element.#shadow.adoptedStyleSheets.push(flux_table_element.#column_width_style_sheet = new CSSStyleSheet());

        const table_element = document.createElement("table");

        const header_element = document.createElement("thead");
        header_element.append(document.createElement("tr"));
        table_element.append(header_element);

        table_element.append(document.createElement("tbody"));

        flux_table_element.#shadow.append(table_element);

        flux_table_element.row_id_key = row_id_key ?? "";

        return flux_table_element;
    }

    /**
     * @param {*} value
     * @returns {Promise<Node | string>}
     */
    static async #defaultFormatValue(value = null) {
        return value instanceof Node ? value : `${(value ?? "") !== "" ? value : "-"}`;
    }

    /**
     * @param {formatValue} format_value
     * @param {updateRow | null} update_row
     * @private
     */
    constructor(format_value, update_row) {
        super();

        this.#format_value = format_value;
        this.#update_row = update_row;
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
        if ((column.type ?? "") !== "") {
            column_element.dataset.column_type = column.type;
        }
        if (column["update-rows"] ?? false) {
            column_element.dataset.column_update_rows = true;
        }
        column_element.innerText = column.label;

        this.#column_width_style_sheet.insertRule(`[data-column_key="${column.key}"] {${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}column-width: var(${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}column-${column.key}-width, auto)}`);
        if ((column.width ?? "") !== "") {
            this.style.setProperty(`${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}column-${column.key}-width`, column.width);
        }

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
                this.#getHeaderRowElement().append(column_element);
            }
        }

        for (const row_element of this.#getRowElements()) {
            const row_column_element = document.createElement("td");
            row_column_element.dataset.column_key = column.key;
            await this.#formatValueToElement(
                row_column_element,
                null,
                column.type ?? null,
                row_element.dataset.row_id,
                column.key
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
                    row_element.append(row_column_element);
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
        const id = row[this.#row_id_key];

        if ((before_id !== null && after_id !== null) || before_id === id || after_id === id) {
            return;
        }

        await this.deleteRow(
            id,
            false
        );

        const row_element = document.createElement("tr");
        row_element.dataset.row_id = id;

        for (const column_element of this.#getColumnElements()) {
            const key = column_element.dataset.column_key;

            const row_column_element = document.createElement("td");
            row_column_element.dataset.column_key = key;

            await this.#formatValueToElement(
                row_column_element,
                row[key] ?? null,
                column_element.dataset.column_type ?? null,
                id,
                key
            );

            row_element.append(row_column_element);
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
                this.#getBodyElement().append(row_element);
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
        return this.#getColumnElements().map(column_element => {
            const key = column_element.dataset.column_key;

            return {
                key,
                label: column_element.innerText,
                "update-rows": (column_element.dataset.column_update_rows ?? "false") === "true",
                type: column_element.dataset.column_type ?? null,
                width: this.style.getPropertyValue(`${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}column-${key}-width`)
            };
        });
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

        this.style.removeProperty(`${FLUX_TABLE_ELEMENT_VARIABLE_PREFIX}column-${key}-width`);

        const rules = Array.from(this.#column_width_style_sheet.cssRules);
        rules.filter(rule => rule.cssText.startsWith(`[data-column_key="${key}"]`)).forEach(rule => {
            this.#column_width_style_sheet.deleteRule(rules.indexOf(rule));
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

        await this.#updateRows();
    }

    /**
     * @param {HTMLElement} element
     * @param {*} value
     * @param {string | null} type
     * @param {string | null} row_id
     * @param {string | null} column_key
     * @returns {Promise<void>}
     */
    async #formatValueToElement(element, value = null, type = null, row_id = null, column_key = null) {
        const formatted_value = await this.#format_value(
            value,
            type,
            row_id,
            column_key
        );

        if (formatted_value instanceof Node) {
            element.dataset.row_column_has_node_value = true;
            element.append(formatted_value);
        } else {
            delete element.dataset.row_column_has_node_value;
            element.innerText = formatted_value;
        }
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
        await this.#formatValueToElement(
            row_column_element,
            this.#no_rows_label
        );

        if (!row_column_element.isConnected) {
            row_element.append(row_column_element);
        }

        if (!row_element.isConnected) {
            row_element.dataset.no_rows_row = true;
            this.#getBodyElement().append(row_element);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async #updateRows() {
        if (this.#update_row === null) {
            return;
        }

        const column_elements = Array.from(this.#shadow.querySelectorAll("[data-column_update_rows]"));

        if (column_elements.length === 0) {
            return;
        }

        for (const [
            index,
            row_element
        ] of this.#getRowElements().entries()) {
            const id = row_element.dataset.row_id;

            for (const column_element of column_elements) {
                const key = column_element.dataset.column_key;

                const row_column_element = this.#getColumnElement(
                    key,
                    row_element
                );

                if (row_column_element === null) {
                    continue;
                }

                await this.#update_row(
                    (row_column_element.dataset.row_column_has_node_value ?? "false") === "true" ? row_column_element.childNodes[0] : row_column_element.innerText,
                    column_element.dataset.column_type ?? null,
                    index,
                    id,
                    key
                );
            }
        }
    }
}

export const FLUX_TABLE_ELEMENT_TAG_NAME = "flux-table";

customElements.define(FLUX_TABLE_ELEMENT_TAG_NAME, FluxTableElement);
