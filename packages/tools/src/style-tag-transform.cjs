// style-tag-transform-code.js
module.exports = function styleTagTransform(css, styleElement) {
    // Rewrite URLs in the CSS
    //const updatedCSS = css.replace(/url\((['"]?)(\/fonts\/[^'")]+)\1\)/g, (match, quote, path) => {
    //const basePath = window.__UXP_BASE_URL__ || '/';
    //return `url(${quote}${basePath}${path.substring(1)}${quote})`;
    //});
    console.log("Style Tag Transform", __webpack_public_path__, css, styleElement);
    // Update the content of the style element
    //styleElement.textContent = updatedCSS;
    styleElement.textContent = css;
};
