const fs = require('fs');
const path = './src/components/admin/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/import { faTableColumns, faGear, faImage, faCommentDots, faRightFromBracket, faMoon, faSun } from "@fortawesome\/free-solid-svg-icons";/, 'import { faTableColumns, faGear, faImage, faCommentDots, faRightFromBracket, faMoon, faSun, faUsers } from "@fortawesome/free-solid-svg-icons";');

const clientsLink = `    { to: "/admin/clients", label: "Clients", icon: faUsers },`;
content = content.replace(/\{ to: "\/admin\/contacts", label: "Submissions", icon: faCommentDots \},/, '{ to: "/admin/contacts", label: "Submissions", icon: faCommentDots },\n' + clientsLink);

fs.writeFileSync(path, content);
