
let elements = [];
let roots = [];
// Function to initialize parameters at runtime
function init(documentRoot) {
    roots.push(documentRoot);

    for (const element of elements) {
        const id = element.getAttribute('id');
        const existingElement = documentRoot.querySelector(`#${id}`);
        if (!existingElement) {
            documentRoot.appendChild(element.cloneNode(true));
        }
    }

}


function insertIntoTarget(element) {


    console.log('Style insertIntoTarget', element, elements,roots);

    element.setAttribute('id', `uxp-${crypto.randomUUID()}`);
    elements.push(element);
    document.head.appendChild(element);
    for (const root of roots) {
        init(root);
    }
}


insertIntoTarget.init = init;
module.exports = insertIntoTarget;  