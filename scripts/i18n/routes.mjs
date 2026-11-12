import fs from "node:fs";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
const traverse = traverseModule.default;
const ast = parse(fs.readFileSync("src/routes/AppRoutes.jsx", "utf8"), { sourceType: "module", plugins: ["jsx"] });
const routes = [];
traverse(ast, {
  JSXOpeningElement(path) {
    if (path.node.name.name !== "Route") return;
    const attrs = path.node.attributes;
    const route = attrs.find(attr => attr.name?.name === "path")?.value?.value;
    if (!route || route === "*") return;
    const element = attrs.find(attr => attr.name?.name === "element")?.value?.expression;
    const component = element?.openingElement?.name?.name || "Unknown";
    const guest = /^\/(?:explore|invite\/|login$|register$|forgot-password$|reset-password\/|welcome$|start\/)/.test(route);
    routes.push({ path: route, component, role: route.startsWith("/admin/") ? "admin" : guest ? "guest" : route === "/fan/worlds" ? "fan" : "creator", redirect: component === "Navigate" || component.includes("Redirect") });
  },
});
fs.writeFileSync("docs/i18n/route-matrix.json", JSON.stringify(routes, null, 2) + "\n");
console.log(JSON.stringify({ routes: routes.length, active: routes.filter(route => !route.redirect).length }));
