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
    #no_data_label;
    /**
     * @type {ShadowRoot}
     */
    #shadow;

    /**
     * @param {Column[]} columns
     * @param {Row[]} rows
     * @param {string | null} id_key
     * @param {Action[] | null} actions
     * @param {string | null} actions_column_label
     * @param {string | null} no_data_label
     * @returns {FluxTableElement}
     */
    static new(columns, rows, id_key = null, actions = null, actions_column_label = null, no_data_label = null) {
        return new this(
            columns,
            rows,
            id_key,
            actions ?? [],
            actions_column_label,
            no_data_label
        );
    }

    /**
     * @param {Column[]} columns
     * @param {Row[]} rows
     * @param {string | null} id_key
     * @param {Action[]} actions
     * @param {string | null} actions_column_label
     * @param {string | null} no_data_label
     * @private
     */
    constructor(columns, rows, id_key, actions, actions_column_label, no_data_label) {
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

        for (const action of actions) {
            const action_button_element = document.createElement("button");
            action_button_element.innerText = action.label;
            if ((action.title ?? "") !== "") {
                action_button_element.title = action.title;
            }
            action_button_element.type = "button";
            action_button_element.addEventListener("click", () => {
                action.action();
            });
            actions_element.appendChild(action_button_element);
        }

        this.#shadow.appendChild(actions_element);

        if (columns.length === 0) {
            return;
        }

        const table_element = document.createElement("table");

        const header_element = document.createElement("thead");
        const header_row_element = document.createElement("tr");

        for (const column of columns) {
            const header_cell_element = document.createElement("th");
            header_cell_element.innerText = column.label;
            header_row_element.appendChild(header_cell_element);
        }

        if (actions_column_label !== null || rows.some(row => (row.actions ?? []).length > 0)) {
            const header_cell_element = document.createElement("th");
            header_cell_element.classList.add("row_actions_cell");
            header_cell_element.innerText = actions_column_label ?? "";
            header_row_element.appendChild(header_cell_element);
        }

        header_element.appendChild(header_row_element);
        table_element.appendChild(header_element);

        const body_element = document.createElement("tbody");

        for (const row of rows) {
            const row_element = document.createElement("tr");
            if (id_key !== null && (row[id_key] ?? "") !== "") {
                row_element.dataset.row_id = row[id_key];
            }

            for (const column of columns) {
                const cell_element = document.createElement("td");
                cell_element.innerText = row[column.key] ?? "-";
                row_element.appendChild(cell_element);
            }

            const row_actions_cell_element = document.createElement("td");
            row_actions_cell_element.classList.add("row_actions_cell");
            const row_actions_element = document.createElement("div");
            row_actions_element.classList.add("row_actions");

            for (const row_action of row.actions ?? []) {
                const row_action_button_element = document.createElement("button");
                if ((row_action["update-type"] ?? "") !== "") {
                    row_action_button_element.dataset.row_action_update_type = row_action["update-type"];
                }
                row_action_button_element.innerText = row_action.label;
                if ((row_action.title ?? "") !== "") {
                    row_action_button_element.title = row_action.title;
                }
                row_action_button_element.type = "button";
                row_action_button_element.addEventListener("click", () => {
                    row_action.action();
                });
                row_actions_element.appendChild(row_action_button_element);
            }

            row_actions_cell_element.appendChild(row_actions_element);
            row_element.appendChild(row_actions_cell_element);

            body_element.appendChild(row_element);
        }

        table_element.appendChild(body_element);

        this.#shadow.appendChild(table_element);

        this.#updateRowActions();

        this.no_data_label = no_data_label;
    }

    /**
     * @param {string} id
     * @returns {void}
     */
    deleteRow(id) {
        const row_element = this.#getRowElement(
            id
        );

        if (row_element === null) {
            return;
        }

        row_element.remove();

        this.#updateRowActions();
        this.#updateNoDataRow();
    }

    /**
     * @param {string} id
     * @returns {void}
     */
    moveRowDown(id) {
        const row_element = this.#getRowElement(
            id
        );

        if ((row_element?.nextElementSibling ?? null) === null) {
            return;
        }

        row_element.nextElementSibling.after(row_element);

        this.#updateRowActions();
    }

    /**
     * @param {string} id
     * @returns {void}
     */
    moveRowUp(id) {
        const row_element = this.#getRowElement(
            id
        );

        if ((row_element?.previousElementSibling ?? null) === null) {
            return;
        }

        row_element.previousElementSibling.before(row_element);

        this.#updateRowActions();
    }

    /**
     * @returns {string | null}
     */
    get no_data_label() {
        return this.#no_data_label;
    }

    /**
     * @param {string | null} no_data_label
     * @returns {void}
     */
    set no_data_label(no_data_label) {
        this.#no_data_label = no_data_label;

        this.#updateNoDataRow();
    }

    /**
     * @param {string} id
     * @returns {HTMLTableRowElement | null}
     */
    #getRowElement(id) {
        return this.#shadow.querySelector(`[data-row_id="${id}"]`);
    }

    /**
     * @returns {void}
     */
    #updateNoDataRow() {
        this.#shadow.querySelectorAll("[data-no_data_row]").forEach(row_element => {
            row_element.remove();
        });

        const body_element = this.#shadow.querySelector("tbody");

        if (body_element === null || body_element.querySelectorAll("tr").length > 0) {
            return;
        }

        const row_element = document.createElement("tr");
        row_element.dataset.no_data_row = true;

        const cell_element = document.createElement("td");
        cell_element.colSpan = this.#shadow.querySelectorAll("th").length;
        cell_element.innerText = this.#no_data_label ?? "-";
        row_element.appendChild(cell_element);

        body_element.appendChild(row_element);
    }

    /**
     * @returns {void}
     */
    #updateRowActions() {
        for (const row_action_button_element of this.#shadow.querySelectorAll("[data-row_action_update_type]")) {
            switch (row_action_button_element.dataset.row_action_update_type) {
                case ROW_ACTION_UPDATE_TYPE_DISABLE_ON_FIRST:
                    row_action_button_element.disabled = row_action_button_element.parentElement.parentElement.parentElement.previousElementSibling === null;
                    break;

                case ROW_ACTION_UPDATE_TYPE_DISABLE_ON_LAST:
                    row_action_button_element.disabled = row_action_button_element.parentElement.parentElement.parentElement.nextElementSibling === null;
                    break;

                default:
                    break;
            }
        }
    }
}

export const FLUX_TABLE_ELEMENT_TAG_NAME = "flux-table";

customElements.define(FLUX_TABLE_ELEMENT_TAG_NAME, FluxTableElement);
