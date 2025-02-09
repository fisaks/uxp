let elements = [];
let roots = [];
// Function to initialize parameters at runtime
function init(documentRoot) {
    roots.push(documentRoot);

    applytoRoot(documentRoot);
}
function applytoRoot(documentRoot) {

    for (const element of elements) {
        const id = element.getAttribute("id");
        const existingElement = documentRoot.querySelector(`#${id}`);
        if (!existingElement) {
            documentRoot.appendChild(element.cloneNode(true));
        }
    }
}

function insertIntoTarget(element) {

    element.setAttribute("id", `uxp-${generateUUID()}`);
    elements.push(element);
    document.head.appendChild(element);
    setTimeout(() => {
        for (const root of roots) {
            applytoRoot(root);
        }
    }, 0);
}

function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

insertIntoTarget.init = init;
module.exports = insertIntoTarget;
