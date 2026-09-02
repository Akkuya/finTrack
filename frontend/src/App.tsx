import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import ImportPage from './pages/ImportPage'
import BreakdownPage from './pages/BreakdownPage'
import GoalsPage from './pages/GoalsPage'
import CreateGoalPage from './pages/CreateGoalPage'
import CategoriesPage from './pages/CategoriesPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/breakdown" element={<BreakdownPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/goals/new" element={<CreateGoalPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App