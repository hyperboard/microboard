document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".link-object").forEach(linkItem => {
        const linkImage = linkItem.querySelector(".link-image");
        const linkContainer = linkItem.querySelector("a");
        linkImage.onerror = () => {
            linkImage.onerror = null;
            linkImage.style.display = "none";
            const svgNamespace = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNamespace, "svg");
            svg.setAttribute("width", "20");
            svg.setAttribute("height", "20");
            svg.setAttribute("viewBox", "0 0 13 14");
            svg.setAttribute("fill", "none");

            const path = document.createElementNS(svgNamespace, "path");
            path.setAttribute(
                "d",
                "M11.0054 3.414L2.39838 12.021L0.984375 10.607L9.59037 2H2.00538V0H13.0054V11H11.0054V3.414Z",
            );
            path.setAttribute("fill", "#924FE8");
            svg.appendChild(path);

            linkContainer.appendChild(svg);
        };
    });
});
