const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const importStatement = `import ClientsPage from "./pages/admin/ClientsPage";`;
content = content.replace(/import ContactsPage from "\.\/pages\/admin\/ContactsPage";/, 'import ContactsPage from "./pages/admin/ContactsPage";\n' + importStatement);

const routeStatement = `<Route path="clients" element={<ClientsPage />} />`;
content = content.replace(/<Route path="contacts" element=\{<ContactsPage \/>\} \/>/, '<Route path="contacts" element={<ContactsPage />} />\n              ' + routeStatement);

fs.writeFileSync(path, content);
