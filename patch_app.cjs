const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const imports = `
import ClientLogin from "./pages/ClientLogin";
import ClientRegister from "./pages/ClientRegister";
import ClientLayout from "./components/ClientLayout";
import ClientDashboardHome from "./pages/client/ClientDashboardHome";
`;

content = content.replace(/import ContactsPage from "\.\/pages\/admin\/ContactsPage";/, 'import ContactsPage from "./pages/admin/ContactsPage";' + imports);

const protectedClientRoute = `
const ProtectedClientRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user } = useAuth();
  const location = useLocation();
  
  if (!token) {
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }
  
  if (user?.role !== 'client' && user?.role !== 'admin') {
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }
  
  return children;
};
`;

content = content.replace(/const ProtectedRoute = \(\{ children \}: \{ children: React\.ReactNode \}\) => \{/, protectedClientRoute + '\nconst ProtectedRoute = ({ children }: { children: React.ReactNode }) => {');

// Update ProtectedRoute for Admin
content = content.replace(/return <Navigate to="\/admin\/login" state=\{\{ from: location \}\} replace \/>;\n  }\n  return children;/, `return <Navigate to="/admin/login" state={{ from: location }} replace />;\n  }\n  if (user?.role !== 'admin') {\n    return <Navigate to="/" replace />;\n  }\n  return children;`);

// ensure we extract `user` from useAuth in ProtectedRoute
content = content.replace(/const \{ token \} = useAuth\(\);/, 'const { token, user } = useAuth();');


const clientRoutes = `
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/client/register" element={<ClientRegister />} />
            <Route
              path="/client"
              element={
                <ProtectedClientRoute>
                  <ClientLayout />
                </ProtectedClientRoute>
              }
            >
              <Route index element={<ClientDashboardHome />} />
              {/* <Route path="projects" element={<ClientProjects />} /> */}
            </Route>
`;

content = content.replace(/<Route path="\/admin\/login" element=\{<AdminLogin \/>\} \/>/, '<Route path="/admin/login" element={<AdminLogin />} />\n' + clientRoutes);

fs.writeFileSync(path, content);
