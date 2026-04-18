import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/layout/Layout";

function DayPass() {
    return (
        <ProtectedRoute>
        <Layout>
        <div>
            <h1 class="">Gestión de Day Pass</h1>
        </div>
        </Layout>
        </ProtectedRoute>
    );
}

export default DayPass;